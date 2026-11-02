// Web preview: the native Google picker isn't available; email/password still works.
import type { AuthCredential } from '@firebase/auth';

export async function googleCredential(): Promise<AuthCredential | null> {
  throw new Error('google-web-unsupported');
}

export async function googleSignOut() {}
