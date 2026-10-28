import { SITES, grantedServices } from './sites';

const SCRIPT_ID = 'platform';
const SCRIPT_FILE = 'content-scripts/platform.js';

// Keeps the runtime content script matching exactly the sites the user has granted
export async function syncPlatformScripts() {
  const { origins = [] } = await browser.permissions.getAll();
  const matches = grantedServices(origins).flatMap((s) => SITES[s]!);
  const existing = await browser.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });

  const current = existing[0]?.matches ?? [];
  if (current.length === matches.length && current.every((m) => matches.includes(m))) return;

  if (existing.length) await browser.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  if (!matches.length) return;
  await browser.scripting.registerContentScripts([
    { id: SCRIPT_ID, js: [SCRIPT_FILE], matches, runAt: 'document_idle', persistAcrossSessions: true },
  ]);
}
