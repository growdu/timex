import { useMutation } from '@tanstack/react-query';
import { scratchDumpsApi } from '../api/faces';

/**
 * 针对单个 scratch dump 的人脸检索（用本人 enabled 的 face refs 当 queries）。
 *
 * 调用方传 `{ dumpId, opts }`：
 *   - dumpId : string  — 目标 dump
 *   - opts   : object  — { threshold?, topK? }
 *
 * 返回 TanStack 标准 mutation；命中数组在 `data`。
 */
export function useDumpSearch() {
  return useMutation({
    mutationFn: ({ dumpId, opts }) => scratchDumpsApi.search(dumpId, opts ?? {}),
  });
}
