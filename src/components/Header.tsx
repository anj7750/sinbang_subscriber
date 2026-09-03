import React from 'react';
import { 
  Users, 
  CreditCard, 
  Home, 
  LogOut, 
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  subscriberCount: number;
  paidSubscriberCount: number;
  returnCount: number;
  paymentCount: number;
  onRefreshData?: () => void;
  isDataLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  subscriberCount,
  returnCount,
  paymentCount
}) => {
  const { userProfile, logout } = useAuth();

  return (
    <header className="bg-white text-slate-800 border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Left: Fixed Logo (outside scrollable nav) */}
          <div 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer select-none shrink-0 group hover:opacity-85 transition-opacity"
            title="홈(대시보드)으로 이동"
          >
            <img 
              src="logo.png" 
              alt="신문과방송" 
              className="h-8 w-auto shrink-0" 
            />
            <span className="h-4 w-px bg-slate-300 shrink-0"></span>
            <span className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight whitespace-nowrap shrink-0">
              독자 관리 포털
            </span>
          </div>

          {/* Center/Right: Scrollable Nav Tabs */}
          <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-none py-1 flex-1 min-w-0">
            {/* Navigation Menus */}
            <nav className="flex items-center gap-1 sm:gap-1.5 text-sm font-medium">
              {/* 1. 홈 (인사이트 문구 삭제됨) */}
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-50 text-blue-700 font-extrabold shadow-2xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>홈</span>
              </button>

              {/* 2. 구독자 */}
              <button
                type="button"
                onClick={() => setActiveTab('subscribers')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'subscribers' || activeTab === 'paid' || activeTab === 'all_subs'
                    ? 'bg-blue-50 text-blue-700 font-extrabold shadow-2xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>구독자</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeTab === 'subscribers' || activeTab === 'paid' || activeTab === 'all_subs'
                    ? 'bg-blue-200 text-blue-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {subscriberCount}
                </span>
              </button>

              {/* 3. 반송 처리 대기 */}
              <button
                type="button"
                onClick={() => setActiveTab('returns')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'returns'
                    ? 'bg-amber-50 text-amber-700 font-extrabold shadow-2xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>반송 처리 대기</span>
                {returnCount > 0 && (
                  <span className="text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-100 text-amber-800">
                    {returnCount}
                  </span>
                )}
              </button>

              {/* 4. 입금 미확인 */}
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'payments'
                    ? 'bg-emerald-50 text-emerald-700 font-extrabold shadow-2xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>입금 미확인</span>
                {paymentCount > 0 && (
                  <span className="text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-emerald-100 text-emerald-800">
                    {paymentCount}
                  </span>
                )}
              </button>

              {/* 5. 관리자 설정 (관리자 계정에게만 노출) */}
              {userProfile?.isAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-purple-50 text-purple-700 font-extrabold shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>관리자 설정</span>
                </button>
              )}
            </nav>
          </div>

          {/* Right Controls: User Info, Logout */}
          <div className="flex items-center gap-3 shrink-0">
            {userProfile && (
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600 pl-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-slate-800 font-semibold max-w-[120px] truncate">
                  {userProfile.displayName || userProfile.email.split('@')[0]}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="로그아웃"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
