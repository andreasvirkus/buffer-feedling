import { describe, expect, it } from 'vitest';
import { soundsAllowed } from './sound-gate';

describe('soundsAllowed', () => {
  it('allows sound by default', async () => expect(await soundsAllowed(async () => ({}))).toBe(true));
  it('allows it when explicitly on', async () => expect(await soundsAllowed(async () => ({ soundsEnabled: true }))).toBe(true));
  it('is silenced by the mute setting', async () => expect(await soundsAllowed(async () => ({ soundsEnabled: false }))).toBe(false));
  it('is silenced while napping', async () => expect(await soundsAllowed(async () => ({ napping: true }))).toBe(false));
  it('stays silent when storage cannot be read, as in an orphaned page', async () =>
    expect(
      await soundsAllowed(async () => {
        throw new Error('Extension context invalidated.');
      }),
    ).toBe(false));
});
