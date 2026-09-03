import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, KeyRound, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { FloatingGhost } from './FloatingGhost';

export const LoginScreen: React.FC = () => {
  const { login, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');

  // Form states
  const [idOrEmail, setIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  // UI status
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetFormState = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!idOrEmail.trim() || !password) {
      setError('아이디(또는 이메일)와 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      await login(idOrEmail, password);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || '아이디 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!idOrEmail.trim() || !password) {
      setError('모든 필수 항목을 입력해 주세요.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      await signUp(idOrEmail, password, name);
      setSuccessMsg('가입이 성공적으로 완료되었습니다! 로그인되었습니다.');
    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!idOrEmail.trim()) {
      setError('비밀번호를 재설정할 이메일 주소를 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(idOrEmail);
      setSuccessMsg('비밀번호 재설정 이메일이 발송되었습니다. 수신함을 확인해 주세요.');
    } catch (err: any) {
      console.error('Reset error:', err);
      setError(err.message || '이메일 발송에 실패했습니다. 이메일 주소를 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 flex flex-col items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
      <div className="max-w-md w-full">
        {/* Cute Floating Ghost Mascot */}
        <div className="flex justify-center mb-1">
          <FloatingGhost size={96} showSpeechBubble={true} />
        </div>

        {/* Portal Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            신문과방송 독자 관리 포털
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            한국언론진흥재단 정기간행물 독자 및 발송 관리 시스템
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
          {/* Mode Switcher */}
          <div className="flex border-b border-slate-200 bg-slate-50/50">
            <button
              type="button"
              onClick={() => { setMode('login'); resetFormState(); }}
              className={`flex-1 py-3 text-xs font-bold transition-colors cursor-pointer text-center ${
                mode === 'login'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); resetFormState(); }}
              className={`flex-1 py-3 text-xs font-bold transition-colors cursor-pointer text-center ${
                mode === 'signup'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              신규 등록
            </button>
            <button
              type="button"
              onClick={() => { setMode('reset'); resetFormState(); }}
              className={`flex-1 py-3 text-xs font-bold transition-colors cursor-pointer text-center ${
                mode === 'reset'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              비밀번호 재설정
            </button>
          </div>

          <div className="p-6">
            {/* Status Messages */}
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed font-medium">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span className="leading-relaxed font-medium">{successMsg}</span>
              </div>
            )}

            {/* 1. LOGIN MODE */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    아이디 또는 이메일
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={idOrEmail}
                      onChange={(e) => setIdOrEmail(e.target.value)}
                      placeholder="아이디 또는 이메일 입력"
                      className="w-full pl-9.5 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    비밀번호
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="비밀번호 입력"
                      className="w-full pl-9.5 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? '로그인 중...' : '시스템 로그인'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* 2. SIGNUP MODE */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    성명 (담당자 이름)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="예: 홍길동"
                      className="w-full pl-9.5 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    이메일 주소 (한국언론진흥재단 이메일)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={idOrEmail}
                      onChange={(e) => setIdOrEmail(e.target.value)}
                      placeholder="example@kpf.or.kr"
                      className="w-full pl-9.5 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    * 사전 승인된 재단 이메일 목록(allowed_emails)에 등록된 주소만 가입 가능합니다.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    비밀번호
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="최소 6자 이상"
                      className="w-full pl-9.5 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    비밀번호 확인
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="비밀번호 재입력"
                      className="w-full pl-9.5 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? '가입 처리 중...' : '계정 등록 완료'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* 3. RESET PASSWORD MODE */}
            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    가입된 이메일 주소
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={idOrEmail}
                      onChange={(e) => setIdOrEmail(e.target.value)}
                      placeholder="example@kpf.or.kr"
                      className="w-full pl-9.5 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? '발송 중...' : '비밀번호 재설정 이메일 발송'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); resetFormState(); }}
                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    로그인 화면으로 돌아가기
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-400">
          신문과방송 독자 관리 포털 &copy; 한국언론진흥재단
        </div>
      </div>
    </div>
  );
};
