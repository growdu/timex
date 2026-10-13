import { useMutation } from '@tanstack/react-query';
import { facesApi } from '../api/faces';

/**
 * 触发单条 moment 的人脸提取。
 *
 * 后端返回 shape：AIJob-like `{ id, status, ... }`（具体结构由 FaceController 决定）。
 * 失败时由 useMutation 的 `error` 字段暴露。
 */
export function useExtractFaces() {
  return useMutation({
    mutationFn: (momentId) => facesApi.extractFaces(momentId),
  });
}