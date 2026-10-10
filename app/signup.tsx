import { Link } from 'expo-router';
import { useState } from 'react';
import { AuthButton, AuthError, AuthInput, AuthShell, authLink } from '../components/auth/AuthShell';
import ProviderButtons from '../components/auth/Providers';
import { Txt } from '../components/ui';
import { signUp } from '../lib/auth';

export default function Signup() {
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim() || !email.includes('@')) return setError('Enter your name and email address.');
    if (password.length < 10) return setError('Use at least 10 characters for your password.');
    setBusy(true); setError('');
    try { await signUp(name.trim(), email.trim(), password); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };
  return (
    <AuthShell title="Create your account" lede="Free. Your calendar and tasks on every device." below={<Txt style={{ color: 'rgba(255,255,255,0.75)' }}>Already have an account? <Link href="/login" style={authLink}>Log in</Link></Txt>}>
      {error ? <AuthError>{error}</AuthError> : null}
      <ProviderButtons onError={setError} />
      <AuthInput label="Name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
      <AuthInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" />
      <AuthInput label="Password" secure hint="At least 10 characters." value={password} onChangeText={setPassword} autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" onSubmitEditing={submit} returnKeyType="go" />
      <AuthButton busy={busy} onPress={submit}>Create account</AuthButton>
    </AuthShell>
  );
}
