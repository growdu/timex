import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { facesApi } from '../api/faces';
import { faceKeys } from './useFaceProfile';

/**
 * 启动一次性历史回填（POST /faces/backfill）。
 * 成功后会自动 invalidate backfill status 查询。
 */
export function useStartBackfill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: facesApi.backfill,
    onSuccess: () => qc.invalidateQueries({ queryKey: faceKeys.backfill() }),
  });
}

/**
 * 轮询回填进度。
 *
 * status 为 `running` 时 1s 轮询；其他态（idle / done / failed）停止轮询。
 * status 形状：`{ status, processed, total, ... }`。
 */
export function useBackfillStatus() {
  return useQuery({
    queryKey: faceKeys.backfill(),
    queryFn: facesApi.backfillStatus,
    refetchInterval: (q) => (q.state.data?.status === 'running' ? 1000 : false),
  });
}