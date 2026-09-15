export const STORAGE_KEYS = [
  'chesstise-game-stats',
  'chesstise-motivation',
  'chesstise-profile',
  'chesstise-puzzle',
  'chesstise-auth',
] as const;

export type StorageKey = typeof STORAGE_KEYS[number];

export function buildExportBundle(): Record<string, unknown> {
  const bundle: Record<string, unknown> = {};
  for (const key of STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) bundle[key] = JSON.parse(raw);
  }
  return bundle;
}

export function applyImportBundle(bundle: Record<string, unknown>): void {
  for (const key of STORAGE_KEYS) {
    if (bundle[key] !== undefined) {
      localStorage.setItem(key, JSON.stringify(bundle[key]));
    }
  }
}

export function exportToFile(bundle: Record<string, unknown>): void {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chesstise-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
