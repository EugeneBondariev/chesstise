export interface MasterMove {
  san:   string;
  uci:   string;
  white: number;
  draws: number;
  black: number;
}

export interface ExplorerOptions {
  ratings?: number[];
  speeds?:  string[];
}

const cache         = new Map<string, MasterMove[]>();
const explorerCache = new Map<string, MasterMove[]>();

export async function fetchMasterMoves(fen: string): Promise<MasterMove[]> {
  if (cache.has(fen)) return cache.get(fen)!;
  try {
    const res = await fetch(
      `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}&moves=8&topGames=0`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    const moves: MasterMove[] = (data.moves ?? []).filter(
      (m: MasterMove) => m.white + m.draws + m.black >= 30,
    );
    cache.set(fen, moves);
    return moves;
  } catch {
    return [];
  }
}

const VALID_RATINGS = [400, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500];
const VALID_SPEEDS  = ['bullet', 'blitz', 'rapid', 'classical'];

export async function fetchExplorerMoves(
  fen: string,
  options: ExplorerOptions = {},
): Promise<MasterMove[]> {
  const ratings = (options.ratings ?? [1600, 1800, 2000]).filter(r => VALID_RATINGS.includes(r));
  const speeds  = (options.speeds  ?? ['blitz', 'rapid']).filter(s => VALID_SPEEDS.includes(s));
  const key = `${fen}|${ratings.join(',')}|${speeds.join(',')}`;
  if (explorerCache.has(key)) return explorerCache.get(key)!;
  try {
    const ratingParams = ratings.map(r => `ratings=${r}`).join('&');
    const speedParams  = speeds.map(s => `speeds=${encodeURIComponent(s)}`).join('&');
    const url = `https://explorer.lichess.ovh/lichess?variant=standard&fen=${encodeURIComponent(fen)}&moves=12&topGames=0&recentGames=0&${ratingParams}&${speedParams}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const moves: MasterMove[] = (data.moves ?? []).filter(
      (m: MasterMove) => m.white + m.draws + m.black >= 5,
    );
    if (moves.length > 0) explorerCache.set(key, moves);
    return moves;
  } catch {
    return [];
  }
}

export function weightedPick(moves: MasterMove[]): MasterMove | null {
  if (moves.length === 0) return null;
  const total = moves.reduce((s, m) => s + m.white + m.draws + m.black, 0);
  let r = Math.random() * total;
  for (const m of moves) {
    r -= m.white + m.draws + m.black;
    if (r <= 0) return m;
  }
  return moves[0];
}
