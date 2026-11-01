// Web preview: the browser build of Firebase Auth persists to IndexedDB by itself.
import { type Auth, getAuth } from '@firebase/auth';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { type Firestore, getFirestore } from 'firebase/firestore';
import { FIREBASE_CONFIG } from './config';

let cached: { auth: Auth; db: Firestore } | null = null;

export function fb(): { auth: Auth; db: Firestore } {
  if (cached) return cached;
  if (!FIREBASE_CONFIG) throw new Error('community-off');
  const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
  cached = { auth: getAuth(app), db: getFirestore(app) };
  return cached;
}
