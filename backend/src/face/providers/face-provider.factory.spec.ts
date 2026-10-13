import { FaceProviderFactory } from './face-provider.factory';
import { MockFaceProvider } from './mock.face-provider';
import { CloudFaceProvider } from './cloud.face-provider';
import { LocalFaceProvider } from './local.face-provider';

function mkFactory(provider: 'cloud' | 'local' | 'mock') {
  return new FaceProviderFactory(
    {
      provider,
      cloud: { baseUrl: '', apiKey: '', timeoutMs: 0 },
      local: { baseUrl: '', timeoutMs: 0 },
      search: { threshold: 0, topK: 0, backfillBatch: 0 },
    },
    new CloudFaceProvider({} as never, {} as never),
    new LocalFaceProvider({} as never, {} as never),
    new MockFaceProvider(),
  );
}

describe('FaceProviderFactory', () => {
  it('resolves mock when provider=mock', () =>
    expect(mkFactory('mock').resolve().name).toBe('mock'));
  it('resolves cloud when provider=cloud', () =>
    expect(mkFactory('cloud').resolve().name).toBe('cloud'));
  it('resolves local when provider=local', () =>
    expect(mkFactory('local').resolve().name).toBe('local'));
  it('caches the resolved instance', () => {
    const f = mkFactory('mock');
    expect(f.resolve()).toBe(f.resolve());
  });
});
