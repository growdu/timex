import { useExtractFaces } from '../hooks/useExtractFaces';

/**
 * ExtractFaceButton — 一键触发对某个 moment（photo）的 AI 人脸提取。
 *
 * 后端：POST /api/faces/moments/:momentId/extract
 * 通过既有 useExtractFaces hook 调用，无需自行处理错误展示
 * （错误由 useMutation.error 暴露给上层；本任务范围只做按钮 + 嵌点 + 测试）。
 */
export function ExtractFaceButton({ momentId }) {
  const m = useExtractFaces();
  return (
    <button
      type="button"
      onClick={() => m.mutate(momentId)}
      disabled={m.isPending}
      aria-label="extract faces"
    >
      {m.isPending ? '提取中…' : '✨ 提取人脸'}
    </button>
  );
}
