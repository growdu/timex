import { useState } from "react";
import { Link } from "react-router-dom";

const DEMOS = [
  { value: "", label: "体验账号 ▾" },
  { value: "demo", email: "demo@timex.com", password: "demo123", label: "时光记录者（创业·旅行·家庭）" },
  { value: "maker", email: "maker@timex.test", password: "timex2026", label: "周屿（城市迁移型创作者）" },
  { value: "family", email: "family@timex.test", password: "timex2026", label: "沈棠（家庭档案整理者）" },
];

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message || "登录失败，请检查账号密码");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemo = (value) => {
    const d = DEMOS.find((a) => a.value === value);
    if (d?.email) { setEmail(d.email); setPassword(d.password); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-center">
        <Link to="/" className="auth-back">← 返回首页</Link>
        <span className="section-eyebrow">Sign In</span>
        <h2>登录</h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>邮箱</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="your@email.com" required />
          </label>
          <label className="auth-field">
            <span>密码</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" required />
          </label>
          <button className="primary-button auth-submit" type="submit" disabled={isLoading}>
            {isLoading ? "登录中..." : "登录"}
          </button>
          {error ? <p className="auth-error">{error}</p> : null}
        </form>
        <div className="auth-divider" />
        <p className="auth-note">还没有账号？<Link to="/register">免费注册（14 天试用）</Link></p>
        <select className="demo-select" defaultValue="" onChange={(e) => handleDemo(e.target.value)}>
          {DEMOS.map((d) => (
            <option key={d.value || "ph"} value={d.value}>{d.label}{d.email ? ` - ${d.email}` : ""}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
