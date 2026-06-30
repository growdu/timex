import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/auth.js";

export default function RegisterPage({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email || !password) {
      setError("请填写邮箱和密码");
      return;
    }
    if (password.length < 8) {
      setError("密码至少 8 位");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setIsLoading(true);
    try {
      const data = await authApi.register({
        email,
        password,
        nickname: nickname || undefined,
      });
      // Backend returns { user, tokens } — feed tokens into the existing login mutation flow
      if (data.tokens && onLogin) {
        await onLogin(email, password);
      }
      navigate("/timeline", { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "注册失败，请稍后再试";
      setError(Array.isArray(message) ? message.join("；") : message);
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
          <span className="section-eyebrow">Create Your Vault</span>
          <h2>开启一段属于自己的时光档案。</h2>
          <p>
            注册后即可拥有独立的时间、空间、人物记忆工作台。所有数据相互隔离，登录后立即开始记录。
          </p>
          <div className="auth-feature-grid">
            <div className="auth-feature">
              <strong>14 天试用授权</strong>
              <span>注册即生成默认 License，可立即体验全部核心功能</span>
            </div>
            <div className="auth-feature">
              <strong>数据完全隔离</strong>
              <span>每个用户拥有独立的事件、地点、人物、回忆录空间</span>
            </div>
            <div className="auth-feature">
              <strong>多设备同步</strong>
              <span>登录即可在多台设备上访问同一份成长档案</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <span className="section-eyebrow">Sign Up</span>
          <h2>创建账号</h2>
          <p className="auth-note">
            使用邮箱注册。试用版可使用 14 天，到期后升级为正式授权。
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>邮箱</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                placeholder="your@email.com"
                required
              />
            </label>
            <label className="auth-field">
              <span>昵称（可选）</span>
              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                type="text"
                autoComplete="nickname"
                placeholder="想让朋友怎么称呼你"
              />
            </label>
            <label className="auth-field">
              <span>密码（至少 8 位）</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                placeholder="设置登录密码"
                required
              />
            </label>
            <label className="auth-field">
              <span>确认密码</span>
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                placeholder="再次输入密码"
                required
              />
            </label>
            <button
              className="primary-button auth-submit"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "注册中..." : "创建账号并进入"}
            </button>
            {error ? <p className="auth-error">{error}</p> : null}
          </form>

          <p className="auth-note" style={{ marginTop: 16 }}>
            已经有账号？<Link to="/login">直接登录</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
