import { PROFILES_KEY, profileBodyKey } from '../profiles.js';
import { validateResumeData } from './resumeFiles.js';

export const RESCUE_KEY = 'resume-builder:restore-rescue';
const owns = (key) => key?.startsWith('resume-builder:') && key !== RESCUE_KEY;
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
export function createBackup(storage) {
  const entries = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (owns(key)) entries[key] = storage.getItem(key);
  }
  return { format: 'openresume-backup', version: 1, exportedAt: new Date().toISOString(), entries };
}

export function validateBackup(backup) {
  const fail = (message) => { throw new Error(`Cannot restore backup: ${message}`); };
  if (!object(backup) || backup.format !== 'openresume-backup' || backup.version !== 1 || !object(backup.entries)) fail('unsupported format or version.');
  const entries = backup.entries;
  let profiles = null;
  let snapshots = 0;
  for (const [key, value] of Object.entries(entries)) {
    if (!owns(key) || typeof value !== 'string') fail(`invalid storage entry ${key}.`);
    if (key === 'resume-builder:theme') {
      if (!['system', 'light', 'dark'].includes(value)) fail('invalid theme.');
      continue;
    }
    let parsed;
    try { parsed = JSON.parse(value); } catch { fail(`invalid JSON in ${key}.`); }
    if (key === PROFILES_KEY) {
      if (!object(parsed) || !Array.isArray(parsed.profiles) || !parsed.profiles.length) fail('invalid profiles index.');
      const ids = new Set();
      for (const p of parsed.profiles) {
        if (!object(p) || typeof p.id !== 'string' || !p.id || ids.has(p.id) || typeof p.name !== 'string') fail('invalid or duplicate profile.');
        ids.add(p.id);
      }
      if (!ids.has(parsed.activeProfileId)) fail('active profile is missing.');
      profiles = parsed.profiles;
    } else if (key.startsWith('resume-builder:profile:') || key === 'resume-builder:resume') {
      try { validateResumeData(parsed); } catch (error) { fail(`${key}: ${error.message}`); }
    } else if (key.startsWith('resume-builder:snapshots:') || key === 'resume-builder:snapshots') {
      if (!Array.isArray(parsed)) fail('invalid snapshots.');
      for (const snapshot of parsed) {
        if (!object(snapshot) || !['string', 'number'].includes(typeof snapshot.id) || !snapshot.id || typeof snapshot.name !== 'string' || typeof snapshot.label !== 'string') fail('invalid snapshot.');
        try { validateResumeData(snapshot.data); } catch (error) { fail(`snapshot: ${error.message}`); }
      }
      snapshots += parsed.length;
    } else fail(`unrecognized setting ${key}; use a compatible app version.`);
  }
  if (!profiles) fail('profiles index is missing.');
  for (const profile of profiles) if (!(profileBodyKey(profile.id) in entries)) fail(`body missing for ${profile.name}.`);
  return { profiles: profiles.length, snapshots };
}

function replaceEntries(storage, entries) {
  const keys = [];
  for (let i = 0; i < storage.length; i++) if (owns(storage.key(i))) keys.push(storage.key(i));
  for (const key of keys) storage.removeItem(key);
  for (const [key, value] of Object.entries(entries)) storage.setItem(key, value);
}

export function restoreBackup(storage, backup, exportRescue) {
  const summary = validateBackup(backup);
  const rescue = createBackup(storage);
  // A durable rescue is mandatory; a browser download alone is not confirmation.
  // Never touch current data if storage quota or the rescue export fails.
  exportRescue(rescue);
  storage.setItem(RESCUE_KEY, JSON.stringify(rescue));
  try { replaceEntries(storage, backup.entries); }
  catch (error) {
    try { replaceEntries(storage, rescue.entries); }
    catch { throw new Error(`Restore failed (${error.message}). Recover using the rescue backup download; the rescue copy is also in browser storage.`); }
    throw new Error(`Restore failed (${error.message}); previous data restored.`, { cause: error });
  }
  return summary;
}
