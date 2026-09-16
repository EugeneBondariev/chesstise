import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { findPlayerEntry, TOTAL_GAME_COUNT } from '../../data/playerRegistry';
import type { ClassicalGame } from '../../data/classicalGames';
import { useProfileStore } from '../../store/profileStore';

type SortKey = 'year' | 'white' | 'black' | 'result' | 'event' | 'moves' | 'eco' | 'eloGap';
type SortDir = 'asc' | 'desc';
type ResultFilter = 'all' | 'win' | 'draw' | 'loss';
type PatternFilter = '' | 'bishop_replaces_rook' | 'pawn_before_knight' | 'bxf3_qxf3' | 'opposite_castling';

function detectPattern(moves: string[], pattern: PatternFilter): boolean {
  if (!pattern) return true;
  const clean = (m: string) => m.replace(/[+#]$/, '');

  if (pattern === 'bishop_replaces_rook') {
    let wCastled = false, bCastled = false;
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i], isW = i % 2 === 0;
      if (m === 'O-O') { if (isW) wCastled = true; else bCastled = true; }
      if (isW && wCastled && clean(m) === 'Bf1') return true;
      if (!isW && bCastled && clean(m) === 'Bf8') return true;
    }
    return false;
  }

  if (pattern === 'pawn_before_knight') {
    let c4 = false, f4 = false;
    for (let i = 0; i < moves.length; i += 2) {
      const m = clean(moves[i]);
      if (m === 'c4') c4 = true;
      if (m === 'f4') f4 = true;
      if (m === 'Nc3' && c4) return true;
      if (m === 'Nf3' && f4) return true;
    }
    return false;
  }

  if (pattern === 'bxf3_qxf3') {
    for (let i = 0; i < moves.length - 1; i++) {
      if (clean(moves[i]) === 'Bxf3' && clean(moves[i + 1]) === 'Qxf3') return true;
    }
    return false;
  }

  if (pattern === 'opposite_castling') {
    let wOO = false, wOOO = false, bOO = false, bOOO = false;
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i], isW = i % 2 === 0;
      if (m === 'O-O')   { if (isW) wOO  = true; else bOO  = true; }
      if (m === 'O-O-O') { if (isW) wOOO = true; else bOOO = true; }
    }
    return (wOO && bOOO) || (wOOO && bOO);
  }

  return true;
}

function ecoToOpening(eco: string): string {
  const n = parseInt(eco.slice(1), 10);
  switch (eco[0]) {
    case 'A':
      if (n <= 9)  return 'Irregular / Nimzo-Larsen';
      if (n <= 39) return 'English Opening';
      if (n <= 44) return 'Trompowsky / Torre';
      if (n <= 79) return 'Benoni Defense';
      return 'Dutch Defense';
    case 'B':
      if (n <= 9)  return 'Pirc / Modern';
      if (n <= 19) return 'Caro-Kann Defense';
      if (n <= 99) return 'Sicilian Defense';
      break;
    case 'C':
      if (n <= 19) return 'French Defense';
      if (n <= 39) return "King's Gambit / Center Game";
      if (n <= 49) return 'Four Knights / Scotch';
      if (n <= 59) return 'Italian / Two Knights';
      return 'Ruy Lopez';
    case 'D':
      if (n <= 9)  return "Queen's Pawn Game";
      if (n <= 19) return 'Slav Defense';
      if (n <= 29) return 'Semi-Slav Defense';
      if (n <= 69) return "Queen's Gambit";
      return 'Grünfeld Defense';
    case 'E':
      if (n <= 9)  return 'Catalan Opening';
      if (n <= 19) return "Queen's Indian Defense";
      if (n <= 59) return 'Nimzo-Indian Defense';
      if (n <= 79) return "King's Indian Defense";
      return 'King\'s Indian / Benoni';
  }
  return eco;
}

function eloGapForPlayer(game: ClassicalGame, mainPlayer: string): number | null {
  if (!game.whiteElo || !game.blackElo) return null;
  const asWhite = game.white.toLowerCase().includes(mainPlayer);
  return asWhite ? game.whiteElo - game.blackElo : game.blackElo - game.whiteElo;
}

function resultForPlayer(game: ClassicalGame, mainPlayer: string): 'W' | 'D' | 'L' {
  const isPlayer = (name: string) => name.toLowerCase().includes(mainPlayer);
  const asWhite = isPlayer(game.white);
  if (game.result === '1/2-1/2') return 'D';
  if ((game.result === '1-0' && asWhite) || (game.result === '0-1' && !asWhite)) return 'W';
  return 'L';
}

export default function PlayerPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();

  const player = playerId ? findPlayerEntry(playerId) : undefined;

  const readCounts = useProfileStore(s => s.readCounts);
  const moveTags   = useProfileStore(s => s.moveTags);

  const [games,          setGames]          = useState<ClassicalGame[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [resultFilter,   setResultFilter]   = useState<ResultFilter>('all');
  const [openingFilter,  setOpeningFilter]  = useState('');
  const [studiedFilter,  setStudiedFilter]  = useState<'all' | 'unstudied' | 'studied'>('all');
  const [patternFilter,  setPatternFilter]  = useState<PatternFilter>('');
  const [tagFilter,      setTagFilter]      = useState('');
  const [sortKey,        setSortKey]        = useState<SortKey>('year');
  const [sortDir,        setSortDir]        = useState<SortDir>('desc');

  useEffect(() => {
    setGames([]);
    setLoading(true);
    if (!player) { setLoading(false); return; }
    let cancelled = false;
    player.getGames().then(gs => {
      if (!cancelled) { setGames(gs); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [player]);

  const openingOptions = useMemo(() => {
    const names = new Set<string>();
    for (const g of games) {
      if (g.eco) names.add(ecoToOpening(g.eco));
    }
    return [...names].sort();
  }, [games]);

  const tagsByGame = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const [key, tag] of Object.entries(moveTags)) {
      const colon = key.lastIndexOf(':');
      if (colon === -1) continue;
      const gameId = key.slice(0, colon);
      (map[gameId] ??= []).push(tag);
    }
    return map;
  }, [moveTags]);

  const uniqueTags = useMemo(() => {
    const seen = new Set<string>();
    for (const g of games) {
      for (const t of tagsByGame[g.id] ?? []) seen.add(t);
    }
    return [...seen].sort();
  }, [games, tagsByGame]);

  const filtered = useMemo(() => {
    if (!player) return [];
    let rows = games;

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(g =>
        g.white.toLowerCase().includes(q) ||
        g.black.toLowerCase().includes(q) ||
        (g.event ?? '').toLowerCase().includes(q) ||
        (g.eco ?? '').toLowerCase().includes(q)
      );
    }

    if (resultFilter !== 'all') {
      const target = resultFilter === 'win' ? 'W' : resultFilter === 'draw' ? 'D' : 'L';
      rows = rows.filter(g => resultForPlayer(g, player.mainPlayer) === target);
    }

    if (openingFilter) {
      rows = rows.filter(g => g.eco && ecoToOpening(g.eco) === openingFilter);
    }

    if (studiedFilter === 'studied')   rows = rows.filter(g =>  (readCounts[g.id] ?? 0) > 0);
    if (studiedFilter === 'unstudied') rows = rows.filter(g => !(readCounts[g.id] ?? 0));
    if (patternFilter) rows = rows.filter(g => detectPattern(g.moves, patternFilter));
    if (tagFilter) rows = rows.filter(g => (tagsByGame[g.id] ?? []).includes(tagFilter));

    rows = [...rows].sort((a, b) => {
      let va: string | number, vb: string | number;
      switch (sortKey) {
        case 'year':   va = a.year ?? 0;                           vb = b.year ?? 0; break;
        case 'white':  va = a.white.toLowerCase();                 vb = b.white.toLowerCase(); break;
        case 'black':  va = a.black.toLowerCase();                 vb = b.black.toLowerCase(); break;
        case 'result': va = resultForPlayer(a, player.mainPlayer); vb = resultForPlayer(b, player.mainPlayer); break;
        case 'event':  va = (a.event ?? '').toLowerCase();         vb = (b.event ?? '').toLowerCase(); break;
        case 'moves':  va = a.moves.length;                        vb = b.moves.length; break;
        case 'eco':    va = (a.eco ?? '').toLowerCase();           vb = (b.eco ?? '').toLowerCase(); break;
        case 'eloGap': va = eloGapForPlayer(a, player.mainPlayer) ?? -9999; vb = eloGapForPlayer(b, player.mainPlayer) ?? -9999; break;
        default:       return 0;
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [games, search, resultFilter, openingFilter, studiedFilter, patternFilter, tagFilter, tagsByGame, readCounts, sortKey, sortDir, player]);

  if (!player) {
    return (
      <div className="exercise-page">
        <p style={{ padding: '2rem' }}>Player not found.</p>
      </div>
    );
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'year' ? 'desc' : 'asc'); }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return <span aria-hidden="true">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>;
  }

  return (
    <div className="exercise-page player-page">
      <button
        className="cg-back-btn"
        onClick={() => navigate('/masters')}
        aria-label="Back to players list"
      >
        ← Masters
      </button>
      <h1 className="exercise-title">{player.name}</h1>

      {!loading && (() => {
        const playerStudied = games.filter(g => (readCounts[g.id] ?? 0) > 0).length;
        const playerTotal   = games.length;
        const playerPct     = playerTotal ? Math.round((playerStudied / playerTotal) * 100) : 0;
        const allStudied    = Object.values(readCounts).filter(n => n > 0).length;
        const allPct        = TOTAL_GAME_COUNT ? Math.round((allStudied / TOTAL_GAME_COUNT) * 100) : 0;
        return (
          <div className="player-stats" aria-label="Study progress">
            <span className="player-stat">
              <strong>{player.name.split(' ').pop()}:</strong> {playerStudied} / {playerTotal} ({playerPct}%)
            </span>
            <span className="player-stat-sep">·</span>
            <span className="player-stat">
              <strong>All GMs:</strong> {allStudied} / {TOTAL_GAME_COUNT} ({allPct}%)
            </span>
          </div>
        );
      })()}

      {loading ? (
        <p className="player-loading">Loading games…</p>
      ) : (
        <>
          <div className="player-controls">
            <input
              className="player-search"
              type="search"
              placeholder="Search opponent / event / ECO…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search games"
            />

            <select
              className="perspective-select"
              value={openingFilter}
              onChange={e => setOpeningFilter(e.target.value)}
              aria-label="Filter by opening"
            >
              <option value="">All openings</option>
              {openingOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <div className="player-result-filters" role="group" aria-label="Filter by result">
              {(['all', 'win', 'draw', 'loss'] as ResultFilter[]).map(f => (
                <button
                  key={f}
                  className={`result-filter-btn${resultFilter === f ? ' active' : ''} rf-${f}`}
                  onClick={() => setResultFilter(f)}
                >
                  {f === 'all' ? 'All' : f === 'win' ? 'Win' : f === 'draw' ? 'Draw' : 'Loss'}
                </button>
              ))}
            </div>

            <select
              className="perspective-select"
              value={patternFilter}
              onChange={e => setPatternFilter(e.target.value as PatternFilter)}
              aria-label="Filter by pattern"
            >
              <option value="">All patterns</option>
              <option value="bishop_replaces_rook">Bishop replaces rook (Bf1/Bf8 after O-O)</option>
              <option value="pawn_before_knight">Pawn before knight (c4→Nc3 or f4→Nf3)</option>
              <option value="bxf3_qxf3">Bxf3 → Qxf3 (removes knight defender)</option>
              <option value="opposite_castling">Opposite-side castling</option>
            </select>

            <div className="player-result-filters" role="group" aria-label="Filter by study status">
              {(['all', 'unstudied', 'studied'] as const).map(f => (
                <button
                  key={f}
                  className={`result-filter-btn${studiedFilter === f ? ' active' : ''}`}
                  onClick={() => setStudiedFilter(f)}
                >
                  {f === 'all' ? 'All' : f === 'unstudied' ? 'Not studied' : 'Studied'}
                </button>
              ))}
            </div>

            {uniqueTags.length > 0 && (
              <select
                className="perspective-select"
                value={tagFilter}
                onChange={e => setTagFilter(e.target.value)}
                aria-label="Filter by decisive moment tag"
              >
                <option value="">All tags</option>
                {uniqueTags.map(t => (
                  <option key={t} value={t}>◈ {t}</option>
                ))}
              </select>
            )}

            <span className="player-count">{filtered.length} game{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="player-table-wrap">
            <table className="player-table">
              <thead>
                <tr>
                  <th style={{ width: '2rem' }} aria-label="Studied"></th>
                  <th onClick={() => toggleSort('year')} style={{ cursor: 'pointer' }}>
                    Year{sortIndicator('year')}
                  </th>
                  <th onClick={() => toggleSort('white')} style={{ cursor: 'pointer' }}>
                    White{sortIndicator('white')}
                  </th>
                  <th onClick={() => toggleSort('black')} style={{ cursor: 'pointer' }}>
                    Black{sortIndicator('black')}
                  </th>
                  <th onClick={() => toggleSort('result')} style={{ cursor: 'pointer' }}>
                    Result{sortIndicator('result')}
                  </th>
                  <th onClick={() => toggleSort('eco')} style={{ cursor: 'pointer' }}>
                    Opening{sortIndicator('eco')}
                  </th>
                  <th onClick={() => toggleSort('event')} style={{ cursor: 'pointer' }}>
                    Event{sortIndicator('event')}
                  </th>
                  <th onClick={() => toggleSort('moves')} style={{ cursor: 'pointer' }}>
                    Moves{sortIndicator('moves')}
                  </th>
                  <th onClick={() => toggleSort('eloGap')} style={{ cursor: 'pointer' }} title="Main player Elo minus opponent Elo">
                    Gap{sortIndicator('eloGap')}
                  </th>
                  <th>Tags</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(g => {
                  const r = resultForPlayer(g, player.mainPlayer);
                  return (
                    <tr
                      key={g.id}
                      className={`player-row result-row-${r.toLowerCase()}${(readCounts[g.id] ?? 0) > 0 ? ' studied' : ''}`}
                      onClick={() => navigate(`/games/${g.id}`)}
                      style={{ cursor: 'pointer' }}
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter') navigate(`/games/${g.id}`); }}
                      aria-label={`${g.white} vs ${g.black}${g.year ? `, ${g.year}` : ''}, ${g.result}`}
                    >
                      <td className="col-studied">
                        {(readCounts[g.id] ?? 0) > 0 ? '✓' : '○'}
                      </td>
                      <td>{g.year ?? '—'}</td>
                      <td>{g.white}</td>
                      <td>{g.black}</td>
                      <td className={`result-cell r-${r.toLowerCase()}`}>{r}</td>
                      <td className="col-eco">
                        {g.eco
                          ? <span title={g.eco}>{ecoToOpening(g.eco)}</span>
                          : '—'}
                      </td>
                      <td className="col-event-val">{g.event ?? '—'}</td>
                      <td>{Math.ceil(g.moves.length / 2)}</td>
                      <td className="col-elo-gap">
                        {(() => {
                          const gap = eloGapForPlayer(g, player.mainPlayer);
                          if (gap == null) return '—';
                          return <span className={gap <= -200 ? 'elo-gap-upset' : undefined}>{gap > 0 ? '+' : ''}{gap}</span>;
                        })()}
                      </td>
                      <td className="col-tags">
                        {(tagsByGame[g.id] ?? []).map((t, i) => (
                          <span key={i} className="cg-tag-pill" title={t}>◈</span>
                        ))}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '1.5rem', opacity: 0.5 }}>
                      No games match
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
