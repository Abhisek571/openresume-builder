import { describe, it, expect } from 'vitest';
import { createBackup, restoreBackup, validateBackup } from './backup.js';
import { PROFILES_KEY, profileBodyKey, profileSnapshotsKey } from '../profiles.js';
const body = { personal: { name: 'Test' }, sections: [] };
function store() {
  const data = new Map([
    [PROFILES_KEY, JSON.stringify({ profiles: [{ id: 'p1', name: 'Base', createdAt: 1, updatedAt: 1 }], activeProfileId: 'p1' })],
    [profileBodyKey('p1'), JSON.stringify(body)], [profileSnapshotsKey('p1'), '[]'],
    ['resume-builder:theme', 'dark'], ['unrelated', 'keep'],
  ]);
  return { get length() { return data.size; }, key: (n) => [...data.keys()][n], getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) };
}
describe('browser backup and restore', () => {
  it('round-trips owned storage only and captures a rescue copy before replacement', () => {
    const storage = store();
    const backup = createBackup(storage);
    expect(backup.entries.unrelated).toBeUndefined();
    storage.setItem(profileBodyKey('p1'), JSON.stringify({ ...body, personal: { name: 'New' } }));
    let rescue;
    restoreBackup(storage, backup, (copy) => { rescue = copy; });
    expect(JSON.parse(rescue.entries[profileBodyKey('p1')]).personal.name).toBe('New');
    expect(JSON.parse(storage.getItem(profileBodyKey('p1')))).toEqual(body);
    expect(storage.getItem('unrelated')).toBe('keep');
  });
  it('rejects malformed or foreign keys, missing bodies and unsafe snapshots without writes', () => {
    const storage = store();
    const backup = createBackup(storage);
    expect(() => validateBackup({ ...backup, version: 9 })).toThrow();
    expect(() => validateBackup({ ...backup, entries: { ...backup.entries, unrelated: 'x' } })).toThrow();
    delete backup.entries[profileBodyKey('p1')];
    expect(() => restoreBackup(storage, backup, () => {})).toThrow();
    const bad = createBackup(storage);
    bad.entries[profileSnapshotsKey('p1')] = JSON.stringify([{ id: 1, data: { personal: 'bad' } }]);
    expect(() => validateBackup(bad)).toThrow();
    bad.entries[profileSnapshotsKey('p1')] = JSON.stringify([{ id: 1, name: '', label: {}, data: body }]);
    expect(() => validateBackup(bad)).toThrow();
    expect(storage.getItem('unrelated')).toBe('keep');
  });
  it('does not modify storage when rescue export fails', () => {
    const storage = store();
    const backup = createBackup(storage);
    const before = createBackup(storage).entries;
    expect(() => restoreBackup(storage, backup, () => { throw Error('Download unavailable'); })).toThrow();
    expect(createBackup(storage).entries).toEqual(before);
  });
  it('rolls back all owned keys after a write failure', () => {
    const storage = store();
    const backup = createBackup(storage);
    const before = { ...backup.entries };
    const original = storage.setItem;
    let failed = false;
    storage.setItem = (key, value) => {
      if (!failed && key === PROFILES_KEY) { failed = true; throw Error('Quota exceeded'); }
      return original(key, value);
    };
    expect(() => restoreBackup(storage, backup, () => {})).toThrow(/restored/);
    expect(createBackup(storage).entries).toEqual(before);
  });
});
