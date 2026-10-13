import client from './client';

/**
 * 面孔中心 API 封装。
 *
 * 端点（与后端 FaceController 对齐）：
 *   GET    /faces/me                       — 我的画像（参考数量 / 启用数量）
 *   POST   /faces/me/references            — 添加参考图
 *   DELETE /faces/me/references/:refId     — 删除参考
 *   PATCH  /faces/me/references/:refId     — 启用 / 禁用参考
 *   POST   /faces/search                   — 检索我的照片（按参考 embedding）
 *   POST   /faces/backfill                 — 一次性回填所有照片
 *   GET    /faces/backfill/status          — 回填进度轮询
 *   POST   /faces/moments/:momentId/extract— 提取某 moment 的人脸
 */
export const facesApi = {
  getMe:           ()                        => client.get('/faces/me').then(r => r.data),
  addReference:    (body)                    => client.post('/faces/me/references', body).then(r => r.data),
  removeRef:       (refId)                   => client.delete(`/faces/me/references/${refId}`).then(r => r.data),
  setRefEnabled:   (refId, enabled)          => client.patch(`/faces/me/references/${refId}`, { enabled }).then(r => r.data),
  search:          (body)                    => client.post('/faces/search', body).then(r => r.data),
  backfill:        ()                        => client.post('/faces/backfill').then(r => r.data),
  backfillStatus:  ()                        => client.get('/faces/backfill/status').then(r => r.data),
  extractFaces:    (momentId)                => client.post(`/faces/moments/${momentId}/extract`).then(r => r.data),
};

export default facesApi;