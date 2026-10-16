import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Mail, Trash2, Copy, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserContacts, saveUserContact, deleteUserContact } from '../lib/firestoreService';
import type { ContactItem } from '../types';

interface ContactsModalProps {
  onClose: () => void;
  activeMeetingId?: string | null;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({ onClose, activeMeetingId }) => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [contactName, setContactName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadContacts();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadContacts = async () => {
    if (!user) return;
    try {
      const items = await getUserContacts(user.uid);
      setContacts(items);
    } catch (err) {
      console.warn('Error loading contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !contactName.trim() || !contactEmail.trim()) return;

    const newContact: ContactItem = {
      id: Math.random().toString(36).substring(2, 10),
      userId: user.uid,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
    };

    try {
      await saveUserContact(user.uid, newContact);
      setContacts(prev => [...prev, newContact]);
      setContactName('');
      setContactEmail('');
    } catch (err) {
      console.error('Failed to save contact:', err);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!user) return;
    try {
      await deleteUserContact(user.uid, contactId);
      setContacts(prev => prev.filter(c => c.id !== contactId));
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  const handleCopyInvite = (contact: ContactItem) => {
    const meetingCode = activeMeetingId || 'meetspace-session';
    const inviteUrl = `${window.location.origin}?meeting=${meetingCode}`;
    const subject = encodeURIComponent(`Invitation: MeetSpace Video Conference`);
    const body = encodeURIComponent(
      `Hi ${contact.contactName},\n\nPlease join my MeetSpace video conference:\n${inviteUrl}\n\nSee you there!`
    );
    window.open(`mailto:${contact.contactEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Contacts Directory</h3>
              <p className="text-[11px] text-slate-400">Save collaborators and quickly invite them to video calls</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Add Contact Form */}
          {user ? (
            <form onSubmit={handleAdd} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                <UserPlus className="w-4 h-4 text-indigo-400" />
                <span>Add New Contact</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Contact Name"
                  required
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-md transition-colors"
              >
                Save Contact
              </button>
            </form>
          ) : (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center text-slate-400">
              Sign in with Google to save persistent contacts to your cloud account.
            </div>
          )}

          {/* Contacts List */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
              Saved Contacts ({contacts.length})
            </span>

            {loading ? (
              <div className="py-8 text-center text-slate-500">Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div className="py-8 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl">
                No contacts saved yet.
              </div>
            ) : (
              contacts.map(c => (
                <div
                  key={c.id}
                  className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                      {c.contactName[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{c.contactName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{c.contactEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopyInvite(c)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-white/10 transition-colors"
                      title="Invite contact via email"
                    >
                      <Mail className="w-3 h-3 text-indigo-400" />
                      <span>Invite</span>
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Remove contact"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
