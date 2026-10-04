import type { ReactNode } from 'react';
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
 * Role app shell. Mobile: TopBar + content + BottomNav. Tablet/desktop:
 * SideNav + content. Content area scrolls; bottom nav is fixed on mobile so we
 * add bottom padding there.
 */
export function AppShell({ title, nav, children }: AppShellProps) {
  return (
    <div className="carelink-app min-h-screen bg-bg text-text-main">
      <div className="flex">
        <SideNav items={nav} />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar title={title} />
          <main className="flex-1 p-4 pb-24 md:pb-6">{children}</main>
        </div>
      </div>
      <BottomNav items={nav} />
    </div>
  );
}
