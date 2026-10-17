import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { WebRTCManager } from '../lib/webrtc';
import {
  getMeeting,
  createMeetingDoc,
  updateMeetingSettings,
  saveMeetingMessage,
  subscribeMeetingMessages,
} from '../lib/firestoreService';
import type {
  Participant,
  ChatMessage,
  MeetingReaction,
  MeetingDoc,
} from '../types';
import { useAuth } from './AuthContext';
import { normalizeMeetingCode, formatMeetingDisplayCode } from '../lib/meetingUtils';

export type MeetingState = 'idle' | 'prejoin' | 'waiting' | 'in-call' | 'ended';

interface MeetingContextType {
  meetingState: MeetingState;
  meetingId: string | null;
  meetingDoc: MeetingDoc | null;
  isHost: boolean;
  localStream: MediaStream | null;
  remoteParticipants: Participant[];
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  messages: ChatMessage[];
  reactions: MeetingReaction[];
  waitingParticipants: Participant[];
  isLocked: boolean;
  activeSpeakerId: string | null;
  unreadChatCount: number;
  devices: {
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
    audioOutputs: MediaDeviceInfo[];
  };
  selectedAudioInput: string;
  selectedVideoInput: string;
  selectedAudioOutput: string;
  errorMessage: string | null;

  // Actions
  prepareMeeting: (targetMeetingId?: string, isCreating?: boolean, title?: string) => Promise<void>;
  joinCall: (guestName?: string) => Promise<void>;
  leaveCall: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  toggleHandRaise: () => void;
  sendReaction: (emoji: string) => void;
  sendMessage: (text: string, attachmentName?: string, attachmentUrl?: string) => Promise<void>;
  setSelectedAudioInput: (deviceId: string) => void;
  setSelectedVideoInput: (deviceId: string) => void;
  setSelectedAudioOutput: (deviceId: string) => void;
  testAudioOutput: () => void;
  clearErrorMessage: () => void;
  hostAdmit: (socketId: string) => void;
  hostDeny: (socketId: string) => void;
  hostMute: (socketId: string) => void;
  hostKick: (socketId: string) => void;
  hostToggleLock: (locked: boolean) => void;
  hostEndMeeting: () => void;
}

const MeetingContext = createContext<MeetingContextType | null>(null);

export const MeetingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, userName } = useAuth();

  const [meetingState, setMeetingState] = useState<MeetingState>('idle');
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [meetingDoc, setMeetingDoc] = useState<MeetingDoc | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Local media tracks & preferences
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [screenSharing, setScreenSharing] = useState<boolean>(false);
  const [handRaised, setHandRaised] = useState<boolean>(false);

  // Room participants & communication
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([]);
  const [waitingParticipants, setWaitingParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<MeetingReaction[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hardware devices
  const [devices, setDevices] = useState<{
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
    audioOutputs: MediaDeviceInfo[];
  }>({
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
  });
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');

  // Refs
  const webrtcRef = useRef<WebRTCManager | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const guestNameRef = useRef<string>('');
  const chatUnsubscribeRef = useRef<(() => void) | null>(null);

  // Enumerate hardware devices
  const enumerateDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioIns = allDevices.filter(d => d.kind === 'audioinput');
      const videoIns = allDevices.filter(d => d.kind === 'videoinput');
      const audioOuts = allDevices.filter(d => d.kind === 'audiooutput');

      setDevices({
        audioInputs: audioIns,
        videoInputs: videoIns,
        audioOutputs: audioOuts,
      });

      if (audioIns.length && !selectedAudioInput) setSelectedAudioInput(audioIns[0].deviceId);
      if (videoIns.length && !selectedVideoInput) setSelectedVideoInput(videoIns[0].deviceId);
      if (audioOuts.length && !selectedAudioOutput) setSelectedAudioOutput(audioOuts[0].deviceId);
    } catch (err) {
      console.warn('Device enumeration failed:', err);
    }
  }, [selectedAudioInput, selectedVideoInput, selectedAudioOutput]);

  useEffect(() => {
    enumerateDevices();
    navigator.mediaDevices?.addEventListener('devicechange', enumerateDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', enumerateDevices);
    };
  }, [enumerateDevices]);

  // Setup local preview media
  const setupLocalMedia = async () => {
    try {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedAudioInput ? { deviceId: { exact: selectedAudioInput } } : true,
        video: selectedVideoInput ? { deviceId: { exact: selectedVideoInput }, width: 1280, height: 720 } : true,
      });
      setLocalStream(stream);
      setAudioEnabled(true);
      setVideoEnabled(true);
      return stream;
    } catch (err) {
      console.warn('Camera/Mic permission denied or unavailable:', err);
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setLocalStream(audioOnly);
        setAudioEnabled(true);
        setVideoEnabled(false);
        return audioOnly;
      } catch (audioErr) {
        console.warn('Microphone permission denied as well:', audioErr);
        setAudioEnabled(false);
        setVideoEnabled(false);
        return null;
      }
    }
  };

  // Prepare a meeting (either create fresh or join existing code)
  const prepareMeeting = async (targetMeetingId?: string, isCreating: boolean = false, title: string = 'MeetSpace Session') => {
    setErrorMessage(null);
    let mid = targetMeetingId ? normalizeMeetingCode(targetMeetingId) : '';

    if (isCreating || !mid) {
      // Generate clean standard meeting code formatted as xxx-yyyy-zzz
      const p1 = Math.random().toString(36).substring(2, 5);
      const p2 = Math.random().toString(36).substring(2, 6);
      const p3 = Math.random().toString(36).substring(2, 5);
      mid = `${p1}-${p2}-${p3}`;

      const newDoc: MeetingDoc = {
        meetingId: mid,
        title: title || 'MeetSpace Session',
        hostId: user?.uid || `host_${Math.random().toString(36).substring(2, 8)}`,
        hostName: userName || user?.displayName || 'Host',
        hostEmail: user?.email || '',
        status: 'active',
        isLocked: false,
        waitingRoomEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await createMeetingDoc(newDoc);
      } catch (err) {
        console.warn('Using ad-hoc room without cloud persistence:', err);
      }
      setMeetingDoc(newDoc);
      setIsHost(true);
    } else {
      mid = formatMeetingDisplayCode(mid);
      try {
        let existing = await getMeeting(mid);
        if (!existing) {
          const rawId = mid.replace(/-/g, '');
          existing = await getMeeting(rawId);
        }
        if (existing) {
          setMeetingDoc(existing);
          setIsHost(user ? existing.hostId === user.uid : false);
        } else {
          // Allow joining ad-hoc code so anyone with the link/code connects immediately
          const adHocDoc: MeetingDoc = {
            meetingId: mid,
            title: `Meeting ${mid}`,
            hostId: 'unknown',
            hostName: 'Organizer',
            status: 'active',
            isLocked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setMeetingDoc(adHocDoc);
          setIsHost(false);
        }
      } catch (err) {
        console.warn('Using ad-hoc session:', err);
        const adHocDoc: MeetingDoc = {
          meetingId: mid,
          title: `Meeting ${mid}`,
          hostId: 'unknown',
          hostName: 'Organizer',
          status: 'active',
          isLocked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setMeetingDoc(adHocDoc);
        setIsHost(false);
      }
    }

    // Sync meeting code to browser URL bar
    if (typeof window !== 'undefined' && mid) {
      const newUrl = `${window.location.pathname}?meeting=${encodeURIComponent(mid)}`;
      window.history.replaceState({ meetingId: mid }, '', newUrl);
    }

    setMeetingId(mid);
    setMeetingState('prejoin');
    await setupLocalMedia();
  };

  // Join the actual call after device check - opens meeting room immediately
  const joinCall = async (guestName?: string) => {
    if (!meetingId) return;
    if (guestName) guestNameRef.current = guestName;

    const myName = guestName || guestNameRef.current || userName || profile?.displayName || user?.displayName || 'Participant';
    const myId = user?.uid || `usr_${Math.random().toString(36).substring(2, 8)}`;

    // Immediately open meeting room interface so screen changes without any stall
    setMeetingState('in-call');
    setErrorMessage(null);

    // Set up WebRTC Manager
    const rtc = new WebRTCManager({
      onRemoteStream: (socketId, stream) => {
        setRemoteParticipants(prev =>
          prev.map(p => (p.socketId === socketId ? { ...p, stream } : p))
        );
      },
      onParticipantJoined: (p) => {
        setRemoteParticipants(prev => {
          if (prev.some(existing => existing.socketId === p.socketId)) return prev;
          return [...prev, p];
        });
      },
      onParticipantLeft: (socketId) => {
        setRemoteParticipants(prev => prev.filter(p => p.socketId !== socketId));
      },
      onMediaStateChanged: (socketId, state) => {
        setRemoteParticipants(prev =>
          prev.map(p =>
            p.socketId === socketId
              ? {
                  ...p,
                  audioEnabled: state.audioEnabled,
                  videoEnabled: state.videoEnabled,
                  screenSharing: state.screenSharing,
                }
              : p
          )
        );
      },
      onHandStateChanged: (socketId, raised) => {
        setRemoteParticipants(prev =>
          prev.map(p => (p.socketId === socketId ? { ...p, handRaised: raised } : p))
        );
      },
      onReactionReceived: (reaction) => {
        setReactions(prev => [...prev.slice(-20), reaction]);
        setTimeout(() => {
          setReactions(prev => prev.filter(r => r.id !== reaction.id));
        }, 2500);
      },
      onChatMessageReceived: (msg) => {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setUnreadChatCount(c => c + 1);
      },
      onWaitingRoomEntered: () => {
        setMeetingState('waiting');
      },
      onWaitingParticipantArrived: (p) => {
        setWaitingParticipants(prev => [...prev.filter(x => x.socketId !== p.socketId), p]);
      },
      onAdmitted: () => {
        setMeetingState('in-call');
      },
      onDenied: (msg) => {
        setMeetingState('ended');
        setErrorMessage(msg || 'Admission was denied by host.');
      },
      onKicked: (msg) => {
        leaveCall();
        setMeetingState('ended');
        setErrorMessage(msg || 'You have been removed from the meeting.');
      },
      onForceMute: () => {
        setAudioEnabled(false);
        if (localStream) {
          localStream.getAudioTracks().forEach(t => (t.enabled = false));
        }
        webrtcRef.current?.updateMediaState({ audioEnabled: false });
      },
      onMeetingEnded: () => {
        leaveCall();
        setMeetingState('ended');
        setErrorMessage('The host has ended this meeting for all participants.');
      },
      onLockChanged: (locked) => {
        setIsLocked(locked);
      },
      onHostChanged: (newHostSocketId) => {
        if (webrtcRef.current?.getSocketId() === newHostSocketId) {
          setIsHost(true);
        }
      },
      onRoomJoined: (data) => {
        setIsLocked(data.isLocked || false);
        if (data.existingParticipants && Array.isArray(data.existingParticipants)) {
          setRemoteParticipants(data.existingParticipants);
        }
      },
      onJoinError: (err) => {
        setMeetingState('prejoin');
        setErrorMessage(err.message || 'Unable to join meeting room.');
      },
    });

    webrtcRef.current = rtc;
    rtc.connect();

    // Attach stream if exists
    if (localStream) {
      rtc.setLocalStream(localStream);
    }

    // Join room
    rtc.joinRoom({
      meetingId,
      userId: myId,
      displayName: myName,
      avatarUrl: profile?.photoURL || user?.photoURL || '',
      isHost,
    });

    // Optional Firestore chat synchronization
    if (user) {
      try {
        if (chatUnsubscribeRef.current) {
          chatUnsubscribeRef.current();
        }
        chatUnsubscribeRef.current = subscribeMeetingMessages(meetingId, msgs => {
          setMessages(msgs);
        });
      } catch (err) {
        console.warn('Firestore chat listener fallback:', err);
      }
    }
  };

  // Leave active call
  const leaveCall = () => {
    if (chatUnsubscribeRef.current) {
      chatUnsubscribeRef.current();
      chatUnsubscribeRef.current = null;
    }

    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }

    if (webrtcRef.current) {
      webrtcRef.current.disconnect();
      webrtcRef.current = null;
    }

    // Clear meeting query parameter in URL bar
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }

    setRemoteParticipants([]);
    setWaitingParticipants([]);
    setMessages([]);
    setReactions([]);
    setScreenSharing(false);
    setHandRaised(false);
    setMeetingState('idle');
    setMeetingId(null);
    setMeetingDoc(null);
    setIsHost(false);
    setErrorMessage(null);
  };

  const toggleAudio = () => {
    if (!localStream) return;
    const nextState = !audioEnabled;
    localStream.getAudioTracks().forEach(track => {
      track.enabled = nextState;
    });
    setAudioEnabled(nextState);
    webrtcRef.current?.updateMediaState({ audioEnabled: nextState });
  };

  const toggleVideo = () => {
    if (!localStream) return;
    const nextState = !videoEnabled;
    localStream.getVideoTracks().forEach(track => {
      track.enabled = nextState;
    });
    setVideoEnabled(nextState);
    webrtcRef.current?.updateMediaState({ videoEnabled: nextState });
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0] || null;
        await webrtcRef.current?.replaceVideoTrack(videoTrack);
      }
      setScreenSharing(false);
      webrtcRef.current?.updateMediaState({ screenSharing: false });
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        const screenTrack = displayStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        await webrtcRef.current?.replaceVideoTrack(screenTrack);
        setScreenSharing(true);
        webrtcRef.current?.updateMediaState({ screenSharing: true });

        screenTrack.onended = () => {
          if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0] || null;
            webrtcRef.current?.replaceVideoTrack(videoTrack);
          }
          setScreenSharing(false);
          webrtcRef.current?.updateMediaState({ screenSharing: false });
        };
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    }
  };

  const toggleHandRaise = () => {
    const next = !handRaised;
    setHandRaised(next);
    webrtcRef.current?.toggleHandRaise(next);
  };

  const sendReaction = (emoji: string) => {
    const myName = guestNameRef.current || userName || profile?.displayName || user?.displayName || 'Participant';
    const myId = user?.uid || 'guest';
    const reaction: MeetingReaction = {
      id: Math.random().toString(36).substring(2),
      emoji,
      senderName: myName,
      senderId: myId,
      timestamp: Date.now(),
    };
    setReactions(prev => [...prev.slice(-20), reaction]);
    webrtcRef.current?.sendReaction(emoji);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reaction.id));
    }, 2500);
  };

  const sendMessage = async (text: string, attachmentName?: string, attachmentUrl?: string) => {
    if (!text.trim() && !attachmentUrl) return;
    const myName = guestNameRef.current || userName || profile?.displayName || user?.displayName || 'Participant';
    const myId = user?.uid || 'guest';

    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      meetingId: meetingId || '',
      senderId: myId,
      senderName: myName,
      senderPhoto: profile?.photoURL || user?.photoURL,
      text: text.trim(),
      attachmentName,
      attachmentUrl,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, msg]);
    webrtcRef.current?.sendChatMessage({
      text: text.trim(),
      attachmentName,
      attachmentUrl,
    });

    if (user && meetingId) {
      try {
        await saveMeetingMessage(msg);
      } catch (err) {
        console.warn('Firestore message save error:', err);
      }
    }
  };

  const testAudioOutput = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (err) {
      console.warn('Audio test error:', err);
    }
  };

  // Host operations
  const hostAdmit = (socketId: string) => {
    webrtcRef.current?.hostAdmitParticipant(socketId);
    setWaitingParticipants(prev => prev.filter(p => p.socketId !== socketId));
  };

  const hostDeny = (socketId: string) => {
    webrtcRef.current?.hostDenyParticipant(socketId);
    setWaitingParticipants(prev => prev.filter(p => p.socketId !== socketId));
  };

  const hostMute = (socketId: string) => {
    webrtcRef.current?.hostMuteParticipant(socketId);
  };

  const hostKick = (socketId: string) => {
    webrtcRef.current?.hostKickParticipant(socketId);
    setRemoteParticipants(prev => prev.filter(p => p.socketId !== socketId));
  };

  const hostToggleLock = async (locked: boolean) => {
    setIsLocked(locked);
    webrtcRef.current?.hostToggleLock(locked);
    if (meetingId && user) {
      try {
        await updateMeetingSettings(meetingId, { isLocked: locked });
      } catch (err) {
        console.warn('Firestore update lock error:', err);
      }
    }
  };

  const hostEndMeeting = () => {
    webrtcRef.current?.hostEndMeetingForAll();
    leaveCall();
  };

  const clearErrorMessage = () => setErrorMessage(null);

  return (
    <MeetingContext.Provider
      value={{
        meetingState,
        meetingId,
        meetingDoc,
        isHost,
        localStream,
        remoteParticipants,
        audioEnabled,
        videoEnabled,
        screenSharing,
        handRaised,
        messages,
        reactions,
        waitingParticipants,
        isLocked,
        activeSpeakerId,
        unreadChatCount,
        devices,
        selectedAudioInput,
        selectedVideoInput,
        selectedAudioOutput,
        errorMessage,
        prepareMeeting,
        joinCall,
        leaveCall,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
        toggleHandRaise,
        sendReaction,
        sendMessage,
        setSelectedAudioInput,
        setSelectedVideoInput,
        setSelectedAudioOutput,
        testAudioOutput,
        clearErrorMessage,
        hostAdmit,
        hostDeny,
        hostMute,
        hostKick,
        hostToggleLock,
        hostEndMeeting,
      }}
    >
      {children}
    </MeetingContext.Provider>
  );
};

export const useMeeting = () => {
  const context = useContext(MeetingContext);
  if (!context) {
    throw new Error('useMeeting must be used within a MeetingProvider');
  }
  return context;
};
