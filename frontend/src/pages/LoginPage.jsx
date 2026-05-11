import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage({ accounts, onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState(accounts[0]?.email || "");
  const [password, setPassword] = useState("timex2026");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const account = accounts.find((item) => item.email === email && item.password === password);
    if (!account) {
      setError("账号或密码不匹配，请使用测试账号。");
      return;
    }
    onLogin(account);
    navigate("/timeline");
  };

  return (
    <div className="auth-shell">
      <section className="auth-story">
        <div className="brand">
          <div className="brand-mark">时</div>
          <div>
            <h1>时光机器 Frontend</h1>
            <p>React/Vite 工程骨架 · 静态测试数据演示版</p>
          </div>
        </div>

        <div className="auth-hero">
          <span className="section-eyebrow">Prototype Access</span>
          <h2>先登录，再进入你的时间、空间、人物记忆工作台。</h2>
          <p>
            这一步不接真实后端，只模拟正式产品的入口形态、会话状态和不同类型用户的工作场景。
          </p>
          <div className="auth-feature-grid">
            <div className="auth-feature">
              <strong>时间线总览</strong>
              <span>事件优先，而不是素材平铺</span>
            </div>
            <div className="auth-feature">
              <strong>多页面详情结构</strong>
              <span>事件、地点、人物都有独立路由</span>
            </div>
            <div className="auth-feature">
              <strong>更细的回忆录编辑器</strong>
              <span>章节树、正文区、来源库同时展开</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <span className="section-eyebrow">Sign In</span>
          <h2>登录演示账号</h2>
          <p className="auth-note">
            任意一个测试账号都能进入完整原型。密码统一为 <code>timex2026</code>。
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>邮箱</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
            </label>
            <label className="auth-field">
              <span>密码</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
              />
            </label>
            <button className="primary-button auth-submit" type="submit">
              进入原型
            </button>
            {error ? <p className="auth-error">{error}</p> : null}
          </form>
        </div>

        <div className="auth-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Demo Accounts</span>
              <h2>一键登录</h2>
            </div>
          </div>

          <div className="demo-account-list">
            {accounts.map((account) => (
              <button
                key={account.id}
                className="demo-account"
                type="button"
                onClick={() => {
                  onLogin(account);
                  navigate("/timeline");
                }}
              >
                <div className="demo-account-top">
                  <strong>{account.name}</strong>
                  <span>{account.role}</span>
                </div>
                <p>{account.summary}</p>
                <small>{account.email}</small>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
