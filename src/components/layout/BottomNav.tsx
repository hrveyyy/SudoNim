import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { NavItem } from '@/components/layout/navTypes';

/** Mobile bottom navigation (shown below md). 44px+ touch targets. */
export function BottomNav({ items }: { items: NavItem[] }) {
  const { t } = useTranslation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-border bg-surface md:hidden">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs ${
              isActive ? 'text-primary font-semibold' : 'text-text-muted'
            }`
          }
        >
          <span aria-hidden className="text-base">
            {item.glyph}
          </span>
          <span className="truncate px-1">{t(item.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
