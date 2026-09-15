// Parses e1_raw.pgn (Lichess study h6HmRwJi) into e1Corpus.ts
// Run with: npx tsx scripts/parse-e1.ts

import * as fs from 'fs';
import * as path from 'path';

// ── PGN tokeniser ─────────────────────────────────────────────────────────────

type Token =
  | { kind: 'tag';     key: string; value: string }
  | { kind: 'comment'; text: string }
  | { kind: 'move';    san: string }
  | { kind: 'nag';     n: number }
  | { kind: 'var_open' }
  | { kind: 'var_close' }
  | { kind: 'result';  value: string };

function tokenise(pgn: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < pgn.length) {
    // whitespace
    if (/\s/.test(pgn[i])) { i++; continue; }
    // tag
    if (pgn[i] === '[') {
      const end = pgn.indexOf(']', i);
      const inside = pgn.slice(i + 1, end);
      const m = inside.match(/^(\w+)\s+"(.*)"$/s);
      if (m) tokens.push({ kind: 'tag', key: m[1], value: m[2] });
      i = end + 1; continue;
    }
    // comment
    if (pgn[i] === '{') {
      let depth = 1; let j = i + 1;
      while (j < pgn.length && depth > 0) {
        if (pgn[j] === '{') depth++;
        else if (pgn[j] === '}') depth--;
        j++;
      }
      const raw = pgn.slice(i + 1, j - 1);
      // strip [%csl ...] and [%cal ...] visual annotations
      const text = raw.replace(/\[%c[sa]l[^\]]*\]/g, '').trim();
      if (text) tokens.push({ kind: 'comment', text });
      i = j; continue;
    }
    // variation
    if (pgn[i] === '(') { tokens.push({ kind: 'var_open'  }); i++; continue; }
    if (pgn[i] === ')') { tokens.push({ kind: 'var_close' }); i++; continue; }
    // NAG
    if (pgn[i] === '$') {
      let j = i + 1;
      while (j < pgn.length && /\d/.test(pgn[j])) j++;
      tokens.push({ kind: 'nag', n: parseInt(pgn.slice(i + 1, j)) });
      i = j; continue;
    }
    // result or move number or SAN
    let j = i;
    while (j < pgn.length && !/[\s\[{($)}\]]/.test(pgn[j])) j++;
    const tok = pgn.slice(i, j);
    if (!tok) { i++; continue; }
    if (['1-0','0-1','1/2-1/2','*'].includes(tok)) {
      tokens.push({ kind: 'result', value: tok });
    } else if (/^\d+\.+$/.test(tok)) {
      // move number — skip
    } else {
      tokens.push({ kind: 'move', san: tok });
    }
    i = j;
  }
  return tokens;
}

// ── NAG → annotation symbol ───────────────────────────────────────────────────

function nagSuffix(n: number): string {
  const map: Record<number, string> = {
    1: '!', 2: '?', 3: '!!', 4: '??', 5: '!?', 6: '?!', 10: '=',
  };
  return map[n] ?? '';
}

// ── Extract main line moves + comments ───────────────────────────────────────

interface ParsedMove { san: string; comment?: string }

function extractMainLine(tokens: Token[]): { intro?: string; moves: ParsedMove[] } {
  let intro: string | undefined;
  const moves: ParsedMove[] = [];
  let depth = 0;
  let i = 0;
  // skip past tags
  while (i < tokens.length && tokens[i].kind === 'tag') i++;

  // position-level intro comment (before first move, at depth 0)
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.kind === 'comment' && depth === 0 && moves.length === 0) {
      intro = t.text; i++; continue;
    }
    if (t.kind === 'var_open')  { depth++; i++; continue; }
    if (t.kind === 'var_close') { depth--; i++; continue; }
    if (depth > 0) { i++; continue; } // skip variation content
    if (t.kind === 'result') break;
    if (t.kind === 'nag') {
      if (moves.length > 0) {
        const last = moves[moves.length - 1];
        last.san = last.san.replace(/[!?=]+$/, '') + nagSuffix(t.n);
      }
      i++; continue;
    }
    if (t.kind === 'move') {
      moves.push({ san: t.san });
      i++; continue;
    }
    if (t.kind === 'comment' && depth === 0 && moves.length > 0) {
      moves[moves.length - 1].comment = t.text;
      i++; continue;
    }
    i++;
  }
  return { intro, moves };
}

// ── Split PGN into chapters ───────────────────────────────────────────────────

function splitChapters(raw: string): string[] {
  return raw.split(/(?=\[Event\s)/).map(s => s.trim()).filter(Boolean);
}

// ── Parse one chapter ─────────────────────────────────────────────────────────

interface Chapter {
  id: string;
  title: string;
  fen: string | null;
  intro?: string;
  moves: ParsedMove[];
}

function parseChapter(block: string): Chapter | null {
  const tokens = tokenise(block);
  const tags: Record<string, string> = {};
  for (const t of tokens) {
    if (t.kind === 'tag') tags[t.key] = t.value;
  }

  const name = tags['ChapterName'];
  if (!name || name === 'Introduction') return null;

  const urlMatch = (tags['ChapterURL'] ?? '').match(/\/([A-Za-z0-9]+)$/);
  const id = urlMatch ? urlMatch[1] : name.replace(/\W+/g, '-').toLowerCase();
  const fen = tags['FEN'] ?? null;
  const { intro, moves } = extractMainLine(tokens);

  if (moves.length === 0) return null;

  return { id, title: name, fen, intro, moves };
}

// ── Derive concept label from title ──────────────────────────────────────────

function deriveConceptGroup(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('lucena'))           return 'rook-endgame';
  if (t.includes('philidor'))         return 'rook-endgame';
  if (t.includes('rook'))             return 'rook-endgame';
  if (t.includes('queen vs'))         return 'queen-endgame';
  if (t.includes('queen v'))          return 'queen-endgame';
  if (t.includes('knight'))           return 'minor-piece';
  if (t.includes('bishop'))           return 'minor-piece';
  if (t.includes('opposite bishop'))  return 'minor-piece';
  if (t.includes('key square'))       return 'pawn-endgame';
  if (t.includes('opposition'))       return 'pawn-endgame';
  if (t.includes('pawn'))             return 'pawn-endgame';
  return 'pawn-endgame';
}

// ── Generate TypeScript output ────────────────────────────────────────────────

function escapeStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function chaptersToTs(chapters: Chapter[]): string {
  const lines: string[] = [];
  lines.push('// Auto-generated by scripts/parse-e1.ts — do not edit manually');
  lines.push('// Source: https://lichess.org/study/h6HmRwJi (anorakii)');
  lines.push('// "100 Endgames You Must Know" by Jesus de la Villa, sub-2000 subset');
  lines.push('');
  lines.push("export type E1Group = 'pawn-endgame' | 'rook-endgame' | 'minor-piece' | 'queen-endgame';");
  lines.push('');
  lines.push('export interface E1Move {');
  lines.push('  san: string;');
  lines.push('  comment?: string;');
  lines.push('}');
  lines.push('');
  lines.push('export interface E1Chapter {');
  lines.push('  id: string;');
  lines.push('  title: string;');
  lines.push('  group: E1Group;');
  lines.push('  fen: string;');
  lines.push('  intro?: string;');
  lines.push('  moves: E1Move[];');
  lines.push('}');
  lines.push('');
  lines.push('export const E1_CHAPTERS: E1Chapter[] = [');

  for (const ch of chapters) {
    lines.push('  {');
    lines.push(`    id:    '${ch.id}',`);
    lines.push(`    title: \`${escapeStr(ch.title)}\`,`);
    lines.push(`    group: '${deriveConceptGroup(ch.title)}',`);
    lines.push(`    fen:   \`${ch.fen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}\`,`);
    if (ch.intro) {
      lines.push(`    intro: \`${escapeStr(ch.intro)}\`,`);
    }
    lines.push('    moves: [');
    for (const m of ch.moves) {
      if (m.comment) {
        lines.push(`      { san: '${m.san}', comment: \`${escapeStr(m.comment)}\` },`);
      } else {
        lines.push(`      { san: '${m.san}' },`);
      }
    }
    lines.push('    ],');
    lines.push('  },');
  }

  lines.push('];');
  lines.push('');
  lines.push('// Concept groups for the sidebar / coverage view');
  lines.push("export const E1_GROUPS: { id: E1Group; label: string }[] = [");
  lines.push("  { id: 'pawn-endgame',  label: 'Pawn Endgames'  },");
  lines.push("  { id: 'rook-endgame',  label: 'Rook Endgames'  },");
  lines.push("  { id: 'minor-piece',   label: 'Minor Pieces'   },");
  lines.push("  { id: 'queen-endgame', label: 'Queen Endgames' },");
  lines.push('];');

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

const raw = fs.readFileSync(path.join(__dirname, 'e1_raw.pgn'), 'utf8');
const blocks = splitChapters(raw);
const chapters = blocks.map(parseChapter).filter((c): c is Chapter => c !== null);

console.log(`Parsed ${chapters.length} chapters`);
for (const ch of chapters) {
  console.log(`  ${ch.id.padEnd(12)} ${ch.moves.length.toString().padStart(2)} moves  ${ch.title}`);
}

const ts = chaptersToTs(chapters);
const outPath = path.join(__dirname, '..', 'frontend', 'src', 'data', 'e1Corpus.ts');
fs.writeFileSync(outPath, ts, 'utf8');
console.log(`\nWrote ${outPath}`);
