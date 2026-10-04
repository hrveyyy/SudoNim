import { useState } from 'react';
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

/**
 * Doctor application. Captures email + password + PRC ID now; the full intake
 * (supporting-document upload to a private bucket, pending admin approval) is
 * the doctor-apply Edge Function in a later task. After submit we show a
 * "pending approval" message rather than routing into the app.
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
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await signUpDoctor(email.trim(), password, prcId.trim());
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    setDone(true);
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
                <AlertDescription>{t('auth.doctor.pending')}</AlertDescription>
              </Alert>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">{t('auth.login.link')}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
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
