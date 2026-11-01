// Firestore security-rules tests. Run from the repo root:
//   npx firebase-tools emulators:exec --only firestore "node firebase/test/rules.test.mjs"
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const env = await initializeTestEnvironment({
  projectId: 'pakjobs-rules-test',
  firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
});

const alice = env.authenticatedContext('alice').firestore();
const bob = env.authenticatedContext('bob').firestore();
const boss = env.authenticatedContext('boss').firestore();
const anon = env.unauthenticatedContext().firestore();

const post = (owner, extra = {}) => ({
  title: 'Sales Executive', company: 'Abc Traders', category: 'private', city: 'Lahore',
  salary: '40,000', qualification: 'Matric', jobType: 'Full time', vacancies: 2, lastDate: null,
  description: 'Field sales in Lahore, bike required.', phone: '03001234567', whatsapp: '03001234567',
  ownerUid: owner, ownerName: 'Alice', status: 'pending', featured: false, featureRequested: false,
  createdAt: serverTimestamp(), expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 86400000)), ...extra,
});

let passed = 0;
async function t(name, fn) {
  try {
    await fn();
    passed++;
    console.log('  ✓', name);
  } catch (e) {
    console.log('  ✗', name, '\n   ', e.message);
    process.exitCode = 1;
  }
}

await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'admins/boss'), {});
  await setDoc(doc(ctx.firestore(), 'banned/mallory'), {});
});

console.log('posts');
let pid;
await t('owner can create a pending post', async () => { pid = (await assertSucceeds(addDoc(collection(alice, 'posts'), post('alice')))).id; });
await t('cannot self-approve on create', () => assertFails(addDoc(collection(alice, 'posts'), post('alice', { status: 'approved' }))));
await t('cannot self-feature on create', () => assertFails(addDoc(collection(alice, 'posts'), post('alice', { featured: true }))));
await t('cannot post as someone else', () => assertFails(addDoc(collection(alice, 'posts'), post('bob'))));
await t('signed-out users cannot post', () => assertFails(addDoc(collection(anon, 'posts'), post('x'))));
await t('banned user cannot post', () => assertFails(addDoc(collection(env.authenticatedContext('mallory').firestore(), 'posts'), post('mallory'))));
await t('expiry longer than 31 days rejected', () => assertFails(addDoc(collection(alice, 'posts'),
  post('alice', { expiresAt: Timestamp.fromDate(new Date(Date.now() + 90 * 86400000)) }))));
await t('pending post hidden from others', () => assertFails(getDoc(doc(bob, 'posts', pid))));
await t('owner sees own pending post', () => assertSucceeds(getDoc(doc(alice, 'posts', pid))));
await t('owner can list own posts', () => assertSucceeds(getDocs(query(collection(alice, 'posts'), where('ownerUid', '==', 'alice')))));
await t('owner cannot approve own post', () => assertFails(updateDoc(doc(alice, 'posts', pid), { status: 'approved' })));
await t('owner cannot feature own post', () => assertFails(updateDoc(doc(alice, 'posts', pid), { featured: true })));
await t('owner can request featured', () => assertSucceeds(updateDoc(doc(alice, 'posts', pid), { featureRequested: true })));
await t('other user cannot edit post', () => assertFails(updateDoc(doc(bob, 'posts', pid), { featureRequested: true })));
await t('admin can list pending', () => assertSucceeds(getDocs(query(collection(boss, 'posts'), where('status', '==', 'pending')))));
await t('admin can approve + feature', () => assertSucceeds(updateDoc(doc(boss, 'posts', pid), { status: 'approved', featured: true })));
await t('anyone (even signed-out) reads approved post', () => assertSucceeds(getDoc(doc(anon, 'posts', pid))));
await t('public list of approved posts', () => assertSucceeds(getDocs(query(collection(anon, 'posts'), where('status', '==', 'approved')))));
await t('public cannot list all posts', () => assertFails(getDocs(collection(bob, 'posts'))));
await t('other user cannot delete post', () => assertFails(deleteDoc(doc(bob, 'posts', pid))));
await t('owner can delete own post', () => assertSucceeds(deleteDoc(doc(alice, 'posts', pid))));

console.log('comments');
const cm = (uid, text = 'Matric wale apply kar sakte hain?') => ({ uid, name: 'Bob', text, createdAt: serverTimestamp() });
let cid;
await t('signed-in user can comment', async () => { cid = (await assertSucceeds(addDoc(collection(bob, 'threads/njp-1/comments'), cm('bob')))).id; });
await t('cannot comment as someone else', () => assertFails(addDoc(collection(bob, 'threads/njp-1/comments'), cm('alice'))));
await t('empty / too long comment rejected', () => assertFails(addDoc(collection(bob, 'threads/njp-1/comments'), cm('bob', 'x'.repeat(501)))));
await t('banned user cannot comment', () => assertFails(addDoc(collection(env.authenticatedContext('mallory').firestore(), 'threads/njp-1/comments'), cm('mallory'))));
await t('everyone can read comments', () => assertSucceeds(getDocs(collection(anon, 'threads/njp-1/comments'))));
await t('cannot delete others comment', () => assertFails(deleteDoc(doc(alice, 'threads/njp-1/comments', cid))));
await t('admin can delete any comment', () => assertSucceeds(deleteDoc(doc(boss, 'threads/njp-1/comments', cid))));

console.log('reports / profiles / roles');
await t('user can file a report', () => assertSucceeds(addDoc(collection(bob, 'reports'), { kind: 'job', jobId: 'u-1', commentId: null, reason: 'reasonScam', uid: 'bob', createdAt: serverTimestamp() })));
await t('non-admin cannot read reports', () => assertFails(getDocs(collection(bob, 'reports'))));
await t('admin can read reports', () => assertSucceeds(getDocs(collection(boss, 'reports'))));
await t('user can save own profile', () => assertSucceeds(setDoc(doc(bob, 'profiles/bob'), { name: 'Bob', whatsapp: '03001234567', city: 'Lahore', updatedAt: serverTimestamp() })));
await t('cannot read others profile', () => assertFails(getDoc(doc(alice, 'profiles/bob'))));
await t('cannot make yourself admin', () => assertFails(setDoc(doc(bob, 'admins/bob'), {})));
await t('non-admin cannot ban', () => assertFails(setDoc(doc(bob, 'banned/alice'), {})));
await t('admin can ban', () => assertSucceeds(setDoc(doc(boss, 'banned/alice'), {})));

await env.cleanup();
console.log(`\n${passed} passed${process.exitCode ? ' — SOME FAILED' : ''}`);
