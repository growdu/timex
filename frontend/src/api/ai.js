import api from './client';

/**
 * AI 端点封装。所有调用返回 { id, status, output?, structured?, error? }
 *
 * 设计：异步任务模式（POST 立即返回 job，前端轮询 GET /ai/jobs/:id）
 */
export const aiApi = {
  // 提交
  tagImage: (momentId, { mediaUrl, mimeType }) =>
    api.post(`/ai/moments/${momentId}/image-tag`, { mediaUrl, mimeType }).then(r => r.data),

  summarizeImage: (momentId, { mediaUrl, mimeType }) =>
    api.post(`/ai/moments/${momentId}/image-summary`, { mediaUrl, mimeType }).then(r => r.data),

  transcribe: (momentId, { audioUrl, mimeType }) =>
    api.post(`/ai/moments/${momentId}/transcribe`, { audioUrl, mimeType }).then(r => r.data),

  summarizeMemoir: (memoirId, text) =>
    api.post(`/ai/memoirs/${memoirId}/summary`, { text: text ?? '' }).then(r => r.data),

  summarizeChapter: (chapterId, text) =>
    api.post(`/ai/chapters/${chapterId}/summary`, { text: text ?? '' }).then(r => r.data),

  summarizeEvent: (eventId, text) =>
    api.post(`/ai/events/${eventId}/summary`, { text: text ?? '' }).then(r => r.data),

  // 轮询
  getJob: (jobId) => api.get(`/ai/jobs/${jobId}`).then(r => r.data),
  listJobs: (limit = 20) => api.get('/ai/jobs', { params: { limit } }).then(r => r.data),
};

export default aiApi;