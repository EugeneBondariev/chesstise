import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RunResult } from '../types';

interface ProfileState {
  cellGuesserRuns: RunResult[];
  squareColorRuns: RunResult[];
  blindPathingRuns: RunResult[];
  calculationRuns: RunResult[];
  speechRate: number;
  markedGames: string[];
  autoAdvanceMs: number;
  noveltyMultiplier: number;
  dailyTarget: number;
  readCounts: Record<string, number>;   // gameId → total reads all time
  readsByDate: Record<string, number>;  // 'YYYY-MM-DD' → reads that day
  addCellGuesserRun: (run: RunResult) => void;
  addSquareColorRun: (run: RunResult) => void;
  addBlindPathingRun: (run: RunResult) => void;
  removeBlindPathingRun: (date: string) => void;
  addCalculationRun: (run: RunResult) => void;
  setSpeechRate: (rate: number) => void;
  toggleMarkedGame: (id: string) => void;
  setAutoAdvanceMs: (ms: number) => void;
  setNoveltyMultiplier: (n: number) => void;
  setDailyTarget: (n: number) => void;
  logRead: (gameId: string) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      cellGuesserRuns: [],
      squareColorRuns: [],
      blindPathingRuns: [],
      calculationRuns: [],
      speechRate: 2,
      markedGames: [],
      autoAdvanceMs: 4000,
      noveltyMultiplier: 1.5,
      dailyTarget: 5,
      readCounts: {},
      readsByDate: {},

      addCellGuesserRun: (run) =>
        set(state => ({ cellGuesserRuns: [...state.cellGuesserRuns, run] })),

      addSquareColorRun: (run) =>
        set(state => ({ squareColorRuns: [...state.squareColorRuns, run] })),

      addBlindPathingRun: (run) =>
        set(state => ({ blindPathingRuns: [...state.blindPathingRuns, run] })),

      removeBlindPathingRun: (date) =>
        set(state => ({ blindPathingRuns: state.blindPathingRuns.filter(r => r.date !== date) })),

      addCalculationRun: (run) =>
        set(state => ({ calculationRuns: [...state.calculationRuns, run] })),

      setSpeechRate: (rate) => set({ speechRate: rate }),

      toggleMarkedGame: (id) => set(state => ({
        markedGames: state.markedGames.includes(id)
          ? state.markedGames.filter(x => x !== id)
          : [...state.markedGames, id],
      })),

      setAutoAdvanceMs:      (ms) => set({ autoAdvanceMs: ms }),
      setNoveltyMultiplier:  (n)  => set({ noveltyMultiplier: n }),
      setDailyTarget:        (n)  => set({ dailyTarget: n }),

      logRead: (gameId) => set(state => {
        const today = new Date().toISOString().slice(0, 10);
        return {
          readCounts:  { ...state.readCounts,  [gameId]: (state.readCounts[gameId]  ?? 0) + 1 },
          readsByDate: { ...state.readsByDate, [today]:  (state.readsByDate[today]  ?? 0) + 1 },
        };
      }),
    }),
    { name: 'chesstise-profile' },
  ),
);
