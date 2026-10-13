import { useState } from 'react';
import { useAddReference } from '../hooks/useFaceProfile';

/**
 * 添加人脸参考 Modal。
 *
 * 输入：本人正脸照片 OSS URL（直传后回填 URL）。
 * 调用：`useAddReference` → POST /faces/me/references，body 形状 `{ imageUrl }`。
 * 成功后自动 invalidate faceKeys.me()，SelfProfileCard 会即时刷新。
 */
export function FaceProfileSetupModal({ open, onClose }) {
  const [url, setUrl] = useState('');
  const add = useAddReference();

  if (!open) return null;

  const handleConfirm = async () => {
    try {
      await add.mutateAsync({ imageUrl: url });
      setUrl('');
      onClose && onClose();
    } catch (e) {
      // 失败时让上层 React Query 的 error 状态暴露；不主动关闭 modal
      // eslint-disable-next-line no-console
      console.warn('addReference failed', e);
    }
  };

  return (
    <div className="modal-mask" role="dialog" aria-modal="true">
      <div className="modal">
        <h3>添加人脸参考</h3>
        <p>请输入本人正脸照片 URL（OSS 直传后回填）</p>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          aria-label="image url"
        />
        <div className="actions">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="primary"
            disabled={!url || add.isPending}
            onClick={handleConfirm}
          >
            {add.isPending ? '上传中…' : '确定'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FaceProfileSetupModal;