import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { patients_row } from '@/types/rows';

/** The patient row linked to the signed-in citizen (user_id = auth.uid()). */
export function useMyPatient() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['my_patient', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async (): Promise<patients_row | null> => {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', session!.user.id)
        .maybeSingle();
      return data;
    },
  });
}
