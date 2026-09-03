import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit3,
  Trash2,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileSpreadsheet,
  Ban,
  Download,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  CalendarCheck,
  Table as TableIcon,
  Grid,
  Filter,
  ArrowUpDown,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  Send,
  Building2,
  BookOpen,
  GraduationCap,
  Gift,
  PackageCheck,
  Trash,
  Lock,
  Eye
} from 'lucide-react';
import { Subscriber, SubscriberStatus } from '../types';
import { addSubscriber, deleteSubscriber, updateSubscriber, purgeExpiredAndStoppedSubscribers, canUserEdit } from '../services/firebaseService';
import { useAuth } from '../context/AuthContext';
import { CsvUploadModal } from './CsvUploadModal';
import { DistributionSummaryHeader } from './DistributionSummaryHeader';
import { ClearSubscribersModal, ClearScope } from './ClearSubscribersModal';
import { ExpiryManagerModal } from './ExpiryManagerModal';
import { ExcelSpreadsheetView } from './ExcelSpreadsheetView';
import * as XLSX from 'xlsx';
import {
  isSubscriberExpiringInMonth,
  isSubscriberExpiringInMonthNumber,
  getCurrentMonthNumber,
  formatYearMonthKorean,
  CURRENT_ISSUE_YEAR_MONTH,
  getCurrentYear,
  getUniqueExpiryYearMonths,
  resolveSubscriberDisplayFields,
  isRegisteredOrOverseas,
  isMultiCopies,
  formatIssueWithVolume,
  formatIssueCompact,
  calculateSubscriberDDay,
  normalizeDmCategory,
  isRegularPaidSubscriber,
  STANDARD_EXCEL_COLUMNS,
  subscriberToStandardRow
} from '../utils/subscriberUtils';

interface SubscriberListProps {
  subscribers: Subscriber[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onOpenAddModal: () => void;
  onEditSubscriber: (sub: Subscriber) => void;
  initialFilter?: string;
  initialCategoryTab?: string;
  isReadOnly?: boolean;
}

export const SubscriberList: React.FC<SubscriberListProps> = ({
  subscribers,
  searchTerm,
  setSearchTerm,
  onOpenAddModal,
  onEditSubscriber,
  initialFilter,
  initialCategoryTab = '정기구독',
  isReadOnly
}) => {
  const { userProfile } = useAuth();
  const effectiveReadOnly = isReadOnly !== undefined ? isReadOnly : !canUserEdit(userProfile);

  // Category Group Tab:
  // '정기구독' | '기관/단체' | '도서관' | '대학/연구소' | '관계기관' | '기증' | '전체'
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>(initialCategoryTab);
  
  // Quick Special Filter: 'all' | 'registered' (등기/해외) | 'multicopies' (다부수) | 'expiring' (만료도래)
  const [dispatchFilter, setDispatchFilter] = useState<'all' | 'registered' | 'multicopies' | 'expiring'>('all');

  // View mode: 'table' (테이블 뷰) | 'cards' (카드 뷰) | 'excel' (스프레드시트 뷰)
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'excel'>('table');

  // Modals & Actions
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(false);
  const [clearInitialScope, setClearInitialScope] = useState<ClearScope>('전체');
  const [subToDelete, setSubToDelete] = useState<Subscriber | null>(null);
  const [subToPay, setSubToPay] = useState<Subscriber | null>(null);
  const [payAmountInput, setPayAmountInput] = useState('40,000원');
  const [payDateInput, setPayDateInput] = useState(() => new Date().toISOString().split('T')[0]);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Sync initialFilter prop
  useEffect(() => {
    if (!initialFilter) return;
    if (initialFilter === 'expiring' || initialFilter === '만료예정') {
      setDispatchFilter('expiring');
      setSelectedCategoryTab('정기구독');
    } else if (initialFilter === 'registered' || initialFilter === '등기') {
      setDispatchFilter('registered');
    } else if (initialFilter === 'multicopies' || initialFilter === '다부수') {
      setDispatchFilter('multicopies');
    } else if (['정기구독', '기관/단체', '도서관', '대학/연구소', '관계기관', '기증', '기타'].includes(initialFilter)) {
      setSelectedCategoryTab(initialFilter);
    }
  }, [initialFilter]);

  // Dynamic Category & Dispatch Counts
  const dmStats = useMemo(() => {
    let regularCount = 0;
    let institutionCount = 0;
    let libraryCount = 0;
    let univCount = 0;
    let partnerCount = 0;
    let giftCount = 0;
    let otherCount = 0;

    let registeredCount = 0;
    let multiCopyCount = 0;
    let expiringCount = 0;

    subscribers.forEach((s) => {
      const normCat = normalizeDmCategory(s);
      if (normCat === '정기구독') regularCount++;
      else if (normCat === '기관/단체') institutionCount++;
      else if (normCat === '도서관') libraryCount++;
      else if (normCat === '대학/연구소') univCount++;
      else if (normCat === '관계기관') partnerCount++;
      else if (normCat === '기증') giftCount++;
      else otherCount++;

      const isReg = isRegisteredOrOverseas(s.shippingInfo || s.address);
      if (isReg) registeredCount++;

      const isMulti = isMultiCopies(s.copies);
      if (isMulti) multiCopyCount++;

      const dDay = calculateSubscriberDDay(s.expiryDate);
      if (dDay.isUrgent || s.status === '만료예정' || isSubscriberExpiringInMonth(s)) {
        expiringCount++;
      }
    });

    return {
      regularCount,
      institutionCount,
      libraryCount,
      univCount,
      partnerCount,
      giftCount,
      otherCount,
      totalCount: subscribers.length,
      registeredCount,
      multiCopyCount,
      expiringCount
    };
  }, [subscribers]);

  // Main Filter Logic for Active DM List
  const filteredSubscribers = useMemo(() => {
    return subscribers
      .filter((s) => {
        const normCat = normalizeDmCategory(s);

        // 1. Category Tab Filter
        if (selectedCategoryTab !== '전체') {
          if (selectedCategoryTab === '정기구독' && normCat !== '정기구독') return false;
          if (selectedCategoryTab === '기관/단체' && normCat !== '기관/단체') return false;
          if (selectedCategoryTab === '도서관' && normCat !== '도서관') return false;
          if (selectedCategoryTab === '대학/연구소' && normCat !== '대학/연구소') return false;
          if (selectedCategoryTab === '관계기관' && normCat !== '관계기관') return false;
          if (selectedCategoryTab === '기증' && normCat !== '기증') return false;
        }

        // 2. Special Dispatch Filter
        if (dispatchFilter === 'registered') {
          if (!isRegisteredOrOverseas(s.shippingInfo || s.address)) return false;
        } else if (dispatchFilter === 'multicopies') {
          if (!isMultiCopies(s.copies)) return false;
        } else if (dispatchFilter === 'expiring') {
          const dDay = calculateSubscriberDDay(s.expiryDate);
          if (!dDay.isUrgent && s.status !== '만료예정' && !isSubscriberExpiringInMonth(s)) {
            return false;
          }
        }

        // 3. Search Filter (이름, 회사, 주소, 이메일, 휴대전화, 코드번호)
        if (searchTerm) {
          const lower = searchTerm.toLowerCase().trim();
          const nameMatch = (s.name || '').toLowerCase().includes(lower);
          const companyMatch = (s.company || s.organization || '').toLowerCase().includes(lower);
          const addrMatch = (s.address || '').toLowerCase().includes(lower);
          const phoneMatch = (s.phone || '').includes(lower);
          const mobileMatch = (s.mobile || '').includes(lower);
          const emailMatch = (s.email || '').toLowerCase().includes(lower);
          const codeMatch = (s.codeNumber || '').toLowerCase().includes(lower);
          if (!nameMatch && !companyMatch && !addrMatch && !phoneMatch && !mobileMatch && !emailMatch && !codeMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // If viewing 정기구독, sort by D-Day / Expiry
        if (selectedCategoryTab === '정기구독') {
          const dDayA = calculateSubscriberDDay(a.expiryDate);
          const dDayB = calculateSubscriberDDay(b.expiryDate);
          if (dDayA.days >= 0 && dDayB.days >= 0) return dDayA.days - dDayB.days;
          if (dDayA.days >= 0 && dDayB.days < 0) return -1;
          if (dDayA.days < 0 && dDayB.days >= 0) return 1;
        }
        // Otherwise default order
        return 0;
      });
  }, [subscribers, selectedCategoryTab, dispatchFilter, searchTerm]);

  // Pagination for high performance
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Auto reset page on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategoryTab, dispatchFilter, searchTerm]);

  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(filteredSubscribers.length / pageSize));
  
  // Safe page bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedSubscribers = useMemo(() => {
    if (pageSize === -1) return filteredSubscribers;
    const start = (currentPage - 1) * pageSize;
    return filteredSubscribers.slice(start, start + pageSize);
  }, [filteredSubscribers, currentPage, pageSize]);

  // Purge expired and stopped data manually with feedback
  const handlePurgeExpired = async () => {
    if (!confirm('정말로 모든 만료자 및 중단자 데이터를 영구 삭제하고 순수 DM 발송 명단만 남기시겠습니까?')) {
      return;
    }
    setIsPurging(true);
    try {
      const purged = await purgeExpiredAndStoppedSubscribers();
      showToast(purged > 0 ? `만료·중단 독자 ${purged}건을 완전히 삭제하고 DM 명단을 재분류했습니다.` : '삭제할 만료·중단 독자가 없습니다 (이미 깨끗한 DM 명단입니다).');
    } catch (err) {
      console.error('Failed to purge expired subscribers:', err);
      showToast('만료 데이터 정리 중 오류가 발생했습니다.');
    } finally {
      setIsPurging(false);
    }
  };

  // Handle Quick Payment Registration
  const handleConfirmPayment = async () => {
    if (!subToPay?.id) return;
    try {
      const formattedHistory = `[입금] ${payDateInput} (${payAmountInput})`;
      await updateSubscriber(subToPay.id, {
        paymentHistory: formattedHistory,
        status: '정상'
      });
      showToast(`'${subToPay.name || subToPay.company}' 독자 입금 확인이 등록되었습니다.`);
      setSubToPay(null);
    } catch (err) {
      console.error('Failed to register payment:', err);
      showToast('입금 등록 중 오류가 발생했습니다.');
    }
  };

  // Handle Delete Single
  const handleConfirmDelete = async () => {
    if (!subToDelete?.id) return;
    setIsDeletingSingle(true);
    try {
      await deleteSubscriber(subToDelete.id);
      showToast(`'${subToDelete.company || subToDelete.name}' 독자 정보가 삭제되었습니다.`);
      setSubToDelete(null);
    } catch (err) {
      console.error('Failed to delete subscriber:', err);
      showToast('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeletingSingle(false);
    }
  };

  // Export Excel (.xlsx) and CSV with the exact 24 standard columns requested by user
  const handleExportExcel = (exportFormat: 'xlsx' | 'csv' = 'xlsx') => {
    if (filteredSubscribers.length === 0) {
      showToast('다운로드할 독자 데이터가 없습니다.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const categoryTitle = selectedCategoryTab === '정기구독' ? '정기구독_유료' : `DM리스트_${selectedCategoryTab}`;
    const filename = `신문과방송_${categoryTitle}_${today}`;

    // Standard 24 columns
    const headers = [...STANDARD_EXCEL_COLUMNS];
    const rows = filteredSubscribers.map((s) => subscriberToStandardRow(s));

    if (exportFormat === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      
      // Auto width for columns
      const colWidths = headers.map((h, i) => {
        const maxLen = Math.max(
          h.length * 2,
          ...rows.map((r) => String(r[i] || '').length)
        );
        return { wch: Math.min(Math.max(maxLen + 2, 10), 45) };
      });
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, selectedCategoryTab === '전체' ? '전체독자대장' : selectedCategoryTab);
      XLSX.writeFile(wb, `${filename}.xlsx`);
      showToast(`엑셀 파일(${filename}.xlsx) 다운로드가 완료되었습니다.`);
    } else {
      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const csvRows = rows.map((row) => row.map((val) => escapeCsv(val)).join(','));
      const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`CSV 파일(${filename}.csv) 다운로드가 완료되었습니다.`);
    }
  };

  return (
    <div className="space-y-4 mb-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold text-slate-100">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Main SaaS White Card Container (시안 B: 모던 클린 SaaS 테마) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* 1. Page Header & Primary Tabs */}
        <div className="p-6 pb-4 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedCategoryTab === '정기구독'
                    ? '⭐ 유료 정기구독 독자'
                    : selectedCategoryTab === '기관/단체'
                    ? '🏛️ 기관 / 언론사 (고정 배포)'
                    : selectedCategoryTab === '도서관'
                    ? '📚 도서관 (정기 납품)'
                    : selectedCategoryTab === '대학/연구소'
                    ? '🎓 대학 / 언론연구소'
                    : selectedCategoryTab === '관계기관'
                    ? '🤝 관계기관 / 문화원'
                    : selectedCategoryTab === '기증'
                    ? '🎁 기증처'
                    : '📋 전체 독자 명단'}
                </span>
                <span className="text-xs font-mono text-slate-500 font-semibold">
                  총 {filteredSubscribers.length}건 발송 대상
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 font-sans">
                구독자 관리
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {selectedCategoryTab === '정기구독'
                  ? `[분류: 정기구독] 유료 정기구독 독자의 구독 기간, D-Day 만료 예정일 및 입금 내역을 관리합니다.`
                  : selectedCategoryTab === '기관/단체'
                  ? `신문사, 방송사, 일반기업, 공공기관 등 기관 배포 대상을 관리합니다.`
                  : selectedCategoryTab === '도서관'
                  ? `국립·공공·대학 도서관 정기 납품 대상을 관리합니다.`
                  : selectedCategoryTab === '대학/연구소'
                  ? `전국 대학교 미디어학과, 연구원, 교수진 배포 대상을 관리합니다.`
                  : selectedCategoryTab === '관계기관'
                  ? `한국언론진흥재단 지사, 해외 한국문화원 등 관계기관 대상을 관리합니다.`
                  : selectedCategoryTab === '기증'
                  ? `기증처 배포 대상을 관리합니다.`
                  : `전체 독자 대상을 통합 조회합니다.`}
              </p>
            </div>

            {/* View Mode Switcher */}
            <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'table' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="목록 테이블 뷰"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>테이블 뷰</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'cards' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="카드 뷰"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>카드 뷰</span>
                </button>
                <button
                  onClick={() => setViewMode('excel')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'excel' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="전체 엑셀 스프레드시트 편집 뷰"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>엑셀 대장 뷰</span>
                </button>
              </div>

              {/* 전체 데이터 삭제 버튼 (수정 권한 전용) */}
              {!effectiveReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setClearInitialScope('전체');
                    setIsClearModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer"
                  title="데이터베이스 전체 삭제 또는 특정 분류 일괄 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>전체 데이터 삭제</span>
                </button>
              )}
            </div>
          </div>

          {/* 1.1 DM Category Tabs (정기구독(유료) vs 기관/단체 vs 도서관 vs 대학/연구소 vs 관계기관 vs 전체) */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
              {/* Tab 1: ⭐ 정기구독 (유료 독자 ~42명) */}
              <button
                type="button"
                onClick={() => setSelectedCategoryTab('정기구독')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCategoryTab === '정기구독'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>⭐ 정기구독 (유료)</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                  selectedCategoryTab === '정기구독' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
                }`}>
                  {dmStats.regularCount}
                </span>
              </button>

              {/* Tab 2: 🏛️ 기관/단체 */}
              <button
                type="button"
                onClick={() => setSelectedCategoryTab('기관/단체')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCategoryTab === '기관/단체'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>🏛️ 기관/언론사</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                  selectedCategoryTab === '기관/단체' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
                }`}>
                  {dmStats.institutionCount}
                </span>
              </button>

              {/* Tab 3: 📚 도서관 */}
              <button
                type="button"
                onClick={() => setSelectedCategoryTab('도서관')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCategoryTab === '도서관'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>📚 도서관</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                  selectedCategoryTab === '도서관' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
                }`}>
                  {dmStats.libraryCount}
                </span>
              </button>

              {/* Tab 4: 🎓 대학/연구소 */}
              <button
                type="button"
                onClick={() => setSelectedCategoryTab('대학/연구소')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCategoryTab === '대학/연구소'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>🎓 대학/연구소</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                  selectedCategoryTab === '대학/연구소' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
                }`}>
                  {dmStats.univCount}
                </span>
              </button>

              {/* Tab 5: 🤝 관계기관 */}
              <button
                type="button"
                onClick={() => setSelectedCategoryTab('관계기관')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCategoryTab === '관계기관'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>🤝 관계기관/문화원</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                  selectedCategoryTab === '관계기관' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
                }`}>
                  {dmStats.partnerCount}
                </span>
              </button>

              {/* Tab 6: 🎁 기증처 */}
              <button
                type="button"
                onClick={() => setSelectedCategoryTab('기증')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCategoryTab === '기증'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>🎁 기증처</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                  selectedCategoryTab === '기증' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
                }`}>
                  {dmStats.giftCount}
                </span>
              </button>

              {/* Tab 7: 📋 전체 */}
              <button
                type="button"
                onClick={() => setSelectedCategoryTab('전체')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCategoryTab === '전체'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>📋 전체</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                  selectedCategoryTab === '전체' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
                }`}>
                  {dmStats.totalCount}
                </span>
              </button>
            </div>

            {/* Quick Dispatch Type Chips */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">발송 구분:</span>
              <button
                onClick={() => setDispatchFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  dispatchFilter === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setDispatchFilter('registered')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  dispatchFilter === 'registered'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                📮 등기/해외 ({dmStats.registeredCount})
              </button>
              <button
                onClick={() => setDispatchFilter('multicopies')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  dispatchFilter === 'multicopies'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                }`}
              >
                📦 다부수 ({dmStats.multiCopyCount})
              </button>
              <button
                onClick={() => setDispatchFilter('expiring')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  dispatchFilter === 'expiring'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                }`}
              >
                ⏳ 만료도래 ({dmStats.expiringCount})
              </button>
            </div>
          </div>
        </div>

        {/* 2. Filter & Action Control Bar */}
        <div className="p-4 sm:px-6 bg-slate-50/70 border-b border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
          {/* Left: Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-lg">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="이름, 회사/기관명, 부서, 주소, 이메일, 휴대전화 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          {/* Right: Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* + 독자 추가 Button (수정 권한 전용) */}
            {!effectiveReadOnly && (
              <button
                onClick={onOpenAddModal}
                className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>독자 추가</span>
              </button>
            )}

            {/* 엑셀 내보내기 Button (.xlsx) - 모든 계정(test 포함) 열람 및 다운로드 허용 */}
            <div className="inline-flex items-center rounded-lg shadow-2xs border border-blue-600 bg-white">
              <button
                onClick={() => handleExportExcel('xlsx')}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 hover:bg-blue-50 text-blue-600 text-xs sm:text-sm font-bold rounded-l-lg transition-all cursor-pointer"
                title="요청 표준 24개 컬럼 양식으로 엑셀(.xlsx) 다운로드"
              >
                <Download className="w-3.5 h-3.5" />
                <span>엑셀 내보내기</span>
              </button>
              <button
                onClick={() => handleExportExcel('csv')}
                className="px-2 py-1.5 hover:bg-blue-50 border-l border-blue-200 text-blue-600 text-xs font-semibold rounded-r-lg transition-all cursor-pointer"
                title="CSV(.csv) 형식으로 다운로드"
              >
                CSV
              </button>
            </div>

            {/* 엑셀 일괄 업로드 (수정 권한 전용) */}
            {!effectiveReadOnly && (
              <button
                onClick={() => setIsCsvModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-2xs"
                title="엑셀/CSV 일괄 업로드"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>엑셀 일괄 업로드</span>
              </button>
            )}

            {/* 월별 만료관리 모달 (수정 권한 전용) */}
            {!effectiveReadOnly && (
              <button
                onClick={() => setIsExpiryModalOpen(true)}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold rounded-lg transition-all cursor-pointer"
                title="월별 만료자 일괄 관리"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-amber-700" />
                <span>만료관리</span>
              </button>
            )}

            {/* 조회 전용 안내 태그 */}
            {effectiveReadOnly && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 text-xs rounded-lg font-bold">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>조회 전용 (추가·수정·삭제 제한)</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Conditional Content View */}
        {viewMode === 'excel' ? (
          <div className="p-4 sm:p-6">
            <ExcelSpreadsheetView
              subscribers={subscribers}
              isReadOnly={effectiveReadOnly}
              onAddSubscriber={effectiveReadOnly ? undefined : async (sub) => {
                await addSubscriber(sub);
              }}
              onUpdateSubscriber={effectiveReadOnly ? undefined : updateSubscriber}
              onDeleteSubscriber={effectiveReadOnly ? undefined : deleteSubscriber}
            />
          </div>
        ) : viewMode === 'cards' ? (
          /* Card View */
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedSubscribers.map((sub, index) => {
              const resolved = resolveSubscriberDisplayFields(sub);
              const normCat = normalizeDmCategory(sub);
              const dDay = calculateSubscriberDDay(sub.expiryDate);
              const isDDaySoon = dDay.isUrgent;
              const formattedStartIssue = formatIssueWithVolume(sub.startDate);
              const formattedExpiryIssue = formatIssueWithVolume(sub.expiryDate);

              return (
                <div
                  key={sub.id || index}
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        {normCat === '정기구독' && sub.expiryDate && dDay.text && dDay.text !== '-' && (
                          <span
                            className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                              dDay.days === 1
                                ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                                : isDDaySoon
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {dDay.text}
                          </span>
                        )}
                        <span className="font-bold text-slate-900 text-sm">{sub.name || sub.company || '무명'}</span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">
                        {normCat}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 mb-3">
                      <div>
                        <span className="font-semibold text-slate-500 mr-1.5">소속/회사:</span>
                        <span className="text-slate-900 font-medium">{sub.company || sub.organization || '-'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500 mr-1.5">주소:</span>
                        <span className="text-slate-700 truncate block">{sub.address || '주소 미기재'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500 mr-1.5">전화:</span>
                        <span className="font-mono text-slate-800">{sub.mobile || sub.phone || '-'}</span>
                      </div>
                      {formattedStartIssue !== '-' && (
                        <div>
                          <span className="font-semibold text-slate-500 mr-1.5">구독시작:</span>
                          <span className="text-slate-700">{formattedStartIssue}</span>
                        </div>
                      )}
                      {normCat === '정기구독' && formattedExpiryIssue !== '-' && (
                        <div>
                          <span className="font-semibold text-slate-500 mr-1.5">구독만료:</span>
                          <span className="text-slate-900 font-bold">{formattedExpiryIssue}</span>
                        </div>
                      )}
                      {normCat === '정기구독' && sub.paymentHistory && (
                        <div>
                          <span className="font-semibold text-slate-500 mr-1.5">입금현황:</span>
                          <span className="text-emerald-700 font-semibold">{sub.paymentHistory}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                    {effectiveReadOnly ? (
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>조회</span>
                      </span>
                    ) : (
                      <>
                        {normCat === '정기구독' && (
                          <button
                            onClick={() => setSubToPay(sub)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                            title="입금/결제 관리"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onEditSubscriber(sub)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="수정"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSubToDelete(sub)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto select-text">
            {/* Table with responsive column visibility: Expiry issue and Payment columns are only rendered for 정기구독 or 전체 */}
            <table className="w-full text-left text-sm text-slate-800 border-collapse">
              <thead className="bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-2.5 text-center whitespace-nowrap w-10">순번</th>
                  <th className="py-3.5 px-3 whitespace-nowrap min-w-[120px]">이름 / 수취인</th>
                  {selectedCategoryTab === '전체' && (
                    <th className="py-3.5 px-2.5 whitespace-nowrap w-16">구분</th>
                  )}
                  <th className="py-3.5 px-2.5 whitespace-nowrap min-w-[110px] max-w-[160px]">기관/회사명</th>
                  <th className="py-3.5 px-2.5 whitespace-nowrap w-32">연락처</th>
                  <th className="py-3.5 px-2 text-center whitespace-nowrap w-11">부수</th>
                  <th className="py-3.5 px-2.5 whitespace-nowrap w-28">구독시작호</th>
                  {(selectedCategoryTab === '정기구독' || selectedCategoryTab === '전체') && (
                    <th className="py-3.5 px-2.5 whitespace-nowrap w-28">구독만료호</th>
                  )}
                  {(selectedCategoryTab === '정기구독' || selectedCategoryTab === '전체') && (
                    <th className="py-3.5 px-2.5 whitespace-nowrap min-w-[90px] max-w-[120px]">입금현황</th>
                  )}
                  <th className="py-3.5 px-2 text-center whitespace-nowrap w-20 sticky right-0 bg-slate-50 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] border-l border-slate-200">
                    관리
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredSubscribers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={selectedCategoryTab === '정기구독' || selectedCategoryTab === '전체' ? 10 : 7}
                      className="py-16 text-center text-slate-400 bg-white"
                    >
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Users className="w-9 h-9 text-slate-300" />
                        <p className="text-base font-bold text-slate-700">조회된 독자 데이터가 없습니다.</p>
                        <p className="text-xs text-slate-400">
                          선택한 분류에 등록된 독자가 없거나 검색 조건에 일치하는 항목이 없습니다.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedSubscribers.map((sub, index) => {
                    const itemIndex = (pageSize === -1 ? 0 : (currentPage - 1) * pageSize) + index + 1;
                    const resolved = resolveSubscriberDisplayFields(sub);
                    const normCat = normalizeDmCategory(sub);
                    const dDay = calculateSubscriberDDay(sub.expiryDate);
                    const isUrgent = dDay.days === 1;
                    const isUpcoming = dDay.days > 1 && dDay.days <= 7;
                    const isOverdue = dDay.days < 0;

                    const startCompact = formatIssueCompact(sub.startDate);
                    const expiryCompact = formatIssueCompact(sub.expiryDate);
                    const hasPayment = Boolean(sub.paymentHistory && sub.paymentHistory.trim() !== '');

                    return (
                      <tr
                        key={sub.id || index}
                        className="hover:bg-blue-50/50 transition-colors bg-white group border-b border-slate-100"
                      >
                        {/* 1. 순번 */}
                        <td className="py-3 px-2.5 text-center font-mono text-slate-400 font-bold text-xs sm:text-sm">
                          {itemIndex}
                        </td>

                        {/* 2. 이름 (D-Day 배지 + 성명) */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {normCat === '정기구독' && sub.expiryDate && dDay.text && dDay.text !== '-' && (
                              <span
                                className={`text-[11px] font-black px-1.5 py-0.5 rounded font-mono shrink-0 ${
                                  isUrgent || isUpcoming
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                                    : isOverdue
                                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}
                              >
                                {dDay.text}
                              </span>
                            )}
                            <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                              {sub.name || sub.company || '이름없음'}
                            </span>
                            {isRegisteredOrOverseas(sub.shippingInfo || sub.address) && (
                              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                등기
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. 구분 (전체 탭일 때만 렌더) */}
                        {selectedCategoryTab === '전체' && (
                          <td className="py-3 px-2.5 whitespace-nowrap text-slate-600 font-medium">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-xs">
                              {normCat}
                            </span>
                          </td>
                        )}

                        {/* 4. 회사명 */}
                        <td className="py-3 px-2.5 text-slate-800 font-medium text-xs sm:text-sm max-w-[150px] truncate" title={sub.company || sub.organization}>
                          {sub.company || sub.organization || '-'}
                        </td>

                        {/* 5. 휴대전화 */}
                        <td className="py-3 px-2.5 whitespace-nowrap font-mono text-slate-700 text-xs sm:text-sm">
                          {sub.mobile || sub.phone || '-'}
                        </td>

                        {/* 6. 부수 */}
                        <td className="py-3 px-2 text-center font-mono font-bold text-slate-900 text-xs sm:text-sm">
                          <span className={sub.copies && sub.copies >= 2 ? 'px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-extrabold border border-purple-200' : ''}>
                            {sub.copies || 1}
                          </span>
                        </td>

                        {/* 7. 구독시작호 */}
                        <td className="py-3 px-2.5 whitespace-nowrap text-slate-800">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-xs sm:text-sm">{startCompact.main}</span>
                            {startCompact.vol && (
                              <span className="text-[11px] text-slate-400 font-mono">({startCompact.vol})</span>
                            )}
                          </div>
                        </td>

                        {/* 8. 구독만료호 (정기구독 / 전체일 때만 렌더) */}
                        {(selectedCategoryTab === '정기구독' || selectedCategoryTab === '전체') && (
                          <td className="py-3 px-2.5 whitespace-nowrap text-slate-900">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-xs sm:text-sm">{expiryCompact.main}</span>
                              {expiryCompact.vol && (
                                <span className="text-[11px] text-slate-400 font-mono">({expiryCompact.vol})</span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* 9. 입금현황 (정기구독 / 전체일 때만 렌더) */}
                        {(selectedCategoryTab === '정기구독' || selectedCategoryTab === '전체') && (
                          <td className="py-3 px-2.5 whitespace-nowrap text-xs sm:text-sm">
                            {normCat === '정기구독' && hasPayment ? (
                              <div className="flex items-center gap-1.5" title={sub.paymentHistory}>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                  입금
                                </span>
                                <span className="text-xs text-slate-700 font-mono truncate max-w-[100px]">
                                  {sub.paymentHistory}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium">-</span>
                            )}
                          </td>
                        )}

                        {/* 10. 관리/수정 액션 (오른쪽 고정으로 가로 스크롤 없이 언제든 즉시 조작 가능) */}
                        <td className="py-3 px-2 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-blue-50/90 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] border-l border-slate-100 transition-colors">
                          {effectiveReadOnly ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>조회</span>
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              {normCat === '정기구독' && (
                                <button
                                  onClick={() => setSubToPay(sub)}
                                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                  title="입금 확인 등록"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => onEditSubscriber(sub)}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100/70 rounded-lg transition-colors cursor-pointer font-bold"
                                title="독자 정보 수정"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setSubToDelete(sub)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="삭제"
                              >
                                <Trash2 className="w-4 h-4" />
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
        )}

        {/* 4. Performance Pagination Toolbar (Table & Cards Views) */}
        {viewMode !== 'excel' && filteredSubscribers.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            {/* Left: Summary & Page Size */}
            <div className="flex items-center gap-3">
              <span>
                전체 <strong className="text-slate-900 font-bold">{filteredSubscribers.length.toLocaleString()}</strong>명 중{' '}
                <strong className="text-blue-700 font-bold">
                  {pageSize === -1 ? 1 : (currentPage - 1) * pageSize + 1} ~{' '}
                  {pageSize === -1 ? filteredSubscribers.length : Math.min(currentPage * pageSize, filteredSubscribers.length)}
                </strong>
                명 표시
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-medium">보기:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={25}>25명씩</option>
                  <option value={50}>50명씩</option>
                  <option value={100}>100명씩</option>
                  <option value={-1}>전체보기</option>
                </select>
              </div>
            </div>

            {/* Right: Page Navigation Buttons */}
            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="이전 페이지"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Page Number Chips */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[28px] h-7 px-2 rounded text-xs font-bold transition-colors cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="다음 페이지"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {subToPay && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <DollarSign className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">구독료 입금 확인 등록</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-900 font-bold">{subToPay.name}</strong> ({subToPay.company || '개인'}) 독자의 입금 내역을 등록합니다.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">입금일자</label>
                <input
                  type="date"
                  value={payDateInput}
                  onChange={(e) => setPayDateInput(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">입금금액/내용</label>
                <input
                  type="text"
                  value={payAmountInput}
                  onChange={(e) => setPayAmountInput(e.target.value)}
                  placeholder="예: 30,000원 또는 1년 정기구독료"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubToPay(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-sm"
              >
                입금 확인 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {subToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">독자 정보 삭제</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              정말로 <strong className="text-slate-900 font-bold">{subToDelete.name || subToDelete.company}</strong> 독자 정보를 삭제하시겠습니까?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubToDelete(null)}
                disabled={isDeletingSingle}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingSingle}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-sm flex items-center gap-1"
              >
                {isDeletingSingle ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expiry Manager Modal */}
      <ExpiryManagerModal
        isOpen={isExpiryModalOpen}
        onClose={() => setIsExpiryModalOpen(false)}
        subscribers={subscribers}
        onSuccessToast={(msg) => showToast(msg)}
      />

      {/* CSV / Excel Batch Upload Modal */}
      <CsvUploadModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
      />

      {/* Data Clear / Reset Modal */}
      <ClearSubscribersModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        subscribers={subscribers}
        initialScope={clearInitialScope}
        onSuccess={(count, scopeName) => {
          showToast(`독자 데이터 ${count}건 (${scopeName})이 안전하게 삭제되었습니다.`);
        }}
      />
    </div>
  );
};
