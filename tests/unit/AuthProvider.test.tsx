import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- Supabase mock -------------------------------------------------------------
// Each test sets what the profile and doctor_applications lookups return.
// vi.hoisted: the mock factories below are hoisted above normal declarations.
const { auth, invoke, wipeMock, rows } = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    refreshSession: vi.fn(),
  },
  invoke: vi.fn(),
  wipeMock: vi.fn(),
  rows: { profile: null as unknown, application: null as unknown },
}));

function tableQuery(table: string) {
  const q = {
    select: () => q,
    eq: () => q,
    maybeSingle: async () => ({
      data: table === 'profiles' ? rows.profile : rows.application,
      error: null,
    }),
  };
  return q;
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth,
    from: (table: string) => tableQuery(table),
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
  },
}));

vi.mock('@/lib/db', () => ({ wipe_local_data: () => wipeMock() }));

import { AuthProvider, useAuth, type auth_state } from '@/features/auth/AuthProvider';

let api: auth_state | null = null;
function Capture() {
  api = useAuth();
  return null;
}

async function mount(): Promise<auth_state> {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <Capture />
      </AuthProvider>
    </QueryClientProvider>,
  );
  await act(async () => {});
  if (!api) throw new Error('auth api not captured');
  return api;
}

const user = { id: 'u1', user_metadata: {} };

beforeEach(() => {
  rows.profile = null;
  rows.application = null;
  auth.getSession.mockResolvedValue({ data: { session: null } });
  auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  auth.signOut.mockResolvedValue({ error: null });
  auth.refreshSession.mockResolvedValue({ data: {}, error: null });
  invoke.mockResolvedValue({ error: null });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  api = null;
});

describe('signInAs (server-side role check)', () => {
  it('accepts a matching profile role and keeps the session', async () => {
    rows.profile = { id: 'u1', role: 'citizen' };
    auth.signInWithPassword.mockResolvedValue({ data: { user }, error: null });
    const res = await (await mount()).signInAs('a@b.c', 'pw', 'citizen');
    expect(res).toEqual({ error: null, wrongPortal: false });
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('rejects a role mismatch, signs out and wipes local data', async () => {
    rows.profile = { id: 'u1', role: 'barangay_staff' };
    auth.signInWithPassword.mockResolvedValue({ data: { user }, error: null });
    const res = await (await mount()).signInAs('a@b.c', 'pw', 'citizen');
    expect(res).toEqual({ error: null, wrongPortal: true });
    expect(auth.signOut).toHaveBeenCalled();
    expect(wipeMock).toHaveBeenCalled();
  });

  it('ignores a role claimed only in user metadata', async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: { intended_role: 'admin' } } },
      error: null,
    });
    const res = await (await mount()).signInAs('a@b.c', 'pw', 'admin');
    expect(res.wrongPortal).toBe(true);
    expect(auth.signOut).toHaveBeenCalled();
  });

  it.each(['pending', 'rejected'] as const)(
    'reports a %s doctor application instead of wrong portal',
    async (status) => {
      rows.application = { status };
      auth.signInWithPassword.mockResolvedValue({ data: { user }, error: null });
      const res = await (await mount()).signInAs('a@b.c', 'pw', 'physician');
      expect(res).toEqual({ error: null, wrongPortal: false, applicationStatus: status });
      expect(auth.signOut).toHaveBeenCalled();
    },
  );

  it('resubmits a missing doctor application from sign-up metadata', async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: 'u1',
          user_metadata: { intended_role: 'physician', prc_id: '123', full_name: 'Dr X', facility_id: 'f1' },
        },
      },
      error: null,
    });
    const res = await (await mount()).signInAs('a@b.c', 'pw', 'physician');
    expect(invoke).toHaveBeenCalledWith('doctor-apply', {
      body: { prc_id: '123', full_name: 'Dr X', facility_id: 'f1' },
    });
    expect(res.applicationStatus).toBe('pending');
  });

  it('passes auth errors through without a portal mismatch', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    const res = await (await mount()).signInAs('a@b.c', 'pw', 'citizen');
    expect(res).toEqual({ error: 'bad', wrongPortal: false });
  });
});

describe('signUpCitizen', () => {
  const args = {
    email: 'a@b.c',
    password: 'pw123456',
    surname: 'Cruz',
    first_name: 'Ana',
    sex: 'female' as const,
    birthdate: '1990-05-01',
    barangay_id: 'b1',
  };

  it('keeps the new session so the citizen lands in /me', async () => {
    auth.signUp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });
    const res = await (await mount()).signUpCitizen(args);
    expect(res).toEqual({ error: null, signedIn: true });
    // The sign-up JWT still carries the birthdate; it must be replaced at once.
    expect(auth.refreshSession).toHaveBeenCalled();
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(auth.signUp.mock.calls[0][0].options.data).toMatchObject({
      intended_role: 'citizen',
      barangay_id: 'b1',
    });
  });

  it('drops the sign-up session if the refresh fails', async () => {
    auth.signUp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });
    auth.refreshSession.mockResolvedValue({ data: {}, error: { message: 'x' } });
    const res = await (await mount()).signUpCitizen(args);
    expect(res).toEqual({ error: null, signedIn: false });
    expect(auth.signOut).toHaveBeenCalled();
    expect(wipeMock).toHaveBeenCalled();
  });

  it('reports signedIn false when email confirmation is required', async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    expect(await (await mount()).signUpCitizen(args)).toEqual({ error: null, signedIn: false });
  });
});

describe('signUpDoctor', () => {
  const args = {
    email: 'd@b.c',
    password: 'pw123456',
    prc_id: '123',
    full_name: 'Dr X',
    facility_id: 'f1',
  };

  it('submits the application and signs out', async () => {
    auth.signUp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });
    const res = await (await mount()).signUpDoctor(args);
    expect(res).toEqual({ error: null, applicationSubmitted: true });
    expect(invoke).toHaveBeenCalledWith('doctor-apply', {
      body: { prc_id: '123', full_name: 'Dr X', facility_id: 'f1' },
    });
    expect(auth.signOut).toHaveBeenCalled();
  });

  it('retries the filing for an existing account without a role', async () => {
    auth.signUp.mockResolvedValue({
      data: { session: null },
      error: { code: 'user_already_exists', message: 'exists' },
    });
    auth.signInWithPassword.mockResolvedValue({ data: { user }, error: null });
    const res = await (await mount()).signUpDoctor(args);
    expect(res).toEqual({ error: null, applicationSubmitted: true });
  });

  it('refuses to file for an account that already has a role', async () => {
    rows.profile = { id: 'u1', role: 'citizen' };
    auth.signUp.mockResolvedValue({
      data: { session: null },
      error: { code: 'user_already_exists', message: 'exists' },
    });
    auth.signInWithPassword.mockResolvedValue({ data: { user }, error: null });
    const res = await (await mount()).signUpDoctor(args);
    expect(res).toEqual({ error: 'auth.doctor.already_registered', applicationSubmitted: false });
    expect(invoke).not.toHaveBeenCalled();
    expect(auth.signOut).toHaveBeenCalled();
  });

  it('defers the filing when there is no session (email confirmation on)', async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    const res = await (await mount()).signUpDoctor(args);
    expect(res).toEqual({ error: null, applicationSubmitted: false });
    expect(invoke).not.toHaveBeenCalled();
  });
});
