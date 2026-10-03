import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2, MailCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthLayout } from '@/features/auth/AuthLayout';

/**
 * Citizen self-registration (email + password here; name/sex/birthdate are
 * captured by register_citizen in a later migration). The account is
 * `unverified` until a BHW verifies in person, so after sign-up we show a
 * pending-verification message rather than routing into the app.
 */
export default function RegisterScreen() {
  const { t } = useTranslation();
  const { signUpCitizen } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await signUpCitizen(email.trim(), password);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    setDone(true);
  };

  return (
    <AuthLayout>
      <Card className="motion-safe:duration-300 motion-safe:animate-in motion-safe:fade-in">
        <CardHeader>
          <CardTitle>{t('auth.register.title')}</CardTitle>
          {!done && <CardDescription>{t('auth.register.subtitle')}</CardDescription>}
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-5">
              <Alert role="status" variant="info">
                <MailCheck aria-hidden="true" className="size-4" />
                <AlertDescription>{t('auth.register.pending')}</AlertDescription>
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
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={busy} className="w-full">
                {busy && <Loader2 aria-hidden="true" className="animate-spin" />}
                {busy ? t('auth.register.submitting') : t('auth.register.submit')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {!done && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('auth.register.have_account')}{' '}
          <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            {t('auth.login.link')}
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
