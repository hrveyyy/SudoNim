import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth, type user_role } from '@/features/auth/AuthProvider';

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

  const onSubmit = handleSubmit(async ({ email, password }) => {
    clearErrors('root');

    const key = lockout_key(email);
    const entry = lockouts.current.get(key);

    // Block entirely while the email is locked; do not call signInAs.
    if (entry?.lockedUntil && entry.lockedUntil > Date.now()) {
      const minutes = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
      setError('root', { message: t('auth.login.locked', { minutes }) });
      return;
    }

    const { error, wrongPortal } = await signInAs(email.trim(), password, expectedRole);

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

  return (
    <form onSubmit={onSubmit} className="carelink-auth__form" noValidate>
      <h1>{t('auth.login.title')}</h1>

      <label htmlFor="signin-email">{t('auth.field.email')}</label>
      <input
        id="signin-email"
        type="email"
        autoComplete="email"
        aria-invalid={emailError ? true : undefined}
        aria-describedby={emailError ? 'signin-email-error' : undefined}
        style={{ minHeight: 44 }}
        {...register('email')}
      />
      {emailError && (
        <p id="signin-email-error" role="alert" className="carelink-auth__error">
          {t(emailError)}
        </p>
      )}

      <label htmlFor="signin-password">{t('auth.field.password')}</label>
      <input
        id="signin-password"
        type="password"
        autoComplete="current-password"
        aria-invalid={passwordError ? true : undefined}
        aria-describedby={passwordError ? 'signin-password-error' : undefined}
        style={{ minHeight: 44 }}
        {...register('password')}
      />
      {passwordError && (
        <p id="signin-password-error" role="alert" className="carelink-auth__error">
          {t(passwordError)}
        </p>
      )}

      {formError && (
        <p role="alert" className="carelink-auth__error">
          {formError}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} style={{ minHeight: 44 }}>
        {isSubmitting ? t('auth.login.submitting') : t('auth.login.submit')}
      </button>

      {onBack && (
        <button type="button" onClick={onBack} style={{ minHeight: 44 }}>
          {t('auth.role.back')}
        </button>
      )}
    </form>
  );
}
