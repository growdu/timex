import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SelfProfileCard } from '../components/SelfProfileCard';
import { FaceResultTabs } from '../components/FaceResultTabs';
import { FaceProfileSetupModal } from '../components/FaceProfileSetupModal';
import { useFaceSearch } from '../hooks/useFaceSearch';
import { useStartBackfill, useBackfillStatus } from '../hooks/useFaceBackfill';

/**
 * /faces 页面 — 面孔中心。
 *
 * URL 状态机（query string）：
 *   - `?mode=setup`  →  打开添加参考 modal
 *   - `?mode=search` →  触发一次人脸检索 + 渲染三 Tab 视图
 *   - 无 mode        →  总览（SelfProfileCard + 历史回填按钮）
 *
 * 数据获取：
 *   - useFaceSearch：仅在 mode === 'search' 时启用（避免空转）
 *   - useBackfillStatus：1s 轮询，直到 status !== 'running'
 */
export default function FacesPage() {
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode');

  const search = useFaceSearch({ threshold: 0.6, topK: 200 }, mode === 'search');
  const backfill = useStartBackfill();
  const status = useBackfillStatus();

  // 兼容后端两种返回（数组 / {hits:[]}/ {data:[]}）
  const rawHits = search.data;
  const hits = Array.isArray(rawHits)
    ? rawHits
    : rawHits?.hits ?? rawHits?.data ?? [];

  const [selectedMoment, setSelectedMoment] = useState(null);

  const handleCloseModal = () => setParams({});

  const isBackfillBusy =
    backfill.isPending || status.data?.status === 'running';

  return (
    <div className="faces-page">
      <header className="faces-page-header">
        <h1>面孔中心</h1>
        <p>用自己的人脸 embedding 找回所有照片。</p>
      </header>

      <SelfProfileCard />

      <section className="backfill">
        <h2>历史回填</h2>
        <button
          type="button"
          onClick={() => backfill.mutate()}
          disabled={isBackfillBusy}
        >
          {isBackfillBusy ? '处理中…' : '一次性回填所有照片'}
        </button>
        {status.data && (
          <span className="progress">
            {' '}
            {status.data.processed ?? 0}/{status.data.total ?? 0}
          </span>
        )}
      </section>

      {mode === 'search' && (
        <section className="faces-results">
          {search.isLoading && <div className="loading">检索中…</div>}
          {search.isError && (
            <div className="error">检索出错：{String(search.error?.message ?? search.error)}</div>
          )}
          {!search.isLoading && !search.isError && (
            <FaceResultTabs
              hits={hits}
              allPeople={[]}
              places={[]}
              onSelectMoment={setSelectedMoment}
            />
          )}
          {selectedMoment && (
            <pre className="hit-debug">{JSON.stringify(selectedMoment, null, 2)}</pre>
          )}
        </section>
      )}

      <FaceProfileSetupModal
        open={mode === 'setup'}
        onClose={handleCloseModal}
      />
    </div>
  );
}