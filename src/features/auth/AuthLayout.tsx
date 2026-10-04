import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';

export interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Shared shell for the public auth screens (landing, login wizard, register,
 * pending, admin). Mobile-first: a single centered column, max ~28rem wide, so
 * every step fits a 360px viewport without horizontal scrolling. The soft
 * blue/teal radial glow follows the Figma prototype's auth background.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-full bg-secondary bg-[radial-gradient(760px_480px_at_90%_-8%,hsl(var(--teal)/0.14),transparent_60%),radial-gradient(720px_500px_at_4%_0%,hsl(var(--primary)/0.13),transparent_58%)]">
      <main className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-10 pt-6 sm:pt-10">
        <div className="mb-8">
          <Logo />
        </div>
        <div className="flex flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}
