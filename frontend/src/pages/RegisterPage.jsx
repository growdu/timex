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
    if (!email || !password) { setError("请填写邮箱和密码"); return; }
    if (password.length < 8) { setError("密码至少 8 位"); return; }
    if (password !== confirmPassword) { setError("两次输入的密码不一致"); return; }
    setIsLoading(true);
    try {
      await authApi.register({ email, password, nickname: nickname || undefined });
      if (onLogin) { await onLogin(email, password); }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "注册失败";
      setError(Array.isArray(msg) ? msg.join("；") : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-center">
        <Link to="/" className="auth-back">← 返回首页</Link>
        <span className="section-eyebrow">Sign Up</span>
        <h2>注册</h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>邮箱</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="your@email.com" required />
          </label>
          <label className="auth-field">
            <span>昵称</span>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} type="text" placeholder="选填" />
          </label>
          <label className="auth-field">
            <span>密码</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="至少 8 位" required />
          </label>
          <label className="auth-field">
            <span>确认密码</span>
            <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" placeholder="••••••••" required />
          </label>
          <button className="primary-button auth-submit" type="submit" disabled={isLoading}>
            {isLoading ? "注册中..." : "注册"}
          </button>
          {error ? <p className="auth-error">{error}</p> : null}
        </form>
        <div className="auth-divider" />
        <p className="auth-note">已经有账号？<Link to="/login">直接登录</Link></p>
      </div>
    </div>
  );
}
