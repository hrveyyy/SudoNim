import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/AuthProvider';

/**
 * Shown to a signed-in user who has no usable profile yet — e.g. an
 * `unverified` citizen awaiting in-person BHW verification.
 */
export default function PendingScreen() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  return (
    <main className="carelink-auth">
      <h1>{t('auth.pending.title')}</h1>
      <p>{t('auth.pending.body')}</p>
      <button type="button" onClick={() => void signOut()} style={{ minHeight: 44 }}>
        {t('auth.action.sign_out')}
      </button>
    </main>
  );
}
