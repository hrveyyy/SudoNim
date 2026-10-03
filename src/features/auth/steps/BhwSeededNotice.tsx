import { useTranslation } from 'react-i18next';
import { ArrowLeft, HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface BhwSeededNoticeProps {
  /** Returns to the role step. */
  onBack: () => void;
}

/**
 * BhwSeededNotice: shown when a new visitor selects the barangay_staff role.
 * Barangay health worker accounts are created by an administrator and cannot be
 * self-registered, so this presents the seeded-only message plus a back control
 * (44px touch target) that returns to the role step. All text is i18n-resolved.
 */
export function BhwSeededNotice({ onBack }: BhwSeededNoticeProps) {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="bhw-seeded-title"
      className="motion-safe:duration-300 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
    >
      <Card>
        <CardHeader>
          <span
            aria-hidden="true"
            className="mb-2 flex size-12 items-center justify-center rounded-lg bg-teal/10 text-teal"
          >
            <HeartHandshake className="size-6" />
          </span>
          <CardTitle id="bhw-seeded-title">{t('auth.bhw.seeded_title')}</CardTitle>
          <CardDescription className="text-base">{t('auth.bhw.seeded_body')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" className="w-full" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            {t('auth.bhw.back')}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
