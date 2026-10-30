// Cut from the raw takes by tools/sounds/cut.mjs
import chirp01 from './sounds/chirp-01.mp3?inline';
import chirp02 from './sounds/chirp-02.mp3?inline';
import chirp03 from './sounds/chirp-03.mp3?inline';
import chirp04 from './sounds/chirp-04.mp3?inline';
import walkLoop from './sounds/walk-loop.mp3?inline';

// Bundled into the content script so pages never see extension URLs
export const CHIRPS = [chirp01, chirp02, chirp03, chirp04];
export const WALK_LOOP = walkLoop;
