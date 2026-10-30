#!/usr/bin/env node
// Cuts the raw voice takes in tools/sounds/raw into clean mp3 clips in src/lib/overlay/sounds.
// Adapted from the sound-buffet splitter: silencedetect finds the sounds, then each is faded,
// peak-normalised and written as a small mono mp3. Raw takes are not shipped (they stay out of public/).
//
//   node tools/sounds/cut.mjs            # cut everything
//   node tools/sounds/cut.mjs --dry-run  # only print what it would cut

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RAW_DIR = path.join(ROOT, 'tools/sounds/raw');
const OUT_DIR = path.join(ROOT, 'src/lib/overlay/sounds');

const NOISE_DB = -30; // below this counts as silence
const MIN_SILENCE = 0.05; // shortest gap that splits two sounds
const KEEP_WITHIN_DB = 14; // drop sounds quieter than the loudest one by more than this
const MIN_PEAK_DB = -16; // ...and anything this quiet in absolute terms (handling noise, room tone)
const LEAD_PAD = 0.04;
const TAIL_PAD = 0.08;
const PEAK_DB = -6; // every clip is normalised to this peak, leaving headroom for mp3 and mixing

// How each take is named and cut. `ticks` glues a short "tk" onto the louder step that follows it.
// `phrase` also writes one clip spanning all of the take's sounds, spaced as recorded.
const TAKES = [
  { match: /^chirp/, prefix: 'chirp' },
  { match: /^walking/, prefix: 'step', ticks: true, phrase: 'walk-phrase' },
];

const dryRun = process.argv.includes('--dry-run');
const run = (args) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { encoding: 'utf8' });

function sounds(input) {
  const { stderr } = run(['-i', input, '-af', `silencedetect=noise=${NOISE_DB}dB:d=${MIN_SILENCE}`, '-f', 'null', '-']);
  const dur = stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
  const duration = Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]);
  const silences = [];
  let start = null;
  for (const line of stderr.split('\n')) {
    const s = line.match(/silence_start: (-?\d+\.?\d*)/);
    const e = line.match(/silence_end: (-?\d+\.?\d*)/);
    if (s) start = Math.max(Number(s[1]), 0);
    if (e && start !== null) (silences.push({ start, end: Number(e[1]) }), (start = null));
  }
  if (start !== null) silences.push({ start, end: duration });

  const out = [];
  let cursor = 0;
  for (const sil of silences) {
    if (sil.start - cursor > 0.02) out.push({ start: cursor, end: sil.start });
    cursor = sil.end;
  }
  if (duration - cursor > 0.02) out.push({ start: cursor, end: duration });
  return { duration, segments: out };
}

function peakDb(input, { start, end }) {
  const { stderr } = run(['-ss', String(start), '-t', String(end - start), '-i', input, '-af', 'volumedetect', '-f', 'null', '-']);
  const m = stderr.match(/max_volume: (-?\d+\.?\d*) dB/);
  return m ? Number(m[1]) : -90;
}

function plan(input, take) {
  const { duration, segments } = sounds(input);
  let found = segments.map((s) => ({ ...s, peak: peakDb(input, s) }));

  if (take.ticks) {
    // A short tick right before a longer sound belongs to it. Do this before judging loudness,
    // since the tick alone is too quiet to survive the floor.
    const merged = [];
    for (let i = 0; i < found.length; i++) {
      const s = found[i];
      const next = found[i + 1];
      if (next && s.end - s.start < 0.12 && next.start - s.end <= 0.3 && next.end - next.start >= 0.15) {
        merged.push({ start: s.start, end: next.end, peak: Math.max(s.peak, next.peak) });
        i++;
      } else merged.push(s);
    }
    found = merged;
  }

  const loudest = Math.max(...found.map((s) => s.peak));
  const kept = found
    .filter((s) => s.peak >= loudest - KEEP_WITHIN_DB && s.peak >= MIN_PEAK_DB)
    .filter((s) => s.end - s.start >= 0.12);

  // Padding must not reach into the neighbouring sound
  return kept.map((s, i) => {
    const prev = kept[i - 1]?.end ?? 0;
    const next = kept[i + 1]?.start ?? duration;
    const cutStart = Math.max(s.start - LEAD_PAD, (prev + s.start) / 2, 0);
    const cutEnd = Math.min(s.end + TAIL_PAD, (next + s.end) / 2, duration);
    // Normalise on exactly what gets exported
    return { ...s, cutStart, cutEnd, peak: peakDb(input, { start: cutStart, end: cutEnd }) };
  });
}

// One clip spanning every repeat, as long as the repeats are spaced evenly
function loopOf(input, clips, duration) {
  const starts = clips.map((c) => c.start);
  const period = (starts.at(-1) - starts[0]) / (starts.length - 1);
  const cutStart = Math.max(starts[0] - LEAD_PAD, 0);
  const cutEnd = Math.min(cutStart + period * starts.length, duration);
  return { cutStart, cutEnd, period, peak: peakDb(input, { start: cutStart, end: cutEnd }), repeats: starts.length };
}

function exportClip(input, file, clip, { fade = 0.04, fadeIn = 0.005 } = {}) {
  const length = clip.cutEnd - clip.cutStart;
  const gain = PEAK_DB - clip.peak;
  const r = run([
    '-y', '-loglevel', 'error',
    '-ss', String(clip.cutStart), '-i', input, '-t', String(length),
    // -ss before -i resets timestamps, so the fade times below are relative to the clip
    '-af', `volume=${gain.toFixed(2)}dB,afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${Math.max(length - fade, 0)}:d=${fade}`,
    '-ac', '1', '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '96k',
    path.join(OUT_DIR, file),
  ]);
  if (r.status !== 0) {
    console.error(`ffmpeg failed on ${file}:\n${r.stderr}`);
    process.exit(1);
  }
}

if (!dryRun) {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const f of readdirSync(OUT_DIR)) if (/\.mp3$/.test(f)) rmSync(path.join(OUT_DIR, f)); // regenerated from the takes each run
}

const files = existsSync(RAW_DIR) ? readdirSync(RAW_DIR).filter((f) => /\.(m4a|wav|mp3|aac|caf)$/i.test(f)).sort() : [];
const counters = {};
for (const f of files) {
  const take = TAKES.find((t) => t.match.test(f));
  if (!take) {
    console.log(`skip ${f}: no rule for it in TAKES`);
    continue;
  }
  const input = path.join(RAW_DIR, f);
  const clips = plan(input, take);
  console.log(`${f}: ${clips.length} clip(s)`);
  for (const clip of clips) {
    counters[take.prefix] = (counters[take.prefix] ?? 0) + 1;
    const name = `${take.prefix}-${String(counters[take.prefix]).padStart(2, '0')}.mp3`;
    console.log(`  ${name.padEnd(14)} ${clip.cutStart.toFixed(2)}s to ${clip.cutEnd.toFixed(2)}s  (${(clip.cutEnd - clip.cutStart).toFixed(2)}s, peak ${clip.peak.toFixed(1)} dB -> ${PEAK_DB} dB)`);
    if (!dryRun) exportClip(input, name, clip);
  }
  if (take.phrase && clips.length > 1) {
    const { duration } = sounds(input);
    const phrase = loopOf(input, clips, duration);
    const name = `${take.phrase}.mp3`;
    console.log(`  ${name.padEnd(14)} ${phrase.cutStart.toFixed(2)}s to ${phrase.cutEnd.toFixed(2)}s  (${(phrase.cutEnd - phrase.cutStart).toFixed(2)}s, all ${phrase.repeats} together, ${(phrase.period * 1000).toFixed(0)} ms apart)`);
    if (!dryRun) exportClip(input, name, phrase);
  }
}
