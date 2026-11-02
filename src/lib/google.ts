// Native Google account picker → Firebase credential. Uses the project's web client id so the
// returned idToken is accepted by Firebase Auth.
import { GoogleAuthProvider, type AuthCredential } from '@firebase/auth';
import { GoogleSignin, isCancelledResponse, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID } from './config';

let configured = false;

/** Opens the Google account picker; null when the user backs out. */
export async function googleCredential(): Promise<AuthCredential | null> {
  if (!configured) {
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
    configured = true;
  }
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const res = await GoogleSignin.signIn();
  if (isCancelledResponse(res) || !isSuccessResponse(res)) return null;
  if (!res.data.idToken) throw new Error('google-no-token');
  return GoogleAuthProvider.credential(res.data.idToken);
}

/** Forget the picked Google account so the next login shows the picker again. */
export async function googleSignOut() {
  try {
    await GoogleSignin.signOut();
  } catch {}
}
