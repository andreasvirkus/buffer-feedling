export interface SoundSettings {
  soundsEnabled?: boolean;
  napping?: boolean;
}

/** Asked at the moment a sound would play, straight from storage, so a page whose change listener
 *  has gone deaf (say the extension was reloaded under it) can't keep chirping past a mute. Any
 *  failure to read counts as "no". */
export async function soundsAllowed(read: () => Promise<SoundSettings>): Promise<boolean> {
  try {
    const { soundsEnabled, napping } = await read();
    return soundsEnabled !== false && napping !== true;
  } catch {
    return false;
  }
}
