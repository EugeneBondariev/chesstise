// ── B2 Concept taxonomy ────────────────────────────────────────────────────
// B2 expands B1 concepts into subconcepts — each B1 motif gets dedicated games
// that isolate the specific sub-pattern.

export type B2ConceptGroup = 'opening' | 'structure' | 'tactic' | 'strategy' | 'endgame';

export interface B2Concept {
  id: string;
  label: string;
  group: B2ConceptGroup;
}

export const B2_CONCEPTS: B2Concept[] = [
  // Openings — secondary repertoire coverage ─────────────────────────────────
  { id: 'b2-o-vienna',          label: 'Vienna Game',               group: 'opening'   },
  { id: 'b2-o-petroff',         label: 'Petroff Defense',           group: 'opening'   },
  { id: 'b2-o-four-knights',    label: 'Four Knights',              group: 'opening'   },
  { id: 'b2-o-sicilian-kan',    label: 'Sicilian Kan / Taimanov',   group: 'opening'   },
  { id: 'b2-o-pirc',            label: 'Pirc / Modern Defense',     group: 'opening'   },
  { id: 'b2-o-alekhine',        label: "Alekhine's Defense",        group: 'opening'   },
  { id: 'b2-o-slav',            label: 'Slav Defense',              group: 'opening'   },
  { id: 'b2-o-benko',           label: 'Benko Gambit',              group: 'opening'   },
  { id: 'b2-o-dutch-stonewall', label: 'Dutch Stonewall',           group: 'opening'   },
  { id: 'b2-o-london',          label: 'London System',             group: 'opening'   },

  // Pawn Structures — extended ────────────────────────────────────────────────
  { id: 'b2-s-pawn-majority',   label: 'Pawn Majority',             group: 'structure' },
  { id: 'b2-s-doubled-pawns',   label: 'Doubled Pawns',             group: 'structure' },
  { id: 'b2-s-isolated-block',  label: 'Isolani Blockade',          group: 'structure' },
  { id: 'b2-s-weak-squares',    label: 'Weak Squares',              group: 'structure' },
  { id: 'b2-s-pawn-break',      label: 'Pawn Break',                group: 'structure' },

  // Tactical Subconcepts ──────────────────────────────────────────────────────
  { id: 'b2-t-fork-knight',     label: 'Knight Fork',               group: 'tactic'    },
  { id: 'b2-t-fork-pawn',       label: 'Pawn Fork',                 group: 'tactic'    },
  { id: 'b2-t-royal-fork',      label: 'Royal Fork (K+Q)',          group: 'tactic'    },
  { id: 'b2-t-family-fork',     label: 'Family Fork (3+ pieces)',   group: 'tactic'    },
  { id: 'b2-t-pin-absolute',    label: 'Absolute Pin',              group: 'tactic'    },
  { id: 'b2-t-pin-relative',    label: 'Relative Pin',              group: 'tactic'    },
  { id: 'b2-t-smothered',       label: 'Smothered Mate',            group: 'tactic'    },
  { id: 'b2-t-windmill',        label: 'Windmill',                  group: 'tactic'    },
  { id: 'b2-t-interference',    label: 'Interference',              group: 'tactic'    },
  { id: 'b2-t-xray',            label: 'X-ray Attack',              group: 'tactic'    },
  { id: 'b2-t-underpromo',      label: 'Underpromotion',            group: 'tactic'    },
  { id: 'b2-t-greek-gift',      label: 'Greek Gift (Bxh7+)',        group: 'tactic'    },
  { id: 'b2-t-desperado',       label: 'Desperado',                 group: 'tactic'    },
  { id: 'b2-t-mating-net',      label: 'Mating Net',                group: 'tactic'    },

  // Strategic Themes — subconcepts ────────────────────────────────────────────
  { id: 'b2-f-two-weaknesses',  label: 'Two-weakness Principle',    group: 'strategy'  },
  { id: 'b2-f-good-knight',     label: 'Good Knight vs Bad Bishop', group: 'strategy'  },
  { id: 'b2-f-space-squeeze',   label: 'Space Squeeze',             group: 'strategy'  },
  { id: 'b2-f-rook-behind-pp',  label: 'Rook Behind Passed Pawn',  group: 'strategy'  },
  { id: 'b2-f-minority-attack', label: 'Minority Attack',           group: 'strategy'  },
  { id: 'b2-f-piece-activity',  label: 'Maximum Piece Activity',    group: 'strategy'  },

  // Endgame Subconcepts ───────────────────────────────────────────────────────
  { id: 'b2-e-opposition',      label: 'K+P Opposition',            group: 'endgame'   },
  { id: 'b2-e-triangulation',   label: 'Triangulation',             group: 'endgame'   },
  { id: 'b2-e-wrong-bp',        label: 'Wrong-colour Bishop + RP',  group: 'endgame'   },
  { id: 'b2-e-bn-mate',         label: 'B+N Checkmate',             group: 'endgame'   },
  { id: 'b2-e-queen-vs-pawn',   label: 'Queen vs Advanced Pawn',    group: 'endgame'   },
  { id: 'b2-e-rook-vs-pawn',    label: 'Rook vs Advanced Pawn',     group: 'endgame'   },
  { id: 'b2-e-outside-pp',      label: 'Outside Passed Pawn',       group: 'endgame'   },
];

// ── Game entries ───────────────────────────────────────────────────────────────

export type B2Category =
  | 'tactics-sub'
  | 'strategy-sub'
  | 'endgame-sub'
  | 'openings-b2';

export interface B2Game {
  /** Route ID matching /games/:id — null while unverified. */
  id: string | null;
  title: string;
  label: string;
  concepts: string[];
  note: string;
  category: B2Category;
}

export const B2_GAMES: B2Game[] = [

  // ── Tactical Subconcepts ───────────────────────────────────────────────────

  {
    id:       null,
    title:    'Knight Fork — Decisive Blow',
    label:    'A short combinational game ending with a knight fork (pending)',
    concepts: ['b2-t-fork-knight', 'b2-t-fork-pawn'],
    note:     'The knight fork is the most-missed tactic at all levels: both pieces attacked simultaneously, neither can be defended. This game isolates the pure fork pattern from setup to execution.',
    category: 'tactics-sub',
  },
  {
    id:       null,
    title:    'Pawn Fork — Tempo Win',
    label:    'A game where a pawn fork gains a piece (pending)',
    concepts: ['b2-t-fork-pawn', 'b2-s-pawn-break'],
    note:     'A pawn fork attacks two pieces; because the pawn is worth less than either target, one piece must be given up. Recognising when a pawn advance creates a fork is an essential board-vision skill.',
    category: 'tactics-sub',
  },
  {
    id:       null,
    title:    'Royal Fork — Knight Humbles the King',
    label:    'A game decided by a knight forking king and queen (pending)',
    concepts: ['b2-t-royal-fork', 'b2-t-fork-knight'],
    note:     'The royal fork is game-ending: king must move, queen is lost. Seeing it five moves ahead — planning the knight route to that magic square — is what separates tactical players from beginners.',
    category: 'tactics-sub',
  },
  {
    id:       null,
    title:    'Family Fork — Knight Takes All',
    label:    'A game with a knight attacking king, queen and rook (pending)',
    concepts: ['b2-t-family-fork', 'b2-t-fork-knight'],
    note:     'The family fork attacks three pieces simultaneously: even if the king moves, two pieces remain under attack. Recognising the setup that leads here — and baiting the opponent into the trap — is the real skill.',
    category: 'tactics-sub',
  },
  {
    id:       null,
    title:    'Absolute Pin — Paralysed Piece',
    label:    'A game decided by an absolute pin on the king file (pending)',
    concepts: ['b2-t-pin-absolute', 'b2-t-fork-knight'],
    note:     "An absolute pin is total paralysis: the pinned piece cannot move at all — moving it exposes the king to check. Exploiting a pin means piling more attackers on the pinned piece than the opponent can bring defenders.",
    category: 'tactics-sub',
  },
  {
    id:       null,
    title:    'Relative Pin — Queen Under Fire',
    label:    'A game where a relative pin wins the queen (pending)',
    concepts: ['b2-t-pin-relative', 'b2-t-fork-pawn'],
    note:     "A relative pin is subtler: the pinned piece can technically move, but doing so loses the queen behind it. Distinguishing absolute from relative pins changes your calculation: a relatively pinned piece can sometimes break the pin by counter-attack.",
    category: 'tactics-sub',
  },
  {
    id:       null,
    title:    'Smothered Mate — Knight Delivers',
    label:    "Réti vs Tartakower, Vienna 1910 or similar (pending — Nf7# smothered mate)",
    concepts: ['b2-t-smothered', 'b2-t-royal-fork', 'b2-t-fork-knight'],
    note:     "The smothered mate is one of chess's most elegant finishes: the knight gives check on the rim, the king is suffocated by its own pieces, and no escape exists. Two or three forcing moves — that's all it takes once the position is ready.",
    category: 'tactics-sub',
  },
  {
    id:       null,
    title:    'Windmill — Perpetual Discovery',
    label:    'Torre vs Lasker, Moscow 1925  (windmill tactic, pending ID)',
    concepts: ['b2-t-windmill', 'b2-t-xray', 'b2-t-desperado'],
    note:     "Torre's windmill against the world champion: the bishop and rook alternate discovered checks, harvesting pieces each turn. Once the windmill starts, the opponent can only watch — one of the most forcing sequences in chess history.",
    category: 'tactics-sub',
  },
  {
    id:       null,
    title:    'Interference — Line Cut',
    label:    'A game where an interference sacrifice cuts a defending line (pending)',
    concepts: ['b2-t-interference', 'b2-t-xray'],
    note:     "Interference places a piece on a square that disrupts two defensive pieces at once — cutting the communication between rook and queen, or bishop and rook. One sacrifice, two pieces suddenly disconnected.",
    category: 'tactics-sub',
  },
  {
    id:       null,
    title:    'X-ray Attack — Invisible Threat',
    label:    'A game where an x-ray through a piece wins material (pending)',
    concepts: ['b2-t-xray', 'b2-t-pin-absolute'],
    note:     "The x-ray (or skewer's cousin) attacks through a piece: the front piece is forced to move, exposing the piece behind to capture. Rooks and bishops create x-ray pressure constantly — learning to see through pieces is fundamental to calculation.",
    category: 'tactics-sub',
  },
  {
    id:       null,
    title:    'Underpromotion — Knight Saves the Day',
    label:    'A game with a forced underpromotion to knight (pending)',
    concepts: ['b2-t-underpromo', 'b2-t-mating-net'],
    note:     "Underpromotion to a knight — the most counterintuitive move in chess — sometimes avoids stalemate, creates a fork, or escapes a mating net. Remembering to consider all four promotion options is a calculation discipline.",
    category: 'tactics-sub',
  },
  {
    id:       null,
    title:    'Greek Gift — Bishop Sacrifice on h7',
    label:    'A classic Bxh7+ sacrifice game (pending)',
    concepts: ['b2-t-greek-gift', 'b2-t-mating-net', 'b2-t-fork-knight'],
    note:     "The Greek gift (Bxh7+, Ng5+, Qh5) is the most common sacrifice in classical chess. Visualising the king hunt three moves ahead — king drawn to h6, knight arriving on g5, queen coming to h5 — requires training both calculation and pattern recognition.",
    category: 'tactics-sub',
  },
  {
    id:       null,
    title:    'Desperado — Exploding Piece',
    label:    'A game where a desperado piece causes maximum damage (pending)',
    concepts: ['b2-t-desperado', 'b2-t-interference'],
    note:     "A desperado piece is about to be captured anyway, so it trades itself for maximum material or disruption. Recognising when a piece is truly lost — and making it die profitably — is a practical skill that matters in mutual attack positions.",
    category: 'tactics-sub',
  },
  {
    id:       null,
    title:    'Mating Net — Coordination',
    label:    'A game where pieces converge to construct an inescapable mating net (pending)',
    concepts: ['b2-t-mating-net', 'b2-f-piece-activity'],
    note:     "A mating net is not a single tactic but a coordinated convergence: bishops control diagonals, rooks cut off ranks, the queen delivers the final blow. Learning to visualise the net before it fully tightens is the essence of attacking chess.",
    category: 'tactics-sub',
  },

  // ── Strategic Subconcepts ──────────────────────────────────────────────────

  {
    id:       null,
    title:    'Two Weaknesses — Capablanca Blueprint',
    label:    'A Capablanca endgame applying the two-weakness principle (pending)',
    concepts: ['b2-f-two-weaknesses', 'b2-f-piece-activity', 'b2-s-pawn-majority'],
    note:     "One weakness can be defended; two cannot. Capablanca's technique: fix one weakness, then open a second front elsewhere. The defender runs out of moves trying to cover both. This principle wins more practical endgames than any single tactic.",
    category: 'strategy-sub',
  },
  {
    id:       null,
    title:    'Good Knight vs Bad Bishop',
    label:    'A positional game where a knight dominates a bad bishop (pending)',
    concepts: ['b2-f-good-knight', 'b2-s-weak-squares', 'b2-f-two-weaknesses'],
    note:     "When all pawns are on the same colour as the bishop, the bishop becomes a tall pawn — blocked by its own structure. The knight, free to jump between colours, occupies an outpost on the wrong-coloured squares. This imbalance alone can win.",
    category: 'strategy-sub',
  },
  {
    id:       null,
    title:    'Space Squeeze — Petrosian Style',
    label:    'A game where space advantage creates a slow bind (pending)',
    concepts: ['b2-f-space-squeeze', 'b2-s-weak-squares', 'b2-f-piece-activity'],
    note:     "A space advantage is not about tactics — it is about restricting the opponent's pieces until they have no good moves. The squeeze tightens gradually: each pawn advance cuts another square, until the position collapses under its own weight.",
    category: 'strategy-sub',
  },
  {
    id:       null,
    title:    "Rook Behind the Passed Pawn — Breyer's Rule",
    label:    "A game demonstrating the rook behind the passed pawn principle (pending)",
    concepts: ['b2-f-rook-behind-pp', 'b2-s-pawn-majority', 'b2-e-outside-pp'],
    note:     "Always place your rook behind passed pawns — your own or the opponent's. Behind your pawn, the rook's power grows with each advance. Behind the opponent's, it restrains it for free. Tarrasch's rule, applied by every endgame master.",
    category: 'strategy-sub',
  },
  {
    id:       null,
    title:    'Pawn Majority — Conversion',
    label:    'A game converting a queenside pawn majority into a passed pawn (pending)',
    concepts: ['b2-s-pawn-majority', 'b2-f-rook-behind-pp', 'b2-e-outside-pp'],
    note:     "A healthy pawn majority produces a passed pawn. The technique — using the majority pawn levers correctly, not blocking the majority with your own pieces — is one of the most underappreciated conversion skills.",
    category: 'strategy-sub',
  },
  {
    id:       null,
    title:    'Weak Squares — Color Complex',
    label:    'A game exploiting a permanent color weakness in the opponent\'s camp (pending)',
    concepts: ['b2-s-weak-squares', 'b2-f-good-knight', 'b2-f-piece-activity'],
    note:     "When the fianchetto bishop is traded or the pawns have locked onto one color, a whole complex of squares becomes permanently accessible to the opponent's pieces. A knight or bishop occupying those squares can dominate for the entire game.",
    category: 'strategy-sub',
  },
  {
    id:       null,
    title:    'Pawn Break — Opening the Position',
    label:    'A game where the right pawn break transforms the position (pending)',
    concepts: ['b2-s-pawn-break', 'b2-f-piece-activity', 'b2-s-pawn-majority'],
    note:     "Every closed pawn structure has a characteristic pawn break — d5 in the KID, c5 in the French, f5 in the KIA. Timing the break is everything: too early and you open lines for the opponent, too late and you suffocate.",
    category: 'strategy-sub',
  },

  // ── Endgame Subconcepts ────────────────────────────────────────────────────

  {
    id:       null,
    title:    'K+P Opposition — Key Squares',
    label:    'A pure king and pawn endgame demonstrating opposition and key squares (pending)',
    concepts: ['b2-e-opposition', 'b2-s-pawn-majority'],
    note:     "In king-and-pawn endings, the king must reach a 'key square' — the three squares on the 6th rank in front of the pawn (or one rank further for rook pawns). Opposition — the kings facing each other with one square between — is the tool to reach them.",
    category: 'endgame-sub',
  },
  {
    id:       null,
    title:    'Triangulation — Losing a Tempo',
    label:    'A king-and-pawn endgame where triangulation transfers the move (pending)',
    concepts: ['b2-e-triangulation', 'b2-e-opposition'],
    note:     "When direct opposition fails, triangulation lets the king take three steps to do one step's work, losing a tempo to transfer the move to the opponent. It looks impossible from the outside — the king takes three moves to reach the square one move away.",
    category: 'endgame-sub',
  },
  {
    id:       null,
    title:    "Wrong-colour Bishop + Rook Pawn — Saving Draw",
    label:    "A game saved by the wrong-colour bishop and rook pawn draw technique (pending)",
    concepts: ['b2-e-wrong-bp', 'b2-e-opposition'],
    note:     "The rook pawn + wrong-colour bishop is a theoretical draw: the bishop cannot control the promotion square, so the king simply shelters in the corner. No matter how perfectly White plays, the pawn cannot be promoted if Black finds the correct setup.",
    category: 'endgame-sub',
  },
  {
    id:       null,
    title:    'B+N Checkmate — The Long Technique',
    label:    'A game demonstrating the bishop and knight mating technique (pending)',
    concepts: ['b2-e-bn-mate', 'b2-f-piece-activity'],
    note:     "Bishop and knight deliver checkmate in at most 34 moves from any position, but the technique is notoriously difficult: the king must be driven to a corner that matches the bishop's colour. This is the hardest endgame technique every complete player must know.",
    category: 'endgame-sub',
  },
  {
    id:       null,
    title:    'Queen vs Advanced Pawn — Stalling',
    label:    'A game demonstrating queen vs. 7th-rank pawn technique (pending)',
    concepts: ['b2-e-queen-vs-pawn', 'b2-e-opposition'],
    note:     "Queen vs. advanced pawn (other than bishop pawn) is a win, but requires precise technique: the queen keeps checking, forcing the defending king to block the pawn, and the attacking king advances each time. Centre and knight pawns draw; rook and bishop pawns draw.",
    category: 'endgame-sub',
  },
  {
    id:       null,
    title:    'Outside Passed Pawn — Decisive Diversion',
    label:    'A game where an outside passed pawn wins a pawn endgame (pending)',
    concepts: ['b2-e-outside-pp', 'b2-s-pawn-majority', 'b2-e-opposition'],
    note:     "An outside passed pawn on the a- or b-file forces the opponent's king to chase it across the board, leaving the kingside pawns undefended. The attacking king rushes in and captures them — a clean, decisive technique.",
    category: 'endgame-sub',
  },

  // ── Secondary Openings ─────────────────────────────────────────────────────

  {
    id:       null,
    title:    'Vienna Game — Aggressive Gambit',
    label:    'A Vienna Gambit attacking game (pending)',
    concepts: ['b2-o-vienna', 'b2-t-greek-gift', 'b2-t-mating-net'],
    note:     "The Vienna (2.Nc3) develops the knight before the bishop, keeping options for f4 and an early pawn storm. The Vienna Gambit (2.Nc3 Nc6 3.f4) is an underrated attacking weapon — many Black players are unprepared for the sharpness.",
    category: 'openings-b2',
  },
  {
    id:       null,
    title:    'Petroff Defense — Solid Counter',
    label:    "A Petroff Defense game showing Black's solid counterplay (pending)",
    concepts: ['b2-o-petroff', 'b2-f-piece-activity', 'b2-e-rook-vs-pawn'],
    note:     "The Petroff (2...Nf6 in reply to e4-e5) is the solid 'draw-with-Black' defence: symmetry, simplification, endgame technique. Players who face the Petroff must accept that winning requires patience; those who play it must know the technical endgames.",
    category: 'openings-b2',
  },
  {
    id:       null,
    title:    'Sicilian Kan / Taimanov — Flexible Defense',
    label:    'A Sicilian Kan game showing the flexible pawn structure (pending)',
    concepts: ['b2-o-sicilian-kan', 'b2-s-pawn-break', 'b2-f-piece-activity'],
    note:     "The Kan (4...a6) and Taimanov (4...Nc6) are the most flexible Sicilian systems: no commitments until White shows his hand. The e6/a6 pawn setup supports both ...d5 and ...b5 breaks, making it extremely hard to prepare against.",
    category: 'openings-b2',
  },
  {
    id:       null,
    title:    'Slav Defense — Solid Queenside',
    label:    'A Slav Defense game demonstrating the solid pawn structure (pending)',
    concepts: ['b2-o-slav', 'b2-s-pawn-majority', 'b2-f-minority-attack'],
    note:     "The Slav maintains the c6 pawn, keeping the diagonal for the c8 bishop — the key improvement over the QGD. The resulting pawn structures are rich: IQP, minority attack, and hanging pawns all emerge from the same complex.",
    category: 'openings-b2',
  },
  {
    id:       null,
    title:    'Benko Gambit — Dynamic Queenside',
    label:    'A Benko Gambit game showing long-term initiative for a pawn (pending)',
    concepts: ['b2-o-benko', 'b2-s-pawn-break', 'b2-f-rook-behind-pp', 'b2-f-piece-activity'],
    note:     "The Benko sacrifices a pawn on move 3 for permanent queenside pressure: open a- and b-files, rooks bearing down, White's queen-side paralysed. The compensation is not tactical but structural and positional — a different kind of initiative.",
    category: 'openings-b2',
  },
  {
    id:       null,
    title:    'Dutch Stonewall — Fortress Attack',
    label:    'A Dutch Stonewall game with kingside attack behind the structure (pending)',
    concepts: ['b2-o-dutch-stonewall', 'b2-s-weak-squares', 'b2-t-mating-net'],
    note:     "The Stonewall (d5/e6/f5/c6) builds an impenetrable wall but creates a permanent e5 hole for White. Black attacks on the kingside; White exploits the dark squares. The imbalance is permanent and unresolvable — perfect for people who like the same pawn structure every game.",
    category: 'openings-b2',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

export const B2_CONCEPT_MAP = new Map(B2_CONCEPTS.map(c => [c.id, c]));

export const B2_GROUP_LABELS: Record<B2ConceptGroup, string> = {
  opening:   'Openings',
  structure: 'Pawn Structures',
  tactic:    'Tactics',
  strategy:  'Strategy',
  endgame:   'Endgames',
};

export const B2_CATEGORY_LABELS: Record<B2Category, string> = {
  'tactics-sub':  'Tactical Subconcepts',
  'strategy-sub': 'Strategic Subconcepts',
  'endgame-sub':  'Endgame Subconcepts',
  'openings-b2':  'Secondary Openings',
};

export function b2GamesForConcept(conceptId: string): B2Game[] {
  return B2_GAMES.filter(g => g.concepts.includes(conceptId));
}
