import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// mock uploadApi + scratchDumpsApi，再渲染 DumpUploader
vi.mock('../api/upload', () => ({
  uploadApi: {
    presign:    vi.fn(),
    uploadToUrl: vi.fn(),
    complete:   vi.fn(),
  },
}));
vi.mock('../api/faces', () => ({
  scratchDumpsApi: {
    addItem: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
  },
}));

import DumpUploader from './DumpUploader';
import { uploadApi } from '../api/upload';
import { scratchDumpsApi } from '../api/faces';

function makeFakeFile(name = 'a.jpg', size = 100, type = 'image/jpeg') {
  // File 构造在 jsdom 中可用
  const parts = [new Uint8Array(size)];
  return new File(parts, name, { type });
}

describe('DumpUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadApi.presign.mockResolvedValue({ url: 'https://oss.example/presigned/key', key: 'key' });
    uploadApi.uploadToUrl.mockResolvedValue();
    uploadApi.complete.mockResolvedValue({
      key: 'key',
      url: 'https://cdn.example/permanent/key',
      fileSize: 100,
      contentType: 'image/jpeg',
    });
    scratchDumpsApi.addItem.mockResolvedValue({ itemId: 'item-1', jobId: 'job-1' });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs presign → uploadToUrl → complete → addItem in order for one file', async () => {
    const onItemAdded = vi.fn();
    const onAllDone = vi.fn();
    const file = makeFakeFile('a.jpg');

    render(<DumpUploader dumpId="dump-1" onItemAdded={onItemAdded} onAllDone={onAllDone} />);

    fireEvent.change(screen.getByTestId('dump-uploader-input'), {
      target: { files: [file] },
    });

    await waitFor(() => expect(uploadApi.presign).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(uploadApi.uploadToUrl).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(uploadApi.complete).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(scratchDumpsApi.addItem).toHaveBeenCalledTimes(1));

    expect(uploadApi.presign).toHaveBeenCalledWith({
      kind: 'photo',
      mimeType: 'image/jpeg',
      fileSize: 100,
    });

    const [url, uploadedFile] = uploadApi.uploadToUrl.mock.calls[0];
    expect(url).toBe('https://oss.example/presigned/key');
    expect(uploadedFile).toBe(file);

    // complete() must receive the key from presign
    expect(uploadApi.complete).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'key' }),
    );

    // addItem must use the permanent URL from complete(), NOT the presigned PUT URL
    expect(scratchDumpsApi.addItem).toHaveBeenCalledWith('dump-1', {
      imageUrl: 'https://cdn.example/permanent/key',
      filename: 'a.jpg',
    });

    await waitFor(() => expect(onItemAdded).toHaveBeenCalledWith({ itemId: 'item-1', jobId: 'job-1' }));
    await waitFor(() => expect(onAllDone).toHaveBeenCalledTimes(1));
    const results = onAllDone.mock.calls[0][0];
    expect(results).toHaveLength(1);
    expect(results[0].ok).toBe(true);
  });

  it('marks file as error when uploadToUrl throws', async () => {
    uploadApi.uploadToUrl.mockRejectedValueOnce(new Error('net fail'));
    const onAllDone = vi.fn();
    const file = makeFakeFile('bad.jpg');

    render(<DumpUploader dumpId="dump-2" onAllDone={onAllDone} />);

    fireEvent.change(screen.getByTestId('dump-uploader-input'), {
      target: { files: [file] },
    });

    await waitFor(() => expect(onAllDone).toHaveBeenCalledTimes(1));
    const [results] = onAllDone.mock.calls[0];
    expect(results[0].ok).toBe(false);
    expect(results[0].error.message).toBe('net fail');
    // complete / addItem not called since uploadToUrl threw
    expect(uploadApi.complete).not.toHaveBeenCalled();
    expect(scratchDumpsApi.addItem).not.toHaveBeenCalled();
  });

  it('marks file as error when complete throws (uploadToUrl succeeded)', async () => {
    uploadApi.complete.mockRejectedValueOnce(new Error('complete failed'));
    const onAllDone = vi.fn();
    const file = makeFakeFile('mid.jpg');

    render(<DumpUploader dumpId="dump-mid" onAllDone={onAllDone} />);

    fireEvent.change(screen.getByTestId('dump-uploader-input'), {
      target: { files: [file] },
    });

    await waitFor(() => expect(onAllDone).toHaveBeenCalledTimes(1));
    const [results] = onAllDone.mock.calls[0];
    expect(results[0].ok).toBe(false);
    expect(results[0].error.message).toBe('complete failed');
    // uploadToUrl ran but complete failed, so addItem is never called
    expect(uploadApi.uploadToUrl).toHaveBeenCalledTimes(1);
    expect(scratchDumpsApi.addItem).not.toHaveBeenCalled();
  });

  it('falls back to application/octet-stream when file.type is empty', async () => {
    // Some browsers / polyfills may not set file.type
    const file = makeFakeFile('noext.bin', 10, '');
    Object.defineProperty(file, 'type', { value: '' });

    render(<DumpUploader dumpId="dump-3" />);
    fireEvent.change(screen.getByTestId('dump-uploader-input'), {
      target: { files: [file] },
    });

    await waitFor(() => expect(uploadApi.presign).toHaveBeenCalled());
    expect(uploadApi.presign.mock.calls[0][0].mimeType).toBe('application/octet-stream');
  });
});
