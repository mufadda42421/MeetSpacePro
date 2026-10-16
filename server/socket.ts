import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';

export interface ParticipantInfo {
  socketId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role: 'host' | 'participant' | 'guest';
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  handRaisedAt?: number;
  status: 'active' | 'waiting';
}

interface RoomState {
  meetingId: string;
  hostSocketId?: string;
  isLocked: boolean;
  waitingRoomEnabled: boolean;
  participants: Map<string, ParticipantInfo>;
}

const rooms = new Map<string, RoomState>();

export function initSocketServer(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    let currentMeetingId: string | null = null;

    socket.on('join-room', (data: {
      meetingId: string;
      userId: string;
      displayName: string;
      avatarUrl?: string;
      isHost?: boolean;
    }) => {
      const { meetingId, userId, displayName, avatarUrl, isHost } = data;
      currentMeetingId = meetingId;

      let room = rooms.get(meetingId);
      if (!room) {
        room = {
          meetingId,
          hostSocketId: isHost ? socket.id : undefined,
          isLocked: false,
          waitingRoomEnabled: false,
          participants: new Map(),
        };
        rooms.set(meetingId, room);
      }

      // Check if room is locked
      if (room.isLocked && !isHost) {
        socket.emit('join-error', { message: 'This meeting has been locked by the host.' });
        return;
      }

      // If waiting room is active and user is not host
      if (room.waitingRoomEnabled && !isHost && (!room.hostSocketId || room.hostSocketId !== socket.id)) {
        const waitingParticipant: ParticipantInfo = {
          socketId: socket.id,
          userId,
          displayName,
          avatarUrl,
          role: 'guest',
          audioEnabled: false,
          videoEnabled: false,
          screenSharing: false,
          handRaised: false,
          status: 'waiting',
        };
        room.participants.set(socket.id, waitingParticipant);
        socket.join(`waiting:${meetingId}`);
        socket.emit('waiting-room-entered', { message: 'Waiting for the host to admit you...' });

        if (room.hostSocketId) {
          io.to(room.hostSocketId).emit('waiting-participant-arrived', waitingParticipant);
        }
        return;
      }

      // Admitted active participant
      const participant: ParticipantInfo = {
        socketId: socket.id,
        userId,
        displayName,
        avatarUrl,
        role: isHost || room.participants.size === 0 ? 'host' : 'participant',
        audioEnabled: true,
        videoEnabled: true,
        screenSharing: false,
        handRaised: false,
        status: 'active',
      };

      if (participant.role === 'host') {
        room.hostSocketId = socket.id;
      }

      room.participants.set(socket.id, participant);
      socket.join(`room:${meetingId}`);

      // Collect existing active peers (excluding the joining socket)
      const existingPeers: ParticipantInfo[] = [];
      for (const [sId, p] of room.participants.entries()) {
        if (sId !== socket.id && p.status === 'active') {
          existingPeers.push(p);
        }
      }

      // Send to newcomer
      socket.emit('room-joined', {
        meetingId,
        yourParticipantInfo: participant,
        existingParticipants: existingPeers,
        isLocked: room.isLocked,
        waitingRoomEnabled: room.waitingRoomEnabled,
      });

      // Broadcast to existing room members
      socket.to(`room:${meetingId}`).emit('participant-joined', participant);
    });

    // WebRTC Signaling: Offer
    socket.on('signal-offer', (payload: { toSocketId: string; offer: RTCSessionDescriptionInit }) => {
      io.to(payload.toSocketId).emit('signal-offer', {
        fromSocketId: socket.id,
        offer: payload.offer,
      });
    });

    // WebRTC Signaling: Answer
    socket.on('signal-answer', (payload: { toSocketId: string; answer: RTCSessionDescriptionInit }) => {
      io.to(payload.toSocketId).emit('signal-answer', {
        fromSocketId: socket.id,
        answer: payload.answer,
      });
    });

    // WebRTC Signaling: ICE Candidate
    socket.on('signal-ice-candidate', (payload: { toSocketId: string; candidate: RTCIceCandidateInit }) => {
      io.to(payload.toSocketId).emit('signal-ice-candidate', {
        fromSocketId: socket.id,
        candidate: payload.candidate,
      });
    });

    // Media state toggles (audio, video, screen share)
    socket.on('media-state-changed', (payload: {
      audioEnabled?: boolean;
      videoEnabled?: boolean;
      screenSharing?: boolean;
    }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant) return;

      if (payload.audioEnabled !== undefined) participant.audioEnabled = payload.audioEnabled;
      if (payload.videoEnabled !== undefined) participant.videoEnabled = payload.videoEnabled;
      if (payload.screenSharing !== undefined) participant.screenSharing = payload.screenSharing;

      io.to(`room:${currentMeetingId}`).emit('participant-media-changed', {
        socketId: socket.id,
        audioEnabled: participant.audioEnabled,
        videoEnabled: participant.videoEnabled,
        screenSharing: participant.screenSharing,
      });
    });

    // Hand raise toggle
    socket.on('hand-raise-toggle', (payload: { raised: boolean }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant) return;

      participant.handRaised = payload.raised;
      participant.handRaisedAt = payload.raised ? Date.now() : undefined;

      io.to(`room:${currentMeetingId}`).emit('participant-hand-changed', {
        socketId: socket.id,
        handRaised: participant.handRaised,
        handRaisedAt: participant.handRaisedAt,
      });
    });

    // Real-time emoji reaction
    socket.on('send-reaction', (payload: { emoji: string }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      const participant = room?.participants.get(socket.id);

      io.to(`room:${currentMeetingId}`).emit('reaction-received', {
        id: Math.random().toString(36).substring(2),
        emoji: payload.emoji,
        senderId: participant?.userId || socket.id,
        senderName: participant?.displayName || 'Participant',
        timestamp: Date.now(),
      });
    });

    // Real-time chat message broadcast
    socket.on('send-chat-message', (payload: {
      id: string;
      text: string;
      senderId: string;
      senderName: string;
      senderPhoto?: string;
      attachmentName?: string;
      attachmentUrl?: string;
      createdAt: string;
    }) => {
      if (!currentMeetingId) return;
      io.to(`room:${currentMeetingId}`).emit('chat-message-received', payload);
    });

    // Real-time live captions broadcast
    socket.on('send-live-caption', (payload: {
      speakerName: string;
      speakerId: string;
      text: string;
      isFinal: boolean;
      timestamp: number;
    }) => {
      if (!currentMeetingId) return;
      io.to(`room:${currentMeetingId}`).emit('live-caption-received', payload);
    });

    // Host Action: Admit Waiting Participant
    socket.on('host-admit-participant', (payload: { targetSocketId: string }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room || room.hostSocketId !== socket.id) return;

      const target = room.participants.get(payload.targetSocketId);
      if (target) {
        target.status = 'active';
        io.to(payload.targetSocketId).emit('admitted-by-host');
      }
    });

    // Host Action: Deny Waiting Participant
    socket.on('host-deny-participant', (payload: { targetSocketId: string }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room || room.hostSocketId !== socket.id) return;

      room.participants.delete(payload.targetSocketId);
      io.to(payload.targetSocketId).emit('denied-by-host', { message: 'The host has denied admission.' });
    });

    // Host Action: Force Mute Participant
    socket.on('host-mute-participant', (payload: { targetSocketId: string }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room || room.hostSocketId !== socket.id) return;

      io.to(payload.targetSocketId).emit('force-mute-by-host');
    });

    // Host Action: Kick Participant
    socket.on('host-kick-participant', (payload: { targetSocketId: string }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room || room.hostSocketId !== socket.id) return;

      room.participants.delete(payload.targetSocketId);
      io.to(payload.targetSocketId).emit('kicked-by-host', { message: 'You have been removed by the meeting host.' });
      io.to(`room:${currentMeetingId}`).emit('participant-left', { socketId: payload.targetSocketId });
    });

    // Host Action: Toggle Meeting Lock
    socket.on('host-toggle-lock', (payload: { isLocked: boolean }) => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room || room.hostSocketId !== socket.id) return;

      room.isLocked = payload.isLocked;
      io.to(`room:${currentMeetingId}`).emit('meeting-lock-changed', { isLocked: room.isLocked });
    });

    // Host Action: End Meeting for All
    socket.on('host-end-meeting-for-all', () => {
      if (!currentMeetingId) return;
      const room = rooms.get(currentMeetingId);
      if (!room || room.hostSocketId !== socket.id) return;

      io.to(`room:${currentMeetingId}`).emit('meeting-ended-by-host');
      rooms.delete(currentMeetingId);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      if (currentMeetingId) {
        const room = rooms.get(currentMeetingId);
        if (room) {
          const leavingParticipant = room.participants.get(socket.id);
          room.participants.delete(socket.id);

          socket.to(`room:${currentMeetingId}`).emit('participant-left', {
            socketId: socket.id,
            userId: leavingParticipant?.userId,
            displayName: leavingParticipant?.displayName,
          });

          // If room is empty, clean it up
          if (room.participants.size === 0) {
            rooms.delete(currentMeetingId);
          } else if (room.hostSocketId === socket.id) {
            // Assign next active participant as host
            const nextParticipant = Array.from(room.participants.values()).find(p => p.status === 'active');
            if (nextParticipant) {
              room.hostSocketId = nextParticipant.socketId;
              nextParticipant.role = 'host';
              io.to(`room:${currentMeetingId}`).emit('host-changed', { newHostSocketId: nextParticipant.socketId });
            }
          }
        }
      }
    });
  });

  return io;
}
