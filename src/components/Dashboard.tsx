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
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMeeting } from '../contexts/MeetingContext';
import { getScheduledMeetings, deleteScheduledMeeting } from '../lib/firestoreService';
import type { ScheduledMeetingItem } from '../types';

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

    // Handle full URL with query param or path or raw code
    let code = raw;
    if (raw.includes('meeting=')) {
      code = raw.split('meeting=')[1].split('&')[0];
    } else if (raw.includes('/meeting/')) {
      code = raw.split('/meeting/')[1].split('?')[0];
    } else if (raw.includes('/')) {
      code = raw.split('/').pop() || raw;
    }
    // Clean code of hash or extra params
    code = code.replace(/[?#].*$/, '').trim();
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
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>High-Definition Video Collaboration</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Meet face-to-face, <br />
            <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
              from anywhere in the world.
            </span>
          </h1>

          <p className="text-base text-slate-400 max-w-xl leading-relaxed">
            Fast, secure video conferencing with WebRTC peer-to-peer media, screen sharing, waiting rooms, and real-time interactive messaging.
          </p>

          {/* User Name & Remember Me Box */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Your Display Name</span>
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
                placeholder="Enter your name (e.g. Alex Taylor)"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
              >
                Save
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
              <span>Remember my name throughout meetings</span>
            </label>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <button
              onClick={handleStartInstant}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Start an instant meeting</span>
            </button>

            <form onSubmit={handleJoinWithCode} className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <Keyboard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Enter a code or link"
                  value={meetingCodeInput}
                  onChange={e => setMeetingCodeInput(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <button
                type="submit"
                disabled={!meetingCodeInput.trim()}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-white text-sm font-semibold border border-white/10 transition-colors cursor-pointer"
              >
                Join
              </button>
            </form>
          </div>

          <div className="flex items-center gap-3 pt-2 text-xs text-slate-400">
            <button
              onClick={onOpenSchedule}
              className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors font-medium cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule a meeting for later</span>
            </button>
            <span>•</span>
            <span>No account or software installation required</span>
          </div>
        </div>

        {/* Feature Hero Card */}
        <div className="lg:col-span-5">
          <div className="relative rounded-3xl p-6 bg-gradient-to-b from-slate-800/80 to-slate-900/80 border border-white/10 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
              <span className="text-xs text-slate-400 font-mono">Live Conference Ready</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Video className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-white">WebRTC HD Video</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Peer-to-peer low-latency encrypted media with dynamic bandwidth adaptation.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <MonitorUp className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-white">Screen Sharing</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Share entire display, application windows, or browser tabs with system audio.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-white">Live Room Chat</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Instant messaging, document links, and floating emoji reactions for all attendees.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-white">Host Moderation</h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Waiting rooms, mute controls, meeting lock, and participant admission.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Meetings / Calendar Section */}
      <div className="pt-6 border-t border-white/10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Your Scheduled Meetings</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Stored securely and exportable to Google Calendar or Outlook (.ics)
            </p>
          </div>
          <button
            onClick={onOpenSchedule}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 hover:text-white transition-colors border border-white/10 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule New</span>
          </button>
        </div>

        {loadingSchedule ? (
          <div className="py-12 text-center text-slate-500 text-sm">Loading your meetings...</div>
        ) : scheduledList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-slate-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-300">No scheduled meetings</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Schedule a future conference call with automated calendar export and shareable invitation links.
              </p>
            </div>
            <button
              onClick={onOpenSchedule}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-semibold rounded-xl border border-indigo-500/20 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule meeting</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduledList.map(item => {
              const d = new Date(item.startTime);
              const isPast = d.getTime() < Date.now();

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border ${
                    isPast ? 'bg-slate-900/40 border-white/5 opacity-70' : 'bg-slate-900/80 border-white/10'
                  } space-y-3 flex flex-col justify-between`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-white line-clamp-1">{item.title}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {item.meetingCode}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                        {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({item.durationMinutes} min)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyLink(item.meetingCode, item.id)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                        title="Copy invitation URL"
                      >
                        {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleExportIcs(item)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                        title="Download .ics calendar event"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete scheduled meeting"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => prepareMeeting(item.meetingCode, false, item.title)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                      <span>Join</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
