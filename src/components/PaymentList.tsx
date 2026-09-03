import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  X,
  Pencil,
  Check,
  Lock
} from 'lucide-react';
import { PaymentRecord } from '../types';
import { updatePayment, updateSubscriber, addPayment, deletePayment, canUserEdit } from '../services/firebaseService';
import { useAuth } from '../context/AuthContext';

interface PaymentListProps {
  payments: PaymentRecord[];
  isReadOnly?: boolean;
}

export const PaymentList: React.FC<PaymentListProps> = ({ payments, isReadOnly: propReadOnly }) => {
  const { userProfile } = useAuth();
  const isReadOnly = propReadOnly !== undefined ? propReadOnly : !canUserEdit(userProfile);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentRecord | null>(null);

  // Add Form (Default 40,000 KRW, no bank, no target subscriber selector)
  const [addForm, setAddForm] = useState({
    depositorName: '',
    amount: '40000',
    depositDate: new Date().toISOString().split('T')[0],
    memo: '',
    status: '미확인' as '미확인' | '확인완료'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Form
  const [editForm, setEditForm] = useState({
    depositorName: '',
    amount: '40000',
    depositDate: '',
    memo: '',
    status: '미확인' as '미확인' | '확인완료'
  });
  const [isEditing, setIsEditing] = useState(false);

  const unconfirmedPayments = payments.filter((p) => p.status === '미확인');
  const confirmedPayments = payments.filter((p) => p.status === '확인완료');

  const handleConfirmPayment = async (pay: PaymentRecord) => {
    if (!pay.id) return;
    try {
      await updatePayment(pay.id, { status: '확인완료' });
      if (pay.matchedSubscriberId) {
        await updateSubscriber(pay.matchedSubscriberId, {
          paymentStatus: '확인완료',
          status: '정상'
        });
      }
    } catch (err) {
      console.error('Failed to confirm payment:', err);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.depositorName.trim()) return;

    setIsSubmitting(true);
    try {
      const parsedAmount = parseInt(addForm.amount.replace(/[^0-9]/g, ''), 10) || 40000;
      await addPayment({
        depositorName: addForm.depositorName.trim(),
        amount: parsedAmount,
        depositDate: addForm.depositDate || new Date().toISOString().split('T')[0],
        memo: addForm.memo.trim() || undefined,
        status: addForm.status
      });

      setIsAddModalOpen(false);
      setAddForm({
        depositorName: '',
        amount: '40000',
        depositDate: new Date().toISOString().split('T')[0],
        memo: '',
        status: '미확인'
      });
    } catch (err) {
      console.error('Failed to add payment record:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (pay: PaymentRecord) => {
    setEditingPayment(pay);
    setEditForm({
      depositorName: pay.depositorName,
      amount: String(pay.amount || 40000),
      depositDate: pay.depositDate || new Date().toISOString().split('T')[0],
      memo: pay.memo || '',
      status: (pay.status as any) || '미확인'
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment?.id || !editForm.depositorName.trim()) return;

    setIsEditing(true);
    try {
      const parsedAmount = parseInt(editForm.amount.replace(/[^0-9]/g, ''), 10) || 40000;
      await updatePayment(editingPayment.id, {
        depositorName: editForm.depositorName.trim(),
        amount: parsedAmount,
        depositDate: editForm.depositDate,
        memo: editForm.memo.trim() || undefined,
        status: editForm.status
      });

      setEditingPayment(null);
    } catch (err) {
      console.error('Failed to update payment record:', err);
    } finally {
      setIsEditing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!paymentToDelete?.id) return;
    try {
      await deletePayment(paymentToDelete.id);
      setPaymentToDelete(null);
    } catch (err) {
      console.error('Failed to delete payment record:', err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden mb-8">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 bg-indigo-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              무통장 입금 내역 관리
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-full">
              {unconfirmedPayments.length}건 미확인
            </span>
          </div>
          <p className="text-xs text-slate-500">
            &lt;신문과방송&gt; 정기구독료 입금 내역을 등록 및 수정하고 승인 처리합니다 (기본 입금액: 40,000원).
          </p>
        </div>

        <div>
          {!isReadOnly ? (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>입금 내역 등록</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 text-xs rounded-xl font-bold">
              <Lock className="w-3.5 h-3.5 text-indigo-500" />
              <span>조회 전용</span>
            </div>
          )}
        </div>
      </div>

      {/* Unconfirmed Section */}
      <div className="p-5 bg-amber-50/40 border-b border-amber-100">
        <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-3">
          <Clock className="w-4 h-4 text-amber-600" />
          <span>입금 미확인 대기목록 ({unconfirmedPayments.length}건)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {unconfirmedPayments.length === 0 ? (
            <div className="col-span-2 p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">미확인 입금 내역이 없습니다.</p>
              <p className="text-xs text-slate-400 mt-1">
                신규 입금 건이 들어오면 [+ 입금 내역 등록] 버튼으로 추가해 주세요.
              </p>
            </div>
          ) : (
            unconfirmedPayments.map((pay) => (
              <div
                key={pay.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between gap-3 hover:border-indigo-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-extrabold text-slate-900">
                      {pay.depositorName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-extrabold text-indigo-700 font-mono mr-1">
                        {pay.amount.toLocaleString()}원
                      </span>
                      {!isReadOnly && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(pay)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="입금 내역 수정"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPaymentToDelete(pay)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="입금 내역 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span>입금일자: {pay.depositDate}</span>
                    </div>
                    {pay.memo && (
                      <div className="text-slate-600 font-medium bg-slate-50 p-1.5 rounded border border-slate-100">
                        메모: {pay.memo}
                      </div>
                    )}
                  </div>
                </div>

                {!isReadOnly ? (
                  <button
                    onClick={() => handleConfirmPayment(pay)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>입금 확인 완료 처리</span>
                  </button>
                ) : (
                  <div className="w-full py-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>입금 확인 대기중 (조회 전용)</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirmed Payments History */}
      <div className="p-5">
        <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>입금 확인 완료 내역 ({confirmedPayments.length}건)</span>
        </h3>

        {confirmedPayments.length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            확인 완료된 입금 내역이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {confirmedPayments.map((pay) => (
              <div key={pay.id} className="p-3.5 bg-slate-50/50 flex items-center justify-between text-xs text-slate-700 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    ✓
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">{pay.depositorName}</span>
                    <span className="text-slate-400 ml-2">({pay.depositDate})</span>
                    {pay.memo && <span className="text-slate-500 ml-2">[{pay.memo}]</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 mr-1">
                    {pay.amount.toLocaleString()}원
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                    확인완료
                  </span>
                  {!isReadOnly && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(pay)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="입금 내역 수정"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setPaymentToDelete(pay)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="기록 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <CreditCard className="w-4 h-4" />
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  신규 입금 내역 등록
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  입금자명 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.depositorName}
                  onChange={(e) => setAddForm({ ...addForm, depositorName: e.target.value })}
                  placeholder="예: 홍길동 또는 한국언론학회"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  입금 금액 (원) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  step="1000"
                  value={addForm.amount}
                  onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                  placeholder="40000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-xs"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  * 1년 정기구독 기본 금액: 40,000원
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">입금일자</label>
                  <input
                    type="date"
                    value={addForm.depositDate}
                    onChange={(e) => setAddForm({ ...addForm, depositDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">처리 상태</label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-xs cursor-pointer"
                  >
                    <option value="미확인">미확인 (대기)</option>
                    <option value="확인완료">확인완료</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">통장 적요 / 입금 메모</label>
                <input
                  type="text"
                  value={addForm.memo}
                  onChange={(e) => setAddForm({ ...addForm, memo: e.target.value })}
                  placeholder="예: 2026년도 신문과방송 1년 구독료"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  {isSubmitting ? '등록 중...' : '입금 내역 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Pencil className="w-4 h-4" />
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  입금 내역 수정
                </h3>
              </div>
              <button
                onClick={() => setEditingPayment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  입금자명 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.depositorName}
                  onChange={(e) => setEditForm({ ...editForm, depositorName: e.target.value })}
                  placeholder="예: 홍길동"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  입금 금액 (원) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  step="1000"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">입금일자</label>
                  <input
                    type="date"
                    value={editForm.depositDate}
                    onChange={(e) => setEditForm({ ...editForm, depositDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">처리 상태</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-xs cursor-pointer"
                  >
                    <option value="미확인">미확인 (대기)</option>
                    <option value="확인완료">확인완료</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">통장 적요 / 입금 메모</label>
                <input
                  type="text"
                  value={editForm.memo}
                  onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                  placeholder="예: 2026년도 신문과방송 1년 구독료"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEditing ? '저장 중...' : '수정사항 저장'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Payment Confirmation Modal */}
      {paymentToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mb-1.5">
              입금 내역 삭제 확인
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              <strong>{paymentToDelete.depositorName}</strong> ({paymentToDelete.amount.toLocaleString()}원)의 입금 내역을 삭제하시겠습니까?
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>삭제하기</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

