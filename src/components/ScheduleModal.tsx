import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Clock, Copy, Check, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { saveScheduledMeeting } from '../lib/firestoreService';
import type { ScheduledMeetingItem } from '../types';

interface ScheduleModalProps {
  onClose: () => void;
  onSaved?: () => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ onClose, onSaved }) => {
  const { user } = useAuth();

  const [title, setTitle] = useState<string>('Team Sync');
  const [description, setDescription] = useState<string>('Project sprint planning and review.');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>('10:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [scheduledItem, setScheduledItem] = useState<ScheduledMeetingItem | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      // Generate unique meeting code
      const p1 = Math.random().toString(36).substring(2, 5);
      const p2 = Math.random().toString(36).substring(2, 6);
      const p3 = Math.random().toString(36).substring(2, 5);
      const meetingCode = `${p1}-${p2}-${p3}`;

      const startTime = new Date(`${date}T${time}`).toISOString();

      const item: ScheduledMeetingItem = {
        id: Math.random().toString(36).substring(2, 10),
        meetingCode,
        title: title.trim(),
        description: description.trim(),
        startTime,
        durationMinutes,
        hostId: user?.uid || 'guest-host',
        hostEmail: user?.email || '',
        createdAt: new Date().toISOString(),
      };

      if (user) {
        await saveScheduledMeeting(user.uid, item);
      }
      setScheduledItem(item);
      onSaved?.();
    } catch (err) {
      console.error('Failed to schedule meeting:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!scheduledItem) return;
    const url = `${window.location.origin}?meeting=${scheduledItem.meetingCode}`;
    const inviteText = `MeetSpace Video Meeting\nTitle: ${scheduledItem.title}\nTime: ${new Date(
      scheduledItem.startTime
    ).toLocaleString()}\nJoin URL: ${url}`;
    navigator.clipboard.writeText(inviteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportIcs = () => {
    if (!scheduledItem) return;
    const startDate = new Date(scheduledItem.startTime);
    const endDate = new Date(startDate.getTime() + scheduledItem.durationMinutes * 60000);

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const formatIcsDate = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MeetSpace Video Conferencing//EN',
      'BEGIN:VEVENT',
      `UID:${scheduledItem.id}@meetspace.app`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${scheduledItem.title}`,
      `DESCRIPTION:${scheduledItem.description || ''} Join URL: ${window.location.origin}?meeting=${scheduledItem.meetingCode}`,
      `LOCATION:${window.location.origin}?meeting=${scheduledItem.meetingCode}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${scheduledItem.title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Schedule Meeting</h3>
              <p className="text-[11px] text-slate-400">Generates invite link and calendar file (.ics)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {scheduledItem ? (
          /* Confirmation Screen */
          <div className="p-6 space-y-6 text-xs">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <span className="font-bold text-emerald-300 text-sm">Meeting Successfully Scheduled!</span>
              <p className="text-slate-300 leading-normal">
                Your conference room has been reserved. You can share this link with guests or add it to your calendar.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Meeting Code:</span>
                <span className="font-mono font-bold text-indigo-300 px-2 py-0.5 rounded bg-slate-950">
                  {scheduledItem.meetingCode}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Date & Time:</span>
                <span className="text-white font-medium">
                  {new Date(scheduledItem.startTime).toLocaleString([], {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Duration:</span>
                <span className="text-white font-medium">{scheduledItem.durationMinutes} minutes</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleCopy}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-white/10 flex items-center justify-center gap-2 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied Details' : 'Copy Invite'}</span>
              </button>
              <button
                onClick={handleExportIcs}
                className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Add to Calendar</span>
              </button>
            </div>
          </div>
        ) : (
          /* Scheduling Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Meeting subject"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Description (Optional)</label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Agenda or context for participants"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Start Time</label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Duration</label>
              <select
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
              </select>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
              >
                {isSubmitting ? 'Scheduling...' : 'Save & Generate Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
