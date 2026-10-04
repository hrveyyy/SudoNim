import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { SideNav } from '@/components/layout/SideNav';
import type { NavItem } from '@/components/layout/navTypes';

export interface AppShellProps {
  title: string;
  nav: NavItem[];
  children: ReactNode;
}

/**
 * Role app shell. Mobile: TopBar + content + BottomNav. Tablet/desktop: fixed
 * SideNav rail + content. Bottom padding on mobile clears the fixed bottom nav.
 */
export function AppShell({ title, nav, children }: AppShellProps) {
  const { t } = useTranslation();
  return (
    <div className="carelink-app min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary no-underline px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {t('common.skip_to_content')}
      </a>
      <SideNav items={nav} />
      <div className="flex min-h-screen flex-col md:ml-64">
        <TopBar title={title} />
        <main
          id="main-content"
          className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:px-10 md:pb-16 md:pt-8"
        >
          {children}
        </main>
      </div>
      <BottomNav items={nav} />
    </div>
  );
}
