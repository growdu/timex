import { useState } from "react";
import { Link } from "react-router-dom";

const MOOD_PRESETS = [
  { emoji: "☀️", label: "阳光", note: "今天心情明澈" },
  { emoji: "🌧", label: "雨天", note: "适合整理旧照片" },
  { emoji: "🌙", label: "夜深", note: "适合写一段回忆录" },
  { emoji: "✈️", label: "远行", note: "新坐标等待记录" },
];

function pickMood() {
  // Hash by date so the mood is stable for a given day
  const day = new Date();
  const idx = (day.getDate() + day.getMonth()) % MOOD_PRESETS.length;
  return MOOD_PRESETS[idx];
}

export default function FabStack() {
  const [open, setOpen] = useState(false);
  const mood = pickMood();

  return (
    <div className="fab-stack" aria-live="polite">
      {open && (
        <div className="fab-menu" role="menu">
          <Link to="/timeline" className="fab-menu-item" onClick={() => setOpen(false)}>
            <span>＋</span>
            <span>新建事件</span>
          </Link>
          <Link to="/memoir" className="fab-menu-item" onClick={() => setOpen(false)}>
            <span>✎</span>
            <span>写章节</span>
          </Link>
          <Link to="/space" className="fab-menu-item" onClick={() => setOpen(false)}>
            <span>◎</span>
            <span>探索空间</span>
          </Link>
          <Link to="/people" className="fab-menu-item" onClick={() => setOpen(false)}>
            <span>♡</span>
            <span>关系网络</span>
          </Link>
          <Link to="/lines" className="fab-menu-item" onClick={() => setOpen(false)}>
            <span>✦</span>
            <span>按线查看</span>
          </Link>
        </div>
      )}

      <div className="fab-mood">
        <span className="fab-mood-emoji" aria-hidden="true">{mood.emoji}</span>
        <span className="fab-mood-label">
          <strong>今日心情 · {mood.label}</strong>
          <span>{mood.note}</span>
        </span>
      </div>

      <button
        type="button"
        className={`fab-button ${open ? "is-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "关闭快捷菜单" : "打开快捷菜单"}
        aria-expanded={open}
      >
        {open ? "×" : "＋"}
      </button>
    </div>
  );
}
