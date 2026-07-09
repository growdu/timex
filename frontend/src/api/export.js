import api from './client';
export const exportApi = {
  album: async (year) => (await api.get('/export/album', { params: year ? { year } : {} })).data,
  storybook: async (memoirId) => (await api.get(`/export/storybook/${memoirId}`)).data,
  timeline: async () => (await api.get('/export/timeline')).data,
};
export default exportApi;
