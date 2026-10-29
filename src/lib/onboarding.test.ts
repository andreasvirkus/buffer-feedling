import { describe, expect, it } from 'vitest';
import { onboardingStep } from './onboarding';

const fresh = { connected: false, hasUsed: false };

describe('onboardingStep', () => {
  it('welcomes a brand new user', () => expect(onboardingStep(undefined, fresh)).toBe('welcome'));
  it('keeps welcoming until they choose', () => expect(onboardingStep({}, fresh)).toBe('welcome'));
  it('moves on to sites once Buffer is connected', () => expect(onboardingStep({}, { ...fresh, connected: true })).toBe('sites'));
  it('moves on to sites when they skip Buffer', () => expect(onboardingStep({ skippedBuffer: true }, fresh)).toBe('sites'));
  it('stays on sites mid-onboarding even after the first poll produces state', () =>
    expect(onboardingStep({}, { connected: true, hasUsed: true })).toBe('sites'));
  it('is finished once done', () => {
    expect(onboardingStep({ done: true }, fresh)).toBe('done');
    expect(onboardingStep({ done: true, skippedBuffer: true }, fresh)).toBe('done');
  });
  it('does not make existing users start over', () => expect(onboardingStep(undefined, { connected: true, hasUsed: true })).toBe('done'));
  it('still welcomes someone who has used nothing', () => expect(onboardingStep(undefined, { connected: true, hasUsed: false })).toBe('sites'));
});
