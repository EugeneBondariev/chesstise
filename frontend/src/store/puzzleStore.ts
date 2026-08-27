import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FailedPuzzle { id: string; rating: number; themes: string[]; failedAt: string; }

interface PuzzleState {
  token: string | null;
  username: string | null;
  rating: number | null;
  failed: FailedPuzzle[];
  setAuth: (token: string, username: string, rating: number | null) => void;
  clearAuth: () => void;
  addFailed: (p: FailedPuzzle) => void;
  removeFailed: (id: string) => void;
}

export const usePuzzleStore = create<PuzzleState>()(
  persist(
    (set) => ({
      token: null, username: null, rating: null, failed: [],
      setAuth: (token, username, rating) => set({ token, username, rating }),
      clearAuth: () => set({ token: null, username: null, rating: null }),
      addFailed: (p) => set(s => ({
        failed: s.failed.some(x => x.id === p.id) ? s.failed : [p, ...s.failed].slice(0, 500),
      })),
      removeFailed: (id) => set(s => ({ failed: s.failed.filter(x => x.id !== id) })),
    }),
    { name: 'chesstise-puzzle' }
  )
);
