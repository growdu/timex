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

/**
 * Scratch Dump API（与后端 ScratchDumpController 对齐）。
 *
 * 用户上传一批照片做临时检索的场景（不进 moment 库）：
 *   POST   /faces/dumps                  — 新建 dump（{ name, description? }）
 *   GET    /faces/dumps                  — 列出本人 dump（?limit=）
 *   GET    /faces/dumps/:id              — 单个 dump 详情
 *   DELETE /faces/dumps/:id              — 删除 dump
 *   POST   /faces/dumps/:id/photos       — 加一张照片（{ imageUrl, takenAt?, fileMtime?, filename?, width?, height? }）
 *   GET    /faces/dumps/:id/items        — 列出 dump 内照片（?status=pending|processed|failed）
 *   GET    /faces/dumps/:id/status       — { total, done, failed, status } 进度
 *   POST   /faces/dumps/:id/search       — 检索命中（{ threshold?, topK? }）
 */
export const scratchDumpsApi = {
  create:    (body)                       => client.post('/faces/dumps', body).then(r => r.data),
  list:      (limit = 50)                 => client.get('/faces/dumps', { params: { limit } }).then(r => r.data),
  get:       (id)                         => client.get(`/faces/dumps/${id}`).then(r => r.data),
  remove:    (id)                         => client.delete(`/faces/dumps/${id}`).then(r => r.data),
  addItem:   (id, body)                   => client.post(`/faces/dumps/${id}/photos`, body).then(r => r.data),
  listItems: (id, status)                 => client.get(`/faces/dumps/${id}/items`, { params: status ? { status } : {} }).then(r => r.data),
  status:    (id)                         => client.get(`/faces/dumps/${id}/status`).then(r => r.data),
  search:    (id, body)                   => client.post(`/faces/dumps/${id}/search`, body).then(r => r.data),
};

export default facesApi;