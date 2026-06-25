import api from './client';

export const placesApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/places', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/places/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/places', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/places/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`/places/${id}`);
  },
};

export default placesApi;
