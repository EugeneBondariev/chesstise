import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ClassicalGame as GameData } from '../../data/classicalGames';
import { useGameStatsStore } from '../../store/gameStatsStore';
import type { GameReplay, FlaggedMove } from '../../store/gameStatsStore';
import { BLUEPRINT_GAMES } from '../../data/blueprintCorpus';
import { CURATED_GAMES, PATTERN_LABELS } from '../../data/classicalGamesSelection';

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function accuracy(replay: GameReplay): number {
  const practiced = replay.moves.filter(m => m !== null && m.attempts > 0);
  if (!practiced.length) return 0;
  const correct = practiced.filter(m => m!.attempts === 1).length;
  return Math.round((correct / practiced.length) * 100);
}

function mistakeCount(replay: GameReplay): number {
  return replay.moves.filter(m => m !== null && m.attempts !== 1).length;
}

function dotColor(mistakes: number): string {
  if (mistakes === 0) return '#4ade80';
  if (mistakes <= 4)  return '#facc15';
  return '#f87171';
}

// Progress sparkline: total time per replay — only completed runs (last move recorded)
function ProgressChart({ replays }: { replays: GameReplay[] }) {
  const completed = replays.filter(r =>
    r.totalTimeMs != null && r.moves.length > 0 && r.moves[r.moves.length - 1] !== null
  );
  if (completed.length < 2) return null;
  const W = 300, H = 36;
  const times    = completed.map(r => r.totalTimeMs!);
  const mistakes = completed.map(mistakeCount);
  const maxT = Math.max(...times, 1);
  const pts = times.map((t, i) => {
    const x = (i / (times.length - 1)) * (W - 4) + 2;
    const y = H - 4 - ((t / maxT) * (H - 8));
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="gs-progress-chart">
      <span className="gs-progress-label">Total time per completed replay</span>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
        <polyline points={pts} fill="none" stroke="var(--accent,#4a9eff)" strokeWidth="2" />
        {times.map((t, i) => {
          const x = (i / (times.length - 1)) * (W - 4) + 2;
          const y = H - 4 - ((t / maxT) * (H - 8));
          return (
            <circle key={i} cx={x} cy={y} r="3.5" fill={dotColor(mistakes[i])}>
              <title>{fmtMs(t)} · {mistakes[i]} mistake{mistakes[i] !== 1 ? 's' : ''}</title>
            </circle>
          );
        })}
      </svg>
      <div className="gs-progress-times">
        <span>{fmtMs(times[0])} · {mistakes[0]}✗</span>
        <span style={{ color: times[times.length-1] < times[0] ? '#4ade80' : '#facc15' }}>
          {fmtMs(times[times.length-1])} · {mistakes[times.length-1]}✗
        </span>
      </div>
    </div>
  );
}

// Bar chart for a single replay, with previous replays as faint lines
function MoveChart({ replay, allReplays, moveCount }: {
  replay: GameReplay;
  allReplays: GameReplay[];
  moveCount: number;
}) {
  const W = 600, H = 80;
  const barW = Math.max(2, Math.floor((W - 8) / moveCount));
  const allTimes = allReplays.flatMap(r => r.moves.map(m => m?.timeMs ?? 0));
  const maxT = Math.max(...allTimes, 1000);
  const toH = (ms: number) => Math.max(1, (ms / maxT) * (H - 6));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }} className="gs-move-chart">
      {/* Previous replays as faint polylines */}
      {allReplays.filter(r => r.id !== replay.id).map(r => {
        const pts = r.moves.map((m, i) => {
          const x = 4 + i * barW + barW / 2;
          const y = H - toH(m?.timeMs ?? 0);
          return `${x},${y}`;
        }).join(' ');
        return <polyline key={r.id} points={pts} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
      })}
      {/* Current replay bars */}
      {replay.moves.map((m, i) => {
        if (!m) return null;
        const x = 4 + i * barW;
        const h = toH(m.timeMs);
        const fill = m.attempts === 0 ? '#555'
          : m.attempts === 1 ? '#4ade80'
          : '#facc15';
        return (
          <g key={i}>
            <rect x={x} y={H - h} width={Math.max(1, barW - 1)} height={h} fill={fill} opacity={0.85} />
            <title>{`Move ${i + 1}: ${fmtMs(m.timeMs)}, ${m.attempts === 0 ? 'skipped' : m.attempts === 1 ? '1st try' : `${m.attempts} tries`}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

// ── Flagged-move analysis ──────────────────────────────────────────────────────

interface Pattern { label: string; conceptIds: string[] }

function analyzeMove(san: string): Pattern[] {
  const patterns: Pattern[] = [];
  if (san === 'O-O' || san === '0-0' || san === 'O-O-O' || san === '0-0-0') {
    patterns.push({ label: 'Castling', conceptIds: [] });
    return patterns;
  }
  const s = san.replace(/[+#!?]/g, '');
  const piece = /^[RNBQK]/.test(s) ? s[0] : 'P';
  const isCapture = san.includes('x');
  const isCheck   = san.includes('+') && !san.includes('++');
  const isDblChk  = san.includes('++');
  const isPromo   = san.includes('=');

  if (isPromo)   patterns.push({ label: 'Promotion',        conceptIds: ['t-back-rank', 's-passed'] });
  if (isDblChk)  patterns.push({ label: 'Double check',     conceptIds: ['t-dbl-check', 't-discovered'] });
  else if (isCheck && (piece === 'N' || piece === 'P'))
                 patterns.push({ label: 'Knight/pawn check — possible fork or discovery',
                                 conceptIds: ['t-fork', 't-discovered'] });
  else if (isCheck)
                 patterns.push({ label: 'Check',             conceptIds: ['t-discovered', 't-dbl-check'] });
  if (isCapture && piece === 'Q')
                 patterns.push({ label: 'Queen capture — possible sacrifice',
                                 conceptIds: ['t-queen-sac', 't-deflection', 't-decoy'] });
  else if (isCapture)
                 patterns.push({ label: 'Capture',           conceptIds: ['t-exch-sac', 't-remove-def', 't-clearance'] });
  if (piece === 'N' && !isCheck)
                 patterns.push({ label: 'Knight manoeuvre',  conceptIds: ['t-fork', 'f-outpost'] });
  if (piece === 'R')
                 patterns.push({ label: 'Rook move',         conceptIds: ['f-7th-rank', 'f-open-file', 'e-rook'] });
  return patterns;
}

function suggestGames(
  currentGameId: string,
  gameConcepts: string[],
  patterns: Pattern[],
): typeof BLUEPRINT_GAMES[0][] {
  const patternConceptIds = [...new Set(patterns.flatMap(p => p.conceptIds))];
  return BLUEPRINT_GAMES
    .filter(g => g.id !== null && g.id !== currentGameId)
    .map(g => {
      const overlap   = g.concepts.filter(c => gameConcepts.includes(c)).length;
      const tactical  = g.concepts.filter(c => patternConceptIds.includes(c)).length;
      return { g, score: overlap * 1 + tactical * 3 };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.g);
}

function FlaggedPanel({ game, flags }: { game: GameData; flags: FlaggedMove[] }) {
  const navigate    = useNavigate();
  const unflagMove  = useGameStatsStore(s => s.unflagMove);

  const corpusEntry = BLUEPRINT_GAMES.find(g => g.id === game.id);
  const curatedEntry = CURATED_GAMES.find(g => g.id === game.id);
  const gameConcepts = [
    ...(corpusEntry?.concepts ?? []),
    ...(curatedEntry?.patterns.map(p => `curated-${p}`) ?? []),
  ];

  if (flags.length === 0) return null;

  return (
    <div className="gs-flagged">
      <div className="gs-section-title">Flagged moves</div>
      {flags.map(f => {
        const moveNum  = Math.ceil((f.plyIdx + 1) / 2);
        const side     = f.plyIdx % 2 === 0 ? 'W' : 'B';
        const patterns = analyzeMove(f.san);
        const suggested = suggestGames(game.id, gameConcepts, patterns);
        return (
          <div key={f.id} className="gs-flagged-row">
            <div className="gs-flagged-header">
              <span className="gs-flagged-move">{moveNum}{side}. {f.san}</span>
              <span className="gs-flagged-date">{new Date(f.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              <button className="gs-replay-del" onClick={() => unflagMove(f.id)} aria-label="Remove flag">×</button>
            </div>
            {patterns.length > 0 && (
              <div className="gs-flagged-patterns">
                {patterns.map((p, i) => (
                  <span key={i} className="gs-flagged-tag">{p.label}</span>
                ))}
              </div>
            )}
            {suggested.length > 0 && (
              <div className="gs-flagged-suggestions">
                <span className="gs-flagged-suggest-label">See also: </span>
                {suggested.map((g, i) => (
                  <span key={g.id!}>
                    {i > 0 && <span className="bp-cov-sep"> · </span>}
                    <button className="bp-cov-game-link" onClick={() => navigate(`/games/${g.id}`)}>
                      {g.title}
                    </button>
                  </span>
                ))}
              </div>
            )}
            {suggested.length === 0 && (
              <div className="gs-flagged-suggestions" style={{ color: 'var(--muted)' }}>
                {patterns.flatMap(p => p.conceptIds).length === 0
                  ? 'No matching corpus games — strategic or positional novelty'
                  : 'No additional corpus games found for this pattern'}
              </div>
            )}
            {curatedEntry && curatedEntry.patterns.length > 0 && (
              <div className="gs-flagged-themes">
                {curatedEntry.patterns.map(k => PATTERN_LABELS[k]).filter(Boolean).slice(0, 4).map((label, i) => (
                  <span key={i} className="gs-flagged-theme">{label}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function GameStats({ game, onJumpTo }: {
  game: GameData;
  onJumpTo: (plyIdx: number) => void;
}) {
  const allReplays       = useGameStatsStore(s => s.replays.filter(r => r.gameId === game.id));
  const completedReplays = allReplays.filter(r => r.moves.length > 0 && r.moves[r.moves.length - 1] !== null);
  const flags            = useGameStatsStore(s => s.flaggedMoves.filter(f => f.gameId === game.id));
  const deleteReplay     = useGameStatsStore(s => s.deleteReplay);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (completedReplays.length === 0 && allReplays.length === 0 && flags.length === 0) return null;

  const selected = completedReplays.find(r => r.id === selectedId) ?? completedReplays[completedReplays.length - 1];

  // Bottleneck: average time per move — include all replays (full + partial) for richer data
  const moveCount = game.moves.length;
  const avgTimes: { plyIdx: number; avgMs: number; avgAttempts: number }[] = [];
  for (let i = 0; i < moveCount; i++) {
    const records = allReplays.map(r => r.moves[i]).filter(Boolean) as NonNullable<GameReplay['moves'][0]>[];
    if (records.length === 0) continue;
    const practiced = records.filter(r => r.attempts > 0);
    if (practiced.length === 0) continue;
    avgTimes.push({
      plyIdx: i,
      avgMs: Math.round(practiced.reduce((s, r) => s + r.timeMs, 0) / practiced.length),
      avgAttempts: Math.round(practiced.reduce((s, r) => s + r.attempts, 0) / practiced.length * 10) / 10,
    });
  }
  const bottlenecks = [...avgTimes].sort((a, b) => b.avgMs - a.avgMs).slice(0, 8);

  if (completedReplays.length === 0 && bottlenecks.length === 0) return null;

  return (
    <div className="game-stats">
      <ProgressChart replays={completedReplays} />

      <div className="gs-replay-list">
        {completedReplays.map((r, i) => (
          <div
            key={r.id}
            className={`gs-replay-row${r.id === selected.id ? ' selected' : ''}`}
            onClick={() => setSelectedId(r.id)}
          >
            <span className="gs-replay-num">#{i + 1}</span>
            <span className="gs-replay-date">{fmtDate(r.startedAt)}</span>
            <span className="gs-replay-time">{r.totalTimeMs != null ? fmtMs(r.totalTimeMs) : '…'}</span>
            <span className="gs-replay-acc">{accuracy(r)}%</span>
            <button
              className="gs-replay-del"
              onClick={e => { e.stopPropagation(); deleteReplay(r.id); }}
              aria-label="Delete replay"
            >×</button>
          </div>
        ))}
      </div>

      {selected && (
        <>
          <div className="gs-chart-header">
            <span className="gs-chart-legend">
              <span style={{ color: '#4ade80' }}>■</span> 1st try &nbsp;
              <span style={{ color: '#facc15' }}>■</span> retried &nbsp;
              <span style={{ color: '#555' }}>■</span> skipped
            </span>
          </div>
          <MoveChart replay={selected} allReplays={completedReplays} moveCount={moveCount} />
        </>
      )}

      <FlaggedPanel game={game} flags={flags} />

      {bottlenecks.length > 0 && (
        <div className="gs-bottleneck">
          <div className="gs-section-title">Bottlenecks</div>
          <table className="gs-bottleneck-table">
            <thead><tr><th>#</th><th>Move</th><th>Avg time</th><th>Avg tries</th><th></th></tr></thead>
            <tbody>
              {bottlenecks.map(({ plyIdx, avgMs, avgAttempts }) => (
                <tr key={plyIdx}>
                  <td>{Math.ceil((plyIdx + 1) / 2)}{plyIdx % 2 === 0 ? 'w' : 'b'}</td>
                  <td>{game.moves[plyIdx]}</td>
                  <td>{fmtMs(avgMs)}</td>
                  <td>{avgAttempts}</td>
                  <td>
                    <button className="gs-jump-btn" onClick={() => onJumpTo(plyIdx)}>↩ Replay</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
