// Guards the promises the privacy policy makes about permissions. Run against the built manifest.
import { readFileSync } from 'node:fs';

const m = JSON.parse(readFileSync('.output/chrome-mv3/manifest.json', 'utf8'));
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const problems = [];

if (!same(m.host_permissions ?? [], ['https://auth.buffer.com/*', 'https://api.buffer.com/*'])) {
  problems.push(`host_permissions must be Buffer's two endpoints only, got: ${JSON.stringify(m.host_permissions)}`);
}
if (!same(m.permissions ?? [], ['storage', 'alarms', 'scripting', 'offscreen'])) {
  problems.push(`unexpected permissions: ${JSON.stringify(m.permissions)}`);
}
const scripts = (m.content_scripts ?? []).flatMap((c) => c.matches);
if (!same(scripts, ['*://publish.buffer.com/*', '*://sproutling.pet/*'])) problems.push(`unexpected content script matches: ${JSON.stringify(scripts)}`);
if (!(m.optional_host_permissions ?? []).length) problems.push('optional_host_permissions is empty');
if (process.env.STORE_BUILD && m.key) problems.push('the store build must not carry the pinned key');

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join('\n'));
  process.exit(1);
}
console.log('✓ manifest permissions as promised');
