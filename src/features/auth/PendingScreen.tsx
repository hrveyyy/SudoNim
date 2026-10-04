import { useTranslation } from 'react-i18next';
import { Hourglass, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthLayout } from '@/features/auth/AuthLayout';

/**
 * Fallback for a signed-in user with no profile row (e.g. a doctor applicant
 * awaiting admin approval). Citizens get a profile at sign-up (0008).
 */
export default function PendingScreen() {
  const { t } = useTranslation();
  const { signOut } = useAuth();

  return (
    <AuthLayout>
      <Card className="motion-safe:duration-300 motion-safe:animate-in motion-safe:fade-in">
        <CardHeader>
          <span
            aria-hidden="true"
            className="mb-2 flex size-12 items-center justify-center rounded-lg bg-monitor-soft text-monitor-ink"
          >
            <Hourglass className="size-6" />
          </span>
          <CardTitle>{t('auth.pending.title')}</CardTitle>
          <CardDescription className="text-base">{t('auth.pending.body')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" className="w-full" onClick={() => void signOut()}>
            <LogOut aria-hidden="true" />
            {t('auth.action.sign_out')}
          </Button>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
