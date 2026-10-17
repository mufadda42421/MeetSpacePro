import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { MeetingProvider, useMeeting } from './contexts/MeetingContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { PreJoinScreen } from './components/PreJoinScreen';
import { MeetingRoom } from './components/MeetingRoom';
import { ScheduleModal } from './components/ScheduleModal';
import { ContactsModal } from './components/ContactsModal';
import { SettingsModal } from './components/SettingsModal';
import { extractMeetingCodeFromUrl } from './lib/meetingUtils';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RoomErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RoomErrorBoundary caught an error:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}

function MainApp() {
  const { meetingState, meetingId, prepareMeeting, leaveCall } = useMeeting();

  const [showSchedule, setShowSchedule] = useState<boolean>(false);
  const [showContacts, setShowContacts] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Check URL (query param or hash or path) on load and navigation
  useEffect(() => {
    const handleUrlCheck = () => {
      const code = extractMeetingCodeFromUrl();
      if (code && meetingState === 'idle') {
        prepareMeeting(code, false);
      }
    };

    handleUrlCheck();
    window.addEventListener('popstate', handleUrlCheck);
    window.addEventListener('hashchange', handleUrlCheck);

    return () => {
      window.removeEventListener('popstate', handleUrlCheck);
      window.removeEventListener('hashchange', handleUrlCheck);
    };
  }, [meetingState, prepareMeeting]);

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

      {/* Main View Router with ErrorBoundary */}
      <main className="flex-1 flex flex-col">
        {meetingState === 'in-call' ? (
          <RoomErrorBoundary
            fallback={(error, reset) => (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-2xl font-bold">
                  !
                </div>
                <h2 className="text-xl font-bold text-white">Call Disconnected</h2>
                <p className="text-xs text-slate-400 max-w-md">
                  {error.message || 'There was an issue connecting your media stream. Please check camera and mic permissions and retry.'}
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      reset();
                      if (meetingId) prepareMeeting(meetingId, false);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Rejoin Room
                  </button>
                  <button
                    onClick={() => {
                      reset();
                      leaveCall();
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
                  >
                    Return Home
                  </button>
                </div>
              </div>
            )}
          >
            <MeetingRoom />
          </RoomErrorBoundary>
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
