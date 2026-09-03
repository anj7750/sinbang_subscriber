import React, { useState, useEffect } from 'react';
import { AllowedEmail, UserProfile } from '../types';
import {
  subscribeToAllowedEmails,
  addAllowedEmail,
  deleteAllowedEmail,
  subscribeToUsers,
  updateUserAdminRole
} from '../services/firebaseService';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Mail,
  UserCheck,
  Plus,
  Trash2,
  Search,
  AlertTriangle,
  CheckCircle2,
  Lock,
  UserX,
  ShieldAlert,
  Info
} from 'lucide-react';

export const AdminManagement: React.FC = () => {
  const { userProfile } = useAuth();
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Status messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isAddingEmail, setIsAddingEmail] = useState(false);

  // Subscribe to allowed_emails and users collections
  useEffect(() => {
    const unsubEmails = subscribeToAllowedEmails((data) => setAllowedEmails(data));
    const unsubUsers = subscribeToUsers((data) => setUsers(data));

    return () => {
      unsubEmails();
      unsubUsers();
    };
  }, []);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const emailTrim = newEmail.trim().toLowerCase();
    if (!emailTrim || !emailTrim.includes('@')) {
      setErrorMsg('올바른 이메일 주소를 입력해 주세요.');
      return;
    }

    if (allowedEmails.some((item) => item.email.toLowerCase() === emailTrim)) {
      setErrorMsg('이미 허용 목록에 등록되어 있는 이메일입니다.');
      return;
    }

    setIsAddingEmail(true);
    try {
      await addAllowedEmail(emailTrim, userProfile?.email || 'admin');
      setNewEmail('');
      setSuccessMsg(`'${emailTrim}' 이메일이 회원가입 허용 목록에 추가되었습니다.`);
    } catch (err: any) {
      console.error('Error adding allowed email:', err);
      setErrorMsg(err.message || '이메일 추가 중 오류가 발생했습니다.');
    } finally {
      setIsAddingEmail(false);
    }
  };

  const [emailToDelete, setEmailToDelete] = useState<string | null>(null);
  const [userToToggleAdmin, setUserToToggleAdmin] = useState<UserProfile | null>(null);

  const handleConfirmDeleteAllowedEmail = async () => {
    if (!emailToDelete) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await deleteAllowedEmail(emailToDelete.toLowerCase());
      setSuccessMsg(`'${emailToDelete}' 이메일이 허용 목록에서 삭제되었습니다.`);
      setEmailToDelete(null);
    } catch (err: any) {
      console.error('Error deleting allowed email:', err);
      setErrorMsg('허용 이메일 삭제에 실패했습니다.');
    }
  };

  const handleConfirmToggleAdmin = async () => {
    if (!userToToggleAdmin) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const nextAdminState = !userToToggleAdmin.isAdmin;
    try {
      await updateUserAdminRole(userToToggleAdmin.uid, userProfile?.uid || '', nextAdminState);
      setSuccessMsg(`'${userToToggleAdmin.email}' 사용자의 관리자 권한이 성공적으로 변경되었습니다.`);
      setUserToToggleAdmin(null);
    } catch (err: any) {
      console.error('Error updating admin role:', err);
      setErrorMsg(err.message || '권한 변경 실패');
    }
  };

  // Filter lists
  const filteredAllowedEmails = allowedEmails.filter((item) =>
    item.email.toLowerCase().includes(emailSearch.toLowerCase().trim())
  );

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(userSearch.toLowerCase().trim()) ||
      (u.displayName || '').toLowerCase().includes(userSearch.toLowerCase().trim())
  );

  if (!userProfile?.isAdmin) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-md mx-auto my-12 shadow-sm">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">접근 권한 제한</h2>
        <p className="text-xs text-slate-600 mt-2">
          이 페이지는 시스템 관리자 권한이 있는 계정만 접근할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 mb-12">
      {/* Page Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-600 text-white rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-extrabold tracking-tight">시스템 관리자 설정</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              관리자 전용
            </span>
          </div>
          <p className="text-xs text-slate-400">
            회원가입 허용 이메일 목록 관리 및 가입된 직원의 시스템 관리자 권한을 설정합니다.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs bg-slate-800/90 px-4 py-2.5 rounded-xl border border-slate-700">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            현재 접속 관리자: <strong className="text-white font-bold">{userProfile.displayName || userProfile.email}</strong>
          </span>
        </div>
      </div>

      {/* Global Toast Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* SECTION 1: ALLOWED EMAILS WHITELIST */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-800">1. 회원가입 허용 이메일 목록</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {allowedEmails.length}개 등록됨
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              목록에 사전 등록된 이메일 주소만 시스템 회원가입이 가능합니다.
            </p>
          </div>

          {/* Add Allowed Email Form */}
          <form onSubmit={handleAddEmail} className="flex items-center gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="추가할 이메일 (예: user@kpf.or.kr)"
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
            />
            <button
              type="submit"
              disabled={isAddingEmail || !newEmail.trim()}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>이메일 추가</span>
            </button>
          </form>
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={emailSearch}
              onChange={(e) => setEmailSearch(e.target.value)}
              placeholder="허용 이메일 검색..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <span className="text-[11px] text-slate-400">
            초기 등록 관리자: jam@kpf.or.kr, shlee@kpf.or.kr 포함
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">허용 이메일 주소</th>
                <th className="px-6 py-3">가입 상태</th>
                <th className="px-6 py-3">등록 일시</th>
                <th className="px-6 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredAllowedEmails.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    검색 조건에 맞는 허용 이메일이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredAllowedEmails.map((item) => {
                  const isSignedUp = users.some((u) => u.email.toLowerCase() === item.email.toLowerCase());
                  return (
                    <tr key={item.id || item.email} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-semibold text-slate-800">
                        {item.email}
                      </td>
                      <td className="px-6 py-3.5">
                        {isSignedUp ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            가입 완료
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            미가입 (가입 대기)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 font-mono text-[11px]">
                        {item.addedAt ? item.addedAt.split('T')[0] : '기본 등록'}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => setEmailToDelete(item.email)}
                          className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>삭제</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: REGISTERED USERS & ADMIN PRIVILEGES */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-800">2. 가입 사용자 및 관리자 권한 설정</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                총 {users.length}명 가입됨
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              가입된 직원의 관리자 권한을 부여하거나 해제할 수 있습니다.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="사용자명, 이메일 검색..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">사용자명 / 부서</th>
                <th className="px-6 py-3">이메일</th>
                <th className="px-6 py-3">권한 상태</th>
                <th className="px-6 py-3">가입일</th>
                <th className="px-6 py-3 text-right">권한 변경</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    가입된 사용자가 없거나 검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = userProfile?.uid === u.uid;

                  return (
                    <tr
                      key={u.uid}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelf ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <td className="px-6 py-3.5 font-bold text-slate-800 flex items-center gap-2">
                        <span>{u.displayName || u.email.split('@')[0]}</span>
                        {isSelf && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-700 border border-indigo-300">
                            나 (본인)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 font-mono">
                        {u.email}
                      </td>
                      <td className="px-6 py-3.5">
                        {u.isAdmin ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-300 inline-flex items-center gap-1.5 shadow-2xs">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                            관리자
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            일반 사용자
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 font-mono text-[11px]">
                        {u.createdAt ? u.createdAt.split('T')[0] : '가입완료'}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {isSelf ? (
                          <span className="text-[11px] font-semibold text-slate-400 flex items-center justify-end gap-1 cursor-not-allowed" title="본인의 관리자 권한은 스스로 해제할 수 없습니다.">
                            <Lock className="w-3.5 h-3.5" />
                            본인 권한 변경 불가
                          </span>
                        ) : (
                          <button
                            onClick={() => setUserToToggleAdmin(u)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                              u.isAdmin
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-300'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                          >
                            {u.isAdmin ? '관리자 권한 해제' : '관리자 권한 부여'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Allowed Email Confirmation Modal */}
      {emailToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mb-1.5">
              허용 이메일 삭제 확인
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              <strong>'{emailToDelete}'</strong> 이메일을 회원가입 허용 목록에서 삭제하시겠습니까?<br />
              삭제 시 해당 이메일로는 더 이상 신규 회원가입을 진행할 수 없습니다.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEmailToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAllowedEmail}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>삭제 실행</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Admin Privilege Modal */}
      {userToToggleAdmin && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mb-1.5">
              사용자 관리자 권한 변경
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              <strong>'{userToToggleAdmin.displayName || userToToggleAdmin.email}'</strong> 사용자에게{' '}
              <strong className="text-indigo-600">
                {userToToggleAdmin.isAdmin ? '관리자 권한 해제' : '관리자 권한 부여'}
              </strong>
              를 진행하시겠습니까?
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setUserToToggleAdmin(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleAdmin}
                className={`px-4 py-2 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  userToToggleAdmin.isAdmin
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{userToToggleAdmin.isAdmin ? '권한 해제' : '권한 부여'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
