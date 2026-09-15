import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../../store/profileStore';
import { BLUEPRINT_GAMES } from '../../data/blueprintCorpus';
import { B2_GAMES } from '../../data/b2Corpus';
import { findGameAcrossPlayers } from '../../data/playerRegistry';

type Track = 'B1' | 'B2' | 'C1';

interface FavoriteEntry {
  id: string;
  track: Track;
  title: string;
  label: string;
}

export default function FavoritesPage() {
  const navigate = useNavigate();
  const markedGames    = useProfileStore(s => s.markedGames);
  const toggleMarkedGame = useProfileStore(s => s.toggleMarkedGame);
  const [entries, setEntries] = useState<FavoriteEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (markedGames.length === 0) { setEntries([]); return; }

    const resolved: FavoriteEntry[] = [];
    const c1Ids: string[] = [];

    for (const id of markedGames) {
      const b1 = BLUEPRINT_GAMES.find(g => g.id === id);
      if (b1) { resolved.push({ id, track: 'B1', title: b1.title, label: b1.label }); continue; }
      const b2 = B2_GAMES.find(g => g.id === id);
      if (b2) { resolved.push({ id, track: 'B2', title: b2.title, label: b2.label }); continue; }
      c1Ids.push(id);
    }

    if (c1Ids.length === 0) {
      setEntries([...resolved].sort((a, b) => markedGames.indexOf(a.id) - markedGames.indexOf(b.id)));
      return;
    }

    setLoading(true);
    Promise.all(c1Ids.map(id => findGameAcrossPlayers(id))).then(games => {
      for (let i = 0; i < c1Ids.length; i++) {
        const g = games[i];
        if (g) resolved.push({
          id: c1Ids[i],
          track: 'C1',
          title: `${g.white} vs ${g.black}`,
          label: [g.event, g.year].filter(Boolean).join(' · '),
        });
      }
      resolved.sort((a, b) => markedGames.indexOf(a.id) - markedGames.indexOf(b.id));
      setEntries(resolved);
      setLoading(false);
    });
  }, [markedGames]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="exercise-page">
      <h1 className="exercise-title">Favorites</h1>

      {markedGames.length === 0 ? (
        <p className="fav-empty">No favorites yet — press ★ while studying any game.</p>
      ) : (
        <>
          {loading && <p className="fav-loading">Loading…</p>}
          <div className="favorites-list">
            {entries.map(e => (
              <div key={e.id} className="favorites-row">
                <span className={`fav-track-badge fav-track-${e.track.toLowerCase()}`}>{e.track}</span>
                <div
                  className="fav-info"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/games/${e.id}`)}
                  onKeyDown={ev => (ev.key === 'Enter' || ev.key === ' ') && navigate(`/games/${e.id}`)}
                >
                  <span className="fav-title">{e.title}</span>
                  <span className="fav-label">{e.label}</span>
                </div>
                <button
                  className="fav-remove-btn"
                  onClick={() => toggleMarkedGame(e.id)}
                  aria-label="Remove from favorites"
                  title="Remove from favorites"
                >★</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
