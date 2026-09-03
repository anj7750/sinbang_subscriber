import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { StatCards } from './components/StatCards';
import { TodoList } from './components/TodoList';
import { SubscriberList } from './components/SubscriberList';
import { ReturnLogList } from './components/ReturnLogList';
import { PaymentList } from './components/PaymentList';
import { LabelPrintView } from './components/LabelPrintView';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { AdminManagement } from './components/AdminManagement';
import { AuthModal } from './components/AuthModal';
import { TaskModal } from './components/TaskModal';
import { SubscriberModal } from './components/SubscriberModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  subscribeToTodos,
  subscribeToSubscribers,
  subscribeToReturns,
  subscribeToPayments,
  seedInitialData
} from './services/firebaseService';
import { TodoTask, Subscriber, ReturnLog, PaymentRecord, DashboardStats } from './types';
import { Newspaper, Loader2 } from 'lucide-react';
import { isSubscriberExpiringInMonth, CURRENT_ISSUE_YEAR_MONTH, resolveSubscriberDisplayFields } from './utils/subscriberUtils';

function MainLayout() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [todos, setTodos] = useState<TodoTask[]>([]);
  const [returns, setReturns] = useState<ReturnLog[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [initialFilter, setInitialFilter] = useState<string>('all');
  const [initialCategoryTab, setInitialCategoryTab] = useState<string>('정기구독');
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TodoTask | null>(null);

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subToEdit, setSubToEdit] = useState<Subscriber | null>(null);

  // Initialize Firebase Listeners
  useEffect(() => {
    let isMounted = true;

    // Background seed check
    seedInitialData(false).catch((err) => {
      console.warn('Initial seed check:', err);
    });

    const unsubTodos = subscribeToTodos((fetchedTodos) => {
      if (isMounted) setTodos(fetchedTodos);
    });

    const unsubSubs = subscribeToSubscribers((fetchedSubs) => {
      if (isMounted) setSubscribers(fetchedSubs);
    });

    const unsubReturns = subscribeToReturns((fetchedReturns) => {
      if (isMounted) setReturns(fetchedReturns);
    });

    const unsubPayments = subscribeToPayments((fetchedPayments) => {
      if (isMounted) setPayments(fetchedPayments);
    });

    return () => {
      isMounted = false;
      unsubTodos();
      unsubSubs();
      unsubReturns();
      unsubPayments();
    };
  }, []);

  // Calculate live stats for dashboard cards with useMemo
  const expiringSubscribers = useMemo(() => {
    return subscribers.filter((s) => {
      const res = resolveSubscriberDisplayFields(s);
      const isDm = res.status === '정상' || res.status === '만료예정';
      return isDm && (res.status === '만료예정' || isSubscriberExpiringInMonth(s, CURRENT_ISSUE_YEAR_MONTH));
    });
  }, [subscribers]);

  const paidSubscribers = useMemo(() => {
    return subscribers.filter((s) => {
      const cat = (s.category || s.subscriptionType || '').trim();
      return cat === '정기구독' || cat.includes('정기구독') || cat === '개인' || cat === '유료' || cat.includes('유료');
    });
  }, [subscribers]);

  const stats: DashboardStats = useMemo(() => {
    return {
      totalSubscribers: subscribers.length,
      expiringThisMonth: expiringSubscribers.length,
      pendingReturns: returns.filter((r) => r.status === '대기중').length,
      unconfirmedPayments: payments.filter((p) => p.status === '미확인').length
    };
  }, [subscribers.length, expiringSubscribers.length, returns, payments]);

  // Card click navigation helper
  const handleSelectTabFromCard = useCallback((tabTarget: string, filter?: string) => {
    if (tabTarget === 'paid') {
      setActiveTab('subscribers');
      setInitialCategoryTab('정기구독');
    } else if (tabTarget === 'all_subs') {
      setActiveTab('subscribers');
      setInitialCategoryTab('전체');
    } else {
      setActiveTab(tabTarget);
    }
    if (filter) {
      setInitialFilter(filter);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Header & Nav */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        subscriberCount={subscribers.length}
        paidSubscriberCount={paidSubscribers.length}
        returnCount={stats.pendingReturns}
        paymentCount={stats.unconfirmedPayments}
      />

      {/* Main Container: Wide width for tables so no horizontal scroll is needed */}
      <main className={`flex-1 w-full mx-auto px-3 sm:px-6 py-5 ${
        activeTab === 'subscribers' || activeTab === 'paid' || activeTab === 'all_subs'
          ? 'max-w-[1680px]'
          : 'max-w-7xl'
      }`}>
        
        {/* TAB 1: DASHBOARD (인사이트) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* KPI Cards */}
            <StatCards stats={stats} onSelectTab={handleSelectTabFromCard} />

            {/* 이번 달 처리할 일 (This Month Tasks) */}
            <TodoList
              todos={todos}
              onOpenNewTaskModal={() => {
                setTaskToEdit(null);
                setIsTaskModalOpen(true);
              }}
              onEditTask={(task) => {
                setTaskToEdit(task);
                setIsTaskModalOpen(true);
              }}
            />

            {/* Analytics & Distribution Charts */}
            <AnalyticsCharts
              subscribers={subscribers}
              todos={todos}
              onSelectTab={handleSelectTabFromCard}
            />
          </div>
        )}

        {/* TAB 2: SUBSCRIBERS (구독자 - 정기구독 42명 / 기타 분류 / 전체 분리 탭) */}
        {(activeTab === 'subscribers' || activeTab === 'paid' || activeTab === 'all_subs') && (
          <SubscriberList
            subscribers={subscribers}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            initialFilter={initialFilter}
            initialCategoryTab={initialCategoryTab}
            onOpenAddModal={() => {
              setSubToEdit(null);
              setIsSubModalOpen(true);
            }}
            onEditSubscriber={(sub) => {
              setSubToEdit(sub);
              setIsSubModalOpen(true);
            }}
          />
        )}

        {/* TAB 3: RETURN LOGS (반송 처리 대기) */}
        {activeTab === 'returns' && (
          <div className="animate-in fade-in duration-150">
            <ReturnLogList returns={returns} />
          </div>
        )}

        {/* TAB 4: UNCONFIRMED PAYMENTS (입금 미확인) */}
        {activeTab === 'payments' && (
          <div className="animate-in fade-in duration-150">
            <PaymentList payments={payments} />
          </div>
        )}

        {/* TAB 5: ADMIN MANAGEMENT (Admin Only) */}
        {activeTab === 'admin' && userProfile?.isAdmin && (
          <div className="animate-in fade-in duration-150">
            <AdminManagement />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white text-slate-500 py-4 text-xs border-t border-slate-200 mt-auto print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <Newspaper className="w-4 h-4 text-blue-600" />
            <span>© 2026 한국언론진흥재단 &lt;신문과방송&gt; 독자 관리 포털</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="text-slate-500 font-medium">
              우체국 DM 발송 및 독자 데이터베이스 통합 시스템
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
      />

      <SubscriberModal
        isOpen={isSubModalOpen}
        onClose={() => {
          setIsSubModalOpen(false);
          setSubToEdit(null);
        }}
        subscriberToEdit={subToEdit}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
