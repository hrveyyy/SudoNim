import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { HeartPulse } from 'lucide-react';

export interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Shared shell for the public auth screens (landing, login wizard, register,
 * pending, admin). Mobile-first: a single centered column, max ~28rem wide, so
 * every step fits a 360px viewport without horizontal scrolling.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-full bg-gradient-to-b from-accent/70 via-background to-background">
      <main className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-10 pt-6 sm:pt-10">
        <div className="mb-8 flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
          >
            <HeartPulse className="size-5" />
          </span>
          <span className="font-heading text-lg font-bold tracking-tight">{t('app.name')}</span>
        </div>
        <div className="flex flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}
