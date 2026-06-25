import api from './client';

export const memoirsApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/memoirs', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/memoirs/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/memoirs', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/memoirs/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`/memoirs/${id}`);
  },

  getShareToken: async (id) => {
    const response = await api.post(`/memoirs/${id}/share`);
    return response.data;
  },

  addChapter: async (memoirId, data) => {
    const response = await api.post(`/memoirs/${memoirId}/chapters`, data);
    return response.data;
  },

  updateChapter: async (memoirId, chapterId, data) => {
    const response = await api.put(`/memoirs/${memoirId}/chapters/${chapterId}`, data);
    return response.data;
  },

  deleteChapter: async (memoirId, chapterId) => {
    await api.delete(`/memoirs/${memoirId}/chapters/${chapterId}`);
  },
};

export default memoirsApi;
