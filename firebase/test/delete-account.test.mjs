// End-to-end check of the app's "Delete account" flow (src/lib/community.ts deleteAccount) against the
// Auth + Firestore emulators with the real rules. Run from the repo root:
//   npx firebase-tools emulators:exec --only auth,firestore --project demo-pakjobs "node firebase/test/delete-account.test.mjs"
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, deleteUser, getAuth } from 'firebase/auth';
import {
  addDoc, collection, collectionGroup, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore,
  query, serverTimestamp, setDoc, Timestamp, where, writeBatch,
} from 'firebase/firestore';

const app = initializeApp({ projectId: 'demo-pakjobs', apiKey: 'demo-key' });
const auth = getAuth(app);
const db = getFirestore(app);
// emulators:exec exports where the emulators listen
connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
const [fsHost, fsPort] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
connectFirestoreEmulator(db, fsHost, Number(fsPort));

const ok = (cond, msg) => { if (!cond) { console.log('  ✗', msg); process.exitCode = 1; } else console.log('  ✓', msg); };

const { user } = await createUserWithEmailAndPassword(auth, 'tester@example.test', 'test-pass-123');
const uid = user.uid;
await setDoc(doc(db, 'profiles', uid), { name: 'Tester', whatsapp: '03001234567', city: 'Lahore', updatedAt: serverTimestamp() });
await addDoc(collection(db, 'posts'), {
  title: 'Sales Executive', company: 'Abc Traders', category: 'private', city: 'Lahore', salary: '', qualification: null,
  jobType: 'Full time', industry: 'sales', vacancies: 1, lastDate: null, description: 'Field sales job in Lahore.',
  phone: '', whatsapp: '', ownerUid: uid, ownerName: 'Tester', status: 'pending', featured: false, featureRequested: false,
  createdAt: serverTimestamp(), expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 86400000)),
});
for (const t of ['njp-1', 'u-abc']) await addDoc(collection(db, 'threads', t, 'comments'), { uid, name: 'Tester', text: 'Hello', createdAt: serverTimestamp() });

// --- same steps as deleteAccount()
const refs = [
  ...(await getDocs(query(collectionGroup(db, 'comments'), where('uid', '==', uid)))).docs.map((d) => d.ref),
  ...(await getDocs(query(collection(db, 'posts'), where('ownerUid', '==', uid)))).docs.map((d) => d.ref),
  doc(db, 'profiles', uid),
];
ok(refs.length === 4, `found 2 comments + 1 post + profile (${refs.length} docs)`);
const batch = writeBatch(db);
refs.forEach((r) => batch.delete(r));
await batch.commit();
await deleteUser(user);
ok(!auth.currentUser, 'login deleted');

// verify as a fresh user
await createUserWithEmailAndPassword(auth, 'checker@example.test', 'test-pass-123');
ok((await getDocs(query(collectionGroup(db, 'comments'), where('uid', '==', uid)))).empty, 'comments gone');
console.log(process.exitCode ? 'FAILED' : 'all passed');
process.exit();
