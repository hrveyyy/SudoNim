import { useAuth, type user_role } from '@/features/auth/AuthProvider';

/** The current user's role, or null while loading / signed out. */
export function useRole(): user_role | null {
  const { profile } = useAuth();
  return profile?.role ?? null;
}
