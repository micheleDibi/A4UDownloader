import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type {
  ApprovalStatus,
  AssetType,
  CourseApprovals,
} from '../api/types';

export interface AssetState {
  status: ApprovalStatus;
  note: string | null;
}

const PENDING: AssetState = { status: 'pending', note: null };

export function approvalKey(lessonId: string, assetType: AssetType): string {
  return `${lessonId}:${assetType}`;
}

export function useApprovals(courseId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['approvals', courseId],
    queryFn: () => api.get<CourseApprovals>(`/api/courses/${courseId}/approvals`),
    enabled: !!courseId,
  });

  const map = useMemo(() => {
    const m = new Map<string, AssetState>();
    for (const a of query.data?.approvals ?? []) {
      m.set(approvalKey(a.lesson_id, a.asset_type), {
        status: a.status,
        note: a.note,
      });
    }
    return m;
  }, [query.data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['approvals', courseId] });
    qc.invalidateQueries({ queryKey: ['courses'] });
  };

  const setAsset = useMutation({
    mutationFn: (v: {
      lessonId: string;
      assetType: AssetType;
      status: ApprovalStatus;
      note?: string | null;
    }) =>
      api.put(`/api/lessons/${v.lessonId}/approvals/${v.assetType}`, {
        status: v.status,
        note: v.note ?? null,
      }),
    onSuccess: invalidate,
  });

  const setModule = useMutation({
    mutationFn: (v: { moduleId: string; status: ApprovalStatus; note?: string | null }) =>
      api.post(`/api/modules/${v.moduleId}/approvals`, {
        status: v.status,
        note: v.note ?? null,
      }),
    onSuccess: invalidate,
  });

  const setCourse = useMutation({
    mutationFn: (v: { status: ApprovalStatus; note?: string | null }) =>
      api.post(`/api/courses/${courseId}/approvals`, {
        status: v.status,
        note: v.note ?? null,
      }),
    onSuccess: invalidate,
  });

  const getState = (lessonId: string, assetType: AssetType): AssetState =>
    map.get(approvalKey(lessonId, assetType)) ?? PENDING;

  return {
    map,
    getState,
    summary: query.data?.summary,
    isLoading: query.isLoading,
    isError: !!query.error,
    busy: setAsset.isPending || setModule.isPending || setCourse.isPending,
    setAsset,
    setModule,
    setCourse,
  };
}
