import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { wipe_local_data } from '@/lib/db';

/** Role names exactly as used in code. */
export type user_role = 'admin' | 'barangay_staff' | 'physician' | 'citizen';

export interface auth_profile {
  id: string;
  role: user_role;
  full_name: string | null;
  barangay_id: string | null;
  facility_id: string | null;
}

export interface auth_state {
  /** Still determining the initial session/profile. */
  loading: boolean;
  session: Session | null;
  profile: auth_profile | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /**
   * Sign in through a role-specific portal. Authenticates, then checks the
   * profile role matches `expectedRole`; on mismatch it signs the user back
   * out and returns a wrong_portal error. This is a UX convenience — the real
   * boundary is RLS in the database.
   */
  signInAs: (
    email: string,
    password: string,
    expectedRole: user_role,
  ) => Promise<{ error: string | null; wrongPortal: boolean }>;
  signUpCitizen: (args: citizen_signup) => Promise<{ error: string | null }>;
  signUpDoctor: (
    email: string,
    password: string,
    prcId: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

/** Fields collected at citizen self-registration. */
export interface citizen_signup {
  email: string;
  password: string;
  surname: string;
  first_name: string;
  sex: 'male' | 'female';
  /** yyyy-MM-dd. */
  birthdate: string;
}

const AuthContext = createContext<auth_state | null>(null);

async function loadProfile(userId: string): Promise<auth_profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, barangay_id, facility_id')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  // The row shape matches auth_profile; cast through unknown because the
  // placeholder Database type does not yet include the profiles table.
  return data as unknown as auth_profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<auth_profile | null>(null);

  useEffect(() => {
    let active = true;

    // Initial session.
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        setProfile(await loadProfile(data.session.user.id));
      }
      setLoading(false);
    });

    // React to sign-in / sign-out.
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      if (newSession?.user) {
        setProfile(await loadProfile(newSession.user.id));
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<auth_state>(
    () => ({
      loading,
      session,
      profile,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error ? error.message : null };
      },
      async signInAs(email, password, expectedRole) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message, wrongPortal: false };
        const userId = data.user?.id;
        const prof = userId ? await loadProfile(userId) : null;
        if (!prof || prof.role !== expectedRole) {
          // Authenticated but using the wrong portal: sign back out so no
          // session lingers, and report it as a portal mismatch.
          await supabase.auth.signOut();
          return { error: null, wrongPortal: true };
        }
        return { error: null, wrongPortal: false };
      },
      async signUpCitizen(args) {
        // Self-registration collects name/sex/birthdate — the pairing-key basis
        // is surname + birthdate. We stash these in user metadata; the account
        // stays `unverified` until a BHW verifies in person and links/creates
        // the patient row (verify_citizen / register_citizen). No profile is
        // created here. Birthdate in metadata is not a public-facing field.
        const { error } = await supabase.auth.signUp({
          email: args.email,
          password: args.password,
          options: {
            data: {
              intended_role: 'citizen',
              surname: args.surname,
              first_name: args.first_name,
              sex: args.sex,
              birthdate: args.birthdate,
            },
          },
        });
        return { error: error ? error.message : null };
      },
      async signUpDoctor(email, password, prcId) {
        // Doctor application: creates the auth user and stashes the PRC ID in
        // user metadata for now. The real doctor-apply flow (PRC ID + document
        // upload to a private bucket, pending admin approval) is the
        // doctor-apply Edge Function in a later task.
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { prc_id: prcId, intended_role: 'physician' } },
        });
        return { error: error ? error.message : null };
      },
      async signOut() {
        await supabase.auth.signOut();
        // Wipe locally cached PHI on sign-out (security rule 9).
        await wipe_local_data();
      },
    }),
    [loading, session, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): auth_state {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Default landing route per role (matches the steering route map). */
export function roleHome(role: user_role): string {
  switch (role) {
    case 'barangay_staff':
      return '/staff/masterlist';
    case 'physician':
      return '/doctor/scan';
    case 'citizen':
      return '/me';
    case 'admin':
      return '/admin/doctor-approvals';
  }
}
