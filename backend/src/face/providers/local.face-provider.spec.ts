import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { LocalFaceProvider } from './local.face-provider';
import { FACE_CONFIG } from '../../config/face.config';

describe('LocalFaceProvider', () => {
  let p: LocalFaceProvider;
  let http: { post: jest.Mock };

  beforeEach(async () => {
    http = { post: jest.fn() };
    const mod = await Test.createTestingModule({
      providers: [
        LocalFaceProvider,
        { provide: HttpService, useValue: http },
        {
          provide: FACE_CONFIG,
          useValue: { local: { baseUrl: 'http://svc:8000', timeoutMs: 5000 } },
        },
      ],
    }).compile();
    p = mod.get(LocalFaceProvider);
  });

  it('detects via /detect endpoint with image_url payload', async () => {
    http.post.mockReturnValue(of({ data: { faces: [] } }));
    await p.detectAndEmbed('https://i/1.jpg');
    expect(http.post).toHaveBeenCalledWith(
      'http://svc:8000/detect',
      { image_url: 'https://i/1.jpg' },
      { timeout: 5000 },
    );
  });

  it('embeds face via /embed with timeout', async () => {
    const bbox = { x: 0.2, y: 0.3, w: 0.1, h: 0.1 };
    http.post.mockReturnValue(of({ data: { embedding: [4, 5, 6] } }));
    const out = await p.embedFace('https://i/2.jpg', bbox);
    expect(out.bbox).toBe(bbox);
    expect(out.vector).toEqual([4, 5, 6]);
    expect(http.post).toHaveBeenCalledWith(
      'http://svc:8000/embed',
      { image_url: 'https://i/2.jpg', bbox },
      { timeout: 5000 },
    );
  });
});
