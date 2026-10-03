import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, QrCode, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, roleHome } from '@/features/auth/AuthProvider';
import { AuthLayout } from '@/features/auth/AuthLayout';

const FEATURES: { icon: LucideIcon; key: string }[] = [
  { icon: QrCode, key: 'auth.landing.feature_record' },
  { icon: ClipboardCheck, key: 'auth.landing.feature_screening' },
  { icon: ShieldCheck, key: 'auth.landing.feature_privacy' },
];

/**
 * Public landing. A product intro and a single primary call to action that
 * leads to the staged login wizard at `/login`. No role options and no other
 * sign-in or registration links live here — role selection is internalized by
 * the login flow.
 */
export default function LandingScreen() {
  const { t } = useTranslation();
  const { loading, session, profile } = useAuth();

  // Authenticated-redirect guard. Only leave the landing when the session is
  // settled AND a profile with a defined role has resolved. While still loading
  // (Req 1.7), or when a session has no resolved profile/role (Req 1.8), stay
  // on the landing and render it. Redirect to the role home only on a resolved
  // role (Req 1.4).
  if (!loading && session && profile) {
    return <Navigate to={roleHome(profile.role)} replace />;
  }

  return (
    <AuthLayout>
      <section
        aria-labelledby="landing-title"
        className="flex flex-1 flex-col justify-center motion-safe:duration-500 motion-safe:animate-in motion-safe:fade-in"
      >
        <h1
          id="landing-title"
          className="font-heading text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl"
        >
          {t('auth.landing.title')}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{t('auth.landing.intro')}</p>

        <ul className="mt-8 space-y-3">
          {FEATURES.map(({ icon: Icon, key }) => (
            <li key={key} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm ring-1 ring-border"
              >
                <Icon className="size-5" />
              </span>
              <span className="text-sm font-medium">{t(key)}</span>
            </li>
          ))}
        </ul>

        <Button asChild size="lg" className="mt-10 w-full">
          <Link to="/login">
            {t('auth.landing.cta')}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t('auth.landing.disclaimer')}
        </p>
      </section>
    </AuthLayout>
  );
}
