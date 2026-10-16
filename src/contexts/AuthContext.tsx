import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser } from '../lib/firebase';
import { getUserProfile, saveUserProfile, getUserPreferences, saveUserPreferences } from '../lib/firestoreService';
import type { UserProfile, UserPreferences } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Fetch or initialize user profile
          let existingProfile = await getUserProfile(currentUser.uid);
          if (!existingProfile) {
            existingProfile = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
              photoURL: currentUser.photoURL || '',
              email: currentUser.email || '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await saveUserProfile(existingProfile);
          }
          setProfile(existingProfile);

          // Fetch or initialize user preferences
          let existingPrefs = await getUserPreferences(currentUser.uid);
          if (!existingPrefs) {
            existingPrefs = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              theme: 'dark',
              mirrorVideo: true,
              noiseSuppression: true,
              captionsEnabled: false,
              updatedAt: new Date().toISOString(),
            };
            await saveUserPreferences(existingPrefs);
          }
          setPreferences(existingPrefs);
        } catch (error) {
          console.error('Error synchronizing user profile:', error);
        }
      } else {
        setProfile(null);
        setPreferences(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Sign-in failed:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  const handleUpdatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    if (!user || !preferences) return;
    const updated: UserPreferences = {
      ...preferences,
      ...newPrefs,
      updatedAt: new Date().toISOString(),
    };
    setPreferences(updated);
    try {
      await saveUserPreferences(updated);
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        preferences,
        loading,
        signIn: handleSignIn,
        signOut: handleSignOut,
        updatePreferences: handleUpdatePreferences,
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
