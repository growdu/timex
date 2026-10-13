import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useScratchDumps, dumpKeys } from '../hooks/useScratchDumps';
import { useDumpStatus } from '../hooks/useDumpStatus';
import { useDumpSearch } from '../hooks/useDumpSearch';
import { scratchDumpsApi } from '../api/faces';
import { DumpUploader } from '../components/DumpUploader';
import { DumpProgressBar } from '../components/DumpProgressBar';
import { DumpTimelineView } from '../components/DumpTimelineView';

/**
 * /faces/dumps/:id — scratch dump 详情页。
 *
 * 装配：
 *   - useScratchDumps()              触发列表缓存保持新鲜（不消费返回值）
 *   - useQuery(dumpKeys.detail(id))  单 dump 元数据（name / description）
 *   - useDumpStatus(id)              进度轮询（processing 时 1s 间隔）
 *   - useDumpSearch()                触发 /faces/dumps/:id/search 的 mutation
 *   - <DumpProgressBar>              三段进度条
 *   - <DumpUploader>                 继续往 dump 加照片
 *   - <DumpTimelineView>             检索结果按年份分组
 */
export function DumpDetailPage() {
  const { id } = useParams();
  // 让 navbar 顶面高亮保持（已有列表 hook 的标准用法）；不调用返回值，避免"trigger invalidate"误导
  useScratchDumps();

  const dumpQuery = useQuery({
    queryKey: dumpKeys.detail(id),
    queryFn: () => scratchDumpsApi.get(id),
    enabled: Boolean(id),
  });
  const statusQuery = useDumpStatus(id);
  const search = useDumpSearch();
  const [hits, setHits] = useState([]);

  async function doSearch() {
    try {
      const r = await search.mutateAsync({ dumpId: id, opts: { topK: 200 } });
      setHits(Array.isArray(r) ? r : (r?.hits ?? []));
    } catch {
      // 失败由 search.error 反映在 button disabled + UI 层面；页面不致崩
      setHits([]);
    }
  }

  return (
    <div className="dump-detail-page">
      <header>
        <Link to="/faces/dumps" className="back-link">← 返回</Link>
        <h1 data-testid="dump-detail-title">{dumpQuery.data?.name ?? '加载中…'}</h1>
        {dumpQuery.data?.description && <p className="desc">{dumpQuery.data.description}</p>}
      </header>

      {statusQuery.data && (
        <DumpProgressBar
          total={statusQuery.data.total ?? 0}
          done={statusQuery.data.done ?? 0}
          failed={statusQuery.data.failed ?? 0}
        />
      )}

      <DumpUploader dumpId={id} />

      <div className="search-row">
        <button
          type="button"
          onClick={doSearch}
          disabled={search.isPending}
          data-testid="dump-filter-button"
          aria-label="filter faces"
        >
          {search.isPending ? '过滤中…' : '✨ 过滤'}
        </button>
        {search.error && (
          <span className="error">过滤失败：{String(search.error?.message ?? search.error)}</span>
        )}
      </div>

      {(hits.length > 0 || search.isSuccess) && <DumpTimelineView hits={hits} />}
    </div>
  );
}

export default DumpDetailPage;
