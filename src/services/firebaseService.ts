import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TodoTask, Subscriber, ReturnLog, PaymentRecord, UserProfile, AllowedEmail } from '../types';
import { resolveSubscriberDisplayFields } from '../utils/subscriberUtils';

// Collection references
const todosCol = collection(db, 'todos');
const subscribersCol = collection(db, 'subscribers');
const returnsCol = collection(db, 'returns');
const paymentsCol = collection(db, 'payments');
const allowedEmailsCol = collection(db, 'allowed_emails');
const usersCol = collection(db, 'users');

// Initial allowed emails
export const INITIAL_ALLOWED_EMAILS = [
  'jam@kpf.or.kr',
  'shlee@kpf.or.kr',
  'test@kpf.or.kr',
  'anj7750@gmail.com',
  'ryunne@kpf.or.kr',
  'isna@kpf.or.kr',
  'joo26@kpf.or.kr',
  'patsae@kpf.or.kr',
  'hynoh@kpf.or.kr',
  'jhpark@kpf.or.kr'
];

// Admin permissions are strictly restricted to jam and shlee as requested
export const INITIAL_ADMIN_EMAILS = [
  'jam@kpf.or.kr',
  'shlee@kpf.or.kr'
];

export function isUserAdmin(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  const email = (profile.email || '').toLowerCase().trim();
  const idOrEmail = email.split('@')[0];
  const uid = (profile.uid || '').toLowerCase().trim();
  return (
    idOrEmail === 'jam' ||
    idOrEmail === 'shlee' ||
    uid === 'admin_jam' ||
    uid === 'admin_shlee' ||
    uid === 'jam' ||
    uid === 'shlee' ||
    email === 'jam@kpf.or.kr' ||
    email === 'shlee@kpf.or.kr'
  );
}

// Check if a user has write/edit permissions (test account is read-only)
export function canUserEdit(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.isReadOnly) return false;
  const email = (profile.email || '').toLowerCase().trim();
  const idOrEmail = email.split('@')[0];
  const uid = (profile.uid || '').toLowerCase().trim();
  if (
    idOrEmail === 'test' ||
    uid === 'user_test' ||
    uid === 'test' ||
    email === 'test@kpf.or.kr'
  ) {
    return false;
  }
  return true;
}

export function isCurrentSessionReadOnly(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('kpf_current_user');
    if (!raw) return false;
    const profile: UserProfile = JSON.parse(raw);
    return !canUserEdit(profile);
  } catch {
    return false;
  }
}

export function assertWritable() {
  if (isCurrentSessionReadOnly()) {
    throw new Error('조회 전용 계정(test)은 데이터 추가, 수정, 삭제 권한이 제한되어 있습니다.');
  }
}

// Ensure initial allowed emails exist in Firestore
export async function ensureAllowedEmailsSeeded() {
  if (typeof window !== 'undefined' && sessionStorage.getItem('allowed_emails_checked') === 'true') {
    return;
  }
  try {
    for (const email of INITIAL_ALLOWED_EMAILS) {
      const lower = email.toLowerCase().trim();
      const ref = doc(db, 'allowed_emails', lower);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          email: lower,
          addedAt: new Date().toISOString(),
          addedBy: 'system'
        });
      }
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('allowed_emails_checked', 'true');
    }
  } catch (error) {
    console.error('Error seeding allowed emails:', error);
  }
}

// Check if email is in whitelist
export async function isEmailAllowed(email: string): Promise<boolean> {
  const lower = email.toLowerCase().trim();
  // First check initial list directly
  if (INITIAL_ALLOWED_EMAILS.includes(lower)) {
    return true;
  }
  try {
    const ref = doc(db, 'allowed_emails', lower);
    const snap = await getDoc(ref);
    if (snap.exists()) return true;

    // Fallback: query collection for email field match
    const qSnap = await getDocs(query(allowedEmailsCol));
    return qSnap.docs.some(d => (d.data().email || '').toLowerCase().trim() === lower);
  } catch (error) {
    console.error('Error checking allowed email:', error);
    // Fallback check against static list if offline or error
    return INITIAL_ALLOWED_EMAILS.includes(lower);
  }
}

// Subscribe to Allowed Emails
export function subscribeToAllowedEmails(callback: (emails: AllowedEmail[]) => void) {
  return onSnapshot(allowedEmailsCol, (snapshot) => {
    const emails: AllowedEmail[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    } as AllowedEmail));
    // Sort alphabetically by email
    emails.sort((a, b) => a.email.localeCompare(b.email));
    callback(emails);
  }, (error) => {
    console.error("Error subscribing to allowed_emails:", error);
  });
}

// Add allowed email
export async function addAllowedEmail(email: string, addedBy = 'admin') {
  const lower = email.toLowerCase().trim();
  if (!lower || !lower.includes('@')) {
    throw new Error('유효한 이메일 주소를 입력해 주세요.');
  }
  const ref = doc(db, 'allowed_emails', lower);
  await setDoc(ref, {
    email: lower,
    addedAt: new Date().toISOString(),
    addedBy
  });
}

// Delete allowed email
export async function deleteAllowedEmail(emailDocId: string) {
  const ref = doc(db, 'allowed_emails', emailDocId);
  await deleteDoc(ref);
}

// Subscribe to Users
export function subscribeToUsers(callback: (users: UserProfile[]) => void) {
  return onSnapshot(usersCol, (snapshot) => {
    const users: UserProfile[] = snapshot.docs.map((docSnap) => ({
      uid: docSnap.id,
      ...docSnap.data()
    } as UserProfile));
    users.sort((a, b) => a.email.localeCompare(b.email));
    callback(users);
  }, (error) => {
    console.error("Error subscribing to users:", error);
  });
}

// Fetch single user profile
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { uid: snap.id, ...snap.data() } as UserProfile;
  }
  return null;
}

// Create user profile
export async function createUserProfile(profile: UserProfile) {
  const ref = doc(db, 'users', profile.uid);
  await setDoc(ref, profile, { merge: true });
}

// Update admin permission
export async function updateUserAdminRole(targetUid: string, currentUid: string, isAdmin: boolean) {
  if (targetUid === currentUid && !isAdmin) {
    throw new Error('본인의 관리자 권한은 스스로 해제할 수 없습니다.');
  }
  const ref = doc(db, 'users', targetUid);
  await updateDoc(ref, { isAdmin });
}


// Real-time listener for Todos
export function subscribeToTodos(callback: (todos: TodoTask[]) => void) {
  const q = query(todosCol, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const todos: TodoTask[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    } as TodoTask));
    callback(todos);
  }, (error) => {
    console.error("Error subscribing to todos:", error);
  });
}

// Real-time listener for Subscribers
export function subscribeToSubscribers(callback: (subscribers: Subscriber[]) => void) {
  const q = query(subscribersCol, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const subscribers: Subscriber[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    } as Subscriber));
    callback(subscribers);
  }, (error) => {
    console.error("Error subscribing to subscribers:", error);
  });
}

// Real-time listener for Returns
export function subscribeToReturns(callback: (returns: ReturnLog[]) => void) {
  const q = query(returnsCol, orderBy('returnedAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const returns: ReturnLog[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    } as ReturnLog));
    callback(returns);
  }, (error) => {
    console.error("Error subscribing to returns:", error);
  });
}

// Real-time listener for Payments
export function subscribeToPayments(callback: (payments: PaymentRecord[]) => void) {
  const q = query(paymentsCol, orderBy('depositDate', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const payments: PaymentRecord[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    } as PaymentRecord));
    callback(payments);
  }, (error) => {
    console.error("Error subscribing to payments:", error);
  });
}

// Todo CRUD
export async function addTodo(task: Omit<TodoTask, 'id'>) {
  assertWritable();
  return await addDoc(todosCol, task);
}

export async function updateTodo(id: string, updates: Partial<TodoTask>) {
  assertWritable();
  const todoRef = doc(db, 'todos', id);
  return await updateDoc(todoRef, updates);
}

export async function deleteTodo(id: string) {
  assertWritable();
  const todoRef = doc(db, 'todos', id);
  return await deleteDoc(todoRef);
}

// Subscriber CRUD
export async function addSubscriber(sub: Omit<Subscriber, 'id'>) {
  assertWritable();
  return await addDoc(subscribersCol, sub);
}

function removeUndefinedFields(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export async function batchAddSubscribers(
  subList: Omit<Subscriber, 'id'>[],
  onProgress?: (done: number, total: number) => void
) {
  assertWritable();
  if (subList.length === 0) return;
  const CHUNK_SIZE = 400; // Firestore batch write limit is 500
  let done = 0;
  for (let i = 0; i < subList.length; i += CHUNK_SIZE) {
    const chunk = subList.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const newRef = doc(subscribersCol);
      const cleanItem = removeUndefinedFields(item);
      batch.set(newRef, cleanItem);
    }
    await batch.commit();
    done += chunk.length;
    if (onProgress) {
      onProgress(done, subList.length);
    }
  }
}

export async function updateSubscriber(id: string, updates: Partial<Subscriber>) {
  assertWritable();
  const subRef = doc(db, 'subscribers', id);
  return await updateDoc(subRef, updates);
}

export async function deleteSubscriber(id: string) {
  assertWritable();
  const subRef = doc(db, 'subscribers', id);
  return await deleteDoc(subRef);
}

// Return CRUD
export async function addReturnLog(ret: Omit<ReturnLog, 'id'>) {
  assertWritable();
  return await addDoc(returnsCol, ret);
}

export async function updateReturnLog(id: string, updates: Partial<ReturnLog>) {
  assertWritable();
  const retRef = doc(db, 'returns', id);
  return await updateDoc(retRef, updates);
}

export async function deleteReturnLog(id: string) {
  assertWritable();
  const retRef = doc(db, 'returns', id);
  return await deleteDoc(retRef);
}

// Payment CRUD
export async function addPayment(pay: Omit<PaymentRecord, 'id'>) {
  assertWritable();
  return await addDoc(paymentsCol, pay);
}

export async function updatePayment(id: string, updates: Partial<PaymentRecord>) {
  assertWritable();
  const payRef = doc(db, 'payments', id);
  return await updateDoc(payRef, updates);
}

export async function deletePayment(id: string) {
  assertWritable();
  const payRef = doc(db, 'payments', id);
  return await deleteDoc(payRef);
}

export const sampleSubscribersList: Omit<Subscriber, 'id' | 'createdAt'>[] = [];

// Known dummy / test subscriber identifiers to permanently purge from database
const DUMMY_NAMES = new Set([
  '홍길동', '엠엠', '정스터', '줄라이보이', '김동식', '이유빈', '신영선', '전언호', '박철민',
  '박철민 교수', '김민수', '보글', '박윤하', '정인숙',
  '한국대학교 도서관', '한국대학교 미디어커뮤니케이션학과', 'KBS 보도본부 학술자료실', '조선일보 편집국 미디어팀',
  '연합뉴스 미디어전략실', '중앙일보 언론연구소', '도쿄한국문화원 도서자료실', '서울대학교 언론정보연구소',
  'MBC 홍보자료실', '미디어오늘 편집국', '고려대학교 신문방송학과', '고려대학교 신문방송학과 학과사무실',
  '한겨레 미디어연구소', '동아일보 출판국', 'SBS 보도본부', '한국언론진흥재단 미디어연구실', '국회도서관',
  '국립중앙도서관', '방송통신위원회', '연세대학교 언론홍보영상학부', '김주현', '박소희', '김제디', '이아베',
  '한청', '을유문화사', '유진기업', '경남도민일보', '삼성전자', '공앤박', '밍글스푼', '테스트', '테스트독자'
]);

const DUMMY_EMAILS = new Set([
  'gildong@gmail.com', 'm_mmmy@naver.com', 'dsjstu@gmail.com', 'postmaster@koreanculture.jp',
  'thisweek@kbs.co.kr', 'min@idomin.com', 'yubin117.lee@samsung.com', 'youngsun.shin@kongnpark.com',
  'cmpark@yonsei.ac.kr', 'cblee@sbs.co.kr', 'jhlee@donga.com', 'khshin@hani.co.kr',
  'editor@mediatoday.co.kr', 'pr@mbc.co.kr', 'snujournal@snu.ac.kr', 'joongang_media@joongang.co.kr',
  'strategy@yna.co.kr', 'media@chosun.com', 'news@kbs.co.kr', 'lib@hanguk.ac.kr', 'gbs2460@eugenes.co.kr',
  'bboglev@naver.com', 'contact@minglespoon.com', 'minsu.kim@seoul.go.kr', 'julyboy7@naver.com', 'chulmin.park@yonsei.ac.kr', 'eonho.jeon@gmail.com'
]);

const DUMMY_PHONES = new Set([
  '010-1234-5678', '010-3456-7890', '010-9608-2617', '010-9876-5432', '010-5660-9590',
  '010-9966-4015', '010-3162-1448', '010-5159-9102', '010-9797-3145', '010-9025-2460',
  '010-3333-7777', '010-8765-4321', '010-2345-6789', '010-4567-8901'
]);

// Purge all dummy/sample subscriber test records from Firestore
export async function purgeAllDummySubscribers(): Promise<number> {
  try {
    const subSnap = await getDocs(subscribersCol);
    if (subSnap.empty) return 0;

    const dummyDocs = subSnap.docs.filter((d) => {
      const data = d.data();
      const name = (data.name || '').trim();
      const comp = (data.company || data.organization || '').trim();
      const email = (data.email || '').trim().toLowerCase();
      const phone = (data.mobile || data.phone || '').trim();

      if (DUMMY_NAMES.has(name) || DUMMY_NAMES.has(comp)) return true;
      if (email && DUMMY_EMAILS.has(email)) return true;
      if (phone && DUMMY_PHONES.has(phone)) return true;
      if (name.startsWith('테스트') || comp.startsWith('테스트') || name === '홍길동') return true;
      return false;
    });

    if (dummyDocs.length === 0) return 0;

    let deleted = 0;
    const CHUNK_SIZE = 400;
    for (let i = 0; i < dummyDocs.length; i += CHUNK_SIZE) {
      const chunk = dummyDocs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      await batch.commit();
      deleted += chunk.length;
    }
    console.log(`Successfully purged ${deleted} dummy test subscribers from Firestore.`);
    return deleted;
  } catch (error) {
    console.error('Error purging dummy subscribers:', error);
    return 0;
  }
}

/**
 * Deduplicates subscribers in Firestore:
 * Finds records with identical (Name + Phone) or (Name + Address) or (Company + Address),
 * keeps the best/most complete record, and permanently deletes all duplicate copies.
 */
export async function deduplicateSubscribersInFirestore(): Promise<{
  deletedCount: number;
  duplicateGroupCount: number;
}> {
  try {
    const subSnap = await getDocs(subscribersCol);
    if (subSnap.empty) {
      return { deletedCount: 0, duplicateGroupCount: 0 };
    }

    const allDocs = subSnap.docs;
    const docsToDelete = new Set<string>();
    const docMap = new Map<string, any>();
    allDocs.forEach((d) => docMap.set(d.id, { id: d.id, ref: d.ref, data: d.data() }));

    // Helper: calculate record completeness and priority score
    const getScore = (data: any) => {
      let score = 0;
      const status = data.status || '';
      if (status === '정상' || status === '만료예정') score += 20;
      else if (status === '구독만료') score += 5;

      if (data.expiryDate && data.expiryDate !== '-' && data.expiryDate !== '미정') score += 10;
      if (data.startDate && data.startDate !== '-') score += 5;
      if (data.paymentHistory && data.paymentHistory.trim()) score += 8;
      if (data.mobile && data.mobile.trim()) score += 6;
      if (data.phone && data.phone.trim()) score += 4;
      if (data.address && data.address.trim()) score += 6;
      if (data.company && data.company.trim()) score += 4;
      if (data.zipCode && data.zipCode.trim()) score += 2;
      return score;
    };

    // Helper to process groups of duplicate IDs
    let groupCount = 0;
    const processGroup = (docIds: string[]) => {
      // Filter out already marked for deletion
      const activeIds = docIds.filter((id) => !docsToDelete.has(id));
      if (activeIds.length <= 1) return;

      groupCount++;
      // Sort active docs by score descending
      activeIds.sort((a, b) => {
        const itemA = docMap.get(a);
        const itemB = docMap.get(b);
        const scoreA = getScore(itemA?.data || {});
        const scoreB = getScore(itemB?.data || {});
        return scoreB - scoreA;
      });

      // Keep index 0 (the highest score record), delete the rest
      const toKeep = activeIds[0];
      for (let i = 1; i < activeIds.length; i++) {
        docsToDelete.add(activeIds[i]);
      }
    };

    // 1. Group by (Name + Phone)
    const byNamePhone = new Map<string, string[]>();
    for (const d of allDocs) {
      const data = d.data();
      const name = (data.name || '').trim().toLowerCase();
      const phoneDigits = (data.mobile || data.phone || '').replace(/[^0-9]/g, '');
      if (name && phoneDigits.length >= 7) {
        const key = `${name}___${phoneDigits}`;
        if (!byNamePhone.has(key)) byNamePhone.set(key, []);
        byNamePhone.get(key)!.push(d.id);
      }
    }
    for (const ids of byNamePhone.values()) {
      processGroup(ids);
    }

    // 2. Group by (Name + Address)
    const byNameAddr = new Map<string, string[]>();
    for (const d of allDocs) {
      const data = d.data();
      const name = (data.name || '').trim().toLowerCase();
      const addrClean = (data.address || '').replace(/[\s\-_.,/]/g, '').toLowerCase();
      if (name && addrClean.length >= 8) {
        const key = `${name}___${addrClean}`;
        if (!byNameAddr.has(key)) byNameAddr.set(key, []);
        byNameAddr.get(key)!.push(d.id);
      }
    }
    for (const ids of byNameAddr.values()) {
      processGroup(ids);
    }

    // 3. Group by (Company + Address) for institutions/libraries
    const byCompAddr = new Map<string, string[]>();
    for (const d of allDocs) {
      const data = d.data();
      const comp = (data.company || data.organization || '').trim().toLowerCase();
      const addrClean = (data.address || '').replace(/[\s\-_.,/]/g, '').toLowerCase();
      if (comp && comp.length >= 2 && addrClean.length >= 8) {
        const key = `${comp}___${addrClean}`;
        if (!byCompAddr.has(key)) byCompAddr.set(key, []);
        byCompAddr.get(key)!.push(d.id);
      }
    }
    for (const ids of byCompAddr.values()) {
      processGroup(ids);
    }

    const deleteIdsList = Array.from(docsToDelete);
    if (deleteIdsList.length === 0) {
      return { deletedCount: 0, duplicateGroupCount: 0 };
    }

    // Execute batch delete
    const CHUNK_SIZE = 400;
    let deletedCount = 0;
    for (let i = 0; i < deleteIdsList.length; i += CHUNK_SIZE) {
      const chunk = deleteIdsList.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const id of chunk) {
        const item = docMap.get(id);
        if (item) {
          batch.delete(item.ref);
        }
      }
      await batch.commit();
      deletedCount += chunk.length;
    }

    console.log(`Deduplication completed: deleted ${deletedCount} duplicate records across ${groupCount} groups.`);
    return { deletedCount, duplicateGroupCount: groupCount };
  } catch (error) {
    console.error('Error deduplicating subscribers in Firestore:', error);
    return { deletedCount: 0, duplicateGroupCount: 0 };
  }
}

// Ensure dummy subscribers are never re-seeded
export async function ensureKeySubscribersSeeded() {
  await purgeAllDummySubscribers();
}

// Sample Data Seeding for <신문과방송>
export async function seedInitialData(force = false) {
  try {
    if (!force && typeof window !== 'undefined' && localStorage.getItem('initial_seed_done') === 'true') {
      return false;
    }

    await ensureAllowedEmailsSeeded();
    await ensureKeySubscribersSeeded();

    const todosSnap = await getDocs(todosCol);
    const subSnap = await getDocs(subscribersCol);

    if (!force && (!todosSnap.empty || !subSnap.empty)) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('initial_seed_done', 'true');
      }
      console.log('Database already populated');
      return false;
    }

    const batch = writeBatch(db);

    // Clear existing data if force
    if (force) {
      todosSnap.forEach(d => batch.delete(d.ref));
      subSnap.forEach(d => batch.delete(d.ref));
      const retSnap = await getDocs(returnsCol);
      retSnap.forEach(d => batch.delete(d.ref));
      const paySnap = await getDocs(paymentsCol);
      paySnap.forEach(d => batch.delete(d.ref));
    }

    const now = new Date().toISOString().split('T')[0];

    // 1. Initial Todos for "이번 달 처리할 일"
    const sampleTodos: Omit<TodoTask, 'id'>[] = [
      {
        title: '8월호 <신문과방송> 정기구독 만료 예정 독자 대상 만료 알림 및 지로용지 발송',
        category: '만료안내',
        dueDate: '2026-08-05',
        priority: '상',
        completed: false,
        assignedTo: '이영희 과장',
        createdAt: now
      },
      {
        title: '8월호 <신문과방송> 전국 독자 및 기관 DM 라벨 인쇄 및 우체국 발송',
        category: 'DM발송',
        dueDate: '2026-08-07',
        priority: '상',
        completed: false,
        assignedTo: '김철수 대리',
        createdAt: now
      },
      {
        title: 'DM 리스트 내 반송건(주소불명/수취거절) 수신처 전화 확인 및 변경주소 업데이트',
        category: '반송처리',
        dueDate: '2026-08-10',
        priority: '상',
        completed: false,
        assignedTo: '박민준 주임',
        createdAt: now
      },
      {
        title: '8월 구독료 무통장 입금자(40,000원) 입금 매칭 및 전자세금계산서 발행',
        category: '입금확인',
        dueDate: '2026-08-12',
        priority: '중',
        completed: true,
        assignedTo: '정수진 대리',
        createdAt: now
      },
      {
        title: '구독만료 독자(513명) 대상 <신문과방송> 재구독 프로모션 안내문/SMS 발송',
        category: '만료안내',
        dueDate: '2026-08-18',
        priority: '중',
        completed: false,
        assignedTo: '이영희 과장',
        createdAt: now
      },
      {
        title: '우정사업본부 8월 우편요금 감면 정산서 및 서류 제출',
        category: '기타',
        dueDate: '2026-08-22',
        priority: '중',
        completed: true,
        assignedTo: '김철수 대리',
        createdAt: now
      },
      {
        title: '대학 도서관 및 언론관련 학과 기증본 8월호 수령자 주소록 최종 정형화',
        category: 'DM발송',
        dueDate: '2026-08-25',
        priority: '하',
        completed: false,
        assignedTo: '박민준 주임',
        createdAt: now
      }
    ];

    sampleTodos.forEach(t => {
      const newRef = doc(todosCol);
      batch.set(newRef, t);
    });

    // 2. Initial Subscribers
    sampleSubscribersList.forEach(s => {
      const newRef = doc(subscribersCol);
      batch.set(newRef, { ...s, createdAt: now });
    });

    // 3. Returns and Payments start empty (real data only)

    await batch.commit();
    console.log('Sample data successfully seeded to Firebase!');
    return true;
  } catch (error) {
    console.error('Error seeding initial sample data:', error);
    throw error;
  }
}

// Purge all expired and stopped subscribers completely (leaving only active DM list)
export async function purgeExpiredAndStoppedSubscribers(
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  assertWritable();
  try {
    const snapshot = await getDocs(subscribersCol);
    const targetDocs = snapshot.docs.filter((d) => {
      const data = d.data();
      const st = data.status || '';
      const name = (data.name || '').trim();
      const comp = (data.company || '').trim();

      return (
        st === '구독만료' ||
        st === '구독중단' ||
        st === '만료' ||
        st === '중단' ||
        name === '김주현' ||
        name === '박소희' ||
        name === '김제디' ||
        name === '이아베' ||
        name === '한청' ||
        comp === '을유문화사'
      );
    });

    const totalDocs = targetDocs.length;
    if (totalDocs === 0) return 0;

    let done = 0;
    const CHUNK_SIZE = 400;

    for (let i = 0; i < targetDocs.length; i += CHUNK_SIZE) {
      const chunk = targetDocs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      await batch.commit();
      done += chunk.length;
      if (onProgress) {
        onProgress(done, totalDocs);
      }
    }

    console.log(`Purged ${totalDocs} expired/stopped records. Active DM list preserved.`);
    return totalDocs;
  } catch (error) {
    console.error('Error in purgeExpiredAndStoppedSubscribers:', error);
    throw error;
  }
}

// Clear subscribers by specific statuses (e.g. ['구독중단'], ['구독만료', '만료'], etc.)
export async function clearSubscribersByStatus(
  statuses: string[],
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  assertWritable();
  try {
    const snapshot = await getDocs(subscribersCol);
    const targetDocs = snapshot.docs.filter((d) => {
      const st = d.data().status;
      return statuses.includes(st);
    });

    const totalDocs = targetDocs.length;
    if (totalDocs === 0) return 0;

    let done = 0;
    const CHUNK_SIZE = 400;

    for (let i = 0; i < targetDocs.length; i += CHUNK_SIZE) {
      const chunk = targetDocs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      await batch.commit();
      done += chunk.length;
      if (onProgress) {
        onProgress(done, totalDocs);
      }
    }

    console.log(`Cleared ${totalDocs} subscribers with statuses [${statuses.join(', ')}] from Firestore.`);
    return totalDocs;
  } catch (error) {
    console.error('Error clearing subscribers by status:', error);
    throw error;
  }
}

// Clear all subscriber data completely
export async function clearAllSubscribers(
  onProgress?: (done: number, total: number) => void
): Promise<boolean> {
  assertWritable();
  try {
    let totalDeleted = 0;
    while (true) {
      const snapshot = await getDocs(subscribersCol);
      if (snapshot.empty) break;

      const totalDocs = snapshot.docs.length;
      let batch = writeBatch(db);
      let count = 0;

      for (const docSnap of snapshot.docs) {
        batch.delete(docSnap.ref);
        count++;
        totalDeleted++;

        if (count % 400 === 0) {
          await batch.commit();
          batch = writeBatch(db);
          if (onProgress) {
            onProgress(totalDeleted, totalDeleted + (totalDocs - count));
          }
        }
      }

      if (count % 400 !== 0) {
        await batch.commit();
        if (onProgress) {
          onProgress(totalDeleted, totalDeleted);
        }
      }
    }
    console.log(`Cleared all ${totalDeleted} subscribers from Firestore.`);
    return true;
  } catch (error) {
    console.error('Error clearing all subscribers:', error);
    throw error;
  }
}
