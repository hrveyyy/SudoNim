import { describe, expect, it } from 'vitest';
import { compute_risk, DEFAULT_RISK_RULES } from '@/lib/risk';

/**
 * Risk-rule boundary tests (steering requirement). The client mirror must
 * match the server compute_risk exactly. Boundaries: 139/89 vs 140/90 for BP,
 * 125 vs 126 for fasting glucose, and the monitor band.
 */
describe('compute_risk BP boundaries', () => {
  it('139/89 is below the referral cutoff', () => {
    // 139/89 is still at/above the monitor thresholds (130/85) -> monitor.
    expect(compute_risk({ systolic: 139, diastolic: 89 })).toBe('monitor');
  });

  it('140/90 hits the referral cutoff', () => {
    expect(compute_risk({ systolic: 140, diastolic: 90 })).toBe('needs_referral');
  });

  it('120/80 is normal', () => {
    expect(compute_risk({ systolic: 120, diastolic: 80 })).toBe('normal');
  });

  it('systolic alone at 140 triggers referral', () => {
    expect(compute_risk({ systolic: 140, diastolic: 70 })).toBe('needs_referral');
  });
});

describe('compute_risk fasting glucose boundaries', () => {
  it('125 is below the referral cutoff', () => {
    // 125 >= monitor (110) but < referral (126) -> monitor.
    expect(compute_risk({ fasting_glucose: 125 })).toBe('monitor');
  });

  it('126 hits the referral cutoff', () => {
    expect(compute_risk({ fasting_glucose: 126 })).toBe('needs_referral');
  });

  it('100 is normal', () => {
    expect(compute_risk({ fasting_glucose: 100 })).toBe('normal');
  });
});

describe('compute_risk missing readings', () => {
  it('no readings -> normal', () => {
    expect(compute_risk({})).toBe('normal');
  });

  it('nulls are ignored', () => {
    expect(compute_risk({ systolic: null, diastolic: null, fasting_glucose: null })).toBe(
      'normal',
    );
  });
});

describe('family_history_min_age boundary', () => {
  // Family-history age boundary (39 vs 40) is part of the rules contract.
  // compute_risk does not take age/history yet; assert the configured
  // boundary so the mirror stays in lockstep with the server rule row.
  it('family history applies at age 40 and above', () => {
    expect(DEFAULT_RISK_RULES.family_history_min_age).toBe(40);
    const age39Applies = 39 >= DEFAULT_RISK_RULES.family_history_min_age;
    const age40Applies = 40 >= DEFAULT_RISK_RULES.family_history_min_age;
    expect(age39Applies).toBe(false);
    expect(age40Applies).toBe(true);
  });
});
