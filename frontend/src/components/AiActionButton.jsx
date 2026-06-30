import { useAiJob } from '../hooks/useAiJob';

/**
 * AiActionButton — 一键触发 AI 的小按钮，带 loading/retry。
 *
 * 用法：
 *   <AiActionButton
 *     kind="image-tag"
 *     args={{ momentId: m.id, mediaUrl: m.mediaUrl }}
 *     label="AI 打标签"
 *     onSettled={(job) => refreshMoment()}
 *   />
 */
export function AiActionButton({
  kind,
  args,
  label,
  onSettled,
  className = '',
  disabled = false,
}) {
  const { submit, isLoading, job, isDone, isFailed, error, reset } = useAiJob({
    onSettled,
  });

  const handleClick = async () => {
    try {
      await submit(kind, args);
    } catch {
      // error 已存到 state；不弹 alert
    }
  };

  let status = 'idle';
  if (isLoading) status = 'loading';
  else if (isDone) status = 'done';
  else if (isFailed) status = 'failed';

  return (
    <button
      type="button"
      className={`ai-action-btn ai-action-${status} ${className}`}
      onClick={handleClick}
      disabled={disabled || isLoading}
      title={
        status === 'done' ? `AI 完成：${(job?.output ?? '').slice(0, 60)}` :
        status === 'failed' ? `失败：${error?.message ?? '未知'}（点击重试）` :
        status === 'loading' ? 'AI 处理中…' :
        label
      }
    >
      {status === 'loading' && <span className="ai-spinner" />}
      {status === 'done' && <span className="ai-mark">✓</span>}
      {status === 'failed' && <span className="ai-mark">!</span>}
      <span className="ai-label">
        {status === 'loading' ? '处理中…' :
         status === 'done' ? '完成' :
         status === 'failed' ? '重试' :
         label}
      </span>
      {status === 'failed' && (
        <span className="ai-retry-hint" onClick={(e) => { e.stopPropagation(); reset(); handleClick(); }}>
          ↻
        </span>
      )}
    </button>
  );
}