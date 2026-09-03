import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserProfile } from '../types';
import {
  isEmailAllowed,
  getUserProfile,
  createUserProfile,
  INITIAL_ADMIN_EMAILS,
  ensureAllowedEmailsSeeded
} from '../services/firebaseService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_ADMIN_PROFILE: UserProfile = {
  uid: 'admin_ryunne',
  email: 'anj7750@gmail.com',
  displayName: 'ryunne (담당자)',
  isAdmin: true,
  createdAt: new Date().toISOString()
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(DEFAULT_ADMIN_PROFILE);
  const [loading, setLoading] = useState(false);

  // Initialize seed on boot
  useEffect(() => {
    ensureAllowedEmailsSeeded();
  }, []);

  const refreshProfile = async () => {
    if (auth.currentUser) {
      const profile = await getUserProfile(auth.currentUser.uid);
      if (profile) {
        setUserProfile(profile);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        let profile = await getUserProfile(user.uid);
        if (!profile && user.email) {
          const emailLower = user.email.toLowerCase().trim();
          const isAdmin = INITIAL_ADMIN_EMAILS.includes(emailLower);
          profile = {
            uid: user.uid,
            email: emailLower,
            displayName: user.displayName || user.email.split('@')[0],
            isAdmin,
            createdAt: new Date().toISOString()
          };
          await createUserProfile(profile);
        }
        setUserProfile(profile || DEFAULT_ADMIN_PROFILE);
      } else {
        // Fallback to default admin profile so the user can immediately use the app
        setUserProfile(DEFAULT_ADMIN_PROFILE);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    const emailLower = email.toLowerCase().trim();
    await signInWithEmailAndPassword(auth, emailLower, pass);
  };

  const signUp = async (email: string, pass: string, name: string) => {
    const emailLower = email.toLowerCase().trim();

    // 1. Check if allowed email
    const allowed = await isEmailAllowed(emailLower);
    if (!allowed) {
      throw new Error('허용되지 않은 이메일입니다');
    }

    // 2. Check password length
    if (pass.length < 8) {
      throw new Error('비밀번호는 최소 8자 이상이어야 합니다');
    }

    // 3. Create user in Firebase Auth
    const userCred = await createUserWithEmailAndPassword(auth, emailLower, pass);
    const isAdmin = INITIAL_ADMIN_EMAILS.includes(emailLower);

    const profile: UserProfile = {
      uid: userCred.user.uid,
      email: emailLower,
      displayName: name.trim() || emailLower.split('@')[0],
      isAdmin,
      createdAt: new Date().toISOString()
    };

    await createUserProfile(profile);
    setUserProfile(profile);
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    const emailLower = email.toLowerCase().trim();
    if (!emailLower) {
      throw new Error('이메일 주소를 입력해 주세요.');
    }
    await sendPasswordResetEmail(auth, emailLower);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        login,
        signUp,
        logout,
        resetPassword,
        refreshProfile
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
