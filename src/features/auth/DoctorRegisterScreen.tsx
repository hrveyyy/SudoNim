import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ClipboardCheck, Loader2, Stethoscope } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { StepBackButton } from '@/features/auth/steps/StepBackButton';
import { supabase } from '@/lib/supabase';

// Same look as <Input /> so the native select matches the text fields.
const SELECT_CLASS =
  'flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Doctor application. Creates the account and submits the application
 * (PRC ID, name, hospital) through the doctor-apply Edge Function, which puts
 * it in the admin approval queue. The hospital becomes the doctor's referral
 * inbox once approved. Supporting-document upload is not built yet.
 */
export default function DoctorRegisterScreen() {
  const { t } = useTranslation();
  const { signUpDoctor } = useAuth();
  const navigate = useNavigate();
  // Back to the login wizard's role step, with "new" still selected.
  const backToRoles = () => navigate('/login', { state: { status: 'new' } });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [prcId, setPrcId] = useState('');
  const [fullName, setFullName] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { submitted: boolean }>(null);
  const [busy, setBusy] = useState(false);

  // Hospital list, readable before sign-in (migration 0008).
  const hospitals = useQuery({
    queryKey: ['facilities', 'hospital', 'public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('id, name')
        .eq('kind', 'hospital')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return; // `required` on the select blocks this in practice
    setBusy(true);
    setError(null);
    const { error, applicationSubmitted } = await signUpDoctor({
      email: email.trim(),
      password,
      prc_id: prcId.trim(),
      full_name: fullName.trim(),
      facility_id: facilityId,
    });
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    setDone({ submitted: applicationSubmitted });
  };

  return (
    <AuthLayout>
      {!done && <StepBackButton label={t('auth.role.back')} onClick={backToRoles} />}
      <Card className="motion-safe:duration-300 motion-safe:animate-in motion-safe:fade-in">
        <CardHeader>
          <span
            aria-hidden="true"
            className="mb-2 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Stethoscope className="size-6" />
          </span>
          <CardTitle>{t('auth.doctor.title')}</CardTitle>
          {!done && <CardDescription>{t('auth.doctor.subtitle')}</CardDescription>}
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-5">
              <Alert role="status" variant="info">
                <ClipboardCheck aria-hidden="true" className="size-4" />
                <AlertDescription>
                  {done.submitted ? t('auth.doctor.pending') : t('auth.doctor.apply_retry')}
                </AlertDescription>
              </Alert>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">{t('auth.login.link')}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="full_name">{t('auth.field.full_name')}</Label>
                <Input
                  id="full_name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.field.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prc">{t('auth.doctor.prc_id')}</Label>
                <Input
                  id="prc"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={prcId}
                  onChange={(e) => setPrcId(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facility">{t('auth.field.hospital')}</Label>
                <select
                  id="facility"
                  className={SELECT_CLASS}
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                  disabled={hospitals.isPending}
                  aria-describedby={hospitals.isError ? 'facility-error' : undefined}
                  required
                >
                  <option value="" disabled>
                    {t('auth.field.select')}
                  </option>
                  {hospitals.data?.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
                {hospitals.isError && (
                  <p id="facility-error" className="text-xs text-destructive">
                    {t('auth.doctor.hospitals_failed')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.field.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  aria-describedby="password-hint"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <p id="password-hint" className="text-xs text-muted-foreground">
                  {t('auth.field.password_hint')}
                </p>
              </div>

              {error && (
                <Alert role="alert" variant="destructive">
                  <AlertCircle aria-hidden="true" className="size-4" />
                  {/* error is an auth.doctor.* key or a raw Supabase message */}
                  <AlertDescription>{t(error)}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={busy} className="w-full">
                {busy && <Loader2 aria-hidden="true" className="animate-spin" />}
                {busy ? t('auth.doctor.submitting') : t('auth.doctor.submit')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
