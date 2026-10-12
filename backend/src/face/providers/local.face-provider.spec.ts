import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { LocalFaceProvider } from './local.face-provider';

describe('LocalFaceProvider', () => {
  let p: LocalFaceProvider;
  let http: { post: jest.Mock };

  beforeEach(async () => {
    http = { post: jest.fn() };
    const mod = await Test.createTestingModule({
      providers: [
        LocalFaceProvider,
        { provide: HttpService, useValue: http },
        { provide: 'FACE_CONFIG', useValue: { local: { baseUrl: 'http://svc:8000', timeoutMs: 5000 } } },
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
});
