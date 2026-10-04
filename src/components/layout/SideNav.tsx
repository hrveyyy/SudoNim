import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/Logo';
import type { NavItem } from '@/components/layout/navTypes';

/**
 * Desktop/tablet left side navigation (shown at md and up). Fixed rail with
 * the brand on top; the active item gets a soft tint plus an inset bar so the
 * state is not conveyed by color alone.
 */
export function SideNav({ items }: { items: NavItem[] }) {
  const { t } = useTranslation();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border-strong/60 bg-secondary px-4 pb-4 pt-6 md:flex">
      <div className="px-2 pb-6">
        <Logo tagline />
      </div>
      <nav aria-label={t('common.main_nav')} className="flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {items.map(({ to, labelKey, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/me'}
                className={({ isActive }) =>
                  `flex min-h-touch items-center gap-3 rounded-[9px] px-3 text-sm no-underline transition-colors hover:no-underline ${
                    isActive
                      ? 'bg-accent font-bold text-accent-foreground shadow-[inset_3px_0_0_hsl(var(--primary))]'
                      : 'font-medium text-muted-foreground hover:bg-card hover:text-foreground'
                  }`
                }
              >
                <Icon aria-hidden="true" className="size-[18px] shrink-0" />
                {t(labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
