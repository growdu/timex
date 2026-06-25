import api from './client';

export const authApi = {
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    if (response.data.tokens) {
      localStorage.setItem('timex_access_token', response.data.tokens.accessToken);
      localStorage.setItem('timex_refresh_token', response.data.tokens.refreshToken);
    }
    return response.data;
  },

  login: async (data) => {
    const response = await api.post('/auth/login', data);
    if (response.data.tokens) {
      localStorage.setItem('timex_access_token', response.data.tokens.accessToken);
      localStorage.setItem('timex_refresh_token', response.data.tokens.refreshToken);
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('timex_access_token');
    localStorage.removeItem('timex_refresh_token');
    localStorage.removeItem('timex_license_token');
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('timex_access_token');
  },
};

export default authApi;
