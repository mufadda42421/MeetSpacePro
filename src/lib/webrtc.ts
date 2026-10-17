import { io, Socket } from 'socket.io-client';
import type { Participant } from '../types';

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

export interface JoinRoomParams {
  meetingId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  isHost?: boolean;
}

export interface WebRTCCallbacks {
  onRemoteStream: (socketId: string, stream: MediaStream) => void;
  onParticipantJoined: (participant: Participant) => void;
  onParticipantLeft: (socketId: string) => void;
  onMediaStateChanged: (socketId: string, state: { audioEnabled: boolean; videoEnabled: boolean; screenSharing: boolean }) => void;
  onHandStateChanged: (socketId: string, raised: boolean) => void;
  onReactionReceived: (reaction: any) => void;
  onChatMessageReceived: (message: any) => void;
  onLiveCaptionReceived: (caption: any) => void;
  onWaitingRoomEntered?: (msg: string) => void;
  onWaitingParticipantArrived?: (p: Participant) => void;
  onAdmitted?: () => void;
  onDenied?: (msg: string) => void;
  onKicked?: (msg: string) => void;
  onForceMute?: () => void;
  onMeetingEnded?: () => void;
  onLockChanged?: (locked: boolean) => void;
  onHostChanged?: (newHostSocketId: string) => void;
  onRoomJoined?: (data: any) => void;
  onJoinError?: (err: { message: string }) => void;
}

export class WebRTCManager {
  private socket: Socket | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private iceCandidatesQueue = new Map<string, RTCIceCandidateInit[]>();
  private localStream: MediaStream | null = null;
  private callbacks: WebRTCCallbacks;
  private currentSocketId: string = '';
  private lastJoinParams: JoinRoomParams | null = null;

  constructor(callbacks: WebRTCCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(): Socket {
    if (this.socket) return this.socket;

    const host = window.location.origin;
    this.socket = io(host, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.currentSocketId = this.socket?.id || '';
      // If we previously joined a room, automatically re-join upon reconnection
      if (this.lastJoinParams) {
        this.socket?.emit('join-room', this.lastJoinParams);
      }
    });

    this.socket.on('connect_error', (err) => {
      console.warn('Socket connection warning (will retry automatically):', err.message);
    });

    // Room response
    this.socket.on('room-joined', async (data) => {
      this.callbacks.onRoomJoined?.(data);
      // For each existing active participant in this room, establish WebRTC peer connection
      if (data.existingParticipants && Array.isArray(data.existingParticipants)) {
        for (const peer of data.existingParticipants) {
          await this.createPeerConnection(peer.socketId, true);
        }
      }
    });

    // Join error (e.g. room locked)
    this.socket.on('join-error', (err: { message: string }) => {
      this.callbacks.onJoinError?.(err);
    });

    // New participant joined
    this.socket.on('participant-joined', async (participant: Participant) => {
      this.callbacks.onParticipantJoined(participant);
      // Ensure peer connection container exists; joiner initiates offer
      await this.createPeerConnection(participant.socketId, false);
    });

    // Participant left
    this.socket.on('participant-left', (data: { socketId: string }) => {
      this.closePeerConnection(data.socketId);
      this.callbacks.onParticipantLeft(data.socketId);
    });

    // WebRTC Signaling: Receive Offer
    this.socket.on('signal-offer', async (data: { fromSocketId: string; offer: RTCSessionDescriptionInit }) => {
      let pc = this.peerConnections.get(data.fromSocketId);
      if (!pc) {
        pc = await this.createPeerConnection(data.fromSocketId, false);
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        // Flush any buffered ICE candidates for this peer
        const queued = this.iceCandidatesQueue.get(data.fromSocketId);
        if (queued && queued.length) {
          for (const cand of queued) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(console.warn);
          }
          this.iceCandidatesQueue.delete(data.fromSocketId);
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.socket?.emit('signal-answer', {
          toSocketId: data.fromSocketId,
          answer: pc.localDescription,
        });
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
      }
    });

    // WebRTC Signaling: Receive Answer
    this.socket.on('signal-answer', async (data: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = this.peerConnections.get(data.fromSocketId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          // Flush any buffered ICE candidates for this peer
          const queued = this.iceCandidatesQueue.get(data.fromSocketId);
          if (queued && queued.length) {
            for (const cand of queued) {
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(console.warn);
            }
            this.iceCandidatesQueue.delete(data.fromSocketId);
          }
        } catch (err) {
          console.error('Error handling WebRTC answer:', err);
        }
      }
    });

    // WebRTC Signaling: Receive ICE Candidate
    this.socket.on('signal-ice-candidate', async (data: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
      if (!data.candidate) return;
      const pc = this.peerConnections.get(data.fromSocketId);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.warn('Error adding ICE candidate:', err);
        }
      } else {
        // Buffer candidate until remote description is set
        let queue = this.iceCandidatesQueue.get(data.fromSocketId);
        if (!queue) {
          queue = [];
          this.iceCandidatesQueue.set(data.fromSocketId, queue);
        }
        queue.push(data.candidate);
      }
    });

    // Remote media changes
    this.socket.on('participant-media-changed', (data) => {
      this.callbacks.onMediaStateChanged(data.socketId, {
        audioEnabled: data.audioEnabled,
        videoEnabled: data.videoEnabled,
        screenSharing: data.screenSharing,
      });
    });

    // Hand raise
    this.socket.on('participant-hand-changed', (data) => {
      this.callbacks.onHandStateChanged(data.socketId, data.handRaised);
    });

    // Reaction
    this.socket.on('reaction-received', (reaction) => {
      this.callbacks.onReactionReceived(reaction);
    });

    // Chat message
    this.socket.on('chat-message-received', (msg) => {
      this.callbacks.onChatMessageReceived(msg);
    });

    // Live caption
    this.socket.on('live-caption-received', (caption) => {
      this.callbacks.onLiveCaptionReceived(caption);
    });

    // Host controls
    this.socket.on('waiting-room-entered', (data) => {
      this.callbacks.onWaitingRoomEntered?.(data.message);
    });

    this.socket.on('waiting-participant-arrived', (p) => {
      this.callbacks.onWaitingParticipantArrived?.(p);
    });

    this.socket.on('admitted-by-host', () => {
      this.callbacks.onAdmitted?.();
    });

    this.socket.on('denied-by-host', (data) => {
      this.callbacks.onDenied?.(data.message);
    });

    this.socket.on('kicked-by-host', (data) => {
      this.callbacks.onKicked?.(data.message);
    });

    this.socket.on('force-mute-by-host', () => {
      this.callbacks.onForceMute?.();
    });

    this.socket.on('meeting-ended-by-host', () => {
      this.callbacks.onMeetingEnded?.();
    });

    this.socket.on('meeting-lock-changed', (data) => {
      this.callbacks.onLockChanged?.(data.isLocked);
    });

    this.socket.on('host-changed', (data) => {
      this.callbacks.onHostChanged?.(data.newHostSocketId);
    });

    return this.socket;
  }

  public setLocalStream(stream: MediaStream) {
    this.localStream = stream;

    // Attach local stream tracks to all active peer connections
    for (const [, pc] of this.peerConnections) {
      const senders = pc.getSenders();
      stream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          try {
            pc.addTrack(track, stream);
          } catch (e) {
            console.warn('Track add error:', e);
          }
        }
      });
    }
  }

  public async replaceVideoTrack(newTrack: MediaStreamTrack | null) {
    for (const [, pc] of this.peerConnections) {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newTrack);
      } else if (newTrack && this.localStream) {
        try {
          pc.addTrack(newTrack, this.localStream);
        } catch (e) {
          console.warn('Track add error:', e);
        }
      }
    }
  }

  public joinRoom(params: JoinRoomParams) {
    this.lastJoinParams = params;
    if (!this.socket) this.connect();

    const emitJoin = () => {
      this.socket?.emit('join-room', params);
    };

    if (this.socket?.connected) {
      emitJoin();
    } else {
      this.socket?.once('connect', emitJoin);
    }
  }

  public updateMediaState(state: { audioEnabled?: boolean; videoEnabled?: boolean; screenSharing?: boolean }) {
    this.socket?.emit('media-state-changed', state);
  }

  public toggleHandRaise(raised: boolean) {
    this.socket?.emit('hand-raise-toggle', { raised });
  }

  public sendReaction(emoji: string) {
    this.socket?.emit('send-reaction', { emoji });
  }

  public sendChatMessage(message: any) {
    this.socket?.emit('send-chat-message', message);
  }

  public sendLiveCaption(caption: { speakerName: string; speakerId: string; text: string; isFinal: boolean; timestamp: number }) {
    this.socket?.emit('send-live-caption', caption);
  }

  // Host operations
  public hostAdmitParticipant(targetSocketId: string) {
    this.socket?.emit('host-admit-participant', { targetSocketId });
  }

  public hostDenyParticipant(targetSocketId: string) {
    this.socket?.emit('host-deny-participant', { targetSocketId });
  }

  public hostMuteParticipant(targetSocketId: string) {
    this.socket?.emit('host-mute-participant', { targetSocketId });
  }

  public hostKickParticipant(targetSocketId: string) {
    this.socket?.emit('host-kick-participant', { targetSocketId });
  }

  public hostToggleLock(isLocked: boolean) {
    this.socket?.emit('host-toggle-lock', { isLocked });
  }

  public hostEndMeetingForAll() {
    this.socket?.emit('host-end-meeting-for-all');
  }

  private async createPeerConnection(remoteSocketId: string, isInitiator: boolean): Promise<RTCPeerConnection> {
    if (this.peerConnections.has(remoteSocketId)) {
      return this.peerConnections.get(remoteSocketId)!;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peerConnections.set(remoteSocketId, pc);

    // Add local tracks if available, or transceivers so remote media can be received
    if (this.localStream && this.localStream.getTracks().length > 0) {
      this.localStream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, this.localStream!);
        } catch (e) {
          console.warn('Track add error:', e);
        }
      });
    } else {
      try {
        pc.addTransceiver('audio', { direction: 'recvonly' });
        pc.addTransceiver('video', { direction: 'recvonly' });
      } catch (e) {
        console.warn('Transceiver error:', e);
      }
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket?.emit('signal-ice-candidate', {
          toSocketId: remoteSocketId,
          candidate: event.candidate,
        });
      }
    };

    // Remote Track handler
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        this.callbacks.onRemoteStream(remoteSocketId, remoteStream);
      } else if (event.track) {
        const newStream = new MediaStream([event.track]);
        this.callbacks.onRemoteStream(remoteSocketId, newStream);
      }
    };

    // Negotiation needed for initiator
    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket?.emit('signal-offer', {
          toSocketId: remoteSocketId,
          offer: pc.localDescription,
        });
      } catch (err) {
        console.error('Error creating offer for peer:', remoteSocketId, err);
      }
    }

    return pc;
  }

  private closePeerConnection(socketId: string) {
    const pc = this.peerConnections.get(socketId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(socketId);
    }
    this.iceCandidatesQueue.delete(socketId);
  }

  public getSocketId(): string {
    return this.socket?.id || this.currentSocketId;
  }

  public disconnect() {
    this.lastJoinParams = null;
    for (const [, pc] of this.peerConnections) {
      pc.close();
    }
    this.peerConnections.clear();
    this.iceCandidatesQueue.clear();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
