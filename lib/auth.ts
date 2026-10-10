import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { API_URL, APP_SCHEME_URL } from './config';
import { api, ApiError } from './http';
import * as SecureStore from 'expo-secure-store';
import { emptyData } from './store';
import { replaceAll } from './data';
import { setToken } from './session';

// Signing in: email and password, Google (in the browser, handed back to the app), and Apple (native on iPhone, in the
// browser on Android). All of them end with a token from the cloud.

export type Providers = { google: boolean; apple: boolean };
// Every sign-in ends here. If this phone last held a different account's data (a session that ran out, a shared phone),
// that data is cleared first, so one person's items can never be sent to another person's account.
async function finishSignIn(token: string): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    const me = (await res.json()) as { id?: string };
    if (me.id) {
      const prev = await SecureStore.getItemAsync('chronkeep.account');
      if (prev && prev !== me.id) replaceAll(emptyData());
      await SecureStore.setItemAsync('chronkeep.account', me.id);
    }
  } catch { /* offline right after sign-in is unlikely; the token still works */ }
  await setToken(token);
}

export const providers = () => api<Providers>('/api/mobile/providers', { auth: false }).catch((): Providers => ({ google: false, apple: false }));

export async function logIn(email: string, password: string): Promise<void> {
  const { token } = await api<{ token: string }>('/api/mobile/login', { method: 'POST', auth: false, body: { email, password } });
  await finishSignIn(token);
}
export async function signUp(name: string, email: string, password: string): Promise<void> {
  const { token } = await api<{ token: string }>('/api/mobile/signup', { method: 'POST', auth: false, body: { name, email, password } });
  await finishSignIn(token);
}

const b64url = (s: string) => s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomString = async (bytes = 32) => b64url(btoa(String.fromCharCode(...(await Crypto.getRandomBytesAsync(bytes)))));

// Google (and Apple on Android): the browser signs in, the cloud hands a short-lived code back to the app, and the
// app swaps it for its token with the secret it made up first, so no other app can use the code.
async function browserSignIn(provider: 'google' | 'apple'): Promise<void> {
  const verifier = await randomString(32);
  const challenge = b64url(await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 }));
  const result = await WebBrowser.openAuthSessionAsync(`${API_URL}/auth/${provider}?intent=mobile&challenge=${challenge}`, APP_SCHEME_URL);
  if (result.type !== 'success') throw new ApiError('Sign-in was cancelled.', 0);
  const q = new URL(result.url).searchParams;
  if (q.get('error')) throw new ApiError(q.get('error')!, 0);
  const code = q.get('code');
  if (!code) throw new ApiError('Sign-in did not finish. Try again.', 0);
  const { token } = await api<{ token: string }>('/api/mobile/exchange', { method: 'POST', auth: false, body: { code, verifier } });
  await finishSignIn(token);
}
export const googleSignIn = () => browserSignIn('google');

export async function appleSignIn(): Promise<void> {
  if (Platform.OS !== 'ios') return browserSignIn('apple');
  const nonce = await randomString(16);
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce); // hex, as Apple puts it in the token
  let cred: AppleAuthentication.AppleAuthenticationCredential;
  try {
    cred = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL], nonce: hashed });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new ApiError('Sign-in was cancelled.', 0);
    throw e;
  }
  const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ');
  const { token } = await api<{ token: string }>('/api/mobile/apple', { method: 'POST', auth: false, body: { identityToken: cred.identityToken, nonce, name } });
  await finishSignIn(token);
}
export const appleAvailable = () => (Platform.OS === 'ios' ? AppleAuthentication.isAvailableAsync() : Promise.resolve(true));
