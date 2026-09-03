import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

async function deleteAllSubscribers() {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig as any);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  const subscribersCol = collection(db, 'subscribers');
  const snapshot = await getDocs(subscribersCol);

  console.log(`Found ${snapshot.docs.length} subscribers to delete...`);

  let batch = writeBatch(db);
  let count = 0;
  let batchCount = 0;

  for (const docSnap of snapshot.docs) {
    batch.delete(docSnap.ref);
    count++;
    batchCount++;

    if (batchCount === 400) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
      console.log(`Deleted ${count} / ${snapshot.docs.length}...`);
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`Successfully deleted ALL ${count} subscribers from Firestore!`);
}

deleteAllSubscribers().catch(console.error);
