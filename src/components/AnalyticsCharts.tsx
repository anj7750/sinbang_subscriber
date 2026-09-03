import React, { useState, useMemo } from 'react';
import {
  PieChart,
  BarChart3,
  Users,
  CheckCircle2,
  Clock,
  Ban,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Building2,
  BookOpen,
  Headphones,
  GraduationCap,
  PenTool,
  Gift,
  Layers,
  Sparkles,
  PackageCheck
} from 'lucide-react';
import { Subscriber, TodoTask } from '../types';

interface AnalyticsChartsProps {
  subscribers: Subscriber[];
  todos?: TodoTask[];
  onSelectTab?: (tab: string, filter?: string) => void;
}

interface CategoryStat {
  key: string;
  label: string;
  count: number;
  copies: number;
  percent: number;
  color: string;
  hoverColor: string;
  bgLight: string;
  borderColor: string;
  textColor: string;
  icon: React.ElementType;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  subscribers,
  todos = [],
  onSelectTab
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const totalSubscribers = subscribers.length;
  const totalCopies = useMemo(() => {
    return subscribers.reduce((acc, curr) => acc + (curr.copies || 1), 0);
  }, [subscribers]);

  // 1. Dynamic Category Aggregation from real subscriber dataset
  const categoryMap = new Map<string, { count: number; copies: number }>();

  subscribers.forEach((s) => {
    // Robust fallback: category -> subscriptionType -> '기타'
    let rawCat = (s.category || s.subscriptionType || '').trim();
    if (!rawCat) rawCat = '기타';

    // Normalize known categories
    let normalized = rawCat;
    if (rawCat.includes('정기구독') || rawCat === '개인' || rawCat === '정기' || rawCat === '유료') {
      normalized = '정기구독';
    } else if (rawCat.includes('기관') || rawCat.includes('단체') || rawCat === '언론사' || rawCat === '지자체') {
      normalized = '기관/단체';
    } else if (rawCat.includes('도서관')) {
      normalized = '도서관';
    } else if (rawCat.includes('고객CS') || rawCat.includes('CS') || rawCat.includes('고객지원')) {
      normalized = '고객CS';
    } else if (rawCat.includes('관계기관') || rawCat.includes('언론재단') || rawCat.includes('재단')) {
      normalized = '관계기관';
    } else if (rawCat.includes('대학') || rawCat.includes('연구소') || rawCat.includes('학술')) {
      normalized = '대학/연구소';
    } else if (rawCat.includes('필자') || rawCat.includes('기고')) {
      normalized = '필자';
    } else if (rawCat.includes('판촉') || rawCat.includes('증정') || rawCat.includes('기증') || rawCat.includes('홍보')) {
      normalized = '판촉/증정';
    }

    const current = categoryMap.get(normalized) || { count: 0, copies: 0 };
    current.count += 1;
    current.copies += s.copies || 1;
    categoryMap.set(normalized, current);
  });

  // Standard category design definitions
  const categoryMeta: Record<
    string,
    {
      color: string;
      hoverColor: string;
      bgLight: string;
      borderColor: string;
      textColor: string;
      icon: React.ElementType;
    }
  > = {
    '정기구독': {
      color: '#4f46e5', // indigo-600
      hoverColor: '#3730a3', // indigo-800
      bgLight: 'bg-indigo-50/80',
      borderColor: 'border-indigo-200',
      textColor: 'text-indigo-700',
      icon: Sparkles
    },
    '기관/단체': {
      color: '#059669', // emerald-600
      hoverColor: '#065f46', // emerald-800
      bgLight: 'bg-emerald-50/80',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-700',
      icon: Building2
    },
    '도서관': {
      color: '#2563eb', // blue-600
      hoverColor: '#1e40af', // blue-800
      bgLight: 'bg-blue-50/80',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      icon: BookOpen
    },
    '고객CS': {
      color: '#d97706', // amber-600
      hoverColor: '#92400e', // amber-800
      bgLight: 'bg-amber-50/80',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-700',
      icon: Headphones
    },
    '관계기관': {
      color: '#7c3aed', // violet-600
      hoverColor: '#5b21b6', // violet-800
      bgLight: 'bg-violet-50/80',
      borderColor: 'border-violet-200',
      textColor: 'text-violet-700',
      icon: Layers
    },
    '대학/연구소': {
      color: '#0891b2', // cyan-600
      hoverColor: '#155e75', // cyan-800
      bgLight: 'bg-cyan-50/80',
      borderColor: 'border-cyan-200',
      textColor: 'text-cyan-700',
      icon: GraduationCap
    },
    '필자': {
      color: '#e11d48', // rose-600
      hoverColor: '#9f1239', // rose-800
      bgLight: 'bg-rose-50/80',
      borderColor: 'border-rose-200',
      textColor: 'text-rose-700',
      icon: PenTool
    },
    '판촉/증정': {
      color: '#0d9488', // teal-600
      hoverColor: '#115e59', // teal-800
      bgLight: 'bg-teal-50/80',
      borderColor: 'border-teal-200',
      textColor: 'text-teal-700',
      icon: Gift
    },
    '기타': {
      color: '#64748b', // slate-500
      hoverColor: '#334155', // slate-700
      bgLight: 'bg-slate-100',
      borderColor: 'border-slate-300',
      textColor: 'text-slate-700',
      icon: Users
    }
  };

  // Convert map to sorted CategoryStat array
  const categoryStats: CategoryStat[] = Array.from(categoryMap.entries())
    .map(([key, data]) => {
      const meta = categoryMeta[key] || {
        color: '#6366f1',
        hoverColor: '#4338ca',
        bgLight: 'bg-slate-50',
        borderColor: 'border-slate-200',
        textColor: 'text-slate-700',
        icon: Users
      };
      const percent = totalSubscribers > 0 ? (data.count / totalSubscribers) * 100 : 0;
      return {
        key,
        label: key,
        count: data.count,
        copies: data.copies,
        percent,
        ...meta
      };
    })
    .sort((a, b) => b.count - a.count);

  // 2. Status Breakdown Calculations
  const { dmSubs, dmCount, dmCopies, expiringSubs, expiringCount, expiredSubs, expiredCount, expiredCopies, stoppedSubs, stoppedCount, dmReadyPercent } = useMemo(() => {
    const dmSubsList = subscribers.filter((s) => s.status === '정상' || s.status === '만료예정');
    const dmCountVal = dmSubsList.length;
    const dmCopiesVal = dmSubsList.reduce((acc, curr) => acc + (curr.copies || 1), 0);

    const expiringSubsList = subscribers.filter((s) => s.status === '만료예정');
    const expiringCountVal = expiringSubsList.length;

    const expiredSubsList = subscribers.filter((s) => s.status === '구독만료' || s.status === '만료');
    const expiredCountVal = expiredSubsList.length;
    const expiredCopiesVal = expiredSubsList.reduce((acc, curr) => acc + (curr.copies || 1), 0);

    const stoppedSubsList = subscribers.filter((s) => s.status === '구독중단');
    const stoppedCountVal = stoppedSubsList.length;

    const dmReadyPercentVal = totalSubscribers > 0 ? Math.round((dmCountVal / totalSubscribers) * 100) : 0;

    return {
      dmSubs: dmSubsList,
      dmCount: dmCountVal,
      dmCopies: dmCopiesVal,
      expiringSubs: expiringSubsList,
      expiringCount: expiringCountVal,
      expiredSubs: expiredSubsList,
      expiredCount: expiredCountVal,
      expiredCopies: expiredCopiesVal,
      stoppedSubs: stoppedSubsList,
      stoppedCount: stoppedCountVal,
      dmReadyPercent: dmReadyPercentVal
    };
  }, [subscribers, totalSubscribers]);

  // 3. SVG Donut Chart Geometry Calculations
  const RADIUS = 72;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~452.389
  let accumulatedOffset = 0;

  // Active / Selected category info for central donut display
  const activeHoverStat = categoryStats.find((c) => c.key === hoveredCategory);

  const handleCategoryClick = (categoryKey: string) => {
    if (onSelectTab) {
      onSelectTab('subscribers', categoryKey);
    }
  };

  const handleStatusClick = (statusKey: string) => {
    if (onSelectTab) {
      onSelectTab('subscribers', statusKey);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
      {/* ─────────────────────────────────────────────────────────────
          LEFT CARD (col-span-7): 구독자 유형별 비율 현황 (Interactive SVG Donut & Distribution)
      ───────────────────────────────────────────────────────────── */}
      <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl shadow-2xs">
                <PieChart className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>구독자 유형별 비율 현황</span>
                  <span className="text-[11px] font-extrabold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/70 rounded-md">
                    실시간 집계
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  &lt;신문과방송&gt; 전체 등록 데이터 기준 카테고리 분포
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-700 block">
                총 {totalSubscribers.toLocaleString()}명
              </span>
              <span className="text-[11px] text-indigo-600 font-semibold">
                총 {totalCopies.toLocaleString()}부 발행
              </span>
            </div>
          </div>

          {/* If no subscribers in DB */}
          {totalSubscribers === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                <PieChart className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 mb-1">
                등록된 구독자 데이터가 없습니다
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                독자 명단을 등록하거나 상단 &apos;샘플 데이터 불러오기&apos;를 실행하면 실시간 유형별 비율 그래프가 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* SVG Donut Chart Visual (5 cols) */}
              <div className="md:col-span-5 flex flex-col items-center justify-center relative py-2">
                <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
                  <svg
                    className="w-full h-full transform -rotate-90"
                    viewBox="0 0 200 200"
                  >
                    {/* Background Track Circle */}
                    <circle
                      cx="100"
                      cy="100"
                      r={RADIUS}
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth="24"
                    />

                    {/* Colored Category Slices */}
                    {categoryStats.map((cat) => {
                      const sliceLength = (cat.count / totalSubscribers) * CIRCUMFERENCE;
                      const strokeDasharray = `${sliceLength} ${CIRCUMFERENCE - sliceLength}`;
                      const strokeDashoffset = -accumulatedOffset;
                      accumulatedOffset += sliceLength;

                      const isHovered = hoveredCategory === cat.key;

                      return (
                        <circle
                          key={cat.key}
                          cx="100"
                          cy="100"
                          r={RADIUS}
                          fill="transparent"
                          stroke={cat.color}
                          strokeWidth={isHovered ? 28 : 24}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-300 cursor-pointer"
                          style={{
                            opacity: hoveredCategory && !isHovered ? 0.45 : 1,
                            filter: isHovered ? 'drop-shadow(0px 0px 6px rgba(0,0,0,0.25))' : 'none'
                          }}
                          onMouseEnter={() => setHoveredCategory(cat.key)}
                          onMouseLeave={() => setHoveredCategory(null)}
                          onClick={() => handleCategoryClick(cat.key)}
                        />
                      );
                    })}
                  </svg>

                  {/* Central Donut Readout */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
                    {activeHoverStat ? (
                      <div className="animate-in fade-in zoom-in-95 duration-150">
                        <span className="text-[11px] font-bold text-slate-500 block truncate max-w-[110px]">
                          {activeHoverStat.label}
                        </span>
                        <div
                          className="text-xl sm:text-2xl font-black tracking-tight"
                          style={{ color: activeHoverStat.color }}
                        >
                          {activeHoverStat.percent.toFixed(1)}%
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 block">
                          {activeHoverStat.count.toLocaleString()}명 / {activeHoverStat.copies.toLocaleString()}부
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          전체 독자
                        </span>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          {totalSubscribers.toLocaleString()}
                          <span className="text-xs font-normal text-slate-500 ml-0.5">명</span>
                        </div>
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 block mt-0.5">
                          {totalCopies.toLocaleString()}부 배송
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 text-center mt-1 flex items-center gap-1 font-medium">
                  <span>그래프 항목을 클릭하면 해당 독자 목록으로 이동합니다</span>
                </div>
              </div>

              {/* Category Breakdown & Progress List (7 cols) */}
              <div className="md:col-span-7 space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {categoryStats.map((cat) => {
                  const Icon = cat.icon;
                  const isHovered = hoveredCategory === cat.key;

                  return (
                    <div
                      key={cat.key}
                      onMouseEnter={() => setHoveredCategory(cat.key)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onClick={() => handleCategoryClick(cat.key)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isHovered
                          ? `${cat.bgLight} ${cat.borderColor} shadow-xs scale-[1.01]`
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-slate-800 flex items-center gap-1">
                            <Icon className="w-3.5 h-3.5 text-slate-500" />
                            <span>{cat.label}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-normal">
                            {cat.copies.toLocaleString()}부
                          </span>
                          <span className="font-extrabold text-slate-900">
                            {cat.count.toLocaleString()}명
                          </span>
                          <span
                            className="font-black px-1.5 py-0.5 rounded text-[11px]"
                            style={{
                              backgroundColor: `${cat.color}15`,
                              color: cat.color
                            }}
                          >
                            {cat.percent.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Continuous Segmented Bar */}
                      <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(cat.percent, 1.5)}%`,
                            backgroundColor: cat.color
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Multi-colored Stacked Percentage Bar */}
        {totalSubscribers > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1.5">
              <span>유형별 연속 점유율 (100%)</span>
              <span className="text-slate-400 font-normal">전체 {categoryStats.length}개 분류</span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 shadow-2xs">
              {categoryStats.map((cat) => (
                <div
                  key={cat.key}
                  title={`${cat.label}: ${cat.count}명 (${cat.percent.toFixed(1)}%)`}
                  style={{
                    width: `${cat.percent}%`,
                    backgroundColor: cat.color
                  }}
                  className="h-full transition-all hover:opacity-80 cursor-pointer"
                  onMouseEnter={() => setHoveredCategory(cat.key)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onClick={() => handleCategoryClick(cat.key)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT CARD (col-span-5): 8월호 DM 우편 배송 및 독자 상태 요약
      ───────────────────────────────────────────────────────────── */}
      <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shadow-2xs">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  DM 발송 및 독자 상태 요약
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  우체국 DM 발송 대상 및 중단·만료 상태 집계
                </p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              우체국 연동
            </span>
          </div>

          {/* DM Readiness Gauge Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 mb-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                <span>DM 발송 적격률 (정상+만료예정)</span>
              </span>
              <span className="text-sm font-black text-emerald-700">
                {dmReadyPercent}% ({dmCount.toLocaleString()}명)
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-2">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-700"
                style={{ width: `${dmReadyPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>발송 대상: {dmCopies.toLocaleString()}부</span>
              <span>총 등록: {totalSubscribers.toLocaleString()}명</span>
            </div>
          </div>

          {/* 3 Status KPI Cards Grid */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            {/* 1. 정상 발송 완료 / DM 대상 */}
            <div
              onClick={() => handleStatusClick('DM리스트')}
              className="bg-emerald-50/90 hover:bg-emerald-100/80 p-3.5 rounded-xl border border-emerald-200 transition-all cursor-pointer group"
            >
              <div className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>DM 발송</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-900 mt-1">
                {dmCount.toLocaleString()}
                <span className="text-xs font-normal text-emerald-700 ml-0.5">명</span>
              </div>
              <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                {dmCopies.toLocaleString()}부 배송
              </div>
            </div>

            {/* 2. 구독 만료 독자 */}
            <div
              onClick={() => handleStatusClick('구독만료')}
              className="bg-slate-50 hover:bg-slate-100 p-3.5 rounded-xl border border-slate-300 transition-all cursor-pointer group"
            >
              <div className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>구독만료</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {expiredCount.toLocaleString()}
                <span className="text-xs font-normal text-slate-600 ml-0.5">명</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                재구독 대상
              </div>
            </div>

            {/* 3. 구독 중단 (누적) */}
            <div
              onClick={() => handleStatusClick('구독중단')}
              className="bg-rose-50/90 hover:bg-rose-100/80 p-3.5 rounded-xl border border-rose-200 transition-all cursor-pointer group"
            >
              <div className="text-xs font-bold text-rose-700 flex items-center justify-center gap-1">
                <Ban className="w-3.5 h-3.5" />
                <span>구독중단</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-rose-900 mt-1">
                {stoppedCount.toLocaleString()}
                <span className="text-xs font-normal text-rose-700 ml-0.5">명</span>
              </div>
              <div className="text-[11px] font-semibold text-rose-600 mt-0.5">
                발송 제외
              </div>
            </div>
          </div>
        </div>

        {/* Logistics footnote */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>디마 2,200부 · 컴북스 50부 · 재단 150부</span>
          <span className="text-indigo-600 font-bold">총 2,400부 정기발행</span>
        </div>
      </div>
    </div>
  );
};
