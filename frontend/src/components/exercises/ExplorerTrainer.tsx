import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import type { Square } from 'chess.js';
import {
  fetchExplorerMoves,
  weightedPick,
} from '../../api/lichessOpenings';
import type { MasterMove } from '../../api/lichessOpenings';
import {
  PIECE_FROM_KEY,
  FILE_FROM_KEY,
  RANK_FROM_KEY,
} from '../../utils/chessUtils';
import { speak, playSound } from '../../utils/speechUtils';
import { useProfileStore } from '../../store/profileStore';

// ── Pre-compute preset FENs at module level ─────────────────────────────────

function computeFen(moves: string[]): string {
  const c = new Chess();
  for (const m of moves) c.move(m);
  return c.fen();
}

const PRESETS: { label: string; fen: string }[] = [
  { label: 'Start',          fen: new Chess().fen() },
  { label: 'e4',             fen: computeFen(['e4']) },
  { label: 'Ruy Lopez',      fen: computeFen(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']) },
  { label: 'Italian',        fen: computeFen(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']) },
  { label: 'Sicilian',       fen: computeFen(['e4', 'c5']) },
  { label: "Queen's Gambit", fen: computeFen(['d4', 'd5', 'c4']) },
  { label: 'French',         fen: computeFen(['e4', 'e6']) },
  { label: "King's Indian",  fen: computeFen(['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7']) },
];

const STARTING_FEN = new Chess().fen();

// ── Types ───────────────────────────────────────────────────────────────────

interface HistoryEntry {
  san:          string;
  fen:          string;        // FEN after the move
  byComputer:   boolean;
  explorerData: MasterMove[] | null;  // explorer data for position BEFORE this move
}

// ── Spoken SAN helper ───────────────────────────────────────────────────────

function spokenSan(san: string): string {
  if (san === 'O-O-O' || san === '0-0-0') return 'long castling';
  if (san === 'O-O'   || san === '0-0')   return 'short castling';
  const suffix = san.endsWith('#') ? ' checkmate' : san.endsWith('+') ? ' check' : '';
  const s = san.replace(/[+#]$/, '');
  if (/^[a-h]/.test(s)) {
    // pawn move
    if (s.includes('x')) {
      const [from, to] = s.split('x');
      return `${from} takes ${to}${suffix}`;
    }
    return `${s}${suffix}`;
  }
  const NAMES: Record<string, string> = {
    R: 'Rook', N: 'Knight', B: 'Bishop', Q: 'Queen', K: 'King',
  };
  const piece = NAMES[s[0]] ?? s[0];
  const rest  = s.slice(1);
  if (rest.includes('x')) {
    const [, to] = rest.split('x');
    return `${piece} takes ${to}${suffix}`;
  }
  return `${piece} ${rest}${suffix}`;
}

// ── findMove ─────────────────────────────────────────────────────────────────

type FindResult = string | 'ambiguous' | null;

function findMove(buf: string, chess: Chess): FindResult {
  const pieceClass = PIECE_FROM_KEY[buf[0]];
  if (!pieceClass) return null;

  const chessJsPiece = (
    { king: 'k', queen: 'q', rook: 'r', bishop: 'b', knight: 'n', pawn: 'p' } as const
  )[pieceClass];

  const allMoves = chess.moves({ verbose: true });

  if (buf.length === 3) {
    const destFile = FILE_FROM_KEY[buf[1]];
    const destRank = RANK_FROM_KEY[buf[2]];
    if (!destFile || !destRank) return null;
    const toSq = `${destFile}${destRank}` as Square;
    const matches = allMoves.filter(m => m.piece === chessJsPiece && m.to === toSq);
    if (matches.length === 0)   return null;
    if (matches.length === 1)   return matches[0].san;
    return 'ambiguous';
  }

  if (buf.length === 4) {
    const srcKey  = buf[1];
    const destFile = FILE_FROM_KEY[buf[2]];
    const destRank = RANK_FROM_KEY[buf[3]];
    if (!destFile || !destRank) return null;
    const toSq = `${destFile}${destRank}` as Square;

    // Try interpreting source key as a file disambiguator
    const srcFile = FILE_FROM_KEY[srcKey];
    if (srcFile) {
      const byFile = allMoves.filter(
        m => m.piece === chessJsPiece && m.to === toSq && m.from[0] === srcFile,
      );
      if (byFile.length === 1) return byFile[0].san;
    }

    // Try interpreting source key as a rank disambiguator
    const srcRank = RANK_FROM_KEY[srcKey];
    if (srcRank !== undefined) {
      const byRank = allMoves.filter(
        m => m.piece === chessJsPiece && m.to === toSq && parseInt(m.from[1]) === srcRank,
      );
      if (byRank.length === 1) return byRank[0].san;
    }

    return null;
  }

  return null;
}

// ── Move history display helper ──────────────────────────────────────────────

function buildPgn(history: HistoryEntry[]): string {
  return history
    .map((entry, i) => {
      const isWhiteMove = i % 2 === 0;
      const num = isWhiteMove ? `${Math.floor(i / 2) + 1}. ` : '';
      return `${num}${entry.san}`;
    })
    .join(' ');
}

// ── Setup phase component ────────────────────────────────────────────────────

interface SetupProps {
  onStart: (
    startFen: string,
    playerColor: 'white' | 'black',
    ratings: number[],
    speeds: string[],
  ) => void;
}

const ALL_RATINGS = [400, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500];
const ALL_SPEEDS  = ['bullet', 'blitz', 'rapid', 'classical'];

function SetupPanel({ onStart }: SetupProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESETS[0].label);
  const [customFen,      setCustomFen]      = useState('');
  const [playerColor,    setPlayerColor]    = useState<'white' | 'black'>('white');
  const [ratings,        setRatings]        = useState<number[]>([1600, 1800, 2000]);
  const [speeds,         setSpeeds]         = useState<string[]>(['blitz', 'rapid']);

  const toggleRating = (r: number) =>
    setRatings(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  const toggleSpeed = (s: string) =>
    setSpeeds(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const handleStart = () => {
    let fen = customFen.trim();
    if (!fen) {
      const preset = PRESETS.find(p => p.label === selectedPreset);
      fen = preset?.fen ?? STARTING_FEN;
    }
    // Validate FEN
    try { new Chess(fen); } catch { fen = STARTING_FEN; }
    onStart(fen, playerColor, ratings.length ? ratings : [1600, 1800, 2000], speeds.length ? speeds : ['blitz', 'rapid']);
  };

  return (
    <div className="et-setup">
      <h1 className="exercise-title">Explorer Trainer</h1>
      <p className="et-setup-desc">
        Play against the Lichess database. The computer picks moves weighted by game frequency.
        Press <kbd>e</kbd> after your move to see alternatives.
      </p>

      <div className="et-section-label">Starting position</div>
      <div className="et-presets">
        {PRESETS.map(p => (
          <button
            key={p.label}
            className={`et-preset-btn${selectedPreset === p.label && !customFen.trim() ? ' active' : ''}`}
            onClick={() => { setSelectedPreset(p.label); setCustomFen(''); }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="et-section-label" style={{ marginTop: '0.75rem' }}>Custom FEN (optional)</div>
      <input
        type="text"
        className="et-fen-input"
        placeholder="Paste a FEN string here, or leave blank to use preset"
        value={customFen}
        onChange={e => setCustomFen(e.target.value)}
        spellCheck={false}
      />

      <div className="et-section-label" style={{ marginTop: '0.75rem' }}>Play as</div>
      <div className="et-color-toggle">
        <button
          className={`et-color-btn${playerColor === 'white' ? ' active' : ''}`}
          onClick={() => setPlayerColor('white')}
        >White</button>
        <button
          className={`et-color-btn${playerColor === 'black' ? ' active' : ''}`}
          onClick={() => setPlayerColor('black')}
        >Black</button>
      </div>

      <div className="et-section-label" style={{ marginTop: '0.75rem' }}>Rating range</div>
      <div className="et-checkboxes">
        {ALL_RATINGS.map(r => (
          <label key={r} className="et-check-label">
            <input
              type="checkbox"
              checked={ratings.includes(r)}
              onChange={() => toggleRating(r)}
            />
            {r}
          </label>
        ))}
      </div>

      <div className="et-section-label" style={{ marginTop: '0.75rem' }}>Time controls</div>
      <div className="et-checkboxes">
        {ALL_SPEEDS.map(s => (
          <label key={s} className="et-check-label">
            <input
              type="checkbox"
              checked={speeds.includes(s)}
              onChange={() => toggleSpeed(s)}
            />
            {s}
          </label>
        ))}
      </div>

      <button className="et-start-btn" onClick={handleStart}>
        Start
      </button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ExplorerTrainer() {
  // ── Phase ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<'setup' | 'playing'>('setup');

  // ── Setup params (carried into playing phase) ──────────────────────────────
  const [startFen,       setStartFen]       = useState(STARTING_FEN);
  const [playerColor,    setPlayerColor]    = useState<'white' | 'black'>('white');
  const [selectedRatings, setSelectedRatings] = useState<number[]>([1600, 1800, 2000]);
  const [selectedSpeeds,  setSelectedSpeeds]  = useState<string[]>(['blitz', 'rapid']);

  // ── Playing state ──────────────────────────────────────────────────────────
  const chessRef        = useRef(new Chess());
  const [fen,           setFen]            = useState(STARTING_FEN);
  const [history,       setHistory]        = useState<HistoryEntry[]>([]);
  const [explorerData,  setExplorerData]   = useState<MasterMove[] | null>(null);
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [inputBuf,      setInputBuf]       = useState('');
  const inputBufRef     = useRef('');
  const [isAmbiguous,   setIsAmbiguous]    = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [lastArrows,    setLastArrows]     = useState<[Square, Square][]>([]);
  const computerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Board sizing ───────────────────────────────────────────────────────────
  const boardMaxWidth = useProfileStore(s => s.boardMaxWidth);
  const containerRef  = useRef<HTMLDivElement>(null);
  const [boardWidth,  setBoardWidth]       = useState(() => Math.min(boardMaxWidth, window.innerWidth - 32));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 360;
      setBoardWidth(Math.min(w, boardMaxWidth));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [boardMaxWidth]);

  // ── Whose turn ─────────────────────────────────────────────────────────────
  const isPlayerTurn = chessRef.current.turn() === 'w'
    ? playerColor === 'white'
    : playerColor === 'black';

  // ── Start playing ──────────────────────────────────────────────────────────
  const startPlaying = useCallback((
    fen_: string,
    color: 'white' | 'black',
    ratings_: number[],
    speeds_: string[],
  ) => {
    if (computerTimerRef.current) clearTimeout(computerTimerRef.current);
    const chess = new Chess(fen_);
    chessRef.current = chess;
    setStartFen(fen_);
    setPlayerColor(color);
    setSelectedRatings(ratings_);
    setSelectedSpeeds(speeds_);
    setFen(fen_);
    setHistory([]);
    setExplorerData(null);
    setExplorerLoading(false);
    setInputBuf('');
    inputBufRef.current = '';
    setIsAmbiguous(false);
    setShowAlternatives(false);
    setLastArrows([]);
    setPhase('playing');
  }, []);

  // ── Back to setup ──────────────────────────────────────────────────────────
  const backToSetup = useCallback(() => {
    if (computerTimerRef.current) clearTimeout(computerTimerRef.current);
    setPhase('setup');
    setInputBuf('');
    inputBufRef.current = '';
  }, []);

  // ── Explorer fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    let cancelled = false;
    setExplorerLoading(true);
    setExplorerData(null);
    fetchExplorerMoves(fen, { ratings: selectedRatings, speeds: selectedSpeeds }).then(moves => {
      if (cancelled) return;
      setExplorerData(moves);
      setExplorerLoading(false);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, phase]);

  // ── Computer turn ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    if (isPlayerTurn) return;
    if (explorerLoading) return;
    if (explorerData === null) return;

    const fenSnapshot = fen;

    if (explorerData.length === 0) {
      // Out of book: play a random legal move
      computerTimerRef.current = setTimeout(() => {
        if (chessRef.current.fen() !== fenSnapshot) return;
        const legalMoves = chessRef.current.moves({ verbose: true });
        if (legalMoves.length === 0) return;
        const pick = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        try {
          const result = chessRef.current.move(pick.san);
          if (!result) return;
          const newFen = chessRef.current.fen();
          const arrows: [Square, Square][] = [[result.from as Square, result.to as Square]];
          setLastArrows(arrows);
          setFen(newFen);
          setHistory(prev => [
            ...prev,
            { san: pick.san, fen: newFen, byComputer: true, explorerData: null },
          ]);
          speak(spokenSan(pick.san));
        } catch {}
      }, 700);
      return () => {
        if (computerTimerRef.current) clearTimeout(computerTimerRef.current);
      };
    }

    // In book: pick weighted random move
    const movesToPick = explorerData;

    computerTimerRef.current = setTimeout(() => {
      if (chessRef.current.fen() !== fenSnapshot) return;
      const pick = weightedPick(movesToPick);
      if (!pick) return;
      const explorerSnapshot = movesToPick;
      try {
        const result = chessRef.current.move(pick.san);
        if (!result) return;
        const newFen = chessRef.current.fen();
        const arrows: [Square, Square][] = [[result.from as Square, result.to as Square]];
        setLastArrows(arrows);
        setFen(newFen);
        setHistory(prev => [
          ...prev,
          { san: pick.san, fen: newFen, byComputer: true, explorerData: explorerSnapshot },
        ]);
        speak(spokenSan(pick.san));
      } catch {}
    }, 700);

    return () => {
      if (computerTimerRef.current) clearTimeout(computerTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, phase, isPlayerTurn, explorerLoading, explorerData]);

  // ── Apply player move ──────────────────────────────────────────────────────
  const applyPlayerMove = useCallback((san: string) => {
    const explorerSnapshot = explorerData;
    try {
      const result = chessRef.current.move(san);
      if (!result) { playSound(false); return; }
      const newFen = chessRef.current.fen();
      const arrows: [Square, Square][] = [[result.from as Square, result.to as Square]];
      setLastArrows(arrows);
      setFen(newFen);
      setHistory(prev => [
        ...prev,
        { san, fen: newFen, byComputer: false, explorerData: explorerSnapshot },
      ]);
      setShowAlternatives(false);
      playSound(true);
    } catch {
      playSound(false);
    }
  }, [explorerData]);

  // ── Undo ──────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (computerTimerRef.current) clearTimeout(computerTimerRef.current);
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      chessRef.current.undo();
      const newHistory = prev.slice(0, -1);

      // If last move was by computer, undo one more to get back to player turn
      if (last.byComputer && newHistory.length > 0) {
        chessRef.current.undo();
        const newFen = chessRef.current.fen();
        setFen(newFen);
        setShowAlternatives(false);
        return newHistory.slice(0, -1);
      }

      const newFen = chessRef.current.fen();
      setFen(newFen);
      setShowAlternatives(false);
      return newHistory;
    });
    // Set arrows to last move if any
    setLastArrows([]);
  }, []);

  // ── Key handler ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;

      // Global shortcuts (work regardless of whose turn)
      if (k === 'Escape') {
        if (inputBufRef.current.length > 0) {
          inputBufRef.current = '';
          setInputBuf('');
          setIsAmbiguous(false);
        } else {
          backToSetup();
        }
        return;
      }

      if (k === 'e') {
        setShowAlternatives(prev => !prev);
        return;
      }

      if (k === 'g' || k === 'ArrowLeft') {
        handleUndo();
        return;
      }

      if (k === 'Backspace') {
        if (inputBufRef.current.length > 0) {
          const next = inputBufRef.current.slice(0, -1);
          inputBufRef.current = next;
          setInputBuf(next);
        }
        return;
      }

      // Only accept piece/move input on player's turn
      if (!isPlayerTurn) return;

      const buf = inputBufRef.current;

      if (buf.length === 0) {
        if (k in PIECE_FROM_KEY) {
          inputBufRef.current = k;
          setInputBuf(k);
          setIsAmbiguous(false);
        }
        return;
      }

      if (buf.length === 1) {
        if (k in FILE_FROM_KEY) {
          const next = buf + k;
          inputBufRef.current = next;
          setInputBuf(next);
        }
        return;
      }

      if (buf.length === 2) {
        if (k in RANK_FROM_KEY) {
          const next = buf + k;
          // Try 3-key move
          const result = findMove(next, chessRef.current);
          if (result === 'ambiguous') {
            inputBufRef.current = '';
            setInputBuf('');
            setIsAmbiguous(true);
            playSound(false);
            speak('Ambiguous. Retry with source square.');
          } else if (result === null) {
            inputBufRef.current = '';
            setInputBuf('');
            setIsAmbiguous(false);
            playSound(false);
          } else {
            inputBufRef.current = '';
            setInputBuf('');
            setIsAmbiguous(false);
            applyPlayerMove(result);
          }
        }
        return;
      }

      // buf.length === 3 means we're collecting 4th key for disambiguation
      if (buf.length === 3) {
        if (k in RANK_FROM_KEY) {
          const next = buf + k;
          const result = findMove(next, chessRef.current);
          if (result === null || result === 'ambiguous') {
            inputBufRef.current = '';
            setInputBuf('');
            setIsAmbiguous(false);
            playSound(false);
          } else {
            inputBufRef.current = '';
            setInputBuf('');
            setIsAmbiguous(false);
            applyPlayerMove(result);
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [phase, isPlayerTurn, applyPlayerMove, handleUndo, backToSetup]);

  // ── Alternatives data ──────────────────────────────────────────────────────
  const lastEntry      = history.length > 0 ? history[history.length - 1] : null;
  const altMoves       = lastEntry?.explorerData ?? null;
  const altTotal       = altMoves
    ? altMoves.reduce((s, m) => s + m.white + m.draws + m.black, 0)
    : 0;
  const sortedAltMoves = altMoves
    ? [...altMoves].sort((a, b) => (b.white + b.draws + b.black) - (a.white + a.draws + a.black))
    : [];
  const highlightSan   = lastEntry?.san ?? null;

  // ── Status line ───────────────────────────────────────────────────────────
  const isOutOfBook = explorerData !== null && explorerData.length === 0 && !explorerLoading;
  let statusText = '';
  if (chessRef.current.isGameOver()) {
    if (chessRef.current.isCheckmate())  statusText = 'Checkmate!';
    else if (chessRef.current.isStalemate()) statusText = 'Stalemate — draw';
    else statusText = 'Game over — draw';
  } else if (isAmbiguous) {
    statusText = 'Ambiguous — retry with source: [piece][source][file][rank]';
  } else if (explorerLoading) {
    statusText = 'Loading…';
  } else if (isPlayerTurn) {
    statusText = `Your turn (${playerColor === 'white' ? 'White' : 'Black'})`;
  } else if (isOutOfBook) {
    statusText = 'Out of book — playing random move';
  } else {
    statusText = 'Computer thinking…';
  }

  // ── Input display slots ───────────────────────────────────────────────────
  function slotDisplay(buf: string, i: number): string {
    const ch = buf[i];
    if (!ch) return '';
    if (i === 0) return PIECE_FROM_KEY[ch] ?? ch;
    if (i === 1) {
      // could be file or source key (in 4-key mode second key onward)
      return FILE_FROM_KEY[ch] ?? ch;
    }
    if (i === 2) return FILE_FROM_KEY[ch] ?? String(RANK_FROM_KEY[ch] ?? ch);
    if (i === 3) return String(RANK_FROM_KEY[ch] ?? ch);
    return ch;
  }

  const slotCount = inputBuf.length >= 3 ? 4 : 3;

  // ── Render: setup ─────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return <SetupPanel onStart={startPlaying} />;
  }

  // ── Render: playing ───────────────────────────────────────────────────────
  return (
    <div className="exercise-page exercise-page--wide">
      <div className="exercise-body" style={{ alignItems: 'flex-start' }}>
        {/* Left: board column */}
        <div className="board-col" ref={containerRef} style={{ width: boardMaxWidth }}>
          {/* Input buffer display */}
          <div className="cg-recall-row" aria-hidden="true" style={{ marginBottom: '0.5rem' }}>
            <span className="cg-recall-keys">
              {Array.from({ length: slotCount }, (_, i) => (
                <span
                  key={i}
                  className={`cg-recall-key${inputBuf[i] ? ' filled' : ''}`}
                >
                  {slotDisplay(inputBuf, i)}
                </span>
              ))}
            </span>
          </div>

          <div className="board-wrap">
            <Chessboard
              position={fen}
              boardWidth={boardWidth}
              arePiecesDraggable={false}
              boardOrientation={playerColor}
              animationDuration={200}
              customArrows={lastArrows}
              showBoardNotation={false}
              customDarkSquareStyle={{ backgroundColor: '#3d5a6e' }}
              customLightSquareStyle={{ backgroundColor: '#7a96a8' }}
            />
          </div>

          {/* Status */}
          <div className={`et-status${isOutOfBook ? ' et-out-of-book' : ''}`} aria-live="polite">
            {statusText}
          </div>

          {/* Legend */}
          <div className="cg-legend" style={{ marginTop: '0.4rem' }}>
            <kbd>e</kbd> = alternatives &nbsp;|&nbsp;
            <kbd>g</kbd>/<kbd>←</kbd> = undo &nbsp;|&nbsp;
            <kbd>Esc</kbd> = back to setup
          </div>
        </div>

        {/* Right panel */}
        <div className="ot-right-panel">
          {/* Controls row */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <button className="ot-reset-btn" onClick={backToSetup}>
              Setup
            </button>
            <button
              className="ot-reset-btn"
              onClick={() => startPlaying(startFen, playerColor, selectedRatings, selectedSpeeds)}
            >
              Restart
            </button>
          </div>

          {/* Move history */}
          {history.length > 0 && (
            <div className="ot-move-list" aria-label="Move history">
              {buildPgn(history)}
            </div>
          )}

          {/* Alternatives table */}
          {showAlternatives && (
            <div className="et-alternatives">
              {sortedAltMoves.length > 0 ? (
                <>
                  <div className="et-section-label" style={{ marginBottom: '0.35rem' }}>
                    {lastEntry?.byComputer ? 'Computer chose from' : 'Your alternatives'}
                    &nbsp;<span style={{ color: 'var(--muted)', fontWeight: 400 }}>
                      ({altTotal.toLocaleString()} games)
                    </span>
                  </div>
                  <table className="et-alt-table">
                    <thead>
                      <tr>
                        <th>Move</th>
                        <th>Freq</th>
                        <th title="White wins">W%</th>
                        <th title="Draws">D%</th>
                        <th title="Black wins">B%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAltMoves.map(m => {
                        const total = m.white + m.draws + m.black;
                        const freq  = altTotal > 0 ? Math.round((total / altTotal) * 100) : 0;
                        const w     = Math.round((m.white / total) * 100);
                        const d     = Math.round((m.draws / total) * 100);
                        const b     = Math.round((m.black / total) * 100);
                        const isHighlighted = m.san === highlightSan;
                        return (
                          <tr key={m.san} className={`et-alt-row${isHighlighted ? ' user-move' : ''}`}>
                            <td className="et-alt-move">{m.san}</td>
                            <td>{freq}%</td>
                            <td className="et-alt-w">{w}%</td>
                            <td className="et-alt-d">{d}%</td>
                            <td className="et-alt-b">{b}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              ) : (
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                  No data available
                </div>
              )}
            </div>
          )}

          {/* Key reference */}
          <details className="color-hint-details" style={{ marginTop: '0.75rem' }}>
            <summary>Key reference</summary>
            <div className="color-hint-body">
              <p><strong>Pieces:</strong>{' '}
                <kbd>f</kbd>=pawn &nbsp;<kbd>j</kbd>=knight &nbsp;<kbd>d</kbd>=rook &nbsp;
                <kbd>k</kbd>=bishop &nbsp;<kbd>s</kbd>=king &nbsp;<kbd>l</kbd>=queen
              </p>
              <p><strong>Files:</strong>{' '}
                <kbd>a</kbd>=a &nbsp;<kbd>s</kbd>=b &nbsp;<kbd>d</kbd>=c &nbsp;<kbd>f</kbd>=d &nbsp;
                <kbd>j</kbd>=e &nbsp;<kbd>k</kbd>=f &nbsp;<kbd>l</kbd>=g &nbsp;<kbd>;</kbd>=h
              </p>
              <p><strong>Ranks:</strong>{' '}
                <kbd>a</kbd>=1 &nbsp;<kbd>s</kbd>=2 &nbsp;<kbd>d</kbd>=3 &nbsp;<kbd>f</kbd>=4 &nbsp;
                <kbd>j</kbd>=5 &nbsp;<kbd>k</kbd>=6 &nbsp;<kbd>l</kbd>=7 &nbsp;<kbd>;</kbd>=8
              </p>
              <p><strong>Disambiguation (4 keys):</strong> piece + source file/rank + dest file + dest rank</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
