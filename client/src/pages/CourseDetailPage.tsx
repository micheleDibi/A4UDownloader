import { useMemo, type ReactNode } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  ClipboardCheck,
  Layers,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from '../api/client';
import type { CourseDetail, ModuleDetail, ModuleSummary } from '../api/types';
import { Layout } from '../components/Layout';
import { Spinner } from '../components/Spinner';
import { ModuleAccordion } from '../components/ModuleAccordion';
import { ApprovalProgress } from '../components/ApprovalProgress';
import { BulkApprovalButtons } from '../components/BulkApprovalButtons';
import { useApprovals } from '../hooks/useApprovals';

function Chip({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-card">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {children}
    </span>
  );
}

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const courseQuery = useQuery({
    queryKey: ['course', id],
    queryFn: () => api.get<CourseDetail>(`/api/courses/${id}`),
    enabled: !!id,
  });

  const approvals = useApprovals(id);

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
        <Link
          to="/courses"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Tutti i corsi
        </Link>
      </div>

      {courseQuery.isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {courseQuery.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          Errore caricamento corso.
        </div>
      )}

      {courseQuery.data && (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
            {courseQuery.data.title || courseQuery.data.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip icon={User}>{courseQuery.data.instructor_name || '—'}</Chip>
            <Chip icon={Award}>{courseQuery.data.cfu ?? '—'} CFU</Chip>
            <Chip icon={Layers}>{sortedModules.length} moduli</Chip>
          </div>

          {approvals.summary && approvals.summary.total > 0 && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <ClipboardCheck className="h-4 w-4 text-brand-600" />
                  Stato valutazione
                </h2>
                <BulkApprovalButtons
                  scopeLabel="l'intero corso"
                  disabled={approvals.busy}
                  onApprove={(note) =>
                    approvals.setCourse.mutate({ status: 'approved', note })
                  }
                  onReject={(note) =>
                    approvals.setCourse.mutate({ status: 'rejected', note })
                  }
                />
              </div>
              <ApprovalProgress summary={approvals.summary} className="mt-4" />
            </div>
          )}

          <div className="mt-6 space-y-3">
            {sortedModules.map((m, idx) => {
              const mq = moduleQueries[idx];
              return (
                <ModuleAccordion
                  key={m.id}
                  moduleSummary={m}
                  detail={mq?.data}
                  isLoading={!!mq?.isLoading}
                  isError={!!mq?.error}
                  getState={approvals.getState}
                  busy={approvals.busy}
                  onSetAsset={(lessonId, assetType, status, note) =>
                    approvals.setAsset.mutate({ lessonId, assetType, status, note })
                  }
                  onSetModule={(moduleId, status, note) =>
                    approvals.setModule.mutate({ moduleId, status, note })
                  }
                />
              );
            })}
          </div>
        </>
      )}
    </Layout>
  );
}
