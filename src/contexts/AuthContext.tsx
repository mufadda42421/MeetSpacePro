import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { auth } from '../lib/firebase';
import type { UserProfile, UserPreferences } from '../types';

export interface AuthUser {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
}

interface AuthContextType {
  userName: string;
  userId: string;
  rememberMe: boolean;
  profile: UserProfile;
  preferences: UserPreferences;
  user: AuthUser;
  saveName: (name: string, remember: boolean) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load stored user id or create a persistent local identifier
  const [userId, setUserId] = useState<string>(() => {
    let id = localStorage.getItem('meetspace_user_id');
    if (!id) {
      id = `usr_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem('meetspace_user_id', id);
    }
    return id;
  });

  // Remember me setting (defaults to true)
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    const stored = localStorage.getItem('meetspace_remember_me');
    return stored === null ? true : stored === 'true';
  });

  // User display name from localStorage if remembered
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('meetspace_user_name') || '';
  });

  // User preferences
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    return {
      uid: userId,
      theme: 'dark',
      mirrorVideo: true,
      noiseSuppression: true,
      updatedAt: new Date().toISOString(),
    };
  });

  // Silent anonymous authentication in background for Firebase Firestore compliance
  useEffect(() => {
    if (auth) {
      signInAnonymously(auth)
        .then((cred) => {
          if (cred?.user?.uid) {
            setUserId(cred.user.uid);
            localStorage.setItem('meetspace_user_id', cred.user.uid);
          }
        })
        .catch((err) => {
          // Non-blocking fallback; local storage and memory remain fully operational
          console.warn('Anonymous auth note (app works fully offline/locally):', err?.message);
        });
    }
  }, []);

  const saveName = (name: string, remember: boolean) => {
    const trimmed = name.trim();
    setUserName(trimmed);
    setRememberMe(remember);

    if (remember) {
      localStorage.setItem('meetspace_user_name', trimmed);
      localStorage.setItem('meetspace_remember_me', 'true');
    } else {
      localStorage.removeItem('meetspace_user_name');
      localStorage.setItem('meetspace_remember_me', 'false');
    }
  };

  const updatePreferences = (newPrefs: Partial<UserPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      ...newPrefs,
      updatedAt: new Date().toISOString(),
    }));
  };

  const profile: UserProfile = {
    uid: userId,
    displayName: userName || 'Participant',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const user: AuthUser = {
    uid: userId,
    displayName: userName || 'Participant',
    email: '',
    photoURL: '',
  };

  return (
    <AuthContext.Provider
      value={{
        userName,
        userId,
        rememberMe,
        profile,
        preferences,
        user,
        saveName,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
