import { useCallback, useEffect, useRef, useState } from 'react';
import { aiApi } from '../api/ai';

/**
 * useAiJob — 提交一个 AI 任务并轮询其状态直到终态。
 *
 * 用法：
 *   const { submit, job, isLoading, isDone, error, reset } = useAiJob({
 *     pollIntervalMs: 1500,
 *     timeoutMs: 60000,
 *   });
 *   await submit('image-tag', { momentId, mediaUrl });
 *
 * job 状态: null | { id, status: 'queued'|'running'|'succeeded'|'failed', ... }
 */
export function useAiJob(options = {}) {
  const { pollIntervalMs = 1500, timeoutMs = 60_000, onSettled } = options;
  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);
  const startedAtRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const submit = useCallback(
    async (kind, args) => {
      setError(null);
      setJob(null);
      setIsLoading(true);
      startedAtRef.current = Date.now();
      try {
        let initial;
        switch (kind) {
          case 'image-tag':
            initial = await aiApi.tagImage(args.momentId, args);
            break;
          case 'image-summary':
            initial = await aiApi.summarizeImage(args.momentId, args);
            break;
          case 'transcribe':
            initial = await aiApi.transcribe(args.momentId, args);
            break;
          case 'memoir-summary':
            initial = await aiApi.summarizeMemoir(args.memoirId, args.text);
            break;
          case 'chapter-summary':
            initial = await aiApi.summarizeChapter(args.chapterId, args.text);
            break;
          case 'event-summary':
            initial = await aiApi.summarizeEvent(args.eventId, args.text);
            break;
          default:
            throw new Error(`Unknown AI kind: ${kind}`);
        }
        setJob(initial);

        // 如果已经终态（mock 跑得飞快），直接返回
        if (initial.status === 'succeeded' || initial.status === 'failed') {
          setIsLoading(false);
          if (onSettled) onSettled(initial);
          return initial;
        }

        // 开始轮询
        await new Promise((resolve, reject) => {
          pollRef.current = setInterval(async () => {
            const elapsed = Date.now() - startedAtRef.current;
            if (elapsed > timeoutMs) {
              stopPolling();
              setIsLoading(false);
              const err = new Error('AI job timed out');
              setError(err);
              reject(err);
              return;
            }
            try {
              const fresh = await aiApi.getJob(initial.id);
              setJob(fresh);
              if (fresh.status === 'succeeded' || fresh.status === 'failed') {
                stopPolling();
                setIsLoading(false);
                if (fresh.status === 'failed') {
                  setError(new Error(fresh.error || 'AI job failed'));
                  reject(new Error(fresh.error || 'AI job failed'));
                } else {
                  if (onSettled) onSettled(fresh);
                  resolve(fresh);
                }
              }
            } catch (e) {
              // 单次轮询失败不中断，继续
              // eslint-disable-next-line no-console
              console.warn('ai poll failed', e);
            }
          }, pollIntervalMs);
        });

        return initial; // 实际返回值在 job state 里
      } catch (e) {
        setIsLoading(false);
        setError(e);
        throw e;
      }
    },
    [onSettled, pollIntervalMs, stopPolling, timeoutMs],
  );

  const reset = useCallback(() => {
    stopPolling();
    setJob(null);
    setIsLoading(false);
    setError(null);
  }, [stopPolling]);

  return {
    submit,
    reset,
    job,
    isLoading,
    isDone: job?.status === 'succeeded',
    isFailed: job?.status === 'failed',
    error,
  };
}