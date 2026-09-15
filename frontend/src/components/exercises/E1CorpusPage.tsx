import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { E1_CHAPTERS, E1_GROUPS } from '../../data/e1Corpus';
import type { E1Chapter } from '../../data/e1Corpus';
import E1ChapterReplay from './E1ChapterReplay';

export default function E1CorpusPage() {
  const { chapterId } = useParams<{ chapterId?: string }>();
  const chapter = chapterId ? E1_CHAPTERS.find(c => c.id === chapterId) : null;

  if (chapter) return <E1ChapterReplay chapter={chapter} />;
  return <E1Index />;
}

function E1Index() {
  const navigate = useNavigate();
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const filtered = activeGroup
    ? E1_CHAPTERS.filter(c => c.group === activeGroup)
    : E1_CHAPTERS;

  const groupCounts = Object.fromEntries(
    E1_GROUPS.map(g => [g.id, E1_CHAPTERS.filter(c => c.group === g.id).length])
  );

  return (
    <div className="exercise-page bp-page">
      <div className="bp-hero">
        <div className="bp-hero-text">
          <h1 className="bp-title">Endgames (E1)</h1>
          <p className="bp-subtitle">
            {E1_CHAPTERS.length} positions · De la Villa · annotated technique
          </p>
        </div>
      </div>

      {/* Group filter tabs */}
      <div className="e1-group-tabs">
        <button
          className={`e1-group-tab${activeGroup === null ? ' active' : ''}`}
          onClick={() => setActiveGroup(null)}
        >
          All ({E1_CHAPTERS.length})
        </button>
        {E1_GROUPS.map(g => (
          <button
            key={g.id}
            className={`e1-group-tab${activeGroup === g.id ? ' active' : ''}`}
            onClick={() => setActiveGroup(activeGroup === g.id ? null : g.id)}
          >
            {g.label} ({groupCounts[g.id] ?? 0})
          </button>
        ))}
      </div>

      {/* Chapter list */}
      <div className="e1-chapter-list">
        {filtered.map(ch => (
          <E1ChapterCard
            key={ch.id}
            chapter={ch}
            globalIdx={E1_CHAPTERS.indexOf(ch) + 1}
            onClick={() => navigate(`/e1/${ch.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

function E1ChapterCard({
  chapter,
  globalIdx,
  onClick,
}: {
  chapter: E1Chapter;
  globalIdx: number;
  onClick: () => void;
}) {
  return (
    <button className="e1-chapter-card" onClick={onClick}>
      <span className="e1-card-num">{globalIdx}</span>
      <div className="e1-card-body">
        <span className="e1-card-title">{chapter.title}</span>
        {chapter.intro && (
          <span className="e1-card-intro">{chapter.intro}</span>
        )}
      </div>
      <span className={`e1-card-group e1-group-${chapter.group}`}>
        {E1_GROUPS.find(g => g.id === chapter.group)?.label ?? chapter.group}
      </span>
    </button>
  );
}
