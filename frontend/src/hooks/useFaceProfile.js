import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facesApi } from '../api/faces';

/**
 * 面孔中心 query key 工厂。
 *
 * 用法：
 *   faceKeys.all               → ['faces']
 *   faceKeys.me()              → ['faces', 'me']
 *   faceKeys.search(opts)      → ['faces', 'search', opts]
 *   faceKeys.backfill()        → ['faces', 'backfill']
 */
export const faceKeys = {
  all:      ['faces'],
  me:       () => [...faceKeys.all, 'me'],
  search:   (q) => [...faceKeys.all, 'search', q],
  backfill: () => [...faceKeys.all, 'backfill'],
};

/** 我的画像（参考数量 / 启用数量 / hasProfile 标志）。 */
export function useFaceMe() {
  return useQuery({
    queryKey: faceKeys.me(),
    queryFn: facesApi.getMe,
  });
}

/** 添加参考图（成功后刷新画像）。 */
export function useAddReference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: facesApi.addReference,
    onSuccess: () => qc.invalidateQueries({ queryKey: faceKeys.me() }),
  });
}

/** 删除参考图。 */
export function useRemoveRef() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: facesApi.removeRef,
    onSuccess: () => qc.invalidateQueries({ queryKey: faceKeys.me() }),
  });
}

/** 启用 / 禁用参考图。 */
export function useSetRefEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ refId, enabled }) => facesApi.setRefEnabled(refId, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: faceKeys.me() }),
  });
}