// HMAC-SHA256 helpers for the signed QR payload.
//
// Payload format: CL1.<patient_code>.<qr_version>.<sig>
//   sig = first 16 chars of base64url(HMAC-SHA256(secret, `patient_code.qr_version`))
//
// The secret (QR_HMAC_SECRET) lives ONLY in the Edge Function environment and
// never reaches the browser or the repo. Signature compares in constant time.

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

/** Compute the 16-char signature for a patient_code + qr_version. */
export async function signQr(
  secret: string,
  patientCode: string,
  qrVersion: number,
): Promise<string> {
  const key = await hmacKey(secret);
  const data = encoder.encode(`${patientCode}.${qrVersion}`);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
  return base64url(mac).slice(0, 16);
}

/** Build the full signed payload string. */
export async function buildPayload(
  secret: string,
  patientCode: string,
  qrVersion: number,
): Promise<string> {
  const sig = await signQr(secret, patientCode, qrVersion);
  return `CL1.${patientCode}.${qrVersion}.${sig}`;
}

/** Constant-time string compare (avoids early-exit timing leaks). */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verify a signature for a given patient_code + qr_version. */
export async function verifyQr(
  secret: string,
  patientCode: string,
  qrVersion: number,
  sig: string,
): Promise<boolean> {
  const expected = await signQr(secret, patientCode, qrVersion);
  return constantTimeEqual(expected, sig);
}
