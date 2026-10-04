import { useEffect, useState } from 'react';
import { renderQrSvg } from '@/lib/qr';

export interface QrCardProps {
  /** The signed payload string (CL1.<code>.<ver>.<sig>) from the server. */
  payload: string;
  size?: number;
}

/**
 * Renders a signed QR payload as an inline SVG. The payload must already be
 * signed server-side (qr-sign Edge Function); this only draws it.
 */
export function QrCard({ payload, size = 220 }: QrCardProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setError(false);
    renderQrSvg(payload)
      .then((s) => active && setSvg(s))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [payload]);

  if (error) return <div className="text-needs-referral-red text-sm">QR render failed</div>;
  if (!svg) return <div style={{ width: size, height: size }} aria-busy />;

  return (
    <div
      style={{ width: size, height: size }}
      // SVG produced locally by the qrcode lib from a signed, PHI-free payload.
      dangerouslySetInnerHTML={{ __html: svg }}
      role="img"
      aria-label="Patient QR code"
    />
  );
}
