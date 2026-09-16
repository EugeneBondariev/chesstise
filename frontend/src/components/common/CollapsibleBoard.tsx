import { useState, useEffect } from 'react';

interface Props {
  children: (orientation: 'white' | 'black') => React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
  defaultOrientation?: 'white' | 'black';
}

export default function CollapsibleBoard({ children, isExpanded, onToggle, defaultOrientation = 'white' }: Props) {
  const [localVisible, setLocalVisible] = useState(true);
  const [flipped, setFlipped] = useState(false);

  const visible = isExpanded !== undefined ? isExpanded : localVisible;
  const toggle  = onToggle ?? (() => setLocalVisible(v => !v));

  useEffect(() => { setFlipped(false); }, [defaultOrientation]);

  const orientation: 'white' | 'black' = flipped
    ? (defaultOrientation === 'white' ? 'black' : 'white')
    : defaultOrientation;

  return (
    <div className="collapsible-board">
      <div className="board-toggle-row">
        <button className="board-toggle-btn" onClick={toggle} aria-expanded={visible}>
          {visible ? 'Hide board ▲' : 'Show board ▼'}
        </button>
        <button
          className="board-flip-btn"
          onClick={() => setFlipped(f => !f)}
          aria-label="Flip board"
          title="Flip board"
        >
          ⇅ Flip
        </button>
      </div>
      {visible && <div className="board-wrap">{children(orientation)}</div>}
    </div>
  );
}
