/**
 * Whether a PDF is password-protected (spec 004 D6, research R3).
 * Every encrypted PDF names an /Encrypt dictionary in its trailer, so the app
 * can ask for a password before uploading. The server's PASSWORD_REQUIRED
 * answer covers any file this misjudges.
 */
export async function isPdfEncrypted(file: Blob): Promise<boolean> {
  const bytes = await file.arrayBuffer();
  // latin1 maps every byte to one character, so binary data decodes safely.
  return /\/Encrypt\b/.test(new TextDecoder('latin1').decode(bytes));
}
