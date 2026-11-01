// @ts-expect-error getReactNativePersistence is only in the react-native build's typings
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from '@firebase/auth';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { FIREBASE_CONFIG } from './config';
import { Storage } from './kv';

const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);

function makeAuth(): Auth {
  try {
    // keep the signed-in (anonymous) user across restarts and in the background task
    return initializeAuth(app, { persistence: getReactNativePersistence(Storage) });
  } catch {
    return getAuth(app); // already initialised (fast refresh)
  }
}

export const auth = makeAuth();
export const db = getFirestore(app);
