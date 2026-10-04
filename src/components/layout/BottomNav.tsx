import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { NavItem } from '@/components/layout/navTypes';

/** Mobile bottom navigation (shown below md). 44px+ touch targets. */
export function BottomNav({ items }: { items: NavItem[] }) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('common.main_nav')}
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-card/95 px-1.5 pb-[max(4px,env(safe-area-inset-bottom))] pt-1 backdrop-blur md:hidden"
    >
      {items.map(({ to, labelKey, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/me'}
          className={({ isActive }) =>
            `flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[0.68rem] no-underline hover:no-underline ${
              isActive ? 'font-bold text-primary' : 'font-medium text-muted-foreground'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                aria-hidden="true"
                className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${
                  isActive ? 'bg-accent' : ''
                }`}
              >
                <Icon className="size-[18px]" />
              </span>
              <span className="max-w-full truncate px-1">{t(labelKey)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
