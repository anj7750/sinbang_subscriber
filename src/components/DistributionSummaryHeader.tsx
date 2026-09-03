import React, { useState } from 'react';
import {
  Newspaper,
  Truck,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Ban,
  Package,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  FileCheck
} from 'lucide-react';
import { Subscriber } from '../types';

interface DistributionSummaryHeaderProps {
  subscribers: Subscriber[];
  onSelectTabFilter?: (tab: string) => void;
}

export const DistributionSummaryHeader: React.FC<DistributionSummaryHeaderProps> = ({
  subscribers,
  onSelectTabFilter
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Dynamic calculations based on live subscribers in state
  const totalSubscribers = subscribers.length;
  const dmCount = subscribers.filter((s) => s.status === '정상' || s.status === '만료예정').length;
  const expiredCount = subscribers.filter((s) => s.status === '구독만료' || s.status === '만료').length;
  const stoppedCount = subscribers.filter((s) => s.status === '구독중단').length;

  const totalCopies = subscribers.reduce((acc, curr) => acc + (curr.copies || 1), 0);
  const dmCopies = subscribers
    .filter((s) => s.status === '정상' || s.status === '만료예정')
    .reduce((acc, curr) => acc + (curr.copies || 1), 0);

  // Category breakdowns
  const categoryCounts: Record<string, number> = {};
  subscribers.forEach((s) => {
    const cat = s.category || '기타';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 mb-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/90 text-white rounded-xl shadow-md border border-indigo-400/30">
            <Newspaper className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold tracking-wider text-indigo-400 uppercase bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                발송 총괄 요약표
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {new Date().getFullYear()}년호 기준 실시간 집계
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5">
              신문과방송 DM 발송 및 구독 분포 요약
            </h3>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
        >
          <span>{isExpanded ? '요약 접기' : '요약 펼치기'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Main KPI Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div
          onClick={() => onSelectTabFilter && onSelectTabFilter('DM리스트')}
          className="cursor-pointer bg-slate-800/70 hover:bg-slate-800/90 border border-emerald-500/40 rounded-xl p-3.5 transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-xs font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>DM 발송 리스트</span>
            </span>
            <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-300">
              정상+만료예정
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-white">{dmCount.toLocaleString()} <span className="text-xs font-normal text-slate-400">명</span></span>
            <span className="text-xs font-bold text-emerald-300">{dmCopies.toLocaleString()} 부</span>
          </div>
        </div>

        <div
          onClick={() => onSelectTabFilter && onSelectTabFilter('구독만료')}
          className="cursor-pointer bg-slate-800/70 hover:bg-slate-800/90 border border-slate-600/50 rounded-xl p-3.5 transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-xs font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>구독만료 독자</span>
            </span>
            <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-slate-300">
              재구독 대상
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-100">{expiredCount.toLocaleString()} <span className="text-xs font-normal text-slate-400">명</span></span>
            <span className="text-xs text-slate-400">만료목록</span>
          </div>
        </div>

        <div
          onClick={() => onSelectTabFilter && onSelectTabFilter('구독중단')}
          className="cursor-pointer bg-slate-800/70 hover:bg-slate-800/90 border border-rose-500/40 rounded-xl p-3.5 transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between text-rose-400 mb-1">
            <span className="text-xs font-bold flex items-center gap-1">
              <Ban className="w-3.5 h-3.5" />
              <span>구독중단 (누적)</span>
            </span>
            <span className="text-[10px] bg-rose-500/20 px-1.5 py-0.5 rounded font-mono font-bold text-rose-300">
              발송제외
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-white">{stoppedCount.toLocaleString()} <span className="text-xs font-normal text-slate-400">명</span></span>
            <span className="text-xs text-rose-300 font-bold">누적 중단</span>
          </div>
        </div>

        <div
          onClick={() => onSelectTabFilter && onSelectTabFilter('전체')}
          className="cursor-pointer bg-slate-800/70 hover:bg-slate-800/90 border border-indigo-500/40 rounded-xl p-3.5 transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between text-indigo-400 mb-1">
            <span className="text-xs font-bold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>전체 등록 데이터</span>
            </span>
            <span className="text-[10px] bg-indigo-500/20 px-1.5 py-0.5 rounded font-mono font-bold text-indigo-300">
              DB 전체
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-white">{totalSubscribers.toLocaleString()} <span className="text-xs font-normal text-slate-400">명</span></span>
            <span className="text-xs text-indigo-300 font-bold">총 {totalCopies.toLocaleString()} 부</span>
          </div>
        </div>
      </div>

      {/* Expanded Details Section */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4 animate-in fade-in duration-200">
          
          {/* Distribution Outlets Info */}
          <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/60 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-200">발송업체 (디마)</div>
                <div className="text-slate-400 text-[11px]">2,200 부 (서울 중구 동호로15길 55)</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-200">유통 대행 (컴북스)</div>
                <div className="text-slate-400 text-[11px]">50 부 배정</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-200">재단 보관/내부</div>
                <div className="text-slate-400 text-[11px]">150 부 (프레스센터 12/13층)</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-200">총 발행 부수</div>
                <div className="text-indigo-300 font-extrabold">2,400 부 정기 발행</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
