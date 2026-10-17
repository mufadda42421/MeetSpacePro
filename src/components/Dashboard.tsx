import React, { useState, useEffect } from 'react';
import {
  Video,
  Plus,
  Keyboard,
  Calendar,
  Clock,
  ShieldCheck,
  MonitorUp,
  MessageSquare,
  ArrowRight,
  Trash2,
  Download,
  Copy,
  Check,
  User,
  Zap,
  Smartphone,
  Lock,
  Mic,
  Share2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMeeting } from '../contexts/MeetingContext';
import { getScheduledMeetings, deleteScheduledMeeting } from '../lib/firestoreService';
import type { ScheduledMeetingItem } from '../types';
import { normalizeMeetingCode } from '../lib/meetingUtils';

interface DashboardProps {
  onOpenSchedule: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenSchedule }) => {
  const { user, userName, rememberMe, saveName } = useAuth();
  const { prepareMeeting } = useMeeting();

  const [meetingCodeInput, setMeetingCodeInput] = useState<string>('');
  const [scheduledList, setScheduledList] = useState<ScheduledMeetingItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [nameInput, setNameInput] = useState<string>(userName || '');
  const [rememberCheck, setRememberCheck] = useState<boolean>(rememberMe ?? true);
  const [nameSavedSuccess, setNameSavedSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'instant' | 'join' | 'schedule'>('instant');

  useEffect(() => {
    if (userName) {
      setNameInput(userName);
    }
  }, [userName]);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      saveName(nameInput.trim(), rememberCheck);
      setNameSavedSuccess(true);
      setTimeout(() => setNameSavedSuccess(false), 2000);
    }
  };

  useEffect(() => {
    if (user) {
      loadScheduled();
    } else {
      setScheduledList([]);
    }
  }, [user]);

  const loadScheduled = async () => {
    if (!user) return;
    setLoadingSchedule(true);
    try {
      const items = await getScheduledMeetings(user.uid);
      setScheduledList(items);
    } catch (err) {
      console.warn('Error loading scheduled meetings:', err);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleStartInstant = async () => {
    if (nameInput.trim()) {
      saveName(nameInput.trim(), rememberCheck);
    }
    await prepareMeeting(undefined, true, 'Instant Meeting');
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = meetingCodeInput.trim();
    if (!raw) return;

    if (nameInput.trim()) {
      saveName(nameInput.trim(), rememberCheck);
    }

    const code = normalizeMeetingCode(raw);
    await prepareMeeting(code, false);
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!user) return;
    try {
      await deleteScheduledMeeting(user.uid, id);
      setScheduledList(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.warn('Failed to delete scheduled meeting:', err);
    }
  };

  const handleCopyLink = (code: string, id: string) => {
    const url = `${window.location.origin}?meeting=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportIcs = (item: ScheduledMeetingItem) => {
    const startDate = new Date(item.startTime);
    const endDate = new Date(startDate.getTime() + item.durationMinutes * 60000);

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const formatIcsDate = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MeetSpace Video Conferencing//EN',
      'BEGIN:VEVENT',
      `UID:${item.id}@meetspace.app`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${item.title}`,
      `DESCRIPTION:${item.description || ''} Join URL: ${window.location.origin}?meeting=${item.meetingCode}`,
      `LOCATION:${window.location.origin}?meeting=${item.meetingCode}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${item.title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12 space-y-8 sm:space-y-14">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        <div className="lg:col-span-7 space-y-5 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Encrypted Direct WebRTC Video</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Premium Video Meetings. <br />
            <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
              On Any Device, Anywhere.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
            Ultra-fast, peer-to-peer enterprise video conferencing with crystal clear audio, HD camera feeds, full screen sharing, and real-time chat. Fully responsive on desktop and mobile phones.
          </p>

          {/* User Display Name & Remember Me Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Your Meeting Display Name</span>
              </span>
              {nameSavedSuccess && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="w-3 h-3" /> Saved!
                </span>
              )}
            </div>

            <form onSubmit={handleSaveName} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input
                type="text"
                placeholder="Enter your name (e.g. Sarah Connor)"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer shrink-0"
              >
                Save Name
              </button>
            </form>

            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberCheck}
                onChange={e => {
                  setRememberCheck(e.target.checked);
                  if (nameInput.trim()) {
                    saveName(nameInput.trim(), e.target.checked);
                  }
                }}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>Remember my name across meetings</span>
            </label>
          </div>

          {/* Mobile & Desktop Action Area */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={handleStartInstant}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>Start instant meeting</span>
              </button>

              <form onSubmit={handleJoinWithCode} className="w-full sm:flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <Keyboard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Enter code or paste link"
                    value={meetingCodeInput}
                    onChange={e => setMeetingCodeInput(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!meetingCodeInput.trim()}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-sm font-semibold border border-white/10 transition-colors cursor-pointer shrink-0"
                >
                  Join
                </button>
              </form>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-slate-400 pt-1">
              <button
                onClick={onOpenSchedule}
                className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors font-medium cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Schedule for later</span>
              </button>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                <span>Works on iOS, Android & Desktop</span>
              </span>
            </div>
          </div>
        </div>

        {/* Hero Interactive Card / Preview */}
        <div className="lg:col-span-5">
          <div className="relative rounded-3xl p-5 sm:p-6 bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-white/10 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Mobile & Desktop Ready</span>
            </div>

            {/* Feature Grid inside Card */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Video className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-white">HD Video & Audio</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Low-latency WebRTC streams with auto echo cancellation.
                </p>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <MonitorUp className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-white">Screen Share</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Present displays, slide decks, or tabs with 1 tap.
                </p>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-white">In-Room Chat</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Real-time chat, file links, and emoji reactions.
                </p>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-white">Host Controls</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Lock room, waiting room, mute, and attendee management.
                </p>
              </div>
            </div>

            {/* Quick Share Tip Box */}
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 flex items-center gap-2.5 text-xs text-indigo-300">
              <Share2 className="w-4 h-4 shrink-0 text-indigo-400" />
              <span className="text-[11px] leading-relaxed">
                Send the meeting link to anyone. Multiple people can join simultaneously with audio & video.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Meetings Section */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Scheduled Meetings
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage your upcoming sessions or schedule a new one
            </p>
          </div>

          <button
            onClick={onOpenSchedule}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>Schedule New Meeting</span>
          </button>
        </div>

        {loadingSchedule ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            Loading scheduled meetings...
          </div>
        ) : scheduledList.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-3">
            <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No scheduled meetings yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Create an instant meeting above or schedule a call in advance to share invite links and calendar invites with attendees.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduledList.map(item => (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3 hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-white leading-tight truncate">
                      {item.title}
                    </h3>
                    <button
                      onClick={() => handleDeleteSchedule(item.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete meeting"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{new Date(item.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span>({item.durationMinutes}m)</span>
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="text-indigo-300 font-medium truncate">{item.meetingCode}</span>
                    <button
                      onClick={() => handleCopyLink(item.meetingCode, item.id)}
                      className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy join link"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        if (nameInput.trim()) {
                          saveName(nameInput.trim(), rememberCheck);
                        }
                        prepareMeeting(item.meetingCode, false);
                      }}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Join Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleExportIcs(item)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                      title="Add to calendar (.ics)"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feature Showcase Grid */}
      <div className="pt-4 border-t border-white/10 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Designed for Modern Collaboration
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Enterprise video capabilities built with direct WebRTC peer connections
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">Full HD Video Calls</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Crisp 720p/1080p peer-to-peer video with automatic bandwidth scaling and device selection.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <MonitorUp className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">Screen Presentations</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Share full screen, app windows, or specific browser tabs with pinned speaker focus.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">Direct P2P Encryption</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Direct DTLS-SRTP encrypted peer media streams with no intermediaries recording your audio.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">Mobile & Tablet Native</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Responsive touch controls, front/back camera support, and full-screen mobile layouts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
