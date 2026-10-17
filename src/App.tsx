import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { MeetingProvider, useMeeting } from './contexts/MeetingContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { PreJoinScreen } from './components/PreJoinScreen';
import { MeetingRoom } from './components/MeetingRoom';
import { ScheduleModal } from './components/ScheduleModal';
import { ContactsModal } from './components/ContactsModal';
import { SettingsModal } from './components/SettingsModal';

function MainApp() {
  const { meetingState, meetingId, prepareMeeting } = useMeeting();

  const [showSchedule, setShowSchedule] = useState<boolean>(false);
  const [showContacts, setShowContacts] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Check URL query param ?meeting=code on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const meetingCode = params.get('meeting');
    if (meetingCode && meetingState === 'idle') {
      prepareMeeting(meetingCode, false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navbar visible on dashboard and prejoin */}
      {meetingState !== 'in-call' && (
        <Navbar
          onOpenSchedule={() => setShowSchedule(true)}
          onOpenContacts={() => setShowContacts(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {meetingState === 'in-call' ? (
          <MeetingRoom />
        ) : meetingState === 'prejoin' || meetingState === 'waiting' ? (
          <PreJoinScreen />
        ) : (
          <Dashboard onOpenSchedule={() => setShowSchedule(true)} />
        )}
      </main>

      {/* Modals */}
      {showSchedule && (
        <ScheduleModal
          onClose={() => setShowSchedule(false)}
          onSaved={() => {
            // Refreshed schedule
          }}
        />
      )}
      {showContacts && (
        <ContactsModal
          onClose={() => setShowContacts(false)}
          activeMeetingId={meetingId}
        />
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MeetingProvider>
        <MainApp />
      </MeetingProvider>
    </AuthProvider>
  );
}
