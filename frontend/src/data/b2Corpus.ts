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
    id:       'capablanca-209',
    title:    'Two Weaknesses — Capablanca Blueprint',
    label:    'Lasker vs Capablanca, World Championship 1921',
    concepts: ['b2-f-two-weaknesses', 'b2-f-piece-activity', 'b2-s-pawn-majority'],
    note:     "Capablanca beats the World Champion with one of the clearest demonstrations of the two-weakness principle ever played: he fixes a queenside weakness, then opens a second front on the kingside, and Lasker runs out of moves trying to defend both. 68 moves of pure technique.",
    category: 'strategy-sub',
  },
  {
    id:       'karpov-207',
    title:    'Good Knight vs Bad Bishop',
    label:    'Karpov vs Hort, Budapest 1973',
    concepts: ['b2-f-good-knight', 'b2-s-weak-squares', 'b2-f-two-weaknesses'],
    note:     "After piece exchanges Karpov reaches a knight vs bishop endgame where Black's dark-squared bishop is locked behind its own pawns. The knight manoeuvres freely between colours, eventually achieving zugzwang. A 45-move clinic on the bishop becoming a tall pawn.",
    category: 'strategy-sub',
  },
  {
    id:       'petrosian-817',
    title:    'Space Squeeze — Petrosian Style',
    label:    'Petrosian vs Botvinnik, World Championship 1963',
    concepts: ['b2-f-space-squeeze', 'b2-s-weak-squares', 'b2-f-piece-activity'],
    note:     "Petrosian advances his queenside pawns to b5 and a5, fixes Black's structure, seizes the seventh rank, and denies Botvinnik any counterplay. In 48 moves the former World Champion simply collapses — not from any single mistake, but from running out of good moves entirely.",
    category: 'strategy-sub',
  },
  {
    id:       'rubinstein-396',
    title:    "Rook Behind the Passed Pawn — Breyer's Rule",
    label:    'Rubinstein vs Nimzowitsch, Gothenburg 1920',
    concepts: ['b2-f-rook-behind-pp', 'b2-s-pawn-majority', 'b2-e-outside-pp'],
    note:     "Rubinstein uses his rook on the f-file to support a passed pawn from behind, then advances his king into the centre while the rook keeps pushing. Against another great theoretician (Nimzowitsch), a 60-move demonstration of why the rook belongs behind its own passed pawns.",
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
    label:    "A game exploiting a permanent color weakness in the opponent's camp (pending)",
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
    id:       'capablanca-187',
    title:    'K+P Opposition — Key Squares',
    label:    'Capablanca vs Conde, Hastings 1919',
    concepts: ['b2-e-opposition', 'b2-s-pawn-majority'],
    note:     "After all pieces trade off, Capablanca's king marches to key squares (Ke4, Kd3) and the outside passed g-pawn creates an unstoppable queenside duo. A 46-move pristine demonstration of K+P opposition, key-square theory, and pawn-majority conversion in one game.",
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
    id:       'smyslov-338',
    title:    "Wrong-colour Bishop + Rook Pawn — Saving Draw",
    label:    'Smyslov vs Averbakh, USSR Championship 1950',
    concepts: ['b2-e-wrong-bp', 'b2-e-opposition'],
    note:     "After winning a pawn on move 46, Smyslov cannot convert because his dark-squared bishop cannot control the a8 promotion square. Averbakh's king shelters on c8, completely immune to any progress. A 63-move textbook demonstration of the wrong-colour bishop draw — one of the most important defensive saves in practical endgames.",
    category: 'endgame-sub',
  },
  {
    id:       null,
    title:    'B+N Checkmate — The Long Technique',
    label:    'A game demonstrating the bishop and knight mating technique (pending)',
    concepts: ['b2-e-bn-mate', 'b2-f-piece-activity'],
    note:     "Bishop and knight deliver checkmate in at most 34 moves from any position, but the technique is notoriously difficult: the king must be driven to a corner that matches the bishop's colour. This technique essentially never appears in master practice — a theoretical entry.",
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
    id:       'capablanca-243',
    title:    'Outside Passed Pawn — Decisive Diversion',
    label:    'Capablanca vs Tartakower, New York 1924',
    concepts: ['b2-e-outside-pp', 'b2-s-pawn-majority', 'b2-e-opposition'],
    note:     "Capablanca creates an outside passed pawn on a6, using it as a diversion to pull Tartakower's rook away from the kingside. While the rook chases the a-pawn, Capablanca's rook invades on c7, collecting the remaining pawns. A 52-move masterclass on the outside passed pawn as a deflection weapon.",
    category: 'endgame-sub',
  },

  // ── Secondary Openings ─────────────────────────────────────────────────────

  {
    id:       'anderssen-558',
    title:    'Vienna Game — Aggressive Gambit',
    label:    'Steinitz vs Anderssen, Baden-Baden 1870  (Vienna Gambit)',
    concepts: ['b2-o-vienna', 'b2-t-greek-gift', 'b2-t-mating-net'],
    note:     "Vienna Gambit with 3.f4 — Steinitz pushes for an early pawn storm while Anderssen responds with queenside counterplay. A 45-move clash between two attacking legends, showing both sides of the Vienna Gambit: White's central aggression and Black's correct defensive response.",
    category: 'openings-b2',
  },
  {
    id:       'karpov-295',
    title:    'Petroff Defense — Crushed by White',
    label:    'Karpov vs Kortschnoj, Candidates Final 1974',
    concepts: ['b2-o-petroff', 'b2-f-piece-activity', 'b2-t-mating-net'],
    note:     "Karpov uncorks 13.Qxb7! and wins a crushing 31-move game against Kortschnoj in the Candidates match — one of the best demonstrations of White's attacking chances when Black plays the Petroff carelessly. The defence is solid only if Black knows the theory; Kortschnoj didn't here.",
    category: 'openings-b2',
  },
  {
    id:       'karpov-169',
    title:    'Sicilian Kan — Flexible Defense',
    label:    'Karpov vs Taimanov, USSR Team Championship 1972  (Kan)',
    concepts: ['b2-o-sicilian-kan', 'b2-s-pawn-break', 'b2-f-piece-activity'],
    note:     "Karpov beats the Kan/Taimanov system's own inventor — Mark Taimanov — in 40 moves. Meta-instructive: the creator of the system on the wrong end of it. Karpov exploits the ...a6/...e6 setup's lack of counterplay with precise central control.",
    category: 'openings-b2',
  },
  {
    id:       'capablanca-409',
    title:    'Slav Defense — Strategic Bind',
    label:    'Capablanca vs Treybal, Karlsbad 1929',
    concepts: ['b2-o-slav', 'b2-s-pawn-majority', 'b2-f-minority-attack'],
    note:     "Capablanca builds a positional bind over 58 moves against the Slav/Semi-Slav structure: the c6 pawn that defines the opening eventually becomes a weakness, and Capablanca converts with his trademark endgame technique. The ideal game for understanding both the Slav's solidity and its long-term vulnerabilities.",
    category: 'openings-b2',
  },
  {
    id:       'benko-602',
    title:    'Benko Gambit — The Inventor Wins',
    label:    'Vukic vs Benko, Sarajevo 1967',
    concepts: ['b2-o-benko', 'b2-s-pawn-break', 'b2-f-rook-behind-pp', 'b2-f-piece-activity'],
    note:     "Pal Benko plays his own gambit and wins in 39 moves: pawn on a6 accepted, rooks flood the open a- and b-files, White's queenside is paralysed. The best possible demonstration — watching the system's inventor execute the ideas he designed.",
    category: 'openings-b2',
  },
  {
    id:       'botvinnik-103',
    title:    'Dutch Stonewall — Perfect Structure, Perfect Attack',
    label:    'Flohr vs Botvinnik, Moscow/Leningrad match 1933',
    concepts: ['b2-o-dutch-stonewall', 'b2-s-weak-squares', 'b2-t-mating-net'],
    note:     "The perfect Stonewall setup — e6/f5/d5/c6 — played by the greatest Stonewall practitioner in chess history. Botvinnik wins in 30 moves with a classic kingside attack (Qh5, f4-push), leaving the e5 hole completely unexploited by Flohr. A template game for everyone who plays the Stonewall.",
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
