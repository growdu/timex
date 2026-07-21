import { useState } from "react";
import { Link } from "react-router-dom";

const DEMO_ACCOUNTS = [
  { value: "demo", email: "demo@timex.com", password: "demo123", label: "时光记录者（创业·旅行·家庭）" },
  { value: "maker", email: "maker@timex.test", password: "timex2026", label: "周屿（城市迁移型创作者）" },
  { value: "family", email: "family@timex.test", password: "timex2026", label: "沈棠（家庭档案整理者）" },
];

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("demo@timex.com");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState("demo");

  const handleSubmit = async (event) => {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    setError("");
    setIsLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err && err.message ? err.message : "登录失败，请检查账号密码");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoClick = (value) => {
    const d = DEMO_ACCOUNTS.find((a) => a.value === value);
    if (!d) return;
    setEmail(d.email);
    setPassword(d.password);
    setActiveDemo(value);
  };

  return (
    <div className="auth-page auth-page-split">
      <div className="auth-card auth-card-center">
        <Link to="/" className="auth-back">← 返回首页</Link>
        <span className="section-eyebrow">Sign In</span>
        <h2>登录</h2>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>邮箱</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="your@email.com"
              required
            />
          </label>
          <label className="auth-field">
            <span>密码</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Enter password"
              required
            />
          </label>
          <button className="primary-button auth-submit" type="submit" disabled={isLoading}>
            {isLoading ? "登录中..." : "登录"}
          </button>
          {error ? <p className="auth-error">{error}</p> : null}
        </form>

        <div className="auth-divider" />

        <p className="auth-note">
          还没有账号？<Link to="/register">免费注册（14 天试用）</Link>
        </p>
      </div>

      <aside className="auth-brand">
        <div className="auth-brand-inner">
          <span className="brand-eyebrow">Timex</span>
          <h1 className="brand-title">时光机器</h1>
          <p className="brand-tagline">个人成长记录与人生回忆沉淀系统</p>
          <p className="brand-pitch">记录你的成长，沉淀你的回忆。</p>

          <ul className="demo-account-list">
            {DEMO_ACCOUNTS.map((d) => (
              <li key={d.value}>
                <button
                  type="button"
                  className={`demo-account-button ${activeDemo === d.value ? "is-active" : ""}`}
                  onClick={() => handleDemoClick(d.value)}
                  data-demo-value={d.value}
                >
                  {d.value} · {d.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
