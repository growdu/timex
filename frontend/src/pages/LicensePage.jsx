import { useState } from "react";
import { licenseApi } from "../api/license";
import { useLicenseStore } from "../store";

export default function LicensePage() {
  const { license, devices, isInTrial, trialExpiresAt, setLicense } = useLicenseStore();
  const [licenseKey, setLicenseKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleActivate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const deviceInfo = {
        deviceName: navigator.userAgent.slice(0, 50),
        deviceFingerprint: navigator.userAgent + Date.now(),
      };

      const result = await licenseApi.activate(licenseKey, deviceInfo);
      setLicense(result.license, [result.device], false, null);
      setLicenseKey("");
      setSuccess("License 激活成功！");
    } catch (err) {
      setError(err.message || "激活失败，请检查License Key");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = async (deviceId) => {
    try {
      await licenseApi.deactivateDevice(deviceId);
      window.location.reload();
    } catch (_err) {
      setError("解绑设备失败");
    }
  };

  const handleCheckStatus = async () => {
    try {
      const status = await licenseApi.getStatus();
      setLicense(status.activeLicense, status.devices, status.isInTrial, status.trialExpiresAt);
      setSuccess("状态已更新");
    } catch (_err) {
      setError("获取状态失败");
    }
  };

  const formatDate = (date) => {
    if (!date) return "永久";
    return new Date(date).toLocaleDateString("zh-CN");
  };

  const getPlanLabel = (planType) => {
    const labels = {
      lifetime: "终身版",
      annual: "年费版",
      trial: "试用版",
    };
    return labels[planType] || planType;
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>License 管理</h1>
        <p>管理您的授权许可和已注册设备</p>
      </div>

      <div className="settings-section">
        <h2>当前授权状态</h2>
        <button onClick={handleCheckStatus} className="secondary-button">
          刷新状态
        </button>

        {isInTrial && (
          <div className="trial-notice">
            <strong>试用版</strong>
            <p>剩余 {(new Date(trialExpiresAt) - new Date()) / (1000 * 60 * 60 * 24) > 0 ? Math.ceil((new Date(trialExpiresAt) - new Date()) / (1000 * 60 * 60 * 24)) : 0} 天到期</p>
            <p>到期时间: {formatDate(trialExpiresAt)}</p>
          </div>
        )}

        {license && (
          <div className="license-card">
            <div className="license-info">
              <span className="license-plan">{getPlanLabel(license.planType)}</span>
              <p>设备限额: {license.deviceLimit} 台</p>
              {license.expiresAt && <p>到期时间: {formatDate(license.expiresAt)}</p>}
            </div>
          </div>
        )}

        {!license && !isInTrial && (
          <div className="empty-state">
            <p>暂无激活的 License</p>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h2>激活 License</h2>
        <form onSubmit={handleActivate} className="license-form">
          <input
            type="text"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="输入 License Key (如 TIMEX-LIFE-XXXX)"
            className="license-input"
          />
          <button type="submit" className="primary-button" disabled={isLoading || !licenseKey}>
            {isLoading ? "激活中..." : "激活"}
          </button>
        </form>
        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}
      </div>

      <div className="settings-section">
        <h2>已注册设备</h2>
        {devices && devices.length > 0 ? (
          <div className="device-list">
            {devices.map((device) => (
              <div key={device.id} className="device-item">
                <div className="device-info">
                  <strong>{device.deviceName}</strong>
                  <p>最后活跃: {new Date(device.lastActiveAt).toLocaleString("zh-CN")}</p>
                </div>
                <button
                  onClick={() => handleDeactivate(device.id)}
                  className="danger-button"
                >
                  解绑
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>暂无注册设备</p>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h2>购买 License</h2>
        <div className="pricing-cards">
          <div className="pricing-card">
            <h3>终身版</h3>
            <p className="price">¥499</p>
            <ul>
              <li>永久使用</li>
              <li>5台设备授权</li>
              <li>所有高级功能</li>
              <li>优先技术支持</li>
            </ul>
            <button className="primary-button">立即购买</button>
          </div>
          <div className="pricing-card">
            <h3>年费版</h3>
            <p className="price">¥99/年</p>
            <ul>
              <li>一年使用期</li>
              <li>3台设备授权</li>
              <li>所有高级功能</li>
            </ul>
            <button className="secondary-button">立即订阅</button>
          </div>
        </div>
      </div>
    </div>
  );
}
