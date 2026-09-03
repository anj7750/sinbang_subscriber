import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Newspaper, Lock, Mail, User, KeyRound, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen }) => {
  const { login, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  // UI status
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const resetFormState = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('시도 횟수가 너무 많습니다. 잠시 후 다시 시도해 주세요.');
      } else {
        setError(err.message || '로그인에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!email.trim() || !password) {
      setError('모든 필수 항목을 입력해 주세요.');
      return;
    }

    if (password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, name);
      setSuccessMsg('가입이 성공적으로 완료되었습니다! 로그인됩니다.');
    } catch (err: any) {
      console.error('Sign up error:', err);
      if (err.message && err.message.includes('허용되지 않은 이메일')) {
        setError('허용되지 않은 이메일입니다');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('이미 가입된 이메일 주소입니다. 로그인해 주세요.');
      } else if (err.code === 'auth/invalid-email') {
        setError('유효하지 않은 이메일 형식입니다.');
      } else {
        setError(err.message || '회원가입 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!email.trim()) {
      setError('비밀번호를 재설정할 이메일 주소를 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setSuccessMsg('비밀번호 재설정 이메일이 발송되었습니다. 수신함을 확인해 주세요.');
    } catch (err: any) {
      console.error('Reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('등록되지 않은 이메일 주소입니다.');
      } else {
        setError(err.message || '이메일 발송 실패. 이메일 주소를 확인해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-slate-900 p-6 text-white text-center relative">
          <div className="inline-flex p-3 rounded-xl bg-indigo-600 text-white mb-3 shadow-lg shadow-indigo-500/30">
            <Newspaper className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            신문과방송 DM 관리 시스템
          </h2>
          <p className="text-xs text-indigo-300 font-semibold mt-1 uppercase tracking-wider">
            한국언론진흥재단 내부 전용 Portal
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              resetFormState();
            }}
            className={`flex-1 py-3 text-center transition-colors ${
              mode === 'login'
                ? 'bg-white text-indigo-600 border-b-2 border-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              resetFormState();
            }}
            className={`flex-1 py-3 text-center transition-colors ${
              mode === 'signup'
                ? 'bg-white text-indigo-600 border-b-2 border-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            회원가입
          </button>
        </div>

        {/* Form Container */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  이메일 주소
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@kpf.or.kr"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    비밀번호
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      resetFormState();
                    }}
                    className="text-xs text-indigo-600 hover:underline font-semibold"
                  >
                    비밀번호 재설정
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호 입력"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg shadow-md transition-colors flex items-center justify-center gap-2"
              >
                {loading ? '로그인 중...' : '시스템 로그인'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="mt-4 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[11px] text-slate-600 leading-relaxed">
                <span className="font-bold text-indigo-700 block mb-0.5">💡 안내:</span>
                한국언론진흥재단 허용 이메일 목록(allowed_emails)에 등록된 계정으로만 가입 및 로그인이 가능합니다.
              </div>
            </form>
          )}

          {/* MODE: SIGN UP */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  이름 / 부서명
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동 (미디어진흥팀)"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  이메일 주소 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jam@kpf.or.kr"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  * Firestore <code className="font-mono bg-slate-100 px-1 rounded">allowed_emails</code>에 등록된 이메일만 가입 가능합니다.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  비밀번호 <span className="text-xs font-normal text-slate-500">(최소 8자 이상)</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8자 이상 입력"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  비밀번호 재확인
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="비밀번호 재입력"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {loading ? '가입 확인 중...' : '회원가입 신청'}
              </button>
            </form>
          )}

          {/* MODE: PASSWORD RESET */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="text-xs text-slate-600 leading-relaxed mb-2">
                가입하신 이메일 주소를 입력하시면 비밀번호를 다시 설정할 수 있는 이메일 링크를 발송해 드립니다.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  가입 이메일 주소
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jam@kpf.or.kr"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    resetFormState();
                  }}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  이전으로
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                >
                  {loading ? '발송 중...' : '재설정 이메일 발송'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
