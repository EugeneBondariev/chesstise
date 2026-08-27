const LICHESS = 'https://lichess.org';

export interface LichessPlayer { name: string; color: 'white' | 'black'; rating?: number; }

export interface LichessPuzzle {
  game: { id: string; pgn: string; players: LichessPlayer[]; perf?: { key: string; name: string }; };
  puzzle: { id: string; rating: number; plays: number; solution: string[]; themes: string[]; initialPly: number; };
}

export interface LichessUser {
  id: string; username: string;
  perfs: { puzzle?: { rating: number; rd: number; prog: number; }; };
}

export interface PuzzleActivity { date: number; win: boolean; puzzle: { id: string; rating: number; }; }

function authHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function fetchPuzzle(angle: string, token?: string): Promise<LichessPuzzle> {
  const url = angle === 'mix' ? `${LICHESS}/api/puzzle/next` : `${LICHESS}/api/puzzle/next?angle=${encodeURIComponent(angle)}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Lichess ${res.status}`);
  return res.json();
}

export async function fetchPuzzleById(id: string, token?: string): Promise<LichessPuzzle> {
  const res = await fetch(`${LICHESS}/api/puzzle/${id}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Lichess ${res.status}`);
  return res.json();
}

export async function fetchMe(token: string): Promise<LichessUser> {
  const res = await fetch(`${LICHESS}/api/account`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Lichess ${res.status}`);
  return res.json();
}

export async function fetchPuzzleActivity(token: string, max = 100): Promise<PuzzleActivity[]> {
  const res = await fetch(`${LICHESS}/api/puzzle/activity?max=${max}`, {
    headers: { ...authHeaders(token), Accept: 'application/x-ndjson' },
  });
  if (!res.ok) throw new Error(`Lichess ${res.status}`);
  const text = await res.text();
  return text.trim().split('\n').filter(Boolean).map(l => JSON.parse(l) as PuzzleActivity);
}
