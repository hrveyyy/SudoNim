import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DEFAULT_RISK_RULES, type risk_rules } from '@/lib/risk';

/**
 * Loads the active risk_rules row so the client risk preview uses the same
 * thresholds as the server. Falls back to DEFAULT_RISK_RULES (which mirrors
 * the seeded active row) if the fetch fails or returns nothing.
 */
export function useRiskRules(): risk_rules {
  const { data } = useQuery({
    queryKey: ['risk_rules', 'active'],
    queryFn: async (): Promise<risk_rules | null> => {
      const { data, error } = await supabase
        .from('risk_rules')
        .select(
          'bp_systolic_cutoff, bp_diastolic_cutoff, bp_monitor_systolic, bp_monitor_diastolic, fasting_glucose_cutoff, fasting_glucose_monitor, family_history_min_age',
        )
        .eq('is_active', true)
        .maybeSingle();
      if (error || !data) return null;
      return data as risk_rules;
    },
    staleTime: 5 * 60 * 1000,
  });

  return data ?? DEFAULT_RISK_RULES;
}
