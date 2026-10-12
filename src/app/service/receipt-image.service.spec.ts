import { TestBed } from '@angular/core/testing';
import { RECEIPT_TARGET_BYTES, ReceiptImageService } from './receipt-image.service';

// Spec 008 Story 1 / research R2–R3: receipts are prepared on the device.
describe('ReceiptImageService', () => {
  let service: ReceiptImageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReceiptImageService);
  });

  /** An image file drawn with noise, so it doesn't compress small. */
  async function imageFile(width: number, height: number, type: string, name: string): Promise<File> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const data = ctx.createImageData(width, height);
    for (let i = 0; i < data.data.length; i++) data.data[i] = i % 4 === 3 ? 255 : Math.floor(Math.random() * 256);
    ctx.putImageData(data, 0, 0);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), type));
    return new File([blob], name, { type: blob.type });
  }

  async function dimensions(file: File): Promise<{ width: number; height: number }> {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { width: img.naturalWidth, height: img.naturalHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  it('leaves a small JPEG/PNG untouched', async () => {
    const file = await imageFile(300, 200, 'image/png', 'shot.png');
    expect(file.size).toBeLessThanOrEqual(RECEIPT_TARGET_BYTES);

    expect(await service.prepare(file)).toBe(file);
  });

  it('shrinks a large photo to a JPEG at most 2048 px on its longest side, same shape', async () => {
    const file = await imageFile(3000, 1500, 'image/png', 'IMG_0001.png');
    expect(file.size).toBeGreaterThan(RECEIPT_TARGET_BYTES);

    const prepared = await service.prepare(file);

    expect(prepared.type).toBe('image/jpeg');
    expect(prepared.name).toBe('IMG_0001.jpg');
    const { width, height } = await dimensions(prepared);
    expect(Math.max(width, height)).toBeLessThanOrEqual(2048);
    expect(width / height).toBeCloseTo(2, 2);
  });

  it('re-encodes a type the reader may not take without enlarging it', async () => {
    const file = new File([await imageFile(300, 200, 'image/png', 'x.png')], 'photo.heic', { type: 'image/heic' });

    const prepared = await service.prepare(file);

    expect(prepared.type).toBe('image/jpeg');
    expect(prepared.name).toBe('photo.jpg');
    expect(await dimensions(prepared)).toEqual({ width: 300, height: 200 });
  });

  it('sends the original when the image cannot be decoded (D3)', async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], 'photo.heic', { type: 'image/heic' });

    expect(await service.prepare(file)).toBe(file);
  });

  it('sends the original when preparation takes too long (red-team F3)', async () => {
    const file = new File([new Uint8Array(2 * RECEIPT_TARGET_BYTES)], 'big.heic', { type: 'image/heic' });
    service.timeoutMs = 10;
    spyOn(service as any, 'decode').and.returnValue(new Promise(() => {}));

    expect(await service.prepare(file)).toBe(file);
  });

  it('makes a smaller second pass when the first is still too large', async () => {
    const file = await imageFile(3000, 1500, 'image/png', 'big.png');
    const draw = spyOn(service as any, 'draw').and.returnValues(
      Promise.resolve(new Blob([new Uint8Array(RECEIPT_TARGET_BYTES + 1)], { type: 'image/jpeg' })),
      Promise.resolve(new Blob([new Uint8Array(1000)], { type: 'image/jpeg' })),
    );

    const prepared = await service.prepare(file);

    expect(draw.calls.count()).toBe(2);
    expect(draw.calls.argsFor(0)[1]).toEqual({ maxSide: 2048, quality: 0.82 });
    expect(draw.calls.argsFor(1)[1]).toEqual({ maxSide: 1600, quality: 0.7 });
    expect(prepared.size).toBe(1000);
  });

  it('keeps an original JPEG that re-encoding would not make smaller', async () => {
    const file = new File([new Uint8Array(RECEIPT_TARGET_BYTES + 10)], 'p.jpg', { type: 'image/jpeg' });
    spyOn(service as any, 'decode').and.resolveTo({ naturalWidth: 100, naturalHeight: 100 });
    spyOn(service as any, 'draw').and.resolveTo(new Blob([new Uint8Array(RECEIPT_TARGET_BYTES + 20)], { type: 'image/jpeg' }));

    expect(await service.prepare(file)).toBe(file);
  });
});
