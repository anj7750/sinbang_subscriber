import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

async function updateTodos() {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig as any);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  const todosCol = collection(db, 'todos');
  const todosSnap = await getDocs(todosCol);

  const batch = writeBatch(db);

  // Clear existing todos
  todosSnap.forEach((d) => batch.delete(d.ref));

  const now = new Date().toISOString().split('T')[0];

  const realisticTodos = [
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

  realisticTodos.forEach((t) => {
    const newRef = doc(todosCol);
    batch.set(newRef, t);
  });

  await batch.commit();
  console.log('Successfully updated todos with realistic August 2026 tasks!');
}

updateTodos().catch(console.error);
