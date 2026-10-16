import React, { useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { db, googleEnabled } from '../backend/client';
import {authService} from '../backend/auth';
import './auth.css';

export default function AuthPanel({ admin = false, recovery = false, onRecovered }) {
  const [mode, setMode] = useState(recovery ? 'update' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const destination = admin ? '/admin' : '/community';
  const run = async operation => {
    setBusy(true); setError(''); setMessage('');
    try { await operation(); } catch (err) { setError(err.message || 'Sign-in failed. Try again.'); } finally { setBusy(false); }
  };
  const submit = event => {
    event.preventDefault();
    run(async () => {
      if (!db) throw new Error('Supabase is not connected. Follow docs/ADMIN_SETUP.md and restart Vite.');
      let result;
      if (mode === 'reset') {
        result = await db.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}${destination}?mode=recovery` });
        if (result.error) throw result.error;
        setMessage('If this email is registered, a password reset link will arrive shortly.');
      } else if (mode === 'update') {
        result = await db.auth.updateUser({ password });
        if (result.error) throw result.error;
        setPassword(''); setMessage('Password updated.'); setMode('signin');
        history.replaceState(null, '', destination); onRecovered?.();
      } else if (mode === 'signup' && !admin) {
        result = await db.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() }, emailRedirectTo: location.origin + destination } });
        if (result.error) throw result.error;
        setPassword(''); setMessage('Check your email to confirm your account before signing in.');
      } else {
        result = await db.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) throw result.error;
        setPassword('');
      }
    });
  };
  return <div className="portfolio-auth">
    <LockKeyhole size={27} aria-hidden="true"/>
    <h2>{mode === 'reset' ? 'Reset your password' : mode === 'update' ? 'Choose a new password' : mode === 'signup' ? 'Create your account' : admin ? 'Admin Dashboard' : 'Welcome to the community'}</h2>
    {!db && <p className="auth-notice">Backend connection pending. Configure the public Supabase URL and key in <code>.env</code>. Login and uploads stay disabled until connected. Setup: <code>docs/ADMIN_SETUP.md</code>.</p>}
    <form onSubmit={submit}>
      <fieldset disabled={busy || !db}>
        {mode === 'signup' && <label>Name<input required maxLength={120} autoComplete="name" value={name} onChange={e => setName(e.target.value)}/></label>}
        {mode !== 'update' && <label>Email address<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}/></label>}
        {mode !== 'reset' && <label>Password<div className="auth-password"><input required type={visible ? 'text' : 'password'} minLength={mode === 'signin' ? 1 : 12} maxLength={128} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)}/><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>}
        <button className="btn btn-primary" type="submit">{busy ? 'Please wait…' : mode === 'reset' ? 'Send reset link' : mode === 'update' ? 'Update password' : mode === 'signup' ? 'Create account' : 'Sign in securely'}</button>
        {mode === 'signin' && googleEnabled && <button className="btn btn-secondary" type="button" onClick={() => run(() => authService.signIn(destination))}>Continue with Google</button>}
      </fieldset>
    </form>
    {error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-notice" role="status">{message}</p>}
    <div className="auth-links">{mode === 'signin' ? <><button type="button" onClick={() => { setMode('reset'); setError(''); }}>Forgot password?</button>{!admin && <button type="button" onClick={() => setMode('signup')}>Create an account</button>}</> : <button type="button" onClick={() => setMode('signin')}>Back to sign in</button>}</div>
  </div>;
}
