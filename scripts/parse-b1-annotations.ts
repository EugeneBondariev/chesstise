// Downloads annotated Lichess studies and generates frontend/src/data/b1Annotations.ts
// Run with: npx tsx scripts/parse-b1-annotations.ts

import * as fs from 'fs';
import * as path from 'path';

// ── Study source map ──────────────────────────────────────────────────────────

const STUDY_MAP: Array<{
  gameId: string;
  source: string;
  studyId: string;
  chapterId?: string;
  matchWhite?: string;
  matchBlack?: string;
}> = [
  { gameId: 'morphy-124',    studyId: 'VQEFoO70', matchWhite: 'Morphy',    source: 'lichess.org/study/VQEFoO70' },
  { gameId: 'anderssen-54',  studyId: 'agESaWbF', matchWhite: 'Anderssen', matchBlack: 'Kieseritzky', source: 'lichess.org/study/agESaWbF' },
  { gameId: 'anderssen-118', studyId: 'O2SZpbQC', matchWhite: 'Anderssen', matchBlack: 'Dufresne',    source: 'lichess.org/study/O2SZpbQC' },
  { gameId: 'botvinnik-192', studyId: '6bQdAcHr', matchWhite: 'Botvinnik', matchBlack: 'Capablanca',  source: 'lichess.org/study/6bQdAcHr' },
  { gameId: 'tal-357',       studyId: 'cDwyPliB', chapterId: 'mbSIbhY7',   source: 'lichess.org/study/cDwyPliB' },
  { gameId: 'fischer-18',    studyId: 'zpKQ9toQ', source: 'lichess.org/study/zpKQ9toQ' },
  { gameId: 'kasparov-1510', studyId: '2dSemwq2', source: 'lichess.org/study/2dSemwq2' },
  { gameId: 'kramnik-1599',  studyId: '75C97EC4', chapterId: 'XBBVk2xa',   source: 'lichess.org/study/75C97EC4' },
  { gameId: 'karpov-480',    studyId: 'GdGJoakv', source: 'lichess.org/study/GdGJoakv' },
  { gameId: 'rubinstein-217',studyId: 'we8NHMXd', chapterId: '7RW4l84W',   source: 'lichess.org/study/we8NHMXd' },
];

// ── PGN tokeniser (shared with parse-e1.ts logic) ────────────────────────────

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
    if (/\s/.test(pgn[i])) { i++; continue; }
    if (pgn[i] === '[') {
      const end = pgn.indexOf(']', i);
      const inside = pgn.slice(i + 1, end);
      const m = inside.match(/^(\w+)\s+"(.*)"$/s);
      if (m) tokens.push({ kind: 'tag', key: m[1], value: m[2] });
      i = end + 1; continue;
    }
    if (pgn[i] === '{') {
      let depth = 1; let j = i + 1;
      while (j < pgn.length && depth > 0) {
        if (pgn[j] === '{') depth++;
        else if (pgn[j] === '}') depth--;
        j++;
      }
      const raw = pgn.slice(i + 1, j - 1);
      // strip visual annotations and engine evals
      const text = raw
        .replace(/\[%c[sa]l[^\]]*\]/g, '')
        .replace(/\[%eval[^\]]*\]/g, '')
        .replace(/\[%clk[^\]]*\]/g, '')
        .replace(/\[%tqu[^\]]*\]/g, '')
        .replace(/\[%anno[^\]]*\]\s*/g, '')
        .replace(/\[%wdl[^\]]*\]\s*/g, '')
        .replace(/\[#\]\s*/g, '')
        .trim();
      if (text) tokens.push({ kind: 'comment', text });
      i = j; continue;
    }
    if (pgn[i] === '(') { tokens.push({ kind: 'var_open'  }); i++; continue; }
    if (pgn[i] === ')') { tokens.push({ kind: 'var_close' }); i++; continue; }
    if (pgn[i] === '$') {
      let j = i + 1;
      while (j < pgn.length && /\d/.test(pgn[j])) j++;
      tokens.push({ kind: 'nag', n: parseInt(pgn.slice(i + 1, j)) });
      i = j; continue;
    }
    let j = i;
    while (j < pgn.length && !/[\s\[{($)}\]]/.test(pgn[j])) j++;
    const tok = pgn.slice(i, j);
    if (!tok) { i++; continue; }
    if (['1-0','0-1','1/2-1/2','*'].includes(tok)) {
      tokens.push({ kind: 'result', value: tok });
    } else if (/^\d+\.+$/.test(tok)) {
      // skip move numbers
    } else {
      tokens.push({ kind: 'move', san: tok });
    }
    i = j;
  }
  return tokens;
}

// ── Extract main line annotations ─────────────────────────────────────────────

interface ParsedAnnotation { idx: number; comment: string }

function extractAnnotations(tokens: Token[]): ParsedAnnotation[] {
  const result: ParsedAnnotation[] = [];
  let depth = 0;
  let moveIdx = 0;
  let i = 0;
  while (i < tokens.length && tokens[i].kind === 'tag') i++;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.kind === 'var_open')  { depth++; i++; continue; }
    if (t.kind === 'var_close') { depth--; i++; continue; }
    if (depth > 0) { i++; continue; }
    if (t.kind === 'result') break;
    if (t.kind === 'move') { moveIdx++; i++; continue; }
    if (t.kind === 'comment' && moveIdx > 0) {
      // comment comes AFTER the move, so it belongs to moveIdx-1 (0-based)
      const comment = t.text.replace(/\s+/g, ' ').trim();
      if (comment && comment.length > 10 && !isEngineOnlyComment(comment)) {
        result.push({ idx: moveIdx - 1, comment });
      }
    }
    i++;
  }
  return result;
}

function isEngineOnlyComment(text: string): boolean {
  if (/^(1-0|0-1|1\/2-1\/2|White resigns|Black resigns)\.?$/i.test(text)) return true;
  if (/^(Inaccuracy|Mistake|Blunder|Best move was|And now|[A-Za-z]+ is now (winning|better|losing))\b/.test(text) && text.length < 60) return true;
  // Opening classification prefixes stripped of content (e.g. "A33: Symmetrical English: ...")
  if (/^[A-E]\d\d:/.test(text)) return true;
  // Attribution/preamble lines
  if (/^Notes by\b/i.test(text)) return true;
  return false;
}

// ── Split multi-chapter PGN into chapters ─────────────────────────────────────

function splitChapters(raw: string): string[] {
  return raw.split(/(?=\[Event\s)/).map(s => s.trim()).filter(Boolean);
}

function parseTags(block: string): Record<string, string> {
  const tokens = tokenise(block);
  const tags: Record<string, string> = {};
  for (const t of tokens) {
    if (t.kind === 'tag') tags[t.key] = t.value;
    else break;
  }
  return tags;
}

// ── HTTP fetch using curl ─────────────────────────────────────────────────────

function fetchPgn(url: string): string {
  const { execSync } = require('child_process');
  try {
    const result = execSync(`curl -s -L --max-time 30 -H "Accept: application/x-chess-pgn" "${url}"`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    return result as string;
  } catch (e) {
    console.error(`  Failed to fetch ${url}:`, (e as Error).message);
    return '';
  }
}

// ── Generate TypeScript output ────────────────────────────────────────────────

function escapeStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

// ── Main ─────────────────────────────────────────────────────────────────────

interface GameResult {
  gameId: string;
  source: string;
  annotations: ParsedAnnotation[];
}

async function main() {
  const results: GameResult[] = [];

  for (const entry of STUDY_MAP) {
    console.log(`\nProcessing ${entry.gameId} from study ${entry.studyId}...`);

    const url = entry.chapterId
      ? `https://lichess.org/api/study/${entry.studyId}/${entry.chapterId}.pgn`
      : `https://lichess.org/api/study/${entry.studyId}.pgn`;

    const pgn = fetchPgn(url);
    if (!pgn) {
      console.log(`  → skipped (no PGN)`);
      continue;
    }

    const chapters = splitChapters(pgn);
    console.log(`  → ${chapters.length} chapter(s)`);

    let targetChapter: string | null = null;

    if (chapters.length === 1) {
      targetChapter = chapters[0];
    } else {
      // Find the right chapter by white/black player name
      for (const ch of chapters) {
        const tags = parseTags(ch);
        const w = (tags['White'] ?? '').toLowerCase();
        const b = (tags['Black'] ?? '').toLowerCase();
        const mw = entry.matchWhite?.toLowerCase() ?? '';
        const mb = entry.matchBlack?.toLowerCase() ?? '';
        const matchW = !mw || w.includes(mw);
        const matchB = !mb || b.includes(mb);
        if (matchW && matchB) { targetChapter = ch; break; }
      }
      if (!targetChapter) {
        // fallback: use the first non-empty chapter that has moves
        for (const ch of chapters) {
          const tokens = tokenise(ch);
          if (tokens.some(t => t.kind === 'move')) { targetChapter = ch; break; }
        }
      }
    }

    if (!targetChapter) {
      console.log(`  → no matching chapter found`);
      continue;
    }

    const tokens = tokenise(targetChapter);
    const tags = parseTags(targetChapter);
    console.log(`  → using chapter: ${tags['White'] ?? '?'} vs ${tags['Black'] ?? '?'}`);

    const annotations = extractAnnotations(tokens);
    console.log(`  → ${annotations.length} prose annotations`);
    if (annotations.length > 0) {
      console.log(`     first: [${annotations[0].idx}] "${annotations[0].comment.slice(0, 80)}..."`);
    }

    results.push({ gameId: entry.gameId, source: entry.source, annotations });
  }

  // ── Write output ──────────────────────────────────────────────────────────

  const lines: string[] = [
    '// Auto-generated by scripts/parse-b1-annotations.ts — do not edit manually',
    '// Run: npx tsx scripts/parse-b1-annotations.ts',
    '',
    'export interface B1MoveAnnotation {',
    '  idx: number;',
    '  comment: string;',
    '}',
    '',
    'export interface B1GameAnnotations {',
    '  gameId: string;',
    '  source: string;',
    '  moves: B1MoveAnnotation[];',
    '}',
    '',
    'export const B1_ANNOTATIONS: B1GameAnnotations[] = [',
  ];

  for (const r of results) {
    if (r.annotations.length === 0) continue;
    lines.push(`  {`);
    lines.push(`    gameId: '${r.gameId}',`);
    lines.push(`    source: '${r.source}',`);
    lines.push(`    moves: [`);
    for (const a of r.annotations) {
      lines.push(`      { idx: ${a.idx}, comment: \`${escapeStr(a.comment)}\` },`);
    }
    lines.push(`    ],`);
    lines.push(`  },`);
  }

  lines.push('];');
  lines.push('');
  lines.push('export const B1_ANNOTATIONS_MAP = new Map(B1_ANNOTATIONS.map(a => [a.gameId, a]));');
  lines.push('');

  const outPath = path.resolve(__dirname, '../frontend/src/data/b1Annotations.ts');
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(`\nWrote ${outPath}`);
  console.log(`Games with annotations: ${results.filter(r => r.annotations.length > 0).length} / ${STUDY_MAP.length}`);
}

main().catch(console.error);
