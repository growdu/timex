import { useNavigate } from 'react-router-dom';
import { useFaceMe } from '../hooks/useFaceProfile';

/**
 * SelfProfileCard — 「我的画像」卡。
 *
 * 展示当前用户的人脸参考张数 / 启用计数，提供两个入口：
 *   - 「添加参考」  →  /faces?mode=setup   (打开 FaceProfileSetupModal)
 *   - 「找我的照片」 → /faces?mode=search  (触发检索，需 hasProfile=true)
 *
 * 当 hasProfile=false（无任何参考）时，禁用「找我的照片」按钮。
 */
export function SelfProfileCard() {
  const me = useFaceMe();
  const nav = useNavigate();

  if (me.isLoading) {
    return <div className="card self-card">加载中…</div>;
  }

  const profile = me.data;
  const hasProfile = profile?.hasProfile;
  const referenceCount = profile?.referenceCount ?? 0;
  const enabledCount = profile?.enabledCount ?? 0;

  return (
    <div className="card self-card">
      <div className="avatar" aria-hidden="true">我</div>
      <div className="info">
        <h3>我的画像</h3>
        <p>
          {referenceCount} 张参考 / {enabledCount} 启用
        </p>
      </div>
      <div className="actions">
        <button type="button" onClick={() => nav('/faces?mode=setup')}>
          添加参考
        </button>
        <button
          type="button"
          className="primary"
          disabled={!hasProfile}
          onClick={() => nav('/faces?mode=search')}
          title={!hasProfile ? '请先添加至少 1 张参考' : undefined}
        >
          找我的照片 →
        </button>
      </div>
    </div>
  );
}

export default SelfProfileCard;