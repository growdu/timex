import { useState } from "react";

const ACTIONS = [
  { icon: "＋", label: "新建事件", type: "event" },
  { icon: "📍", label: "添加地点", type: "place" },
  { icon: "👤", label: "添加人物", type: "person" },
  { icon: "📖", label: "创建回忆录", type: "memoir" },
];

export default function FabStack({ onAddEntity }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fab-stack">
      {open && (
        <div className="fab-menu" role="menu">
          {ACTIONS.map((a) => (
            <button
              key={a.type}
              type="button"
              className="fab-menu-item"
              onClick={() => {
                onAddEntity(a.type);
                setOpen(false);
              }}
            >
              <span>{a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className={`fab-button ${open ? "is-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "关闭菜单" : "打开添加菜单"}
        aria-expanded={open}
      >
        {open ? "×" : "＋"}
      </button>
    </div>
  );
}
