import { Subscriber } from '../types';

/**
 * Normalizes an expiry or start date string to YYYY-MM format.
 * Rejects payment memos (e.g. "2021.08.07_40,000원(박소희)") and correctly parses date ranges.
 */
export function extractYearMonth(dateStr?: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();
  if (!clean || clean === '-' || clean === '미정' || clean === 'null' || clean === 'undefined') return null;

  // Reject payment history memos that contain money or deposit keywords
  if (
    clean.includes('원(') ||
    clean.includes('원 ') ||
    clean.endsWith('원') ||
    clean.includes('입금') ||
    clean.includes('환불') ||
    clean.includes('결제') ||
    clean.includes('통장') ||
    clean.includes('송금') ||
    clean.includes('납부')
  ) {
    return null;
  }

  // If it is a period range like "2022.08 ~ 2023.07" or "2025.09~2026.08", extract the END date
  if (clean.includes('~') || clean.includes(' - ')) {
    const parts = clean.split(/[~]|(?:\s+-\s+)/);
    if (parts.length >= 2) {
      const endPart = parts[parts.length - 1].trim();
      const endYm = extractYearMonth(endPart);
      if (endYm) return endYm;
    }
  }

  // 1. Match Korean format "2026년 8월", "2026년 08월", "2026년8월"
  const korMatch = clean.match(/(\d{4})\s*년\s*(\d{1,2})\s*월/);
  if (korMatch) {
    const year = korMatch[1];
    const month = korMatch[2].padStart(2, '0');
    return `${year}-${month}`;
  }

  // 2. Match 2-digit year Korean format "26년 8월", "26년8월"
  const shortKorMatch = clean.match(/^(\d{2})\s*년\s*(\d{1,2})\s*월/);
  if (shortKorMatch) {
    const year = `20${shortKorMatch[1]}`;
    const month = shortKorMatch[2].padStart(2, '0');
    return `${year}-${month}`;
  }

  // 3. Match 4-digit year followed by delimiter and month: 2026-08, 2026.08, 2026. 8, 2026/08, 2026_08
  const fullMatch = clean.match(/(\d{4})\s*[-./_]\s*(\d{1,2})/);
  if (fullMatch) {
    const year = fullMatch[1];
    const month = fullMatch[2].padStart(2, '0');
    const monthNum = parseInt(month, 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return `${year}-${month}`;
    }
  }

  // 4. Match compact 6 or 8 digits: 202608, 20260831
  const compactMatch = clean.match(/^(\d{4})(\d{2})(?:\d{2})?$/);
  if (compactMatch) {
    const monthNum = parseInt(compactMatch[2], 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return `${compactMatch[1]}-${compactMatch[2]}`;
    }
  }

  // 5. Match 2-digit year: 26.08, 26-08, 26/08, 26. 8
  const shortMatch = clean.match(/^(\d{2})\s*[-./_]\s*(\d{1,2})/);
  if (shortMatch) {
    const year = `20${shortMatch[1]}`;
    const month = shortMatch[2].padStart(2, '0');
    const monthNum = parseInt(month, 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return `${year}-${month}`;
    }
  }

  // 6. Check if string is parseable by JS Date (e.g. "Tue Dec 03 2024 23:59:08 GMT+0900")
  if (clean.includes('GMT') || clean.includes('T00:') || clean.includes('Z') || clean.includes('UTC')) {
    const parsedDate = new Date(clean);
    if (!isNaN(parsedDate.getTime())) {
      const y = parsedDate.getFullYear();
      const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    }
  }

  // 7. Fallback scan for any 4 digit year and 1-2 digit month in string
  const generalMatch = clean.match(/(20\d{2})[^\d]{1,3}(\d{1,2})/);
  if (generalMatch) {
    const monthNum = parseInt(generalMatch[2], 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return `${generalMatch[1]}-${generalMatch[2].padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Extracts month number (1~12) from date string or year-month string.
 * Examples: "2026.08", "2026년 8월", "8월", "2026-08-31", "2025.12" -> 8 or 12
 */
export function extractMonthNumber(dateStr?: string): number | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();
  if (!clean || clean === '-' || clean === '미정' || clean === 'null') return null;

  // Reject payment history memos
  if (
    clean.includes('원(') ||
    clean.includes('원 ') ||
    clean.endsWith('원') ||
    clean.includes('입금') ||
    clean.includes('환불') ||
    clean.includes('결제')
  ) {
    return null;
  }

  // If period range, extract from end date
  if (clean.includes('~') || clean.includes(' - ')) {
    const parts = clean.split(/[~]|(?:\s+-\s+)/);
    if (parts.length >= 2) {
      const endPart = parts[parts.length - 1].trim();
      const endM = extractMonthNumber(endPart);
      if (endM) return endM;
    }
  }

  // Check direct month notation like "8월", "08월"
  const directMatch = clean.match(/^(\d{1,2})\s*월$/);
  if (directMatch) {
    const m = parseInt(directMatch[1], 10);
    if (m >= 1 && m <= 12) return m;
  }

  // Check normalized year-month
  const ym = extractYearMonth(clean);
  if (ym) {
    const parts = ym.split('-');
    if (parts.length === 2) {
      const m = parseInt(parts[1], 10);
      if (m >= 1 && m <= 12) return m;
    }
  }

  // Fallback: search for month keyword in string
  const mMatch = clean.match(/(\d{1,2})\s*월/);
  if (mMatch) {
    const m = parseInt(mMatch[1], 10);
    if (m >= 1 && m <= 12) return m;
  }

  return null;
}

/**
 * Extracts 4-digit year from date string.
 */
export function extractYear(dateStr?: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const ym = extractYearMonth(dateStr);
  if (ym) return ym.split('-')[0];
  const match = dateStr.match(/(20\d{2})/);
  return match ? match[1] : null;
}

export const MONTHS_1_TO_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * Calculates current real-time Year-Month string (e.g. "2026-08", "2026-09", etc.) dynamically.
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function getCurrentMonthNumber(): number {
  return new Date().getMonth() + 1;
}

export function getCurrentIssueYearMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Dynamic current target issue year-month reference that updates as time flows.
 */
export const CURRENT_ISSUE_YEAR_MONTH = getCurrentIssueYearMonth();

/**
 * Checks if a subscriber is expiring in a specific month number (1~12) and optional year.
 * @param subscriber The subscriber object
 * @param monthNum Month number 1~12 or 'all'
 * @param yearFilter Year filter 'all' or '2026', '2025', etc.
 * @param scope 'DM리스트' (only active DM send recipients) | '구독만료' | '전체' (or boolean for backwards compat)
 */
export function isSubscriberExpiringInMonthNumber(
  subscriber: Subscriber,
  monthNum: number | 'all',
  yearFilter: string = 'all',
  scope: 'DM리스트' | '구독만료' | '전체' | boolean = 'DM리스트'
): boolean {
  const resolved = resolveSubscriberDisplayFields(subscriber);
  const status = (resolved.status || subscriber.status || '') as string;
  const expiryDate = resolved.expiryDate;

  const isDmRecipient = status !== '구독만료' && status !== '구독중단' && status !== '만료' && status !== '중단';

  if (typeof scope === 'boolean') {
    if (!scope && (status === '구독중단' || status === '구독만료')) {
      return false;
    }
  } else if (scope === 'DM리스트') {
    if (!isDmRecipient) {
      return false;
    }
  } else if (scope === '구독만료') {
    if (isDmRecipient) {
      return false;
    }
  }

  // When both month and year are 'all'
  if (monthNum === 'all' && yearFilter === 'all') {
    return status === '만료예정' || Boolean(expiryDate && expiryDate !== '-');
  }

  const subMonth = extractMonthNumber(expiryDate);
  const subYear = extractYear(expiryDate);

  // If status is explicitly '만료예정' and month matches current month (or all)
  const currentM = getCurrentMonthNumber();
  if (status === '만료예정' && (monthNum === 'all' || monthNum === currentM)) {
    if (yearFilter === 'all' || !subYear || subYear === yearFilter) {
      return true;
    }
  }

  if (monthNum !== 'all' && subMonth !== monthNum) {
    return false;
  }

  if (yearFilter !== 'all' && subYear && subYear !== yearFilter) {
    return false;
  }

  return Boolean(subMonth);
}

/**
 * Checks if a subscriber is expiring in a specific Year-Month (e.g. '2026-07', '2026-08', '2026-09').
 * @param subscriber The subscriber object
 * @param targetYearMonth The target Year-Month string (YYYY-MM), defaults dynamically to current issue month
 * @param includeAllStatuses If true, does not filter out '구독만료' or '구독중단' status
 */
export function isSubscriberExpiringInMonth(
  subscriber: Subscriber,
  targetYearMonth: string = getCurrentIssueYearMonth(),
  includeAllStatuses: boolean = false
): boolean {
  const resolved = resolveSubscriberDisplayFields(subscriber);
  const status = (resolved.status || subscriber.status || '') as string;
  if (!includeAllStatuses) {
    if (status === '구독중단' || status === '구독만료' || status === '만료' || status === '중단') {
      return false;
    }
  }

  const ym = extractYearMonth(resolved.expiryDate);
  if (ym === targetYearMonth) return true;

  // Fallback check if status is explicitly '만료예정' and we are checking current issue
  if (resolved.status === '만료예정' && targetYearMonth === getCurrentIssueYearMonth()) {
    return true;
  }

  return false;
}

/**
 * Formats YearMonth "2026-08" to Korean label "2026년 8월"
 */
export function formatYearMonthKorean(ym: string): string {
  if (!ym || ym === 'all') return '전체';
  const parts = ym.split('-');
  if (parts.length === 2) {
    const y = parts[0];
    const m = parseInt(parts[1], 10);
    return `${y}년 ${m}월`;
  }
  return ym;
}

/**
 * Gets a sorted list of unique expiry year-months present in subscribers
 */
export function getUniqueExpiryYearMonths(subscribers: Subscriber[]): string[] {
  const ymSet = new Set<string>();
  const currentY = getCurrentYear();
  
  // Baseline key months around current year & next year
  for (let y = currentY - 1; y <= currentY + 1; y++) {
    for (let m = 1; m <= 12; m++) {
      ymSet.add(`${y}-${String(m).padStart(2, '0')}`);
    }
  }

  subscribers.forEach((s) => {
    const ym = extractYearMonth(s.expiryDate);
    if (ym) {
      ymSet.add(ym);
    }
  });

  return Array.from(ymSet).sort();
}

/**
 * Comprehensive multi-field search matcher across all 23 fields + date queries.
 */
export function matchesComprehensiveSearch(sub: Subscriber, rawTerm: string): boolean {
  if (!rawTerm || !rawTerm.trim()) return true;

  const term = rawTerm.trim().toLowerCase();
  const termNoSpace = term.replace(/[\s\-_.,/]/g, '');

  // 1. Check if search term is a date query like "2026년 7월", "2026-07", "2026.07", "7월", "2026년", "2026"
  const searchYm = extractYearMonth(term);
  const subExpiryYm = extractYearMonth(sub.expiryDate);
  const subStartYm = extractYearMonth(sub.startDate);

  if (searchYm) {
    if (subExpiryYm === searchYm || subStartYm === searchYm) {
      return true;
    }
  }

  // Check specific month keywords like "7월", "8월", "9월", "10월", "11월", "12월", "1월", "2월", "3월"
  const monthMatch = term.match(/^(\d{1,2})\s*월$/);
  if (monthMatch) {
    const mNum = monthMatch[1].padStart(2, '0');
    if (subExpiryYm && subExpiryYm.endsWith(`-${mNum}`)) return true;
    if (subStartYm && subStartYm.endsWith(`-${mNum}`)) return true;
  }

  // Year queries like "2026", "2027", "2025"
  if (/^20\d{2}$/.test(term)) {
    if (subExpiryYm && subExpiryYm.startsWith(term)) return true;
    if (subStartYm && subStartYm.startsWith(term)) return true;
  }

  // 2. Comprehensive check of all string fields in Subscriber
  const fieldsToCheck = [
    sub.name || '',
    sub.company || sub.organization || '',
    sub.address || '',
    sub.department || '',
    sub.position || '',
    sub.phone || '',
    sub.mobile || '',
    sub.email || '',
    sub.codeNumber || '',
    sub.category || sub.subscriptionType || '',
    sub.shippingInfo || '',
    sub.recipientInfo || '',
    sub.zipCode || '',
    sub.deliveryCode || '',
    sub.deliveryCodeSubmission || '',
    sub.startDate || '',
    sub.expiryDate || '',
    sub.accumulatedPeriod || '',
    sub.paymentHistory || '',
    sub.status || '',
    sub.etc || '',
    sub.addedBy || '',
    sub.memo || sub.notes || '',
    String(sub.copies || '')
  ];

  for (const field of fieldsToCheck) {
    if (!field) continue;
    const fLower = field.toLowerCase();
    if (fLower.includes(term)) return true;

    // Also check space-stripped match
    const fNoSpace = fLower.replace(/[\s\-_.,/]/g, '');
    if (fNoSpace.includes(termNoSpace)) return true;
  }

  return false;
}

/**
 * Normalizes and resolves all subscriber fields so that if data columns were shifted or
 * placed in unexpected properties (e.g. zip in name, address in category, payment in company),
 * it correctly extracts and returns cleanly separated fields for table display and management.
 */
export interface ResolvedSubscriberFields {
  category: string;
  shippingInfo: string;
  copies: number;
  codeNumber: string;
  company: string;
  department: string;
  name: string;
  position: string;
  recipientInfo: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  deliveryCode: string;
  deliveryCodeSubmission: string;
  phone: string;
  mobile: string;
  contact: string;
  email: string;
  startDate: string;
  expiryDate: string;
  accumulatedPeriod: string;
  paymentHistory: string;
  status: Subscriber['status'];
  notes: string;
  isCleanCompany: boolean;
  hasName: boolean;
}

export function resolveSubscriberDisplayFields(sub: Subscriber): ResolvedSubscriberFields {
  let category = (sub.category || sub.subscriptionType || '정기구독').trim();
  let shippingInfo = (sub.shippingInfo || '').trim();
  let copies = sub.copies || 1;
  let codeNumber = (sub.codeNumber || '').trim();
  let company = (sub.company || sub.organization || '').trim();
  let department = (sub.department || '').trim();
  let name = (sub.name || '').trim();
  let position = (sub.position || '').trim();
  let recipientInfo = (sub.recipientInfo || '').trim();
  let zipCode = (sub.zipCode || '').trim();
  let address = (sub.address || '').trim();
  let detailAddress = (sub.detailAddress || '').trim();
  let deliveryCode = (sub.deliveryCode || '').trim();
  let deliveryCodeSubmission = (sub.deliveryCodeSubmission || '').trim();
  let phone = (sub.phone || '').trim();
  let mobile = (sub.mobile || '').trim();
  let email = (sub.email || '').trim();
  let startDate = (sub.startDate || '').trim();
  let expiryDate = (sub.expiryDate || '').trim();
  let accumulatedPeriod = (sub.accumulatedPeriod || '').trim();
  let paymentHistory = (sub.paymentHistory || '').trim();
  let status = sub.status || '정상';
  let notes = (sub.notes || sub.memo || sub.etc || '').trim();

  // Pattern checks
  const addrRegex = /(시|군|구|읍|면|동|리|로|길|대로|가|아파트|빌딩|호|층|번지|동호수)\b/;
  const hasAddrKeyword = (s: string) => addrRegex.test(s) && (s.includes('도 ') || s.includes('시 ') || s.includes('구 ') || s.includes('로 ') || s.includes('길 '));

  // 1. Check if category is actually an email address (e.g. "ena@sogang.ac.kr")
  if (category.includes('@') && category.includes('.')) {
    if (!email) email = category;
    category = '정기구독';
  }

  // 2. Check if category is a date or request memo (e.g. "2019.04.18_구독만료문자 전송", "2018.08.30_정기구독신청")
  if (/^\d{4}[.\-_/]\d{1,2}[.\-_/]\d{1,2}/.test(category) || category.includes('구독만료문자') || category.includes('정기구독신청') || category.includes('신청')) {
    if (!notes) notes = category;
    else if (!notes.includes(category)) notes = `${category} | ${notes}`;
    category = '정기구독';
  }

  // 3. Check if category contains cancellation note (e.g. "구독중단요청(2011.3.4) 박혜미님")
  if (category.includes('구독중단') || category.includes('중단요청') || category.includes('해지요청')) {
    if (!notes) notes = category;
    else if (!notes.includes(category)) notes = `${category} | ${notes}`;
    status = '구독중단';
    const nameMatch = category.match(/([가-힣]{2,4})\s*님/);
    if (nameMatch && (!name || name === '구독자')) {
      name = nameMatch[1];
    }
    category = '정기구독';
  }

  // 4. Check if category is an organization / evaluation team (e.g. "기관장평가단")
  if (category === '기관장평가단' || category.includes('평가단')) {
    if (!company) company = category;
    category = '기관/단체';
  }

  // 5. Check if category is a phone number
  if (/^01[0-9]-?\d{3,4}-?\d{4}$/.test(category) || /^0[2-6][0-9]?-?\d{3,4}-?\d{4}$/.test(category)) {
    if (!mobile && !phone) mobile = category;
    category = '정기구독';
  }

  // 6. Check if category is actually an address
  if (hasAddrKeyword(category)) {
    if (!address || address === '주소 미기재') {
      address = category;
    }
    category = '정기구독';
  }

  // 2. Check if name is actually a zip code (e.g. "441-708", "03722")
  if (/^\d{3}-\d{3}$/.test(name) || /^\d{5}$/.test(name)) {
    if (!zipCode) zipCode = name;
    name = '';
  }

  // 3. Check if company is actually a zip code
  if (/^\d{3}-\d{3}$/.test(company) || /^\d{5}$/.test(company)) {
    if (!zipCode) zipCode = company;
    company = '';
  }

  // 4. Check if name is actually an address
  if (hasAddrKeyword(name) && name.length > 10) {
    if (!address || address === '주소 미기재') address = name;
    name = '';
  }

  // 5. Check if company is actually an address
  if (hasAddrKeyword(company) && company.length > 10 && !company.includes('(주)') && !company.includes('회사') && !company.includes('연구원')) {
    if (!address || address === '주소 미기재') address = company;
    company = '';
  }

  // 6. Check if category is memo / subscriber type like "2016년 자료회원", "2013.12_(...)", "필자(2020.8.)"
  if (category.includes('자료회원')) {
    if (!accumulatedPeriod && category.includes('년')) {
      accumulatedPeriod = category;
    }
    category = '자료회원';
  } else if (category.startsWith('필자')) {
    const memoMatch = category.match(/\((.+)\)/);
    if (memoMatch) {
      notes = memoMatch[1] + (notes ? ' | ' + notes : '');
    }
    category = '필자';
  }

  // 7. Check if company is generic category name
  if (['정기구독', '자료회원', '기증', '개인', '법인', '일반독자', '-'].includes(company)) {
    if (!category || category === '정기구독') category = company;
    company = '';
  }

  // 8. Check if company or name contains payment info (e.g. "2021.08.07_40,000원(박소희) 2022.07.31_40,000원(박소희)")
  if (company.includes('원(') || company.includes('원 ') || /\d{2,4}\.\d{2}\.\d{2}/.test(company) || company.includes('입금')) {
    if (!paymentHistory) paymentHistory = company;
    else if (!paymentHistory.includes(company)) paymentHistory = `${company} | ${paymentHistory}`;
    
    // Extract actual name from (이름) if name is missing or corrupted
    const nameInParen = company.match(/\(([^)]+)\)/);
    if (nameInParen && (!name || name === '구독자' || name === '개인독자' || name.includes('원'))) {
      name = nameInParen[1].replace(/[^가-힣a-zA-Z]/g, '').trim();
    }
    company = '';
  }

  if (name.includes('원(') || name.includes('원 ') || name.includes('입금') || /\d{2,4}\.\d{2}\.\d{2}/.test(name)) {
    if (!paymentHistory) paymentHistory = name;
    else if (!paymentHistory.includes(name)) paymentHistory = `${name} | ${paymentHistory}`;
    
    const nameInParen = name.match(/\(([^)]+)\)/);
    if (nameInParen) {
      name = nameInParen[1].replace(/[^가-힣a-zA-Z]/g, '').trim();
    } else {
      name = '';
    }
  }

  // 9. Check if expiryDate contains payment history or non-date memos
  if (expiryDate.includes('원(') || expiryDate.includes('원 ') || expiryDate.includes('입금') || expiryDate.includes('안내') || expiryDate.includes('문자')) {
    if (!paymentHistory && expiryDate.includes('원')) {
      paymentHistory = expiryDate;
    } else if (!notes.includes(expiryDate)) {
      notes = notes ? `${expiryDate} | ${notes}` : expiryDate;
    }
    expiryDate = '';
  }

  // Fallback: If expiryDate is empty but accumulatedPeriod exists (e.g. "2022.08 ~ 2023.07" or "2025.09~2026.08")
  if (!expiryDate && accumulatedPeriod) {
    const ym = extractYearMonth(accumulatedPeriod);
    if (ym) {
      const parts = ym.split('-');
      expiryDate = `${parts[0]}년 ${parseInt(parts[1], 10)}월`;
    }
  }

  // 10. Check if address is actually a memo/deposit log (e.g. "2021.8.10_입금확인 및 구독안내 2022.06.29_구독만료안내")
  if (address.includes('입금확인') || address.includes('구독안내') || address.includes('만료안내') || address.includes('입금요청')) {
    if (!hasAddrKeyword(address) && !/^\d{5}/.test(zipCode) && address.length < 100) {
      if (!notes) notes = address;
      else if (!notes.includes(address)) notes = `${address} | ${notes}`;
      address = '주소 미기재 (만료 독자)';
      if (status === '정상') {
        status = '구독만료';
      }
    }
  }

  // 11. If expiry date is in the past (e.g. 2021, 2022, 2023), ensure status defaults to '구독만료' if currently '정상'
  const expYm = extractYearMonth(expiryDate);
  if (expYm && status === '정상') {
    const expYear = parseInt(expYm.split('-')[0], 10);
    const currYear = getCurrentYear();
    if (expYear < currYear) {
      status = '구독만료';
    }
  }

  // 12. If name has (position) like "홍길동 (과장)"
  if (name.includes('(') && name.includes(')')) {
    const m = name.match(/^([^(]+)\s*\(([^)]+)\)$/);
    if (m) {
      name = m[1].trim();
      if (!position) position = m[2].trim();
    }
  }

  // 10. Contact resolution
  const contact = mobile || phone || '';

  const isCleanCompany = Boolean(
    company &&
    company !== '-' &&
    company !== '일반독자' &&
    company !== '개인 독자 (소속 없음)' &&
    company !== '정기구독' &&
    company !== '자료회원' &&
    company !== '기증'
  );

  const hasName = Boolean(name && name !== '-' && name !== '구독자' && name !== '담당자 미지정');

  return {
    category: category || '정기구독',
    shippingInfo,
    copies: copies || 1,
    codeNumber,
    company,
    department,
    name: name || sub.name || (company ? '' : '개인독자'),
    position,
    recipientInfo,
    zipCode,
    address,
    detailAddress,
    deliveryCode,
    deliveryCodeSubmission,
    phone,
    mobile,
    contact,
    email,
    startDate,
    expiryDate,
    accumulatedPeriod,
    paymentHistory,
    status,
    notes,
    isCleanCompany,
    hasName
  };
}

/**
 * Checks if shipping info indicates registered or overseas delivery (등기 or 해외).
 */
export function isRegisteredOrOverseas(shippingInfo?: string): boolean {
  if (!shippingInfo) return false;
  const clean = shippingInfo.trim();
  return clean.includes('등기') || clean.includes('해외') || clean.includes('우등');
}

/**
 * Checks if copies count is multi-copies (2부 이상).
 */
export function isMultiCopies(copies?: number | string): boolean {
  if (!copies) return false;
  const num = typeof copies === 'number' ? copies : parseInt(String(copies).replace(/[^\d]/g, ''), 10);
  return !isNaN(num) && num >= 2;
}

/**
 * Calculates issue volume number (통권 호수) for a given year and month.
 * Base: 2026-09 is 통권 669호.
 */
export function getIssueVolumeNumber(year: number, month: number): number {
  return 669 + (year - 2026) * 12 + (month - 9);
}

/**
 * Returns formatted issue string like "2026년 9월호(통권 669호)".
 */
export function formatIssueWithVolume(dateStr?: string): string {
  if (!dateStr || dateStr === '-' || dateStr === '미정') return '-';
  const ym = extractYearMonth(dateStr);
  if (!ym) return '-';
  const [yearStr, monthStr] = ym.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const volume = getIssueVolumeNumber(year, month);
  return `${year}년 ${month}월호(통권 ${volume}호)`;
}

/**
 * Returns compact issue representation for space-saving table rendering.
 * e.g. "26년 9월 (669호)"
 */
export function formatIssueCompact(dateStr?: string): { main: string; vol: string; text: string } {
  if (!dateStr || dateStr === '-' || dateStr === '미정') {
    return { main: '-', vol: '', text: '-' };
  }
  const ym = extractYearMonth(dateStr);
  if (!ym) return { main: dateStr, vol: '', text: dateStr };
  const [yearStr, monthStr] = ym.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const volume = getIssueVolumeNumber(year, month);
  const shortYear = yearStr.slice(-2);
  return {
    main: `${shortYear}년 ${month}월`,
    vol: `${volume}호`,
    text: `${shortYear}년 ${month}월 (${volume}호)`
  };
}

/**
 * Resolves both start issue and expiry issue with volume numbers.
 * Automatically computes expiry issue from start date (+11 months, so 10월 -> 다음해 9월)
 * or start issue from expiry date (-11 months) if one is missing.
 */
export function getSubscriberStartAndExpiryIssues(sub: Partial<Subscriber>): {
  startIssue: string;
  expiryIssue: string;
  startYearMonth: string | null;
  expiryYearMonth: string | null;
} {
  const resolved = resolveSubscriberDisplayFields(sub as Subscriber);
  let startYm = extractYearMonth(resolved.startDate || sub.startDate);
  let expiryYm = extractYearMonth(resolved.expiryDate || sub.expiryDate);

  // If expiryDate is missing but startDate exists (default 1-year / 12-issue subscription)
  if (!expiryYm && startYm) {
    const [sy, sm] = startYm.split('-').map(Number);
    // +11 months (e.g. 2025-10 -> 2026-09)
    const endMonthTotal = (sy * 12 + (sm - 1)) + 11;
    const ey = Math.floor(endMonthTotal / 12);
    const em = (endMonthTotal % 12) + 1;
    expiryYm = `${ey}-${String(em).padStart(2, '0')}`;
  }

  // If startDate is missing but expiryDate exists
  if (!startYm && expiryYm) {
    const [ey, em] = expiryYm.split('-').map(Number);
    // -11 months (e.g. 2026-09 -> 2025-10)
    const startMonthTotal = (ey * 12 + (em - 1)) - 11;
    const sy = Math.floor(startMonthTotal / 12);
    const sm = (startMonthTotal % 12) + 1;
    startYm = `${sy}-${String(sm).padStart(2, '0')}`;
  }

  const startIssue = startYm ? formatIssueWithVolume(startYm) : '-';
  const expiryIssue = expiryYm ? formatIssueWithVolume(expiryYm) : '-';

  return {
    startIssue,
    expiryIssue,
    startYearMonth: startYm,
    expiryYearMonth: expiryYm
  };
}

/**
 * Normalizes DM list subscriber category into standardized DM classification:
 * '정기구독' (유료 개인독자) | '기관/단체' (언론사/기업/공공기관) | '도서관' | '대학/연구소' | '관계기관' | '기증' | '기타'
 */
export function normalizeDmCategory(sub: Partial<Subscriber>): string {
  const cat = (sub.category || sub.subscriptionType || '').trim();
  const comp = (sub.company || sub.organization || '').trim();
  const notes = ((sub as any).notes || sub.etc || '').trim();

  // 1. Paid Regular Subscriber (유료 정기구독자)
  if (
    cat === '정기구독' ||
    cat === '유료' ||
    cat.includes('정기구독') ||
    cat.includes('자료회원')
  ) {
    if (!comp.includes('도서관') && !comp.includes('문화원') && !comp.includes('재단')) {
      return '정기구독';
    }
  }

  // 2. Library (도서관)
  if (cat.includes('도서관') || comp.includes('도서관')) {
    return '도서관';
  }

  // 3. University / Academic Research (대학 / 연구소)
  if (
    cat.includes('대학') ||
    cat.includes('연구소') ||
    cat.includes('학술') ||
    comp.includes('대학교') ||
    comp.includes('연구원') ||
    comp.includes('학과')
  ) {
    return '대학/연구소';
  }

  // 4. Partner Agencies / Evaluation / Committees / Cultural Centers (관계기관 / 문화원 / 위원회)
  if (
    cat.includes('관계기관') ||
    cat.includes('언론재단') ||
    cat.includes('위원') ||
    cat.includes('경평') ||
    cat.includes('기획') ||
    cat.includes('국외') ||
    cat.includes('해외') ||
    comp.includes('문화원') ||
    comp.includes('한국언론진흥재단') ||
    comp.includes('지사') ||
    comp.includes('국회') ||
    comp.includes('위원회') ||
    comp.includes('정부') ||
    comp.includes('청사') ||
    comp.includes('대통령실')
  ) {
    return '관계기관';
  }

  // 5. Media / Corporate Organizations (기관 / 단체 / 언론사)
  if (
    cat.includes('기관') ||
    cat.includes('단체') ||
    cat.includes('언론사') ||
    comp.includes('신문') ||
    comp.includes('방송') ||
    comp.includes('뉴스') ||
    comp.includes('일보') ||
    comp.includes('통신') ||
    comp.includes('(주)') ||
    comp.includes('공사') ||
    comp.includes('기업')
  ) {
    return '기관/단체';
  }

  // 6. Gifts / CS / Promotional / Author (기증 / 증정 / 필자 / CS)
  if (
    cat.includes('기증') ||
    cat.includes('증정') ||
    cat.includes('판촉') ||
    cat.includes('필자') ||
    cat.includes('CS') ||
    cat.includes('고객') ||
    cat.includes('광고') ||
    cat.includes('이벤트') ||
    notes.includes('기증') ||
    notes.includes('필자')
  ) {
    return '기증';
  }

  return '기증';
}

/**
 * Checks if a subscriber is an active paid regular subscriber (~42명).
 */
export function isRegularPaidSubscriber(sub: Partial<Subscriber>): boolean {
  const norm = normalizeDmCategory(sub);
  return norm === '정기구독';
}

export interface DDayResult {
  text: string;
  days: number;
  badgeClass: string;
  isUrgent: boolean;
  isExpired: boolean;
}

/**
 * Calculates D-Day for subscriber expiry date.
 */
export function calculateSubscriberDDay(expiryDateStr?: string): DDayResult {
  if (!expiryDateStr) {
    return {
      text: '-',
      days: 9999,
      badgeClass: 'bg-slate-100 text-slate-500',
      isUrgent: false,
      isExpired: false
    };
  }

  const ym = extractYearMonth(expiryDateStr);
  if (!ym) {
    return {
      text: '-',
      days: 9999,
      badgeClass: 'bg-slate-100 text-slate-500',
      isUrgent: false,
      isExpired: false
    };
  }

  const [yearStr, monthStr] = ym.split('-');
  const expYear = parseInt(yearStr, 10);
  const expMonth = parseInt(monthStr, 10);

  // Target date is the 1st of the expiry month
  const targetDate = new Date(expYear, expMonth - 1, 1);
  
  // Base reference date (today or 2026-08-31 for 2026 magazine cycle context)
  const now = new Date();
  const refDate = now.getFullYear() >= 2026 ? now : new Date(2026, 7, 31);
  
  const diffTime = targetDate.getTime() - refDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: `만료`,
      days: diffDays,
      badgeClass: 'bg-slate-200 text-slate-700 font-bold',
      isUrgent: false,
      isExpired: true
    };
  } else if (diffDays <= 7) {
    return {
      text: diffDays === 0 ? 'D-Day' : `D-${diffDays}`,
      days: diffDays,
      badgeClass: 'bg-rose-50 text-rose-700 border border-rose-300 font-extrabold shadow-2xs',
      isUrgent: true,
      isExpired: false
    };
  } else {
    // D-7일 초과(여유 있는 독자)는 D-Day 배지 표시하지 않고 생략
    return {
      text: '',
      days: diffDays,
      badgeClass: '',
      isUrgent: false,
      isExpired: false
    };
  }
}

/**
 * Standard 24-column header format requested by the user:
 * 구분,발송정보,인원,부수,코드번호,회사명,부서,성명,직책,수신,우편번호,주소,내선번호,휴대전화,전자우편,구독시작월(현행),구독만료월,구독기간(누적),입금일_금액(누적),기타,상대처 담당자명,추가자,고객유형,구독중단사유
 */
export const STANDARD_EXCEL_COLUMNS = [
  '구분',
  '발송정보',
  '인원',
  '부수',
  '코드번호',
  '회사명',
  '부서',
  '성명',
  '직책',
  '수신',
  '우편번호',
  '주소',
  '내선번호',
  '휴대전화',
  '전자우편',
  '구독시작월(현행)',
  '구독만료월',
  '구독기간(누적)',
  '입금일_금액(누적)',
  '기타',
  '상대처 담당자명',
  '추가자',
  '고객유형',
  '구독중단사유'
];

/**
 * Transforms a Subscriber object into a row matching the exact 24-column standard format.
 */
export function subscriberToStandardRow(s: Subscriber): (string | number)[] {
  const resolved = resolveSubscriberDisplayFields(s);
  
  // 1. 구분
  const category = s.category || resolved.category || '정기구독';
  // 2. 발송정보
  const shippingInfo = s.shippingInfo || resolved.shippingInfo || '통합';
  // 3. 인원
  const persons = s.persons !== undefined && s.persons !== null && s.persons !== '' ? s.persons : 1;
  // 4. 부수
  const copies = s.copies || resolved.copies || 1;
  // 5. 코드번호
  const codeNumber = s.codeNumber || resolved.codeNumber || '';
  // 6. 회사명
  const company = s.company || s.organization || resolved.company || '';
  // 7. 부서
  const department = s.department || resolved.department || '';
  // 8. 성명
  const name = s.name || resolved.name || '';
  // 9. 직책
  const position = s.position || resolved.position || '';
  // 10. 수신
  const recipientInfo = s.recipientInfo || resolved.recipientInfo || '';
  // 11. 우편번호
  const zipCode = s.zipCode || resolved.zipCode || '';
  // 12. 주소
  const address = s.address || resolved.address || '';
  // 13. 내선번호
  const phone = s.phone || resolved.phone || '';
  // 14. 휴대전화
  const mobile = s.mobile || resolved.mobile || '';
  // 15. 전자우편
  const email = s.email || resolved.email || '';
  // 16. 구독시작월(현행)
  const startDate = s.startDate || resolved.startDate || '';
  // 17. 구독만료월
  const expiryDate = s.expiryDate || resolved.expiryDate || '';
  // 18. 구독기간(누적)
  const accumulatedPeriod = s.accumulatedPeriod || resolved.accumulatedPeriod || (startDate && expiryDate ? `${startDate}~${expiryDate}` : '');
  // 19. 입금일_금액(누적)
  const paymentHistory = s.paymentHistory || resolved.paymentHistory || '';
  // 20. 기타
  const etc = s.etc || s.notes || s.memo || resolved.notes || '';
  // 21. 상대처 담당자명
  const contactPerson = s.contactPerson || '';
  // 22. 추가자
  const addedBy = s.addedBy || '';
  // 23. 고객유형
  const customerType = s.customerType || s.subscriptionType || '';
  // 24. 구독중단사유
  const cancellationReason = s.cancellationReason || s.returnReason || (s.status === '구독중단' || s.status === '중단' ? (s.returnReason || '구독중단') : '');

  return [
    category,
    shippingInfo,
    persons,
    copies,
    codeNumber,
    company,
    department,
    name,
    position,
    recipientInfo,
    zipCode,
    address,
    phone,
    mobile,
    email,
    startDate,
    expiryDate,
    accumulatedPeriod,
    paymentHistory,
    etc,
    contactPerson,
    addedBy,
    customerType,
    cancellationReason
  ];
}


