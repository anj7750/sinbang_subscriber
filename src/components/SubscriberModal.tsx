import React, { useState, useEffect } from 'react';
import { X, Check, Users, Building, MapPin, Phone, Mail, Calendar, FileText, UserCheck, ShieldAlert } from 'lucide-react';
import { Subscriber, SubscriberStatus, PaymentStatus, DeliveryStatus } from '../types';
import { addSubscriber, updateSubscriber } from '../services/firebaseService';

interface SubscriberModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriberToEdit?: Subscriber | null;
}

export const SubscriberModal: React.FC<SubscriberModalProps> = ({
  isOpen,
  onClose,
  subscriberToEdit
}) => {
  // 23 Fields State
  const [category, setCategory] = useState('기관/단체');
  const [shippingInfo, setShippingInfo] = useState('');
  const [copies, setCopies] = useState(1);
  const [codeNumber, setCodeNumber] = useState('');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [recipientInfo, setRecipientInfo] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryCode, setDeliveryCode] = useState('');
  const [deliveryCodeSubmission, setDeliveryCodeSubmission] = useState('');
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [accumulatedPeriod, setAccumulatedPeriod] = useState('');
  const [paymentHistory, setPaymentHistory] = useState('');
  const [status, setStatus] = useState<SubscriberStatus>('정상');
  const [etc, setEtc] = useState('');
  const [addedBy, setAddedBy] = useState('');
  const [memo, setMemo] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (subscriberToEdit) {
      setCategory(subscriberToEdit.category || subscriberToEdit.subscriptionType || '기관/단체');
      setShippingInfo(subscriberToEdit.shippingInfo || '');
      setCopies(subscriberToEdit.copies || 1);
      setCodeNumber(subscriberToEdit.codeNumber || '');
      setCompany(subscriberToEdit.company || subscriberToEdit.organization || '');
      setDepartment(subscriberToEdit.department || '');
      setName(subscriberToEdit.name || '');
      setPosition(subscriberToEdit.position || '');
      setRecipientInfo(subscriberToEdit.recipientInfo || '');
      setZipCode(subscriberToEdit.zipCode || '');
      setAddress(subscriberToEdit.address || '');
      setDeliveryCode(subscriberToEdit.deliveryCode || '');
      setDeliveryCodeSubmission(subscriberToEdit.deliveryCodeSubmission || '');
      setPhone(subscriberToEdit.phone || '');
      setMobile(subscriberToEdit.mobile || '');
      setEmail(subscriberToEdit.email || '');
      setStartDate(subscriberToEdit.startDate || '');
      setExpiryDate(subscriberToEdit.expiryDate || '');
      setAccumulatedPeriod(subscriberToEdit.accumulatedPeriod || '');
      setPaymentHistory(subscriberToEdit.paymentHistory || '');
      setStatus(subscriberToEdit.status || '정상');
      setEtc(subscriberToEdit.etc || '');
      setAddedBy(subscriberToEdit.addedBy || '');
      setMemo(subscriberToEdit.memo || subscriberToEdit.notes || '');
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      const nextYearStr = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

      setCategory('기관/단체');
      setShippingInfo('우체국DM');
      setCopies(1);
      setCodeNumber('');
      setCompany('');
      setDepartment('');
      setName('');
      setPosition('');
      setRecipientInfo('');
      setZipCode('04519');
      setAddress('');
      setDeliveryCode('');
      setDeliveryCodeSubmission('');
      setPhone('');
      setMobile('');
      setEmail('');
      setStartDate(todayStr);
      setExpiryDate(nextYearStr);
      setAccumulatedPeriod('12개월');
      setPaymentHistory('');
      setStatus('정상');
      setEtc('');
      setAddedBy('관리자');
      setMemo('');
    }
  }, [subscriberToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() && !name.trim()) {
      alert('회사명(기관명) 또는 성명(독자명) 중 하나는 반드시 입력해야 합니다.');
      return;
    }
    if (!address.trim()) {
      alert('배송지 주소는 필수 입력 항목입니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      const cleanCompany = company.trim();
      const cleanName = name.trim();

      const payload: Omit<Subscriber, 'id'> = {
        category: category || '기관/단체',
        shippingInfo: shippingInfo.trim(),
        copies: Number(copies) || 1,
        codeNumber: codeNumber.trim(),
        company: cleanCompany,
        organization: cleanCompany,
        department: department.trim(),
        name: cleanName || cleanCompany,
        position: position.trim(),
        recipientInfo: recipientInfo.trim(),
        zipCode: zipCode.trim(),
        address: address.trim(),
        deliveryCode: deliveryCode.trim(),
        deliveryCodeSubmission: deliveryCodeSubmission.trim(),
        phone: phone.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        startDate: startDate || todayStr,
        expiryDate: expiryDate || '',
        accumulatedPeriod: accumulatedPeriod.trim(),
        paymentHistory: paymentHistory.trim(),
        status,
        etc: etc.trim(),
        addedBy: addedBy.trim() || '관리자',
        memo: memo.trim(),
        notes: memo.trim(),
        createdAt: subscriberToEdit?.createdAt || todayStr
      };

      if (subscriberToEdit && subscriberToEdit.id) {
        await updateSubscriber(subscriberToEdit.id, payload);
      } else {
        await addSubscriber(payload);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save subscriber:', err);
      const msg = err?.message || '알 수 없는 오류가 발생했습니다.';
      alert(`구독자 정보 저장에 실패했습니다.\n사유: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-slate-900">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {subscriberToEdit ? '구독자 정보 수정' : '신규 정기구독자 등록'}
              </h3>
              <p className="text-xs text-slate-400">
                정기구독자 상세 정보 관리 (&lt;신문과방송&gt; 정기구독 데이터베이스)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          
          {/* Section 1: Basic Identifiers */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <span>기본 식별 및 발송 정보</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  회사명(기관명) <span className="text-rose-500">*필수</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 한국언론진흥재단"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  성명 / 담당자
                </label>
                <input
                  type="text"
                  placeholder="예: 홍길동"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">구분</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="기관/단체">기관/단체</option>
                  <option value="개인">개인</option>
                  <option value="도서관">도서관</option>
                  <option value="증정">증정</option>
                  <option value="언론사">언론사</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">부서</label>
                <input
                  type="text"
                  placeholder="예: 미디어진흥팀"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">직책</label>
                <input
                  type="text"
                  placeholder="예: 팀장/선임"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">발송부수</label>
                <input
                  type="number"
                  min={1}
                  value={copies}
                  onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">코드번호</label>
                <input
                  type="text"
                  placeholder="KPF-001"
                  value={codeNumber}
                  onChange={(e) => setCodeNumber(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Shipping & Address */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>배송지 주소 및 집배 정보</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">우편번호</label>
                <input
                  type="text"
                  placeholder="04519"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  기본 주소 <span className="text-rose-500">*필수</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="서울특별시 중구 세종대로 124 프레스센터 12층"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">집배코드</label>
                <input
                  type="text"
                  placeholder="예: 3001"
                  value={deliveryCode}
                  onChange={(e) => setDeliveryCode(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">집배코드(제출용)</label>
                <input
                  type="text"
                  placeholder="예: 3001-제출"
                  value={deliveryCodeSubmission}
                  onChange={(e) => setDeliveryCodeSubmission(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">발송정보</label>
                <input
                  type="text"
                  placeholder="예: 우체국택배 / 일반우편"
                  value={shippingInfo}
                  onChange={(e) => setShippingInfo(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">수신</label>
                <input
                  type="text"
                  placeholder="예: 자선수신 / 담당자"
                  value={recipientInfo}
                  onChange={(e) => setRecipientInfo(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Contact & Dates & Status */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Phone className="w-4 h-4 text-indigo-600" />
              <span>연락처 및 구독 계약 상태</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">내선번호</label>
                <input
                  type="text"
                  placeholder="02-2000-7114"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">휴대전화</label>
                <input
                  type="text"
                  placeholder="010-0000-0000"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">전자우편</label>
                <input
                  type="email"
                  placeholder="example@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">구독 시작일</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">구독 만료일</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">구독기간(누적)</label>
                <input
                  type="text"
                  placeholder="예: 12개월"
                  value={accumulatedPeriod}
                  onChange={(e) => setAccumulatedPeriod(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  상태 (정상/만료/중단)
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SubscriberStatus)}
                  className="w-full px-3 py-1.5 text-xs bg-white border-2 border-indigo-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-indigo-950"
                >
                  <option value="정상">정상</option>
                  <option value="구독만료">구독만료</option>
                  <option value="구독중단">구독중단</option>
                  <option value="만료예정">만료예정</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">입금일_금액</label>
                <input
                  type="text"
                  placeholder="예: 2026-01-05_100000"
                  value={paymentHistory}
                  onChange={(e) => setPaymentHistory(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">기타</label>
                <input
                  type="text"
                  placeholder="특이사항 메모"
                  value={etc}
                  onChange={(e) => setEtc(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">추가자</label>
                <input
                  type="text"
                  placeholder="예: 김관리"
                  value={addedBy}
                  onChange={(e) => setAddedBy(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">비고</label>
              <textarea
                rows={2}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="비고 상세 내용"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !company.trim() || !address.trim()}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{subscriberToEdit ? '수정사항 저장' : '구독자 정보 저장'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
