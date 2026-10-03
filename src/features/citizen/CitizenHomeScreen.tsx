import { useTranslation } from 'react-i18next';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth';

/**
 * Placeholder citizen home (`/me`). The health card, prescriptions, visits,
 * and access history arrive in later tasks; this gives self-registered
 * citizens a real destination after sign-up.
 */
export default function CitizenHomeScreen() {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-10 pt-6 sm:pt-10">
      <Card>
        <CardHeader>
          <CardTitle>{t('citizen.home.title')}</CardTitle>
          {profile?.full_name && (
            <CardDescription className="text-base">
              {t('citizen.home.greeting', { name: profile.full_name })}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">{t('citizen.home.coming_soon')}</p>
          <Button type="button" variant="outline" className="w-full" onClick={() => void signOut()}>
            <LogOut aria-hidden="true" />
            {t('auth.action.sign_out')}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
