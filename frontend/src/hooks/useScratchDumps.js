import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scratchDumpsApi } from '../api/faces';

/**
 * Scratch Dump query key 工厂。
 *
 * 用法：
 *   dumpKeys.all              → ['scratch-dumps']
 *   dumpKeys.list()           → ['scratch-dumps', 'list']
 *   dumpKeys.detail(id)       → ['scratch-dumps', 'detail', id]
 *   dumpKeys.status(id)       → ['scratch-dumps', 'status', id]
 *
 * 与 faceKeys（['faces', ...]）平行，互不耦合。
 */
export const dumpKeys = {
  all:    ['scratch-dumps'],
  list:   ()       => [...dumpKeys.all, 'list'],
  detail: (id)     => [...dumpKeys.all, 'detail', id],
  status: (id)     => [...dumpKeys.all, 'status', id],
};

/** 列出本人 dump 列表。 */
export function useScratchDumps() {
  return useQuery({
    queryKey: dumpKeys.list(),
    queryFn: () => scratchDumpsApi.list(),
  });
}

/** 新建 dump（成功后自动 invalidate 列表）。 */
export function useCreateDump() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => scratchDumpsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: dumpKeys.list() }),
  });
}

/** 删除 dump（成功后自动 invalidate 列表）。 */
export function useRemoveDump() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => scratchDumpsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dumpKeys.list() });
    },
  });
}
