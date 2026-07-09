import api from './client';
export const dashboardApi = {
  getStats: async () => (await api.get('/dashboard/stats')).data,
  getConfig: async () => (await api.get('/dashboard/config')).data,
  updateConfig: async (widgets) => (await api.put('/dashboard/config', { widgets })).data,
};
export default dashboardApi;
