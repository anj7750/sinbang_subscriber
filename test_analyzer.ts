import Papa from 'papaparse';
import fs from 'fs';

// Helper regexes
const PHONE_PATTERN = /(01[016789]-?\d{3,4}-?\d{4}|0[2-6][0-9]?-?\d{3,4}-?\d{4})/;
const EMAIL_PATTERN = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
const ZIP_PATTERN = /^\d{3}-?\d{3}$|^\d{5}$/;
const ADDRESS_KEYWORDS = /(서울|경기|인천|강원|충북|충남|전북|전남|경북|경남|제주|세종|광주|대구|대전|부산|울산|특별시|광역시|자치시|시|군|구|읍|면|동|로|길|번지|아파트|빌라|타운|맨션|타워|오피스텔|마을|단지|호|층|사서함|Japan|USA|UK|China|Germany)/i;

interface ExtractedData {
  category: string;
  name: string;
  company: string;
  department: string;
  position: string;
  address: string;
  zipCode: string;
  phone: string;
  mobile: string;
  email: string;
  codeNumber?: string;
  copies: number;
  startDate?: string;
  expiryDate?: string;
  accumulatedPeriod?: string;
  paymentHistory?: string;
  etc?: string;
  addedBy?: string;
  memo?: string;
  status: string;
  sourceRow: number;
}

function parseSmartRow(cols: string[], headers: string[], rowNum: number): ExtractedData | null {
  // 1. Skip dividers or completely empty rows
  const nonEmpty = cols.filter(c => c && c.trim());
  if (nonEmpty.length === 0) return null;
  if (nonEmpty.length === 1 && (nonEmpty[0].startsWith('↓') || nonEmpty[0].includes('년') && nonEmpty[0].includes('월'))) {
    return null;
  }

  const cleanCols = cols.map(c => (c || '').replace(/^["\uFEFF]+|["\uFEFF]+$/g, '').trim());

  let category = '';
  let shippingInfo = '';
  let copies = 1;
  let codeNumber = '';
  let company = '';
  let department = '';
  let name = '';
  let position = '';
  let recipient = '';
  let zipCode = '';
  let address = '';
  let phone = '';
  let mobile = '';
  let email = '';
  let startDate = '';
  let expiryDate = '';
  let accumulatedPeriod = '';
  let paymentHistory = '';
  let etc = '';
  let addedBy = '';
  let memo = '';
  let stopReason = '';

  // Determine row layout type:
  // Check if this row is Format C (standard matching header column positions where col 10/11 is zip/addr or col 7 is name)
  const isHeaderStandard = cleanCols.length >= 10 && (
    ZIP_PATTERN.test(cleanCols[10]) || 
    (cleanCols[4] && cleanCols[4].startsWith('SH')) ||
    (cleanCols[9] && (cleanCols[9].includes('귀하') || cleanCols[9].includes('귀중') || cleanCols[9].includes('귀 중') || cleanCols[9].includes('님께'))) ||
    (cleanCols[11] && ADDRESS_KEYWORDS.test(cleanCols[11]))
  );

  // Check if row is Format A (col 2 is address, col 3 is zip or period, col 1 is name)
  const isCol2Address = cleanCols[2] && ADDRESS_KEYWORDS.test(cleanCols[2]) && !cleanCols[2].includes('@') && cleanCols[2].length > 5;
  const isCol1Address = cleanCols[1] && ADDRESS_KEYWORDS.test(cleanCols[1]) && !cleanCols[1].includes('@') && cleanCols[1].length > 5;

  if (isHeaderStandard) {
    // Format C / Standard 24-col
    category = cleanCols[0] || '';
    shippingInfo = cleanCols[1] || '';
    if (cleanCols[3] && !isNaN(parseInt(cleanCols[3], 10))) copies = parseInt(cleanCols[3], 10) || 1;
    codeNumber = cleanCols[4] || '';
    company = cleanCols[5] || '';
    department = cleanCols[6] || '';
    name = cleanCols[7] || '';
    position = cleanCols[8] || '';
    recipient = cleanCols[9] || '';
    zipCode = cleanCols[10] || '';
    address = cleanCols[11] || '';
    const contactCol = cleanCols[12] || '';
    if (PHONE_PATTERN.test(contactCol)) mobile = contactCol.match(PHONE_PATTERN)![0];
    if (EMAIL_PATTERN.test(contactCol)) email = contactCol.match(EMAIL_PATTERN)![0];
    if (cleanCols[13]) {
      if (PHONE_PATTERN.test(cleanCols[13])) mobile = cleanCols[13];
      else if (!phone) phone = cleanCols[13];
    }
    if (cleanCols[14] && EMAIL_PATTERN.test(cleanCols[14])) email = cleanCols[14];
    startDate = cleanCols[15] || '';
    expiryDate = cleanCols[16] || '';
    accumulatedPeriod = cleanCols[17] || '';
    paymentHistory = cleanCols[18] || '';
    etc = cleanCols[19] || '';
    addedBy = cleanCols[21] || '';
    stopReason = cleanCols[23] || '';
  } else if (isCol2Address) {
    // Format A: col 0 = 구분, col 1 = 성명/발송정보, col 2 = 주소, col 3 = 우편번호/기간, etc.
    category = cleanCols[0] || '';
    name = cleanCols[1] || '';
    address = cleanCols[2] || '';
    if (cleanCols[3] && ZIP_PATTERN.test(cleanCols[3])) {
      zipCode = cleanCols[3];
    } else if (cleanCols[3] && cleanCols[3].includes('~')) {
      accumulatedPeriod = cleanCols[3];
    } else if (cleanCols[3]) {
      etc = cleanCols[3];
    }

    // Check other columns in Format A
    for (let c = 4; c < cleanCols.length; c++) {
      const val = cleanCols[c];
      if (!val) continue;
      if (EMAIL_PATTERN.test(val) && !email) {
        email = val.match(EMAIL_PATTERN)![0];
      }
      if (PHONE_PATTERN.test(val) && !mobile) {
        mobile = val.match(PHONE_PATTERN)![0];
      }
      if (val.includes('원(') || /\d{2}\.\d{2}\.\d{2}/.test(val)) {
        if (!paymentHistory) paymentHistory = val;
      }
      if (val.includes('반송') || val.includes('중단') || val.includes('삭제') || val.includes('퇴사') || val.includes('이사')) {
        if (!stopReason) stopReason = val;
      } else if (!company && (val.includes('편집국') || val.includes('회사') || val.includes('대학교') || val.includes('방송') || val.includes('일보') || val.includes('신문') || val.includes('재단') || val.includes('협회') || val.includes('위원회') || val.includes('연구소') || val.includes('도서관'))) {
        company = val;
      } else if (!addedBy && (val.endsWith('씨') || val === '송인경' || val === '정대필' || val === '최중배' || val === '이준섭' || val === '이상기' || val === '남유원' || val === '오수정' || val === '이은옥' || val === '김위근' || val === '이유미')) {
        addedBy = val;
      }
    }
  } else if (isCol1Address) {
    category = cleanCols[0] || '';
    address = cleanCols[1] || '';
    if (cleanCols[2] && ZIP_PATTERN.test(cleanCols[2])) zipCode = cleanCols[2];
    for (let c = 2; c < cleanCols.length; c++) {
      const val = cleanCols[c];
      if (!val) continue;
      if (EMAIL_PATTERN.test(val) && !email) email = val.match(EMAIL_PATTERN)![0];
      if (PHONE_PATTERN.test(val) && !mobile) mobile = val.match(PHONE_PATTERN)![0];
      if (val.includes('반송') || val.includes('중단') || val.includes('삭제')) stopReason = val;
    }
  } else {
    // Dynamic Fallback: scan all cells in the row for Address, Phone, Email, Zip, Name, Company, etc.
    category = cleanCols[0] || '정기구독';
    for (let c = 1; c < cleanCols.length; c++) {
      const val = cleanCols[c];
      if (!val) continue;
      if (!address && ADDRESS_KEYWORDS.test(val) && val.length > 5 && !val.includes('@')) {
        address = val;
      } else if (!zipCode && ZIP_PATTERN.test(val)) {
        zipCode = val;
      } else if (!email && EMAIL_PATTERN.test(val)) {
        email = val.match(EMAIL_PATTERN)![0];
      } else if (!mobile && PHONE_PATTERN.test(val)) {
        mobile = val.match(PHONE_PATTERN)![0];
      } else if (!codeNumber && /^SH\d{2}-\d{4}/.test(val)) {
        codeNumber = val;
      } else if (val.includes('반송') || val.includes('중단') || val.includes('삭제') || val.includes('퇴사')) {
        stopReason = val;
      } else if (!company && (val.includes('일보') || val.includes('신문') || val.includes('방송') || val.includes('대학교') || val.includes('도서관') || val.includes('재단') || val.includes('협회') || val.includes('위원회') || val.includes('공사') || val.includes('은행') || val.includes('회사'))) {
        company = val;
      } else if (!name && val.length >= 2 && val.length <= 15 && !val.includes(' ') && !/^\d+$/.test(val)) {
        name = val;
      }
    }
  }

  // Name / Company Post-Processing & Cleanup
  if (name) {
    name = name
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

    // Check if name has trailing position e.g. "김선옥 기금관리위원", "김용우 교수", "강준만 교수"
    const posMatch = name.match(/^([가-힣]{2,4})\s*(기금관리위원|전문위원|위원장님|위원장|부위원장님|부위원장|위원|교수님|교수|의원님|의원|부사장님|부사장|국장님|국장|부국장|실장님|실장|본부장님|본부장|이사님|이사|차장님|차장|과장님|과장|팀장님|팀장|대표이사|대표|연구위원|연구원|회백|선생|사무관|주무관|총장님|총장|기자)$/);
    if (posMatch) {
      name = posMatch[1];
      if (!position) position = posMatch[2];
    }
  }

  // If company looks like a name or name looks like a company
  if (!name && !company) {
    if (address) {
      name = '구독자';
    }
  } else if (!name && company) {
    name = company;
  }

  if (!address) {
    address = '주소 미기재';
  }

  // Status is '구독중단' by default for cancelled sheet
  const status = '구독중단';

  return {
    category: category || '구독중단',
    name: name || company || '구독자',
    company: company || (name && name.includes('도서관') ? name : ''),
    department,
    position,
    address,
    zipCode,
    phone,
    mobile,
    email,
    codeNumber,
    copies,
    startDate,
    expiryDate,
    accumulatedPeriod,
    paymentHistory,
    etc: etc || stopReason,
    addedBy,
    memo: memo || stopReason,
    status,
    sourceRow: rowNum
  };
}

console.log('Analyzer loaded successfully.');

const fullUserContent = fs.readFileSync('test_full.csv', 'utf-8');
const parsed = Papa.parse(fullUserContent, { skipEmptyLines: 'greedy' });
console.log('Total raw rows:', parsed.data.length);

const results: ExtractedData[] = [];
const skipped: any[] = [];

for (let i = 1; i < parsed.data.length; i++) {
  const row = parsed.data[i] as string[];
  const res = parseSmartRow(row, parsed.data[0] as string[], i + 1);
  if (res) {
    results.push(res);
  } else {
    skipped.push({ row: i + 1, data: row.filter(c => c && c.trim()) });
  }
}

console.log('Successfully extracted:', results.length);
console.log('Skipped divider/empty rows:', skipped.length);
console.log('\nSample extracted 1-5:');
console.log(results.slice(0, 5));
console.log('\nSample extracted 50-55:');
console.log(results.slice(50, 55));
console.log('\nSample extracted 150-155:');
console.log(results.slice(150, 155));
console.log('\nSample extracted last 5:');
console.log(results.slice(-5));
