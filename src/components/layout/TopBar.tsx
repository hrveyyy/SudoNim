import { useTranslation } from 'react-i18next';
import { Languages, LogOut } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/features/auth/AuthProvider';

export interface TopBarProps {
  title: string;
}

const actionClass =
  'inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-[10px] border border-border-strong bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground';

/** App top bar: title + language toggle + sign-out. Sticky, frosted. */
export function TopBar({ title }: TopBarProps) {
  const { t, i18n } = useTranslation();
  const { signOut } = useAuth();

  const toggleLang = () => {
    void i18n.changeLanguage(i18n.language === 'en' ? 'fil' : 'en');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-md md:h-[72px] md:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <Logo compact className="md:hidden" />
        <h1 className="m-0 truncate text-lg font-bold md:text-xl">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={toggleLang}
          className={actionClass}
          aria-label={t('common.toggle_language')}
        >
          <Languages aria-hidden="true" className="size-4" />
          <span>{i18n.language === 'en' ? 'FIL' : 'EN'}</span>
        </button>
        <button type="button" onClick={() => void signOut()} className={actionClass}>
          <LogOut aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">{t('auth.action.sign_out')}</span>
          <span className="sr-only sm:hidden">{t('auth.action.sign_out')}</span>
        </button>
      </div>
    </header>
  );
}
