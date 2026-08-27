import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import type { BoardOrientation } from '../../types';
import AccessibleBoard from '../common/AccessibleBoard';
import { usePuzzleStore } from '../../store/puzzleStore';
import { fetchPuzzle, fetchPuzzleById, fetchMe } from '../../api/lichess';
import type { LichessPuzzle } from '../../api/lichess';
import { speak } from '../../utils/speechUtils';

// ── Theme groups ──────────────────────────────────────────────────────────────

interface ThemeEntry { id: string; label: string; }
interface ThemeGroup { label: string; themes: ThemeEntry[]; }

const THEME_GROUPS: ThemeGroup[] = [
  {
    label: 'Mix',
    themes: [{ id: 'mix', label: 'All themes' }],
  },
  {
    label: 'Tactics',
    themes: [
      { id: 'fork', label: 'Fork' },
      { id: 'pin', label: 'Pin' },
      { id: 'skewer', label: 'Skewer' },
      { id: 'discoveredAttack', label: 'Discovered Attack' },
      { id: 'doubleCheck', label: 'Double Check' },
      { id: 'deflection', label: 'Deflection' },
      { id: 'interference', label: 'Interference' },
      { id: 'clearance', label: 'Clearance' },
      { id: 'sacrifice', label: 'Sacrifice' },
      { id: 'attraction', label: 'Attraction' },
      { id: 'decoy', label: 'Decoy' },
      { id: 'zugzwang', label: 'Zugzwang' },
      { id: 'quietMove', label: 'Quiet Move' },
      { id: 'overloading', label: 'Overloading' },
      { id: 'trappedPiece', label: 'Trapped Piece' },
      { id: 'exposedKing', label: 'Exposed King' },
    ],
  },
  {
    label: 'Checkmate',
    themes: [
      { id: 'mateIn1', label: 'Mate in 1' },
      { id: 'mateIn2', label: 'Mate in 2' },
      { id: 'mateIn3', label: 'Mate in 3' },
      { id: 'mateIn4', label: 'Mate in 4' },
      { id: 'mateIn5', label: 'Mate in 5' },
      { id: 'backRankMate', label: 'Back Rank Mate' },
      { id: 'smotheredMate', label: 'Smothered Mate' },
      { id: 'arabianMate', label: 'Arabian Mate' },
      { id: 'doubleBishopMate', label: 'Double Bishop Mate' },
      { id: 'hookMate', label: 'Hook Mate' },
    ],
  },
  {
    label: 'Phase',
    themes: [
      { id: 'opening', label: 'Opening' },
      { id: 'middlegame', label: 'Middlegame' },
      { id: 'endgame', label: 'Endgame' },
    ],
  },
  {
    label: 'Endgame Type',
    themes: [
      { id: 'rookEndgame', label: 'Rook Endgame' },
      { id: 'bishopEndgame', label: 'Bishop Endgame' },
      { id: 'knightEndgame', label: 'Knight Endgame' },
      { id: 'queenEndgame', label: 'Queen Endgame' },
      { id: 'pawnEndgame', label: 'Pawn Endgame' },
    ],
  },
  {
    label: 'Length',
    themes: [
      { id: 'oneMove', label: 'One Move' },
      { id: 'short', label: 'Short' },
      { id: 'long', label: 'Long' },
      { id: 'veryLong', label: 'Very Long' },
    ],
  },
  {
    label: 'Level',
    themes: [
      { id: 'crushing', label: 'Crushing' },
      { id: 'advantage', label: 'Advantage' },
      { id: 'equality', label: 'Equality' },
      { id: 'master', label: 'Master' },
      { id: 'masterVsMaster', label: 'Master vs Master' },
      { id: 'superGM', label: 'Super GM' },
    ],
  },
  {
    label: 'Attack',
    themes: [
      { id: 'kingsideAttack', label: 'Kingside Attack' },
      { id: 'queensideAttack', label: 'Queenside Attack' },
      { id: 'attackingF2F7', label: 'Attacking f2/f7' },
    ],
  },
];

// ── Helper functions ──────────────────────────────────────────────────────────

function fenToPieces(fen: string): Record<string, string> {
  if (!fen) return {};
  try {
    const chess = new Chess(fen);
    const pieces: Record<string, string> = {};
    const files = 'abcdefgh';
    chess.board().forEach((row, ri) => {
      row.forEach((piece, fi) => {
        if (piece) pieces[`${files[fi]}${8 - ri}`] = `${piece.color}${piece.type.toUpperCase()}`;
      });
    });
    return pieces;
  } catch {
    return {};
  }
}

function parsePgn(pgn: string): string[] {
  return pgn
    .replace(/\{[^}]*\}/g, '')
    .replace(/\d+\.\.\./g, '')
    .replace(/\d+\./g, '')
    .split(/\s+/)
    .filter(t => t && !['1-0', '0-1', '1/2-1/2', '*'].includes(t));
}

function buildPositions(moves: string[]): string[] {
  const chess = new Chess();
  const fens: string[] = [chess.fen()];
  for (const san of moves) {
    try { chess.move(san); } catch { break; }
    fens.push(chess.fen());
  }
  return fens;
}

async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  const verifier = btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return { verifier, challenge };
}

function getRedirectUri(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${window.location.origin}${base}/puzzle`;
}

// ── Component ─────────────────────────────────────────────────────────────────

const LICHESS_CLIENT_ID = 'chesstise';
const DARK_SQ:  Record<string, string> = { backgroundColor: '#3d5a6e' };
const LIGHT_SQ: Record<string, string> = { backgroundColor: '#7a96a8' };

type Phase = 'home' | 'failed-list' | 'loading' | 'error' | 'replay' | 'solving' | 'correct' | 'wrong';

export default function PuzzleDrill() {
  const token     = usePuzzleStore(s => s.token);
  const username  = usePuzzleStore(s => s.username);
  const rating    = usePuzzleStore(s => s.rating);
  const failed    = usePuzzleStore(s => s.failed);
  const setAuth   = usePuzzleStore(s => s.setAuth);
  const clearAuth = usePuzzleStore(s => s.clearAuth);
  const addFailed = usePuzzleStore(s => s.addFailed);
  const removeFailed = usePuzzleStore(s => s.removeFailed);

  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(() => Math.min(360, window.innerWidth - 32));

  useEffect(() => {
    const el = boardContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setBoardWidth(Math.min(360, Math.floor(entry.contentRect.width)));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const [phase, setPhase]               = useState<Phase>('home');
  const [theme, setTheme]               = useState('mix');
  const [puzzle, setPuzzle]             = useState<LichessPuzzle | null>(null);
  const [pgnMoves, setPgnMoves]         = useState<string[]>([]);
  const [positions, setPositions]       = useState<string[]>([]);
  const [replayPly, setReplayPly]       = useState(0);
  const [solvingFen, setSolvingFen]     = useState('');
  const [solutionIdx, setSolutionIdx]   = useState(0);
  const [selectedFrom, setSelectedFrom] = useState<Square | null>(null);
  const [wrongMoveUci, setWrongMoveUci] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]         = useState('');
  // null = no limit; number = max full moves before puzzle starts
  const [maxMoves, setMaxMoves]         = useState<number | null>(null);

  // ── OAuth callback on mount ──────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;

    const verifier = sessionStorage.getItem('lichess_pkce_verifier');
    sessionStorage.removeItem('lichess_pkce_verifier');
    window.history.replaceState({}, '', window.location.pathname);

    if (!verifier) return;

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      redirect_uri: getRedirectUri(),
      client_id: LICHESS_CLIENT_ID,
    });

    fetch('https://lichess.org/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
      .then(r => r.json())
      .then(async (data) => {
        if (data.access_token) {
          const t: string = data.access_token;
          const user = await fetchMe(t);
          setAuth(t, user.username, user.perfs?.puzzle?.rating ?? null);
        }
      })
      .catch(() => { /* ignore auth errors silently */ });
  }, [setAuth]);

  // ── Sign in with Lichess (PKCE) ──────────────────────────────────────────
  const handleSignIn = useCallback(async () => {
    const { verifier, challenge } = await generatePKCE();
    sessionStorage.setItem('lichess_pkce_verifier', verifier);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: LICHESS_CLIENT_ID,
      redirect_uri: getRedirectUri(),
      scope: 'puzzle:read',
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    window.location.href = `https://lichess.org/oauth?${params.toString()}`;
  }, []);

  // ── Load puzzle ──────────────────────────────────────────────────────────
  const loadPuzzle = useCallback(async (themeId: string, puzzleId?: string) => {
    setPhase('loading');
    setSelectedFrom(null);
    setSolutionIdx(0);
    setWrongMoveUci(null);

    try {
      let data = puzzleId
        ? await fetchPuzzleById(puzzleId, token ?? undefined)
        : await fetchPuzzle(themeId, token ?? undefined);

      // Retry up to 8 times to satisfy the move-depth limit (skip for specific puzzle IDs)
      if (!puzzleId && maxMoves !== null) {
        for (let attempt = 0; attempt < 8 && data.puzzle.initialPly > maxMoves * 2; attempt++) {
          data = await fetchPuzzle(themeId, token ?? undefined);
        }
      }

      const moves = parsePgn(data.game.pgn);
      const pos = buildPositions(moves);
      const initialPly = Math.min(data.puzzle.initialPly, pos.length - 1);

      setPuzzle(data);
      setPgnMoves(moves);
      setPositions(pos);
      setReplayPly(0);

      if (initialPly === 0) {
        setSolvingFen(pos[0] ?? '');
        setPhase('solving');
      } else {
        setPhase('replay');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load puzzle');
      setPhase('error');
    }
  }, [token, maxMoves]);

  // ── Keyboard handler for replay phase ───────────────────────────────────
  useEffect(() => {
    if (phase !== 'replay') return;

    const initialPly = puzzle ? Math.min(puzzle.puzzle.initialPly, positions.length - 1) : 0;

    function advancePly() {
      if (replayPly + 1 >= initialPly) {
        speak('your turn');
        setReplayPly(initialPly);
        setSolvingFen(positions[initialPly] ?? '');
        setPhase('solving');
      } else {
        const nextPly = replayPly + 1;
        speak(pgnMoves[nextPly - 1] ?? '');
        setReplayPly(nextPly);
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        advancePly();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setReplayPly(p => {
          const next = Math.max(0, p - 1);
          speak(next === 0 ? 'start' : (pgnMoves[next - 1] ?? ''));
          return next;
        });
      } else if (e.key === 'Home') {
        e.preventDefault();
        speak('start');
        setReplayPly(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        speak('your turn');
        setReplayPly(initialPly);
        setSolvingFen(positions[initialPly] ?? '');
        setPhase('solving');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setPhase('home');
      }
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [phase, replayPly, puzzle, positions]);

  // ── Handle square select (solving phase) ────────────────────────────────
  const handleSquareSelect = useCallback((sq: Square) => {
    if (phase !== 'solving' || !puzzle) return;

    if (!selectedFrom) {
      // Selecting origin square
      const chess = new Chess(solvingFen);
      const piece = chess.get(sq);
      const toMove = chess.turn(); // 'w' or 'b'
      if (piece && piece.color === toMove) {
        setSelectedFrom(sq);
      }
      return;
    }

    if (sq === selectedFrom) {
      setSelectedFrom(null);
      return;
    }

    // Attempt the move
    const chess = new Chess(solvingFen);
    const solution = puzzle.puzzle.solution;
    const expected = solution[solutionIdx];

    let moveResult;
    try {
      moveResult = chess.move({
        from: selectedFrom,
        to: sq,
        promotion: (expected.length === 5 ? expected[4] : 'q') as 'q' | 'r' | 'b' | 'n',
      });
    } catch {
      setSelectedFrom(null);
      return;
    }

    const madeUci = `${moveResult.from}${moveResult.to}${moveResult.promotion ?? ''}`;

    if (madeUci === expected) {
      const nextIdx = solutionIdx + 1;

      if (nextIdx >= solution.length) {
        setSolvingFen(chess.fen());
        setPhase('correct');
        setSelectedFrom(null);
        return;
      }

      // Auto-play opponent response
      const oppMove = solution[nextIdx];
      try {
        chess.move({
          from: oppMove.slice(0, 2) as Square,
          to: oppMove.slice(2, 4) as Square,
          promotion: (oppMove[4] ?? 'q') as 'q' | 'r' | 'b' | 'n',
        });
      } catch {
        // if opponent move fails, still update state
      }

      const nextNextIdx = nextIdx + 1;
      setSolvingFen(chess.fen());
      setSelectedFrom(null);

      if (nextNextIdx >= solution.length) {
        setPhase('correct');
      } else {
        setSolutionIdx(nextNextIdx);
      }
    } else {
      // Wrong move
      addFailed({
        id: puzzle.puzzle.id,
        rating: puzzle.puzzle.rating,
        themes: puzzle.puzzle.themes,
        failedAt: new Date().toISOString(),
      });
      setWrongMoveUci(expected);
      setSelectedFrom(null);
      setPhase('wrong');
    }
  }, [phase, solvingFen, selectedFrom, solutionIdx, puzzle, addFailed]);

  // ── Computed board pieces ────────────────────────────────────────────────
  const boardPieces = useMemo<Record<string, string>>(() => {
    if (phase === 'replay') {
      return fenToPieces(positions[replayPly] ?? positions[0] ?? '');
    }
    if (phase === 'solving' || phase === 'correct' || phase === 'wrong') {
      return fenToPieces(solvingFen || positions[puzzle?.puzzle.initialPly ?? 0] || '');
    }
    return {};
  }, [phase, positions, replayPly, solvingFen, puzzle]);

  // ── Computed square styles ───────────────────────────────────────────────
  const squareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (selectedFrom) {
      styles[selectedFrom] = { background: 'rgba(255,255,0,0.5)' };
    }
    if (phase === 'wrong' && wrongMoveUci) {
      const fromSq = wrongMoveUci.slice(0, 2);
      const toSq = wrongMoveUci.slice(2, 4);
      styles[fromSq] = { background: 'rgba(0,200,100,0.5)' };
      styles[toSq] = { background: 'rgba(0,200,100,0.4)' };
    }
    return styles;
  }, [selectedFrom, phase, wrongMoveUci]);

  // ── Derived values ───────────────────────────────────────────────────────
  const puzzleOrientation: BoardOrientation = puzzle
    ? (puzzle.puzzle.initialPly % 2 === 0 ? 'white' : 'black')
    : 'white';

  const initialPly = puzzle ? Math.min(puzzle.puzzle.initialPly, positions.length - 1) : 0;

  const replayMoveLabel = replayPly === 0
    ? 'Starting position'
    : `Move ${Math.ceil(replayPly / 2)}: ${pgnMoves[replayPly - 1] ?? ''}`;

  // ── Replay advance helper (shared by keyboard and button) ───────────────
  function advanceReplayPly() {
    if (replayPly + 1 >= initialPly) {
      speak('your turn');
      setReplayPly(initialPly);
      setSolvingFen(positions[initialPly] ?? '');
      setPhase('solving');
    } else {
      const nextPly = replayPly + 1;
      speak(pgnMoves[nextPly - 1] ?? '');
      setReplayPly(nextPly);
    }
  }

  function jumpToPuzzle() {
    speak('your turn');
    setReplayPly(initialPly);
    setSolvingFen(positions[initialPly] ?? '');
    setPhase('solving');
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (phase === 'home' || phase === 'failed-list') {
    return (
      <div className="exercise-page">
        <h1 className="exercise-title">Puzzles</h1>

        {/* Auth bar */}
        <div className="puzzle-auth">
          {username ? (
            <>
              <span className="puzzle-auth-user">♟ {username}</span>
              {rating !== null && <span className="puzzle-auth-rating">({rating})</span>}
              <button className="puzzle-disconnect-btn" onClick={clearAuth}>Disconnect</button>
            </>
          ) : (
            <button className="puzzle-signin-btn" onClick={handleSignIn}>Sign in with Lichess</button>
          )}
        </div>

        {/* Replay depth filter */}
        <div className="puzzle-depth-filter">
          <span className="puzzle-depth-label">Replay depth:</span>
          {([5, 10, 20, null] as (number | null)[]).map(n => (
            <button
              key={n ?? 'any'}
              className={`puzzle-depth-btn${maxMoves === n ? ' selected' : ''}`}
              onClick={() => setMaxMoves(n)}
            >
              {n === null ? 'Any' : `≤ ${n} moves`}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="puzzle-tabs">
          <button
            className={`puzzle-tab${phase === 'home' ? ' active' : ''}`}
            onClick={() => setPhase('home')}
          >
            Themes
          </button>
          {failed.length > 0 && (
            <button
              className={`puzzle-tab${phase === 'failed-list' ? ' active' : ''}`}
              onClick={() => setPhase('failed-list')}
            >
              Failed ({failed.length})
            </button>
          )}
        </div>

        {phase === 'failed-list' ? (
          <div className="puzzle-failed-list">
            {failed.map(p => (
              <div key={p.id} className="puzzle-failed-item">
                <div>
                  <strong>#{p.id}</strong> · Rating: {p.rating} · {p.themes.slice(0, 2).join(', ')}
                </div>
                <div>
                  <button onClick={() => loadPuzzle(theme, p.id)}>Retry</button>
                  <button onClick={() => removeFailed(p.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="puzzle-themes">
            {THEME_GROUPS.map(group => (
              <div key={group.label} className="puzzle-theme-group">
                <div className="puzzle-theme-group-label">{group.label}</div>
                <div className="puzzle-theme-grid">
                  {group.themes.map(t => (
                    <button
                      key={t.id}
                      className={`puzzle-theme-btn${theme === t.id ? ' selected' : ''}`}
                      onClick={() => { setTheme(t.id); loadPuzzle(t.id); }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="exercise-page">
        <h1>Puzzles</h1>
        <p className="puzzle-loading">Loading puzzle…</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="exercise-page">
        <h1>Puzzles</h1>
        <p className="puzzle-error">{errorMsg}</p>
        <button onClick={() => setPhase('home')}>← Back to themes</button>
      </div>
    );
  }

  // replay / solving / correct / wrong
  if (!puzzle) return null;

  return (
    <div className="exercise-page">
      <h1 className="exercise-title">Puzzles</h1>

      {/* Meta bar */}
      <div className="puzzle-meta">
        <span className="puzzle-meta-id">#{puzzle.puzzle.id}</span>
        <span className="puzzle-meta-rating">⭐ {puzzle.puzzle.rating}</span>
        <span className="puzzle-meta-depth">move {Math.ceil(puzzle.puzzle.initialPly / 2)}</span>
        <span className="puzzle-meta-themes">{puzzle.puzzle.themes.slice(0, 3).join(' · ')}</span>
        <button className="puzzle-back" onClick={() => setPhase('home')}>← Themes</button>
      </div>

      <div className="puzzle-layout">
        <div className="board-col">
          {/* Status strip above board */}
          {phase === 'replay' && (
            <div className="puzzle-status puzzle-status--replay">
              <span>{replayPly}/{initialPly}</span>
              <span>{replayMoveLabel}</span>
              <span className="puzzle-hint-text">← → navigate · End = jump to puzzle · Esc = back</span>
            </div>
          )}
          {phase === 'solving' && (
            <div className="puzzle-status puzzle-status--solving">
              {puzzleOrientation === 'white' ? '♔ White' : '♚ Black'} to move — find the best continuation
            </div>
          )}
          {phase === 'correct' && (
            <div className="puzzle-status puzzle-status--correct">
              ✓ Correct!
              <button className="puzzle-next" onClick={() => loadPuzzle(theme)}>Next puzzle →</button>
            </div>
          )}
          {phase === 'wrong' && (
            <div className="puzzle-status puzzle-status--wrong">
              ✗ Wrong. The move was highlighted in green.
              <button className="puzzle-next" onClick={() => loadPuzzle(theme)}>Next puzzle →</button>
            </div>
          )}

          <div ref={boardContainerRef} style={{ width: '100%' }}>
            <AccessibleBoard
              position={boardPieces}
              boardWidth={boardWidth}
              boardOrientation={puzzleOrientation}
              customSquareStyles={squareStyles}
              customDarkSquareStyle={DARK_SQ}
              customLightSquareStyle={LIGHT_SQ}
              animationDuration={200}
              onSquareSelect={handleSquareSelect}
              ariaLabel="Puzzle board"
              disabled={phase !== 'solving'}
            />
          </div>

          {/* Replay controls (mobile buttons) */}
          {phase === 'replay' && (
            <div className="puzzle-replay-controls">
              <button onClick={() => setReplayPly(0)} aria-label="Start">⏮</button>
              <button onClick={() => setReplayPly(p => Math.max(0, p - 1))} aria-label="Back">◀</button>
              <button onClick={advanceReplayPly} aria-label="Forward">▶</button>
              <button onClick={jumpToPuzzle} aria-label="Jump to puzzle">⏭ Puzzle</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
