import React, { useState, useEffect } from 'react';
import { Video, Calendar, Users, Settings, Sparkles, User as UserIcon, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  onOpenSchedule: () => void;
  onOpenContacts: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSchedule, onOpenContacts, onOpenSettings }) => {
  const { userName, saveName, rememberMe } = useAuth();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(userName || '');

  useEffect(() => {
    setNameInput(userName || '');
  }, [userName]);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ' • ' +
        now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      saveName(nameInput.trim(), rememberMe);
      setIsEditingName(false);
    }
  };

  return (
    <header className="h-16 border-b border-white/10 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Video className="w-5 h-5 text-indigo-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              MeetSpace
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Direct Join
            </span>
          </div>
        </div>
      </div>

      {/* Center: Live clock & status */}
      <div className="hidden md:flex items-center gap-4 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{currentTime}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Gemini AI Transcription</span>
        </div>
      </div>

      {/* Right: Actions & User Name */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSchedule}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          title="Schedule a meeting"
        >
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Schedule</span>
        </button>

        <button
          onClick={onOpenContacts}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          title="My contacts"
        >
          <Users className="w-4 h-4 text-slate-400" />
          <span>Contacts</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          title="App settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User Name Pill */}
        {isEditingName ? (
          <form onSubmit={handleSaveName} className="flex items-center gap-1">
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Your name"
              autoFocus
              className="w-32 bg-slate-950 border border-indigo-500/50 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
            />
            <button
              type="submit"
              className="p-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-xs text-slate-200"
            title="Click to edit your display name"
          >
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-[11px]">
              {(userName || 'U')[0]?.toUpperCase()}
            </div>
            <span className="font-medium max-w-[120px] truncate">
              {userName || 'Set Your Name'}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
