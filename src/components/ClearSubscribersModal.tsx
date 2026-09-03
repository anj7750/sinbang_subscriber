import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  X,
  RefreshCw,
  Ban,
  Clock,
  CheckCircle,
  Layers,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Subscriber } from '../types';
import { clearSubscribersByStatus, clearAllSubscribers } from '../services/firebaseService';

export type ClearScope = '구독중단' | '구독만료' | 'DM리스트' | '전체';

interface ClearSubscribersModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscribers: Subscriber[];
  initialScope?: ClearScope;
  onSuccess: (count: number, scopeName: string) => void;
}

export const ClearSubscribersModal: React.FC<ClearSubscribersModalProps> = ({
  isOpen,
  onClose,
  subscribers,
  initialScope = '전체',
  onSuccess
}) => {
  const [selectedScope, setSelectedScope] = useState<ClearScope>(initialScope);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initial scope when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedScope(initialScope);
      setErrorMsg(null);
      setProgressMsg('');
      setIsProcessing(false);
    }
  }, [isOpen, initialScope]);

  if (!isOpen) return null;

  // Counts
  const dmCount = subscribers.filter((s) => s.status === '정상' || s.status === '만료예정').length;
  const expiredCount = subscribers.filter((s) => s.status === '구독만료' || s.status === '만료').length;
  const stoppedCount = subscribers.filter((s) => s.status === '구독중단').length;
  const totalCount = subscribers.length;

  const getTargetCount = () => {
    switch (selectedScope) {
      case '구독중단':
        return stoppedCount;
      case '구독만료':
        return expiredCount;
      case 'DM리스트':
        return dmCount;
      case '전체':
      default:
        return totalCount;
    }
  };

  const getScopeLabel = () => {
    switch (selectedScope) {
      case '구독중단':
        return '구독중단 독자';
      case '구독만료':
        return '구독만료 독자';
      case 'DM리스트':
        return 'DM 발송 리스트 독자';
      case '전체':
      default:
        return '전체 독자 데이터';
    }
  };

  const handleExecuteClear = async () => {
    const targetCount = getTargetCount();
    if (targetCount === 0) {
      setErrorMsg('선택한 분류에 삭제할 독자 데이터가 없습니다.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setProgressMsg('데이터베이스 삭제 작업 시작 중...');

    try {
      let deleted = 0;
      if (selectedScope === '전체') {
        await clearAllSubscribers((done, total) => {
          setProgressMsg(`전체 데이터 삭제 중... (${done.toLocaleString()} / ${total.toLocaleString()}건)`);
        });
        deleted = targetCount;
      } else if (selectedScope === '구독중단') {
        deleted = await clearSubscribersByStatus(['구독중단'], (done, total) => {
          setProgressMsg(`구독중단 데이터 삭제 중... (${done.toLocaleString()} / ${total.toLocaleString()}건)`);
        });
      } else if (selectedScope === '구독만료') {
        deleted = await clearSubscribersByStatus(['구독만료', '만료'], (done, total) => {
          setProgressMsg(`구독만료 데이터 삭제 중... (${done.toLocaleString()} / ${total.toLocaleString()}건)`);
        });
      } else if (selectedScope === 'DM리스트') {
        deleted = await clearSubscribersByStatus(['정상', '만료예정'], (done, total) => {
          setProgressMsg(`DM 발송 리스트 삭제 중... (${done.toLocaleString()} / ${total.toLocaleString()}건)`);
        });
      }

      onSuccess(deleted, getScopeLabel());
      onClose();
    } catch (err: any) {
      console.error('Failed to clear subscribers:', err);
      setErrorMsg(err.message || '데이터 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  const targetCount = getTargetCount();

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                독자 데이터 초기화 및 삭제
              </h3>
              <p className="text-xs text-rose-200/90 mt-0.5">
                원하는 범위를 선택하여 Firestore에 저장된 독자 목록을 정리합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800">
          
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Scope Selector Options */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              초기화할 데이터 범위를 선택하세요:
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              
              {/* Option 1: 구독중단 독자만 */}
              <button
                type="button"
                onClick={() => setSelectedScope('구독중단')}
                disabled={isProcessing}
                className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                  selectedScope === '구독중단'
                    ? 'border-rose-500 bg-rose-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedScope === '구독중단' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-700'
                  }`}>
                    <Ban className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <span>🛑 [구독중단] 독자 명단만 초기화</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        추천
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      구독 해지 및 중단(누적) 상태인 독자 데이터만 깔끔하게 비웁니다.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base font-black text-rose-600 font-mono">
                    {stoppedCount.toLocaleString()}건
                  </span>
                </div>
              </button>

              {/* Option 2: 구독만료 독자만 */}
              <button
                type="button"
                onClick={() => setSelectedScope('구독만료')}
                disabled={isProcessing}
                className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                  selectedScope === '구독만료'
                    ? 'border-slate-700 bg-slate-100 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedScope === '구독만료' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      ⌛ [구독만료] 독자 명단만 초기화
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      구독 기간이 만료된 독자 데이터만 선별하여 삭제합니다.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base font-black text-slate-700 font-mono">
                    {expiredCount.toLocaleString()}건
                  </span>
                </div>
              </button>

              {/* Option 3: DM 발송 리스트만 */}
              <button
                type="button"
                onClick={() => setSelectedScope('DM리스트')}
                disabled={isProcessing}
                className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                  selectedScope === 'DM리스트'
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedScope === 'DM리스트' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      📬 [DM 발송 리스트 (정상/만료예정)] 독자만 초기화
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      현재 우체국 DM 발송 대상인 유효 독자 목록만 삭제합니다.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base font-black text-emerald-600 font-mono">
                    {dmCount.toLocaleString()}건
                  </span>
                </div>
              </button>

              {/* Option 4: 전체 데이터 완전 초기화 */}
              <button
                type="button"
                onClick={() => setSelectedScope('전체')}
                disabled={isProcessing}
                className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                  selectedScope === '전체'
                    ? 'border-rose-700 bg-rose-100/60 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedScope === '전체' ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      🗑️ [모든 독자 데이터] 완전 비우기 (전체 삭제)
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Firestore에 등록된 모든 상태의 독자 명단을 완전히 비우고 0건으로 리셋합니다.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base font-black text-rose-800 font-mono">
                    총 {totalCount.toLocaleString()}건
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">주의: 삭제된 데이터는 복구할 수 없습니다.</p>
              <p className="text-amber-800 mt-0.5">
                현재 선택된 <strong>[{getScopeLabel()}]</strong> 분류의 독자 <strong>{targetCount.toLocaleString()}명</strong>이 데이터베이스에서 완전 삭제됩니다.
              </p>
            </div>
          </div>

          {/* Real-time Deletion Progress Overlay */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center gap-3 animate-pulse">
              <RefreshCw className="w-5 h-5 text-rose-400 animate-spin shrink-0" />
              <div>
                <div className="text-xs font-bold text-rose-300">
                  {progressMsg || '데이터 삭제 진행 중...'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Firestore 일괄 삭제 작업 중입니다. 잠시만 기다려 주세요.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            삭제 대상: <strong className="text-rose-600 font-bold">{targetCount.toLocaleString()}건</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-xl transition-colors disabled:opacity-50"
            >
              취소
            </button>

            <button
              type="button"
              onClick={handleExecuteClear}
              disabled={isProcessing || targetCount === 0}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md shadow-rose-950/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>삭제 처리 중...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>{getScopeLabel()} {targetCount.toLocaleString()}건 초기화 실행</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
