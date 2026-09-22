import React, { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { KeyRound, Loader2, LockKeyhole } from 'lucide-react';

export function PinGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/status', { headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : { authenticated: false })
      .then((result) => { if (active) setAuthenticated(Boolean(result.authenticated)); })
      .catch(() => { if (active) setError('Unable to contact the server. Please try again.'); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!checking && !authenticated) inputRef.current?.focus();
  }, [checking, authenticated]);

  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    if (!pin || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) {
        setPin('');
        setError(response.status === 401 ? 'Incorrect PIN. Please try again.' : 'Unable to unlock the app.');
        return;
      }
      setAuthenticated(true);
    } catch {
      setError('Unable to contact the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" aria-label="Checking access" />
      </div>
    );
  }

  if (authenticated) return <>{children}</>;

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.22),_transparent_45%)]" />
      <form onSubmit={unlock} className="relative w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-950/50">
          <LockKeyhole className="h-7 w-7" />
        </div>
        <h1 className="text-center text-2xl font-black text-white">SooQuoting</h1>
        <p className="mt-2 text-center text-sm text-slate-400">Enter your PIN to open the quotation system.</p>

        <label htmlFor="app-pin" className="mt-7 block text-xs font-bold uppercase tracking-widest text-slate-300">Access PIN</label>
        <div className="relative mt-2">
          <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            id="app-pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
            maxLength={4}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-12 pr-4 text-center text-xl font-black tracking-[0.55em] text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            aria-describedby={error ? 'pin-error' : undefined}
          />
        </div>
        {error && <p id="pin-error" role="alert" className="mt-3 text-center text-sm font-semibold text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={pin.length !== 4 || submitting}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? 'Checking PIN...' : 'Enter'}
        </button>
      </form>
    </main>
  );
}
