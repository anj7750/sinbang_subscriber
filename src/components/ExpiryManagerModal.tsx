import React, { useState, useMemo } from 'react';
import {
  X,
  Clock,
  Calendar,
  Building,
  User,
  Search,
  Check,
  RefreshCw,
  Trash2,
  Undo2,
  CalendarCheck,
  Filter,
  CheckCircle2,
  AlertCircle,
  Mail,
  Archive,
  Layers
} from 'lucide-react';
import { Subscriber } from '../types';
import { updateSubscriber, deleteSubscriber } from '../services/firebaseService';
import {
  extractMonthNumber,
  extractYear,
  MONTHS_1_TO_12,
  isSubscriberExpiringInMonthNumber,
  getCurrentMonthNumber,
  getCurrentYear,
  resolveSubscriberDisplayFields
} from '../utils/subscriberUtils';

interface ExpiryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscribers: Subscriber[];
  onOpenAddModalWithDate?: (expiryMonth: string) => void;
  onSuccessToast?: (msg: string) => void;
}

export const ExpiryManagerModal: React.FC<ExpiryManagerModalProps> = ({
  isOpen,
  onClose,
  subscribers,
  onOpenAddModalWithDate,
  onSuccessToast
}) => {
  // Target Scope: 'dm_list' (DM 발송 리스트만), 'expired' (구독만료 명단), 'all' (전체 독자)
  const [targetScope, setTargetScope] = useState<'dm_list' | 'expired' | 'all'>('dm_list');
  // Selected month number: 'all' or 1 ~ 12 (dynamically initialized to current real-time month)
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(getCurrentMonthNumber());
  // Optional year filter: 'all' or '2025', '2026', '2027', etc.
  const [selectedYear, setSelectedYear] = useState<string>('all');
  // Status sub-filter: 'all' | '만료예정' | '정상' | '구독만료'
  const [statusFilter, setStatusFilter] = useState<'all' | '만료예정' | '정상' | '구독만료'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Extract unique years present in data
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear();
    years.add(String(currentYear));
    years.add(String(currentYear + 1));
    subscribers.forEach((s) => {
      const resolved = resolveSubscriberDisplayFields(s);
      const y = extractYear(resolved.expiryDate);
      if (y) years.add(y);
    });
    return Array.from(years).sort();
  }, [subscribers]);

  // Scope filter predicate
  const isSubscriberInScope = (s: Subscriber, scope: 'dm_list' | 'expired' | 'all') => {
    const resolved = resolveSubscriberDisplayFields(s);
    const status = (resolved.status || s.status || '') as string;
    const isDm = status !== '구독만료' && status !== '구독중단' && status !== '만료' && status !== '중단';
    if (scope === 'dm_list') return isDm;
    if (scope === 'expired') return status === '구독만료' || status === '만료';
    return true;
  };

  // Month counts per target scope
  const monthCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    MONTHS_1_TO_12.forEach((m) => {
      counts[m] = 0;
    });

    const seenKeys = new Set<string>();

    subscribers.forEach((s) => {
      if (!isSubscriberInScope(s, targetScope)) return;
      const resolved = resolveSubscriberDisplayFields(s);
      
      // Deduplicate identical items
      const uniqueKey = `${resolved.name}_${resolved.company}_${resolved.address}`;
      if (seenKeys.has(uniqueKey)) return;
      seenKeys.add(uniqueKey);

      const m = extractMonthNumber(resolved.expiryDate);
      if (m && m >= 1 && m <= 12) {
        if (selectedYear === 'all' || extractYear(resolved.expiryDate) === selectedYear) {
          counts[m] = (counts[m] || 0) + 1;
        }
      }
    });

    return counts;
  }, [subscribers, targetScope, selectedYear]);

  // Filter subscribers matching scope, selected month, year, and status
  const matchingSubscribers = useMemo(() => {
    const result: Subscriber[] = [];
    const seenKeys = new Set<string>();

    for (const s of subscribers) {
      if (!isSubscriberInScope(s, targetScope)) continue;

      const resolved = resolveSubscriberDisplayFields(s);

      // Deduplicate
      const uniqueKey = `${resolved.name}_${resolved.company}_${resolved.address}`;
      if (seenKeys.has(uniqueKey)) continue;
      seenKeys.add(uniqueKey);

      // Expiry month matching (1~12 or all)
      const matchesDate = isSubscriberExpiringInMonthNumber(
        s,
        selectedMonth,
        selectedYear,
        targetScope === 'dm_list' ? 'DM리스트' : targetScope === 'expired' ? '구독만료' : '전체'
      );

      if (!matchesDate) continue;

      // Status sub-filter
      if (statusFilter !== 'all') {
        if (statusFilter === '만료예정' && resolved.status !== '만료예정') continue;
        if (statusFilter === '정상' && resolved.status !== '정상') continue;
        if (statusFilter === '구독만료' && resolved.status !== '구독만료' && resolved.status !== '만료') continue;
      }

      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const comp = resolved.company.toLowerCase();
        const name = resolved.name.toLowerCase();
        const addr = resolved.address.toLowerCase();
        const code = resolved.codeNumber.toLowerCase();
        const exp = resolved.expiryDate.toLowerCase();
        if (!comp.includes(term) && !name.includes(term) && !addr.includes(term) && !code.includes(term) && !exp.includes(term)) {
          continue;
        }
      }

      result.push(s);
    }

    return result;
  }, [subscribers, targetScope, selectedMonth, selectedYear, statusFilter, searchTerm]);

  if (!isOpen) return null;

  const totalCopies = matchingSubscribers.reduce((acc, curr) => acc + (curr.copies || 1), 0);
  const expiringCount = matchingSubscribers.filter((s) => {
    const resolved = resolveSubscriberDisplayFields(s);
    return resolved.status === '만료예정';
  }).length;

  const handleToggleSelectAll = () => {
    if (selectedSubIds.length === matchingSubscribers.length) {
      setSelectedSubIds([]);
    } else {
      setSelectedSubIds(matchingSubscribers.map((s) => s.id || '').filter(Boolean));
    }
  };

  const handleToggleSelect = (id?: string) => {
    if (!id) return;
    if (selectedSubIds.includes(id)) {
      setSelectedSubIds(selectedSubIds.filter((i) => i !== id));
    } else {
      setSelectedSubIds([...selectedSubIds, id]);
    }
  };

  // Batch mark selected subscribers as '만료예정'
  const handleBatchMarkExpiring = async () => {
    if (selectedSubIds.length === 0) return;
    setIsProcessing(true);
    try {
      for (const id of selectedSubIds) {
        await updateSubscriber(id, { status: '만료예정' });
      }
      if (onSuccessToast) {
        onSuccessToast(`선택한 독자 ${selectedSubIds.length}명이 [만료예정] 상태로 지정되었습니다.`);
      }
      setSelectedSubIds([]);
    } catch (err) {
      console.error('Failed to batch mark expiring:', err);
      alert('상태 변경 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch remove from '만료예정' (revert to '정상')
  const handleBatchRevertToNormal = async () => {
    if (selectedSubIds.length === 0) return;
    setIsProcessing(true);
    try {
      for (const id of selectedSubIds) {
        await updateSubscriber(id, { status: '정상' });
      }
      if (onSuccessToast) {
        onSuccessToast(`선택한 독자 ${selectedSubIds.length}명이 [만료예정 해제 -> 정상] 상태로 복원되었습니다.`);
      }
      setSelectedSubIds([]);
    } catch (err) {
      console.error('Failed to revert to normal:', err);
      alert('만료예정 해제 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch mark selected subscribers as '구독만료'
  const handleBatchMarkExpired = async () => {
    if (selectedSubIds.length === 0) return;
    if (!confirm(`선택한 독자 ${selectedSubIds.length}명을 '구독만료' 처리하여 DM 발송 목록에서 제외하시겠습니까?`)) {
      return;
    }
    setIsProcessing(true);
    try {
      for (const id of selectedSubIds) {
        await updateSubscriber(id, { status: '구독만료' });
      }
      if (onSuccessToast) {
        onSuccessToast(`선택한 독자 ${selectedSubIds.length}명이 [구독만료] 처리되었습니다.`);
      }
      setSelectedSubIds([]);
    } catch (err) {
      console.error('Failed to batch mark expired:', err);
      alert('일괄 상태 변경 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch delete selected subscribers
  const handleBatchDelete = async () => {
    if (selectedSubIds.length === 0) return;
    if (!confirm(`선택한 독자 ${selectedSubIds.length}명을 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    setIsProcessing(true);
    try {
      for (const id of selectedSubIds) {
        await deleteSubscriber(id);
      }
      if (onSuccessToast) {
        onSuccessToast(`선택한 독자 ${selectedSubIds.length}명이 삭제되었습니다.`);
      }
      setSelectedSubIds([]);
    } catch (err) {
      console.error('Failed to delete subscribers:', err);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Single subscriber status update
  const handleSingleStatusChange = async (sub: Subscriber, newStatus: any) => {
    if (!sub.id) return;
    try {
      await updateSubscriber(sub.id, { status: newStatus });
      if (onSuccessToast) {
        const resolved = resolveSubscriberDisplayFields(sub);
        const displayName = resolved.company || resolved.name || '독자';
        const actionLabel = newStatus === '정상' ? '정상 복구' : newStatus === '만료예정' ? '만료예정 지정' : newStatus;
        onSuccessToast(`'${displayName}' 독자가 [${actionLabel}] 상태로 변경되었습니다.`);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Single subscriber delete
  const handleSingleDelete = async (sub: Subscriber) => {
    if (!sub.id) return;
    const resolved = resolveSubscriberDisplayFields(sub);
    const displayName = resolved.company || resolved.name || '독자';
    if (!confirm(`'${displayName}' 독자를 삭제하시겠습니까?`)) return;
    try {
      await deleteSubscriber(sub.id);
      if (onSuccessToast) {
        onSuccessToast(`'${displayName}' 독자가 삭제되었습니다.`);
      }
    } catch (err) {
      console.error('Error deleting subscriber:', err);
    }
  };

  return (
    <div id="expiry-manager-modal-backdrop" className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div id="expiry-manager-modal-container" className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider text-indigo-400 uppercase bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                  만료 관리 도구
                </span>
                <span className="text-xs text-slate-400">
                  월별 만료자 조회 & 만료예정 안내문 발송 지정/해제
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                월별 구독 만료자 관리
              </h3>
            </div>
          </div>

          <button
            id="close-expiry-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 0. Target Scope Selector Tabs */}
        <div className="px-5 pt-3 pb-2 bg-slate-800/95 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300 font-semibold">관리 대상 범위:</span>
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                id="scope-dm-list-btn"
                onClick={() => {
                  setTargetScope('dm_list');
                  setSelectedSubIds([]);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  targetScope === 'dm_list'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>발송 대상</span>
              </button>

              <button
                type="button"
                id="scope-expired-btn"
                onClick={() => {
                  setTargetScope('expired');
                  setSelectedSubIds([]);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  targetScope === 'expired'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>구독만료 독자</span>
              </button>

              <button
                type="button"
                id="scope-all-btn"
                onClick={() => {
                  setTargetScope('all');
                  setSelectedSubIds([]);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  targetScope === 'all'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>전체 독자</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-300">
            {targetScope === 'dm_list' && '✨ 현재 활성 DM 발송 대상 중에서만 만료 대상자를 확인합니다.'}
            {targetScope === 'expired' && '📁 이미 만료 처리된 과거 독자 목록을 관리합니다.'}
            {targetScope === 'all' && '🌐 정상 및 만료 독자를 포함한 전체 데이터입니다.'}
          </div>
        </div>

        {/* 1. Month 1~12 Selector Bar */}
        <div className="p-4 bg-slate-100 border-b border-slate-200">
          <div className="flex flex-col gap-3">
            {/* 1-12 Month Pills */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>만료 월 선택:</span>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
                <button
                  type="button"
                  id="month-all-btn"
                  onClick={() => {
                    setSelectedMonth('all');
                    setSelectedSubIds([]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedMonth === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  전체 월
                </button>

                {MONTHS_1_TO_12.map((m) => {
                  const isCurrent = selectedMonth === m;
                  const monthCount = monthCounts[m] || 0;
                  return (
                    <button
                      key={m}
                      id={`month-btn-${m}`}
                      type="button"
                      onClick={() => {
                        setSelectedMonth(m);
                        setSelectedSubIds([]);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        isCurrent
                          ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
                          : 'bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-300'
                      }`}
                    >
                      <span>{m}월</span>
                      {monthCount > 0 && (
                        <span className={`text-[10px] px-1 py-0.2 rounded-full font-extrabold ${
                          isCurrent ? 'bg-indigo-800 text-indigo-100' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {monthCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub Filter: Year + Status + Search */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80 text-xs">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Year Select */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-600 font-semibold">연도:</span>
                  <select
                    id="expiry-year-select"
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      setSelectedSubIds([]);
                    }}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">전체 연도</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y}>{y}년</option>
                    ))}
                  </select>
                </div>

                {/* Status Sub-filter */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-600 font-semibold">상태 필터:</span>
                  <select
                    id="expiry-status-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">전체 상태</option>
                    <option value="만료예정">만료예정만</option>
                    <option value="정상">정상 독자만</option>
                    <option value="구독만료">구독만료만</option>
                  </select>
                </div>
              </div>

              {/* Search */}
              <div className="relative flex-1 max-w-xs min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="expiry-search-input"
                  type="text"
                  placeholder="독자명, 기관명, 주소, 만료일..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Selected Summary & Batch Actions Bar */}
        <div className="px-5 py-2.5 bg-indigo-50/80 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-indigo-950">
              📅 {selectedMonth === 'all' ? '전체 월' : `${selectedMonth}월`}
              {selectedYear !== 'all' ? ` (${selectedYear}년)` : ''} 만료 대상
            </span>
            <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md font-mono font-black text-[11px]">
              총 {matchingSubscribers.length}명 / {totalCopies}부
            </span>
            {expiringCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md font-bold text-[11px]">
                만료예정 지정: {expiringCount}명
              </span>
            )}
          </div>

          {selectedSubIds.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap animate-in fade-in">
              <span className="font-bold text-indigo-900 text-xs">
                {selectedSubIds.length}명 선택:
              </span>
              
              {/* Batch Action 1: Set to '만료예정' */}
              <button
                type="button"
                id="batch-mark-expiring-btn"
                onClick={handleBatchMarkExpiring}
                disabled={isProcessing}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="선택한 독자들을 만료예정으로 지정합니다"
              >
                <Clock className="w-3 h-3" />
                <span>만료예정 지정</span>
              </button>

              {/* Batch Action 2: Remove from '만료예정' (revert to '정상') */}
              <button
                type="button"
                id="batch-revert-normal-btn"
                onClick={handleBatchRevertToNormal}
                disabled={isProcessing}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="만료예정 상태를 해제하고 정상 독자로 복원합니다"
              >
                <Undo2 className="w-3 h-3" />
                <span>만료예정 해제 (정상 복원)</span>
              </button>

              {/* Batch Action 3: Set to '구독만료' */}
              <button
                type="button"
                id="batch-mark-expired-btn"
                onClick={handleBatchMarkExpired}
                disabled={isProcessing}
                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="선택한 독자들을 구독만료 처리합니다"
              >
                <X className="w-3 h-3" />
                <span>구독만료 처리</span>
              </button>

              {/* Batch Action 4: Delete */}
              <button
                type="button"
                id="batch-delete-btn"
                onClick={handleBatchDelete}
                disabled={isProcessing}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="선택한 독자들을 목록에서 완전히 삭제합니다"
              >
                <Trash2 className="w-3 h-3" />
                <span>선택 삭제</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Subscribers Table */}
        <div className="flex-1 overflow-y-auto max-h-[440px]">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-0 border-b border-slate-200 z-10">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    id="select-all-expiry-checkbox"
                    checked={
                      matchingSubscribers.length > 0 &&
                      selectedSubIds.length === matchingSubscribers.length
                    }
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3">회사명 / 독자명</th>
                <th className="py-2.5 px-3">구분 / 부수</th>
                <th className="py-2.5 px-3">배송지 주소</th>
                <th className="py-2.5 px-3">구독 종료일</th>
                <th className="py-2.5 px-3">현재 상태</th>
                <th className="py-2.5 px-3 text-right">만료예정 관리 및 상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matchingSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">
                      {selectedMonth === 'all' ? '전체 기간' : `${selectedMonth}월`}에 만료되는 독자 데이터가 없습니다.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      상단에서 다른 월을 선택하거나, 범위(발송대상/구독만료/전체)를 변경해 보세요.
                    </p>
                  </td>
                </tr>
              ) : (
                matchingSubscribers.map((sub) => {
                  const resolved = resolveSubscriberDisplayFields(sub);
                  const isSelected = sub.id ? selectedSubIds.includes(sub.id) : false;
                  const isExpiring = resolved.status === '만료예정';
                  const isExpired = resolved.status === '구독만료' || resolved.status === '만료';

                  const displayName = resolved.company || resolved.name || '개인독자';
                  const subName = resolved.name && resolved.company && resolved.name !== resolved.company ? resolved.name : '';

                  return (
                    <tr
                      key={sub.id}
                      id={`expiry-row-${sub.id}`}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(sub.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{displayName}</span>
                        </div>
                        {subName && (
                          <div className="text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{subName}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700 border border-slate-200">
                          {resolved.category}
                        </span>
                        <span className="ml-1.5 font-bold text-indigo-600">
                          {resolved.copies}부
                        </span>
                      </td>

                      <td className="py-2.5 px-3 max-w-xs truncate" title={resolved.address}>
                        {resolved.zipCode && <span className="font-mono text-indigo-600 mr-1">[{resolved.zipCode}]</span>}
                        <span>{resolved.address || '주소 미기재'}</span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-slate-800">
                        {resolved.expiryDate || '미정'}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isExpiring ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                            만료예정
                          </span>
                        ) : isExpired ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                            구독만료
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            정상
                          </span>
                        )}
                      </td>

                      {/* Row Action Buttons */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {sub.id && (
                          <div className="flex items-center justify-end gap-1">
                            {isExpiring ? (
                              <button
                                type="button"
                                onClick={() => handleSingleStatusChange(sub, '정상')}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
                                title="만료예정 상태를 해제하고 정상 상태로 복원합니다"
                              >
                                <Undo2 className="w-3 h-3 text-emerald-700" />
                                <span>만료예정 해제</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSingleStatusChange(sub, '만료예정')}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
                                title="만료예정 상태로 지정합니다"
                              >
                                <Clock className="w-3 h-3 text-amber-700" />
                                <span>만료예정 지정</span>
                              </button>
                            )}

                            {!isExpired && (
                              <button
                                type="button"
                                onClick={() => handleSingleStatusChange(sub, '구독만료')}
                                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-bold transition-colors cursor-pointer"
                                title="구독만료 처리"
                              >
                                만료
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleSingleDelete(sub)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="독자 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            💡 만료 예정 대상자는 DM 발송 리스트에 포함되며, 상단 1~12월 버튼으로 매월 만료자를 언제든 간편하게 조회 및 해제/지정할 수 있습니다.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="close-expiry-modal-bottom-btn"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
