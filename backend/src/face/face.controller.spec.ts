/**
 * FaceController 单元测试 — 验证路由 handler 正确转发到 FaceService。
 */
import { FaceController } from './face.controller';
import { FaceService } from './face.service';

describe('FaceController', () => {
  const face = {
    getMyProfile: jest.fn().mockResolvedValue({ userId: 'u1' }),
    addReference: jest.fn().mockResolvedValue({ refId: 'r1', jobId: 'j1' }),
    removeReference: jest.fn().mockResolvedValue(undefined),
    setReferenceEnabled: jest.fn().mockResolvedValue(undefined),
    searchMine: jest.fn().mockResolvedValue([]),
    enqueueExtractFaces: jest.fn().mockResolvedValue({ jobId: 'j2' }),
    startBackfill: jest.fn().mockResolvedValue({ status: 'running' }),
    getBackfillStatus: jest.fn().mockReturnValue({ status: 'idle' }),
  } as unknown as FaceService;

  let c: FaceController;
  beforeEach(() => {
    jest.clearAllMocks();
    c = new FaceController(face);
  });

  it('me() forwards user.id to getMyProfile', async () => {
    const out = await c.me({ id: 'u1' } as never);
    expect(face.getMyProfile).toHaveBeenCalledWith('u1');
    expect(out).toEqual({ userId: 'u1' });
  });

  it('addRef() forwards imageUrl + bboxHint', async () => {
    const out = await c.addRef(
      { id: 'u1' } as never,
      {
        imageUrl: 'https://x/y.jpg',
        bboxHint: { x: 0, y: 0, w: 1, h: 1 },
      },
    );
    expect(face.addReference).toHaveBeenCalledWith('u1', 'https://x/y.jpg', {
      x: 0,
      y: 0,
      w: 1,
      h: 1,
    });
    expect(out).toEqual({ refId: 'r1', jobId: 'j1' });
  });

  it('removeRef() forwards user.id + refId', async () => {
    await c.removeRef({ id: 'u1' } as never, 'r1');
    expect(face.removeReference).toHaveBeenCalledWith('u1', 'r1');
  });

  it('setEnabled() forwards body.enabled flag', async () => {
    await c.setEnabled({ id: 'u1' } as never, 'r1', { enabled: true });
    expect(face.setReferenceEnabled).toHaveBeenCalledWith('u1', 'r1', true);
  });

  it('search() forwards threshold + topK', async () => {
    await c.search(
      { id: 'u1' } as never,
      { threshold: 0.5, topK: 100 },
    );
    expect(face.searchMine).toHaveBeenCalledWith('u1', {
      threshold: 0.5,
      topK: 100,
    });
  });

  it('extract() forwards momentId', async () => {
    const out = await c.extract({ id: 'u1' } as never, 'm1');
    expect(face.enqueueExtractFaces).toHaveBeenCalledWith('u1', 'm1');
    expect(out).toEqual({ jobId: 'j2' });
  });

  it('backfill() forwards user.id', async () => {
    const out = await c.backfill({ id: 'u1' } as never);
    expect(face.startBackfill).toHaveBeenCalledWith('u1');
    expect(out).toEqual({ status: 'running' });
  });

  it('status() does not require a user', async () => {
    const out = await c.status();
    expect(face.getBackfillStatus).toHaveBeenCalled();
    expect(out).toEqual({ status: 'idle' });
  });
});