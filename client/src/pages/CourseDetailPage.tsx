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
          <h1 className="mb-1 text-2xl font-semibold text-slate-800">
            {courseQuery.data.title || courseQuery.data.name}
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            {sortedModules.length} moduli
          </p>
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
