import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Volume2,
  Copy,
  Check,
  ArrowLeft,
  Settings,
  ShieldCheck,
  AlertCircle,
  User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMeeting } from '../contexts/MeetingContext';

export const PreJoinScreen: React.FC = () => {
  const { userName, rememberMe: storedRememberMe, saveName } = useAuth();
  const {
    meetingId,
    meetingDoc,
    localStream,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    joinCall,
    leaveCall,
    devices,
    selectedAudioInput,
    selectedVideoInput,
    setSelectedAudioInput,
    setSelectedVideoInput,
    testAudioOutput,
    errorMessage,
    clearErrorMessage,
  } = useMeeting();

  const [displayName, setDisplayName] = useState<string>(userName || '');
  const [rememberMe, setRememberMe] = useState<boolean>(storedRememberMe ?? true);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showDeviceSettings, setShowDeviceSettings] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Sync saved name if context updates
  useEffect(() => {
    if (userName && !displayName) {
      setDisplayName(userName);
    }
  }, [userName]);

  // Connect local video stream to preview tile
  useEffect(() => {
    if (videoRef.current && localStream && videoEnabled) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, videoEnabled]);

  // Audio level meter visualization
  useEffect(() => {
    if (!localStream || !audioEnabled) {
      setAudioLevel(0);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const audioTrack = localStream.getAudioTracks()[0];
      if (!audioTrack) return;

      const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
    } catch (err) {
      console.warn('Audio meter init error:', err);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(console.warn);
    };
  }, [localStream, audioEnabled]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}?meeting=${meetingId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = displayName.trim() || userName || 'Participant';
    saveName(finalName, rememberMe);
    setIsJoining(true);
    try {
      await joinCall(finalName);
    } catch (err: any) {
      console.error('Failed to join call:', err);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-slate-950">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Video Preview Card */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl flex items-center justify-center">
            {videoEnabled && localStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
            ) : (
              <div className="text-center space-y-3">
                <div className="w-20 h-20 rounded-full bg-slate-800 border border-white/10 mx-auto flex items-center justify-center font-bold text-2xl text-slate-300">
                  {(displayName || userName || 'P')[0]?.toUpperCase()}
                </div>
                <p className="text-xs text-slate-400 font-medium">Camera is off</p>
              </div>
            )}

            {/* Mic audio meter indicator overlay */}
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-xs">
              {audioEnabled ? (
                <>
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-75"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <MicOff className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-400 font-medium text-[11px]">Mic Muted</span>
                </>
              )}
            </div>

            {/* Floating Device Controls */}
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={toggleAudio}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  audioEnabled
                    ? 'bg-slate-800/90 hover:bg-slate-700 text-white border border-white/10 shadow-lg'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                }`}
                title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={toggleVideo}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  videoEnabled
                    ? 'bg-slate-800/90 hover:bg-slate-700 text-white border border-white/10 shadow-lg'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                }`}
                title={videoEnabled ? 'Turn camera off' : 'Turn camera on'}
              >
                {videoEnabled ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                className="w-12 h-12 rounded-full bg-slate-800/90 hover:bg-slate-700 text-white border border-white/10 flex items-center justify-center transition-colors shadow-lg cursor-pointer"
                title="Configure audio & video hardware"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Device configuration popup */}
          {showDeviceSettings && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3 animate-in fade-in text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="font-semibold text-white">Hardware Settings</span>
                <button
                  type="button"
                  onClick={testAudioOutput}
                  className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Test Speaker</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Microphone</label>
                  <select
                    value={selectedAudioInput}
                    onChange={e => setSelectedAudioInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none"
                  >
                    {devices.audioInputs.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Camera</label>
                  <select
                    value={selectedVideoInput}
                    onChange={e => setSelectedVideoInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none"
                  >
                    {devices.videoInputs.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Meeting Join Details */}
        <div className="lg:col-span-5 space-y-6">
          <button
            type="button"
            onClick={leaveCall}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {meetingDoc?.title || 'Ready to join?'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-indigo-300 font-semibold">
                {meetingId}
              </span>
              <span>•</span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link copied' : 'Copy link'}</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
              <button onClick={clearErrorMessage} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>
          )}

          {/* Display Name Input & Remember Me */}
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Your Name</span>
                </span>
                {userName && (
                  <span className="text-[10px] text-indigo-400 font-normal">
                    Saved from previous meeting
                  </span>
                )}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Enter your name to join"
                required
                autoFocus
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>Remember my name throughout meetings</span>
            </label>

            {/* Join Primary Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isJoining || !displayName.trim()}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isJoining ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Joining room...</span>
                  </>
                ) : (
                  <span>Join Meeting</span>
                )}
              </button>
            </div>
          </form>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1.5 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Direct Peer-to-Peer Video Call</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              No account required. Once you join, you will be connected directly with all other participants in room <strong className="text-slate-300">{meetingId}</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
