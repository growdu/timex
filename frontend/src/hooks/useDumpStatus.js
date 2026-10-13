import { useQuery } from '@tanstack/react-query';
import { scratchDumpsApi } from '../api/faces';
import { dumpKeys } from './useScratchDumps';

/**
 * 轮询单个 dump 的处理进度。
 *
 * status 为 'processing' 时 1s 轮询；其他态（created / done / failed）停止轮询。
 * status 形状：`{ total, done, failed, status }`。
 *
 * 仅在传入 dumpId 时启用；不传则禁用（不轮询）。
 */
export function useDumpStatus(dumpId) {
  return useQuery({
    queryKey: dumpId ? dumpKeys.status(dumpId) : ['scratch-dumps', 'status', 'disabled'],
    queryFn: () => scratchDumpsApi.status(dumpId),
    enabled: Boolean(dumpId),
    refetchInterval: (q) => (q.state.data?.status === 'processing' ? 1000 : false),
  });
}
