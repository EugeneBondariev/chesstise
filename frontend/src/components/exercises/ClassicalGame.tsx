import { useState, useEffect, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { speak, stopSpeaking, playSound, playCongratsSound } from '../../utils/speechUtils';
import { fetchLichessEval, fetchGeminiExplain, fetchGroqIntro, fetchGroqQuestion, formatEval } from '../../api/ai';
import type { LichessEval } from '../../api/ai';
import type { ClassicalGame as GameData } from '../../data/classicalGames';
import CollapsibleBoard from '../common/CollapsibleBoard';
import { useGameStatsStore } from '../../store/gameStatsStore';
import GameStats from './GameStats';

const FILE_FROM_KEY: Record<string, string> = { a: 'a', s: 'b', d: 'c', f: 'd', j: 'e', k: 'f', l: 'g', ';': 'h' };
const RANK_FROM_KEY: Record<string, number>  = { a: 1, s: 2, d: 3, f: 4, j: 5, k: 6, l: 7, ';': 8 };
const FILE_RANK_KEYS = new Set(Object.keys(FILE_FROM_KEY));
// piece keys: s=king, d=rook, f=pawn, j=knight, k=bishop, l=queen
const PIECE_FROM_KEY: Record<string, string> = { s: 'k', d: 'r', f: 'p', j: 'n', k: 'b', l: 'q' };
const ALL_PIECE_KEYS = new Set(Object.keys(PIECE_FROM_KEY));

interface PositionData {
  fens:   string[];
  arrows: ([Square, Square] | null)[];
}

function buildPositions(moves: string[]): PositionData {
  const chess = new Chess();
  const fens:   string[]                   = [chess.fen()];
  const arrows: ([Square, Square] | null)[] = [null];
  for (const san of moves) {
    try {
      const m = chess.move(san);
      fens.push(chess.fen());
      arrows.push(m ? [m.from as Square, m.to as Square] : null);
    } catch { break; }
  }
  return { fens, arrows };
}

function buildPgn(moves: string[]): string {
  return moves.map((m, i) =>
    i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${m}` : m,
  ).join(' ');
}

type MoveClass = 'inaccuracy' | 'mistake' | 'blunder';
const CLASS_ICON:  Record<MoveClass, string> = { inaccuracy: '?!', mistake: '?', blunder: '??' };

function classifyMove(before: LichessEval, after: LichessEval, moveIndex: number): MoveClass | null {
  const side = moveIndex % 2 === 0 ? 1 : -1;
  if (after.mate !== null) {
    const opponentHasMate = side === 1 ? after.mate < 0 : after.mate > 0;
    if (opponentHasMate) {
      const alreadyLost = before.mate !== null && (side === 1 ? before.mate < 0 : before.mate > 0);
      return alreadyLost ? null : 'blunder';
    }
    return null;
  }
  if (before.cp === null || after.cp === null || before.mate !== null) return null;
  const cpLoss = side * (before.cp - after.cp);
  if (cpLoss >= 300) return 'blunder';
  if (cpLoss >= 100) return 'mistake';
  if (cpLoss >= 50)  return 'inaccuracy';
  return null;
}

const PIECE_NAMES: Record<string, string> = { R: 'Rook', N: 'Knight', B: 'Bishop', Q: 'Queen', K: 'King' };

function spokenMove(san: string): string {
  if (san === 'O-O-O' || san === '0-0-0') return 'long castling';
  if (san === 'O-O'   || san === '0-0')   return 'short castling';
  const suffix = san.endsWith('#') ? ' checkmate' : san.endsWith('+') ? ' check' : '';
  const s = san.replace(/[+#]$/, '');
  if (/^[a-h]/.test(s)) {
    if (s.includes('x')) {
      const [from, rest] = s.split('x');
      const to = rest.replace(/=[RNBQ]/, '');
      const promo = rest.match(/=([RNBQ])/);
      return `${from} takes ${to}${promo ? ` promotes to ${PIECE_NAMES[promo[1]]}` : ''}${suffix}`;
    }
    const promo = s.match(/=([RNBQ])$/);
    if (promo) return `${s.replace(/=.*$/, '')} promotes to ${PIECE_NAMES[promo[1]]}${suffix}`;
    return `${s}${suffix}`;
  }
  const piece = PIECE_NAMES[s[0]] ?? s[0];
  const rest  = s.slice(1);
  if (rest.includes('x')) {
    const xIdx = rest.indexOf('x');
    const dis  = rest.slice(0, xIdx);
    const dest = rest.slice(xIdx + 1);
    return `${piece}${dis ? ' ' + dis : ''} takes ${dest}${suffix}`;
  }
  const dest = rest.slice(-2);
  const dis  = rest.slice(0, -2);
  return `${piece}${dis ? ' ' + dis : ''} to ${dest}${suffix}`;
}

// Convert SAN to "piece-char + destination-square" for comparison with decoded 3-key input.
// Captures and disambiguation are stripped; castling is mapped to king's destination square.
function sanToComparableKey(san: string, plyIndex: number): string {
  if (san === 'O-O'   || san === '0-0')   return plyIndex % 2 === 0 ? 'kg1' : 'kg8';
  if (san === 'O-O-O' || san === '0-0-0') return plyIndex % 2 === 0 ? 'kc1' : 'kc8';
  const s = san.replace(/[+#!?]/g, '');
  const pieceChar = /^[RNBQK]/.test(s) ? s[0].toLowerCase() : 'p';
  const dest = s.match(/([a-h][1-8])(?:=[RNBQ])?$/)?.[1] ?? '';
  return pieceChar + dest;
}

// Decode 3 raw keystroke chars (piece + file + rank) → "piece-char + destination-square"
function decodeThreeKeys(buf: string): string | null {
  if (buf.length !== 3) return null;
  const piece = PIECE_FROM_KEY[buf[0]];
  const file  = FILE_FROM_KEY[buf[1]];
  const rank  = RANK_FROM_KEY[buf[2]];
  if (!piece || !file || !rank) return null;
  return piece + file + rank;
}

// Convert the raw 3-key buffer into human-readable chess notation, slot by slot
function bufferSlotDisplay(buf: string, slot: 0 | 1 | 2): string {
  if (slot >= buf.length) return '·';
  if (slot === 0) {
    const p = PIECE_FROM_KEY[buf[0]];
    return p ? (p === 'p' ? 'P' : p.toUpperCase()) : '?';
  }
  if (slot === 1) return FILE_FROM_KEY[buf[1]] ?? '?';
  return String(RANK_FROM_KEY[buf[2]] ?? '?');
}

interface Commentary {
  lichess: LichessEval | null;
  gemini: string | null;
  loading: boolean;
}

export default function ClassicalGame({ game }: { game: GameData }) {
  const { fens, arrows: preArrows } = useMemo(() => buildPositions(game.moves), [game]);
  const [plyIdx,              setPlyIdx]             = useState(0);
  const [commentary,          setCommentary]         = useState<Commentary | null>(null);
  const [boardExpanded,       setBoardExpanded]      = useState(true);
  const [moveClassifications, setMoveClassifications] = useState<Record<number, MoveClass>>({});
  const [positionEvals,       setPositionEvals]      = useState<(LichessEval | null)[]>([]);

  const [customQ,        setCustomQ]       = useState('');
  const [boardWidth,     setBoardWidth]    = useState(() => Math.min(360, window.innerWidth - 32));
  const [highlightedSquare, setHighlightedSquare] = useState<Square | null>(null);
  const [recallMode,     setRecallMode]    = useState(false);
  const [recallPending,  setRecallPending] = useState(false);
  const [recallBuffer,   setRecallBuffer]  = useState('');
  const [recallAttempts, setRecallAttempts] = useState(0);
  const lastSpokenRef      = useRef('');
  const prevQRef           = useRef('');
  const keyHandlerRef      = useRef<((e: KeyboardEvent) => void) | null>(null);
  const questionInputRef   = useRef<HTMLInputElement>(null);
  const boardContainerRef  = useRef<HTMLDivElement>(null);
  const highlightBufferRef = useRef('');
  const highlightTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentReplayIdRef = useRef<string | null>(null);
  const moveStartTimeRef   = useRef<number | null>(null);
  const recallBufferRef    = useRef('');

  const startReplay  = useGameStatsStore(s => s.startReplay);
  const recordMove   = useGameStatsStore(s => s.recordMove);
  const finishReplay = useGameStatsStore(s => s.finishReplay);

  useEffect(() => {
    const el = boardContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setBoardWidth(Math.min(360, Math.floor(entry.contentRect.width)));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (currentReplayIdRef.current) {
        finishReplay(currentReplayIdRef.current);
        currentReplayIdRef.current = null;
      }
    };
  }, [finishReplay]);

  const currentFen = fens[Math.min(plyIdx, fens.length - 1)];
  const isGameOver = plyIdx >= game.moves.length;

  function say(text: string) {
    lastSpokenRef.current = text;
    speak(text);
  }

  useEffect(() => {
    if (currentReplayIdRef.current) {
      finishReplay(currentReplayIdRef.current);
      currentReplayIdRef.current = null;
    }
    setPlyIdx(0);
    setCommentary(null);
    setMoveClassifications({});
    setPositionEvals([]);
    setHighlightedSquare(null);
    setRecallPending(false);
    recallBufferRef.current = '';
    setRecallBuffer('');
    setRecallAttempts(0);
    highlightBufferRef.current = '';
    if (highlightTimerRef.current) { clearTimeout(highlightTimerRef.current); highlightTimerRef.current = null; }
    say(`${game.white} versus ${game.black}. Press J to advance moves, A or Space for commentary.`);

    let cancelled = false;
    const evals: (LichessEval | null)[] = [];

    (async () => {
      for (let i = 0; i < fens.length && !cancelled; i++) {
        const ev = await fetchLichessEval(fens[i]);
        evals[i] = ev;
        setPositionEvals(prev => { const next = [...prev]; next[i] = ev; return next; });
        if (i > 0 && evals[i - 1] && evals[i]) {
          const cls = classifyMove(evals[i - 1]!, evals[i]!, i - 1);
          if (cls) setMoveClassifications(prev => ({ ...prev, [i - 1]: cls }));
        }
        if (i < fens.length - 1) await new Promise<void>(r => setTimeout(r, 50));
      }
    })();

    return () => { cancelled = true; };
  }, [game]); // eslint-disable-line react-hooks/exhaustive-deps

  function advanceWithSpeech(idx: number) {
    const cls = moveClassifications[idx];
    say(spokenMove(game.moves[idx]) + (cls ? `, ${cls}` : ''));
    setPlyIdx(idx + 1);
    setCommentary(null);
  }

  function enterMemorize() {
    stopSpeaking();
    if (currentReplayIdRef.current) finishReplay(currentReplayIdRef.current);
    currentReplayIdRef.current = startReplay(game.id, game.moves.length);
    moveStartTimeRef.current = Date.now();
    setRecallMode(true);
    setPlyIdx(0);
    setRecallPending(true);
    recallBufferRef.current = '';
    setRecallBuffer('');
    setRecallAttempts(0);
    setCommentary(null);
  }

  function exitMemorize() {
    stopSpeaking();
    setRecallMode(false);
    setRecallPending(false);
    recallBufferRef.current = '';
    setRecallBuffer('');
    if (currentReplayIdRef.current) {
      finishReplay(currentReplayIdRef.current);
      currentReplayIdRef.current = null;
    }
  }

  function handleJ() {
    if (plyIdx >= game.moves.length) { say(`End of game. ${game.result}.`); return; }
    if (recallMode) {
      if (!currentReplayIdRef.current) {
        currentReplayIdRef.current = startReplay(game.id, game.moves.length);
      }
      moveStartTimeRef.current = Date.now();
      const moveNum = Math.ceil((plyIdx + 1) / 2);
      const side = plyIdx % 2 === 0 ? 'White' : 'Black';
      say(`${side}, move ${moveNum}`);
      setRecallPending(true);
      recallBufferRef.current = '';
      setRecallBuffer('');
      setRecallAttempts(0);
      return;
    }
    advanceWithSpeech(plyIdx);
  }

  function handleF() {
    if (recallPending) {
      recallBufferRef.current = '';
      setRecallBuffer('');
      setRecallPending(false);
      return;
    }
    if (plyIdx > 0) {
      const prevIdx = plyIdx - 1;
      setPlyIdx(prevIdx);
      setCommentary(null);
      say(prevIdx === 0 ? 'Starting position.' : `Back to move ${prevIdx}: ${spokenMove(game.moves[prevIdx - 1])}.`);
    } else {
      say('Already at the start.');
    }
  }

  function handleRecallSubmitBuffer(buf: string) {
    if (!recallPending || plyIdx >= game.moves.length) return;
    const decoded = decodeThreeKeys(buf);
    if (!decoded) {
      playSound(false);
      return;
    }
    const correct = decoded === sanToComparableKey(game.moves[plyIdx], plyIdx);
    if (!correct) {
      playSound(false);
      setRecallAttempts(a => a + 1);
      return;
    }
    const timeMs = moveStartTimeRef.current != null ? Date.now() - moveStartTimeRef.current : 0;
    if (currentReplayIdRef.current) {
      recordMove(currentReplayIdRef.current, plyIdx, { attempts: recallAttempts + 1, timeMs });
    }
    const nextPly = plyIdx + 1;
    setPlyIdx(nextPly);
    setCommentary(null);
    if (nextPly >= game.moves.length) {
      setRecallPending(false);
      setRecallAttempts(0);
      if (currentReplayIdRef.current) { finishReplay(currentReplayIdRef.current); currentReplayIdRef.current = null; }
      playCongratsSound();
    } else {
      recallBufferRef.current = '';
      setRecallBuffer('');
      setRecallAttempts(0);
      moveStartTimeRef.current = Date.now();
      playSound(true);
    }
  }

  function handleRecallSkip() {
    if (!recallPending || plyIdx >= game.moves.length) return;
    playSound(false);
    const timeMs = moveStartTimeRef.current != null ? Date.now() - moveStartTimeRef.current : 0;
    if (currentReplayIdRef.current) {
      recordMove(currentReplayIdRef.current, plyIdx, { attempts: 0, timeMs });
    }
    const nextPly = plyIdx + 1;
    setPlyIdx(nextPly);
    setCommentary(null);
    if (nextPly >= game.moves.length) {
      setRecallPending(false);
      setRecallAttempts(0);
      if (currentReplayIdRef.current) { finishReplay(currentReplayIdRef.current); currentReplayIdRef.current = null; }
    } else {
      recallBufferRef.current = '';
      setRecallBuffer('');
      setRecallAttempts(0);
      moveStartTimeRef.current = Date.now();
    }
  }

  function handleJumpTo(targetPlyIdx: number) {
    if (currentReplayIdRef.current) {
      finishReplay(currentReplayIdRef.current);
    }
    currentReplayIdRef.current = startReplay(game.id, game.moves.length);
    moveStartTimeRef.current = Date.now();
    setPlyIdx(targetPlyIdx);
    setRecallMode(true);
    setRecallPending(true);
    recallBufferRef.current = '';
    setRecallBuffer('');
    setRecallAttempts(0);
    const moveNum = Math.ceil((targetPlyIdx + 1) / 2);
    const side = targetPlyIdx % 2 === 0 ? 'White' : 'Black';
    say(`${side}, move ${moveNum}`);
  }

  function handleK() {
    if (commentary?.loading) return;
    setCommentary({ lichess: null, gemini: null, loading: true });

    const fen      = currentFen;
    const pgn      = buildPgn(game.moves.slice(Math.max(0, plyIdx - 15), plyIdx));
    const lastMove = plyIdx > 0 ? game.moves[plyIdx - 1] : null;

    const evBefore = plyIdx > 0 ? (positionEvals[plyIdx - 1] ?? null) : null;
    const evAfter  = positionEvals[plyIdx] ?? null;
    const evalHint = (evBefore && evAfter)
      ? `${formatEval(evBefore)} → ${formatEval(evAfter)}`
      : null;

    const groqPromise = lastMove
      ? fetchGeminiExplain(fen, pgn, lastMove, evalHint)
      : fetchGroqIntro(game.white, game.black, game.year ?? null, game.event ?? null);

    Promise.all([fetchLichessEval(fen), groqPromise])
      .then(([lichess, gemini]) => {
        setCommentary({ lichess, gemini, loading: false });
        const parts: string[] = [];
        if (lichess) parts.push(`${formatEval(lichess)}.`);
        if (gemini)  parts.push(gemini);
        say(parts.join(' ') || 'No commentary available.');
      })
      .catch(() => {
        setCommentary({ lichess: null, gemini: null, loading: false });
        say('Commentary unavailable.');
      });
  }

  function handleAskQuestion() {
    const q = customQ.trim();
    if (!q || commentary?.loading) return;
    setCustomQ('');
    questionInputRef.current?.blur();
    setCommentary({ lichess: null, gemini: null, loading: true });
    const fen = currentFen;
    const pgn = buildPgn(game.moves.slice(Math.max(0, plyIdx - 15), plyIdx));
    fetchGroqQuestion(fen, pgn, q)
      .then(gemini => {
        setCommentary({ lichess: null, gemini, loading: false });
        if (gemini) say(gemini);
        else say('AI backend not connected.');
      })
      .catch(() => {
        setCommentary({ lichess: null, gemini: null, loading: false });
        say('Question failed.');
      });
  }

  keyHandlerRef.current = (e: KeyboardEvent) => {
    const active = document.activeElement as HTMLElement | null;
    if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return;
    const { key } = e;

    if (key === 'Control') { highlightBufferRef.current = ''; stopSpeaking(); return; }

    if (key === 'm') {
      e.preventDefault();
      if (!recallMode) enterMemorize(); else exitMemorize();
      return;
    }

    // Recall key capture — must come before navigation keys so they don't interfere
    if (recallPending) {
      if (key === 'Escape') { e.preventDefault(); handleRecallSkip(); return; }
      if (key === 'Backspace' && recallBufferRef.current.length > 0) {
        e.preventDefault();
        recallBufferRef.current = recallBufferRef.current.slice(0, -1);
        setRecallBuffer(recallBufferRef.current);
        return;
      }
      const bufLen = recallBufferRef.current.length;
      const validKey = bufLen === 0 ? ALL_PIECE_KEYS.has(key) : FILE_RANK_KEYS.has(key);
      if (validKey) {
        e.preventDefault();
        recallBufferRef.current += key;
        setRecallBuffer(recallBufferRef.current);
        if (recallBufferRef.current.length === 3) {
          const buf = recallBufferRef.current;
          recallBufferRef.current = '';
          setRecallBuffer('');
          handleRecallSubmitBuffer(buf);
        }
      }
      return;
    }

    if (key === 'ArrowLeft'  || key === 'g') { highlightBufferRef.current = ''; e.preventDefault(); handleF(); return; }
    if (key === 'ArrowRight' || key === 'h') { highlightBufferRef.current = ''; e.preventDefault(); handleJ(); return; }
    if (key === 'ArrowDown')  { highlightBufferRef.current = ''; e.preventDefault(); handleK(); return; }
    if (key === 'ArrowUp')    { highlightBufferRef.current = ''; e.preventDefault(); questionInputRef.current?.focus(); return; }
    if (key === 'r')          { highlightBufferRef.current = ''; e.preventDefault(); speak(lastSpokenRef.current); return; }
    if (e.code === 'Numpad0')       { e.preventDefault(); setBoardExpanded(b => !b); return; }
    if (e.code === 'NumpadDecimal') { e.preventDefault(); speak(lastSpokenRef.current); return; }

    if (FILE_RANK_KEYS.has(key)) {
      e.preventDefault();
      highlightBufferRef.current += key;
      if (highlightBufferRef.current.length === 2) {
        const file = FILE_FROM_KEY[highlightBufferRef.current[0]];
        const rank = RANK_FROM_KEY[highlightBufferRef.current[1]];
        highlightBufferRef.current = '';
        if (highlightTimerRef.current) { clearTimeout(highlightTimerRef.current); highlightTimerRef.current = null; }
        if (file && rank) {
          const sq = `${file}${rank}` as Square;
          setHighlightedSquare(sq);
          speak(`${file} ${rank}`);
          highlightTimerRef.current = setTimeout(() => setHighlightedSquare(null), 3000);
        }
      }
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyHandlerRef.current?.(e);
    document.addEventListener('keydown', handler, { capture: true });
    return () => document.removeEventListener('keydown', handler, { capture: true });
  }, []);

  const arrows: [Square, Square][] = preArrows[plyIdx] ? [preArrows[plyIdx] as [Square, Square]] : [];

  const posLabel = plyIdx === 0
    ? 'Starting position'
    : `After move ${plyIdx}: ${game.moves[plyIdx - 1]}`;

  return (
    <div className="exercise-page">
      <h1 className="exercise-title">
        {game.white} vs {game.black}
        {game.year  ? ` (${game.year})`  : ''}
        {game.event ? ` · ${game.event}` : ''}
        {' '}— {game.result}
      </h1>

      <div className="exercise-body">
        <div className="board-col">
          <div className="prompt-card" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{posLabel}</span>
            <button
              className={`cg-recall-toggle${recallMode ? ' active' : ''}`}
              onClick={() => recallMode ? exitMemorize() : enterMemorize()}
              title="Toggle memorize mode (m)"
            >
              {recallMode ? '🎯 Memorize' : 'Memorize'}
            </button>
            <span className="round-counter">{plyIdx} / {game.moves.length}</span>
          </div>

          {recallPending && (
            <div className="cg-recall-row">
              <span className="cg-recall-keys">
                {([0, 1, 2] as const).map(i => (
                  <span key={i} className={`cg-recall-key${recallBuffer[i] ? ' filled' : ''}`}>
                    {bufferSlotDisplay(recallBuffer, i)}
                  </span>
                ))}
              </span>
              <button className="cg-recall-btn cg-recall-skip" onClick={handleRecallSkip}>Skip</button>
            </div>
          )}

          <div ref={boardContainerRef} style={{ width: '100%' }}>
            {!recallMode && (
              <CollapsibleBoard isExpanded={boardExpanded} onToggle={() => setBoardExpanded(b => !b)}>
                <Chessboard
                  position={currentFen}
                  boardWidth={boardWidth}
                  arePiecesDraggable={false}
                  customArrows={arrows}
                  animationDuration={200}
                  showBoardNotation={false}
                  customDarkSquareStyle={{ backgroundColor: '#3d5a6e' }}
                  customLightSquareStyle={{ backgroundColor: '#7a96a8' }}
                  customSquareStyles={highlightedSquare ? { [highlightedSquare]: { backgroundColor: '#e8c240' } } : {}}
                />
              </CollapsibleBoard>
            )}
          </div>

          <div className="prompt-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
            {isGameOver && <span>Game over — {game.result}</span>}

            {commentary?.loading && (
              <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Fetching commentary…</span>
            )}

            {commentary && !commentary.loading && (
              <>
                {commentary.lichess && (
                  <span><strong>{formatEval(commentary.lichess)}</strong></span>
                )}
                {commentary.gemini && (
                  <p style={{ margin: 0, lineHeight: 1.55, fontSize: '0.88rem' }}>
                    {commentary.gemini}
                  </p>
                )}
              </>
            )}


          </div>

          {!recallMode && <div className="cg-pgn">
            {Array.from({ length: Math.ceil(game.moves.length / 2) }, (_, pair) => {
              const wi = pair * 2;
              const bi = pair * 2 + 1;
              const jumpTo = (idx: number) => {
                const cls = moveClassifications[idx];
                setPlyIdx(idx + 1);
                setBoardExpanded(true);
                setCommentary(null);
                say(spokenMove(game.moves[idx]) + (cls ? `, ${cls}` : ''));
              };
              const wCls = moveClassifications[wi];
              const bCls = game.moves[bi] !== undefined ? moveClassifications[bi] : undefined;
              return (
                <div key={pair} className="cg-pgn-pair">
                  <span className="cg-pgn-num">{pair + 1}.</span>
                  <span
                    className={`cg-pgn-move cg-pgn-move-btn${wi === plyIdx - 1 ? ' current' : ''}`}
                    onClick={() => jumpTo(wi)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && jumpTo(wi)}
                  >
                    {game.moves[wi]}{wCls && <span className={`cg-move-cls cg-move-${wCls}`}>{CLASS_ICON[wCls]}</span>}
                  </span>
                  {game.moves[bi] !== undefined && (
                    <span
                      className={`cg-pgn-move cg-pgn-move-btn${bi === plyIdx - 1 ? ' current' : ''}`}
                      onClick={() => jumpTo(bi)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && jumpTo(bi)}
                    >
                      {game.moves[bi]}{bCls && <span className={`cg-move-cls cg-move-${bCls}`}>{CLASS_ICON[bCls]}</span>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>}

          <div className="cg-question">
            <input
              ref={questionInputRef}
              className="cg-question-input"
              type="text"
              placeholder="Ask a question about this position… (↑ to focus, Enter to send)"
              value={customQ}
              onChange={e => {
                const newVal = e.target.value;
                // Speak each word as it's completed (space typed)
                if (newVal.endsWith(' ') && !prevQRef.current.endsWith(' ')) {
                  const words = newVal.trim().split(/\s+/);
                  const lastWord = words[words.length - 1];
                  if (lastWord) speak(lastWord);
                }
                prevQRef.current = newVal;
                setCustomQ(newVal);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const q = customQ.trim();
                  if (q) say(q);
                  handleAskQuestion();
                }
                if (e.key === 'Escape') { questionInputRef.current?.blur(); }
              }}
            />
          </div>

          <div className="cg-mobile-bar">
            <button className="cg-mob-btn" onClick={handleF} aria-label="Back">← Back</button>
            <button className="cg-mob-btn" onClick={handleJ} aria-label="Next move">Next →</button>
            <button className="cg-mob-btn" onClick={handleK} aria-label="Commentary">💬</button>
            <button className="cg-mob-btn" onClick={() => questionInputRef.current?.focus()} aria-label="Ask question">❓ Ask</button>
            <button className="cg-mob-btn" onClick={() => speak(lastSpokenRef.current)} aria-label="Re-read">↺</button>
          </div>

          <div className="cg-legend">
            g/← = back | h/→ = next | m = memorize | ↓ = commentary | ↑ = ask | r = re-read | Ctrl = stop | Calc 0 = board | [file][rank] = highlight
            {recallMode && ' | memorize: [piece][file][rank] — s=K d=R f=P j=N k=B l=Q | Esc=skip'}
          </div>

          <GameStats game={game} onJumpTo={handleJumpTo} />
        </div>
      </div>
    </div>
  );
}
