import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import en from '@/lib/i18n/en.json';

// --- Mocks -------------------------------------------------------------------
// Control navigation without a real router outlet, while keeping MemoryRouter
// (and everything else from react-router-dom) intact.
const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

// Mock the AuthProvider module so useAuth returns a controllable signInAs and
// no Supabase client is ever touched.
const signInAsMock = vi.fn();
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ signInAs: signInAsMock }),
}));

// Import the component AFTER the mocks are registered.
import { SignInForm } from '@/features/auth/SignInForm';

// --- i18n: a real instance backed by the project's en.json -------------------
void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

function renderForm(ui: ReactElement) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nextProvider>,
  );
}

/** Fill both fields and submit; defaults produce a valid form. */
function fillAndSubmit(email = 'citizen@example.com', password = 'secret12') {
  if (email !== null) {
    fireEvent.change(screen.getByLabelText(en.auth.field.email), {
      target: { value: email },
    });
  }
  if (password !== null) {
    fireEvent.change(screen.getByLabelText(en.auth.field.password), {
      target: { value: password },
    });
  }
  fireEvent.click(screen.getByRole('button', { name: en.auth.login.submit }));
}

beforeEach(() => {
  navigateMock.mockReset();
  signInAsMock.mockReset();
  // Default: a successful sign-in. Individual tests override as needed.
  signInAsMock.mockResolvedValue({ error: null, wrongPortal: false });
});

afterEach(() => {
  cleanup();
});

describe('SignInForm validation (Zod schema)', () => {
  it('blocks submission and shows an error when email is empty (Req 4.7, 7.2)', async () => {
    renderForm(<SignInForm expectedRole="citizen" />);
    // Only fill the password, leave email blank.
    fireEvent.change(screen.getByLabelText(en.auth.field.password), {
      target: { value: 'secret12' },
    });
    fireEvent.click(screen.getByRole('button', { name: en.auth.login.submit }));

    expect(await screen.findByText(en.auth.error.email_required)).toBeInTheDocument();
    expect(signInAsMock).not.toHaveBeenCalled();
  });

  it('blocks submission and shows an error when password is empty (Req 4.7)', async () => {
    renderForm(<SignInForm expectedRole="citizen" />);
    fireEvent.change(screen.getByLabelText(en.auth.field.email), {
      target: { value: 'citizen@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: en.auth.login.submit }));

    expect(await screen.findByText(en.auth.error.password_required)).toBeInTheDocument();
    expect(signInAsMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed email with the invalid-email error (Req 4.7, 7.2)', async () => {
    renderForm(<SignInForm expectedRole="citizen" />);
    fireEvent.change(screen.getByLabelText(en.auth.field.email), {
      target: { value: 'nope' },
    });
    fireEvent.change(screen.getByLabelText(en.auth.field.password), {
      target: { value: 'secret12' },
    });
    fireEvent.click(screen.getByRole('button', { name: en.auth.login.submit }));

    expect(await screen.findByText(en.auth.error.email_invalid)).toBeInTheDocument();
    expect(signInAsMock).not.toHaveBeenCalled();
  });
});

describe('SignInForm auth outcomes', () => {
  it('shows the wrong-portal message and does not navigate on a portal mismatch (Req 4.5)', async () => {
    signInAsMock.mockResolvedValue({ error: null, wrongPortal: true });
    renderForm(<SignInForm expectedRole="citizen" />);
    fillAndSubmit();

    expect(await screen.findByText(en.auth.login.wrong_portal)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('clears the password but keeps the email on a generic auth failure (Req 4.6)', async () => {
    signInAsMock.mockResolvedValue({ error: 'bad', wrongPortal: false });
    renderForm(<SignInForm expectedRole="citizen" />);
    fillAndSubmit('citizen@example.com', 'secret12');

    expect(await screen.findByText(en.auth.login.failed)).toBeInTheDocument();

    const emailInput = screen.getByLabelText(en.auth.field.email) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(en.auth.field.password) as HTMLInputElement;
    expect(emailInput.value).toBe('citizen@example.com');
    expect(passwordInput.value).toBe('');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('navigates to / on a successful sign-in (Req 4.4)', async () => {
    signInAsMock.mockResolvedValue({ error: null, wrongPortal: false });
    renderForm(<SignInForm expectedRole="citizen" />);
    fillAndSubmit();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
    });
  });
});

describe('SignInForm lockout (Req 4.8)', () => {
  it('locks after 5 failures and blocks further sign-in calls', async () => {
    signInAsMock.mockResolvedValue({ error: 'bad', wrongPortal: false });
    renderForm(<SignInForm expectedRole="citizen" />);

    const email = 'citizen@example.com';
    // Submit five failing attempts. The form clears the password each time,
    // so re-type it before every submit.
    for (let i = 0; i < 5; i += 1) {
      fillAndSubmit(email, 'secret12');
      // Wait for the attempt to resolve before the next one.
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(signInAsMock).toHaveBeenCalledTimes(i + 1));
    }

    // The 5th failure trips the lock.
    expect(
      await screen.findByText(
        en.auth.login.locked.replace('{{minutes}}', '15'),
      ),
    ).toBeInTheDocument();
    expect(signInAsMock).toHaveBeenCalledTimes(5);

    // A 6th submit is blocked locally and must not reach signInAs.
    fillAndSubmit(email, 'secret12');
    await waitFor(() =>
      expect(
        screen.getByText(en.auth.login.locked.replace('{{minutes}}', '15')),
      ).toBeInTheDocument(),
    );
    expect(signInAsMock).toHaveBeenCalledTimes(5);
  });
});
