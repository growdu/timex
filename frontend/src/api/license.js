import api from './client';

export const licenseApi = {
  activate: async (licenseKey, deviceInfo = {}) => {
    const response = await api.post('/license/activate', {
      licenseKey,
      ...deviceInfo,
    });
    if (response.data.licenseToken) {
      localStorage.setItem('timex_license_token', response.data.licenseToken);
    }
    return response.data;
  },

  getStatus: async () => {
    const response = await api.get('/license/status');
    return response.data;
  },

  getDevices: async () => {
    const response = await api.get('/license/devices');
    return response.data;
  },

  deactivateDevice: async (deviceId) => {
    await api.delete(`/license/devices/${deviceId}`);
  },

  verify: async () => {
    const licenseToken = localStorage.getItem('timex_license_token');
    if (!licenseToken) return null;
    const response = await api.post('/license/verify', { licenseToken });
    return response.data;
  },

  isLicensed: () => {
    return !!localStorage.getItem('timex_license_token');
  },
};

export default licenseApi;
