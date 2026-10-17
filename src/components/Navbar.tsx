import React, { useState, useEffect } from 'react';
import { Video, Calendar, Users, Settings, ShieldCheck, Check, Menu, X, Smartphone } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

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
    <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-md z-30 sticky top-0">
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
        {/* Brand Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Video className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                MeetSpace
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                P2P
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live clock & status (Desktop) */}
        <div className="hidden md:flex items-center gap-4 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{currentTime}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted WebRTC</span>
          </div>
        </div>

        {/* Right: Actions & User Name (Desktop) */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={onOpenSchedule}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            title="Schedule a meeting"
          >
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Schedule</span>
          </button>

          <button
            onClick={onOpenContacts}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            title="My contacts"
          >
            <Users className="w-4 h-4 text-slate-400" />
            <span>Contacts</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
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
                className="p-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-xs text-slate-200 cursor-pointer"
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

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => setIsEditingName(!isEditingName)}
            className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs"
            title="Edit display name"
          >
            {(userName || 'U')[0]?.toUpperCase()}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/5"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-white/10 bg-slate-950/95 px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          {/* Mobile Name Input */}
          <form onSubmit={handleSaveName} className="space-y-1.5 pb-3 border-b border-white/10">
            <span className="text-xs text-slate-400 font-semibold">Your Display Name</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Enter name"
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>

          {/* Action Links */}
          <div className="space-y-1">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSchedule();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-200 hover:bg-white/5 text-sm transition-colors text-left"
            >
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Schedule a Meeting</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenContacts();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-200 hover:bg-white/5 text-sm transition-colors text-left"
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Contacts</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-200 hover:bg-white/5 text-sm transition-colors text-left"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Audio & Video Settings</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
