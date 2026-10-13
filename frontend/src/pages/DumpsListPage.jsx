import { useNavigate } from 'react-router-dom';
import { useScratchDumps, useRemoveDump } from '../hooks/useScratchDumps';
import { DumpCard } from '../components/DumpCard';

/**
 * /faces/dumps — scratch dump 列表页。
 *
 * 数据来源：useScratchDumps → scratchDumpsApi.list()
 * 操作：
 *   - 点 + 新建 → /faces/dumps/new
 *   - 点卡片 → /faces/dumps/:id
 *   - 删除按钮 → useRemoveDump mutation（成功后自动刷新列表）
 */
export default function DumpsListPage() {
  const nav = useNavigate();
  const { data, isLoading, isError, error } = useScratchDumps();
  const remove = useRemoveDump();

  // 兼容后端返回（数组 / { dumps: [] } / { data: [] }）
  const rawDumps = data;
  const dumps = Array.isArray(rawDumps)
    ? rawDumps
    : rawDumps?.dumps ?? rawDumps?.data ?? [];

  const handleRemove = (id) => {
    if (window.confirm('确定删除这个 dump？照片项目也会一并删除。')) {
      remove.mutate(id);
    }
  };

  return (
    <div className="dumps-list-page">
      <header className="dumps-list-header">
        <h1>临时检索</h1>
        <p>上传一批照片做一次性比对，不会进入时光库。</p>
        <button
          type="button"
          className="primary"
          onClick={() => nav('/faces/dumps/new')}
          data-testid="dumps-new-button"
        >
          + 新建 dump
        </button>
      </header>

      {isLoading && <div className="loading">加载中…</div>}

      {isError && (
        <div className="error">载入失败：{String(error?.message ?? error)}</div>
      )}

      {!isLoading && !isError && dumps.length === 0 && (
        <div className="empty">还没有 dump，去新建一个吧。</div>
      )}

      {!isLoading && !isError && dumps.length > 0 && (
        <ul className="dumps-list">
          {dumps.map((d) => (
            <li key={d.id}>
              <DumpCard dump={d} onRemove={handleRemove} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
