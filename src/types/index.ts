export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  uid: string;
  email?: string;
  theme: 'dark' | 'light' | 'system';
  mirrorVideo: boolean;
  noiseSuppression: boolean;
  updatedAt: string;
}

export interface MeetingDoc {
  meetingId: string;
  title: string;
  hostId: string;
  hostName: string;
  hostEmail?: string;
  status: 'active' | 'ended' | 'scheduled';
  isLocked: boolean;
  waitingRoomEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledMeetingItem {
  id: string;
  meetingCode: string;
  title: string;
  description?: string;
  startTime: string;
  durationMinutes: number;
  hostId: string;
  hostEmail?: string;
  createdAt: string;
}

export interface ContactItem {
  id: string;
  userId: string;
  contactEmail: string;
  contactName: string;
  createdAt: string;
}

export interface Participant {
  socketId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role: 'host' | 'participant' | 'guest';
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  handRaisedAt?: number;
  status: 'active' | 'waiting';
  stream?: MediaStream;
  isSpeaking?: boolean;
}

export interface ChatMessage {
  id: string;
  meetingId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  attachmentName?: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface MeetingReaction {
  id: string;
  emoji: string;
  senderName: string;
  senderId: string;
  timestamp: number;
}
