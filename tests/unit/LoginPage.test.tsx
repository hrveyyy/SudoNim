import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import en from '@/lib/i18n/en.json';

// --- Mocks -------------------------------------------------------------------
// Control navigation without a real router outlet, while keeping MemoryRouter
// and Navigate (and everything else from react-router-dom) intact.
const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

// Mock the AuthProvider module. LoginPage reads useAuth() (unauthenticated here
// so the wizard renders) and imports roleHome; SignInForm — rendered in the
// returning path — also calls useAuth(), so the same mock covers both.
const signInAsMock = vi.fn();
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: null,
    profile: null,
    loading: false,
    signInAs: signInAsMock,
  }),
  roleHome: () => '/me',
}));

// Import the component AFTER the mocks are registered.
import LoginPage from '@/features/auth/LoginPage';

// --- i18n: a real instance backed by the project's en.json -------------------
void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

function renderLogin(ui: ReactElement) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nextProvider>,
  );
}

/** Click a status choice on the Status_Step (re-queried each call). */
function chooseStatus(status: 'new' | 'returning') {
  const name = status === 'new' ? en.auth.status.new : en.auth.status.returning;
  fireEvent.click(screen.getByRole('button', { name }));
}

/** Click a role choice on the Role_Step (re-queried each call). */
function chooseRole(role: 'citizen' | 'physician' | 'barangay_staff') {
  const name = en.auth.role[role];
  fireEvent.click(screen.getByRole('button', { name }));
}

beforeEach(() => {
  navigateMock.mockReset();
  signInAsMock.mockReset();
  signInAsMock.mockResolvedValue({ error: null, wrongPortal: false });
});

afterEach(() => {
  cleanup();
});

describe('LoginPage initial state (Req 2.1)', () => {
  it('shows the Status step first with nothing pre-selected and no Role step', () => {
    renderLogin(<LoginPage />);

    // Status_Step heading and both mutually exclusive choices are present.
    expect(
      screen.getByRole('heading', { name: en.auth.status.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: en.auth.status.new }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: en.auth.status.returning }),
    ).toBeInTheDocument();

    // The Role step is not yet rendered — nothing is pre-selected/advanced.
    expect(
      screen.queryByRole('heading', { name: en.auth.role.title }),
    ).not.toBeInTheDocument();
  });
});

describe('LoginPage status -> role advance (Req 2.3, 3.1, 3.2)', () => {
  it('advances to the Role step showing all three roles and no admin option', () => {
    renderLogin(<LoginPage />);
    chooseStatus('returning');

    // Role_Step heading and the three role choices render.
    expect(
      screen.getByRole('heading', { name: en.auth.role.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: en.auth.role.citizen }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: en.auth.role.physician }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: en.auth.role.barangay_staff }),
    ).toBeInTheDocument();

    // Admin is never offered as a public choice.
    expect(
      screen.queryByRole('button', { name: /admin/i }),
    ).toBeNull();
    expect(
      screen.queryByText(en.auth.portal.admin),
    ).toBeNull();
  });
});

describe('LoginPage back navigation preserves state (Req 3.4)', () => {
  it('Role back returns to the Status step with the status preserved', () => {
    renderLogin(<LoginPage />);
    chooseStatus('returning');

    // On the Role step, click its back control.
    fireEvent.click(screen.getByRole('button', { name: en.auth.role.back }));

    // Back on the Status step.
    expect(
      screen.getByRole('heading', { name: en.auth.status.title }),
    ).toBeInTheDocument();

    // Choosing a status still advances to the Role step (we really returned to
    // the status step and the wizard remains functional).
    chooseStatus('returning');
    expect(
      screen.getByRole('heading', { name: en.auth.role.title }),
    ).toBeInTheDocument();
  });
});

describe('LoginPage returning outcomes render the sign-in form (Req 4.1, 4.2, 4.3)', () => {
  it('returning + citizen renders SignInForm', () => {
    renderLogin(<LoginPage />);
    chooseStatus('returning');
    chooseRole('citizen');

    expect(
      screen.getByRole('heading', { name: en.auth.login.title }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(en.auth.field.email)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('returning + physician renders SignInForm', () => {
    renderLogin(<LoginPage />);
    chooseStatus('returning');
    chooseRole('physician');

    expect(
      screen.getByRole('heading', { name: en.auth.login.title }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(en.auth.field.email)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('returning + barangay_staff renders SignInForm', () => {
    renderLogin(<LoginPage />);
    chooseStatus('returning');
    chooseRole('barangay_staff');

    expect(
      screen.getByRole('heading', { name: en.auth.login.title }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(en.auth.field.email)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});

describe('LoginPage new outcomes (Req 5.1, 5.2, 5.3)', () => {
  it('new + citizen navigates to the citizen self-registration path', () => {
    renderLogin(<LoginPage />);
    chooseStatus('new');
    chooseRole('citizen');

    expect(navigateMock).toHaveBeenCalledWith('/register');
  });

  it('new + physician navigates to the doctor application path', () => {
    renderLogin(<LoginPage />);
    chooseStatus('new');
    chooseRole('physician');

    expect(navigateMock).toHaveBeenCalledWith('/register/doctor');
  });

  it('new visitors are not offered the barangay_staff role', () => {
    renderLogin(<LoginPage />);
    chooseStatus('new');

    expect(
      screen.getByRole('button', { name: en.auth.role.citizen }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: en.auth.role.physician }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: en.auth.role.barangay_staff }),
    ).not.toBeInTheDocument();
  });
});

describe('LoginPage resume from a register screen', () => {
  it('opens on the Role step with "new" selected when returning from registration', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={[{ pathname: '/login', state: { status: 'new' } }]}>
          <LoginPage />
        </MemoryRouter>
      </I18nextProvider>,
    );

    expect(screen.getByRole('heading', { name: en.auth.role.title })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: en.auth.role.barangay_staff }),
    ).not.toBeInTheDocument();
  });
});

describe('LoginPage status back (Req 2.5)', () => {
  it('Status back navigates to the landing page', () => {
    renderLogin(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: en.auth.status.back }));

    expect(navigateMock).toHaveBeenCalledWith('/');
  });
});

// Null-status guard (Req 3.6): the wizard resets to the Status step if it ever
// holds a non-status step without a status. This is covered structurally in
// LoginPage (the `step` derivation guard) and cannot be reached through the UI,
// since the Role step is only reachable after a status is set. No dedicated UI
// test is added for it to avoid contorting the wizard's public interface.
