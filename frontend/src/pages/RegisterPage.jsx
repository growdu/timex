import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/auth.js";

const FEATURES = [
  { title: "14 天试用授权", desc: "注册即享 14 天全功能体验，到期前可一键激活正式 License。" },
  { title: "数据完全隔离", desc: "每位用户独立数据空间，记录只属于你。" },
  { title: "多设备同步", desc: "通过 License 设备管理让手机、笔记本、平板访问同一份档案。" },
];

export default function RegisterPage({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
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
      await authApi.register({ email, password, nickname: nickname || undefined });
      if (onLogin) {
        await onLogin(email, password);
      }
      navigate("/timeline", { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "注册失败";
      setError(Array.isArray(msg) ? msg.join("；") : String(msg));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page-split">
      <div className="auth-card auth-card-center">
        <Link to="/" className="auth-back">← 返回首页</Link>
        <span className="section-eyebrow">Sign Up</span>
        <h2>注册</h2>

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
              placeholder="设置登录密码"
              required
            />
          </label>
          <label className="auth-field">
            <span>确认密码</span>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              placeholder="再次输入密码"
              required
            />
          </label>
          <label className="auth-field">
            <span>昵称</span>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              type="text"
              placeholder="想让朋友怎么称呼你"
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

        <div className="auth-divider" />
        <p className="auth-note">
          已经有账号？<Link to="/login">直接登录</Link>
        </p>
      </div>

      <aside className="auth-brand">
        <div className="auth-brand-inner">
          <span className="brand-eyebrow">Timex</span>
          <h1 className="brand-title">时光机器</h1>
          <p className="brand-tagline">个人成长记录与人生回忆沉淀系统</p>
          <p className="brand-pitch">开启一段属于自己的时光档案。</p>

          <ul className="feature-list">
            {FEATURES.map((f) => (
              <li key={f.title} className="feature-item">
                <strong>{f.title}</strong>
                <span>{f.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
