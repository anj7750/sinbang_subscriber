import React, { useState } from 'react';
import { Printer, Check, Filter, Newspaper, Mail, Download } from 'lucide-react';
import { Subscriber } from '../types';

interface LabelPrintViewProps {
  subscribers: Subscriber[];
}

export const LabelPrintView: React.FC<LabelPrintViewProps> = ({ subscribers }) => {
  const [filterType, setFilterType] = useState<string>('발송대상');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    subscribers.map((s) => s.id || '').filter(Boolean)
  );

  const targets = subscribers.filter((s) => {
    if (filterType === '발송대상') {
      return s.status === '정상' || s.status === '만료예정';
    }
    if (filterType === '도서관/기관') {
      return s.subscriptionType === '도서관' || s.subscriptionType === '기관/단체';
    }
    return true;
  });

  const handleToggleSelectAll = () => {
    if (selectedIds.length === targets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(targets.map((t) => t.id || '').filter(Boolean));
    }
  };

  const handleToggleSelect = (id?: string) => {
    if (!id) return;
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedSubscribers = targets.filter((s) => s.id && selectedIds.includes(s.id));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden mb-8">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <Printer className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              우체국 DM 라벨 인쇄 및 발송 명단
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            &lt;신문과방송&gt; 정기구독 봉투용 우편 주소 라벨(2x8 표준 양식) 출력 지원
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleSelectAll}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            {selectedIds.length === targets.length ? '전체 해제' : '전체 선택'}
          </button>
          <button
            onClick={handlePrint}
            disabled={selectedSubscribers.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>라벨 인쇄하기 ({selectedSubscribers.length}건)</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
          <span className="text-slate-400 font-medium px-1.5 text-[11px]">인쇄 대상:</span>
          {['발송대상', '도서관/기관', '전체'].map((ft) => (
            <button
              key={ft}
              onClick={() => setFilterType(ft)}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterType === ft
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {ft}
            </button>
          ))}
        </div>

        <span className="text-slate-500 font-medium">
          선택된 배송 라벨: <strong className="text-blue-600">{selectedSubscribers.length}개</strong>
        </span>
      </div>

      {/* Print Labels Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
          {selectedSubscribers.map((sub) => (
            <div
              key={sub.id}
              onClick={() => handleToggleSelect(sub.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative bg-white ${
                selectedIds.includes(sub.id || '')
                  ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-xs'
                  : 'border-slate-200 opacity-60'
              }`}
            >
              {/* Postal Stamp Badge */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-2 mb-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Newspaper className="w-3.5 h-3.5 text-blue-600" />
                  <span>신문과방송 정기구독 DM</span>
                </div>
                <div className="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  우편번호 [{sub.zipCode}]
                </div>
              </div>

              {/* Address info */}
              <div className="space-y-1 mb-3">
                <div className="text-sm font-bold text-slate-900">
                  {sub.address} {sub.detailAddress && <span>({sub.detailAddress})</span>}
                </div>
                <div className="text-xs text-slate-600">
                  {(sub.company || sub.organization) && (
                    <span className="font-medium text-slate-700 mr-2">
                      [{sub.company || sub.organization}]
                    </span>
                  )}
                  <span className="font-bold text-slate-900 text-base">{sub.name}</span> 귀하
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                <span>발송수량: <strong className="text-slate-700">{sub.copies}부</strong></span>
                <span>연락처: {sub.phone}</span>
                <span className="text-blue-600 font-semibold">요금후납</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
