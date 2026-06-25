import api from './client';

export const peopleApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/people', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/people/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/people', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/people/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`/people/${id}`);
  },
};

export default peopleApi;
