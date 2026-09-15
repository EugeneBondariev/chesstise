import { useEffect, useRef, useState } from 'react';
import { speak, stopSpeaking, playSound } from '../../utils/speechUtils';

const PIECE_FROM_KEY: Record<string, string> = { s: 'k', d: 'r', f: 'p', j: 'n', k: 'b', l: 'q' };
const FILE_FROM_KEY:  Record<string, string> = { a: 'a', s: 'b', d: 'c', f: 'd', j: 'e', k: 'f', l: 'g', ';': 'h' };
const RANK_FROM_KEY:  Record<string, number> = { a: 1, s: 2, d: 3, f: 4, j: 5, k: 6, l: 7, ';': 8 };
const ALL_PIECE_KEYS  = new Set(Object.keys(PIECE_FROM_KEY));
const FILE_RANK_KEYS  = new Set([...Object.keys(FILE_FROM_KEY), ...Object.keys(RANK_FROM_KEY)]);
const PIECE_LABEL: Record<string, string> = { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: 'P' };
const PIECE_NAME:  Record<string, string>  = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };

function parseFenBoard(fen: string): Map<string, string> {
  const m = new Map<string, string>();
  const rows = fen.split(' ')[0].split('/');
  for (let ri = 0; ri < 8; ri++) {
    const rank = 8 - ri;
    let fi = 0;
    for (const ch of rows[ri]) {
      if (/\d/.test(ch)) { fi += Number(ch); }
      else { m.set('abcdefgh'[fi] + rank, ch); fi++; }
    }
  }
  return m;
}

interface Chip {
  square: string;
  typedPiece: string;
  actual: string | null;
  correct: boolean;
  duplicate: boolean;
}

export default function PositionDrillModal({ fen, onClose }: { fen: string; onClose: () => void }) {
  const fenPieces = parseFenBoard(fen);
  const total = fenPieces.size;

  const [buf, setBuf]   = useState('');
  const [chips, setChips] = useState<Chip[]>([]);
  const [done, setDone]   = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const doneRef      = useRef(false);
  const chipsRef     = useRef<Chip[]>([]);
  chipsRef.current = chips;

  const foundSquares = new Set(chips.filter(c => c.correct).map(c => c.square));
  const correctCount = foundSquares.size;

  useEffect(() => {
    containerRef.current?.focus();
    speak('Scan the position. Piece, file, rank. Escape to finish.');
    return () => stopSpeaking();
  }, []);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    const found = new Set(chipsRef.current.filter(c => c.correct).map(c => c.square));
    const missed = [...fenPieces.entries()].filter(([sq]) => !found.has(sq));
    if (missed.length === 0) {
      speak(`Perfect. All ${total} pieces.`);
    } else {
      const str = missed
        .map(([sq, p]) => `${p === p.toUpperCase() ? 'white' : 'black'} ${PIECE_NAME[p.toLowerCase()] ?? p} ${sq}`)
        .join(', ');
      speak(`Done. Missed: ${str}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    e.stopPropagation();
    if (e.key === 'Escape') { if (!doneRef.current) finish(); else onClose(); return; }
    if (e.key === 'Enter')  { if (doneRef.current) onClose(); return; }
    if (doneRef.current) return;
    if (e.key === 'Backspace') { setBuf(b => b.slice(0, -1)); return; }

    const key = e.key;
    if (buf.length === 0 && !ALL_PIECE_KEYS.has(key)) return;
    if (buf.length >= 1  && !FILE_RANK_KEYS.has(key)) return;
    if (buf.length >= 3) return;

    const newBuf = buf + key;
    if (newBuf.length < 3) { setBuf(newBuf); return; }

    // Auto-submit on 3rd key
    const piece = PIECE_FROM_KEY[newBuf[0]];
    const file  = FILE_FROM_KEY[newBuf[1]];
    const rank  = RANK_FROM_KEY[newBuf[2]];
    if (!piece || !file || !rank) { setBuf(''); return; }

    const square   = file + String(rank);
    const actual   = fenPieces.get(square) ?? null;
    const alreadyFound = chipsRef.current.some(c => c.correct && c.square === square);
    const correct  = !alreadyFound && actual !== null && actual.toLowerCase() === piece;
    const duplicate = alreadyFound && actual !== null && actual.toLowerCase() === piece;
    playSound(correct);
    setChips(prev => [...prev, { square, typedPiece: piece, actual, correct, duplicate }]);
    setBuf('');
  }

  function slotChar(i: number): string {
    if (i >= buf.length) return '·';
    if (i === 0) return PIECE_LABEL[PIECE_FROM_KEY[buf[0]]] ?? '?';
    if (i === 1) return FILE_FROM_KEY[buf[1]] ?? '?';
    return String(RANK_FROM_KEY[buf[2]] ?? '?');
  }

  const missedEntries = done
    ? [...fenPieces.entries()].filter(([sq]) => !foundSquares.has(sq))
    : [];

  return (
    <div
      className="pos-drill-overlay"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="pos-drill-modal"
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ outline: 'none' }}
      >
        <div className="pos-drill-header">
          <span className="pos-drill-title">Position Scan</span>
          <span className="pos-drill-counter">{correctCount} / {total}</span>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        <div className="pos-drill-body">
          {!done && (
            <div className="pos-drill-input-area">
              <div className="cg-recall-keys">
                {[0, 1, 2].map(i => (
                  <span key={i} className={`cg-recall-key${buf.length > i ? ' filled' : ''}`}>
                    {slotChar(i)}
                  </span>
                ))}
              </div>
              <span className="pos-drill-hint">
                piece → file → rank · Esc to finish
              </span>
            </div>
          )}

          {chips.length > 0 && (
            <div className="pos-drill-chips">
              {chips.map((c, i) => {
                let label: string;
                if (c.correct)   label = c.actual! + c.square;
                else if (c.duplicate) label = '×' + PIECE_LABEL[c.typedPiece] + c.square;
                else label = '?' + PIECE_LABEL[c.typedPiece] + c.square;
                const cls = c.correct ? 'correct' : c.duplicate ? 'duplicate' : 'wrong';
                const tip = !c.correct
                  ? (c.actual ? `Actually: ${c.actual}${c.square}` : `${c.square} is empty`)
                  : '';
                return (
                  <span key={i} className={`pos-drill-chip ${cls}`} title={tip}>
                    {label}
                  </span>
                );
              })}
            </div>
          )}

          {done && missedEntries.length > 0 && (
            <div className="pos-drill-missed-section">
              <div className="pos-drill-missed-title">Missed ({missedEntries.length})</div>
              <div className="pos-drill-chips">
                {missedEntries.map(([sq, p]) => (
                  <span key={sq} className="pos-drill-chip missed">{p}{sq}</span>
                ))}
              </div>
            </div>
          )}

          {done && missedEntries.length === 0 && (
            <div className="pos-drill-perfect">Perfect — all {total} pieces!</div>
          )}

          {done && (
            <p className="pos-drill-done-hint">Enter or ✕ to close</p>
          )}
        </div>
      </div>
    </div>
  );
}
