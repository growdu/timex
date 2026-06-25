import api from './client';

export const momentsApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/moments', { params });
    return response.data;
  },

  getByEvent: async (eventId, params = {}) => {
    const response = await api.get('/moments', { params: { eventId, ...params } });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/moments/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/moments', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/moments/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`/moments/${id}`);
  },
};

export default momentsApi;
