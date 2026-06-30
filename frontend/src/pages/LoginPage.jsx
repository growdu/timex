import { useState } from "react";
import { Link } from "react-router-dom";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("demo@timex.com");
  const [password, setPassword] = useState("demo123");
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

  return (
    <div className="auth-shell">
      <section className="auth-story">
        <div className="brand">
          <div className="brand-mark">时</div>
          <div>
            <h1>时光机器</h1>
            <p>个人成长记录与人生回忆沉淀系统</p>
          </div>
        </div>

        <div className="auth-hero">
          <span className="section-eyebrow">Welcome Back</span>
          <h2>记录你的成长，沉淀你的回忆。</h2>
          <p>
            登录后进入你的时间、空间、人物记忆工作台。多维度回顾人生每一个重要时刻。
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
              <strong>回忆录编辑器</strong>
              <span>章节树、正文区、来源库同时展开</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <span className="section-eyebrow">Sign In</span>
          <h2>登录账号</h2>
          <p className="auth-note">
            使用你的邮箱和密码登录。开发模式下可使用测试账号。
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>邮箱</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="your@email.com"
              />
            </label>
            <label className="auth-field">
              <span>密码</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="Enter password"
              />
            </label>
            <button
              className="primary-button auth-submit"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "登录中..." : "登录"}
            </button>
            {error ? <p className="auth-error">{error}</p> : null}
          </form>

          <p className="auth-note" style={{ marginTop: 16 }}>
            还没有账号？<Link to="/register">免费注册一个</Link>
          </p>
        </div>

        <div className="auth-card">
          <div className="panel-title">
            <div>
              <span className="section-eyebrow">Demo Mode</span>
              <h2>测试账号</h2>
            </div>
          </div>

          <div className="demo-account-list">
            <button
              className="demo-account"
              type="button"
              onClick={() => {
                setEmail("demo@timex.com");
                setPassword("demo123");
              }}
            >
              <div className="demo-account-top">
                <strong>demo · 时光记录者</strong>
                <span>创业 · 旅行 · 家庭</span>
              </div>
              <p>包含完整的时间线、人物、地点示例数据</p>
              <small>demo@timex.com / demo123</small>
            </button>

            <button
              className="demo-account"
              type="button"
              onClick={() => {
                setEmail("maker@timex.test");
                setPassword("timex2026");
              }}
            >
              <div className="demo-account-top">
                <strong>maker · 周屿</strong>
                <span>城市迁移型创作者</span>
              </div>
              <p>北京 → 杭州 → 深圳，记录三段城市迁移与同行者</p>
              <small>maker@timex.test / timex2026</small>
            </button>

            <button
              className="demo-account"
              type="button"
              onClick={() => {
                setEmail("family@timex.test");
                setPassword("timex2026");
              }}
            >
              <div className="demo-account-top">
                <strong>family · 沈棠</strong>
                <span>家庭档案整理者</span>
              </div>
              <p>小满的出生、入学、夏令营，三代人的家庭相册</p>
              <small>family@timex.test / timex2026</small>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
