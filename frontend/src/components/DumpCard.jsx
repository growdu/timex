import { useNavigate } from 'react-router-dom';
import { DumpProgressBar } from './DumpProgressBar';

/**
 * DumpCard — 单个 scratch dump 卡片。
 *
 * 展示 name / description / status / hits_count / 进度条。
 * 点击卡片跳到详情页 `/faces/dumps/:id`。
 *
 * props:
 *   - dump : { id, name, description, status, totalItems, doneItems, failedItems, hitsCount }
 */
export function DumpCard({ dump, onRemove }) {
  const nav = useNavigate();

  if (!dump) return null;

  const {
    id,
    name,
    description,
    status,
    totalItems = 0,
    doneItems = 0,
    failedItems = 0,
    hitsCount = 0,
  } = dump;

  const handleOpen = () => nav(`/faces/dumps/${id}`);

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove) onRemove(id);
  };

  return (
    <div
      className="card dump-card"
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpen();
        }
      }}
      data-testid={`dump-card-${id}`}
    >
      <div className="dump-card-head">
        <h3 className="dump-card-name">{name}</h3>
        <span className={`dump-card-status status-${status || 'created'}`}>{status || 'created'}</span>
      </div>

      {description && <p className="dump-card-desc">{description}</p>}

      <DumpProgressBar
        total={totalItems}
        done={doneItems}
        failed={failedItems}
      />

      <div className="dump-card-meta">
        <span>命中 {hitsCount}</span>
        {onRemove && (
          <button
            type="button"
            className="dump-card-remove"
            onClick={handleRemove}
            aria-label="删除 dump"
            data-testid={`dump-remove-${id}`}
          >
            删除
          </button>
        )}
      </div>
    </div>
  );
}

export default DumpCard;
