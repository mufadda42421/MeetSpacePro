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
  canonicalId: string;
  hostSocketId?: string;
  isLocked: boolean;
  waitingRoomEnabled: boolean;
  participants: Map<string, ParticipantInfo>;
  createdAt: number;
}

// Global rooms map indexed by canonical alphanumeric room key.
// Attached to globalThis so module re-evaluations during development do not wipe active rooms.
const globalForRooms = globalThis as unknown as { __meetspace_rooms?: Map<string, RoomState> };
export const rooms: Map<string, RoomState> = globalForRooms.__meetspace_rooms || new Map<string, RoomState>();
if (!globalForRooms.__meetspace_rooms) {
  globalForRooms.__meetspace_rooms = rooms;
}

export function getCanonicalRoomId(rawId: string): string {
  if (!rawId) return '';
  let cleaned = rawId.trim().toLowerCase();
  // Strip url parts if present
  if (cleaned.includes('meeting=')) {
    cleaned = cleaned.split('meeting=')[1].split('&')[0];
  } else if (cleaned.includes('/meeting/')) {
    cleaned = cleaned.split('/meeting/')[1].split('?')[0];
  } else if (cleaned.includes('/')) {
    cleaned = cleaned.split('/').pop() || cleaned;
  }
  // Strip fragment and query params
  cleaned = cleaned.replace(/[?#].*$/, '');
  // Normalize by stripping hyphens, spaces, and non-alphanumeric chars
  return cleaned.replace(/[^a-z0-9]/g, '');
}

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  // Prevent duplicate Socket.IO initialization on the same HTTP server
  if ((httpServer as any).__socketIO) {
    return (httpServer as any).__socketIO;
  }

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  (httpServer as any).__socketIO = io;

  io.on('connection', (socket: Socket) => {
    let currentCanonicalMeetingId: string | null = null;

    socket.on('join-room', (data: {
      meetingId: string;
      userId: string;
      displayName: string;
      avatarUrl?: string;
      isHost?: boolean;
    }) => {
      const { meetingId, userId, displayName, avatarUrl, isHost } = data;
      const canonicalId = getCanonicalRoomId(meetingId);
      if (!canonicalId) {
        socket.emit('join-error', { message: 'Invalid meeting code.' });
        return;
      }

      currentCanonicalMeetingId = canonicalId;

      let room = rooms.get(canonicalId);
      if (!room) {
        room = {
          meetingId,
          canonicalId,
          hostSocketId: socket.id,
          isLocked: false,
          waitingRoomEnabled: false,
          participants: new Map(),
          createdAt: Date.now(),
        };
        rooms.set(canonicalId, room);
      }

      // Check if room is locked by an active host
      if (room.isLocked && !isHost && room.hostSocketId && room.participants.has(room.hostSocketId) && room.hostSocketId !== socket.id) {
        socket.emit('join-error', { message: 'This meeting has been locked by the host.' });
        return;
      }

      // Admitted active participant - anybody with the code can join and participate
      const isFirst = room.participants.size === 0;
      const participant: ParticipantInfo = {
        socketId: socket.id,
        userId: userId || `user-${socket.id.substring(0, 5)}`,
        displayName: displayName || 'Participant',
        avatarUrl,
        role: isHost || isFirst || room.hostSocketId === socket.id ? 'host' : 'participant',
        audioEnabled: true,
        videoEnabled: true,
        screenSharing: false,
        handRaised: false,
        status: 'active',
      };

      if (participant.role === 'host' || !room.hostSocketId || !room.participants.has(room.hostSocketId)) {
        room.hostSocketId = socket.id;
      }

      room.participants.set(socket.id, participant);
      socket.join(`room:${canonicalId}`);

      // Collect existing active peers in this exact room
      const existingPeers: ParticipantInfo[] = [];
      for (const [sId, p] of room.participants.entries()) {
        if (sId !== socket.id && p.status === 'active') {
          existingPeers.push(p);
        }
      }

      // Send confirmation to the newly joined peer with all existing participants
      socket.emit('room-joined', {
        meetingId: room.meetingId,
        canonicalId: room.canonicalId,
        yourParticipantInfo: participant,
        existingParticipants: existingPeers,
        isLocked: room.isLocked,
        waitingRoomEnabled: room.waitingRoomEnabled,
      });

      // Broadcast to all existing peers in the room that a newcomer has joined
      socket.to(`room:${canonicalId}`).emit('participant-joined', participant);
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

    // Media state update (audio / video / screen sharing toggles)
    socket.on('media-state-changed', (state: { audioEnabled?: boolean; videoEnabled?: boolean; screenSharing?: boolean }) => {
      if (!currentCanonicalMeetingId) return;
      const room = rooms.get(currentCanonicalMeetingId);
      if (!room) return;

      const participant = room.participants.get(socket.id);
      if (participant) {
        if (typeof state.audioEnabled === 'boolean') participant.audioEnabled = state.audioEnabled;
        if (typeof state.videoEnabled === 'boolean') participant.videoEnabled = state.videoEnabled;
        if (typeof state.screenSharing === 'boolean') participant.screenSharing = state.screenSharing;

        socket.to(`room:${currentCanonicalMeetingId}`).emit('participant-media-changed', {
          socketId: socket.id,
          audioEnabled: participant.audioEnabled,
          videoEnabled: participant.videoEnabled,
          screenSharing: participant.screenSharing,
        });
      }
    });

    // Hand raise toggle
    socket.on('hand-raise-toggle', (payload: { raised: boolean }) => {
      if (!currentCanonicalMeetingId) return;
      const room = rooms.get(currentCanonicalMeetingId);
      if (!room) return;

      const participant = room.participants.get(socket.id);
      if (participant) {
        participant.handRaised = payload.raised;
        participant.handRaisedAt = payload.raised ? Date.now() : undefined;

        io.to(`room:${currentCanonicalMeetingId}`).emit('participant-hand-changed', {
          socketId: socket.id,
          handRaised: participant.handRaised,
        });
      }
    });

    // Emoji reaction
    socket.on('send-reaction', (payload: { emoji: string }) => {
      if (!currentCanonicalMeetingId) return;
      const room = rooms.get(currentCanonicalMeetingId);
      const participant = room?.participants.get(socket.id);

      io.to(`room:${currentCanonicalMeetingId}`).emit('reaction-received', {
        id: `react_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        emoji: payload.emoji,
        senderId: participant?.userId || socket.id,
        senderName: participant?.displayName || 'Someone',
        timestamp: Date.now(),
      });
    });

    // In-meeting Chat Message Broadcast
    socket.on('send-chat-message', (payload: { text: string; attachmentName?: string; attachmentUrl?: string }) => {
      if (!currentCanonicalMeetingId) return;
      const room = rooms.get(currentCanonicalMeetingId);
      const participant = room?.participants.get(socket.id);

      const msg = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        meetingId: room?.meetingId || currentCanonicalMeetingId,
        senderId: participant?.userId || socket.id,
        senderName: participant?.displayName || 'Participant',
        senderPhoto: participant?.avatarUrl,
        text: payload.text,
        attachmentName: payload.attachmentName,
        attachmentUrl: payload.attachmentUrl,
        createdAt: new Date().toISOString(),
      };

      io.to(`room:${currentCanonicalMeetingId}`).emit('chat-message-received', msg);
    });


    // Host Action: Force Mute Participant
    socket.on('host-mute-participant', (payload: { targetSocketId: string }) => {
      if (!currentCanonicalMeetingId) return;
      const room = rooms.get(currentCanonicalMeetingId);
      if (!room || room.hostSocketId !== socket.id) return;

      io.to(payload.targetSocketId).emit('force-mute-by-host');
    });

    // Host Action: Kick Participant
    socket.on('host-kick-participant', (payload: { targetSocketId: string }) => {
      if (!currentCanonicalMeetingId) return;
      const room = rooms.get(currentCanonicalMeetingId);
      if (!room || room.hostSocketId !== socket.id) return;

      room.participants.delete(payload.targetSocketId);
      io.to(payload.targetSocketId).emit('kicked-by-host', { message: 'You have been removed by the meeting host.' });
      io.to(`room:${currentCanonicalMeetingId}`).emit('participant-left', { socketId: payload.targetSocketId });
    });

    // Host Action: Toggle Meeting Lock
    socket.on('host-toggle-lock', (payload: { isLocked: boolean }) => {
      if (!currentCanonicalMeetingId) return;
      const room = rooms.get(currentCanonicalMeetingId);
      if (!room || room.hostSocketId !== socket.id) return;

      room.isLocked = payload.isLocked;
      io.to(`room:${currentCanonicalMeetingId}`).emit('meeting-lock-changed', { isLocked: room.isLocked });
    });

    // Host Action: End Meeting for All
    socket.on('host-end-meeting-for-all', () => {
      if (!currentCanonicalMeetingId) return;
      const room = rooms.get(currentCanonicalMeetingId);
      if (!room || room.hostSocketId !== socket.id) return;

      io.to(`room:${currentCanonicalMeetingId}`).emit('meeting-ended-by-host');
      rooms.delete(currentCanonicalMeetingId);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      if (currentCanonicalMeetingId) {
        const room = rooms.get(currentCanonicalMeetingId);
        if (room) {
          const leavingParticipant = room.participants.get(socket.id);
          room.participants.delete(socket.id);

          socket.to(`room:${currentCanonicalMeetingId}`).emit('participant-left', {
            socketId: socket.id,
            userId: leavingParticipant?.userId,
            displayName: leavingParticipant?.displayName,
          });

          // If host left, elect next available participant as host
          if (room.hostSocketId === socket.id && room.participants.size > 0) {
            const nextParticipant = Array.from(room.participants.values())[0];
            if (nextParticipant) {
              room.hostSocketId = nextParticipant.socketId;
              nextParticipant.role = 'host';
              io.to(`room:${currentCanonicalMeetingId}`).emit('host-changed', {
                newHostSocketId: nextParticipant.socketId,
              });
            }
          }
        }
      }
    });
  });

  return io;
}
