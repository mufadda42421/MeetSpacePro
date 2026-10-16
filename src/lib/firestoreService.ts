import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreErrors';
import type {
  UserProfile,
  UserPreferences,
  MeetingDoc,
  ChatMessage,
  ScheduledMeetingItem,
  ContactItem,
} from '../types';

/**
 * User Profile Operations
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}/public/profile`;
  try {
    const snap = await getDoc(doc(db, 'users', userId, 'public', 'profile'));
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const path = `users/${profile.uid}/public/profile`;
  try {
    await setDoc(doc(db, 'users', profile.uid, 'public', 'profile'), {
      uid: profile.uid,
      displayName: profile.displayName,
      photoURL: profile.photoURL || '',
      createdAt: profile.createdAt,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * User Preferences Operations
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const path = `users/${userId}/private/preferences`;
  try {
    const snap = await getDoc(doc(db, 'users', userId, 'private', 'preferences'));
    if (!snap.exists()) return null;
    return snap.data() as UserPreferences;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserPreferences(prefs: UserPreferences): Promise<void> {
  const path = `users/${prefs.uid}/private/preferences`;
  try {
    await setDoc(doc(db, 'users', prefs.uid, 'private', 'preferences'), {
      uid: prefs.uid,
      email: prefs.email || '',
      theme: prefs.theme,
      mirrorVideo: prefs.mirrorVideo,
      noiseSuppression: prefs.noiseSuppression,
      captionsEnabled: prefs.captionsEnabled,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Meeting Operations
 */
export async function getMeeting(meetingId: string): Promise<MeetingDoc | null> {
  const path = `meetings/${meetingId}`;
  try {
    const snap = await getDoc(doc(db, 'meetings', meetingId));
    if (!snap.exists()) return null;
    return snap.data() as MeetingDoc;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createMeetingDoc(meeting: MeetingDoc): Promise<void> {
  const path = `meetings/${meeting.meetingId}`;
  try {
    await setDoc(doc(db, 'meetings', meeting.meetingId), {
      meetingId: meeting.meetingId,
      title: meeting.title,
      hostId: meeting.hostId,
      hostName: meeting.hostName,
      status: meeting.status,
      isLocked: meeting.isLocked,
      waitingRoomEnabled: meeting.waitingRoomEnabled ?? false,
      createdAt: meeting.createdAt,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateMeetingSettings(meetingId: string, updates: Partial<MeetingDoc>): Promise<void> {
  const path = `meetings/${meetingId}`;
  try {
    await updateDoc(doc(db, 'meetings', meetingId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Meeting Chat Messages (Firestore persistence + real-time sync)
 */
export function subscribeMeetingMessages(
  meetingId: string,
  onMessages: (msgs: ChatMessage[]) => void
): () => void {
  const path = `meetings/${meetingId}/messages`;
  const q = query(
    collection(db, 'meetings', meetingId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100)
  );

  return onSnapshot(
    q,
    snapshot => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach(d => {
        msgs.push(d.data() as ChatMessage);
      });
      onMessages(msgs);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveMeetingMessage(message: ChatMessage): Promise<void> {
  const path = `meetings/${message.meetingId}/messages/${message.id}`;
  try {
    await setDoc(doc(db, 'meetings', message.meetingId, 'messages', message.id), {
      id: message.id,
      meetingId: message.meetingId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderPhoto: message.senderPhoto || '',
      text: message.text,
      attachmentName: message.attachmentName || '',
      attachmentUrl: message.attachmentUrl || '',
      createdAt: message.createdAt,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Scheduled Meetings
 */
export async function getScheduledMeetings(userId: string): Promise<ScheduledMeetingItem[]> {
  const path = `users/${userId}/scheduledMeetings`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'scheduledMeetings'));
    const items: ScheduledMeetingItem[] = [];
    snap.forEach(d => items.push(d.data() as ScheduledMeetingItem));
    return items.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveScheduledMeeting(userId: string, meeting: ScheduledMeetingItem): Promise<void> {
  const path = `users/${userId}/scheduledMeetings/${meeting.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'scheduledMeetings', meeting.id), {
      id: meeting.id,
      meetingCode: meeting.meetingCode,
      title: meeting.title,
      description: meeting.description || '',
      startTime: meeting.startTime,
      durationMinutes: meeting.durationMinutes,
      hostId: meeting.hostId,
      hostEmail: meeting.hostEmail || '',
      createdAt: meeting.createdAt,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteScheduledMeeting(userId: string, meetingId: string): Promise<void> {
  const path = `users/${userId}/scheduledMeetings/${meetingId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'scheduledMeetings', meetingId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * User Contacts
 */
export async function getUserContacts(userId: string): Promise<ContactItem[]> {
  const path = `users/${userId}/contacts`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'contacts'));
    const items: ContactItem[] = [];
    snap.forEach(d => items.push(d.data() as ContactItem));
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveUserContact(userId: string, contact: ContactItem): Promise<void> {
  const path = `users/${userId}/contacts/${contact.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'contacts', contact.id), {
      id: contact.id,
      userId: contact.userId,
      contactEmail: contact.contactEmail,
      contactName: contact.contactName,
      createdAt: contact.createdAt,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteUserContact(userId: string, contactId: string): Promise<void> {
  const path = `users/${userId}/contacts/${contactId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'contacts', contactId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
