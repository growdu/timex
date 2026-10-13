import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateDump } from '../hooks/useScratchDumps';

/**
 * /faces/dumps/new — 新建 scratch dump 表单。
 *
 * 字段：
 *   - name        (必填)
 *   - description (可选)
 *
 * 提交后 create mutation 成功 → 跳到详情页 /faces/dumps/:id。
 */
export default function DumpNewPage() {
  const nav = useNavigate();
  const create = useCreateDump();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const dump = await create.mutateAsync({
      name: trimmedName,
      description: description.trim() || undefined,
    });
    if (dump?.id) {
      nav(`/faces/dumps/${dump.id}`);
    }
  };

  const handleCancel = () => nav('/faces/dumps');

  return (
    <div className="dump-new-page">
      <header className="dump-new-header">
        <h1>新建 dump</h1>
        <p>起一个名字便于查找，之后可以上传照片做临时检索。</p>
      </header>

      <form className="dump-new-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="label">名称 *</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：2024 春游照片"
            required
            data-testid="dump-new-name"
          />
        </label>

        <label className="field">
          <span className="label">描述（可选）</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="记录这次的目的 / 来源 / 时间范围…"
            rows={4}
            data-testid="dump-new-description"
          />
        </label>

        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            onClick={handleCancel}
            disabled={create.isPending}
          >
            取消
          </button>
          <button
            type="submit"
            className="primary"
            disabled={create.isPending || !name.trim()}
            data-testid="dump-new-submit"
          >
            {create.isPending ? '创建中…' : '创建'}
          </button>
        </div>

        {create.isError && (
          <div className="error">创建失败：{String(create.error?.message ?? create.error)}</div>
        )}
      </form>
    </div>
  );
}
