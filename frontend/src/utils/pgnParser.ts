import type { ClassicalGame } from '../data/classicalGames';

// Extract "base|inc" time control from event names like "1st 3-0 Thu 1st Jan 2026"
function extractTimeControl(eventName: string | null): string | null {
  if (!eventName) return null;
  const m = eventName.match(/\b(\d{1,3})-(\d{1,2})\b/);
  if (!m) return null;
  const base = parseInt(m[1], 10);
  const inc  = parseInt(m[2], 10);
  if (base < 1 || base > 180 || inc < 0 || inc > 60) return null;
  return `${base}|${inc}`;
}

function stripAnnotations(movetext: string): string {
  // Remove comments: { ... }
  let s = movetext.replace(/\{[^}]*\}/g, ' ');
  // Remove variations: ( ... ) — non-nested only, repeated passes for nesting
  for (let i = 0; i < 6; i++) s = s.replace(/\([^()]*\)/g, ' ');
  // Remove NAGs: $N
  s = s.replace(/\$\d+/g, ' ');
  // Remove move numbers: 1. 1... 12.
  s = s.replace(/\d+\.+/g, ' ');
  // Remove result token
  s = s.replace(/1-0|0-1|1\/2-1\/2|\*/g, ' ');
  return s;
}

export function parsePgn(raw: string, idPrefix: string): ClassicalGame[] {
  const games: ClassicalGame[] = [];
  // Split on lines starting with [Event — each new game starts with [Event
  const chunks = raw.split(/(?=^\[Event\s)/m).filter(c => c.trim());

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const tags: Record<string, string> = {};

    // Extract all tag pairs [Key "Value"]
    for (const m of chunk.matchAll(/^\[(\w+)\s+"([^"]*)"\]/gm)) {
      tags[m[1]] = m[2];
    }

    if (!tags['White'] || !tags['Black'] || !tags['Result']) continue;

    const result = tags['Result'];
    if (result !== '1-0' && result !== '0-1' && result !== '1/2-1/2') continue;

    // Movetext starts after the last tag line
    const lastTagEnd = [...chunk.matchAll(/^\[.*\]\s*$/gm)].pop();
    const movetextStart = lastTagEnd ? chunk.indexOf(lastTagEnd[0]) + lastTagEnd[0].length : 0;
    const movetext = chunk.slice(movetextStart);

    const cleaned = stripAnnotations(movetext);
    const moves = cleaned.split(/\s+/).map(t => t.trim()).filter(t =>
      t.length > 0 && /[a-hNBRQKO]/.test(t[0])
    );

    if (moves.length === 0) continue;

    const year = tags['Date'] ? parseInt(tags['Date'].slice(0, 4), 10) : null;
    const event = tags['Event'] ?? null;
    const whiteEloRaw = tags['WhiteElo'] ? parseInt(tags['WhiteElo'], 10) : null;
    const blackEloRaw = tags['BlackElo'] ? parseInt(tags['BlackElo'], 10) : null;

    games.push({
      id:          `${idPrefix}-${i}`,
      white:       tags['White'],
      black:       tags['Black'],
      year:        isNaN(year as number) ? null : year,
      event,
      result:      result as '1-0' | '0-1' | '1/2-1/2',
      eco:         tags['ECO'] ?? null,
      whiteElo:    whiteEloRaw != null && !isNaN(whiteEloRaw) ? whiteEloRaw : null,
      blackElo:    blackEloRaw != null && !isNaN(blackEloRaw) ? blackEloRaw : null,
      timeControl: extractTimeControl(event),
      moves,
    });
  }

  return games;
}
