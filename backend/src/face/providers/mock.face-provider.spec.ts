import { MockFaceProvider } from './mock.face-provider';
import { FACE_VECTOR_DIM } from './face-provider.interface';

describe('MockFaceProvider', () => {
  const p = new MockFaceProvider();

  it('has name="mock"', () => expect(p.name).toBe('mock'));

  it('detectAndEmbed returns 1 face with 512-d normalized vector', async () => {
    const faces = await p.detectAndEmbed('https://example.com/a.jpg');
    expect(faces).toHaveLength(1);
    expect(faces[0].vector).toHaveLength(FACE_VECTOR_DIM);
    const norm = Math.sqrt(faces[0].vector.reduce((s, x) => s + x * x, 0));
    expect(Math.abs(norm - 1)).toBeLessThan(1e-9);
  });

  it('same URL produces same vector (deterministic)', async () => {
    const a = await p.detectAndEmbed('https://example.com/same.jpg');
    const b = await p.detectAndEmbed('https://example.com/same.jpg');
    expect(a[0].vector).toEqual(b[0].vector);
  });

  it('different URLs produce different vectors', async () => {
    const a = await p.detectAndEmbed('https://example.com/x.jpg');
    const b = await p.detectAndEmbed('https://example.com/y.jpg');
    expect(a[0].vector).not.toEqual(b[0].vector);
  });

  it('embedFace respects bbox hint', async () => {
    const fe = await p.embedFace('https://example.com/a.jpg', { x: 0.1, y: 0.2, w: 0.3, h: 0.4 });
    expect(fe.bbox).toEqual({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 });
    expect(fe.vector).toHaveLength(FACE_VECTOR_DIM);
  });
});