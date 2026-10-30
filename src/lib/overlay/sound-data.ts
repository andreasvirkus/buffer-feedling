// Cut from the raw takes by tools/sounds/cut.mjs
import chirp01 from './sounds/chirp-01.mp3?inline';
import chirp02 from './sounds/chirp-02.mp3?inline';
import chirp03 from './sounds/chirp-03.mp3?inline';
import chirp04 from './sounds/chirp-04.mp3?inline';
import step01 from './sounds/step-01.mp3?inline';
import step02 from './sounds/step-02.mp3?inline';
import step03 from './sounds/step-03.mp3?inline';
import walkPhrase from './sounds/walk-phrase.mp3?inline';

// Bundled into the content script so pages never see extension URLs
export const CHIRPS = [chirp01, chirp02, chirp03, chirp04];
export const STEPS = [step01, step02, step03];
export const WALK_PHRASE = walkPhrase;
