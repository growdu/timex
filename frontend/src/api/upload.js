import api from './client';

/**
 * 上传 API（S3 兼容：MinIO / Aliyun OSS / AWS S3）
 *
 * 客户端直传流程（不经过后端带宽）：
 *   1. presign()  → 拿到签名 URL
 *   2. 上传文件到签名 URL（用 XHR，可读 progress）
 *   3. complete() → 后端校验 + 返回 public URL
 *
 * 失败回退：删除已上传的对象，避免留垃圾
 */

export const uploadApi = {
  /**
   * 步骤 1：请求签名 URL
   * @param {{kind: 'photo'|'video'|'audio'|'document', mimeType: string, fileSize: number}} opts
   */
  presign: async (opts) => {
    const { data } = await api.post('/upload/sign', opts);
    return data;
  },

  /**
   * 步骤 2：客户端直传文件到签名 URL
   * @param {string} url 签名 URL
   * @param {File|Blob} file
   * @param {(percent: number) => void} [onProgress] 0-100
   * @returns {Promise<void>}
   */
  uploadToUrl: (url, file, onProgress) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`upload failed: HTTP ${xhr.status} ${xhr.statusText}`));
      };
      xhr.onerror = () => reject(new Error('upload network error'));
      xhr.send(file);
    }),

  /**
   * 步骤 3：通知后端上传完成
   * @param {{key: string, width?: number, height?: number, duration?: number}} opts
   */
  complete: async (opts) => {
    const { data } = await api.post('/upload/complete', opts);
    return data;
  },

  /**
   * 删除对象
   */
  remove: async (key) => {
    await api.delete(`/upload/${encodeURIComponent(key)}`);
  },

  /**
   * 一站式：presign → uploadToUrl → complete
   *
   * @param {File|Blob} file
   * @param {'photo'|'video'|'audio'|'document'} kind
   * @param {{onProgress?: (p:number)=>void, width?:number, height?:number, duration?:number}} [meta]
   * @returns {Promise<{key:string, url:string, fileSize:number, contentType:string}>}
   */
  uploadFile: async (file, kind, meta = {}) => {
    const fileSize = file.size;
    if (!fileSize) throw new Error('empty file');
    if (!file.type) throw new Error('file.type is required');

    const presigned = await uploadApi.presign({ kind, mimeType: file.type, fileSize });
    try {
      await uploadApi.uploadToUrl(presigned.url, file, meta.onProgress);
    } catch (err) {
      // 上传失败 → 清理后端 records（无 S3 对象可删，但解绑 relation）
      throw err;
    }
    return uploadApi.complete({
      key: presigned.key,
      width: meta.width,
      height: meta.height,
      duration: meta.duration,
    });
  },
};

export default uploadApi;
