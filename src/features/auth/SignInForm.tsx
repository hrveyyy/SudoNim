import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ClipboardCheck, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, type user_role } from '@/features/auth/AuthProvider';
import { StepBackButton } from '@/features/auth/steps/StepBackButton';

/** Per-email attempt record for the client-side lockout. */
interface lockout_entry {
  fails: number;
  lockedUntil: number | null;
}

const MAX_FAILS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

/** Normalize an email for use as the lockout map key (trim + lowercase). */
function lockout_key(email: string): string {
  return email.trim().toLowerCase();
}

export interface SignInFormProps {
  /** The role this form is pinned to; a mismatch is rejected as wrong portal. */
  expectedRole: user_role;
  /** Optional back control (omitted for the admin URL-only route). */
  onBack?: () => void;
}

/**
 * Field messages are i18n KEYS, resolved with t() when rendered. The Zod
 * message carries the key through react-hook-form's `error.message`.
 */
const sign_in_schema = z.object({
  email: z
    .string()
    .min(1, 'auth.error.email_required')
    .email('auth.error.email_invalid'),
  password: z.string().min(1, 'auth.error.password_required'),
});

type sign_in_values = z.infer<typeof sign_in_schema>;

/**
 * Role-pinned sign-in form (RHF + Zod). One auth mechanism; the caller declares
 * which role may pass via `expectedRole`. On success it navigates to `/` and
 * lets the landing/guard perform the role-based redirect. The real security
 * boundary is RLS in the database — this role check is a UX convenience.
 */
export function SignInForm({ expectedRole, onBack }: SignInFormProps) {
  const { t } = useTranslation();
  const { signInAs } = useAuth();
  const navigate = useNavigate();

  /**
   * Per-email attempt tracker. Held in a ref so it persists across renders
   * within this component instance (session/component memory). This is a UX
   * convenience only, NOT the security boundary — the server rate-limits auth
   * independently.
   */
  const lockouts = useRef(new Map<string, lockout_entry>());

  const {
    register,
    handleSubmit,
    resetField,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<sign_in_values>({
    resolver: zodResolver(sign_in_schema),
    defaultValues: { email: '', password: '' },
  });

  // Non-error outcome (doctor application awaiting review or rejected).
  const [notice, setNotice] = useState<string | null>(null);

  const onSubmit = handleSubmit(async ({ email, password }) => {
    clearErrors('root');
    setNotice(null);

    const key = lockout_key(email);
    const entry = lockouts.current.get(key);

    // Block entirely while the email is locked; do not call signInAs.
    if (entry?.lockedUntil && entry.lockedUntil > Date.now()) {
      const minutes = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
      setError('root', { message: t('auth.login.locked', { minutes }) });
      return;
    }

    const { error, wrongPortal, applicationStatus } = await signInAs(
      email.trim(),
      password,
      expectedRole,
    );

    // Correct credentials, but the doctor application isn't approved yet.
    // Not a failed attempt, so it doesn't count toward the lockout.
    if (applicationStatus) {
      lockouts.current.delete(key);
      resetField('password');
      setNotice(
        applicationStatus === 'pending'
          ? t('auth.doctor.awaiting_approval')
          : t('auth.doctor.rejected'),
      );
      return;
    }

    // Any non-success (wrong portal or generic error) is a failed attempt.
    if (wrongPortal || error) {
      const next: lockout_entry = entry ?? { fails: 0, lockedUntil: null };
      // Monotonic within the session: only increments here; reset on success.
      next.fails += 1;
      if (next.fails >= MAX_FAILS) {
        next.lockedUntil = Date.now() + LOCK_WINDOW_MS;
      }
      lockouts.current.set(key, next);

      if (next.lockedUntil && next.lockedUntil > Date.now()) {
        const minutes = Math.ceil((next.lockedUntil - Date.now()) / 60000);
        resetField('password');
        setError('root', { message: t('auth.login.locked', { minutes }) });
        return;
      }

      if (wrongPortal) {
        setError('root', { message: t('auth.login.wrong_portal') });
        return;
      }
      // Keep the email, clear only the password, show the generic failure.
      resetField('password');
      setError('root', { message: t('auth.login.failed') });
      return;
    }

    // Success resets the counter for this email.
    lockouts.current.delete(key);
    navigate('/', { replace: true });
  });

  const emailError = errors.email?.message;
  const passwordError = errors.password?.message;
  const formError = errors.root?.message;

  // Admin has no auth.role.* entry (it is never a public choice).
  const roleLabel =
    expectedRole === 'admin' ? t('auth.portal.admin') : t(`auth.role.${expectedRole}`);

  return (
    <section className="motion-safe:duration-300 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
      {onBack && <StepBackButton label={t('auth.role.back')} onClick={onBack} />}

      <Card>
        <CardHeader>
          <CardTitle>{t('auth.login.title')}</CardTitle>
          <CardDescription data-role={expectedRole}>
            {t('auth.login.as_role', { role: roleLabel })}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="signin-email">{t('auth.field.email')}</Label>
              <Input
                id="signin-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? 'signin-email-error' : undefined}
                {...register('email')}
              />
              {emailError && (
                <p id="signin-email-error" role="alert" className="text-sm font-medium text-destructive">
                  {t(emailError)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signin-password">{t('auth.field.password')}</Label>
              <Input
                id="signin-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={passwordError ? true : undefined}
                aria-describedby={passwordError ? 'signin-password-error' : undefined}
                {...register('password')}
              />
              {passwordError && (
                <p
                  id="signin-password-error"
                  role="alert"
                  className="text-sm font-medium text-destructive"
                >
                  {t(passwordError)}
                </p>
              )}
            </div>

            {notice && (
              <Alert role="status" variant="info">
                <ClipboardCheck aria-hidden="true" className="size-4" />
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            )}

            {formError && (
              <Alert role="alert" variant="destructive">
                <AlertCircle aria-hidden="true" className="size-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && <Loader2 aria-hidden="true" className="animate-spin" />}
              {isSubmitting ? t('auth.login.submitting') : t('auth.login.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
