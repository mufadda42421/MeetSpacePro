import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MonitorUp,
  Hand,
  MessageSquare,
  Users,
  Info,
  PhoneOff,
  Smile,
  Subtitles,
  Sparkles,
  Lock,
  Unlock,
  Copy,
  Check,
  Send,
  Paperclip,
  Download,
  X,
  Volume2,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMeeting } from '../contexts/MeetingContext';
import { VideoTile } from './VideoTile';
import type { Participant } from '../types';

interface MeetingRoomProps {
  onOpenSummary: () => void;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({ onOpenSummary }) => {
  const { user, profile } = useAuth();
  const {
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
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    toggleHandRaise,
    toggleCaptions,
    sendReaction,
    sendMessage,
    leaveCall,
    hostAdmit,
    hostDeny,
    hostMute,
    hostKick,
    hostToggleLock,
    hostEndMeeting,
    devices,
    selectedAudioInput,
    selectedVideoInput,
    setSelectedAudioInput,
    setSelectedVideoInput,
    testAudioOutput,
    generateSummary,
    isSummarizing,
  } = useMeeting();

  // Panels: 'none' | 'chat' | 'participants' | 'transcript' | 'info'
  const [activePanel, setActivePanel] = useState<'none' | 'chat' | 'participants' | 'transcript' | 'info'>('none');
  const [pinnedSocketId, setPinnedSocketId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [showAttachmentInput, setShowAttachmentInput] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showReactionsBar, setShowReactionsBar] = useState<boolean>(false);
  const [showAudioMenu, setShowAudioMenu] = useState<boolean>(false);
  const [showVideoMenu, setShowVideoMenu] = useState<boolean>(false);
  const [transcriptSearch, setTranscriptSearch] = useState<string>('');

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Construct local participant object
  const localParticipant: Participant = {
    socketId: 'local-user',
    userId: user?.uid || 'local-user',
    displayName: profile?.displayName || user?.displayName || 'You',
    avatarUrl: profile?.photoURL || user?.photoURL || '',
    role: isHost ? 'host' : 'participant',
    audioEnabled,
    videoEnabled,
    screenSharing,
    handRaised,
    status: 'active',
  };

  const allParticipants = [localParticipant, ...remoteParticipants];

  // Auto pin screen sharer if present
  useEffect(() => {
    const sharer = allParticipants.find(p => p.screenSharing);
    if (sharer) {
      setPinnedSocketId(sharer.socketId);
    } else if (pinnedSocketId === 'local-user' && !screenSharing) {
      setPinnedSocketId(null);
    }
  }, [screenSharing, remoteParticipants]);

  const handleCopyInvite = () => {
    const url = `${window.location.origin}?meeting=${meetingId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && !attachmentUrl.trim()) return;
    await sendMessage(chatInput.trim(), attachmentName.trim() || undefined, attachmentUrl.trim() || undefined);
    setChatInput('');
    setAttachmentName('');
    setAttachmentUrl('');
    setShowAttachmentInput(false);
  };

  const handleDownloadTranscript = () => {
    if (!captions.length) return;
    const textContent = captions
      .map(
        c =>
          `[${new Date(c.timestamp).toLocaleTimeString()}] ${c.speakerName}: ${c.text}`
      )
      .join('\r\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `MeetSpace_Transcript_${meetingId}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pinned or screen sharing participant
  const pinnedParticipant = pinnedSocketId
    ? allParticipants.find(p => p.socketId === pinnedSocketId)
    : null;

  // Grid sizing logic
  const gridCount = pinnedParticipant ? allParticipants.length - 1 : allParticipants.length;
  const getGridClass = () => {
    if (pinnedParticipant) return 'flex flex-col gap-2 overflow-y-auto max-h-full p-2';
    if (gridCount <= 1) return 'grid grid-cols-1 max-w-4xl mx-auto h-full p-4';
    if (gridCount === 2) return 'grid grid-cols-1 md:grid-cols-2 gap-4 h-full p-4';
    if (gridCount <= 4) return 'grid grid-cols-2 gap-4 h-full p-4';
    if (gridCount <= 6) return 'grid grid-cols-2 md:grid-cols-3 gap-3 h-full p-3';
    return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 h-full p-3';
  };

  // Filtered transcript search
  const filteredCaptions = captions.filter(
    c =>
      c.text.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
      c.speakerName.toLowerCase().includes(transcriptSearch.toLowerCase())
  );

  return (
    <div className="relative h-[calc(100vh-4rem)] bg-slate-950 flex flex-col overflow-hidden select-none">
      {/* Top Banner: Waiting room notification for Host */}
      {isHost && waitingParticipants.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-amber-200 z-20 animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-semibold">
              {waitingParticipants[0].displayName} is waiting to join the meeting
              {waitingParticipants.length > 1 ? ` (+${waitingParticipants.length - 1} more)` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => hostDeny(waitingParticipants[0].socketId)}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              Deny
            </button>
            <button
              onClick={() => hostAdmit(waitingParticipants[0].socketId)}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
            >
              Admit
            </button>
          </div>
        </div>
      )}

      {/* Main Video Arena & Sidebars */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left/Center: Video Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-950">
          {pinnedParticipant ? (
            /* Pinned / Presentation View */
            <div className="flex-1 flex flex-col lg:flex-row p-3 gap-3 overflow-hidden">
              <div className="flex-1 rounded-2xl overflow-hidden relative shadow-2xl">
                <VideoTile
                  participant={pinnedParticipant}
                  stream={pinnedParticipant.socketId === 'local-user' ? localStream : (pinnedParticipant.stream || null)}
                  isLocal={pinnedParticipant.socketId === 'local-user'}
                  isHost={isHost}
                  isPinned={true}
                  onPin={() => setPinnedSocketId(null)}
                />
              </div>

              {/* Side filmstrip of other participants */}
              <div className="w-full lg:w-64 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto">
                {allParticipants
                  .filter(p => p.socketId !== pinnedParticipant.socketId)
                  .map(p => (
                    <div key={p.socketId} className="w-48 lg:w-full h-32 shrink-0">
                      <VideoTile
                        participant={p}
                        stream={p.socketId === 'local-user' ? localStream : (p.stream || null)}
                        isLocal={p.socketId === 'local-user'}
                        isHost={isHost}
                        isPinned={false}
                        onPin={() => setPinnedSocketId(p.socketId)}
                        onHostMute={hostMute}
                        onHostKick={hostKick}
                      />
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            /* Standard Adaptive Grid View */
            <div className={getGridClass()}>
              {allParticipants.map(p => (
                <div key={p.socketId} className="w-full h-full min-h-[160px]">
                  <VideoTile
                    participant={p}
                    stream={p.socketId === 'local-user' ? localStream : (p.stream || null)}
                    isLocal={p.socketId === 'local-user'}
                    isHost={isHost}
                    isPinned={false}
                    onPin={() => setPinnedSocketId(p.socketId)}
                    onHostMute={hostMute}
                    onHostKick={hostKick}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Floating Emoji Reactions Stream */}
          <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            {reactions.map(r => (
              <div
                key={r.id}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 animate-float-reaction flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-white/20 shadow-2xl backdrop-blur-md"
              >
                <span className="text-3xl">{r.emoji}</span>
                <span className="text-xs text-white font-medium">{r.senderName}</span>
              </div>
            ))}
          </div>

          {/* Live Subtitles Floating Banner (Gemini 3.5 Transcribe Output) */}
          {captionsEnabled && captions.length > 0 && (
            <div className="absolute bottom-20 inset-x-8 max-w-2xl mx-auto z-20 pointer-events-none">
              <div className="bg-slate-950/85 backdrop-blur-md border border-white/15 px-4 py-2.5 rounded-2xl shadow-2xl text-center space-y-0.5 animate-in fade-in slide-in-from-bottom-2">
                <p className="text-[11px] font-bold text-indigo-400">
                  {captions[captions.length - 1].speakerName}
                </p>
                <p className="text-sm font-medium text-white tracking-wide">
                  "{captions[captions.length - 1].text}"
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Right Sidebar */}
        {activePanel !== 'none' && (
          <aside className="w-80 md:w-96 border-l border-white/10 bg-slate-900/95 backdrop-blur-xl flex flex-col z-20">
            {/* Panel Header */}
            <div className="h-14 border-b border-white/10 px-4 flex items-center justify-between">
              <span className="text-sm font-bold text-white capitalize">
                {activePanel === 'chat' && 'Meeting Chat'}
                {activePanel === 'participants' && `Participants (${allParticipants.length})`}
                {activePanel === 'transcript' && 'Live Gemini Transcript'}
                {activePanel === 'info' && 'Meeting Details'}
              </span>
              <button
                onClick={() => setActivePanel('none')}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel Content: CHAT */}
            {activePanel === 'chat' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      No messages yet. Say hello or share notes!
                    </div>
                  ) : (
                    messages.map(m => {
                      const isMe = m.senderId === (user?.uid || 'local-user');
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="font-semibold text-slate-300">{m.senderName}</span>
                            <span>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div
                            className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed break-words ${
                              isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/10 text-slate-100 rounded-tl-none'
                            }`}
                          >
                            <p>{m.text}</p>
                            {m.attachmentUrl && (
                              <a
                                href={m.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 block p-2 rounded-xl bg-black/20 hover:bg-black/30 text-indigo-300 underline text-[11px]"
                              >
                                📎 {m.attachmentName || 'Shared Link / File'}
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Chat Input Bar */}
                <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 space-y-2">
                  {showAttachmentInput && (
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 space-y-1 text-xs">
                      <input
                        type="text"
                        placeholder="File / Link title (e.g. Design Specs)"
                        value={attachmentName}
                        onChange={e => setAttachmentName(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs"
                      />
                      <input
                        type="url"
                        placeholder="https://... URL"
                        value={attachmentUrl}
                        onChange={e => setAttachmentUrl(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAttachmentInput(!showAttachmentInput)}
                      className={`p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors ${
                        showAttachmentInput ? 'text-indigo-400' : ''
                      }`}
                      title="Attach file or URL"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <input
                      type="text"
                      placeholder="Send a message to everyone..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />

                    <button
                      type="submit"
                      disabled={!chatInput.trim() && !attachmentUrl.trim()}
                      className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Panel Content: PARTICIPANTS */}
            {activePanel === 'participants' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isHost && (
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <span className="text-xs font-semibold text-white">Host Controls</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Lock Meeting</span>
                      <button
                        onClick={hostToggleLock}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                          isLocked ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">
                    In Call ({allParticipants.length})
                  </span>
                  {allParticipants.map(p => (
                    <div
                      key={p.socketId}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                          {(p.displayName || 'U')[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">
                            {p.displayName} {p.socketId === 'local-user' ? '(You)' : ''}
                          </p>
                          <p className="text-[10px] text-slate-400 capitalize">{p.role}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {p.handRaised && <span title="Raised hand">✋</span>}
                        {p.audioEnabled ? (
                          <Mic className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <MicOff className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        {p.videoEnabled ? (
                          <VideoIcon className="w-3.5 h-3.5 text-slate-300" />
                        ) : (
                          <VideoOff className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Panel Content: LIVE TRANSCRIPT (Gemini 3.5 Transcribe) */}
            {activePanel === 'transcript' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-3 border-b border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-indigo-400 font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gemini 3.5 Transcribe</span>
                    </span>
                    <button
                      onClick={handleDownloadTranscript}
                      disabled={!captions.length}
                      className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white disabled:opacity-40"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Search in transcript..."
                    value={transcriptSearch}
                    onChange={e => setTranscriptSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                  {filteredCaptions.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      {captionsEnabled
                        ? 'Listening to microphone speech... speak to transcribe.'
                        : 'Captions are currently toggled off. Turn on Captions (CC) in the toolbar.'}
                    </div>
                  ) : (
                    filteredCaptions.map(c => (
                      <div key={c.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-bold text-indigo-300">{c.speakerName}</span>
                          <span>{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-200">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 border-t border-white/10">
                  <button
                    onClick={async () => {
                      await generateSummary();
                      onOpenSummary();
                    }}
                    disabled={isSummarizing}
                    className="w-full py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isSummarizing ? 'Summarizing transcript...' : 'Generate AI Meeting Summary'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Panel Content: INFO */}
            {activePanel === 'info' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">Meeting Title</span>
                  <p className="text-sm font-bold text-white">{meetingDoc?.title || 'MeetSpace Conference'}</p>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <span className="text-slate-400 font-medium">Shareable Joining URL</span>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 font-mono text-[11px] text-indigo-300 select-all break-all">
                    <span>{`${window.location.origin}?meeting=${meetingId}`}</span>
                  </div>
                  <button
                    onClick={handleCopyInvite}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied Invitation Link' : 'Copy Joining Info'}</span>
                  </button>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-semibold text-slate-400">Security & Encryption</span>
                  <p className="text-slate-400 leading-normal">
                    Real-time audio and video are encrypted in transit via WebRTC DTLS/SRTP protocols with STUN/TURN NAT traversal.
                  </p>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Floating Reactions Bar */}
      {showReactionsBar && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-white/15 px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 z-40 animate-in fade-in slide-in-from-bottom-2">
          {['👏', '❤️', '👍', '😂', '😮', '🎉'].map(emoji => (
            <button
              key={emoji}
              onClick={() => {
                sendReaction(emoji);
                setShowReactionsBar(false);
              }}
              className="text-2xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Persistent Bottom Meeting Control Bar */}
      <footer className="h-18 border-t border-white/10 bg-slate-900/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between z-30">
        {/* Left: Meeting info & time */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span className="font-semibold text-slate-200">{meetingDoc?.title || 'MeetSpace'}</span>
          <span>•</span>
          <span>{meetingId}</span>
        </div>

        {/* Center: Main Media & Interactive Controls */}
        <div className="flex items-center gap-2 sm:gap-3 mx-auto">
          {/* Mic Button with Device Selector Popover */}
          <div className="relative">
            <div className="flex items-center rounded-xl bg-slate-800 border border-white/10 shadow-lg">
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-l-xl transition-all ${
                  audioEnabled ? 'text-white hover:bg-slate-700' : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
                title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowAudioMenu(!showAudioMenu)}
                className="p-1.5 hover:bg-slate-700 rounded-r-xl text-slate-400 hover:text-white transition-colors"
                title="Microphone settings"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>

            {showAudioMenu && (
              <div className="absolute bottom-full mb-2 left-0 w-64 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-3 z-50 text-xs space-y-2">
                <span className="font-semibold text-white">Select Microphone</span>
                {devices.audioInputs.map(d => (
                  <button
                    key={d.deviceId}
                    onClick={() => {
                      setSelectedAudioInput(d.deviceId);
                      setShowAudioMenu(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg truncate ${
                      selectedAudioInput === d.deviceId ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                  </button>
                ))}
                <button
                  onClick={testAudioOutput}
                  className="w-full text-left p-2 rounded-lg text-indigo-400 hover:bg-indigo-500/10 flex items-center gap-1.5"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Test Speaker Chime</span>
                </button>
              </div>
            )}
          </div>

          {/* Camera Button with Device Selector Popover */}
          <div className="relative">
            <div className="flex items-center rounded-xl bg-slate-800 border border-white/10 shadow-lg">
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-l-xl transition-all ${
                  videoEnabled ? 'text-white hover:bg-slate-700' : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
                title={videoEnabled ? 'Turn camera off' : 'Turn camera on'}
              >
                {videoEnabled ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowVideoMenu(!showVideoMenu)}
                className="p-1.5 hover:bg-slate-700 rounded-r-xl text-slate-400 hover:text-white transition-colors"
                title="Camera settings"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>

            {showVideoMenu && (
              <div className="absolute bottom-full mb-2 left-0 w-64 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-3 z-50 text-xs space-y-2">
                <span className="font-semibold text-white">Select Camera</span>
                {devices.videoInputs.map(d => (
                  <button
                    key={d.deviceId}
                    onClick={() => {
                      setSelectedVideoInput(d.deviceId);
                      setShowVideoMenu(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg truncate ${
                      selectedVideoInput === d.deviceId ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Screen Share Button */}
          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-xl transition-all ${
              screenSharing
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10'
            }`}
            title={screenSharing ? 'Stop sharing screen' : 'Share entire screen or tab'}
          >
            <MonitorUp className="w-5 h-5" />
          </button>

          {/* Live Captions Toggle (Powered by Gemini 3.5 Transcribe) */}
          <button
            onClick={toggleCaptions}
            className={`p-3 rounded-xl transition-all flex items-center gap-1.5 ${
              captionsEnabled
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10'
            }`}
            title="Toggle Live Speech Transcription (Gemini 3.5)"
          >
            <Subtitles className="w-5 h-5" />
          </button>

          {/* Raise Hand Toggle */}
          <button
            onClick={toggleHandRaise}
            className={`p-3 rounded-xl transition-all ${
              handRaised
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10'
            }`}
            title={handRaised ? 'Lower hand' : 'Raise hand'}
          >
            <Hand className="w-5 h-5" />
          </button>

          {/* Emoji Reactions Picker Toggle */}
          <button
            onClick={() => setShowReactionsBar(!showReactionsBar)}
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors"
            title="React with emojis"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* End / Leave Meeting Button */}
          {isHost ? (
            <button
              onClick={() => {
                if (window.confirm('Do you want to end this meeting for all participants?')) {
                  hostEndMeeting();
                } else {
                  leaveCall();
                }
              }}
              className="p-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95"
              title="End meeting or leave"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={leaveCall}
              className="p-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95"
              title="Leave call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Right: Sidebar Toggles & AI Summary */}
        <div className="flex items-center gap-2">
          {/* AI Summary Button */}
          <button
            onClick={async () => {
              await generateSummary();
              onOpenSummary();
            }}
            disabled={isSummarizing}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors"
            title="Generate AI Meeting Summary"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isSummarizing ? 'Thinking...' : 'AI Summary'}</span>
          </button>

          {/* Transcript Panel Toggle */}
          <button
            onClick={() => setActivePanel(activePanel === 'transcript' ? 'none' : 'transcript')}
            className={`p-2.5 rounded-xl transition-colors ${
              activePanel === 'transcript' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Live transcript stream"
          >
            <Subtitles className="w-4 h-4" />
          </button>

          {/* Chat Panel Toggle */}
          <button
            onClick={() => setActivePanel(activePanel === 'chat' ? 'none' : 'chat')}
            className={`p-2.5 rounded-xl transition-colors relative ${
              activePanel === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Chat"
          >
            <MessageSquare className="w-4 h-4" />
            {messages.length > 0 && activePanel !== 'chat' && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-400" />
            )}
          </button>

          {/* Participants List Toggle */}
          <button
            onClick={() => setActivePanel(activePanel === 'participants' ? 'none' : 'participants')}
            className={`p-2.5 rounded-xl transition-colors relative ${
              activePanel === 'participants' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Participants"
          >
            <Users className="w-4 h-4" />
            <span className="text-[10px] font-bold ml-1">{allParticipants.length}</span>
          </button>

          {/* Info Details Toggle */}
          <button
            onClick={() => setActivePanel(activePanel === 'info' ? 'none' : 'info')}
            className={`p-2.5 rounded-xl transition-colors ${
              activePanel === 'info' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Meeting details"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};
