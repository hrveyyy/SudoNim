import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/AuthProvider';

export interface TopBarProps {
  title: string;
}

/** App top bar: title + sign-out. */
export function TopBar({ title }: TopBarProps) {
  const { t, i18n } = useTranslation();
  const { signOut } = useAuth();

  const toggleLang = () => {
    void i18n.changeLanguage(i18n.language === 'en' ? 'fil' : 'en');
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-surface px-4">
      <h1 className="truncate font-heading text-lg font-bold">{title}</h1>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleLang}
          className="min-h-touch rounded-cl border border-border bg-transparent px-3 text-sm"
          aria-label={t('common.toggle_language')}
        >
          {i18n.language === 'en' ? 'FIL' : 'EN'}
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="min-h-touch rounded-cl border border-border bg-transparent px-3 text-sm"
        >
          {t('auth.action.sign_out')}
        </button>
      </div>
    </header>
  );
}
