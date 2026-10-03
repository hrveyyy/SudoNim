import QRCode from 'qrcode';

/**
 * QR payload helpers. The payload format is:
 *   CL1.<patient_code>.<qr_version>.<sig>
 * where `sig` is produced server-side (HMAC, in the qr-sign Edge Function).
 * The client NEVER computes or verifies the signature — it only parses the
 * structure and renders the image. Verification happens in resolve-qr.
 *
 * The payload contains NO personal data (no name, no birthdate).
 */

export interface qr_payload {
  version: 'CL1';
  patient_code: string;
  qr_version: number;
  sig: string;
}

/** Parse and structurally validate a scanned payload. Returns null if invalid. */
export function parseQrPayload(raw: string): qr_payload | null {
  const parts = raw.trim().split('.');
  if (parts.length !== 4) return null;
  const [prefix, code, verStr, sig] = parts;
  if (prefix !== 'CL1') return null;
  if (!code || !sig) return null;
  const qr_version = Number(verStr);
  if (!Number.isInteger(qr_version) || qr_version < 1) return null;
  return { version: 'CL1', patient_code: code, qr_version, sig };
}

/** Render a signed payload to an SVG string (for ID cards). */
export function renderQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
}

/** Render a signed payload to a PNG data URL (for export/print). */
export function renderQrPngDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, { margin: 1, errorCorrectionLevel: 'M', width: 512 });
}
