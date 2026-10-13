import { useRef, useState } from 'react';
import { uploadApi } from '../api/upload';
import { scratchDumpsApi } from '../api/faces';

/**
 * DumpUploader — 上传一张/批照片到指定 scratch dump。
 *
 * 流程（串行，每张文件独立进度回调）：
 *   1) uploadApi.presign()      拿签名 PUT url + key
 *   2) uploadApi.uploadToUrl()  PUT 到 OSS（XHR，可读 0-100 进度）
 *   3) uploadApi.complete()     后端校验 + 返回 permanent URL（签名 15min 过期后会 403，所以不能用 presigned url 持久化）
 *   4) scratchDumpsApi.addItem(dumpId, { imageUrl: <permanent>, filename? })
 *
 * props:
 *   - dumpId    : string  目标 dump id
 *   - onItemAdded?: (item) => void   每张照片 back 端 addItem 成功后回调
 *   - onAllDone?: (results) => void 全部文件处理完毕回调（含失败）
 *
 * 内部状态：
 *   - files : 选中文件列表（显示用，before upload）
 *   - items : { name, status: 'queued'|'uploading'|'done'|'error', percent? }[]
 *   - busy  : boolean 任一文件还在上传中
 */
export function DumpUploader({ dumpId, onItemAdded, onAllDone }) {
  const inputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);

  const handlePick = (e) => {
    const fs = Array.from(e.target.files || []);
    if (fs.length === 0) return;
    const seeded = fs.map((f) => ({ name: f.name, status: 'queued', percent: 0 }));
    setItems((prev) => [...prev, ...seeded]);
    void runUpload(fs, seeded);
    // allow re-picking same files
    if (inputRef.current) inputRef.current.value = '';
  };

  async function runUpload(files, seeded) {
    setBusy(true);
    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const itemKey = seeded[i].name;
      try {
        markItem(itemKey, { status: 'uploading', percent: 0 });

        // 1) presign
        const presigned = await uploadApi.presign({
          kind: 'photo',
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
        });

        // 2) PUT to OSS
        await uploadApi.uploadToUrl(presigned.url, file, (pct) => {
          markItem(itemKey, { percent: pct });
        });

        markItem(itemKey, { status: 'registering', percent: 100 });

        // 3) 通知后端完成 → 拿到 permanent URL（不能直接用 presigned.url，它 15min 后会 403）
        const completed = await uploadApi.complete({
          key: presigned.key,
          filename: file.name,
        });

        // 4) 注册到 dump（用 permanent URL）
        const created = await scratchDumpsApi.addItem(dumpId, {
          imageUrl: completed.url,
          filename: file.name,
        });

        markItem(itemKey, { status: 'done', percent: 100 });
        results.push({ ok: true, name: file.name, created });
        if (onItemAdded) onItemAdded(created);
      } catch (err) {
        markItem(itemKey, { status: 'error', percent: 0 });
        results.push({ ok: false, name: file.name, error: err });
      }
    }
    setBusy(false);
    if (onAllDone) onAllDone(results);
  }

  function markItem(name, patch) {
    setItems((prev) =>
      prev.map((it) => (it.name === name ? { ...it, ...patch } : it)),
    );
  }

  return (
    <div className="dump-uploader">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePick}
        style={{ display: 'none' }}
        data-testid="dump-uploader-input"
      />
      <button
        type="button"
        className="primary"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        data-testid="dump-uploader-pick"
      >
        {busy ? '上传中…' : '选择图片'}
      </button>

      {items.length > 0 && (
        <ul className="dump-uploader-list">
          {items.map((it) => (
            <li key={it.name} className={`dump-uploader-item status-${it.status}`}>
              <span className="name">{it.name}</span>
              <span className="status">
                {it.status === 'done' && '✓'}
                {it.status === 'error' && '✗'}
                {it.status === 'uploading' && `${it.percent ?? 0}%`}
                {it.status === 'registering' && '注册中…'}
                {it.status === 'queued' && '等待中'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DumpUploader;
