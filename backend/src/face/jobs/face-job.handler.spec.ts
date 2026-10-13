import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FaceJobHandler } from './face-job.handler';
import { FaceProviderFactory } from '../providers/face-provider.factory';
import { MockFaceProvider } from '../providers/mock.face-provider';
import { UserFaceEmbedding } from '../entities/user-face-embedding.entity';
import { MomentFace } from '../entities/moment-face.entity';
import { ScratchDump } from '../entities/scratch-dump.entity';
import { ScratchDumpItem } from '../entities/scratch-dump-item.entity';
import { FACE_CONFIG } from '../../config/face.config';

describe('FaceJobHandler', () => {
  let h: FaceJobHandler;
  let ufe: { update: jest.Mock };
  let mf: { delete: jest.Mock; save: jest.Mock };
  let sd: { increment: jest.Mock };
  let sdi: { update: jest.Mock };

  beforeEach(async () => {
    ufe = { update: jest.fn().mockResolvedValue({ affected: 1 }) };
    mf = {
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
      save: jest.fn().mockResolvedValue([]),
    };
    sd = { increment: jest.fn().mockResolvedValue({ affected: 1 }) };
    sdi = { update: jest.fn().mockResolvedValue({ affected: 1 }) };
    const mod = await Test.createTestingModule({
      providers: [
        FaceJobHandler,
        { provide: getRepositoryToken(UserFaceEmbedding), useValue: ufe },
        { provide: getRepositoryToken(MomentFace), useValue: mf },
        { provide: getRepositoryToken(ScratchDump), useValue: sd },
        { provide: getRepositoryToken(ScratchDumpItem), useValue: sdi },
        { provide: FACE_CONFIG, useValue: { provider: 'mock', cloud: {}, local: {}, search: {} } },
        FaceProviderFactory,
        MockFaceProvider,
        { provide: 'CloudFaceProvider', useValue: {} },
        { provide: 'LocalFaceProvider', useValue: {} },
      ],
    })
      .overrideProvider(FaceProviderFactory)
      .useFactory({
        factory: (cfg: unknown, cloud: unknown, local: unknown, mock: MockFaceProvider) => {
          // Build a factory whose resolve() returns mock so handler uses MockFaceProvider.
          const f = Object.create(FaceProviderFactory.prototype);
          f.cfg = cfg;
          f.cloud = cloud;
          f.local = local;
          f.mock = mock;
          f.resolved = mock;
          f.resolve = () => mock;
          return f;
        },
        inject: [FACE_CONFIG, 'CloudFaceProvider', 'LocalFaceProvider', MockFaceProvider],
      })
      .compile();
    h = mod.get(FaceJobHandler);
  });

  it('runEmbed picks largest face and writes embedding', async () => {
    await h.runEmbed('u1', 'r1', {
      refId: 'r1',
      imageUrl: 'https://x/1.jpg',
    });
    expect(ufe.update).toHaveBeenCalled();
    const [, payload] = ufe.update.mock.calls[0];
    expect(payload.embedding).toHaveLength(512);
    expect(payload.bbox.w).toBeGreaterThan(0);
    expect(payload.provider).toBe('mock');
  });

  it('runExtract deletes then saves one row per face', async () => {
    await h.runExtract('u1', 'm1', {
      momentId: 'm1',
      imageUrl: 'https://x/2.jpg',
    });
    expect(mf.delete).toHaveBeenCalledWith({ momentId: 'm1', userId: 'u1' });
    expect(mf.save).toHaveBeenCalled();
    const [rows] = mf.save.mock.calls[0];
    expect(Array.isArray(rows)).toBe(true);
    expect(rows[0]).toHaveProperty('embedding');
    expect(rows[0].embedding).toHaveLength(512);
  });

  it('runEmbed throws when no face detected', async () => {
    const factory = (h as unknown as { factory: FaceProviderFactory }).factory;
    jest.spyOn(factory, 'resolve').mockReturnValue({
      name: 'mock',
      detectAndEmbed: async () => [],
      embedFace: async () => ({}) as never,
    } as never);
    await expect(
      h.runEmbed('u1', 'r1', { refId: 'r1', imageUrl: 'x' }),
    ).rejects.toThrow('no face');
  });

  it('falls back to mock when primary throws', async () => {
    const factory = (h as unknown as { factory: FaceProviderFactory }).factory;
    const errProv = {
      name: 'cloud',
      detectAndEmbed: jest.fn().mockRejectedValue(new Error('upstream 500')),
      embedFace: jest.fn(),
    };
    jest.spyOn(factory, 'resolve').mockReturnValue(errProv as never);
    await h.runEmbed('u1', 'r1', {
      refId: 'r1',
      imageUrl: 'https://x/3.jpg',
    });
    expect(errProv.detectAndEmbed).toHaveBeenCalled();
    expect(ufe.update).toHaveBeenCalled();
    const [, payload] = ufe.update.mock.calls[0];
    expect(payload.provider).toBe('mock'); // fell back
  });

  it('runExtractScratch writes chosen face embedding and increments done_items', async () => {
    const out = await h.runExtractScratch('u1', 'i1', {
      dumpId: 'd1',
      imageUrl: 'https://x/scratch.jpg',
    });
    expect(out.faces).toBe(1);
    expect(out.provider).toBe('mock');
    expect(sdi.update).toHaveBeenCalled();
    const [where, payload] = sdi.update.mock.calls[0];
    expect(where).toEqual({ id: 'i1', userId: 'u1' });
    expect(payload.embedding).toHaveLength(512);
    expect(payload.isProcessed).toBe(true);
    expect(payload.error).toBeNull();
    expect(sd.increment).toHaveBeenCalledWith(
      { id: 'd1', userId: 'u1' },
      'doneItems',
      1,
    );
  });

  it('runExtractScratch marks is_processed=false and bumps failed_items when no face', async () => {
    const factory = (h as unknown as { factory: FaceProviderFactory }).factory;
    jest.spyOn(factory, 'resolve').mockReturnValue({
      name: 'mock',
      detectAndEmbed: async () => [],
      embedFace: async () => ({}) as never,
    } as never);
    const out = await h.runExtractScratch('u1', 'i1', {
      dumpId: 'd1',
      imageUrl: 'https://x/empty.jpg',
    });
    expect(out.faces).toBe(0);
    const [, payload] = sdi.update.mock.calls[0];
    expect(payload.isProcessed).toBe(false);
    expect(payload.error).toBe('no_face_detected');
    expect(sd.increment).toHaveBeenCalledWith(
      { id: 'd1', userId: 'u1' },
      'failedItems',
      1,
    );
  });
});