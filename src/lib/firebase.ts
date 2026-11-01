// @ts-expect-error getReactNativePersistence is only in the react-native build's typings
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from '@firebase/auth';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { type Firestore, getFirestore } from 'firebase/firestore';
import { FIREBASE_CONFIG } from './config';
import { Storage } from './kv';

let cached: { auth: Auth; db: Firestore } | null = null;

/** Firebase handles; throws "community-off" until FIREBASE_CONFIG is filled in. */
export function fb(): { auth: Auth; db: Firestore } {
  if (cached) return cached;
  if (!FIREBASE_CONFIG) throw new Error('community-off');
  const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
  let auth: Auth;
  try {
    // keep the signed-in (anonymous) user across restarts and in the background task
    auth = initializeAuth(app, { persistence: getReactNativePersistence(Storage) });
  } catch {
    auth = getAuth(app); // already initialised (fast refresh)
  }
  cached = { auth, db: getFirestore(app) };
  return cached;
}
