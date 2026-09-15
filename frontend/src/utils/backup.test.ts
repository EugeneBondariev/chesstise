import { describe, it, expect, beforeEach } from 'vitest';
import { STORAGE_KEYS, buildExportBundle, applyImportBundle } from './backup';

// Zustand persist wraps state as { state: {...}, version: N }
function wrap(state: unknown, version = 0) {
  return { state, version };
}

function getState(key: string) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw).state ?? JSON.parse(raw);
}

beforeEach(() => localStorage.clear());

// ── Key coverage ─────────────────────────────────────────────────────────────

describe('STORAGE_KEYS', () => {
  it('covers all 5 stores', () => {
    expect(STORAGE_KEYS).toContain('chesstise-game-stats');
    expect(STORAGE_KEYS).toContain('chesstise-motivation');
    expect(STORAGE_KEYS).toContain('chesstise-profile');
    expect(STORAGE_KEYS).toContain('chesstise-puzzle');
    expect(STORAGE_KEYS).toContain('chesstise-auth');
    expect(STORAGE_KEYS).toHaveLength(5);
  });
});

// ── buildExportBundle ────────────────────────────────────────────────────────

describe('buildExportBundle', () => {
  it('returns empty bundle when storage is empty', () => {
    expect(Object.keys(buildExportBundle())).toHaveLength(0);
  });

  it('captures a single populated key', () => {
    localStorage.setItem('chesstise-profile', JSON.stringify(wrap({ speechRate: 2 })));
    const bundle = buildExportBundle();
    expect(bundle['chesstise-profile']).toBeDefined();
  });

  it('omits keys that are not present in localStorage', () => {
    localStorage.setItem('chesstise-profile', JSON.stringify(wrap({ speechRate: 2 })));
    const bundle = buildExportBundle();
    expect(bundle['chesstise-game-stats']).toBeUndefined();
    expect(bundle['chesstise-motivation']).toBeUndefined();
  });

  it('captures all 5 keys when all are present', () => {
    for (const key of STORAGE_KEYS) {
      localStorage.setItem(key, JSON.stringify(wrap({ dummy: key })));
    }
    const bundle = buildExportBundle();
    expect(Object.keys(bundle)).toHaveLength(5);
  });
});

// ── applyImportBundle ────────────────────────────────────────────────────────

describe('applyImportBundle', () => {
  it('writes each key back to localStorage', () => {
    applyImportBundle({ 'chesstise-profile': wrap({ speechRate: 3 }) });
    expect(localStorage.getItem('chesstise-profile')).not.toBeNull();
  });

  it('ignores keys not in STORAGE_KEYS', () => {
    applyImportBundle({ 'unknown-key': { data: 'x' } });
    expect(localStorage.getItem('unknown-key')).toBeNull();
  });

  it('skips keys that are missing from the bundle', () => {
    localStorage.setItem('chesstise-profile', JSON.stringify(wrap({ speechRate: 2 })));
    applyImportBundle({});  // empty bundle — should leave existing data intact
    // existing key untouched (we only skip writing, not clear)
    expect(localStorage.getItem('chesstise-profile')).not.toBeNull();
  });
});

// ── Round-trip ───────────────────────────────────────────────────────────────

describe('round-trip integrity', () => {
  it('restores identical JSON after export → clear → import', () => {
    const original = wrap({ speechRate: 2.5, markedGames: ['morphy-124'] });
    localStorage.setItem('chesstise-profile', JSON.stringify(original));

    const bundle = buildExportBundle();
    localStorage.clear();
    applyImportBundle(bundle);

    const restored = JSON.parse(localStorage.getItem('chesstise-profile')!);
    expect(restored).toEqual(original);
  });

  it('round-trips all 5 stores simultaneously', () => {
    for (const key of STORAGE_KEYS) {
      localStorage.setItem(key, JSON.stringify(wrap({ key })));
    }
    const bundle = buildExportBundle();
    localStorage.clear();
    applyImportBundle(bundle);

    for (const key of STORAGE_KEYS) {
      expect(JSON.parse(localStorage.getItem(key)!)).toEqual(wrap({ key }));
    }
  });
});

// ── chesstise-profile: drill runs + read tracking + favorites ────────────────

describe('chesstise-profile fields', () => {
  const profileState = {
    cellGuesserRuns:   [{ timeMs: 4200, date: '2024-01-01T00:00:00.000Z' }],
    squareColorRuns:   [{ timeMs: 2100, date: '2024-01-02T00:00:00.000Z' }],
    blindPathingRuns:  [{ timeMs: 9800, date: '2024-01-03T00:00:00.000Z' }],
    calculationRuns:   [{ timeMs: 15000, correct: 18, total: 20, date: '2024-01-04T00:00:00.000Z' }],
    readCounts:        { 'morphy-124': 5, 'kasparov-373': 2 },
    readsByDate:       { '2024-01-01': 3, '2024-01-02': 4 },
    markedGames:       ['morphy-124', 'kasparov-373'],
    speechRate:        2,
    autoAdvanceMs:     4000,
    noveltyMultiplier: 1.5,
    dailyTarget:       5,
  };

  function roundTrip() {
    localStorage.setItem('chesstise-profile', JSON.stringify(wrap(profileState)));
    const bundle = buildExportBundle();
    localStorage.clear();
    applyImportBundle(bundle);
    return getState('chesstise-profile');
  }

  it('preserves cell guesser drill runs', () => {
    expect(roundTrip().cellGuesserRuns).toHaveLength(1);
    expect(roundTrip().cellGuesserRuns[0].timeMs).toBe(4200);
  });

  it('preserves square color drill runs', () => {
    expect(roundTrip().squareColorRuns[0].timeMs).toBe(2100);
  });

  it('preserves blind pathing drill runs', () => {
    expect(roundTrip().blindPathingRuns[0].timeMs).toBe(9800);
  });

  it('preserves calculation drill runs with accuracy', () => {
    const run = roundTrip().calculationRuns[0];
    expect(run.correct).toBe(18);
    expect(run.total).toBe(20);
  });

  it('preserves per-game read counts (B1/B2/C1 progress)', () => {
    const rc = roundTrip().readCounts;
    expect(rc['morphy-124']).toBe(5);
    expect(rc['kasparov-373']).toBe(2);
  });

  it('preserves daily read totals (top bar)', () => {
    const rd = roundTrip().readsByDate;
    expect(rd['2024-01-01']).toBe(3);
    expect(rd['2024-01-02']).toBe(4);
  });

  it('preserves favorited game IDs', () => {
    expect(roundTrip().markedGames).toContain('morphy-124');
    expect(roundTrip().markedGames).toHaveLength(2);
  });

  it('preserves training settings', () => {
    const s = roundTrip();
    expect(s.speechRate).toBe(2);
    expect(s.autoAdvanceMs).toBe(4000);
    expect(s.noveltyMultiplier).toBe(1.5);
    expect(s.dailyTarget).toBe(5);
  });
});

// ── chesstise-game-stats: replays + flagged moves (B1/B2/C1 session data) ───

describe('chesstise-game-stats fields', () => {
  const statsState = {
    replays: [
      {
        id: 'replay-1',
        gameId: 'morphy-124',
        startedAt: '2024-01-01T10:00:00.000Z',
        finishedAt: '2024-01-01T10:12:00.000Z',
        totalTimeMs: 720000,
        moves: [
          { san: 'e4', attempts: 1, timeMs: 2100 },
          { san: 'e5', attempts: 2, timeMs: 3400 },
          null,
        ],
      },
    ],
    flaggedMoves: [
      { id: 'flag-1', gameId: 'morphy-124', plyIdx: 3, san: 'Bc4', date: '2024-01-01' },
    ],
  };

  function roundTrip() {
    localStorage.setItem('chesstise-game-stats', JSON.stringify(wrap(statsState)));
    const bundle = buildExportBundle();
    localStorage.clear();
    applyImportBundle(bundle);
    return getState('chesstise-game-stats');
  }

  it('preserves replay records', () => {
    expect(roundTrip().replays).toHaveLength(1);
    expect(roundTrip().replays[0].gameId).toBe('morphy-124');
  });

  it('preserves replay move details', () => {
    const moves = roundTrip().replays[0].moves;
    expect(moves[0].attempts).toBe(1);
    expect(moves[1].attempts).toBe(2);
    expect(moves[2]).toBeNull();
  });

  it('preserves totalTimeMs for sec/move calculation', () => {
    expect(roundTrip().replays[0].totalTimeMs).toBe(720000);
  });

  it('preserves flagged moves', () => {
    const flags = roundTrip().flaggedMoves;
    expect(flags).toHaveLength(1);
    expect(flags[0].san).toBe('Bc4');
  });
});

// ── chesstise-motivation: top bar session time ────────────────────────────────

describe('chesstise-motivation fields', () => {
  const motivState = {
    sessions: [
      { date: '2024-01-01', startMs: 1704067200000, endMs: 1704070800000 },
    ],
    goalHoursByDate: { '2024-01-01': 1.5 },
    manualMsByDate:  { '2024-01-01': 1800000 },
    running: null,
  };

  function roundTrip() {
    localStorage.setItem('chesstise-motivation', JSON.stringify(wrap(motivState, 3)));
    const bundle = buildExportBundle();
    localStorage.clear();
    applyImportBundle(bundle);
    return getState('chesstise-motivation');
  }

  it('preserves work sessions', () => {
    expect(roundTrip().sessions).toHaveLength(1);
    expect(roundTrip().sessions[0].date).toBe('2024-01-01');
  });

  it('preserves goal hours by date', () => {
    expect(roundTrip().goalHoursByDate['2024-01-01']).toBe(1.5);
  });

  it('preserves manual time entries', () => {
    expect(roundTrip().manualMsByDate['2024-01-01']).toBe(1800000);
  });
});

// ── chesstise-puzzle: failed puzzles ─────────────────────────────────────────

describe('chesstise-puzzle fields', () => {
  const puzzleState = {
    token: null,
    username: null,
    rating: null,
    failed: [
      { id: 'abc123', rating: 1500, themes: ['fork', 'middlegame'], failedAt: '2024-01-01T00:00:00.000Z' },
    ],
  };

  it('preserves failed puzzles', () => {
    localStorage.setItem('chesstise-puzzle', JSON.stringify(wrap(puzzleState)));
    const bundle = buildExportBundle();
    localStorage.clear();
    applyImportBundle(bundle);
    const state = getState('chesstise-puzzle');
    expect(state.failed).toHaveLength(1);
    expect(state.failed[0].id).toBe('abc123');
    expect(state.failed[0].themes).toContain('fork');
  });
});
