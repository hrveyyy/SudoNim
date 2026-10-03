import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth';
import '@/lib/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Doctor/citizen/dashboard reads come from Supabase directly; staff reads
      // come from IndexedDB. Keep server reads reasonably fresh.
      staleTime: 30_000,
      retry: 1,
    },
  },
});

/** App-wide providers: QueryClient, Auth, I18n (initialized on import). */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
