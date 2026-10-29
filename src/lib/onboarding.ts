export interface Onboarding {
  done?: boolean;
  skippedBuffer?: boolean;
}

export type Step = 'welcome' | 'sites' | 'done';

/** First run: meet the pet, choose Buffer or not, choose sites. Anyone who was already using the
 *  extension before onboarding existed (no record, but state or sites) is treated as done. */
export function onboardingStep(o: Onboarding | undefined, ctx: { connected: boolean; hasUsed: boolean }): Step {
  if (o?.done) return 'done';
  if (!o && ctx.hasUsed) return 'done';
  if (ctx.connected || o?.skippedBuffer) return 'sites';
  return 'welcome';
}
