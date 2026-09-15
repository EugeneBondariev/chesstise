import { useState, useEffect, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import CollapsibleBoard from '../common/CollapsibleBoard';
import PositionDrillModal from './PositionDrillModal';
import { speak, stopSpeaking, playSound, playAlertSound } from '../../utils/speechUtils';
import { useProfileStore } from '../../store/profileStore';
import { useGameStatsStore } from '../../store/gameStatsStore';
import type { E1Chapter } from '../../data/e1Corpus';
import type { MoveRecord } from '../../store/gameStatsStore';

const FILE_FROM_KEY: Record<string, string> = { a: 'a', s: 'b', d: 'c', f: 'd', j: 'e', k: 'f', l: 'g', ';': 'h' };
const RANK_FROM_KEY: Record<string, number>  = { a: 1, s: 2, d: 3, f: 4, j: 5, k: 6, l: 7, ';': 8 };
const PIECE_FROM_KEY: Record<string, string> = { s: 'k', d: 'r', f: 'p', j: 'n', k: 'b', l: 'q' };
const ALL_PIECE_KEYS  = new Set(Object.keys(PIECE_FROM_KEY));
const FILE_RANK_KEYS  = new Set([...Object.keys(FILE_FROM_KEY), ...Object.keys(RANK_FROM_KEY)]);

const PIECE_NAMES: Record<string, string> = { R: 'Rook', N: 'Knight', B: 'Bishop', Q: 'Queen', K: 'King' };

function spokenMove(san: string): string {
  if (san === 'O-O-O' || san === '0-0-0') return 'long castling';
  if (san === 'O-O'   || san === '0-0')   return 'short castling';
  const suffix = san.endsWith('#') ? ' checkmate' : san.endsWith('+') ? ' check' : '';
  const s = san.replace(/[+#!?]/g, '');
  if (/^[a-h]/.test(s)) {
    if (s.includes('x')) {
      const [from, rest] = s.split('x');
      const promo = rest.match(/=([RNBQ])/);
      return `${from} takes ${rest.replace(/=[RNBQ]/,'')}${promo ? ` promotes to ${PIECE_NAMES[promo[1]]}` : ''}${suffix}`;
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
    return `${piece}${dis ? ' ' + dis : ''} takes ${rest.slice(xIdx + 1)}${suffix}`;
  }
  const dest = rest.slice(-2);
  const dis  = rest.slice(0, -2);
  return `${piece}${dis ? ' ' + dis : ''} to ${dest}${suffix}`;
}

type DisambigType = 'file' | 'rank' | null;

function moveInfo(san: string, plyIndex: number): { compareKey: string; disambigType: DisambigType } {
  if (san === 'O-O'   || san === '0-0')   return { compareKey: plyIndex % 2 === 0 ? 'kg1' : 'kg8', disambigType: null };
  if (san === 'O-O-O' || san === '0-0-0') return { compareKey: plyIndex % 2 === 0 ? 'kc1' : 'kc8', disambigType: null };
  const s = san.replace(/[+#!?]/g, '');
  const pieceChar = /^[RNBQK]/.test(s) ? s[0].toLowerCase() : 'p';
  const dest = s.match(/([a-h][1-8])(?:=[RNBQ])?$/)?.[1] ?? '';
  if (pieceChar === 'p') return { compareKey: 'p' + dest, disambigType: null };
  const inner = s.slice(1).replace('x', '').replace(dest, '');
  const fileD = inner.match(/[a-h]/)?.[0] ?? '';
  const rankD = inner.match(/[1-8]/)?.[0] ?? '';
  if (fileD) return { compareKey: pieceChar + fileD + dest, disambigType: 'file' };
  if (rankD) return { compareKey: pieceChar + rankD + dest, disambigType: 'rank' };
  return { compareKey: pieceChar + dest, disambigType: null };
}

function decodeInputKeys(buf: string, disambigType: DisambigType): string | null {
  const piece = PIECE_FROM_KEY[buf[0]];
  if (!piece) return null;
  if (disambigType === null) {
    if (buf.length !== 3) return null;
    const file = FILE_FROM_KEY[buf[1]];
    const rank = RANK_FROM_KEY[buf[2]];
    if (!file || !rank) return null;
    return piece + file + rank;
  }
  if (buf.length !== 4) return null;
  const src = disambigType === 'file'
    ? FILE_FROM_KEY[buf[1]]
    : (RANK_FROM_KEY[buf[1]] ? String(RANK_FROM_KEY[buf[1]]) : null);
  const destFile = FILE_FROM_KEY[buf[2]];
  const destRank = RANK_FROM_KEY[buf[3]];
  if (!src || !destFile || !destRank) return null;
  return piece + src + destFile + destRank;
}

function bufferSlotDisplay(buf: string, slot: number, disambigType: DisambigType): string {
  if (slot >= buf.length) return '·';
  if (slot === 0) { const p = PIECE_FROM_KEY[buf[0]]; return p ? (p === 'p' ? 'P' : p.toUpperCase()) : '?'; }
  if (disambigType !== null) {
    if (slot === 1) return disambigType === 'file' ? (FILE_FROM_KEY[buf[1]] ?? '?') : String(RANK_FROM_KEY[buf[1]] ?? '?');
    if (slot === 2) return FILE_FROM_KEY[buf[2]] ?? '?';
    return String(RANK_FROM_KEY[buf[3]] ?? '?');
  }
  if (slot === 1) return FILE_FROM_KEY[buf[1]] ?? '?';
  return String(RANK_FROM_KEY[buf[2]] ?? '?');
}

interface PositionData { fens: string[]; arrows: ([Square, Square] | null)[]; }

function buildPositions(startFen: string, sans: string[]): PositionData {
  const chess = new Chess(startFen);
  const fens:   string[]                    = [chess.fen()];
  const arrows: ([Square, Square] | null)[] = [null];
  for (const san of sans) {
    try {
      const m = chess.move(san);
      fens.push(chess.fen());
      arrows.push(m ? [m.from as Square, m.to as Square] : null);
    } catch { break; }
  }
  return { fens, arrows };
}

export default function E1ChapterReplay({ chapter }: { chapter: E1Chapter }) {
  const sans = useMemo(() => chapter.moves.map(m => m.san), [chapter]);
  const { fens, arrows } = useMemo(() => buildPositions(chapter.fen, sans), [chapter.fen, sans]);

  const [plyIdx,          setPlyIdx]         = useState(0);
  const [recallBuffer,    setRecallBuffer]    = useState('');
  const [recallPending,   setRecallPending]   = useState(true);
  const [recallAttempts,  setRecallAttempts]  = useState(0);
  const [isPlaying,       setIsPlaying]       = useState(false);
  const [positionDrillOpen, setPositionDrillOpen] = useState(false);
  const [boardWidth,      setBoardWidth]      = useState(() => Math.min(360, window.innerWidth - 32));

  const boardContainerRef    = useRef<HTMLDivElement>(null);
  const recallBufferRef      = useRef('');
  const isPlayingRef         = useRef(false);
  const lastInteractionRef   = useRef(Date.now());
  const lastSpokenRef        = useRef('');
  const currentReplayIdRef   = useRef<string | null>(null);

  const autoAdvanceMs     = useProfileStore(s => s.autoAdvanceMs);
  const noveltyMultiplier = useProfileStore(s => s.noveltyMultiplier);
  const logRead           = useProfileStore(s => s.logRead);
  const startReplay       = useGameStatsStore(s => s.startReplay);
  const recordMove        = useGameStatsStore(s => s.recordMove);
  const finishReplay      = useGameStatsStore(s => s.finishReplay);

  // board resize observer
  useEffect(() => {
    const el = boardContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setBoardWidth(Math.min(360, Math.floor(e.contentRect.width))));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // reset when chapter changes
  useEffect(() => {
    stopSpeaking();
    if (currentReplayIdRef.current) { finishReplay(currentReplayIdRef.current); currentReplayIdRef.current = null; }
    setPlyIdx(0);
    setRecallBuffer(''); recallBufferRef.current = '';
    setRecallAttempts(0);
    setIsPlaying(false);
    setRecallPending(true);
    currentReplayIdRef.current = startReplay(chapter.id, chapter.moves.length);
    const intro = chapter.intro ? chapter.intro + '. ' : '';
    speak(`${intro}Press Space to listen, or type the first move.`);
  }, [chapter]); // eslint-disable-line react-hooks/exhaustive-deps

  // cleanup on unmount
  useEffect(() => () => {
    if (currentReplayIdRef.current) { finishReplay(currentReplayIdRef.current); }
  }, [finishReplay]);

  // auto-advance timer
  useEffect(() => {
    if (!isPlaying) return;
    if (plyIdx >= sans.length) { setIsPlaying(false); return; }
    const id = setTimeout(() => {
      if (!isPlayingRef.current) return;
      if (Date.now() - lastInteractionRef.current > autoAdvanceMs * noveltyMultiplier) {
        setIsPlaying(false);
        playAlertSound();
        speak(lastSpokenRef.current);
        return;
      }
      advanceWithSpeech(plyIdx);
    }, autoAdvanceMs);
    return () => clearTimeout(id);
  }, [isPlaying, plyIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentFen = fens[Math.min(plyIdx, fens.length - 1)];
  const isOver = plyIdx >= sans.length;
  const currentMove = chapter.moves[plyIdx];
  const { compareKey: expectedKey, disambigType } = isOver ? { compareKey: '', disambigType: null as DisambigType } : moveInfo(sans[plyIdx], plyIdx);
  const slotCount = disambigType !== null ? 4 : 3;

  function say(text: string) { lastSpokenRef.current = text; speak(text); }

  function advanceWithSpeech(idx: number) {
    const comment = chapter.moves[idx]?.comment;
    const text = spokenMove(sans[idx]) + (comment ? '. ' + comment : '');
    say(text);
    const newIdx = idx + 1;
    setPlyIdx(newIdx);
    if (newIdx >= sans.length) {
      logRead(chapter.id);
      if (currentReplayIdRef.current) { finishReplay(currentReplayIdRef.current); currentReplayIdRef.current = null; }
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (positionDrillOpen) return;
      lastInteractionRef.current = Date.now();
      const key = e.key;

      if (key === 'p') { e.preventDefault(); setPositionDrillOpen(true); return; }

      // auto-advance with space
      if (key === ' ') {
        e.preventDefault();
        if (recallPending) { setRecallPending(false); setRecallAttempts(0); recallBufferRef.current = ''; setRecallBuffer(''); }
        if (!isOver) {
          setIsPlaying(p => {
            if (!p) { advanceWithSpeech(plyIdx); return true; }
            return false;
          });
        }
        return;
      }

      // manual advance
      if (key === 'j' || key === 'J') {
        e.preventDefault();
        setIsPlaying(false);
        if (!isOver && !recallPending) advanceWithSpeech(plyIdx);
        return;
      }

      // back
      if (key === 'ArrowLeft' || key === 'Backspace') {
        if (!recallPending && plyIdx > 0) { setPlyIdx(p => p - 1); setIsPlaying(false); }
        return;
      }

      // recall typing
      if (!recallPending || isOver) return;

      const k = key.toLowerCase();
      if (recallBufferRef.current.length === 0) {
        if (!ALL_PIECE_KEYS.has(k)) return;
        recallBufferRef.current = k;
        setRecallBuffer(k);
        return;
      }
      if (!FILE_RANK_KEYS.has(k)) return;

      const newBuf = recallBufferRef.current + k;
      recallBufferRef.current = newBuf;
      setRecallBuffer(newBuf);

      const decoded = decodeInputKeys(newBuf, disambigType);
      if (decoded === null) return;

      if (decoded === expectedKey) {
        // correct
        playSound(true);
        const record: MoveRecord = { attempts: recallAttempts === 0 ? 1 : recallAttempts + 1, timeMs: Date.now() - lastInteractionRef.current };
        recordMove(currentReplayIdRef.current!, plyIdx, record);
        setRecallAttempts(0);
        recallBufferRef.current = ''; setRecallBuffer('');
        advanceWithSpeech(plyIdx);
      } else if (newBuf.length >= slotCount) {
        // wrong — clear buffer, count attempt
        playSound(false);
        recallBufferRef.current = ''; setRecallBuffer('');
        setRecallAttempts(a => a + 1);
        say(spokenMove(sans[plyIdx]));
      }
    };

    document.addEventListener('keydown', handler, { capture: true });
    return () => document.removeEventListener('keydown', handler, { capture: true });
  }, [plyIdx, recallPending, isPlaying, isOver, expectedKey, disambigType, slotCount, positionDrillOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const arrow = arrows[Math.min(plyIdx, arrows.length - 1)];
  const customArrows = arrow ? [[arrow[0], arrow[1], 'rgba(100,180,255,0.5)']] as [Square, Square, string][] : [];

  return (
    <div className="exercise-page">
      <h1 className="exercise-title e1-chapter-title">{chapter.title}</h1>
      {chapter.intro && (
        <p className="e1-intro">{chapter.intro}</p>
      )}

      <div ref={boardContainerRef} className="cg-board-container">
        <CollapsibleBoard>
          <Chessboard
            position={currentFen}
            boardWidth={boardWidth}
            customArrows={customArrows}
            boardOrientation={chapter.fen.includes(' b ') ? 'black' : 'white'}
            isDraggablePiece={() => false}
          />
        </CollapsibleBoard>
      </div>

      <div className="cg-move-progress">
        Move {plyIdx} / {sans.length}
      </div>

      {/* Recall input display */}
      {recallPending && !isOver && (
        <div className="cg-recall-area">
          <div className="cg-recall-keys">
            {Array.from({ length: slotCount }, (_, i) => (
              <span key={i} className={`cg-recall-key${recallBuffer.length > i ? ' filled' : ''}`}>
                {bufferSlotDisplay(recallBuffer, i, disambigType)}
              </span>
            ))}
          </div>
          {recallAttempts > 0 && (
            <span className="e1-attempts">attempt {recallAttempts + 1}</span>
          )}
        </div>
      )}

      {/* Annotation for current position (next move's comment hint) */}
      {!recallPending && !isOver && currentMove?.comment && (
        <p className="e1-annotation">{currentMove.comment}</p>
      )}

      {isOver && (
        <p className="e1-complete">Chapter complete. ← to review moves.</p>
      )}

      <details className="color-hint-details" style={{ marginTop: '1.5rem' }}>
        <summary>Controls</summary>
        <div className="color-hint-body">
          <p>• <strong>Type move</strong> in recall notation (piece → file → rank)</p>
          <p>• <strong>Space</strong> — auto-advance / pause</p>
          <p>• <strong>J</strong> — step forward one move</p>
          <p>• <strong>← / Backspace</strong> — step back</p>
          <p>• <strong>P</strong> — position scan</p>
        </div>
      </details>

      {positionDrillOpen && (
        <PositionDrillModal fen={currentFen} onClose={() => setPositionDrillOpen(false)} />
      )}
    </div>
  );
}
