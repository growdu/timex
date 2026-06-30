import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadApi } from "./upload";

const { mockApi, resetMock } = vi.hoisted(() => {
  const mockApi = { post: vi.fn(), delete: vi.fn() };
  return { mockApi, resetMock: () => {} };
});

vi.mock("./client", () => ({ default: mockApi }));

describe("uploadApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("presign", () => {
    it("POSTs /upload/sign with kind, mimeType, fileSize", async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { key: "uploads/u/photo/x.jpg", url: "https://s/x", expiresAt: "2026-01-01", maxSize: 1 },
      });
      const r = await uploadApi.presign({
        kind: "photo",
        mimeType: "image/jpeg",
        fileSize: 1234,
      });
      expect(mockApi.post).toHaveBeenCalledWith("/upload/sign", {
        kind: "photo",
        mimeType: "image/jpeg",
        fileSize: 1234,
      });
      expect(r.key).toBe("uploads/u/photo/x.jpg");
    });
  });

  describe("complete", () => {
    it("POSTs /upload/complete with key + meta", async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { key: "k", url: "u", fileSize: 1, contentType: "image/jpeg" },
      });
      await uploadApi.complete({ key: "k", width: 100 });
      expect(mockApi.post).toHaveBeenCalledWith("/upload/complete", {
        key: "k",
        width: 100,
      });
    });
  });

  describe("remove", () => {
    it("DELETEs /upload/{encoded key}", async () => {
      mockApi.delete.mockResolvedValueOnce({});
      await uploadApi.remove("uploads/user-1/photo/abc.jpg");
      expect(mockApi.delete).toHaveBeenCalledWith(
        "/upload/" + encodeURIComponent("uploads/user-1/photo/abc.jpg"),
      );
    });
  });

  describe("uploadFile (orchestration)", () => {
    it("rejects empty file", async () => {
      const file = new Blob([], { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 0 });
      await expect(uploadApi.uploadFile(file, "photo")).rejects.toThrow("empty file");
    });

    it("rejects file without type", async () => {
      const file = new Blob(["x"], { type: "" });
      Object.defineProperty(file, "size", { value: 1 });
      await expect(uploadApi.uploadFile(file, "photo")).rejects.toThrow("type is required");
    });

    it("chains presign → uploadToUrl → complete", async () => {
      // Mock presign
      mockApi.post.mockResolvedValueOnce({
        data: {
          key: "uploads/u/photo/x.jpg",
          url: "https://signed",
          expiresAt: "x",
          maxSize: 1,
        },
      });
      // Mock complete
      mockApi.post.mockResolvedValueOnce({
        data: { key: "k", url: "u", fileSize: 1, contentType: "image/jpeg" },
      });

      // Mock XHR: monkey-patch global XMLHttpRequest
      const xhrInstances = [];
      class FakeXHR {
        constructor() {
          this.upload = { onprogress: null };
          this.status = 0;
          xhrInstances.push(this);
        }
        open() {}
        setRequestHeader() {}
        send() {
          this.status = 200;
          this.onload && this.onload();
        }
      }
      globalThis.XMLHttpRequest = FakeXHR;

      const file = new Blob(["hello"], { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 5 });
      const r = await uploadApi.uploadFile(file, "photo", { width: 100 });

      expect(mockApi.post).toHaveBeenCalledTimes(2);
      expect(mockApi.post.mock.calls[0][0]).toBe("/upload/sign");
      expect(mockApi.post.mock.calls[1][0]).toBe("/upload/complete");
      expect(r.url).toBe("u");
    });

    it("propagates XHR upload errors", async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { key: "k", url: "https://signed", expiresAt: "x", maxSize: 1 },
      });

      class FakeXHR {
        constructor() {
          this.upload = { onprogress: null };
          this.status = 0;
        }
        open() {}
        setRequestHeader() {}
        send() {
          // simulate error
          this.onerror && this.onerror();
        }
      }
      globalThis.XMLHttpRequest = FakeXHR;

      const file = new Blob(["x"], { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 1 });
      await expect(uploadApi.uploadFile(file, "photo")).rejects.toThrow(
        "network error",
      );
    });
  });
});
