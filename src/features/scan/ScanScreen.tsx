import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/layout/AppShell';
import { doctorNav } from '@/features/scan/doctorNav';
import { PairingKeyModal } from '@/features/scan/PairingKeyModal';
import { parseQrPayload } from '@/lib/qr';

/**
 * Doctor scan screen. A scanned QR (camera or manual payload) is resolved via
 * the resolve-qr Edge Function (verifies the signature, returns patient_code
 * only). Then the pairing-key modal opens; on success a 12-hour grant is minted
 * and we navigate into the record.
 */
export default function ScanScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [manual, setManual] = useState('');
  const [resolvedCode, setResolvedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Resolve a full payload (CL1.code.ver.sig) via the Edge Function.
  const resolvePayload = async (payload: string) => {
    setError(null);
    const parsed = parseQrPayload(payload);
    if (!parsed) {
      setError(t('scan.resolve_failed'));
      return;
    }
    const { data, error } = await supabase.functions.invoke('resolve-qr', {
      body: { payload },
    });
    if (error || !data?.patient_code) {
      setError(t('scan.resolve_failed'));
      return;
    }
    setResolvedCode(data.patient_code as string);
  };

  // Manual entry: the doctor may type the plain patient code (no signature).
  // We go straight to the pairing modal, which validates against the DB.
  const manualLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manual.trim();
    if (!code) return;
    setResolvedCode(code);
  };

  const startCamera = async () => {
    setError(null);
    setScanning(true);
    const el = 'qr-reader';
    try {
      const scanner = new Html5Qrcode(el);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (decoded) => {
          void stopCamera();
          void resolvePayload(decoded);
        },
        undefined,
      );
    } catch {
      setScanning(false);
      setError(t('scan.resolve_failed'));
    }
  };

  const stopCamera = async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (s) {
      try {
        await s.stop();
        s.clear();
      } catch {
        // ignore
      }
    }
  };

  // Stop the camera if the component unmounts mid-scan.
  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, []);

  return (
    <AppShell title={t('scan.title')} nav={doctorNav}>
      <div className="flex flex-col gap-4">
        <div className="rounded-cl border border-border bg-surface p-4">
          <div id="qr-reader" className="mx-auto max-w-xs" />
          <div className="mt-3 flex gap-2">
            {!scanning ? (
              <button
                type="button"
                onClick={() => void startCamera()}
                className="min-h-touch rounded-cl bg-primary px-4 font-semibold text-white"
              >
                {t('scan.start_camera')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void stopCamera()}
                className="min-h-touch rounded-cl border border-border px-4"
              >
                {t('scan.stop_camera')}
              </button>
            )}
          </div>
        </div>

        <form onSubmit={manualLookup} className="rounded-cl border border-border bg-surface p-4">
          <label htmlFor="manual" className="text-sm text-text-muted">
            {t('scan.manual')}
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="manual"
              className="min-h-touch flex-1 rounded-cl border border-border bg-surface px-3"
              placeholder={t('scan.manual_placeholder')}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
            <button
              type="submit"
              className="min-h-touch rounded-cl bg-primary px-4 font-semibold text-white"
            >
              {t('scan.resolve')}
            </button>
          </div>
        </form>

        {error && (
          <p role="alert" className="text-sm text-needs-referral-red">
            {error}
          </p>
        )}
      </div>

      {resolvedCode && (
        <PairingKeyModal
          patientCode={resolvedCode}
          onCancel={() => setResolvedCode(null)}
          onSuccess={(patientId) => {
            setResolvedCode(null);
            navigate(`/doctor/patients/${patientId}`);
          }}
        />
      )}
    </AppShell>
  );
}
