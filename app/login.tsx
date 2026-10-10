import { Link } from 'expo-router';
import { useState } from 'react';
import { AuthButton, AuthError, AuthInput, AuthShell, authLink } from '../components/auth/AuthShell';
import ProviderButtons from '../components/auth/Providers';
import { Txt } from '../components/ui';
import { logIn } from '../lib/auth';

export default function Login() {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!email.trim() || !password) return setError('Enter your email address, and your password to sign in with one.');
    setBusy(true); setError('');
    try { await logIn(email.trim(), password); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };
  return (
    <AuthShell title="Welcome back" lede="Your deadlines are waiting." below={<Txt style={{ color: 'rgba(255,255,255,0.75)' }}>New to ChronKeep? <Link href="/signup" style={authLink}>Create an account</Link></Txt>}>
      {error ? <AuthError>{error}</AuthError> : null}
      <ProviderButtons onError={setError} />
      <AuthInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="username" textContentType="username" />
      <AuthInput label="Password" secure value={password} onChangeText={setPassword} autoCapitalize="none" autoComplete="current-password" textContentType="password" onSubmitEditing={submit} returnKeyType="go" />
      <AuthButton busy={busy} onPress={submit}>Log in</AuthButton>
    </AuthShell>
  );
}
