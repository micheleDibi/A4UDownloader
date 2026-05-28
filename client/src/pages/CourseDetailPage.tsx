import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { CourseDetail, ModuleDetail, ModuleSummary } from '../api/types';
import { Layout } from '../components/Layout';
import { Spinner } from '../components/Spinner';
import { ModuleAccordion } from '../components/ModuleAccordion';

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const courseQuery = useQuery({
    queryKey: ['course', id],
    queryFn: () => api.get<CourseDetail>(`/api/courses/${id}`),
    enabled: !!id,
  });

  const sortedModules: ModuleSummary[] = useMemo(
    () =>
      (courseQuery.data?.modules ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [courseQuery.data]
  );

  const moduleQueries = useQueries({
    queries: sortedModules.map((m) => ({
      queryKey: ['module', m.id],
      queryFn: () => api.get<ModuleDetail>(`/api/modules/${m.id}`),
    })),
  });

  return (
    <Layout>
      <div className="mb-4">
        <Link to="/courses" className="text-sm text-slate-600 hover:text-slate-900">
          ← Tutti i corsi
        </Link>
      </div>

      {courseQuery.isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {courseQuery.error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-red-700">
          Errore caricamento corso.
        </div>
      )}

      {courseQuery.data && (
        <>
          <h1 className="mb-2 text-2xl font-semibold text-slate-800">
            {courseQuery.data.title || courseQuery.data.name}
          </h1>
          <div className="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span>
              <span className="text-slate-400">Docente:</span>{' '}
              <span className="font-medium text-slate-700">
                {courseQuery.data.instructor_name || '—'}
              </span>
            </span>
            <span>
              <span className="text-slate-400">CFU:</span>{' '}
              <span className="font-medium text-slate-700">
                {courseQuery.data.cfu ?? '—'}
              </span>
            </span>
            <span>
              <span className="text-slate-400">Moduli:</span>{' '}
              <span className="font-medium text-slate-700">
                {sortedModules.length}
              </span>
            </span>
          </div>
          <div className="space-y-3">
            {sortedModules.map((m, idx) => {
              const mq = moduleQueries[idx];
              return (
                <ModuleAccordion
                  key={m.id}
                  moduleSummary={m}
                  detail={mq?.data}
                  isLoading={!!mq?.isLoading}
                  isError={!!mq?.error}
                />
              );
            })}
          </div>
        </>
      )}
    </Layout>
  );
}
