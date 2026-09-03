import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Helper to clean phone numbers out of strings
function extractPhone(str: string): string | null {
  const match = str.match(/01[016789]-?\d{3,4}-?\d{4}/) || str.match(/0[2-6][0-9]?-?\d{3,4}-?\d{4}/);
  return match ? match[0] : null;
}

// Helper to clean names from extraneous suffixes
function cleanName(raw: string): string {
  if (!raw) return '';
  let cleaned = raw
    .replace(/\(정기구독\)/g, '')
    .replace(/\(자료회원\)/g, '')
    .replace(/\(기증\)/g, '')
    .replace(/\(언론사\)/g, '')
    .replace(/\(도서관\)/g, '')
    .replace(/\(유료\)/g, '')
    .replace(/님\s*귀하/g, '')
    .replace(/님께/g, '')
    .replace(/교수님?/g, '')
    .replace(/위원장님?/g, '')
    .replace(/부위원장님?/g, '')
    .replace(/의원님?/g, '')
    .replace(/팀장님?/g, '')
    .replace(/차장님?/g, '')
    .replace(/과장님?/g, '')
    .replace(/대리님?/g, '')
    .replace(/기자/g, '')
    .replace(/사원/g, '')
    .trim();

  // If name looks like a phone number or "010-...", return "독자"
  if (/^\d{2,3}-\d{3,4}-\d{4}$/.test(cleaned) || /^01[016789]/.test(cleaned)) {
    return '독자';
  }

  // Remove quotes
  cleaned = cleaned.replace(/^"|"$/g, '').trim();
  return cleaned || '독자';
}

function cleanCompany(rawComp: string, rawDept: string, rawCat: string): { company: string; dept?: string } {
  let company = (rawComp || '').trim();
  let dept = (rawDept || '').trim();

  // If company contains phone number
  const phoneInComp = extractPhone(company);
  if (phoneInComp) {
    company = '';
  }

  // Remove extraneous suffixes
  company = company
    .replace(/\(정기구독\)/g, '')
    .replace(/\(기증\)/g, '')
    .replace(/님\s*귀하/g, '')
    .replace(/^"|"$/g, '')
    .trim();

  if (!company) {
    if (dept) {
      company = dept;
      dept = '';
    } else if (rawCat) {
      company = rawCat;
    } else {
      company = '일반독자';
    }
  }

  return { company, dept: dept || undefined };
}

async function cleanFirestoreSubscribers() {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig as any);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  const subscribersCol = collection(db, 'subscribers');
  const snapshot = await getDocs(subscribersCol);

  console.log(`Found ${snapshot.docs.length} existing subscriber documents in Firestore.`);

  let batch = writeBatch(db);
  let batchCount = 0;
  let updatedCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();

    // Clean name
    let name = cleanName(data.name || '');
    let mobile = data.mobile || '';
    let phone = data.phone || '';

    // Check if phone was accidentally in name/company/etc
    const phoneInName = extractPhone(data.name || '');
    if (phoneInName) {
      if (!mobile) mobile = phoneInName;
      name = cleanName((data.name || '').replace(phoneInName, ''));
    }

    const phoneInCompany = extractPhone(data.company || '');
    let { company, dept } = cleanCompany(data.company || '', data.department || '', data.category || '');
    if (phoneInCompany && !mobile) {
      mobile = phoneInCompany;
    }

    // Status cleaning
    let status = data.status || '정상';
    const combinedText = `${data.etc || ''} ${data.cancellationReason || ''} ${data.shippingInfo || ''} ${data.notes || ''}`.toLowerCase();

    if (
      data.cancellationReason ||
      combinedText.includes('구독중단') ||
      combinedText.includes('발송중단') ||
      combinedText.includes('해지') ||
      combinedText.includes('퇴사') ||
      combinedText.includes('폐업') ||
      combinedText.includes('사퇴')
    ) {
      status = '구독중단';
    } else if (data.status === '구독만료' || data.status === '만료' || combinedText.includes('구독만료')) {
      status = '구독만료';
    } else if (data.status === '주소오류' || combinedText.includes('반송') || combinedText.includes('이사') || combinedText.includes('주소불명')) {
      status = '주소오류';
    } else if (data.status === '만료예정' || (data.expiryDate && (data.expiryDate.includes('2026.08') || data.expiryDate.includes('2026-08')))) {
      status = '만료예정';
    } else {
      status = '정상';
    }

    const updatedData: Record<string, any> = {
      ...data,
      name,
      company,
      department: dept || data.department || '',
      mobile,
      phone,
      status
    };

    batch.update(docSnap.ref, updatedData);
    batchCount++;
    updatedCount++;

    if (batchCount === 400) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`Successfully cleaned ${updatedCount} subscriber records in Firestore!`);
}

cleanFirestoreSubscribers().catch(console.error);
