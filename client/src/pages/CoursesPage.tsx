import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Award, BookOpen, RotateCcw, Search, User } from 'lucide-react';
import { api } from '../api/client';
import type { Course } from '../api/types';
import { Layout } from '../components/Layout';
import { Spinner } from '../components/Spinner';
import { StatusBadge } from '../components/StatusBadge';

function CourseCard({ course }: { course: Course }) {
  const s = course.approval_summary;
  const pct = (n: number) => (s && s.total > 0 ? (n / s.total) * 100 : 0);
  return (
    <Link
      to={`/courses/${course.id}`}
      className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
          <BookOpen className="h-5 w-5" />
        </span>
        <StatusBadge summary={s} />
      </div>

      <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-800 group-hover:text-brand-700">
        {course.title || course.name}
      </h3>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-slate-400" />
          {course.instructor_name || '—'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 text-slate-400" />
          {course.cfu ?? '—'} CFU
        </span>
      </div>

      {s && s.total > 0 && (
        <div className="mt-auto pt-3">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="bg-emerald-500" style={{ width: `${pct(s.approved)}%` }} />
            <div className="bg-red-500" style={{ width: `${pct(s.rejected)}%` }} />
          </div>
        </div>
      )}
    </Link>
  );
}

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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
            Corsi da valutare
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Corsi completi pronti per la valutazione di dispense e slide.
          </p>
        </div>
        {data && (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
            {filtered.length} corsi
          </span>
        )}
      </div>

      {data && data.courses.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Cerca per titolo o docente…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <select
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            className="w-full max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 sm:w-auto sm:min-w-[200px]"
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          Errore caricamento corsi. Verifica la connessione al database in{' '}
          <code>.env</code>.
        </div>
      )}

      {data && data.courses.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          Nessun corso completo disponibile.
        </div>
      )}

      {data && data.courses.length > 0 && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          Nessun corso corrisponde ai filtri.
        </div>
      )}

      {filtered.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <CourseCard course={c} />
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}
