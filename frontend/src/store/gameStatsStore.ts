import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MoveRecord {
  attempts: number; // 0=skipped, 1=correct first try, 2+=needed retries
  timeMs: number;
}

export interface GameReplay {
  id: string;
  gameId: string;
  startedAt: string;
  finishedAt?: string;
  totalTimeMs?: number;
  moves: (MoveRecord | null)[]; // null = not practiced
}

interface GameStatsState {
  replays: GameReplay[];
  startReplay: (gameId: string, moveCount: number) => string;
  recordMove: (replayId: string, plyIdx: number, record: MoveRecord) => void;
  finishReplay: (replayId: string) => void;
  deleteReplay: (replayId: string) => void;
}

export const useGameStatsStore = create<GameStatsState>()(
  persist(
    (set) => ({
      replays: [],
      startReplay: (gameId, moveCount) => {
        const id = `${Date.now()}`;
        set(s => ({
          replays: [
            // keep at most 200 total replays
            ...s.replays.slice(-199),
            {
              id, gameId,
              startedAt: new Date().toISOString(),
              moves: Array.from({ length: moveCount }, () => null),
            },
          ],
        }));
        return id;
      },
      recordMove: (replayId, plyIdx, record) => {
        set(s => ({
          replays: s.replays.map(r => {
            if (r.id !== replayId) return r;
            const moves = [...r.moves];
            moves[plyIdx] = record;
            return { ...r, moves };
          }),
        }));
      },
      finishReplay: (replayId) => {
        set(s => ({
          replays: s.replays.map(r => {
            if (r.id !== replayId) return r;
            const totalTimeMs = r.moves.reduce((sum, m) => sum + (m?.timeMs ?? 0), 0);
            return { ...r, finishedAt: new Date().toISOString(), totalTimeMs };
          }),
        }));
      },
      deleteReplay: (replayId) => {
        set(s => ({ replays: s.replays.filter(r => r.id !== replayId) }));
      },
    }),
    { name: 'chesstise-game-stats' }
  )
);
