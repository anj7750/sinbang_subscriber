export type PriorityLevel = '상' | '중' | '하';
export type TaskCategory = 'DM발송' | '반송처리' | '만료안내' | '입금확인' | '기타';

export interface TodoTask {
  id?: string;
  title: string;
  category: TaskCategory;
  dueDate: string;
  priority: PriorityLevel;
  completed: boolean;
  assignedTo?: string;
  createdAt: string;
}

export type SubscriberStatus = '정상' | '구독만료' | '구독중단' | '만료예정' | '만료' | '중단';
export type PaymentStatus = '확인완료' | '미확인' | '환불';
export type DeliveryStatus = '정상배송' | '반송대기' | '발송예정';

export interface Subscriber {
  id?: string;
  category?: string;          // 구분
  shippingInfo?: string;      // 발송정보
  persons?: number | string;  // 인원
  copies: number;             // 부수
  codeNumber?: string;        // 코드번호
  company?: string;           // 회사명 (선택)
  department?: string;        // 부서
  name: string;               // 성명
  position?: string;          // 직책
  recipientInfo?: string;      // 수신
  zipCode?: string;           // 우편번호
  address: string;            // 주소 (필수)
  deliveryCode?: string;      // 집배코드
  deliveryCodeSubmission?: string; // 집배코드(제출용)
  phone?: string;             // 내선번호
  mobile?: string;            // 휴대전화
  email?: string;             // 전자우편
  startDate?: string;         // 구독시작월(현행)
  expiryDate?: string;        // 구독만료월
  accumulatedPeriod?: string; // 구독기간(누적)
  paymentHistory?: string;    // 입금일_금액(누적)
  status: SubscriberStatus;   // 상태(정상/구독만료/구독중단)
  etc?: string;               // 기타
  contactPerson?: string;     // 상대처 담당자명
  addedBy?: string;           // 추가자
  customerType?: string;      // 고객유형
  cancellationReason?: string;// 구독중단사유
  memo?: string;              // 비고

  // Compatibility aliases
  organization?: string;      // 소속기관 (회사명 fallback)
  subscriptionType?: '개인' | '기관/단체' | '도서관' | '증정';
  detailAddress?: string;
  paymentStatus?: PaymentStatus;
  dmDeliveryStatus?: DeliveryStatus;
  returnReason?: string;
  createdAt?: string;
  notes?: string;             // 비고 alias
  isExpired?: boolean;
}

export type ReturnReason = '주소불명' | '이사불명' | '수취거절' | '수취인부재' | '폐문부재' | '폐업/수신처없음' | '기타';
export type ReturnStatus = '대기중' | '주소수정완료' | '재발송완료' | '구독해지';

export interface ReturnLog {
  id?: string;
  subscriberId?: string;
  subscriberName: string;
  organization?: string;
  zipCode: string;
  address: string;
  reason: ReturnReason;
  returnedAt: string;
  status: ReturnStatus;
  newAddress?: string;
  notes?: string;
  processedAt?: string;
}

export interface PaymentRecord {
  id?: string;
  depositorName: string;
  amount: number;
  bank?: string;
  depositDate: string;
  memo?: string;
  status: PaymentStatus;
  matchedSubscriberId?: string;
  matchedSubscriberName?: string;
}

export interface DashboardStats {
  totalSubscribers: number;
  expiringThisMonth: number;
  pendingReturns: number;
  unconfirmedPayments: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  isAdmin: boolean;
  isReadOnly?: boolean;
  createdAt: string;
}

export interface AllowedEmail {
  id?: string;
  email: string;
  addedAt: string;
  addedBy?: string;
}

