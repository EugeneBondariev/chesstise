import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ExplorerTrainer from './ExplorerTrainer';
import { fetchMasterMoves, weightedPick } from '../../api/lichessOpenings';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('react-chessboard', () => ({ Chessboard: () => null }));

vi.mock('../../utils/speechUtils', () => ({
  speak: vi.fn(),
  playSound: vi.fn(),
}));

vi.mock('../../store/profileStore', () => ({
  useProfileStore: (sel: (s: { boardMaxWidth: number }) => unknown) =>
    sel({ boardMaxWidth: 480 }),
}));

vi.mock('../../api/lichessOpenings', () => ({
  fetchMasterMoves: vi.fn(),
  weightedPick: vi.fn(),
}));

// ── Global env polyfills ──────────────────────────────────────────────────────

(window as unknown as { ResizeObserver: unknown }).ResizeObserver = vi.fn().mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
});

// ── Test data ─────────────────────────────────────────────────────────────────

const MOVES = [
  { san: 'e5', uci: 'e7e5', white: 100, draws: 50, black: 75 },
  { san: 'c5', uci: 'c7c5', white:  80, draws: 40, black: 60 },
];

type MockMoves = typeof MOVES;

const mockFetch = vi.mocked(fetchMasterMoves);
const mockPick  = vi.mocked(weightedPick);

// ── Helpers ───────────────────────────────────────────────────────────────────

function pressKey(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

// The setup panel has both a "Start" preset button AND a "Start" game button.
// The game button has class et-start-btn — target it directly.
function clickStartGameButton(container: HTMLElement) {
  const btn = container.querySelector<HTMLButtonElement>('.et-start-btn');
  if (!btn) throw new Error('.et-start-btn not found');
  fireEvent.click(btn);
}

// ── Per-test setup ────────────────────────────────────────────────────────────

beforeEach(() => {
  mockFetch.mockResolvedValue(MOVES as MockMoves);
  mockPick.mockImplementation((moves: MockMoves) => moves?.[0] ?? null);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ExplorerTrainer — alternatives panel', () => {
  it('shows move data when e is pressed before making any moves (on-demand fetch path)', async () => {
    const { container } = render(<ExplorerTrainer />);

    // Start game as white (player moves first — computer won't jump in)
    await act(async () => { clickStartGameButton(container); });

    // Press e to open the alternatives panel
    await act(async () => { pressKey('e'); });

    // On-demand fetch fires for the starting FEN and returns MOVES
    await waitFor(() => {
      expect(screen.getByText('e5')).toBeInTheDocument();
    });
    expect(screen.queryByText('No data available')).toBeNull();
  });

  it('shows move data from history snapshot when player makes a move then presses e', async () => {
    const { container } = render(<ExplorerTrainer />);

    await act(async () => { clickStartGameButton(container); });

    // Wait for the initial explorer fetch to resolve so explorerData is loaded
    // before the player moves (ensures snapshot stored in history entry is non-null)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    // Player types e4: f=pawn  j=e-file  f=rank-4  (home-row key mapping)
    await act(async () => {
      pressKey('f');
      pressKey('j');
      pressKey('f');
    });

    // applyPlayerMove('e4') stores explorerData snapshot (= MOVES) in history entry
    // showAlternatives is reset to false; press e to re-open the panel
    await act(async () => { pressKey('e'); });

    await waitFor(() => {
      expect(screen.getByText('e5')).toBeInTheDocument();
    });
    expect(screen.queryByText('No data available')).toBeNull();
  });

  it('shows move data from computer move snapshot when player is black', async () => {
    vi.useFakeTimers();
    const { container } = render(<ExplorerTrainer />);

    // Start as black so the computer (white) makes the first move
    await act(async () => {
      fireEvent.click(screen.getByText('Black'));
      clickStartGameButton(container);
      // Flush the mock fetch promise (it resolves in a microtask)
      await Promise.resolve();
      await Promise.resolve();
    });

    // Fire the 700 ms computer-move timeout
    await act(async () => {
      vi.advanceTimersByTime(800);
      // Flush state updates and any follow-up promises
      await Promise.resolve();
      await Promise.resolve();
    });

    // Press e to open the alternatives panel
    await act(async () => { pressKey('e'); });

    // lastEntry.explorerData was stored when the computer moved → snapshot path
    expect(screen.getByText('e5')).toBeInTheDocument();
    expect(screen.queryByText('No data available')).toBeNull();
  });

  it('shows "No data available" when the API returns no moves', async () => {
    mockFetch.mockResolvedValue([]);
    const { container } = render(<ExplorerTrainer />);

    await act(async () => { clickStartGameButton(container); });

    await act(async () => { pressKey('e'); });

    await waitFor(() => {
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
    expect(screen.queryByText('e5')).toBeNull();
  });
});
