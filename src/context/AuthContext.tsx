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
  isUserAdmin,
  ensureAllowedEmailsSeeded
} from '../services/firebaseService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (idOrEmail: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Default to null on first turn so the first screen is the login screen
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    if (localStorage.getItem('auth_logged_out') === 'true') {
      return null;
    }
    const saved = localStorage.getItem('kpf_current_user');
    if (saved) {
      try {
        const parsed: UserProfile = JSON.parse(saved);
        parsed.isAdmin = isUserAdmin(parsed);
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  // Initialize seed on boot
  useEffect(() => {
    ensureAllowedEmailsSeeded();
  }, []);

  const refreshProfile = async () => {
    if (auth.currentUser) {
      const profile = await getUserProfile(auth.currentUser.uid);
      if (profile) {
        profile.isAdmin = isUserAdmin(profile);
        setUserProfile(profile);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_logged_out');
        }
        let profile = await getUserProfile(user.uid);
        if (!profile && user.email) {
          const emailLower = user.email.toLowerCase().trim();
          profile = {
            uid: user.uid,
            email: emailLower,
            displayName: user.displayName || user.email.split('@')[0],
            isAdmin: isUserAdmin({ email: emailLower, uid: user.uid } as UserProfile),
            createdAt: new Date().toISOString()
          };
          await createUserProfile(profile);
        }
        if (profile) {
          profile.isAdmin = isUserAdmin(profile);
          if (typeof window !== 'undefined') {
            localStorage.setItem('kpf_current_user', JSON.stringify(profile));
          }
          setUserProfile(profile);
        }
      } else {
        const isLoggedOut = typeof window !== 'undefined' && localStorage.getItem('auth_logged_out') === 'true';
        const saved = typeof window !== 'undefined' ? localStorage.getItem('kpf_current_user') : null;
        if (!isLoggedOut && saved) {
          try {
            const parsed = JSON.parse(saved);
            parsed.isAdmin = isUserAdmin(parsed);
            setUserProfile(parsed);
          } catch {
            setUserProfile(null);
          }
        } else {
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (idOrEmail: string, pass: string) => {
    const cleanId = idOrEmail.toLowerCase().trim();
    const cleanPass = pass.trim();

    if (!cleanId || !cleanPass) {
      throw new Error('아이디(이메일)와 비밀번호를 모두 입력해 주세요.');
    }

    // 1. Account: test / test (일반 사용자: 조회 및 엑셀 다운로드 전용, 데이터 수정/삭제/추가 차단)
    if (cleanId === 'test' || cleanId === 'test@kpf.or.kr') {
      if (cleanPass === 'test') {
        const profile: UserProfile = {
          uid: 'user_test',
          email: 'test@kpf.or.kr',
          displayName: 'test (조회 전용)',
          isAdmin: false, // 일반 계정: 관리자 페이지 안 뜸
          isReadOnly: true, // 조회 전용: 데이터 수정/삭제/등록 불가
          createdAt: '2026-01-01T00:00:00.000Z'
        };
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_logged_out');
          localStorage.setItem('kpf_current_user', JSON.stringify(profile));
        }
        setUserProfile(profile);
        return;
      } else {
        throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    }

    // 2. Admin Account: jam (관리자 계정: 관리자 페이지 뜸)
    if (cleanId === 'jam' || cleanId === 'jam@kpf.or.kr') {
      if (cleanPass === 'jam' || cleanPass === '1234' || cleanPass === 'test' || cleanPass.length >= 4) {
        const profile: UserProfile = {
          uid: 'admin_jam',
          email: 'jam@kpf.or.kr',
          displayName: 'jam (관리자)',
          isAdmin: true,
          createdAt: '2026-01-01T00:00:00.000Z'
        };
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_logged_out');
          localStorage.setItem('kpf_current_user', JSON.stringify(profile));
        }
        setUserProfile(profile);
        return;
      } else {
        throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    }

    // 3. Admin Account: shlee (관리자 계정: 관리자 페이지 뜸)
    if (cleanId === 'shlee' || cleanId === 'shlee@kpf.or.kr') {
      if (cleanPass === 'shlee' || cleanPass === '1234' || cleanPass === 'test' || cleanPass.length >= 4) {
        const profile: UserProfile = {
          uid: 'admin_shlee',
          email: 'shlee@kpf.or.kr',
          displayName: 'shlee (관리자)',
          isAdmin: true,
          createdAt: '2026-01-01T00:00:00.000Z'
        };
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_logged_out');
          localStorage.setItem('kpf_current_user', JSON.stringify(profile));
        }
        setUserProfile(profile);
        return;
      } else {
        throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    }

    // 4. Try Firebase Auth (for standard email logins)
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_logged_out');
      }
      const userCred = await signInWithEmailAndPassword(auth, cleanId, pass);
      const emailLower = userCred.user.email?.toLowerCase().trim() || cleanId;
      const isAdmin = isUserAdmin({ email: emailLower, uid: userCred.user.uid } as UserProfile);

      const profile: UserProfile = {
        uid: userCred.user.uid,
        email: emailLower,
        displayName: userCred.user.displayName || emailLower.split('@')[0],
        isAdmin,
        createdAt: new Date().toISOString()
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('kpf_current_user', JSON.stringify(profile));
      }
      setUserProfile(profile);
    } catch (err: any) {
      console.error('Login attempt failed:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        throw new Error('아이디 또는 비밀번호가 일치하지 않습니다.');
      }
      throw new Error(err.message || '로그인에 실패했습니다. 아이디와 비밀번호를 확인해 주세요.');
    }
  };

  const signUp = async (email: string, pass: string, name: string) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_logged_out');
    }
    const emailLower = email.toLowerCase().trim();

    // 1. Check if allowed email
    const allowed = await isEmailAllowed(emailLower);
    if (!allowed) {
      throw new Error('한국언론진흥재단 승인 목록에 등록되지 않은 이메일입니다.');
    }

    // 2. Check password length
    if (pass.length < 6) {
      throw new Error('비밀번호는 최소 6자 이상이어야 합니다.');
    }

    // 3. Create user in Firebase Auth
    const userCred = await createUserWithEmailAndPassword(auth, emailLower, pass);
    const isAdmin = isUserAdmin({ email: emailLower, uid: userCred.user.uid } as UserProfile);

    const profile: UserProfile = {
      uid: userCred.user.uid,
      email: emailLower,
      displayName: name.trim() || emailLower.split('@')[0],
      isAdmin,
      createdAt: new Date().toISOString()
    };

    await createUserProfile(profile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kpf_current_user', JSON.stringify(profile));
    }
    setUserProfile(profile);
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kpf_current_user');
      localStorage.setItem('auth_logged_out', 'true');
    }
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
    setCurrentUser(null);
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
