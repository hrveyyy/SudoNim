import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
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
  ) => Promise<{ error: string | null; wrongPortal: boolean; notice: login_notice }>;
  signUpCitizen: (args: citizen_signup) => Promise<{ error: string | null }>;
  /**
   * Doctor application: creates the account, submits the application through
   * the doctor-apply Edge Function, then signs out. `applicationSubmitted` is
   * false if the account was created but the application call failed; signing
   * in on the doctor portal retries it.
   */
  signUpDoctor: (
    args: doctor_signup,
  ) => Promise<{ error: string | null; applicationSubmitted: boolean }>;
  signOut: () => Promise<void>;
}

/** Shown on the doctor login when there is no physician profile yet. */
export type login_notice = 'doctor_pending' | 'doctor_rejected' | null;

/** Fields collected at citizen self-registration. */
export interface citizen_signup {
  email: string;
  password: string;
  surname: string;
  first_name: string;
  sex: 'male' | 'female';
  /** yyyy-MM-dd. */
  birthdate: string;
  /** The barangay the citizen lives in (puts them in that BHW masterlist). */
  barangay_id: string;
}

/** Fields collected at doctor registration. */
export interface doctor_signup {
  email: string;
  password: string;
  prc_id: string;
  full_name: string;
  /** The hospital the doctor works at (their referral inbox). */
  facility_id: string;
}

const AuthContext = createContext<auth_state | null>(null);

async function loadProfile(userId: string): Promise<auth_profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, barangay_id, facility_id')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  // The generated type has role as the user_role enum string; same shape.
  return data as unknown as auth_profile;
}

/** Submits (or resubmits) a doctor application from the sign-up details. */
async function submitDoctorApplication(meta: {
  prc_id: string;
  full_name: string | null;
  facility_id: string | null;
}): Promise<boolean> {
  const { error } = await supabase.functions.invoke('doctor-apply', { body: meta });
  return !error;
}

/**
 * For a signed-in doctor with no physician profile yet: where does their
 * application stand? If none is on file (the call failed at sign-up), submit
 * it now from the details saved at sign-up.
 */
async function doctorApplicationNotice(user: User): Promise<login_notice> {
  const { data } = await supabase
    .from('doctor_applications')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (data?.status === 'rejected') return 'doctor_rejected';
  if (data) return 'doctor_pending';

  const meta = user.user_metadata ?? {};
  if (meta.intended_role !== 'physician' || typeof meta.prc_id !== 'string') return null;
  const submitted = await submitDoctorApplication({
    prc_id: meta.prc_id,
    full_name: typeof meta.full_name === 'string' ? meta.full_name : null,
    facility_id: typeof meta.facility_id === 'string' ? meta.facility_id : null,
  });
  return submitted ? 'doctor_pending' : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
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
        // Drop cached query results so the next user on a shared device never
        // sees the previous user's data.
        queryClient.clear();
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

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
        if (error) return { error: error.message, wrongPortal: false, notice: null };
        const user = data.user;
        const prof = user ? await loadProfile(user.id) : null;
        if (prof && prof.role === expectedRole) {
          return { error: null, wrongPortal: false, notice: null };
        }
        // A doctor without a physician profile is waiting on (or was refused)
        // admin approval; say so instead of "wrong portal".
        const notice =
          !prof && expectedRole === 'physician' && user
            ? await doctorApplicationNotice(user)
            : null;
        // Either way, sign back out so no session lingers.
        await supabase.auth.signOut();
        await wipe_local_data();
        return { error: null, wrongPortal: notice === null, notice };
      },
      async signUpCitizen(args) {
        // Self-registration collects name/sex/birthdate — the pairing-key basis
        // is surname + birthdate. We stash these in user metadata; the server
        // trigger handle_new_citizen (migration 0007) auto-creates the citizen
        // profile + a `verified` patient row from this metadata on signup, so
        // the account is usable immediately (no in-person BHW verification).
        // Birthdate in metadata is not a public-facing field.
        const { data, error } = await supabase.auth.signUp({
          email: args.email,
          password: args.password,
          options: {
            data: {
              intended_role: 'citizen',
              surname: args.surname,
              first_name: args.first_name,
              sex: args.sex,
              birthdate: args.birthdate,
              barangay_id: args.barangay_id,
            },
          },
        });
        if (error) return { error: error.message };
        // With email confirmation off, Supabase signs the new user in right
        // away. Sign them back out so the redirect lands on the sign-in page
        // and they log in themselves.
        if (data.session) {
          await supabase.auth.signOut();
          await wipe_local_data();
        }
        return { error: null };
      },
      async signUpDoctor(args) {
        // The details are also saved in user metadata so the application can
        // be resubmitted on login if the doctor-apply call below fails.
        const { data, error } = await supabase.auth.signUp({
          email: args.email,
          password: args.password,
          options: {
            data: {
              intended_role: 'physician',
              prc_id: args.prc_id,
              full_name: args.full_name,
              facility_id: args.facility_id,
            },
          },
        });
        if (error) return { error: error.message, applicationSubmitted: false };

        // With email confirmation off, sign-up returns a session, which the
        // doctor-apply function needs. Without one, login submits it later.
        let applicationSubmitted = false;
        if (data.session) {
          applicationSubmitted = await submitDoctorApplication({
            prc_id: args.prc_id,
            full_name: args.full_name || null,
            facility_id: args.facility_id || null,
          });
          // The doctor can't use the app until approved; don't leave a session.
          await supabase.auth.signOut();
          await wipe_local_data();
        }
        return { error: null, applicationSubmitted };
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
