import { useMemo, useState } from 'react';
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

  const [query, setQuery] = useState('');
  const [instructor, setInstructor] = useState('');

  const instructors = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const c of data.courses) {
      if (c.instructor_name) set.add(c.instructor_name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'it'));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.courses.filter((c) => {
      const matchQuery =
        !q ||
        (c.title ?? '').toLowerCase().includes(q) ||
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.instructor_name ?? '').toLowerCase().includes(q);
      const matchInstructor = !instructor || c.instructor_name === instructor;
      return matchQuery && matchInstructor;
    });
  }, [data, query, instructor]);

  return (
    <Layout>
      <h1 className="mb-4 text-2xl font-semibold text-slate-800">Corsi completati</h1>

      {data && data.courses.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Cerca per titolo o docente…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-[220px] flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <select
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            className="min-w-[200px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="">Tutti i docenti</option>
            {instructors.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          {(query || instructor) && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setInstructor('');
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-red-700">
          Errore caricamento corsi. Verifica la connessione al database in <code>.env</code>.
        </div>
      )}

      {data && data.courses.length === 0 && (
        <p className="text-slate-600">Nessun corso completato disponibile.</p>
      )}

      {data && data.courses.length > 0 && filtered.length === 0 && (
        <p className="text-slate-500">Nessun corso corrisponde ai filtri.</p>
      )}

      {filtered.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                to={`/courses/${c.id}`}
                className="block h-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400 hover:shadow"
              >
                <div className="text-base font-medium text-slate-800">
                  {c.title || c.name}
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400">Docente:</span>{' '}
                    <span className="font-medium text-slate-700">
                      {c.instructor_name || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">CFU:</span>{' '}
                    <span className="font-medium text-slate-700">
                      {c.cfu ?? '—'}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}
