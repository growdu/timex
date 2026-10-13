import { useQuery } from '@tanstack/react-query';
import { facesApi } from '../api/faces';
import { faceKeys } from './useFaceProfile';

/**
 * 人脸检索。
 *
 * @param {object} opts            — { threshold, topK, ... }
 * @param {boolean} [enabled=true] — 调用方控制何时触发
 *
 * 返回 TanStack Query 标准对象：`{ data, isLoading, refetch, ... }`。
 * 命中数组在 `data`（后端可能直接返回数组或 `{ hits: [...] }`，本 hook 不强行归一化）。
 */
export function useFaceSearch(opts, enabled = true) {
  return useQuery({
    queryKey: faceKeys.search(opts),
    queryFn: () => facesApi.search(opts),
    enabled,
    staleTime: 30_000,
  });
}