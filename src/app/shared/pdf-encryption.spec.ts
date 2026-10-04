import { isPdfEncrypted } from './pdf-encryption';

// Spec 004 D6, research R3: ask for a password only for protected PDFs.
describe('isPdfEncrypted', () => {
  const pdf = (body: string) => new Blob([`%PDF-1.6\n${body}\n%%EOF`], { type: 'application/pdf' });

  it('is true when the trailer names an /Encrypt dictionary', async () => {
    expect(await isPdfEncrypted(pdf('trailer << /Size 9 /Root 1 0 R /Encrypt 8 0 R >>'))).toBeTrue();
    expect(await isPdfEncrypted(pdf('trailer<</Encrypt<</Filter/Standard/V 4>>>>'))).toBeTrue();
  });

  it('is false for an unprotected PDF', async () => {
    expect(await isPdfEncrypted(pdf('trailer << /Size 9 /Root 1 0 R >>'))).toBeFalse();
  });

  it('does not mistake /EncryptMetadata alone for encryption', async () => {
    expect(await isPdfEncrypted(pdf('<< /EncryptMetadata false >>'))).toBeFalse();
  });
});
