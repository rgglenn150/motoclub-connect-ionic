import { Injectable } from '@angular/core';

/**
 * Prepared receipts aim below this size, which leaves headroom under a 1 MB
 * proxy body limit (spec 008 research R1/R3, red-team F4).
 */
export const RECEIPT_TARGET_BYTES = 900 * 1024;

/** Files already in a format every reader takes; sent as is when small (FR-002). */
const PASSTHROUGH_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** First pass keeps receipts legible when zoomed; the second only if still too big. */
const PASSES: EncodePass[] = [
  { maxSide: 2048, quality: 0.82 },
  { maxSide: 1600, quality: 0.7 },
];

interface EncodePass {
  maxSide: number;
  quality: number;
}

/**
 * Turns a picked receipt photo (often a large HEIC from iPhone/iPad) into a
 * modest JPEG before it is read or stored (spec 008 Story 1). Never fails: if
 * the browser can't decode the file or takes too long, the original is used (D3).
 */
@Injectable({ providedIn: 'root' })
export class ReceiptImageService {
  /** Red-team F3: a huge photo on an old device must not freeze the form. */
  timeoutMs = 10_000;

  async prepare(file: File): Promise<File> {
    if (PASSTHROUGH_TYPES.includes(file.type) && file.size <= RECEIPT_TARGET_BYTES) return file;
    try {
      return await this.withTimeout(this.reencode(file));
    } catch {
      return file;
    }
  }

  private async reencode(file: File): Promise<File> {
    const img = await this.decode(file);
    let blob: Blob | null = null;
    for (const pass of PASSES) {
      blob = await this.draw(img, pass);
      if (blob.size <= RECEIPT_TARGET_BYTES) break;
    }
    // A standard file that re-encoding can't shrink is better left alone.
    if (!blob || (PASSTHROUGH_TYPES.includes(file.type) && blob.size >= file.size)) return file;
    const base = file.name.replace(/\.[^.]+$/, '') || 'receipt';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified });
  }

  /** `<img>` decoding applies EXIF orientation and decodes HEIC in iOS WebKit (research R2). */
  private decode(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image could not be decoded'));
      };
      img.src = url;
    });
  }

  private draw(img: HTMLImageElement, { maxSide, quality }: EncodePass): Promise<Blob> {
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.reject(new Error('No canvas context'));
    // JPEG has no transparency: a transparent screenshot would otherwise turn black.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed'))), 'image/jpeg', quality),
    );
  }

  private withTimeout<T>(work: Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Preparation timed out')), this.timeoutMs);
      work.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }
}
