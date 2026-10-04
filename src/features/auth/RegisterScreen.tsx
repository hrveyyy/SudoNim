import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, MailCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { StepBackButton } from '@/features/auth/steps/StepBackButton';
import { supabase } from '@/lib/supabase';
import { today_manila_iso } from '@/lib/dates';

// Same look as <Input /> so the native selects match the text fields.
const SELECT_CLASS =
  'flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Citizen self-registration: name, sex, birthdate, barangay, email, password.
 * The sign-up trigger (0008) creates the patient row and citizen profile, so
 * the account is active right away. With a session we route into the app;
 * if the project requires email confirmation we ask the user to sign in.
 */
export default function RegisterScreen() {
  const { t } = useTranslation();
  const { signUpCitizen } = useAuth();
  const navigate = useNavigate();
  // Back to the login wizard's role step, with "new" still selected.
  const backToRoles = () => navigate('/login', { state: { status: 'new' } });

  const [surname, setSurname] = useState('');
  const [firstName, setFirstName] = useState('');
  const [sex, setSex] = useState<'' | 'male' | 'female'>('');
  const [birthdate, setBirthdate] = useState('');
  const [barangayId, setBarangayId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const barangays = useQuery({
    queryKey: ['barangays', 'public'],
    queryFn: async () => {
      const { data, error } = await supabase.from('barangays').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sex === '') return; // `required` on the select blocks this in practice
    setBusy(true);
    setError(null);
    const { error, signedIn } = await signUpCitizen({
      email: email.trim(),
      password,
      surname: surname.trim(),
      first_name: firstName.trim(),
      sex,
      birthdate,
      barangay_id: barangayId,
    });
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    // Landing redirects to the role home once the profile resolves.
    if (signedIn) {
      navigate('/', { replace: true });
      return;
    }
    setDone(true);
  };

  return (
    <AuthLayout>
      {!done && <StepBackButton label={t('auth.role.back')} onClick={backToRoles} />}
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
                <AlertDescription>{t('auth.register.created')}</AlertDescription>
              </Alert>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">{t('auth.login.link')}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="surname">{t('auth.field.surname')}</Label>
                <Input
                  id="surname"
                  autoComplete="family-name"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="first_name">{t('auth.field.first_name')}</Label>
                <Input
                  id="first_name"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sex">{t('auth.field.sex')}</Label>
                <select
                  id="sex"
                  className={SELECT_CLASS}
                  value={sex}
                  onChange={(e) => setSex(e.target.value as '' | 'male' | 'female')}
                  required
                >
                  <option value="" disabled>{t('auth.field.select')}</option>
                  <option value="female">{t('auth.field.sex_female')}</option>
                  <option value="male">{t('auth.field.sex_male')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthdate">{t('auth.field.birthdate')}</Label>
                <Input
                  id="birthdate"
                  type="date"
                  autoComplete="bday"
                  max={today_manila_iso()}
                  aria-describedby="birthdate-hint"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  required
                />
                <p id="birthdate-hint" className="text-xs text-muted-foreground">
                  {t('auth.register.pairing_note')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="barangay">{t('auth.field.barangay')}</Label>
                <select
                  id="barangay"
                  className={SELECT_CLASS}
                  value={barangayId}
                  onChange={(e) => setBarangayId(e.target.value)}
                  disabled={barangays.isPending}
                  aria-describedby={barangays.isError ? 'barangay-error' : undefined}
                  required
                >
                  <option value="" disabled>{t('auth.field.select')}</option>
                  {barangays.data?.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {barangays.isError && (
                  <p id="barangay-error" className="text-xs text-destructive">
                    {t('auth.register.barangays_failed')}
                  </p>
                )}
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
    </AuthLayout>
  );
}
