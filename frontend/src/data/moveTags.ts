export interface TagGroup {
  label: string;
  tags: string[];
}

export const MOVE_TAG_GROUPS: TagGroup[] = [
  {
    label: 'Tactical (opponent found)',
    tags: [
      'Back-rank mate', 'Smothered mate', 'Fork — knight', 'Fork — queen/other',
      'Pin exploitation', 'Skewer', 'Discovered attack', 'Deflection',
      'Decoy / attraction', 'Overloaded piece', 'Removing the defender',
      'Zwischenzug missed', 'Trapped piece',
    ],
  },
  {
    label: 'Own tactical error',
    tags: [
      'Piece left en prise', 'Miscalculated exchange', 'One-move blindness', 'Missed recapture',
    ],
  },
  {
    label: 'Strategic / positional',
    tags: [
      'Weak king (no castle)', 'Castled into attack', 'Outpost knight dominant',
      'Bad bishop', 'Weak pawns (isolated/doubled)', 'Open file lost', 'Space squeeze',
    ],
  },
  {
    label: 'Endgame',
    tags: [
      'Pawn endgame misplay', 'King too passive', 'Zugzwang',
      'Wrong rook technique', 'Passed pawn underestimated',
    ],
  },
  {
    label: 'Opening',
    tags: ['Walked into prep', 'Early opening blunder', 'Lost in unfamiliar territory'],
  },
  {
    label: 'Meta / psychological',
    tags: [
      'Complacency vs lower-rated', 'Premature attack', 'Underestimated counter-play',
      'Time pressure blunder', 'Flagged',
    ],
  },
];
