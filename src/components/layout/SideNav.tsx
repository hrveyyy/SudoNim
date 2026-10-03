import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { NavItem } from '@/components/layout/navTypes';

/** Desktop/tablet left side navigation (shown at md and up). */
export function SideNav({ items }: { items: NavItem[] }) {
  const { t } = useTranslation();
  return (
    <nav className="hidden w-56 shrink-0 border-r border-border bg-surface p-3 md:block">
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `flex min-h-touch items-center gap-2 rounded-cl px-3 py-2 text-sm ${
                  isActive ? 'bg-primary text-white font-semibold' : 'text-text-main hover:bg-bg'
                }`
              }
            >
              <span aria-hidden>{item.glyph}</span>
              {t(item.labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
