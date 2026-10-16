import React, { useRef, useEffect } from 'react';
import { MicOff, Pin, Maximize2, MoreVertical, Shield } from 'lucide-react';
import type { Participant } from '../types';

interface VideoTileProps {
  participant: Participant;
  stream: MediaStream | null;
  isLocal?: boolean;
  isHost?: boolean;
  isPinned?: boolean;
  onPin?: () => void;
  onHostMute?: (socketId: string) => void;
  onHostKick?: (socketId: string) => void;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  participant,
  stream,
  isLocal = false,
  isHost = false,
  isPinned = false,
  onPin,
  onHostMute,
  onHostKick,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showMenu, setShowMenu] = React.useState<boolean>(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleTileFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.warn);
      } else {
        videoRef.current.requestFullscreen().catch(console.warn);
      }
    }
  };

  const hasVideo = participant.videoEnabled && stream && stream.getVideoTracks().some(t => t.enabled);

  return (
    <div
      className={`relative w-full h-full rounded-2xl overflow-hidden bg-slate-900 border transition-all duration-200 group flex items-center justify-center ${
        participant.isSpeaking
          ? 'border-emerald-500 shadow-lg shadow-emerald-500/20'
          : isPinned
          ? 'border-indigo-500 ring-2 ring-indigo-500/30'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Video Element */}
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal && !participant.screenSharing ? '-scale-x-100' : ''}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center space-y-3 p-4">
          <div className="w-20 h-20 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-white font-bold text-2xl shadow-xl">
            {(participant.displayName || 'U')[0]?.toUpperCase()}
          </div>
          <span className="text-xs font-medium text-slate-300">{participant.displayName}</span>
        </div>
      )}

      {/* Screen Sharing Badge */}
      {participant.screenSharing && (
        <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-indigo-600/90 backdrop-blur-md text-white text-[10px] font-semibold tracking-wide uppercase flex items-center gap-1 shadow-md">
          <span>Presenting Screen</span>
        </div>
      )}

      {/* Hand Raised Badge */}
      {participant.handRaised && (
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-amber-500/90 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-lg animate-bounce">
          <span>✋</span>
          <span className="text-[10px] uppercase tracking-wider font-extrabold">Raised Hand</span>
        </div>
      )}

      {/* Participant info bottom strip */}
      <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-xs text-white z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/70 backdrop-blur-md border border-white/10 max-w-[80%] truncate">
          {participant.role === 'host' && <Shield className="w-3 h-3 text-indigo-400 shrink-0" />}
          <span className="truncate font-medium text-[11px]">
            {participant.displayName} {isLocal ? '(You)' : ''}
          </span>
          {!participant.audioEnabled && <MicOff className="w-3 h-3 text-rose-400 shrink-0 ml-1" />}
        </div>

        {/* Hover action buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
          {onPin && (
            <button
              onClick={onPin}
              className={`p-1.5 rounded-lg backdrop-blur-md transition-colors ${
                isPinned ? 'bg-indigo-600 text-white' : 'bg-slate-950/70 text-slate-300 hover:text-white'
              }`}
              title={isPinned ? 'Unpin video' : 'Pin video'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleTileFullscreen}
            className="p-1.5 rounded-lg bg-slate-950/70 text-slate-300 hover:text-white backdrop-blur-md transition-colors"
            title="Tile fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {isHost && !isLocal && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-lg bg-slate-950/70 text-slate-300 hover:text-white backdrop-blur-md transition-colors"
                title="Host options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {showMenu && (
                <div className="absolute right-0 bottom-full mb-1 w-36 rounded-xl bg-slate-900 border border-white/10 shadow-xl p-1 z-30">
                  {onHostMute && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onHostMute(participant.socketId);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 text-[11px] transition-colors"
                    >
                      Mute participant
                    </button>
                  )}
                  {onHostKick && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onHostKick(participant.socketId);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-[11px] transition-colors"
                    >
                      Remove from call
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
