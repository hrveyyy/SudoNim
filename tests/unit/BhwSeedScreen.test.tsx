import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import en from '@/lib/i18n/en.json';

// --- Mocks -------------------------------------------------------------------
const BRGY_ID = '11111111-1111-4111-8111-111111111111';
const invokeMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: async () => ({ data: [{ id: BRGY_ID, name: 'San Isidro' }], error: null }),
      }),
    }),
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

// AppShell pulls in auth/nav; a passthrough keeps the test focused on the form.
vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/features/admin/adminNav', () => ({ adminNav: [] }));

import BhwSeedScreen from '@/features/admin/BhwSeedScreen';
import { seedErrorKey } from '@/features/admin/seedErrors';

void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

function renderScreen() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={qc}>
        <BhwSeedScreen />
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

async function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText(en.admin.seed.email), {
    target: { value: 'bhw.new@carelink.test' },
  });
  await screen.findByRole('option', { name: 'San Isidro' });
  fireEvent.change(screen.getByLabelText(en.admin.seed.barangay), {
    target: { value: BRGY_ID },
  });
  fireEvent.click(screen.getByRole('button', { name: en.admin.seed.submit }));
}

afterEach(() => {
  cleanup();
  invokeMock.mockReset();
});

describe('BhwSeedScreen', () => {
  it('has no user-ID input; the ID is generated automatically', async () => {
    renderScreen();
    await screen.findByRole('option', { name: 'San Isidro' });
    expect(screen.queryByLabelText(en.admin.seed.user_id)).toBeNull();
    expect(screen.getByText(en.admin.seed.user_id_auto)).toBeTruthy();
  });

  it('calls seed-bhw and shows the generated user ID and temporary password', async () => {
    invokeMock.mockResolvedValue({
      data: {
        user_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        email: 'bhw.new@carelink.test',
        temporary_password: 'TmpPassw0rdXyz12',
      },
      error: null,
    });
    renderScreen();
    await fillAndSubmit();

    await screen.findByText(en.admin.seed.success_title);
    expect(invokeMock).toHaveBeenCalledWith('seed-bhw', {
      body: { email: 'bhw.new@carelink.test', barangay_id: BRGY_ID, full_name: undefined },
    });
    expect(screen.getByText('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toBeTruthy();
    expect(screen.getByText('TmpPassw0rdXyz12')).toBeTruthy();
    expect(screen.getByText('San Isidro')).toBeTruthy();

    // "Create another" returns to an empty form and drops the password.
    fireEvent.click(screen.getByRole('button', { name: en.admin.seed.create_another }));
    expect(screen.queryByText('TmpPassw0rdXyz12')).toBeNull();
    expect((screen.getByLabelText(en.admin.seed.email) as HTMLInputElement).value).toBe('');
  });

  it('shows a generic error when the function fails', async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error('boom') });
    renderScreen();
    await fillAndSubmit();
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(en.admin.seed.errors.failed),
    );
  });
});

describe('seedErrorKey', () => {
  it('maps known codes and falls back to failed', () => {
    expect(seedErrorKey('email_exists')).toBe('admin.seed.errors.email_exists');
    expect(seedErrorKey('forbidden')).toBe('admin.seed.errors.forbidden');
    expect(seedErrorKey('something_else')).toBe('admin.seed.errors.failed');
    expect(seedErrorKey(undefined)).toBe('admin.seed.errors.failed');
  });
});
