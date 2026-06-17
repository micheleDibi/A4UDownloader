import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { GraduationCap, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export function Layout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          <Link to="/courses" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight text-slate-800">
                A4U Downloader
              </span>
              <span className="block text-[11px] font-medium text-slate-500">
                Valutazione corsi
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
