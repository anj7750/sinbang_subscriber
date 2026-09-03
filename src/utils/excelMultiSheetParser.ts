import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Subscriber, SubscriberStatus } from '../types';

export interface CsvErrorRow {
  rowNumber: number;
  company: string;
  address: string;
  reason: string;
}

export interface ParsedSheetResult {
  sheetName: string;
  rawData: any[][];
  headers: string[];
  totalRows: number;
  validRows: Omit<Subscriber, 'id'>[];
  errorRows: CsvErrorRow[];
  detectedStatus: SubscriberStatus;
  isSelected: boolean;
}

export interface ParsedWorkbookResult {
  fileName: string;
  isMultiSheet: boolean;
  sheetNames: string[];
  sheets: ParsedSheetResult[];
  totalValidCount: number;
  totalRowCount: number;
  totalErrorCount: number;
}

const PHONE_PATTERN = /(01[016789]-?\d{3,4}-?\d{4}|0[2-6][0-9]?-?\d{3,4}-?\d{4})/;
const EMAIL_PATTERN = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
const ZIP_PATTERN = /^\d{3}-?\d{3}$|^\d{5}$/;
const ADDRESS_PATTERN = /(서울|경기|인천|강원|충북|충남|전북|전남|경북|경남|제주|세종|광주|대구|대전|부산|울산|특별시|광역시|자치시|시|군|구|동|읍|면|길|로|아파트|빌라|APT|번지|층|호|Japan|USA|UK|China|Germany|France|Portugal)/i;

const POS_SUFFIXES = [
  '기금관리위원', '수석전문위원', '전문위원', '기획위원', '독자위원', '심의관', '조사관',
  '위원장님', '위원장', '부위원장님', '부위원장', '위원',
  '교수님', '교수', '의원님', '의원', '대표이사', '대표', '장관님실', '장관님', '차관님', '정책보좌관님', '정책보조관님',
  '부사장님', '부사장', '상무이사', '상무님', '상무', '전무이사', '전무님', '전무',
  '이사님', '이사', '국장님', '국장', '부국장', '부장님', '부장', '차장대우', '차장님', '차장',
  '과장님', '과장', '팀장님', '팀장', '실장님', '실장', '대리', '주임', '사원', '주무관', '사무관',
  '연구위원', '연구원', '수석연구원', '책임연구원', '선임연구원', '전문연구원',
  '변호사님', '변호사', '소장님', '소장', '원장님', '원장', '부원장님', '부원장',
  '기자', '특파원', 'PD', '에디터', '작가', '회백', '선생', '총장님', '총장', '일병'
];

export function cleanNameAndExtractPosition(raw: string, defaultPos: string = ''): { cleanName: string; extractedPosition: string } {
  let text = (raw || '')
    .replace(/\(정기구독\)/g, '')
    .replace(/\(자료회원\)/g, '')
    .replace(/\(기증\)/g, '')
    .replace(/\(도서관\)/g, '')
    .replace(/\(언론사\)/g, '')
    .replace(/\(언론단체\)/g, '')
    .replace(/님\s*귀하/g, '')
    .replace(/님께/g, '')
    .replace(/귀\s*중/g, '')
    .replace(/귀하/g, '')
    .trim();

  let extractedPosition = defaultPos;

  for (const pos of POS_SUFFIXES) {
    if (text.endsWith(pos) && text.length > pos.length) {
      if (!extractedPosition) extractedPosition = pos;
      text = text.slice(0, -pos.length).trim();
      break;
    }
  }

  return { cleanName: text.replace(/님$/g, '').trim(), extractedPosition };
}

export function extractFromPayment(text: string): { name: string; company: string; dept: string } {
  if (!text) return { name: '', company: '', dept: '' };
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const targetLine = lines[lines.length - 1] || text;
  let entity = '';

  const depositNameMatch = targetLine.match(/입금자명\s*[:：]?\s*([^)\n]+)/);
  if (depositNameMatch) {
    entity = depositNameMatch[1].trim();
  }

  if (!entity) {
    const match = targetLine.match(/(?:_|\d{1,3}(?:,\d{3})*원?|\s)\s*[\(（](.+?)[\)）]?(?:_|$)/);
    if (match) {
      entity = match[1].trim();
    } else {
      const generalMatch = targetLine.match(/[\(（](.+)[\)）]?$/);
      if (generalMatch) {
        entity = generalMatch[1].replace(/[\)）]$/, '').trim();
      }
    }
  }

  entity = entity.replace(/^[\(（]+/, '').replace(/[\)）]+$/, '').trim();
  if (entity.startsWith('주)')) entity = '(주)' + entity.slice(2);
  if (entity.startsWith('사)')) entity = '(사)' + entity.slice(2);

  let name = '';
  let company = '';
  let dept = '';

  if (!entity) return { name, company, dept };

  if (entity.includes(',')) {
    const parts = entity.split(',').map((p) => p.trim());
    name = parts[0];
    dept = parts.slice(1).join(' ');
  } else if (entity.includes('(') || entity.includes(')')) {
    const nested = entity.match(/(.+?)[\(（](.+?)[\)）]/);
    if (nested) {
      name = nested[1].trim();
      company = nested[2].trim();
    } else {
      company = entity;
    }
  } else {
    const isOrg = /(주|사단|재단|협회|학회|대학|학교|신문|방송|공사|센터|병원|의원|연구원|교회|서점|서림|출판|기획|미디어|홍보|클럽|네이버스|포유|총판|서적|관악공동체)/.test(entity);
    if (isOrg || entity.length > 5) {
      company = entity;
    } else {
      name = entity;
    }
  }
  return { name, company, dept };
}

// Auto-detect default status from sheet name
export function detectStatusFromSheetName(sheetName: string): SubscriberStatus {
  const norm = sheetName.toLowerCase().replace(/[\s_\-]/g, '');
  if (norm.includes('만료') || norm.includes('종료')) {
    return '구독만료';
  }
  if (norm.includes('중단') || norm.includes('해지') || norm.includes('취소') || norm.includes('탈퇴')) {
    return '구독중단';
  }
  if (norm.includes('만료예정') || norm.includes('이번달만료')) {
    return '만료예정';
  }
  return '정상';
}

// Parse a single raw 2D array sheet into structured Subscriber rows
export function parseSheetRows(
  sheetName: string,
  rawGrid: any[][],
  overrideStatus?: SubscriberStatus,
  overrideCategory?: string
): ParsedSheetResult {
  const defaultStatus = overrideStatus || detectStatusFromSheetName(sheetName);
  
  if (!rawGrid || rawGrid.length === 0) {
    return {
      sheetName,
      rawData: [],
      headers: [],
      totalRows: 0,
      validRows: [],
      errorRows: [],
      detectedStatus: defaultStatus,
      isSelected: true
    };
  }

  // 1. Trim trailing completely empty rows from the raw grid
  let lastNonEmptyRowIdx = rawGrid.length - 1;
  while (
    lastNonEmptyRowIdx >= 0 &&
    (!rawGrid[lastNonEmptyRowIdx] ||
     !Array.isArray(rawGrid[lastNonEmptyRowIdx]) ||
     rawGrid[lastNonEmptyRowIdx].every((cell) => cell === null || cell === undefined || String(cell).trim().length === 0))
  ) {
    lastNonEmptyRowIdx--;
  }
  const cleanGrid = lastNonEmptyRowIdx >= 0 ? rawGrid.slice(0, lastNonEmptyRowIdx + 1) : [];

  if (cleanGrid.length === 0) {
    return {
      sheetName,
      rawData: [],
      headers: [],
      totalRows: 0,
      validRows: [],
      errorRows: [],
      detectedStatus: defaultStatus,
      isSelected: true
    };
  }

  // Find header row (usually row 0, or row with recognizable headers)
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(3, cleanGrid.length); i++) {
    const row = cleanGrid[i] || [];
    const joined = row.map((c) => String(c || '')).join(' ');
    if (joined.includes('구분') || joined.includes('성명') || joined.includes('회사') || joined.includes('주소') || joined.includes('우편번호')) {
      headerRowIdx = i;
      break;
    }
  }

  const rawHeaders = (cleanGrid[headerRowIdx] || []).map((h) =>
    String(h || '').replace(/^["\uFEFF]+|["\uFEFF]+$/g, '').trim()
  );

  const normalizeStr = (s: string) => (s || '').replace(/[\s_\-\(\)\[\]\.\/]/g, '').toLowerCase();

  const isCancelledSheetFormat =
    rawHeaders.some((h) => normalizeStr(h).includes('구독중단사유') || normalizeStr(h).includes('중단사유')) ||
    defaultStatus === '구독중단';

  const isGenericHeaders = rawHeaders.every((h, idx) => !h || h.startsWith('col') || h === String(idx));
  const usePositionalFallback = isGenericHeaders && rawHeaders.length === 23;

  const getColIndex = (keywords: string[], defaultIndex?: number): number => {
    for (const kw of keywords) {
      const normKw = normalizeStr(kw);
      const idx = rawHeaders.findIndex((h) => normalizeStr(h) === normKw);
      if (idx !== -1) return idx;
    }
    for (const kw of keywords) {
      const normKw = normalizeStr(kw);
      if (normKw.length >= 2) {
        const idx = rawHeaders.findIndex((h) => normalizeStr(h).includes(normKw));
        if (idx !== -1) return idx;
      }
    }
    if (usePositionalFallback && defaultIndex !== undefined && defaultIndex < rawHeaders.length) {
      return defaultIndex;
    }
    return -1;
  };

  const idxCategory = getColIndex(['구분', '구독구분', '카테고리', '구독종류', '종류', 'category'], 0);
  const idxShippingInfo = getColIndex(['발송정보', '배송정보', '발송구분', '배송구분', 'shippingInfo'], 1);
  const idxPersons = getColIndex(['인원', '인원수', 'persons'], 2);
  const idxCopies = getColIndex(['부수', '발송부수', '수량', '부 수', 'copies'], 3);
  const idxCodeNumber = getColIndex(['코드번호', '구독코드', '고객코드', '회원번호', 'codeNumber'], 4);
  const idxCompany = getColIndex(['회사명', '기관명', '소속기관', '상호', '회사', '직장명', '기관', '소속', 'company', 'organization'], 5);
  const idxDepartment = getColIndex(['부서', '부서명', '소속부서', '과', '팀', 'department'], 6);
  const idxName = getColIndex(['성명', '이름', '구독자', '수취인', '고객명', '독자명', 'name'], 7);
  const idxPosition = getColIndex(['직책', '직급', '직위', '호칭', 'position'], 8);
  const idxRecipientInfo = getColIndex(['수신', '수신처', '수신인', '수신정보', 'recipientInfo'], 9);
  const idxZipCode = getColIndex(['우편번호', '우편 번호', '우편', 'zipCode', 'zip'], 10);
  const idxAddress = getColIndex(['주소', '기본주소', '배송지', '배송주소', '도로명주소', '상세주소', '배송지주소', 'address'], 11);
  const idxDeliveryCode = getColIndex(['집배코드', '집배 코드', '집배구역', 'deliveryCode'], -1);
  const idxDeliveryCodeSubmission = getColIndex(['집배코드(제출용)', '집배코드 제출용', '집배코드_제출용', '제출용집배코드', 'deliveryCodeSubmission'], -1);
  const idxPhone = getColIndex(['내선번호', '대표전화', '유선전화', '전화번호', 'phone', 'tel'], 12);
  const idxMobile = getColIndex(['휴대전화', '휴대 전화', '핸드폰', '휴대폰', 'mobile', 'hp'], 13);
  const idxEmail = getColIndex(['전자우편', '전자 우편', '이메일', 'email'], 14);
  const idxStartDate = getColIndex(['구독시작월(현행)', '구독시작월', '구독시작', '시작월', '시작일', '구독시작일', '구독개시', 'startDate'], 15);
  const idxExpiryDate = getColIndex(['구독만료월', '구독만료', '만료월', '만료일', '구독만료일', 'expiryDate'], 16);
  const idxAccumulatedPeriod = getColIndex(['구독기간(누적)', '구독기간', '누적기간', '누적구독기간', '구독누적', 'accumulatedPeriod'], 17);
  const idxPaymentHistory = getColIndex(['입금일_금액(누적)', '입금일_금액', '입금일금액', '입금내역', '결제내역', '입금일', '납부내역', 'paymentHistory'], 18);
  const idxStatus = getColIndex(['상태', '구독상태', 'status'], -1);
  const idxEtc = getColIndex(['기타', '기타사항', 'etc'], 19);
  const idxContactPerson = getColIndex(['상대처 담당자명', '상대처담당자명', '담당자명', '담당자', 'contactPerson'], 20);
  const idxAddedBy = getColIndex(['추가자', '등록자', '작성자', '입력자', '처리자', 'addedBy'], 21);
  const idxCustomerType = getColIndex(['고객유형', '고객 유형', '회원유형', 'customerType'], 22);
  const idxCancellationReason = getColIndex(['구독중단사유', '중단사유', '해지사유', '반송사유', 'cancellationReason'], 23);
  const idxMemo = getColIndex(['비고', '특이사항', '메모', 'memo', 'notes'], -1);

  const isExpiredSheetFormat = idxExpiryDate !== -1 && idxName === -1 && idxCompany === -1;

  // Data rows starting after header row
  const dataRows = cleanGrid.slice(headerRowIdx + 1);

  const validRows: Omit<Subscriber, 'id'>[] = [];
  const errorRows: CsvErrorRow[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < dataRows.length; i++) {
    const cols = dataRows[i] || [];
    const cleanCols = cols.map((c) => String(c ?? '').replace(/^["\uFEFF]+|["\uFEFF]+$/g, '').trim());

    // Skip completely blank/empty rows (e.g. formatted empty Excel rows)
    const hasAnyContent = cleanCols.some((c) => c.length > 0);
    if (!hasAnyContent) {
      continue;
    }

    // Skip section divider rows (e.g. "↓2015년 9월~", "↓2017년 3월")
    if (cleanCols[0]?.startsWith('↓') || cleanCols.every((c) => !c || c.startsWith('↓'))) {
      continue;
    }

    // Detect continuation rows (e.g. broken multiline memo/notes in CSV)
    const nonEmpties = cleanCols.filter((c) => c && c.trim().length > 0);
    const firstCol = (nonEmpties[0] || '').trim();
    if (
      nonEmpties.length <= 4 &&
      (/^\d{4}[\.\-\/]\d{1,2}/.test(firstCol) ||
        /^\d{2}[\.\-\/]\d{1,2}/.test(firstCol) ||
        firstCol.startsWith('요청자') ||
        firstCol.startsWith('내용') ||
        firstCol.startsWith('사유') ||
        firstCol.startsWith('자택') ||
        firstCol.startsWith('TEL') ||
        firstCol.startsWith('E-mail') ||
        firstCol.startsWith('반송') ||
        firstCol.startsWith('구독') ||
        firstCol.startsWith('입금') ||
        firstCol.startsWith('처리부탁'))
    ) {
      if (validRows.length > 0) {
        const lastSub = validRows[validRows.length - 1];
        const appendText = nonEmpties.join(' ');
        lastSub.etc = lastSub.etc ? `${lastSub.etc}\n${appendText}` : appendText;
        lastSub.notes = lastSub.notes ? `${lastSub.notes}\n${appendText}` : appendText;
      }
      continue;
    }

    let rawCategory = idxCategory !== -1 ? cleanCols[idxCategory] || '' : '';
    let rawShippingInfo = idxShippingInfo !== -1 ? cleanCols[idxShippingInfo] || '' : '';
    let rawPersons = idxPersons !== -1 ? cleanCols[idxPersons] || '' : '';
    let rawCopiesStr = idxCopies !== -1 ? cleanCols[idxCopies] || '' : '';
    let rawCodeNumber = idxCodeNumber !== -1 ? cleanCols[idxCodeNumber] || '' : '';
    let rawCompany = idxCompany !== -1 ? cleanCols[idxCompany] || '' : '';
    let rawDept = idxDepartment !== -1 ? cleanCols[idxDepartment] || '' : '';
    let rawName = idxName !== -1 ? cleanCols[idxName] || '' : '';
    let rawPosition = idxPosition !== -1 ? cleanCols[idxPosition] || '' : '';
    let rawRecipient = idxRecipientInfo !== -1 ? cleanCols[idxRecipientInfo] || '' : '';
    let rawZipCode = idxZipCode !== -1 ? cleanCols[idxZipCode] || '' : '';
    let rawAddress = idxAddress !== -1 ? cleanCols[idxAddress] || '' : '';
    let rawDeliveryCode = idxDeliveryCode !== -1 ? cleanCols[idxDeliveryCode] || '' : '';
    let rawDeliveryCodeSubmission = idxDeliveryCodeSubmission !== -1 ? cleanCols[idxDeliveryCodeSubmission] || '' : '';
    let rawPhone = idxPhone !== -1 ? cleanCols[idxPhone] || '' : '';
    let rawMobile = idxMobile !== -1 ? cleanCols[idxMobile] || '' : '';
    let rawEmail = idxEmail !== -1 ? cleanCols[idxEmail] || '' : '';
    let rawStartDate = idxStartDate !== -1 ? cleanCols[idxStartDate] || '' : '';
    let rawExpiryDate = idxExpiryDate !== -1 ? cleanCols[idxExpiryDate] || '' : '';
    let rawAccumulatedPeriod = idxAccumulatedPeriod !== -1 ? cleanCols[idxAccumulatedPeriod] || '' : '';
    let rawPaymentHistory = idxPaymentHistory !== -1 ? cleanCols[idxPaymentHistory] || '' : '';
    let rawStatus = idxStatus !== -1 ? cleanCols[idxStatus] || '' : '';
    let rawEtc = idxEtc !== -1 ? cleanCols[idxEtc] || '' : '';
    let rawContactPerson = idxContactPerson !== -1 ? cleanCols[idxContactPerson] || '' : '';
    let rawAddedBy = idxAddedBy !== -1 ? cleanCols[idxAddedBy] || '' : '';
    let rawCustomerType = idxCustomerType !== -1 ? cleanCols[idxCustomerType] || '' : '';
    let rawCancellationReason = idxCancellationReason !== -1 ? cleanCols[idxCancellationReason] || '' : '';
    let rawMemo = idxMemo !== -1 ? cleanCols[idxMemo] || '' : '';

    // Multi-format row level detection
    const isCol2Addr = Boolean(cleanCols[2] && ADDRESS_PATTERN.test(cleanCols[2]) && !cleanCols[2].includes('@') && cleanCols[2].length > 5);
    const isCol7Addr = Boolean(cleanCols[7] && ADDRESS_PATTERN.test(cleanCols[7]) && !cleanCols[7].includes('@') && cleanCols[7].length > 5);
    const isCol11Addr = Boolean(cleanCols[11] && ADDRESS_PATTERN.test(cleanCols[11]));
    const isCol01Num = (cleanCols[0] === '1' || cleanCols[0] === '0' || cleanCols[0] === '2') && /^\d+$/.test(cleanCols[1] || '');
    const isCol3Or4Addr = Boolean((cleanCols[3] && ADDRESS_PATTERN.test(cleanCols[3])) || (cleanCols[4] && ADDRESS_PATTERN.test(cleanCols[4])));

    if (isCol01Num && isCol3Or4Addr && !isCol11Addr) {
      // Middle format: 1, 1, 성명(구분), 구주소, 신주소, 우편번호, -, 구독기간, 입금일, 전화번호, 비고
      rawCopiesStr = cleanCols[1] || rawCopiesStr;
      rawName = cleanCols[2] || rawName;
      rawAddress = (cleanCols[4] && ADDRESS_PATTERN.test(cleanCols[4])) ? cleanCols[4] : cleanCols[3] || rawAddress;
      if (cleanCols[5] && (ZIP_PATTERN.test(cleanCols[5]) || /^\d{4,6}$/.test(cleanCols[5]))) {
        rawZipCode = cleanCols[5];
      }
      if (cleanCols[7] && (cleanCols[7].includes('~') || cleanCols[7].includes('.'))) {
        rawAccumulatedPeriod = cleanCols[7];
      }
      if (cleanCols[8] && (cleanCols[8].includes('원') || /\d{2,4}\.\d{2}/.test(cleanCols[8]))) {
        rawPaymentHistory = cleanCols[8];
      }
      if (cleanCols[9] && PHONE_PATTERN.test(cleanCols[9])) {
        const m = cleanCols[9].match(PHONE_PATTERN);
        if (m) rawMobile = m[0];
      }
      if (cleanCols[10]) {
        rawEtc = cleanCols[10];
      }
    } else if (isCol7Addr && cleanCols[2] && (cleanCols[2] === '개인' || cleanCols[2] === '법인') && !isCol11Addr) {
      // Research CS format: 1, 조사분석사업, 개인, 최세경, 010-6858-6658, email, 서울, 주소, 추가자
      rawCopiesStr = cleanCols[0] || rawCopiesStr;
      rawCategory = cleanCols[1] || rawCategory;
      rawName = cleanCols[3] || rawName;
      if (cleanCols[4] && PHONE_PATTERN.test(cleanCols[4])) rawMobile = cleanCols[4];
      if (cleanCols[5] && EMAIL_PATTERN.test(cleanCols[5])) rawEmail = cleanCols[5];
      rawAddress = cleanCols[7] || rawAddress;
      if (cleanCols[8]) rawAddedBy = cleanCols[8];
    } else if (isCol2Addr && !isCol11Addr) {
      // Legacy format: 구분, 성명, 주소, 우편번호, ..., 전화번호, 비고
      rawCategory = cleanCols[0] || rawCategory;
      rawName = cleanCols[1] || rawName;
      rawAddress = cleanCols[2];
      if (cleanCols[3] && (ZIP_PATTERN.test(cleanCols[3]) || /^\d{3}-\d{3}$/.test(cleanCols[3]))) {
        rawZipCode = cleanCols[3];
      } else if (cleanCols[3] && (cleanCols[3].includes('~') || cleanCols[3].includes('.'))) {
        rawAccumulatedPeriod = cleanCols[3];
      } else if (cleanCols[3]) {
        rawEtc = cleanCols[3];
      }
      for (let c = 4; c < cleanCols.length; c++) {
        const val = cleanCols[c];
        if (!val) continue;
        if (EMAIL_PATTERN.test(val) && !rawEmail) {
          const m = val.match(EMAIL_PATTERN);
          if (m) rawEmail = m[0];
        }
        if (PHONE_PATTERN.test(val) && !rawMobile && !rawPhone) {
          const m = val.match(PHONE_PATTERN);
          if (m) rawMobile = m[0];
        }
        if ((val.includes('원(') || /\d{2}\.\d{2}\.\d{2}/.test(val)) && !rawPaymentHistory) {
          rawPaymentHistory = val;
        }
      }
    } else if (isCol7Addr && !isCol11Addr) {
      rawCopiesStr = cleanCols[0] || rawCopiesStr;
      rawCategory = cleanCols[1] || rawCategory;
      rawName = cleanCols[3] || rawName;
      if (cleanCols[4] && PHONE_PATTERN.test(cleanCols[4])) rawMobile = cleanCols[4];
      if (cleanCols[5] && EMAIL_PATTERN.test(cleanCols[5])) rawEmail = cleanCols[5];
      rawAddress = cleanCols[7] || rawAddress;
      if (cleanCols[8]) rawAddedBy = cleanCols[8];
    }

    // Missing field scanner
    if (!rawAddress) {
      for (let c = 0; c < cleanCols.length; c++) {
        const val = cleanCols[c];
        if (val && ADDRESS_PATTERN.test(val) && val.length > 6 && !val.includes('@')) {
          rawAddress = val;
          break;
        }
      }
    }
    if (!rawZipCode) {
      for (let c = 0; c < cleanCols.length; c++) {
        const val = cleanCols[c];
        if (val && ZIP_PATTERN.test(val)) {
          rawZipCode = val;
          break;
        }
      }
    }
    if (!rawMobile && !rawPhone) {
      for (let c = 0; c < cleanCols.length; c++) {
        const val = cleanCols[c];
        if (val && PHONE_PATTERN.test(val)) {
          const m = val.match(PHONE_PATTERN);
          if (m) {
            rawMobile = m[0];
            break;
          }
        }
      }
    }
    if (!rawEmail) {
      for (let c = 0; c < cleanCols.length; c++) {
        const val = cleanCols[c];
        if (val && EMAIL_PATTERN.test(val)) {
          const m = val.match(EMAIL_PATTERN);
          if (m) {
            rawEmail = m[0];
            break;
          }
        }
      }
    }
    if (!rawCodeNumber) {
      for (let c = 0; c < cleanCols.length; c++) {
        const val = cleanCols[c];
        if (val && /^SH\d{2}-\d{4}/.test(val)) {
          rawCodeNumber = val;
          break;
        }
      }
    }

    // Clean name and position
    const { cleanName, extractedPosition } = cleanNameAndExtractPosition(rawName, rawPosition);
    rawName = cleanName;
    if (extractedPosition && !rawPosition) {
      rawPosition = extractedPosition;
    }

    // Sanitize Company
    if (['정기구독', '자료회원', '기증', '개인', '법인', '일반독자', '-'].includes(rawCompany)) {
      rawCompany = '';
    } else if (rawCompany.includes('원(') || /\d{2}\.\d{2}\.\d{2}/.test(rawCompany)) {
      if (!rawPaymentHistory) rawPaymentHistory = rawCompany;
      rawCompany = '';
    }

    // 1. Check if row has at least one key identifier (Name, Company, Address, Phone, Payment, Zip)
    const hasOriginalName = Boolean(rawName && rawName !== '독자' && rawName !== '-' && !rawName.startsWith('↓'));
    const hasOriginalCompany = Boolean(rawCompany && rawCompany !== '일반독자' && rawCompany !== '-' && !rawCompany.startsWith('↓'));
    const hasOriginalAddress = Boolean(rawAddress && rawAddress !== '-' && !rawAddress.includes('미기재'));

    // Skip empty artifact rows or section divider rows (e.g. "↓2015년 9월~")
    if (!hasOriginalName && !hasOriginalCompany && !hasOriginalAddress && !rawMobile && !rawPhone && !rawZipCode && !rawPaymentHistory) {
      continue;
    }

    // Smart fallback if name/company absent
    if (!rawName && !rawCompany) {
      if (rawPaymentHistory) {
        const extracted = extractFromPayment(rawPaymentHistory);
        if (extracted.company) rawCompany = extracted.company;
        if (extracted.name) rawName = extracted.name;
        if (extracted.dept && !rawDept) rawDept = extracted.dept;
      }
      if (!rawName && !rawCompany) {
        if (defaultStatus === '구독만료') rawName = '정기구독자 (만료)';
        else if (defaultStatus === '구독중단') rawName = '구독중단자';
        else rawName = rawAddress ? '구독자' : '';
      }
    }
    if (!rawName && rawCompany) rawName = rawCompany;

    if (!rawAddress) {
      if (defaultStatus === '구독중단') rawAddress = '주소 미기재 (중단 명단)';
      else if (defaultStatus === '구독만료') rawAddress = '주소 미기재 (만료 명단)';
      else rawAddress = '주소 미기재';
    }

    // Copies
    let copiesNum = 1;
    if (rawCopiesStr && !ZIP_PATTERN.test(rawCopiesStr)) {
      const parsed = parseInt(rawCopiesStr.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 500) {
        copiesNum = parsed;
      }
    }

    // Determine status: row explicit status > row keywords > sheet defaultStatus > overrideStatus
    let finalStatus: SubscriberStatus = defaultStatus;
    const statusField = rawStatus.toLowerCase();
    const etcField = rawEtc.toLowerCase();

    if (statusField.includes('중단') || statusField.includes('해지')) {
      finalStatus = '구독중단';
    } else if (statusField.includes('만료') && !statusField.includes('예정')) {
      finalStatus = '구독만료';
    } else if (statusField.includes('만료예정') || statusField.includes('예정')) {
      finalStatus = '만료예정';
    } else if (statusField.includes('정상') || statusField.includes('발송')) {
      finalStatus = '정상';
    } else if (etcField.includes('구독중단') || etcField.includes('발송중단') || etcField.includes('해지') || etcField.includes('퇴사') || etcField.includes('폐업') || etcField.includes('폐교') || etcField.includes('별세')) {
      finalStatus = '구독중단';
    } else if (defaultStatus === '구독만료' || defaultStatus === '구독중단') {
      finalStatus = defaultStatus;
    } else {
      // Default to 정상 for active list
      finalStatus = '정상';
    }

    if (overrideStatus && overrideStatus !== '정상') {
      finalStatus = overrideStatus;
    }

    const category = overrideCategory && overrideCategory !== 'AUTO'
      ? overrideCategory
      : (rawCategory.trim() || (finalStatus === '구독중단' ? '구독중단' : '정기구독'));

    let personsNum: number | undefined = undefined;
    if (rawPersons) {
      const parsedP = parseInt(rawPersons.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsedP)) personsNum = parsedP;
    }

    const subscriberItem: Omit<Subscriber, 'id'> = {
      category,
      shippingInfo: rawShippingInfo || undefined,
      persons: personsNum,
      copies: copiesNum,
      codeNumber: rawCodeNumber || undefined,
      company: rawCompany.trim(),
      organization: rawCompany.trim(),
      department: rawDept || undefined,
      name: rawName.trim(),
      position: rawPosition || undefined,
      recipientInfo: rawRecipient || undefined,
      zipCode: rawZipCode.trim(),
      address: rawAddress.trim(),
      deliveryCode: rawDeliveryCode || undefined,
      deliveryCodeSubmission: rawDeliveryCodeSubmission || undefined,
      phone: rawPhone || undefined,
      mobile: rawMobile || undefined,
      email: rawEmail || undefined,
      startDate: rawStartDate || todayStr,
      expiryDate: rawExpiryDate || '',
      accumulatedPeriod: rawAccumulatedPeriod || undefined,
      paymentHistory: rawPaymentHistory || undefined,
      status: finalStatus,
      etc: rawEtc || undefined,
      contactPerson: rawContactPerson || undefined,
      addedBy: rawAddedBy || undefined,
      customerType: rawCustomerType || undefined,
      cancellationReason: rawCancellationReason || undefined,
      memo: rawMemo || undefined,
      notes: rawMemo || undefined,
      createdAt: todayStr
    };

    // Accept all rows as valid data items directly without dropping or categorizing into errors
    validRows.push(subscriberItem);
  }

  return {
    sheetName,
    rawData: cleanGrid,
    headers: rawHeaders,
    totalRows: validRows.length + errorRows.length,
    validRows,
    errorRows, // 0 errors - 100% accepted
    detectedStatus: defaultStatus,
    isSelected: true
  };
}

// Filter out hidden and completely blank dummy sheets from Excel workbooks
export function getValidAndVisibleSheetNames(wb: XLSX.WorkBook): { validNames: string[]; sheetDataMap: Map<string, any[][]> } {
  const allNames = wb.SheetNames || [];
  const validNames: string[] = [];
  const sheetDataMap = new Map<string, any[][]>();

  for (let i = 0; i < allNames.length; i++) {
    const name = allNames[i];

    // 1. Check if sheet is explicitly hidden in Excel metadata
    const sheetMeta = wb.Workbook?.Sheets?.[i];
    if (sheetMeta && typeof sheetMeta.Hidden === 'number' && sheetMeta.Hidden > 0) {
      continue;
    }

    const ws = wb.Sheets[name];
    if (!ws || !ws['!ref']) {
      continue;
    }

    const rawData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });

    // Trim trailing empty rows (e.g. empty formatted rows up to row 2987 in Excel)
    let lastNonEmptyRowIdx = rawData.length - 1;
    while (
      lastNonEmptyRowIdx >= 0 &&
      (!rawData[lastNonEmptyRowIdx] ||
       !Array.isArray(rawData[lastNonEmptyRowIdx]) ||
       rawData[lastNonEmptyRowIdx].every((cell) => cell === null || cell === undefined || String(cell).trim().length === 0))
    ) {
      lastNonEmptyRowIdx--;
    }
    const cleanRawData = lastNonEmptyRowIdx >= 0 ? rawData.slice(0, lastNonEmptyRowIdx + 1) : [];

    // Check if sheet contains at least 1 non-empty row
    if (cleanRawData.length === 0) {
      continue;
    }

    validNames.push(name);
    sheetDataMap.set(name, cleanRawData);
  }

  // Fallback if all were somehow filtered out
  if (validNames.length === 0 && allNames.length > 0) {
    const firstName = allNames[0];
    const ws = wb.Sheets[firstName];
    const rawData = ws ? XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' }) : [];
    let lastNonEmptyRowIdx = rawData.length - 1;
    while (
      lastNonEmptyRowIdx >= 0 &&
      (!rawData[lastNonEmptyRowIdx] ||
       !Array.isArray(rawData[lastNonEmptyRowIdx]) ||
       rawData[lastNonEmptyRowIdx].every((cell) => cell === null || cell === undefined || String(cell).trim().length === 0))
    ) {
      lastNonEmptyRowIdx--;
    }
    const cleanRawData = lastNonEmptyRowIdx >= 0 ? rawData.slice(0, lastNonEmptyRowIdx + 1) : [];
    validNames.push(firstName);
    sheetDataMap.set(firstName, cleanRawData);
  }

  return { validNames, sheetDataMap };
}

// Main universal workbook parser for both .xlsx/.xls (with 4+ tabs) and .csv/.txt
export async function parseExcelOrCsvWorkbook(
  file: File,
  overrideStatus?: SubscriberStatus,
  overrideCategory?: string
): Promise<ParsedWorkbookResult> {
  const isExcel = /\.(xlsx|xls|xlsm|xlsb)$/i.test(file.name);

  if (isExcel) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
    const { validNames, sheetDataMap } = getValidAndVisibleSheetNames(wb);

    const parsedSheets: ParsedSheetResult[] = [];
    let totalValid = 0;
    let totalRows = 0;
    let totalErrors = 0;

    for (const name of validNames) {
      const rawData = sheetDataMap.get(name) || [];
      const parsedSheet = parseSheetRows(name, rawData, overrideStatus, overrideCategory);
      parsedSheets.push(parsedSheet);

      totalValid += parsedSheet.validRows.length;
      totalRows += parsedSheet.totalRows;
      totalErrors += parsedSheet.errorRows.length;
    }

    return {
      fileName: file.name,
      isMultiSheet: validNames.length > 1,
      sheetNames: validNames,
      sheets: parsedSheets,
      totalValidCount: totalValid,
      totalRowCount: totalRows,
      totalErrorCount: totalErrors
    };
  } else {
    // CSV or text format
    const buffer = await file.arrayBuffer();
    let decodedText = '';

    try {
      const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
      decodedText = utf8Decoder.decode(buffer);
    } catch {
      try {
        const eucKrDecoder = new TextDecoder('euc-kr');
        decodedText = eucKrDecoder.decode(buffer);
      } catch {
        const fallbackDecoder = new TextDecoder('utf-8');
        decodedText = fallbackDecoder.decode(buffer);
      }
    }

    // Strip BOM if present and let PapaParse handle RFC 4180 quotes & multiline fields natively
    const cleanCsvText = decodedText.replace(/^\uFEFF/, '');

    return new Promise((resolve, reject) => {
      Papa.parse<any[]>(cleanCsvText, {
        header: false,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          try {
            const rawGrid = results.data || [];
            const sheetName = file.name.replace(/\.[^/.]+$/, '');
            const parsedSheet = parseSheetRows(sheetName, rawGrid, overrideStatus, overrideCategory);

            resolve({
              fileName: file.name,
              isMultiSheet: false,
              sheetNames: [sheetName],
              sheets: [parsedSheet],
              totalValidCount: parsedSheet.validRows.length,
              totalRowCount: parsedSheet.totalRows,
              totalErrorCount: parsedSheet.errorRows.length
            });
          } catch (err) {
            reject(err);
          }
        },
        error: (err) => reject(err)
      });
    });
  }
}
