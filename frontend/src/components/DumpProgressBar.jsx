/**
 * DumpProgressBar — 三段进度条（done / failed / pending）。
 *
 * props:
 *   - total  : number  总数
 *   - done   : number  已完成
 *   - failed : number  失败
 *
 * 算法：
 *   pending = max(total - done - failed, 0)
 *   三段百分比按各自 / total 计算，total=0 时三段都 0。
 */
export function DumpProgressBar({ total = 0, done = 0, failed = 0 }) {
  const safeTotal = Math.max(total, 0);
  const safeDone = Math.max(done, 0);
  const safeFailed = Math.max(failed, 0);
  const pending = Math.max(safeTotal - safeDone - safeFailed, 0);

  const pct = (n) => (safeTotal > 0 ? Math.round((n / safeTotal) * 100) : 0);

  const donePct = pct(safeDone);
  const failedPct = pct(safeFailed);
  const pendingPct = pct(pending);

  return (
    <div className="dump-progress" aria-label="dump 进度">
      <div className="dump-progress-track">
        {donePct > 0 && (
          <div
            className="dump-progress-seg done"
            style={{ width: `${donePct}%` }}
            title={`已完成 ${safeDone}`}
          />
        )}
        {failedPct > 0 && (
          <div
            className="dump-progress-seg failed"
            style={{ width: `${failedPct}%` }}
            title={`失败 ${safeFailed}`}
          />
        )}
        {pendingPct > 0 && (
          <div
            className="dump-progress-seg pending"
            style={{ width: `${pendingPct}%` }}
            title={`等待 ${pending}`}
          />
        )}
      </div>
      <div className="dump-progress-summary">
        {safeDone}/{safeTotal}
        {safeFailed > 0 && (
          <span className="dump-progress-failed"> · 失败 {safeFailed}</span>
        )}
      </div>
    </div>
  );
}

export default DumpProgressBar;
