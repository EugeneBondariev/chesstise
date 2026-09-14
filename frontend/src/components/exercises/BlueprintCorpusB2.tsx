import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  B2_GAMES,
  B2_CONCEPTS,
  B2_CONCEPT_MAP,
  B2_CATEGORY_LABELS,
  B2_GROUP_LABELS,
  b2GamesForConcept,
  type B2Category,
  type B2ConceptGroup,
} from '../../data/b2Corpus';

const GROUP_COLORS: Record<B2ConceptGroup, string> = {
  opening:   'bp-tag-opening',
  structure: 'bp-tag-structure',
  tactic:    'bp-tag-tactic',
  strategy:  'bp-tag-strategy',
  endgame:   'bp-tag-endgame',
};

const CATEGORY_ORDER: B2Category[] = ['tactics-sub', 'strategy-sub', 'endgame-sub', 'openings-b2'];

export default function BlueprintCorpusB2() {
  const navigate = useNavigate();
  const [view, setView] = useState<'games' | 'coverage'>('games');

  const verifiedCount = B2_GAMES.filter(g => g.id !== null).length;
  const totalConcepts = B2_CONCEPTS.length;
  const coveredConceptIds = new Set(B2_GAMES.flatMap(g => g.concepts));

  return (
    <div className="exercise-page bp-page">

      <div className="bp-hero">
        <div className="bp-hero-text">
          <h1 className="bp-title">Blindfold Literacy (B2)</h1>
          <p className="bp-subtitle">
            {B2_GAMES.length} games · {coveredConceptIds.size} of {totalConcepts} concepts covered ·
            subconcepts, secondary openings, and endgame technique — the second layer of your blindfold repertoire
          </p>
        </div>
        <div className="bp-view-toggle">
          <button
            className={`bp-toggle-btn${view === 'games' ? ' active' : ''}`}
            onClick={() => setView('games')}
          >
            Games
          </button>
          <button
            className={`bp-toggle-btn${view === 'coverage' ? ' active' : ''}`}
            onClick={() => setView('coverage')}
          >
            Coverage Map
          </button>
        </div>
      </div>

      {view === 'games' ? (
        <GamesView navigate={navigate} verifiedCount={verifiedCount} />
      ) : (
        <CoverageView navigate={navigate} />
      )}
    </div>
  );
}

function GamesView({ navigate, verifiedCount }: { navigate: ReturnType<typeof useNavigate>; verifiedCount: number }) {
  return (
    <div className="bp-games-view">
      {verifiedCount < B2_GAMES.length && (
        <div className="bp-pending-banner">
          {B2_GAMES.length - verifiedCount} games are pending game-ID lookup and will be added soon.
          Verified games are fully playable now.
        </div>
      )}

      {CATEGORY_ORDER.map(cat => {
        const games = B2_GAMES.filter(g => g.category === cat);
        if (!games.length) return null;
        return (
          <section key={cat} className="bp-section">
            <h2 className="bp-section-title">{B2_CATEGORY_LABELS[cat]}</h2>
            <div className="bp-card-list">
              {games.map((game, idx) => {
                const globalIdx = B2_GAMES.indexOf(game) + 1;
                const verified = game.id !== null;
                return (
                  <div
                    key={idx}
                    className={`bp-card${verified ? ' bp-card-playable' : ' bp-card-pending'}`}
                    onClick={() => verified && navigate(`/games/${game.id}`)}
                    role={verified ? 'button' : undefined}
                    tabIndex={verified ? 0 : undefined}
                    onKeyDown={e => verified && e.key === 'Enter' && navigate(`/games/${game.id}`)}
                  >
                    <div className="bp-card-header">
                      <span className="bp-game-num">#{globalIdx}</span>
                      <span className="bp-card-title">{game.title}</span>
                      {verified ? (
                        <span className="bp-study-btn">Study →</span>
                      ) : (
                        <span className="bp-pending-badge">Pending</span>
                      )}
                    </div>
                    <div className="bp-card-label">{game.label}</div>
                    <div className="bp-card-note">{game.note}</div>
                    <div className="bp-tag-row">
                      {game.concepts.map(cid => {
                        const c = B2_CONCEPT_MAP.get(cid);
                        if (!c) return null;
                        return (
                          <span key={cid} className={`bp-tag ${GROUP_COLORS[c.group]}`}>
                            {c.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CoverageView({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const groups: B2ConceptGroup[] = ['opening', 'structure', 'tactic', 'strategy', 'endgame'];

  return (
    <div className="bp-coverage-view">
      <p className="bp-coverage-intro">
        Every B2 concept is listed below. Click a game to open it. "—" means the concept
        is pending a dedicated game selection.
      </p>
      {groups.map(group => {
        const groupConcepts = B2_CONCEPTS.filter(c => c.group === group);
        if (!groupConcepts.length) return null;
        return (
          <section key={group} className="bp-cov-section">
            <h2 className={`bp-cov-group-title bp-cov-${group}`}>{B2_GROUP_LABELS[group]}</h2>
            <div className="bp-cov-rows">
              {groupConcepts.map(concept => {
                const covering = b2GamesForConcept(concept.id);
                return (
                  <div key={concept.id} className="bp-cov-row">
                    <span className={`bp-tag ${GROUP_COLORS[group]} bp-cov-concept-label`}>
                      {concept.label}
                    </span>
                    <span className="bp-cov-arrow">→</span>
                    <span className="bp-cov-games">
                      {covering.length === 0 ? (
                        <span className="bp-cov-none">—</span>
                      ) : (
                        covering.map((g, i) => (
                          <span key={i}>
                            {i > 0 && <span className="bp-cov-sep"> · </span>}
                            {g.id ? (
                              <button
                                className="bp-cov-game-link"
                                onClick={() => navigate(`/games/${g.id}`)}
                              >
                                {g.title}
                              </button>
                            ) : (
                              <span className="bp-cov-game-pending">{g.title} (pending)</span>
                            )}
                          </span>
                        ))
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
