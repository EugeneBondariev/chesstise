import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PLAYER_REGISTRY, type PlayerEntry } from '../../data/playerRegistry';
import { type ClassicalGame } from '../../data/classicalGames';

const ALL_PLAYERS = [...PLAYER_REGISTRY].sort((a, b) => a.name.localeCompare(b.name));

export default function MastersCorpus() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('');

  const filtered = filter.trim()
    ? ALL_PLAYERS.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
    : ALL_PLAYERS;

  return (
    <div className="exercise-page bp-page">
      <div className="bp-hero">
        <div className="bp-hero-text">
          <h1 className="bp-title">Masters Games (C1)</h1>
          <p className="bp-subtitle">
            {ALL_PLAYERS.length} players · open exploration · pick any master and study their games
          </p>
        </div>
      </div>

      <div className="masters-search-row">
        <input
          className="masters-filter-input"
          type="text"
          placeholder="Filter players…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          aria-label="Filter players"
        />
        {filter && (
          <button className="masters-filter-clear" onClick={() => setFilter('')} aria-label="Clear filter">✕</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="masters-no-results">No players match "{filter}"</p>
      ) : (
        <div className="masters-player-grid">
          {filtered.map(p => (
            <button
              key={p.id}
              className="masters-player-btn"
              onClick={() => navigate(`/players/${p.id}`)}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <CrossSearchSection navigate={navigate} />
    </div>
  );
}

function CrossSearchSection({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const [open, setOpen] = useState(false);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [results, setResults] = useState<ClassicalGame[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    const q1 = p1.trim().toLowerCase();
    const q2 = p2.trim().toLowerCase();
    if (!q1 || !q2) return;
    setLoading(true);
    setResults(null);
    try {
      const match1 = PLAYER_REGISTRY.filter(e => e.name.toLowerCase().includes(q1));
      const match2 = PLAYER_REGISTRY.filter(e => e.name.toLowerCase().includes(q2));
      const [games1, games2] = await Promise.all([
        Promise.all(match1.map((e: PlayerEntry) => e.getGames())),
        Promise.all(match2.map((e: PlayerEntry) => e.getGames())),
      ]);
      const from1 = games1.flat().filter(g => g.white.toLowerCase().includes(q2) || g.black.toLowerCase().includes(q2));
      const from2 = games2.flat().filter(g => g.white.toLowerCase().includes(q1) || g.black.toLowerCase().includes(q1));
      const seen = new Set<string>();
      const deduped: ClassicalGame[] = [];
      for (const g of [...from1, ...from2]) {
        const key = `${g.white}|${g.black}|${g.year ?? '?'}|${g.moves.length}`;
        if (!seen.has(key)) { seen.add(key); deduped.push(g); }
      }
      deduped.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
      setResults(deduped);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="masters-cross-section">
      <button
        className="masters-cross-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        {open ? '▾' : '▸'} Find games between two players
      </button>

      {open && (
        <div className="masters-cross-body">
          <div className="cross-search-bar">
            <input
              className="cross-search-input"
              type="text"
              placeholder="Player 1"
              value={p1}
              onChange={e => setP1(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <span className="cross-search-vs">vs.</span>
            <input
              className="cross-search-input"
              type="text"
              placeholder="Player 2"
              value={p2}
              onChange={e => setP2(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button className="cross-search-btn" onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>

          {results !== null && (
            <>
              <p className="cross-search-count">
                {results.length === 0 ? 'No games found.' : `${results.length} game${results.length === 1 ? '' : 's'} found`}
              </p>
              {results.length > 0 && (
                <div className="player-table-wrap">
                  <table className="player-table">
                    <thead>
                      <tr><th>Year</th><th>White</th><th>Black</th><th>Result</th><th>Event</th><th>Moves</th></tr>
                    </thead>
                    <tbody>
                      {results.map(g => (
                        <tr
                          key={`${g.white}|${g.black}|${g.year ?? '?'}|${g.moves.length}`}
                          className="player-row"
                          onClick={() => navigate(`/games/${g.id}`)}
                          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && navigate(`/games/${g.id}`)}
                          tabIndex={0}
                          role="button"
                        >
                          <td>{g.year ?? '?'}</td>
                          <td>{g.white}</td>
                          <td>{g.black}</td>
                          <td>{g.result}</td>
                          <td>{g.event ?? '—'}</td>
                          <td>{Math.ceil(g.moves.length / 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
