import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { GraduationCap, LogIn, Lock, User } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Spinner } from '../components/Spinner';
import { ApiError } from '../api/client';

export function LoginPage() {
  const { authenticated, loading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
    '/courses';

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (authenticated) return <Navigate to={from} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      if (err instanceof ApiError) {
        const code = (err.payload as { error?: string } | null)?.error;
        if (code === 'invalid_credentials') setError('Credenziali non valide.');
        else if (code === 'too_many_requests')
          setError('Troppi tentativi, riprova tra un minuto.');
        else setError('Errore di login.');
      } else {
        setError('Errore di rete.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-50 via-slate-50 to-slate-100" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-brand-100/50 blur-3xl" />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm space-y-5 rounded-2xl border border-slate-200/80 bg-white/90 p-7 shadow-card-hover backdrop-blur"
      >
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-md">
            <GraduationCap className="h-6 w-6" />
          </span>
          <h1 className="mt-3 text-lg font-semibold tracking-tight text-slate-800">
            A4U Downloader
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Accedi per valutare e scaricare i corsi.
          </p>
        </div>

        <div className="space-y-3.5">
          <div>
            <label
              htmlFor="login-username"
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Username
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputCls}
                placeholder="Il tuo username"
                autoComplete="username"
                required
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-xs font-medium text-slate-600"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            'Accesso in corso…'
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Entra
            </>
          )}
        </button>
      </form>
    </div>
  );
}
