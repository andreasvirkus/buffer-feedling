// Bundled into the content script so pages never see extension URLs
import fullMeta from '../../public/sprites/sproutling-full.json';
import fullSheet from '../../public/sprites/sproutling-full-sheet.png?inline';
import eatingMeta from '../../public/sprites/sproutling-eating.json';
import eatingSheet from '../../public/sprites/sproutling-eating-sheet.png?inline';
import hungryMeta from '../../public/sprites/sproutling-hungry.json';
import hungrySheet from '../../public/sprites/sproutling-hungry-sheet.png?inline';
import idleMeta from '../../public/sprites/sproutling-idle.json';
import idleSheet from '../../public/sprites/sproutling-idle-sheet.png?inline';
import sleepyMeta from '../../public/sprites/sproutling-sleepy.json';
import sleepySheet from '../../public/sprites/sproutling-sleepy-sheet.png?inline';
import walkDownMeta from '../../public/sprites/sproutling-walk-down.json';
import walkDownSheet from '../../public/sprites/sproutling-walk-down-sheet.png?inline';
import walkUpMeta from '../../public/sprites/sproutling-walk-up.json';
import walkUpSheet from '../../public/sprites/sproutling-walk-up-sheet.png?inline';
import walkLeftMeta from '../../public/sprites/sproutling-walk-left.json';
import walkLeftSheet from '../../public/sprites/sproutling-walk-left-sheet.png?inline';
import walkRightMeta from '../../public/sprites/sproutling-walk-right.json';
import walkRightSheet from '../../public/sprites/sproutling-walk-right-sheet.png?inline';

export const SPRITES = {
  idle: { meta: idleMeta, sheet: idleSheet },
  hungry: { meta: hungryMeta, sheet: hungrySheet },
  sleepy: { meta: sleepyMeta, sheet: sleepySheet },
  full: { meta: fullMeta, sheet: fullSheet },
  eating: { meta: eatingMeta, sheet: eatingSheet },
  'walk-down': { meta: walkDownMeta, sheet: walkDownSheet },
  'walk-up': { meta: walkUpMeta, sheet: walkUpSheet },
  'walk-left': { meta: walkLeftMeta, sheet: walkLeftSheet },
  'walk-right': { meta: walkRightMeta, sheet: walkRightSheet },
};
