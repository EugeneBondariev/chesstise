import { useState } from 'react';
import type { ClassicalGame as GameData } from '../../data/classicalGames';
import { useGameStatsStore } from '../../store/gameStatsStore';
import type { GameReplay } from '../../store/gameStatsStore';

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

export default function GameStats({ game, onJumpTo }: {
  game: GameData;
  onJumpTo: (plyIdx: number) => void;
}) {
  const allReplays      = useGameStatsStore(s => s.replays.filter(r => r.gameId === game.id));
  const completedReplays = allReplays.filter(r => r.moves.length > 0 && r.moves[r.moves.length - 1] !== null);
  const deleteReplay = useGameStatsStore(s => s.deleteReplay);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (completedReplays.length === 0 && allReplays.length === 0) return null;

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
