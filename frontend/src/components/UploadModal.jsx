import { useState, useRef } from "react";
import { momentsApi } from "../api/moments";
import { eventsApi } from "../api/events";

export default function UploadModal({ onClose, onSuccess, userId }) {
  const [uploadType, setUploadType] = useState("photo");
  const [files, setFiles] = useState([]);
  const [textContent, setTextContent] = useState("");
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(droppedFiles);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (uploadType === "text") {
      if (!textContent.trim()) return;
      setIsUploading(true);
      try {
        await momentsApi.create({
          type: "text",
          title: title || "文字记录",
          content: textContent,
          eventId: eventId || undefined,
        });
        onSuccess && onSuccess();
        onClose();
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setIsUploading(false);
      }
      return;
    }

    if (files.length === 0) return;
    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress((prev) => ({ ...prev, [file.name]: "uploading" }));

      // Simulate upload progress
      await new Promise((resolve) => setTimeout(resolve, 500));

      // In production, this would upload to OSS and create a moment
      // For now, simulate success
      setUploadProgress((prev) => ({ ...prev, [file.name]: "done" }));
    }

    setIsUploading(false);
    onSuccess && onSuccess();
    onClose();
  };

  const removeFile = (fileName) => {
    setFiles(files.filter((f) => f.name !== fileName));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>上传素材</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="upload-type-tabs">
          {[
            { id: "photo", label: "照片" },
            { id: "video", label: "视频" },
            { id: "audio", label: "语音" },
            { id: "text", label: "文字" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tab ${uploadType === tab.id ? "active" : ""}`}
              onClick={() => setUploadType(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {uploadType === "text" ? (
          <div className="text-upload-form">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="标题（可选）"
              className="upload-input"
            />
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="写下你的想法..."
              className="upload-textarea"
              rows={8}
            />
            <input
              type="text"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder="关联事件ID（可选）"
              className="upload-input"
            />
          </div>
        ) : (
          <div
            className="drop-zone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={
                uploadType === "photo"
                  ? "image/*"
                  : uploadType === "video"
                  ? "video/*"
                  : "audio/*"
              }
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <div className="drop-zone-content">
              <span className="drop-icon">📁</span>
              <p>拖拽文件到此处，或点击选择文件</p>
              <small>
                {uploadType === "photo" && "支持 JPG、PNG、GIF、WebP"}
                {uploadType === "video" && "支持 MP4、MOV、AVI"}
                {uploadType === "audio" && "支持 MP3、WAV、AAC"}
              </small>
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="file-list">
            {files.map((file) => (
              <div key={file.name} className="file-item">
                <span className="file-name">{file.name}</span>
                <span className="file-size">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <span className={`file-status ${uploadProgress[file.name] || ""}`}>
                  {uploadProgress[file.name] === "done" ? "✓" : uploadProgress[file.name] === "uploading" ? "..." : ""}
                </span>
                <button
                  className="file-remove"
                  onClick={() => removeFile(file.name)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            取消
          </button>
          <button
            className="primary-button"
            onClick={handleUpload}
            disabled={isUploading || (uploadType !== "text" && files.length === 0)}
          >
            {isUploading ? "上传中..." : "开始上传"}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: var(--paper-strong);
          border-radius: var(--radius-xl);
          padding: 24px;
          width: 90%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--muted);
        }

        .upload-type-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .upload-type-tabs .tab {
          flex: 1;
          padding: 10px;
          background: rgba(255, 255, 255, 0.4);
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
        }

        .upload-type-tabs .tab.active {
          background: var(--teal);
          color: white;
          border-color: var(--teal);
        }

        .drop-zone {
          border: 2px dashed var(--line-strong);
          border-radius: var(--radius-lg);
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .drop-zone:hover {
          border-color: var(--teal);
          background: rgba(46, 138, 131, 0.05);
        }

        .drop-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
        }

        .drop-zone-content p {
          margin: 0 0 8px 0;
        }

        .drop-zone-content small {
          color: var(--muted);
        }

        .text-upload-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .upload-input {
          padding: 12px 16px;
          border: 1px solid var(--line-strong);
          border-radius: var(--radius-md);
          font-size: 14px;
          background: rgba(255, 255, 255, 0.6);
        }

        .upload-input:focus {
          outline: none;
          border-color: var(--teal);
        }

        .upload-textarea {
          padding: 12px 16px;
          border: 1px solid var(--line-strong);
          border-radius: var(--radius-md);
          font-size: 14px;
          background: rgba(255, 255, 255, 0.6);
          resize: vertical;
          font-family: inherit;
        }

        .upload-textarea:focus {
          outline: none;
          border-color: var(--teal);
        }

        .file-list {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.4);
          border-radius: var(--radius-md);
        }

        .file-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-size {
          color: var(--muted);
          font-size: 12px;
        }

        .file-status {
          width: 20px;
          text-align: center;
        }

        .file-remove {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          color: var(--muted);
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 20px;
        }
      `}</style>
    </div>
  );
}
