// ── Concept taxonomy ──────────────────────────────────────────────────────────

export type ConceptGroup = 'opening' | 'structure' | 'tactic' | 'strategy' | 'endgame';

export interface Concept {
  id: string;
  label: string;
  group: ConceptGroup;
}

export const CONCEPTS: Concept[] = [
  // Openings ─────────────────────────────────────────────────────────────────
  { id: 'o-kings-gambit', label: "King's Gambit",           group: 'opening'   },
  { id: 'o-italian',      label: 'Italian / Evans Gambit',  group: 'opening'   },
  { id: 'o-scotch',       label: 'Scotch / Vienna',         group: 'opening'   },
  { id: 'o-philidor',     label: 'Philidor Defense',        group: 'opening'   },
  { id: 'o-ruy-lopez',    label: 'Ruy Lopez',               group: 'opening'   },
  { id: 'o-berlin',       label: 'Berlin Defense',          group: 'opening'   },
  { id: 'o-french',       label: 'French Defense',          group: 'opening'   },
  { id: 'o-caro-kann',    label: 'Caro-Kann',               group: 'opening'   },
  { id: 'o-najdorf',      label: 'Sicilian Najdorf',        group: 'opening'   },
  { id: 'o-dragon',       label: 'Sicilian Dragon',         group: 'opening'   },
  { id: 'o-sicilian',     label: 'Open Sicilian',           group: 'opening'   },
  { id: 'o-english',      label: 'English Opening',         group: 'opening'   },
  { id: 'o-qgd',          label: "Queen's Gambit",          group: 'opening'   },
  { id: 'o-nimzo',        label: 'Nimzo-Indian',            group: 'opening'   },
  { id: 'o-qid',          label: "Queen's Indian",          group: 'opening'   },
  { id: 'o-grunfeld',     label: 'Grünfeld Defense',        group: 'opening'   },
  { id: 'o-kid',          label: "King's Indian",           group: 'opening'   },
  { id: 'o-benoni',       label: 'Benoni Defense',          group: 'opening'   },
  { id: 'o-catalan',      label: 'Catalan Opening',         group: 'opening'   },
  { id: 'o-dutch',        label: 'Dutch Defense',           group: 'opening'   },
  // Pawn Structures ──────────────────────────────────────────────────────────
  { id: 's-iqp',          label: 'Isolated Queen Pawn',     group: 'structure' },
  { id: 's-hanging',      label: 'Hanging Pawns',           group: 'structure' },
  { id: 's-passed',       label: 'Passed Pawn',             group: 'structure' },
  { id: 's-pawn-chain',   label: 'Pawn Chain',              group: 'structure' },
  { id: 's-backward',     label: 'Backward Pawn',           group: 'structure' },
  { id: 's-pawn-storm',   label: 'Pawn Storm',              group: 'structure' },
  { id: 's-hedgehog',     label: 'Hedgehog Structure',      group: 'structure' },
  { id: 's-benoni-struct',label: 'Benoni Structure (c5 vs d5)', group: 'structure' },
  { id: 's-dragon-struct',label: 'Dragon / Dark-square Complex', group: 'structure' },
  { id: 's-minority',     label: 'Minority Attack',         group: 'structure' },
  // Tactical Motifs ──────────────────────────────────────────────────────────
  { id: 't-pin',          label: 'Pin',                     group: 'tactic'    },
  { id: 't-fork',         label: 'Fork',                    group: 'tactic'    },
  { id: 't-discovered',   label: 'Discovered Attack',       group: 'tactic'    },
  { id: 't-dbl-check',    label: 'Double Check',            group: 'tactic'    },
  { id: 't-back-rank',    label: 'Back-rank Mate',          group: 'tactic'    },
  { id: 't-queen-sac',    label: 'Queen Sacrifice',         group: 'tactic'    },
  { id: 't-exch-sac',     label: 'Exchange Sacrifice',      group: 'tactic'    },
  { id: 't-clearance',    label: 'Clearance',               group: 'tactic'    },
  { id: 't-skewer',       label: 'Skewer',                  group: 'tactic'    },
  { id: 't-deflection',   label: 'Deflection',              group: 'tactic'    },
  { id: 't-decoy',        label: 'Decoy / Lure',            group: 'tactic'    },
  { id: 't-overload',     label: 'Overloading',             group: 'tactic'    },
  { id: 't-zwischenzug',  label: 'Zwischenzug',             group: 'tactic'    },
  { id: 't-remove-def',   label: 'Removing the Defender',   group: 'tactic'    },
  { id: 't-trap',         label: 'Trapping a Piece',        group: 'tactic'    },
  { id: 't-perpetual',    label: 'Perpetual Check',         group: 'tactic'    },
  { id: 't-stalemate',    label: 'Stalemate',               group: 'tactic'    },
  // Strategic Themes ─────────────────────────────────────────────────────────
  { id: 'f-development',  label: 'Development Lead',        group: 'strategy'  },
  { id: 'f-outpost',      label: 'Outpost',                 group: 'strategy'  },
  { id: 'f-7th-rank',     label: '7th Rank Rook',           group: 'strategy'  },
  { id: 'f-bishop-pair',  label: 'Bishop Pair',             group: 'strategy'  },
  { id: 'f-bad-bishop',   label: 'Bad Bishop',              group: 'strategy'  },
  { id: 'f-color-complex',label: 'Colour Complex',          group: 'strategy'  },
  { id: 'f-zugzwang',     label: 'Zugzwang',                group: 'strategy'  },
  { id: 'f-prophylaxis',  label: 'Prophylaxis',             group: 'strategy'  },
  { id: 'f-open-file',    label: 'Open File Control',       group: 'strategy'  },
  { id: 'f-opp-castle',   label: 'Opposite Castling',       group: 'strategy'  },
  { id: 'f-king-march',   label: 'King March',              group: 'strategy'  },
  // Endgame Types ────────────────────────────────────────────────────────────
  { id: 'e-rook',         label: 'Rook Ending',             group: 'endgame'   },
  { id: 'e-lucena',       label: 'Lucena / Active Rook',    group: 'endgame'   },
  { id: 'e-philidor-end', label: 'Philidor / Passive Defense', group: 'endgame' },
  { id: 'e-queen',        label: 'Queen Ending',            group: 'endgame'   },
  { id: 'e-bishop-same',  label: 'Same-colour Bishops',     group: 'endgame'   },
  { id: 'e-bishop-opp',   label: 'Opp-colour Bishops',      group: 'endgame'   },
  { id: 'e-knight-bishop',label: 'Knight vs Bishop',        group: 'endgame'   },
  { id: 'e-pawn',         label: 'Pawn Ending',             group: 'endgame'   },
  { id: 'e-king-active',  label: 'Active King',             group: 'endgame'   },
  { id: 'e-fortress',     label: 'Fortress / Draw Defense', group: 'endgame'   },
];

// ── Game entries ──────────────────────────────────────────────────────────────

export type GameCategory =
  | 'e4-openings'
  | 'd4-c4-openings'
  | 'tactics-attack'
  | 'endgame';

export interface BlueprintGame {
  /** Route ID matching /games/:id — null while the game number is still being verified. */
  id: string | null;
  title: string;
  label: string;
  concepts: string[];
  note: string;
  category: GameCategory;
}

export const BLUEPRINT_GAMES: BlueprintGame[] = [

  // ── 1.e4 e5 ───────────────────────────────────────────────────────────────
  {
    id:       'morphy-124',
    title:    'Development & Attack',
    label:    'Morphy vs Duke of Brunswick, Paris 1858  (Philidor)',
    concepts: ['o-philidor', 't-pin', 't-fork', 't-back-rank', 'f-7th-rank', 'f-development'],
    note:     'Every move serves development; the rook on the 7th rank seals it — the textbook game of classical principles.',
    category: 'e4-openings',
  },
  {
    id:       'anderssen-54',
    title:    "King's Gambit — The Immortal",
    label:    "Anderssen vs Kieseritzky, London 1851  (King's Gambit)",
    concepts: ['o-kings-gambit', 't-dbl-check', 't-queen-sac', 't-clearance', 'f-opp-castle', 's-pawn-storm'],
    note:     'Every attacking device — double check, queen sacrifice, clearance — compressed into 23 moves.',
    category: 'e4-openings',
  },
  {
    id:       'capablanca-525',
    title:    'Italian Game — Classical Technique',
    label:    'Capablanca vs Eliskases, Moscow 1936  (Italian C50)',
    concepts: ['o-italian', 'f-bishop-pair', 'f-outpost', 'f-open-file', 's-passed', 'e-king-active'],
    note:     "The most-played modern opening: Capablanca's technique in the Italian shows bishop pair domination and a winning endgame.",
    category: 'e4-openings',
  },
  {
    id:       'tal-357',
    title:    'French Winawer — Pawn Chain & Attack',
    label:    'Tal vs Botvinnik, WC 1960 Game 1  (French)',
    concepts: ['o-french', 's-pawn-chain', 't-exch-sac', 't-deflection', 'f-opp-castle', 'f-color-complex'],
    note:     "Tal's supreme gamble: exchange sacrifice demolishes the pawn chain's base while kings castle opposite.",
    category: 'e4-openings',
  },
  {
    id:       null,
    title:    'Sicilian Najdorf — Poisoned Pawn',
    label:    'Fischer vs Spassky, WC 1972 Game 11  (Najdorf B97)',
    concepts: ['o-najdorf', 'o-sicilian', 'f-opp-castle', 't-zwischenzug', 't-deflection', 's-backward'],
    note:     'The sharpest line in chess: opposite castling, pawn grab, and a forced tactical sequence that must be calculated to the end.',
    category: 'e4-openings',
  },
  {
    id:       'karpov-171',
    title:    'Sicilian Dragon — Yugoslav Attack',
    label:    'Karpov vs Byrne, San Antonio 1972  (Dragon B77)',
    concepts: ['o-dragon', 'o-sicilian', 's-dragon-struct', 'f-opp-castle', 't-remove-def', 'f-color-complex'],
    note:     "White storms the kingside, Black races on the c-file — the Dragon's opposite-attack race at its purest.",
    category: 'e4-openings',
  },
  {
    id:       'carlsen-1586',
    title:    'Berlin Defense — Squeeze Endgame',
    label:    'Anand vs Carlsen, WCh 2013 Game 6  (Berlin)',
    concepts: ['o-berlin', 'o-ruy-lopez', 'e-rook', 'e-knight-bishop', 's-passed', 'e-king-active', 'f-bad-bishop'],
    note:     'The Berlin endgame in modern practice: Carlsen demonstrates 45 moves of microscopic pressure from an equal-looking position.',
    category: 'e4-openings',
  },

  // ── 1.d4 / 1.c4 ───────────────────────────────────────────────────────────
  {
    id:       'karpov-650',
    title:    'English Opening — The Hedgehog',
    label:    'Karpov vs Andersson, Tilburg 1980  (English/Hedgehog)',
    concepts: ['o-english', 's-hedgehog', 'f-prophylaxis', 'f-outpost', 'f-open-file', 'f-color-complex'],
    note:     "The definitive Hedgehog game: Black waits on a6/b6/d6/e6 until White over-extends — Karpov doesn't let him.",
    category: 'd4-c4-openings',
  },
  {
    id:       'fischer-516',
    title:    'Modern Benoni — Dynamic Imbalance',
    label:    'Pomar vs Fischer, Havana Olympiad 1966  (Benoni A69)',
    concepts: ['o-benoni', 's-benoni-struct', 's-pawn-storm', 'f-color-complex', 'f-open-file', 't-deflection'],
    note:     "Fischer wins as Black in the Benoni: the c5-vs-d5 structure creates a race where dynamic play beats solid technique.",
    category: 'd4-c4-openings',
  },
  {
    id:       'nimzowitsch-196',
    title:    "Queen's Indian — Prophylaxis & Zugzwang",
    label:    "Nimzowitsch vs Saemisch, Copenhagen 1923  (QID)",
    concepts: ['o-qid', 'f-prophylaxis', 'f-zugzwang', 's-passed', 'f-outpost', 'f-open-file'],
    note:     "The immortal zugzwang: prophylaxis so complete that White's only moves lose — every square is denied.",
    category: 'd4-c4-openings',
  },
  {
    id:       'fischer-778',
    title:    "Queen's Gambit — IQP into Rook Ending",
    label:    'Fischer vs Spassky, WC 1972 Game 6  (QGD D59)',
    concepts: ['o-qgd', 's-iqp', 's-minority', 'f-bishop-pair', 'e-rook', 'f-open-file'],
    note:     'The clearest technique game ever: IQP pressure converted step-by-step into a rook endgame — no drama, no errors.',
    category: 'd4-c4-openings',
  },
  {
    id:       'petrosian-958',
    title:    "King's Indian — Exchange Sacrifice & Bind",
    label:    "Petrosian vs Spassky, WC 1966 Game 10  (KID)",
    concepts: ['o-kid', 't-exch-sac', 'f-prophylaxis', 'f-outpost', 's-pawn-storm', 'f-king-march'],
    note:     "KID from White's side: the exchange sacrifice kills Black's counterplay and the king marches to decide.",
    category: 'd4-c4-openings',
  },
  {
    id:       null,
    title:    'Scotch Game — Open Centre',
    label:    'Kasparov vs Karpov, WC 1990  (Scotch C45)',
    concepts: ['o-scotch', 'f-bishop-pair', 'f-open-file', 't-overload', 'f-outpost', 's-passed'],
    note:     "Kasparov revives the 19th-century Scotch: early d4 opens the centre and the bishop pair finds highways.",
    category: 'd4-c4-openings',
  },

  // ── Tactical Masterpieces ──────────────────────────────────────────────────
  {
    id:       'kasparov-1510',
    title:    'The Immortal 1999 — King March & Sacrifice',
    label:    'Kasparov vs Topalov, Wijk aan Zee 1999',
    concepts: ['t-exch-sac', 't-clearance', 'f-king-march', 'f-7th-rank', 's-passed', 't-remove-def', 't-decoy'],
    note:     'The king marches forward, the rook goes everywhere — exchange sacrifice plus clearance plus decoy, all in one.',
    category: 'tactics-attack',
  },
  {
    id:       null,
    title:    'Skewer, Deflection & Overloading',
    label:    'A dedicated tactical game (pending selection)',
    concepts: ['t-skewer', 't-deflection', 't-overload', 't-trap', 't-zwischenzug'],
    note:     'The three tactical motifs missing from the Immortal/Opera repertoire: skewer, overloading a defender, and trapping a piece.',
    category: 'tactics-attack',
  },

  // ── Endgame Mastery ────────────────────────────────────────────────────────
  {
    id:       'rubinstein-217',
    title:    'Rook Ending — Active King & Technique',
    label:    'Rubinstein vs Lasker, St. Petersburg 1909',
    concepts: ['o-qgd', 's-hanging', 'e-rook', 'e-lucena', 'e-king-active', 's-passed', 'f-open-file'],
    note:     'The greatest rook ending: Rubinstein activates his king, outplays the world champion move by move.',
    category: 'endgame',
  },
  {
    id:       'capablanca-355',
    title:    'Knight vs Bishop — King Activity',
    label:    'Tarrasch vs Capablanca, Berlin 1928  (Ruy Lopez)',
    concepts: ['o-ruy-lopez', 'e-knight-bishop', 'e-king-active', 's-passed', 'e-pawn', 'f-bad-bishop'],
    note:     "Knight dominates bishop; the king marches in; the passed pawn decides — Capablanca's endgame ABC.",
    category: 'endgame',
  },
  {
    id:       null,
    title:    'Queen Ending — Pawn Race & Stalemate',
    label:    'Capablanca vs Eliskases, Moscow 1936 (or other, pending)',
    concepts: ['e-queen', 't-stalemate', 'e-king-active', 's-passed', 'f-king-march'],
    note:     'Pure queen ending: pawn races, the stalemate trap as a saving resource, and queen vs. passed pawn technique.',
    category: 'endgame',
  },
  {
    id:       null,
    title:    'Drawing Resources — Perpetual & Fortress',
    label:    'Fischer vs Spassky, WC 1972 (drawn game, pending)',
    concepts: ['t-perpetual', 't-stalemate', 'e-fortress', 'f-prophylaxis', 'e-philidor-end'],
    note:     'The complete drawing toolkit: perpetual check as salvation, the stalemate trick, the fortress hold — you must know these.',
    category: 'endgame',
  },
];

// ── Coverage helpers ──────────────────────────────────────────────────────────

export const CONCEPT_MAP = new Map(CONCEPTS.map(c => [c.id, c]));

export const GROUP_LABELS: Record<ConceptGroup, string> = {
  opening:   'Openings',
  structure: 'Pawn Structures',
  tactic:    'Tactics',
  strategy:  'Strategy',
  endgame:   'Endgames',
};

export const CATEGORY_LABELS: Record<GameCategory, string> = {
  'e4-openings':    '1.e4 Openings',
  'd4-c4-openings': '1.d4 / 1.c4 Openings',
  'tactics-attack': 'Tactical Masterpieces',
  'endgame':        'Endgame Mastery',
};

/** Games (in order) that cover a given concept. */
export function gamesForConcept(conceptId: string): BlueprintGame[] {
  return BLUEPRINT_GAMES.filter(g => g.concepts.includes(conceptId));
}
