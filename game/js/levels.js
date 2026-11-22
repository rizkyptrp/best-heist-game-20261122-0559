// levels.js — the three rooms of The Velvet Vault: walls, cover, loot,
// guard patrols, security cameras, tool crates and the exit of each room.
// Every coordinate lives in the play field (canvas 1280x720, HUD on top).
// Loot marked target:true is the room's star piece: stealing it opens the exit.

export const FIELD = { x: 0, y: 72, width: 1280, height: 648 };
export const CANVAS = { width: 1280, height: 720 };

// Wall rectangles: solid stone, block movement and block sight.
function borderWalls() {
  const f = FIELD;
  return [
    { x: f.x, y: f.y, w: f.width, h: 12 }, // north wall
    { x: f.x, y: f.y + f.height - 12, w: f.width, h: 12 }, // south wall
    { x: f.x, y: f.y, w: 12, h: f.height }, // west wall
    { x: f.x + f.width - 12, y: f.y, w: 12, h: f.height }, // east wall
  ];
}

// A display case: low glass block the thief can hide behind.
function displayCase(x, y, w, h) {
  return { x, y, w, h, kind: 'case' };
}

// A velvet-rope pillar row: thin cover that blocks sight at crouch height.
function ropeRow(x, y, w) {
  return { x, y, w, h: 10, kind: 'rope' };
}

export const LEVELS = [
  {
    name: 'Gallery I — The Painted Hall',
    par: 75, // seconds the house expects a clean run to take
    intro: 'Steal the Star Sapphire portrait, then slip out the green door.',
    playerStart: { x: 90, y: 640 },
    exit: { x: 600, y: 690, w: 80, h: 18 },
    walls: [
      ...borderWalls(),
      displayCase(220, 220, 180, 60),
      displayCase(880, 220, 180, 60),
      displayCase(220, 480, 180, 60),
      displayCase(880, 480, 180, 60),
      displayCase(550, 340, 180, 60), // central case, the room's heart
      ropeRow(420, 160, 200),
      ropeRow(660, 560, 200),
    ],
    loot: [
      { x: 640, y: 130, kind: 'painting', value: 500, target: true, label: 'Star Sapphire Portrait' },
      { x: 200, y: 130, kind: 'painting', value: 200, target: false, label: 'Moonlit Duchess' },
      { x: 1080, y: 130, kind: 'painting', value: 200, target: false, label: 'The Gilded Fox' },
      { x: 310, y: 300, kind: 'gem', value: 150, target: false, label: 'Topaz' },
      { x: 970, y: 300, kind: 'gem', value: 150, target: false, label: 'Opal' },
      { x: 640, y: 425, kind: 'gold', value: 300, target: false, label: 'Gold Ingot' },
      { x: 310, y: 460, kind: 'gem', value: 150, target: false, label: 'Ruby' },
      { x: 970, y: 460, kind: 'gem', value: 150, target: false, label: 'Emerald' },
    ],
    guards: [
      { waypoints: [[300, 190], [980, 190]], speed: 62, pause: 1.2, name: 'Guard Mara' },
      { waypoints: [[980, 600], [300, 600]], speed: 58, pause: 1.2, name: 'Guard Ivo' },
    ],
    cameras: [
      { x: 1260, y: 100, baseAngle: Math.PI * 0.75, sweep: 0.9, range: 230, name: 'Camera A' },
    ],
    crates: [
      { x: 640, y: 620, tool: 'smoke' },
      { x: 120, y: 360, tool: 'noise' },
    ],
  },
  {
    name: 'Gallery II — The Gem Vault',
    par: 90,
    intro: 'The Heart of the Mountain gem is the prize. Cameras watch the vault door.',
    playerStart: { x: 90, y: 640 },
    exit: { x: 600, y: 690, w: 80, h: 18 },
    walls: [
      ...borderWalls(),
      displayCase(200, 180, 150, 150),
      displayCase(930, 180, 150, 150),
      displayCase(200, 470, 150, 150),
      displayCase(930, 470, 150, 150),
      displayCase(565, 300, 150, 110), // the vault plinth
      ropeRow(380, 300, 160),
      ropeRow(740, 180, 160),
      { x: 300, y: 620, w: 40, h: 76, kind: 'pillar' },
    ],
    loot: [
      { x: 640, y: 430, kind: 'gem', value: 800, target: true, label: 'Heart of the Mountain' },
      { x: 275, y: 350, kind: 'gem', value: 250, target: false, label: 'Sapphire' },
      { x: 1005, y: 350, kind: 'gem', value: 250, target: false, label: 'Amethyst' },
      { x: 275, y: 450, kind: 'gold', value: 300, target: false, label: 'Gold Bar' },
      { x: 1005, y: 450, kind: 'gold', value: 300, target: false, label: 'Gold Bar' },
      { x: 640, y: 130, kind: 'painting', value: 200, target: false, label: 'The Watcher' },
      { x: 420, y: 640, kind: 'gem', value: 150, target: false, label: 'Jade' },
      { x: 860, y: 640, kind: 'gem', value: 150, target: false, label: 'Pearl' },
    ],
    guards: [
      { waypoints: [[220, 440], [1060, 440]], speed: 66, pause: 0.9, name: 'Guard Mara' },
      { waypoints: [[1060, 150], [220, 150]], speed: 70, pause: 0.9, name: 'Guard Ivo' },
      { waypoints: [[150, 400], [500, 400]], speed: 60, pause: 1.5, name: 'Guard Sable' },
    ],
    cameras: [
      { x: 20, y: 100, baseAngle: Math.PI * 0.25, sweep: 0.8, range: 230, name: 'Camera A' },
      { x: 1260, y: 620, baseAngle: Math.PI * 1.25, sweep: 0.8, range: 230, name: 'Camera B' },
    ],
    crates: [
      { x: 120, y: 120, tool: 'emp' },
      { x: 1160, y: 640, tool: 'smoke' },
    ],
  },
  {
    name: 'Gallery III — The Grand Vault',
    par: 110,
    intro: 'The Crown of Vesna waits behind three patrols. One clean run and it is yours.',
    playerStart: { x: 90, y: 640 },
    exit: { x: 600, y: 690, w: 80, h: 18 },
    walls: [
      ...borderWalls(),
      displayCase(180, 160, 170, 90),
      displayCase(930, 160, 170, 90),
      displayCase(180, 470, 170, 90),
      displayCase(930, 470, 170, 90),
      displayCase(470, 300, 120, 120),
      displayCase(690, 300, 120, 120),
      { x: 620, y: 84, w: 40, h: 110, kind: 'pillar' },
      { x: 300, y: 340, w: 40, h: 120, kind: 'pillar' },
      { x: 940, y: 340, w: 40, h: 120, kind: 'pillar' },
      ropeRow(430, 180, 180),
      ropeRow(670, 560, 180),
    ],
    loot: [
      { x: 640, y: 360, kind: 'gem', value: 1200, target: true, label: 'Crown of Vesna' },
      { x: 265, y: 140, kind: 'painting', value: 300, target: false, label: 'The Duchess Again' },
      { x: 1015, y: 140, kind: 'painting', value: 300, target: false, label: 'Fox at Midnight' },
      { x: 530, y: 440, kind: 'gold', value: 400, target: false, label: 'Gold Bullion' },
      { x: 750, y: 440, kind: 'gold', value: 400, target: false, label: 'Gold Bullion' },
      { x: 265, y: 455, kind: 'gem', value: 250, target: false, label: 'Black Opal' },
      { x: 1015, y: 455, kind: 'gem', value: 250, target: false, label: 'Fire Diamond' },
      { x: 880, y: 130, kind: 'painting', value: 250, target: false, label: 'The Last Waltz' },
    ],
    guards: [
      { waypoints: [[200, 270], [1080, 270]], speed: 74, pause: 0.8, name: 'Guard Mara' },
      { waypoints: [[1080, 600], [200, 600]], speed: 74, pause: 0.8, name: 'Guard Ivo' },
      { waypoints: [[640, 640], [640, 220]], speed: 66, pause: 1.0, name: 'Guard Sable' },
      { waypoints: [[1140, 200], [1140, 600]], speed: 60, pause: 1.4, name: 'Guard Rune' },
    ],
    cameras: [
      { x: 20, y: 100, baseAngle: Math.PI * 0.3, sweep: 0.9, range: 240, name: 'Camera A' },
      { x: 1260, y: 100, baseAngle: Math.PI * 0.7, sweep: 0.9, range: 240, name: 'Camera B' },
      { x: 640, y: 84, baseAngle: Math.PI * 0.5, sweep: 1.1, range: 240, name: 'Camera C' },
    ],
    crates: [
      { x: 120, y: 120, tool: 'emp' },
      { x: 1160, y: 120, tool: 'noise' },
      { x: 640, y: 640, tool: 'smoke' },
    ],
  },
];

// Build a fresh, mutable copy of a level: restarting a room must never
// carry over taken loot, moved guards or a spent tool crate.
export function buildLevel(index) {
  const def = LEVELS[index];
  return {
    index,
    name: def.name,
    par: def.par,
    intro: def.intro,
    playerStart: { ...def.playerStart },
    exit: { ...def.exit },
    walls: def.walls.map((w) => ({ ...w })),
    loot: def.loot.map((l) => ({ ...l, taken: false })),
    guards: def.guards.map((g) => ({ ...g, waypoints: g.waypoints.map((p) => [...p]) })),
    cameras: def.cameras.map((c) => ({ ...c })),
    crates: def.crates.map((c) => ({ ...c, taken: false })),
  };
}

export function totalLootValue(levelDef) {
  return levelDef.loot.reduce((sum, item) => sum + item.value, 0);
}
