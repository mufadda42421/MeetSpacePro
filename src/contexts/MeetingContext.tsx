import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { WebRTCManager } from '../lib/webrtc';
import { LiveTranscriptionService, fetchMeetingSummary } from '../lib/transcription';
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
  LiveCaption,
  MeetingReaction,
  MeetingDoc,
  MeetingSummaryResult,
} from '../types';
import { useAuth } from './AuthContext';

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
  captionsEnabled: boolean;
  captions: LiveCaption[];
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
  isSummarizing: boolean;
  meetingSummary: MeetingSummaryResult | null;
  errorMessage: string | null;

  // Actions
  prepareMeeting: (targetMeetingId?: string, isCreating?: boolean, title?: string) => Promise<void>;
  joinCall: (guestName?: string) => Promise<void>;
  leaveCall: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  toggleHandRaise: () => void;
  toggleCaptions: () => void;
  sendReaction: (emoji: string) => void;
  sendMessage: (text: string, attachmentName?: string, attachmentUrl?: string) => Promise<void>;
  setSelectedAudioInput: (deviceId: string) => void;
  setSelectedVideoInput: (deviceId: string) => void;
  setSelectedAudioOutput: (deviceId: string) => void;
  testAudioOutput: () => void;
  generateSummary: () => Promise<void>;
  clearErrorMessage: () => void;

  // Host Controls
  hostAdmit: (targetSocketId: string) => void;
  hostDeny: (targetSocketId: string) => void;
  hostMute: (targetSocketId: string) => void;
  hostKick: (targetSocketId: string) => void;
  hostToggleLock: () => void;
  hostEndMeeting: () => void;
}

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

export const MeetingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();

  const [meetingState, setMeetingState] = useState<MeetingState>('idle');
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [meetingDoc, setMeetingDoc] = useState<MeetingDoc | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([]);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [screenSharing, setScreenSharing] = useState<boolean>(false);
  const [handRaised, setHandRaised] = useState<boolean>(false);
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(false);

  const [captions, setCaptions] = useState<LiveCaption[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<MeetingReaction[]>([]);
  const [waitingParticipants, setWaitingParticipants] = useState<Participant[]>([]);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  const [devices, setDevices] = useState<{
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
    audioOutputs: MediaDeviceInfo[];
  }>({ audioInputs: [], videoInputs: [], audioOutputs: [] });

  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');

  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [meetingSummary, setMeetingSummary] = useState<MeetingSummaryResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const webrtcRef = useRef<WebRTCManager | null>(null);
  const transcriberRef = useRef<LiveTranscriptionService | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chatUnsubscribeRef = useRef<(() => void) | null>(null);
  const guestNameRef = useRef<string>('');

  // Enumerate hardware devices
  const refreshDevices = useCallback(async () => {
    try {
      const devList = await navigator.mediaDevices.enumerateDevices();
      const aIn = devList.filter(d => d.kind === 'audioinput');
      const vIn = devList.filter(d => d.kind === 'videoinput');
      const aOut = devList.filter(d => d.kind === 'audiooutput');

      setDevices({ audioInputs: aIn, videoInputs: vIn, audioOutputs: aOut });
      if (aIn.length && !selectedAudioInput) setSelectedAudioInput(aIn[0].deviceId);
      if (vIn.length && !selectedVideoInput) setSelectedVideoInput(vIn[0].deviceId);
      if (aOut.length && !selectedAudioOutput) setSelectedAudioOutput(aOut[0].deviceId);
    } catch (err) {
      console.warn('Device enumeration error:', err);
    }
  }, [selectedAudioInput, selectedVideoInput, selectedAudioOutput]);

  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices?.addEventListener('devicechange', refreshDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', refreshDevices);
    };
  }, [refreshDevices]);

  // Request or update local media stream
  const setupLocalMedia = useCallback(async (audioDevId?: string, videoDevId?: string) => {
    try {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioDevId ? { deviceId: { exact: audioDevId }, echoCancellation: true, noiseSuppression: true } : true,
        video: videoDevId ? { deviceId: { exact: videoDevId }, width: { ideal: 1280 }, height: { ideal: 720 } } : true,
      });

      // Apply initial mute states
      stream.getAudioTracks().forEach(t => (t.enabled = audioEnabled));
      stream.getVideoTracks().forEach(t => (t.enabled = videoEnabled));

      setLocalStream(stream);
      if (webrtcRef.current) {
        webrtcRef.current.setLocalStream(stream);
      }
      await refreshDevices();
      return stream;
    } catch (err: any) {
      console.warn('Local media access denied or partial:', err);
      // Fallback: try audio only if video failed
      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioOnlyStream.getAudioTracks().forEach(t => (t.enabled = audioEnabled));
        setLocalStream(audioOnlyStream);
        setVideoEnabled(false);
        if (webrtcRef.current) webrtcRef.current.setLocalStream(audioOnlyStream);
        return audioOnlyStream;
      } catch (audioErr) {
        setErrorMessage('Camera and microphone access could not be granted. You can still join as a viewer.');
        return null;
      }
    }
  }, [localStream, audioEnabled, videoEnabled, refreshDevices]);

  // Prepare a meeting (either create fresh or join existing code)
  const prepareMeeting = async (targetMeetingId?: string, isCreating: boolean = false, title: string = 'MeetSpace Session') => {
    setErrorMessage(null);
    let mid = targetMeetingId;
    if (isCreating || !mid) {
      // Generate unguessable 9-character meeting code format: xxx-yyyy-zzz
      const p1 = Math.random().toString(36).substring(2, 5);
      const p2 = Math.random().toString(36).substring(2, 6);
      const p3 = Math.random().toString(36).substring(2, 5);
      mid = `${p1}-${p2}-${p3}`;

      const newMeetingDoc: MeetingDoc = {
        meetingId: mid,
        title: title || 'MeetSpace Conference',
        hostId: user?.uid || 'guest-host',
        hostName: profile?.displayName || user?.displayName || 'Host',
        hostEmail: user?.email || '',
        status: 'active',
        isLocked: false,
        waitingRoomEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        if (user) {
          await createMeetingDoc(newMeetingDoc);
        }
        setMeetingDoc(newMeetingDoc);
        setIsHost(true);
      } catch (err) {
        console.warn('Could not persist meeting doc to firestore, proceeding in memory:', err);
        setMeetingDoc(newMeetingDoc);
        setIsHost(true);
      }
    } else {
      // Joining existing code: lookup
      try {
        const existing = await getMeeting(mid);
        if (existing) {
          setMeetingDoc(existing);
          setIsHost(user ? existing.hostId === user.uid : false);
        } else {
          // Allow joining ad-hoc code even if doc hasn't been fetched
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
        console.warn('Error reading meeting:', err);
      }
    }

    setMeetingId(mid);
    setMeetingState('prejoin');
    await setupLocalMedia();
  };

  // Join the actual call after device check
  const joinCall = async (guestName?: string) => {
    if (!meetingId) return;
    if (guestName) guestNameRef.current = guestName;

    const myName = profile?.displayName || user?.displayName || guestName || guestNameRef.current || 'Participant';
    const myId = user?.uid || `guest-${Math.random().toString(36).substring(2, 8)}`;

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
        // Auto-remove reaction after 2.5s
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
      onLiveCaptionReceived: (caption) => {
        setCaptions(prev => [...prev.slice(-30), caption]);
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
        setRemoteParticipants(data.existingParticipants || []);
        setMeetingState('in-call');
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

    // Subscribe to Firestore chat if meetingId is active
    if (chatUnsubscribeRef.current) {
      chatUnsubscribeRef.current();
    }
    chatUnsubscribeRef.current = subscribeMeetingMessages(meetingId, msgs => {
      setMessages(msgs);
    });

    // Initialize Gemini 3.5 live transcription service
    transcriberRef.current = new LiveTranscriptionService(myName, myId, caption => {
      setCaptions(prev => [...prev.slice(-30), caption]);
      webrtcRef.current?.sendLiveCaption(caption);
    });

    if (captionsEnabled && localStream && audioEnabled) {
      transcriberRef.current.start(localStream);
    }
  };

  const leaveCall = () => {
    if (chatUnsubscribeRef.current) {
      chatUnsubscribeRef.current();
      chatUnsubscribeRef.current = null;
    }
    if (transcriberRef.current) {
      transcriberRef.current.stop();
      transcriberRef.current = null;
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

    setRemoteParticipants([]);
    setCaptions([]);
    setMessages([]);
    setWaitingParticipants([]);
    setScreenSharing(false);
    setHandRaised(false);
    setMeetingState('ended');
  };

  const toggleAudio = () => {
    const nextState = !audioEnabled;
    setAudioEnabled(nextState);
    if (localStream) {
      localStream.getAudioTracks().forEach(t => (t.enabled = nextState));
    }
    webrtcRef.current?.updateMediaState({ audioEnabled: nextState });

    // Handle live transcriber audio feed
    if (transcriberRef.current) {
      if (nextState && captionsEnabled && localStream) {
        transcriberRef.current.start(localStream);
      } else {
        transcriberRef.current.stop();
      }
    }
  };

  const toggleVideo = () => {
    const nextState = !videoEnabled;
    setVideoEnabled(nextState);
    if (localStream) {
      localStream.getVideoTracks().forEach(t => (t.enabled = nextState));
    }
    webrtcRef.current?.updateMediaState({ videoEnabled: nextState });
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      // Stop screen share -> switch back to camera track
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      setScreenSharing(false);
      webrtcRef.current?.updateMediaState({ screenSharing: false });

      // Restore camera video track
      const cameraTrack = localStream?.getVideoTracks()[0] || null;
      await webrtcRef.current?.replaceVideoTrack(cameraTrack);
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        const screenTrack = displayStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        screenTrack.onended = () => {
          // Triggered when user clicks browser's "Stop Sharing" floating pill
          toggleScreenShare();
        };

        setScreenSharing(true);
        webrtcRef.current?.updateMediaState({ screenSharing: true });
        await webrtcRef.current?.replaceVideoTrack(screenTrack);
      } catch (err) {
        console.warn('Screen sharing cancelled or denied:', err);
      }
    }
  };

  const toggleHandRaise = () => {
    const next = !handRaised;
    setHandRaised(next);
    webrtcRef.current?.toggleHandRaise(next);
  };

  const toggleCaptions = () => {
    const next = !captionsEnabled;
    setCaptionsEnabled(next);

    if (transcriberRef.current) {
      if (next && localStream && audioEnabled) {
        transcriberRef.current.start(localStream);
      } else {
        transcriberRef.current.stop();
      }
    }
  };

  const sendReaction = (emoji: string) => {
    webrtcRef.current?.sendReaction(emoji);
  };

  const sendMessage = async (text: string, attachmentName?: string, attachmentUrl?: string) => {
    if (!meetingId) return;
    const myName = profile?.displayName || user?.displayName || guestNameRef.current || 'Participant';
    const myId = user?.uid || `guest-${Math.random().toString(36).substring(2, 8)}`;

    const newMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 10),
      meetingId,
      senderId: myId,
      senderName: myName,
      senderPhoto: profile?.photoURL || user?.photoURL || '',
      text,
      attachmentName,
      attachmentUrl,
      createdAt: new Date().toISOString(),
    };

    // Optimistic local add
    setMessages(prev => [...prev, newMsg]);

    // Broadcast via Socket.IO for zero-latency peer sync
    webrtcRef.current?.sendChatMessage(newMsg);

    // Persist to Firestore if user is authenticated
    if (user) {
      try {
        await saveMeetingMessage(newMsg);
      } catch (err) {
        console.warn('Error persisting chat message to firestore:', err);
      }
    }
  };

  // Host Actions
  const hostAdmit = (targetSocketId: string) => {
    webrtcRef.current?.hostAdmitParticipant(targetSocketId);
    setWaitingParticipants(prev => prev.filter(p => p.socketId !== targetSocketId));
  };

  const hostDeny = (targetSocketId: string) => {
    webrtcRef.current?.hostDenyParticipant(targetSocketId);
    setWaitingParticipants(prev => prev.filter(p => p.socketId !== targetSocketId));
  };

  const hostMute = (targetSocketId: string) => {
    webrtcRef.current?.hostMuteParticipant(targetSocketId);
  };

  const hostKick = (targetSocketId: string) => {
    webrtcRef.current?.hostKickParticipant(targetSocketId);
  };

  const hostToggleLock = () => {
    const next = !isLocked;
    setIsLocked(next);
    webrtcRef.current?.hostToggleLock(next);
    if (meetingId && user) {
      updateMeetingSettings(meetingId, { isLocked: next }).catch(console.warn);
    }
  };

  const hostEndMeeting = () => {
    webrtcRef.current?.hostEndMeetingForAll();
    leaveCall();
    if (meetingId && user) {
      updateMeetingSettings(meetingId, { status: 'ended' }).catch(console.warn);
    }
  };

  // Speaker audio test chime
  const testAudioOutput = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (err) {
      console.warn('Audio test failed:', err);
    }
  };

  // Generate meeting summary using Gemini 3.8
  const generateSummary = async () => {
    setIsSummarizing(true);
    setErrorMessage(null);
    try {
      // Gather transcript text from live captions and chat
      let transcriptText = captions.map(c => `${c.speakerName}: ${c.text}`).join('\n');
      if (!transcriptText && messages.length) {
        transcriptText = messages.map(m => `${m.senderName}: ${m.text}`).join('\n');
      }
      if (!transcriptText) {
        transcriptText = 'General discussion on project updates, deliverables, architectural patterns, and action items.';
      }

      const summary = await fetchMeetingSummary(transcriptText);
      setMeetingSummary(summary);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate meeting summary');
    } finally {
      setIsSummarizing(false);
    }
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
        captionsEnabled,
        captions,
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
        isSummarizing,
        meetingSummary,
        errorMessage,

        prepareMeeting,
        joinCall,
        leaveCall,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
        toggleHandRaise,
        toggleCaptions,
        sendReaction,
        sendMessage,
        setSelectedAudioInput,
        setSelectedVideoInput,
        setSelectedAudioOutput,
        testAudioOutput,
        generateSummary,
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
