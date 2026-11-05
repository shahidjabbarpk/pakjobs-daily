/**
 * Firestore-backed community features: private job posts, comments, reports, admin moderation.
 * Every user gets an anonymous Firebase account on first use; posting and commenting need a real
 * login (Google or email/password), linked onto that account. Identity shown to others is the
 * profile (name + WhatsApp). All access control lives in firebase/firestore.rules.
 */
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type AuthCredential,
  type User,
} from '@firebase/auth';
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { FIREBASE_CONFIG, POST_LIFETIME_DAYS } from './config';
import { fb } from './firebase';
import { googleCredential, googleSignOut } from './google';
import type { Category, Comment, Job, PostStatus, Profile, Report } from './types';

export const POST_PREFIX = 'u-';

let signingIn: Promise<string> | null = null;

/** Signed-in uid; concurrent callers share one sign-in so only one anonymous account is ever made. */
export function ensureUser(): Promise<string> {
  let auth: ReturnType<typeof fb>['auth'];
  try {
    auth = fb().auth;
  } catch (e) {
    return Promise.reject(e);
  }
  if (auth.currentUser) return Promise.resolve(auth.currentUser.uid);
  signingIn ??= (async () => {
    // wait for the persisted session to load before deciding to create a new anonymous account
    await auth.authStateReady();
    const restored = auth.currentUser as { uid: string } | null;
    if (restored) return restored.uid;
    return (await signInAnonymously(auth)).user.uid;
  })().finally(() => {
    signingIn = null;
  });
  return signingIn;
}

export const currentUid = () => {
  try {
    return fb().auth.currentUser?.uid ?? null;
  } catch {
    return null;
  }
};

/** True when Firebase is configured for this build. */
export const communityReady = () => !!FIREBASE_CONFIG;

// ------------------------------------------------------------------ accounts (Google / email)

export interface AuthUser { uid: string; guest: boolean; email: string | null; name: string | null }

const toAuthUser = (u: User | null): AuthUser | null =>
  u && { uid: u.uid, guest: u.isAnonymous, email: u.email, name: u.displayName };

/** Calls back with the signed-in user (null while signed out); returns the unsubscribe. */
export function watchAuth(cb: (u: AuthUser | null) => void): () => void {
  try {
    return onAuthStateChanged(fb().auth, (u) => cb(toAuthUser(u)));
  } catch {
    cb(null);
    return () => {};
  }
}

/** A guest's posts stay theirs: link the new login onto the anonymous account when possible. */
async function linkOrSignIn(cred: AuthCredential) {
  const { auth } = fb();
  const cur = auth.currentUser;
  if (cur?.isAnonymous) {
    try {
      await linkWithCredential(cur, cred);
      return;
    } catch (e: any) {
      // that Google account already has a PakJobs account: just sign into it
      if (e?.code !== 'auth/credential-already-in-use') throw e;
    }
  }
  await signInWithCredential(auth, cred);
}

export async function signUpEmail(email: string, password: string) {
  await ensureUser().catch(() => {});
  const cur = fb().auth.currentUser;
  if (cur?.isAnonymous) await linkWithCredential(cur, EmailAuthProvider.credential(email.trim(), password));
  else await createUserWithEmailAndPassword(fb().auth, email.trim(), password);
}

export async function signInEmail(email: string, password: string) {
  await signInWithEmailAndPassword(fb().auth, email.trim(), password);
}

/** False when the user closed the Google account picker. */
export async function signInGoogle(): Promise<boolean> {
  await ensureUser().catch(() => {});
  const cred = await googleCredential();
  if (!cred) return false;
  await linkOrSignIn(cred);
  return true;
}

export const resetPassword = (email: string) => sendPasswordResetEmail(fb().auth, email.trim());

/** Back to a fresh guest session. */
export async function signOutUser() {
  await signOut(fb().auth);
  await googleSignOut();
  await ensureUser().catch(() => {});
}

/**
 * Permanently deletes the logged-in account: every comment and job post it made, its profile, then
 * the login itself, and starts a fresh guest session. Firebase refuses to delete a login that was
 * not used recently; that surfaces as 'auth/requires-recent-login' (log out, log in, try again).
 */
export async function deleteAccount() {
  const { auth, db } = fb();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('not-logged-in');
  const uid = user.uid;
  const refs = [
    ...(await getDocs(query(collectionGroup(db, 'comments'), where('uid', '==', uid)))).docs.map((d) => d.ref),
    ...(await getDocs(query(collection(db, 'posts'), where('ownerUid', '==', uid)))).docs.map((d) => d.ref),
    doc(db, 'profiles', uid),
  ];
  // a batch holds at most 500 writes
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db);
    refs.slice(i, i + 450).forEach((r) => batch.delete(r));
    await batch.commit();
  }
  await deleteUser(user);
  await googleSignOut();
  await ensureUser().catch(() => {});
}

// ------------------------------------------------------------------ profile / roles

export async function loadProfile(): Promise<Profile | null> {
  const uid = await ensureUser();
  const snap = await getDoc(doc(fb().db, 'profiles', uid));
  return snap.exists() ? (snap.data() as Profile) : null;
}

export async function saveProfile(p: Profile): Promise<void> {
  const uid = await ensureUser();
  await setDoc(doc(fb().db, 'profiles', uid), { name: p.name.trim(), whatsapp: p.whatsapp.trim(), city: p.city ?? null, updatedAt: serverTimestamp() });
}

export async function isAdmin(): Promise<boolean> {
  const uid = await ensureUser();
  try {
    return (await getDoc(doc(fb().db, 'admins', uid))).exists();
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ posts

export interface PostInput {
  title: string;
  company: string;
  category: Category;
  city: string;
  salary: string;
  qualification: string | null;
  jobType: string;
  industry: string;
  vacancies: number | null;
  lastDate: string | null; // YYYY-MM-DD
  description: string;
  phone: string;
  whatsapp: string;
}

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : new Date().toISOString());
const ymd = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString().slice(0, 10) : undefined);

export function postToJob(id: string, d: DocumentData): Job {
  return {
    id: POST_PREFIX + id,
    source: 'user',
    title: d.title,
    organization: d.company,
    category: d.category ?? 'private',
    cities: d.city ? [d.city] : [],
    qualification: d.qualification ?? null,
    url: `pakjobs://job/${POST_PREFIX}${id}`,
    description: d.description,
    jobType: d.jobType || undefined,
    industry: d.industry || undefined,
    vacancies: d.vacancies ?? undefined,
    salary: d.salary || undefined,
    phone: d.phone || undefined,
    whatsapp: d.whatsapp || undefined,
    postedDate: ymd(d.createdAt),
    lastDate: d.lastDate || ymd(d.expiresAt),
    ownerUid: d.ownerUid,
    ownerName: d.ownerName,
    featured: !!d.featured,
    featureRequested: !!d.featureRequested,
    status: d.status,
    firstSeen: iso(d.createdAt),
  };
}

const docId = (jobId: string) => jobId.slice(POST_PREFIX.length);

export async function createPost(input: PostInput, ownerName: string, requestFeature: boolean, asAdmin = false): Promise<string> {
  const uid = await ensureUser();
  const expires = new Date(Date.now() + POST_LIFETIME_DAYS * 86_400_000);
  const ref = await addDoc(collection(fb().db, 'posts'), {
    ...input,
    title: input.title.trim(),
    company: input.company.trim(),
    description: input.description.trim(),
    ownerUid: uid,
    ownerName,
    status: (asAdmin ? 'approved' : 'pending') satisfies PostStatus,
    featured: false,
    featureRequested: requestFeature,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expires),
  });
  return POST_PREFIX + ref.id;
}

/** Approved, unexpired posts - newest first, featured on top. */
export async function fetchApprovedPosts(): Promise<Job[]> {
  await ensureUser();
  const snap = await getDocs(query(collection(fb().db, 'posts'), where('status', '==', 'approved'), orderBy('createdAt', 'desc'), limit(150)));
  const now = Date.now();
  return snap.docs
    .filter((d) => ((d.data().expiresAt as Timestamp | undefined)?.toMillis() ?? Infinity) > now)
    .map((d) => postToJob(d.id, d.data()))
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
}

export async function fetchMyPosts(): Promise<Job[]> {
  const uid = await ensureUser();
  const snap = await getDocs(query(collection(fb().db, 'posts'), where('ownerUid', '==', uid)));
  return snap.docs.map((d) => postToJob(d.id, d.data())).sort((a, b) => b.firstSeen.localeCompare(a.firstSeen));
}

export async function deletePost(jobId: string) {
  await deleteDoc(doc(fb().db, 'posts', docId(jobId)));
}

export async function requestFeature(jobId: string) {
  await updateDoc(doc(fb().db, 'posts', docId(jobId)), { featureRequested: true });
}

// ------------------------------------------------------------------ comments

export function listenComments(jobId: string, cb: (c: Comment[]) => void, onError?: () => void): () => void {
  let unsub = () => {};
  let cancelled = false;
  ensureUser()
    .then(() => {
      if (cancelled) return;
      const q = query(collection(fb().db, 'threads', jobId, 'comments'), orderBy('createdAt', 'asc'), limit(200));
      unsub = onSnapshot(
        q,
        (snap) => cb(snap.docs.map((d) => ({
          id: d.id,
          uid: d.data().uid,
          name: d.data().name,
          text: d.data().text,
          createdAt: (d.data().createdAt as Timestamp | null)?.toMillis() ?? Date.now(),
        }))),
        () => onError?.(),
      );
    })
    .catch(() => onError?.());
  return () => {
    cancelled = true;
    unsub();
  };
}

export async function addComment(jobId: string, name: string, text: string) {
  const uid = await ensureUser();
  await addDoc(collection(fb().db, 'threads', jobId, 'comments'), { uid, name, text: text.trim(), createdAt: serverTimestamp() });
}

export async function deleteComment(jobId: string, commentId: string) {
  await deleteDoc(doc(fb().db, 'threads', jobId, 'comments', commentId));
}

// ------------------------------------------------------------------ reports

export async function report(kind: 'job' | 'comment', jobId: string, reason: string, commentId?: string) {
  const uid = await ensureUser();
  await addDoc(collection(fb().db, 'reports'), { kind, jobId, commentId: commentId ?? null, reason, uid, createdAt: serverTimestamp() });
}

// ------------------------------------------------------------------ admin

export async function fetchPending(): Promise<Job[]> {
  const snap = await getDocs(query(collection(fb().db, 'posts'), where('status', '==', 'pending'), orderBy('createdAt', 'asc'), limit(100)));
  return snap.docs.map((d) => postToJob(d.id, d.data()));
}

export async function fetchFeatureRequests(): Promise<Job[]> {
  const snap = await getDocs(query(collection(fb().db, 'posts'), where('featureRequested', '==', true), limit(100)));
  return snap.docs.map((d) => postToJob(d.id, d.data()));
}

export async function fetchReports(): Promise<Report[]> {
  const snap = await getDocs(query(collection(fb().db, 'reports'), orderBy('createdAt', 'desc'), limit(100)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any), createdAt: (d.data().createdAt as Timestamp | null)?.toMillis() ?? 0 }));
}

export async function moderatePost(jobId: string, patch: { status?: PostStatus; featured?: boolean; featureRequested?: boolean }) {
  await updateDoc(doc(fb().db, 'posts', docId(jobId)), patch);
}

/** Admin edit of an existing post's content. */
export async function updatePost(jobId: string, input: PostInput) {
  await updateDoc(doc(fb().db, 'posts', docId(jobId)), {
    ...input, title: input.title.trim(), company: input.company.trim(), description: input.description.trim(),
  });
}

export async function dismissReport(id: string) {
  await deleteDoc(doc(fb().db, 'reports', id));
}

export async function banUser(uid: string) {
  await setDoc(doc(fb().db, 'banned', uid), { at: serverTimestamp() });
}
