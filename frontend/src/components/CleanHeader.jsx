import { NavLink } from "react-router-dom";
import { timexData } from "../mock/timexData";

export default function CleanHeader({ activeNav, session, onLogout, pageNotice }) {
  const navItems = timexData?.navViews || [];
  return (
    <header className="clean-header">
      <div className="brand">
        <div className="brand-mark">时</div>
        <div>
          <strong>时光机器</strong>
          <span>{pageNotice || ""}</span>
        </div>
      </div>
      <nav className="clean-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            className={({ isActive }) =>
              `clean-nav-link ${isActive || activeNav === item.id ? "is-active" : ""}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="clean-actions">
        <span className="clean-user">{session?.name || "用户"}</span>
        <button className="ghost-button" type="button" onClick={onLogout}>
          退出
        </button>
      </div>
    </header>
  );
}
