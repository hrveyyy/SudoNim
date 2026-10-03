import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import en from '@/lib/i18n/en.json';

// --- Mocks -------------------------------------------------------------------
// Keep MemoryRouter, Routes, Route, Navigate and Link intact; LandingScreen
// redirects via <Navigate>, so no useNavigate override is needed.
//
// A controllable auth state drives the three redirect guard states. roleHome is
// a small switch so the citizen case resolves to '/me'.
let authState: {
  loading: boolean;
  session: unknown;
  profile: { role: string } | null;
};

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => authState,
  roleHome: (role: string) => (role === 'citizen' ? '/me' : '/other'),
}));

// Import the component AFTER the mocks are registered.
import LandingScreen from '@/features/auth/LandingScreen';

// --- i18n: a real instance backed by the project's en.json -------------------
void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

/**
 * Render the landing at '/' inside a router with sentinel role-home routes, so
 * a `<Navigate>` away from the landing lands on a detectable element.
 */
function renderLanding() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/me" element={<div>CITIZEN HOME</div>} />
          <Route path="/other" element={<div>OTHER HOME</div>} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

beforeEach(() => {
  authState = { loading: true, session: null, profile: null };
});

afterEach(() => {
  cleanup();
});

describe('LandingScreen redirect guard', () => {
  it('renders the landing and does not redirect while loading (Req 1.7)', () => {
    authState = { loading: true, session: { user: { id: 'u1' } }, profile: null };
    renderLanding();

    expect(screen.getByText(en.auth.landing.cta)).toBeInTheDocument();
    expect(screen.queryByText('CITIZEN HOME')).toBeNull();
    expect(screen.queryByText('OTHER HOME')).toBeNull();
  });

  it('renders the landing when a session resolves to no profile/role (Req 1.8)', () => {
    authState = { loading: false, session: { user: { id: 'u1' } }, profile: null };
    renderLanding();

    expect(screen.getByText(en.auth.landing.cta)).toBeInTheDocument();
    expect(screen.queryByText('CITIZEN HOME')).toBeNull();
    expect(screen.queryByText('OTHER HOME')).toBeNull();
  });

  it('renders a single CTA to /login and no role-option links when signed out (Req 1.1, 1.2, 1.6)', () => {
    authState = { loading: false, session: null, profile: null };
    renderLanding();

    expect(screen.getByText(en.auth.landing.title)).toBeInTheDocument();
    expect(screen.getByText(en.auth.landing.intro)).toBeInTheDocument();

    // Exactly one link, and it points at /login.
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent(en.auth.landing.cta);
    expect(links[0]).toHaveAttribute('href', '/login');

    // No role-option entry points leak onto the landing.
    expect(screen.queryByText(en.auth.portal.citizen)).toBeNull();
    expect(screen.queryByText(en.auth.portal.staff)).toBeNull();
    expect(screen.queryByText(en.auth.portal.doctor)).toBeNull();
  });

  it('redirects to roleHome(role) when a defined role resolves (Req 1.4)', () => {
    authState = {
      loading: false,
      session: { user: { id: 'u1' } },
      profile: { role: 'citizen' },
    };
    renderLanding();

    // The <Navigate> sends us to the citizen sentinel; the landing CTA is gone.
    expect(screen.getByText('CITIZEN HOME')).toBeInTheDocument();
    expect(screen.queryByText(en.auth.landing.cta)).toBeNull();
  });
});
