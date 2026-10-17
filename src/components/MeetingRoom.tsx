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
  Lock,
  Unlock,
  Copy,
  Check,
  Send,
  Paperclip,
  X,
  Volume2,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMeeting } from '../contexts/MeetingContext';
import { VideoTile } from './VideoTile';
import type { Participant } from '../types';

export const MeetingRoom: React.FC = () => {
  const { user, profile, userName } = useAuth();
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
    messages,
    reactions,
    waitingParticipants,
    isLocked,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    toggleHandRaise,
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
  } = useMeeting();

  // Panels: 'none' | 'chat' | 'participants' | 'info'
  const [activePanel, setActivePanel] = useState<'none' | 'chat' | 'participants' | 'info'>('none');
  const [pinnedSocketId, setPinnedSocketId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [showAttachmentInput, setShowAttachmentInput] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showReactionsBar, setShowReactionsBar] = useState<boolean>(false);
  const [showAudioMenu, setShowAudioMenu] = useState<boolean>(false);
  const [showVideoMenu, setShowVideoMenu] = useState<boolean>(false);

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
    displayName: userName || profile?.displayName || user?.displayName || 'You',
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

  const reactionEmojis = ['👍', '👏', '❤️', '🎉', '💡', '😂', '🔥'];

  // Video Grid layout calculations
  const totalStreams = allParticipants.length;
  const isPinned = !!pinnedSocketId;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-0rem)] bg-slate-950 overflow-hidden relative select-none">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-white/10 px-4 md:px-6 flex items-center justify-between bg-slate-900/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30">
            M
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-white tracking-tight">
              {meetingDoc?.title || 'MeetSpace Conference'}
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-mono text-indigo-300">
              {meetingId}
            </span>
          </div>

          <button
            onClick={handleCopyInvite}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Copy meeting share link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copiedLink ? 'Copied' : 'Copy link'}</span>
          </button>
        </div>

        {/* Security & Room Status */}
        <div className="flex items-center gap-3">
          {isLocked ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>Room Locked</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Direct P2P</span>
            </div>
          )}

          {isHost && (
            <button
              onClick={() => hostToggleLock(!isLocked)}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                isLocked
                  ? 'border-amber-500/30 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20'
                  : 'border-white/10 text-slate-300 hover:bg-white/5'
              }`}
              title={isLocked ? 'Unlock meeting room' : 'Lock meeting room'}
            >
              {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isLocked ? 'Unlock' : 'Lock Room'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Waiting Room Alert for Host */}
      {isHost && waitingParticipants.length > 0 && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2 flex items-center justify-between text-xs text-amber-200 z-20">
          <span>
            <strong>{waitingParticipants[0].displayName}</strong> is waiting to join the meeting ({waitingParticipants.length} waiting).
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => hostDeny(waitingParticipants[0].socketId)}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              Deny
            </button>
            <button
              onClick={() => hostAdmit(waitingParticipants[0].socketId)}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors cursor-pointer"
            >
              Admit
            </button>
          </div>
        </div>
      )}

      {/* Main Video Arena & Sidebars */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col p-3 md:p-5 overflow-hidden relative">
          {/* Main Video Grid */}
          <div className="flex-1 flex items-center justify-center min-h-0 relative">
            {isPinned ? (
              /* Pinned / Spotlight Layout */
              <div className="w-full h-full flex flex-col md:flex-row gap-4">
                <div className="flex-1 h-full min-h-0 rounded-2xl overflow-hidden">
                  {pinnedSocketId === 'local-user' ? (
                    <VideoTile
                      participant={localParticipant}
                      stream={localStream}
                      isLocal={true}
                      isPinned={true}
                      onPin={() => setPinnedSocketId(null)}
                    />
                  ) : (
                    <VideoTile
                      participant={remoteParticipants.find(p => p.socketId === pinnedSocketId) || remoteParticipants[0]}
                      stream={remoteParticipants.find(p => p.socketId === pinnedSocketId)?.stream || null}
                      isLocal={false}
                      isPinned={true}
                      onPin={() => setPinnedSocketId(null)}
                    />
                  )}
                </div>

                {/* Thumbnails rail on the side */}
                <div className="w-full md:w-56 h-32 md:h-full flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto shrink-0">
                  {allParticipants
                    .filter(p => p.socketId !== pinnedSocketId)
                    .map(p => (
                      <div key={p.socketId} className="w-44 md:w-full aspect-video shrink-0 rounded-xl overflow-hidden">
                        <VideoTile
                          participant={p}
                          stream={p.socketId === 'local-user' ? localStream : p.stream || null}
                          isLocal={p.socketId === 'local-user'}
                          isPinned={false}
                          onPin={() => setPinnedSocketId(p.socketId)}
                        />
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              /* Dynamic Adaptive Responsive Grid */
              <div
                className={`w-full h-full grid gap-4 place-items-stretch ${
                  totalStreams === 1
                    ? 'grid-cols-1 max-w-4xl max-h-[85vh]'
                    : totalStreams === 2
                    ? 'grid-cols-1 sm:grid-cols-2 max-w-5xl'
                    : totalStreams <= 4
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2'
                    : totalStreams <= 6
                    ? 'grid-cols-2 sm:grid-cols-3'
                    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                }`}
              >
                {allParticipants.map(p => (
                  <div key={p.socketId} className="w-full h-full min-h-[160px] rounded-2xl overflow-hidden">
                    <VideoTile
                      participant={p}
                      stream={p.socketId === 'local-user' ? localStream : p.stream || null}
                      isLocal={p.socketId === 'local-user'}
                      isPinned={false}
                      onPin={() => setPinnedSocketId(p.socketId)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Floating Emoji Reactions Stream */}
          <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            {reactions.map(r => (
              <div
                key={r.id}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-white/20 shadow-2xl backdrop-blur-md animate-bounce"
              >
                <span className="text-3xl">{r.emoji}</span>
                <span className="text-xs text-white font-medium">{r.senderName}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Collapsible Right Sidebar */}
        {activePanel !== 'none' && (
          <aside className="w-80 md:w-96 border-l border-white/10 bg-slate-900/95 backdrop-blur-xl flex flex-col z-20">
            {/* Panel Header */}
            <div className="h-14 border-b border-white/10 px-4 flex items-center justify-between">
              <span className="text-sm font-bold text-white capitalize">
                {activePanel === 'chat' && 'Meeting Chat'}
                {activePanel === 'participants' && `Participants (${allParticipants.length})`}
                {activePanel === 'info' && 'Meeting Details'}
              </span>
              <button
                onClick={() => setActivePanel('none')}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
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
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 text-xs`}
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="font-semibold text-slate-300">{isMe ? 'You' : m.senderName}</span>
                            <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div
                            className={`px-3 py-2 rounded-2xl max-w-[85%] break-words ${
                              isMe
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-slate-800 text-slate-200 border border-white/5 rounded-tl-none'
                            }`}
                          >
                            <p>{m.text}</p>
                            {m.attachmentUrl && (
                              <a
                                href={m.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 block text-indigo-200 underline text-[11px] truncate"
                              >
                                📎 {m.attachmentName || 'Attachment'}
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Chat Input Box */}
                <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 space-y-2">
                  {showAttachmentInput && (
                    <div className="p-2 rounded-xl bg-slate-950 border border-white/10 space-y-2 text-xs">
                      <input
                        type="text"
                        placeholder="File name (e.g. DesignSpecs.pdf)"
                        value={attachmentName}
                        onChange={e => setAttachmentName(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-slate-200 placeholder-slate-500 focus:outline-none"
                      />
                      <input
                        type="url"
                        placeholder="URL link to document or image"
                        value={attachmentUrl}
                        onChange={e => setAttachmentUrl(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-slate-200 placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowAttachmentInput(!showAttachmentInput)}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        showAttachmentInput ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                      title="Attach link or document"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <input
                      type="text"
                      placeholder="Send a message to everyone..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() && !attachmentUrl.trim()}
                      className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Panel Content: PARTICIPANTS */}
            {activePanel === 'participants' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-3 border-b border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total in room: {allParticipants.length}</span>
                  <button
                    onClick={handleCopyInvite}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {allParticipants.map(p => (
                    <div
                      key={p.socketId}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-xs text-indigo-300 shrink-0">
                          {p.displayName[0]?.toUpperCase() || 'P'}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-white truncate">{p.displayName}</span>
                            {p.socketId === 'local-user' && (
                              <span className="text-[10px] text-slate-400 font-normal">(You)</span>
                            )}
                            {p.role === 'host' && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                                Host
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            {p.audioEnabled ? 'Mic on' : 'Mic muted'} • {p.videoEnabled ? 'Cam on' : 'Cam off'}
                          </p>
                        </div>
                      </div>

                      {/* Participant Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {p.handRaised && <span title="Raised hand" className="text-base">✋</span>}
                        {isHost && p.socketId !== 'local-user' && (
                          <>
                            <button
                              onClick={() => hostMute(p.socketId)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Mute participant"
                            >
                              <MicOff className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => hostKick(p.socketId)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Remove from meeting"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
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

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">Meeting Code</span>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-white/10 font-mono text-indigo-300">
                    <span>{meetingId}</span>
                    <button onClick={handleCopyInvite} className="text-slate-400 hover:text-white cursor-pointer">
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">Direct Share Link</span>
                  <p className="text-[11px] text-slate-300 break-all p-2 rounded-xl bg-slate-950 border border-white/10">
                    {window.location.origin}?meeting={meetingId}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/10 space-y-2 text-slate-400">
                  <p className="font-semibold text-white">Security & Privacy</p>
                  <p className="text-[11px] leading-relaxed">
                    Peer-to-peer WebRTC encryption for media streaming directly between active participants.
                  </p>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Floating Emoji Reactions Selector */}
      {showReactionsBar && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-2xl bg-slate-900 border border-white/15 shadow-2xl z-40 backdrop-blur-md">
          {reactionEmojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => {
                sendReaction(emoji);
                setShowReactionsBar(false);
              }}
              className="text-2xl p-1.5 hover:scale-125 transition-transform cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Main Control Bar */}
      <footer className="h-20 border-t border-white/10 px-4 md:px-8 bg-slate-900/90 backdrop-blur-xl flex items-center justify-between z-20">
        {/* Left: Meeting Name / Timer */}
        <div className="hidden lg:flex items-center gap-3 w-56">
          <span className="font-mono text-xs text-slate-400">
            {meetingId}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-slate-400 font-medium">Connected</span>
        </div>

        {/* Center: Main Media & Interactive Controls */}
        <div className="flex items-center gap-2 md:gap-3 mx-auto">
          {/* Audio Toggle + Device Menu */}
          <div className="relative">
            <div className="flex items-center rounded-xl bg-slate-800 border border-white/10 shadow-lg">
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-l-xl transition-all cursor-pointer ${
                  audioEnabled
                    ? 'hover:bg-slate-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
                title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-white" />}
              </button>
              <button
                onClick={() => setShowAudioMenu(!showAudioMenu)}
                className="px-1.5 py-3 hover:bg-slate-700 text-slate-300 rounded-r-xl border-l border-white/10 transition-colors cursor-pointer"
                title="Microphone hardware options"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Audio Hardware Menu Popup */}
            {showAudioMenu && (
              <div className="absolute bottom-16 left-0 w-64 p-3 rounded-2xl bg-slate-900 border border-white/15 shadow-2xl text-xs space-y-2 z-40">
                <div className="flex items-center justify-between pb-1 border-b border-white/10">
                  <span className="font-bold text-white">Select Microphone</span>
                  <button
                    onClick={testAudioOutput}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Test Sound</span>
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {devices.audioInputs.map(d => (
                    <button
                      key={d.deviceId}
                      onClick={() => {
                        setSelectedAudioInput(d.deviceId);
                        setShowAudioMenu(false);
                      }}
                      className={`w-full text-left p-1.5 rounded-lg truncate transition-colors cursor-pointer ${
                        selectedAudioInput === d.deviceId
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Video Toggle + Device Menu */}
          <div className="relative">
            <div className="flex items-center rounded-xl bg-slate-800 border border-white/10 shadow-lg">
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-l-xl transition-all cursor-pointer ${
                  videoEnabled
                    ? 'hover:bg-slate-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
                title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {videoEnabled ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5 text-white" />}
              </button>
              <button
                onClick={() => setShowVideoMenu(!showVideoMenu)}
                className="px-1.5 py-3 hover:bg-slate-700 text-slate-300 rounded-r-xl border-l border-white/10 transition-colors cursor-pointer"
                title="Camera hardware options"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Video Hardware Menu Popup */}
            {showVideoMenu && (
              <div className="absolute bottom-16 left-0 w-64 p-3 rounded-2xl bg-slate-900 border border-white/15 shadow-2xl text-xs space-y-2 z-40">
                <span className="font-bold text-white block pb-1 border-b border-white/10">Select Camera</span>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {devices.videoInputs.map(d => (
                    <button
                      key={d.deviceId}
                      onClick={() => {
                        setSelectedVideoInput(d.deviceId);
                        setShowVideoMenu(false);
                      }}
                      className={`w-full text-left p-1.5 rounded-lg truncate transition-colors cursor-pointer ${
                        selectedVideoInput === d.deviceId
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Screen Share Toggle */}
          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-xl transition-all cursor-pointer ${
              screenSharing
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10'
            }`}
            title={screenSharing ? 'Stop sharing screen' : 'Share entire screen or tab'}
          >
            <MonitorUp className="w-5 h-5" />
          </button>

          {/* Raise Hand Toggle */}
          <button
            onClick={toggleHandRaise}
            className={`p-3 rounded-xl transition-all cursor-pointer ${
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
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors cursor-pointer"
            title="React with emojis"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* End / Leave Meeting Button */}
          {isHost ? (
            <button
              onClick={() => {
                if (window.confirm('Do you want to end this meeting for all participants? Click Cancel to just leave.')) {
                  hostEndMeeting();
                } else {
                  leaveCall();
                }
              }}
              className="p-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="End meeting or leave"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={leaveCall}
              className="p-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Leave call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Right: Sidebar Toggles */}
        <div className="flex items-center gap-2">
          {/* Chat Panel Toggle */}
          <button
            onClick={() => setActivePanel(activePanel === 'chat' ? 'none' : 'chat')}
            className={`p-2.5 rounded-xl transition-colors relative cursor-pointer ${
              activePanel === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Meeting chat"
          >
            <MessageSquare className="w-4 h-4" />
            {messages.length > 0 && activePanel !== 'chat' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-slate-900" />
            )}
          </button>

          {/* Participants Panel Toggle */}
          <button
            onClick={() => setActivePanel(activePanel === 'participants' ? 'none' : 'participants')}
            className={`p-2.5 rounded-xl transition-colors relative cursor-pointer ${
              activePanel === 'participants' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Participants list"
          >
            <Users className="w-4 h-4" />
            <span className="ml-1 text-xs font-semibold">{allParticipants.length}</span>
          </button>

          {/* Info Details Toggle */}
          <button
            onClick={() => setActivePanel(activePanel === 'info' ? 'none' : 'info')}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
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
