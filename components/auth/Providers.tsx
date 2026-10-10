import { useEffect, useState } from 'react';
import { appleAvailable, appleSignIn, googleSignIn, providers, type Providers } from '../../lib/auth';
import { AuthButton, AuthDivider } from './AuthShell';

// "Continue with Apple" and "Continue with Google", each shown only once the cloud has it set up.
export default function ProviderButtons({ onError }: { onError: (message: string) => void }) {
  const [p, setP] = useState<Providers>({ google: false, apple: false }), [native, setNative] = useState(true), [busy, setBusy] = useState('');
  useEffect(() => { void providers().then(setP); void appleAvailable().then(setNative); }, []);
  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(name); onError('');
    try { await fn(); } catch (e) { const m = (e as Error).message; if (!/cancel/i.test(m)) onError(m || 'Sign-in did not finish. Try again.'); }
    setBusy('');
  };
  if (!(p.google || (p.apple && native))) return null;
  return (
    <>
      {p.apple && native ? <AuthButton variant="apple" busy={busy === 'apple'} onPress={() => run('apple', appleSignIn)}>Continue with Apple</AuthButton> : null}
      {p.google ? <AuthButton variant="google" busy={busy === 'google'} onPress={() => run('google', googleSignIn)}>Continue with Google</AuthButton> : null}
      <AuthDivider />
    </>
  );
}
