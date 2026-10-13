import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { CloudFaceProvider } from './cloud.face-provider';
import { FACE_CONFIG } from '../../config/face.config';

describe('CloudFaceProvider', () => {
  let p: CloudFaceProvider;
  let http: { post: jest.Mock };

  beforeEach(async () => {
    http = { post: jest.fn() };
    const mod = await Test.createTestingModule({
      providers: [
        CloudFaceProvider,
        { provide: HttpService, useValue: http },
        {
          provide: FACE_CONFIG,
          useValue: {
            cloud: { baseUrl: 'https://x', apiKey: 'k', timeoutMs: 1000 },
          },
        },
      ],
    }).compile();
    p = mod.get(CloudFaceProvider);
  });

  it('maps /v1/face/detect response to FaceEmbedding[]', async () => {
    http.post.mockReturnValue(
      of({
        data: {
          faces: [
            {
              bbox: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
              embedding: [0.1, 0.2, 0.3],
              confidence: 0.9,
            },
          ],
        },
      }),
    );
    const out = await p.detectAndEmbed('https://img/1.jpg');
    expect(out).toHaveLength(1);
    expect(out[0].bbox).toEqual({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 });
    expect(out[0].vector).toEqual([0.1, 0.2, 0.3]);
  });

  it('forwards image URL in request body', async () => {
    http.post.mockReturnValue(of({ data: { faces: [] } }));
    await p.detectAndEmbed('https://img/2.jpg');
    const call = http.post.mock.calls[0];
    expect(call[0]).toBe('https://x/v1/face/detect');
    expect(call[1]).toEqual({
      image: 'https://img/2.jpg',
      return_embedding: true,
    });
  });

  it('propagates HTTP error', async () => {
    http.post.mockReturnValue(throwError(() => new Error('network')));
    await expect(p.detectAndEmbed('x')).rejects.toThrow('network');
  });

  it('embeds face via /v1/face/embed with bearer + timeout', async () => {
    const bbox = { x: 0.1, y: 0.2, w: 0.3, h: 0.4 };
    http.post.mockReturnValue(
      of({ data: { embedding: [1, 2, 3], confidence: 0.7 } }),
    );
    const out = await p.embedFace('https://img/3.jpg', bbox);
    expect(out.bbox).toBe(bbox);
    expect(out.vector).toEqual([1, 2, 3]);
    expect(out.confidence).toBe(0.7);
    const call = http.post.mock.calls[0];
    expect(call[0]).toBe('https://x/v1/face/embed');
    expect(call[1]).toEqual({ image: 'https://img/3.jpg', bbox });
    expect(call[2]).toEqual({
      headers: { Authorization: 'Bearer k' },
      timeout: 1000,
    });
  });
});
