import React from 'react';
import { X, Settings, Volume2, ShieldCheck, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMeeting } from '../contexts/MeetingContext';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { preferences, updatePreferences } = useAuth();
  const {
    devices,
    selectedAudioInput,
    selectedVideoInput,
    selectedAudioOutput,
    setSelectedAudioInput,
    setSelectedVideoInput,
    setSelectedAudioOutput,
    testAudioOutput,
  } = useMeeting();

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Preferences & Hardware</h3>
              <p className="text-[11px] text-slate-400">Audio, video, speech-to-text, and conference controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Audio & Video Devices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Hardware Devices</span>
              <button
                onClick={testAudioOutput}
                className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Test Speaker Tone</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-slate-400">Microphone Input</label>
              <select
                value={selectedAudioInput}
                onChange={e => setSelectedAudioInput(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
              >
                {devices.audioInputs.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-slate-400">Camera Input</label>
              <select
                value={selectedVideoInput}
                onChange={e => setSelectedVideoInput(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
              >
                {devices.videoInputs.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Video Preferences */}
          <div className="pt-3 border-t border-white/10 space-y-3">
            <span className="font-semibold text-slate-200">Video & Audio Processing</span>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
              <div>
                <p className="font-medium text-white">Mirror Local Video</p>
                <p className="text-[11px] text-slate-400">Flip your camera feed horizontally for natural viewing</p>
              </div>
              <input
                type="checkbox"
                checked={preferences?.mirrorVideo ?? true}
                onChange={e => updatePreferences({ mirrorVideo: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-950 border-white/20"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
              <div>
                <p className="font-medium text-white">Noise Suppression</p>
                <p className="text-[11px] text-slate-400">Filter background keyboard clicks and ambient room noise</p>
              </div>
              <input
                type="checkbox"
                checked={preferences?.noiseSuppression ?? true}
                onChange={e => updatePreferences({ noiseSuppression: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-950 border-white/20"
              />
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero-Trust Privacy & Security</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Media streams are direct peer-to-peer WebRTC connections. Database records and preferences are protected by Firebase Firestore security rules.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
