import React, { useState } from 'react';
import {
  PackageX,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Send,
  XCircle,
  Edit2,
  Building,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { ReturnLog, ReturnStatus, ReturnReason } from '../types';
import { updateReturnLog, updateSubscriber, addReturnLog, deleteReturnLog } from '../services/firebaseService';

interface ReturnLogListProps {
  returns: ReturnLog[];
  onRefreshData?: () => void;
}

export const ReturnLogList: React.FC<ReturnLogListProps> = ({ returns }) => {
  const [editingReturnId, setEditingReturnId] = useState<string | null>(null);
  const [newAddrInput, setNewAddrInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('대기중');

  // Add Return Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    subscriberName: '',
    organization: '',
    zipCode: '',
    address: '',
    reason: '주소불명' as ReturnReason,
    returnedAt: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete state
  const [returnToDelete, setReturnToDelete] = useState<ReturnLog | null>(null);

  const filteredReturns = returns.filter((r) => {
    if (statusFilter === '전체') return true;
    return r.status === statusFilter;
  });

  const handleResolveAddress = async (ret: ReturnLog) => {
    if (!ret.id || !newAddrInput.trim()) return;

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await updateReturnLog(ret.id, {
        status: '주소수정완료',
        newAddress: newAddrInput.trim(),
        processedAt: todayStr
      });

      if (ret.subscriberId) {
        await updateSubscriber(ret.subscriberId, {
          address: newAddrInput.trim(),
          status: '정상',
          dmDeliveryStatus: '발송예정'
        });
      }

      setEditingReturnId(null);
      setNewAddrInput('');
    } catch (err) {
      console.error('Failed to update return address:', err);
    }
  };

  const handleMarkResent = async (id?: string) => {
    if (!id) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await updateReturnLog(id, {
        status: '재발송완료',
        processedAt: todayStr
      });
    } catch (err) {
      console.error('Failed to mark resent:', err);
    }
  };

  const [returnToCancel, setReturnToCancel] = useState<ReturnLog | null>(null);

  const handleConfirmCancelSubscription = async () => {
    if (!returnToCancel?.id) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await updateReturnLog(returnToCancel.id, {
        status: '구독해지',
        processedAt: todayStr
      });

      if (returnToCancel.subscriberId) {
        await updateSubscriber(returnToCancel.subscriberId, {
          status: '만료',
          dmDeliveryStatus: '반송대기'
        });
      }
      setReturnToCancel(null);
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.subscriberName.trim() || !addForm.address.trim()) return;

    setIsSubmitting(true);
    try {
      await addReturnLog({
        subscriberName: addForm.subscriberName.trim(),
        organization: addForm.organization.trim() || undefined,
        zipCode: addForm.zipCode.trim() || '00000',
        address: addForm.address.trim(),
        reason: addForm.reason,
        returnedAt: addForm.returnedAt || new Date().toISOString().split('T')[0],
        status: '대기중',
        notes: addForm.notes.trim() || undefined
      });

      setIsAddModalOpen(false);
      setAddForm({
        subscriberName: '',
        organization: '',
        zipCode: '',
        address: '',
        reason: '주소불명',
        returnedAt: new Date().toISOString().split('T')[0],
        notes: ''
      });
    } catch (err) {
      console.error('Failed to add return log:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!returnToDelete?.id) return;
    try {
      await deleteReturnLog(returnToDelete.id);
      setReturnToDelete(null);
    } catch (err) {
      console.error('Failed to delete return log:', err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden mb-8">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
              <PackageX className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              우체국 반송 DM 처리 전용 대시보드
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-full">
              {returns.filter((r) => r.status === '대기중').length}건 처리대기
            </span>
          </div>
          <p className="text-xs text-slate-500">
            주소 불명, 이사, 수취 거절 등으로 우체국에서 반송된 &lt;신문과방송&gt; 잡지 재발송 및 주소 정정
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add Return Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>반송 내역 추가</span>
          </button>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs">
            {['대기중', '주소수정완료', '재발송완료', '구독해지', '전체'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Return List Table */}
      <div className="divide-y divide-slate-100">
        {filteredReturns.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <PackageX className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600 mb-1">
              해당하는 반송 내역이 없습니다.
            </p>
            <p className="text-xs text-slate-400 mb-4">
              우체국에서 반송된 DM이 발생하면 [+ 반송 내역 추가] 버튼으로 직접 등록하거나 관리할 수 있습니다.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold border border-rose-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>첫 반송 내역 등록하기</span>
            </button>
          </div>
        ) : (
          filteredReturns.map((ret) => (
            <div key={ret.id} className="p-5 hover:bg-slate-50/80 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Subscriber & Return Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">
                      {ret.subscriberName}
                    </span>
                    {ret.organization && (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        {ret.organization}
                      </span>
                    )}

                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      반송사유: {ret.reason}
                    </span>

                    <span className="text-xs text-slate-400 font-mono">
                      반송일: {ret.returnedAt}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-slate-400 font-mono">[{ret.zipCode}]</span>{' '}
                      <span>{ret.address}</span>
                      {ret.notes && (
                        <span className="text-rose-600 font-medium ml-2">
                          ({ret.notes})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Show updated address if available */}
                  {ret.newAddress && (
                    <div className="text-xs text-emerald-800 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 mt-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>수정된 새 주소: {ret.newAddress}</span>
                    </div>
                  )}
                </div>

                {/* Return Status & Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {ret.status === '대기중' && editingReturnId !== ret.id && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingReturnId(ret.id || null);
                          setNewAddrInput(ret.address);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>주소 수정 및 재발송</span>
                      </button>
                      <button
                        onClick={() => setReturnToCancel(ret)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        발송중단
                      </button>
                    </div>
                  )}

                  {ret.status === '주소수정완료' && (
                    <button
                      onClick={() => handleMarkResent(ret.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>재발송 처리 완료</span>
                    </button>
                  )}

                  {ret.status === '재발송완료' && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      재발송 완료 ({ret.processedAt})
                    </span>
                  )}

                  {ret.status === '구독해지' && (
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg border border-slate-300">
                      발송 중단됨
                    </span>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => setReturnToDelete(ret)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="반송 내역 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Inline Address Edit Form */}
              {editingReturnId === ret.id && (
                <div className="mt-3 p-3 bg-blue-50/80 rounded-xl border border-blue-200 animate-in fade-in duration-200">
                  <div className="text-xs font-bold text-blue-900 mb-1.5">
                    구독자 주소 정정 및 Firebase 데이터베이스 반영:
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newAddrInput}
                      onChange={(e) => setNewAddrInput(e.target.value)}
                      placeholder="정확한 신규 배송지 주소를 입력하세요..."
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleResolveAddress(ret)}
                      disabled={!newAddrInput.trim()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      저장 및 주소갱신
                    </button>
                    <button
                      onClick={() => setEditingReturnId(null)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs rounded-lg hover:bg-slate-300 cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Return Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                  <PackageX className="w-4 h-4" />
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  신규 우체국 반송건 등록
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  수령인 / 독자명 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.subscriberName}
                  onChange={(e) => setAddForm({ ...addForm, subscriberName: e.target.value })}
                  placeholder="예: 홍길동 또는 한국대학교 도서관"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">소속 / 기관명 (선택)</label>
                <input
                  type="text"
                  value={addForm.organization}
                  onChange={(e) => setAddForm({ ...addForm, organization: e.target.value })}
                  placeholder="예: 서울대학교, 한겨레 미디어팀 등"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">우편번호</label>
                  <input
                    type="text"
                    value={addForm.zipCode}
                    onChange={(e) => setAddForm({ ...addForm, zipCode: e.target.value })}
                    placeholder="04520"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">반송사유</label>
                  <select
                    value={addForm.reason}
                    onChange={(e) => setAddForm({ ...addForm, reason: e.target.value as ReturnReason })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                  >
                    <option value="주소불명">주소불명 (동호수 누락/번지 오류)</option>
                    <option value="이사불명">이사불명 (수취인 이사/퇴사)</option>
                    <option value="수취거절">수취거절 (수취 의사 없음)</option>
                    <option value="수취인부재">수취인부재 (장기 부재)</option>
                    <option value="폐문부재">폐문부재</option>
                    <option value="기타">기타 사유</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  반송 배송지 주소 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.address}
                  onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                  placeholder="예: 서울특별시 중구 세종대로 124 10층"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">반송 확인일</label>
                  <input
                    type="date"
                    value={addForm.returnedAt}
                    onChange={(e) => setAddForm({ ...addForm, returnedAt: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">메모 / 스티커 내용</label>
                  <input
                    type="text"
                    value={addForm.notes}
                    onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                    placeholder="예: 우체국 반송 스티커 부착"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1"
                >
                  {isSubmitting ? '등록 중...' : '반송건 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Return Confirmation Modal */}
      {returnToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mb-1.5">
              반송 기록 삭제 확인
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              <strong>{returnToDelete.subscriberName}</strong>의 반송 기록을 데이터베이스에서 완전히 삭제하시겠습니까?
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReturnToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>삭제하기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Subscription Confirmation Modal */}
      {returnToCancel && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <PackageX className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mb-1.5">
              DM 발송 중단 및 구독 해지 처리
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              <strong>{returnToCancel.subscriberName}</strong> 회원의 반송건을 확인하고 향후 DM 발송을 중단(구독 해지) 처리하시겠습니까?
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReturnToCancel(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelSubscription}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>발송 중단 처리</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
