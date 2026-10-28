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

export const SPRITES = {
  idle: { meta: idleMeta, sheet: idleSheet },
  hungry: { meta: hungryMeta, sheet: hungrySheet },
  sleepy: { meta: sleepyMeta, sheet: sleepySheet },
  full: { meta: fullMeta, sheet: fullSheet },
  eating: { meta: eatingMeta, sheet: eatingSheet },
};
