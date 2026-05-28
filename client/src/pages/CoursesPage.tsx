import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Course } from '../api/types';
import { Layout } from '../components/Layout';
import { Spinner } from '../components/Spinner';

export function CoursesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get<{ courses: Course[] }>('/api/courses'),
  });

  return (
    <Layout>
      <h1 className="mb-1 text-2xl font-semibold text-slate-800">Corsi completati</h1>
      <p className="mb-6 text-sm text-slate-500">
        Solo i corsi marcati <span className="font-medium">is_completed = true</span>{' '}
        della tua organizzazione.
      </p>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-red-700">
          Errore caricamento corsi. Verifica le credenziali API in <code>.env</code>.
        </div>
      )}

      {data && data.courses.length === 0 && (
        <p className="text-slate-600">Nessun corso completato disponibile.</p>
      )}

      {data && data.courses.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.courses.map((c) => (
            <li key={c.id}>
              <Link
                to={`/courses/${c.id}`}
                className="block h-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400 hover:shadow"
              >
                <div className="text-base font-medium text-slate-800">
                  {c.title || c.name}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                  {c.language || '—'}
                  {c.duration_minutes
                    ? ` · ${Math.round(c.duration_minutes / 60)}h`
                    : ''}
                  {c.course_type ? ` · ${c.course_type}` : ''}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}
