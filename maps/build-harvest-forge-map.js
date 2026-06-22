const fs = require('fs');
const path = require('path');

let nextId = 1;
const objects = [];

function add(type, x, z, ry = 0, p = {}, y = 0) {
  objects.push({ id: nextId++, type, x, y, z, ry, p });
}

function wall(x1, z1, x2, z2, y = 0, h = 4.8) {
  objects.push({ id: nextId++, type: 'wall', x1, z1, x2, z2, y, h });
}

function wallRun(x1, z1, x2, z2, gaps) {
  const horizontal = z1 === z2;
  let start = horizontal ? Math.min(x1, x2) : Math.min(z1, z2);
  const end = horizontal ? Math.max(x1, x2) : Math.max(z1, z2);
  const sorted = (gaps || []).slice().sort((a, b) => a.at - b.at);
  for (const gap of sorted) {
    const edge = gap.at - gap.w / 2;
    if (edge - start > 0.05) {
      horizontal ? wall(start, z1, edge, z1) : wall(x1, start, x1, edge);
    }
    start = gap.at + gap.w / 2;
  }
  if (end - start > 0.05) {
    horizontal ? wall(start, z1, end, z1) : wall(x1, start, x1, end);
  }
}

// Main floor, roof masses, porch, and upper overlook.
add('platform', 0, -26, 0, { w: 45, d: 37, thick: 0.14 }, 0.14);
add('platform', -7, -26, 0, { w: 29.6, d: 11.6, thick: 0.18 }, 0.18);
for (const [w, d, x, z] of [[45, 12.6, 0, -14], [45, 12.6, 0, -38], [14.6, 12.6, 15, -26]]) {
  add('roofslab', x, z, 0, { w, d, thick: 0.5, over: 0, parapet: 0.7, matName: 'wall', walkable: 'yes' }, 5.3);
}
add('platform', 0, -6.4, 0, { w: 7, d: 3.4, thick: 0.22 }, 0.22);
add('box', 0, -6.4, 0, { w: 7, h: 0.3, d: 3.2, matName: 'wall', collide: 'yes' }, 3.35);
for (const x of [-2.9, 2.9]) add('vpipe', x, -5.3, 0, { h: 3.36, r: 0.18, matName: 'trim' });
add('sign', 0, -7.5, 0, { text: 'HARVEST PROCESSING CO.', color: 'cfc7a8', w: 13, sides: 'one' }, 5.8);

// Original wall runs, split around their door and boarded-window openings.
wallRun(-22, -8, 22, -8, [{ at: -5, w: 2.4 }, { at: 0, w: 3 }, { at: 5, w: 2.4 }]);
wallRun(-22, -44, 22, -44, [{ at: -15, w: 2.4 }, { at: -4, w: 2.4 }, { at: 15, w: 2.4 }]);
wallRun(-22, -8, -22, -44, [{ at: -14, w: 2.4 }, { at: -38, w: 2.4 }]);
wallRun(22, -8, 22, -44, [{ at: -14, w: 2.4 }, { at: -26, w: 2.4 }]);
wallRun(-8, -8, -8, -44, [{ at: -14, w: 3 }, { at: -38, w: 3 }]);
wallRun(8, -8, 8, -44, [{ at: -14, w: 3 }, { at: -26, w: 2.4 }, { at: -38, w: 3 }]);
wallRun(-22, -20, 22, -20, [{ at: -15, w: 2.4 }, { at: 0, w: 2.4 }, { at: 4, w: 2.7 }, { at: 15, w: 3 }]);
wallRun(-22, -32, 22, -32, [{ at: -15, w: 2.4 }, { at: 0, w: 2.4 }, { at: 15, w: 3 }]);

// Facade pilasters and porch columns.
for (const [x, z] of [[-22, -8], [22, -8], [-22, -44], [22, -44], [-8, -8], [8, -8]]) {
  add('box', x, z, 0, { w: 1.1, h: 5.3, d: 1.1, matName: 'trim', collide: 'yes' });
}

const zones = {
  lobby: [0, -14, 16, 12, 'Lobby'],
  armory: [-15, -14, 14, 12, 'Armory'],
  office: [15, -14, 14, 12, 'Office'],
  east_hall: [15, -26, 14, 12, 'East Hall'],
  stairwell: [4, -26, 3, 12, 'Overlook Stairwell'],
  storage: [15, -38, 14, 12, 'Storage'],
  generator: [0, -38, 16, 12, 'Generator Room'],
  west_store: [-15, -38, 14, 12, 'West Store']
};
for (const [id, [x, z, w, d, name]] of Object.entries(zones)) {
  add('zone', x, z, 0, { id, name, w, d, level: 'all' });
}

const doors = [
  [0, -8, 'x', 750, 'FRONT DOOR', 'outside', 'lobby'],
  [-8, -14, 'z', 750, 'ARMORY', 'lobby', 'armory'],
  [8, -14, 'z', 850, 'OFFICE', 'lobby', 'office'],
  [4, -20, 'x', 1500, 'OVERLOOK ACCESS', 'lobby', 'stairwell'],
  [15, -20, 'x', 1000, 'EAST HALL', 'office', 'east_hall'],
  [15, -32, 'x', 1100, 'STORAGE', 'east_hall', 'storage'],
  [8, -38, 'z', 1200, 'GENERATOR ROOM', 'storage', 'generator'],
  [-8, -38, 'z', 750, 'WEST STORE', 'generator', 'west_store']
];
for (const [x, z, axis, cost, name, zoneA, zoneB] of doors) {
  add('door', x, z, 0, { name, cost, axis, zoneA, zoneB, requiresPower: 'no' });
}

const windows = [
  ['lobby', true, -5, -8, -5, -5.5],
  ['lobby', true, 5, -8, 5, -5.5],
  ['lobby', true, 0, -20, 0, -22.5],
  ['armory', true, -15, -20, -15, -22.5],
  ['armory', false, -22, -14, -24.5, -14],
  ['office', false, 22, -14, 24.5, -14],
  ['east_hall', false, 22, -26, 24.5, -26],
  ['east_hall', false, 8, -26, 6.2, -26],
  ['storage', true, 15, -44, 15, -46.5],
  ['generator', true, -4, -44, -4, -46.5],
  ['generator', true, 0, -32, 0, -29.5],
  ['west_store', true, -15, -44, -15, -46.5],
  ['west_store', false, -22, -38, -24.5, -38],
  ['west_store', true, -15, -32, -15, -29.5]
];
for (const [room, horizontal, x, z, outX, outZ] of windows) {
  const axis = horizontal ? 'x' : 'z';
  const side = horizontal ? (outZ >= z ? '+' : '-') : (outX >= x ? '+' : '-');
  add('zwindow', x, z, 0, {
    axis, side, zoneA: 'outside', zoneB: room, boards: 4, collide: 'yes'
  });
  add('zombiespawn', outX, outZ, 0, { zone: 'outside', weight: 1 });
}

// Editable upper overlook and stairs. The legacy chain-gated behavior is intentionally not baked in.
add('platform', 0, -30.35, 0, { w: 15.4, d: 3, thick: 0.18 }, 5.15);
add('stairs', 4, -21.1, 0, { steps: 22, stepW: 2.55, stepH: 0.234, stepD: 0.37 });
add('railing', 0, -31.85, 0, { len: 15.4, h: 1.05, posts: 10, matName: 'rust' }, 5.15);
add('railing', -7.7, -30.35, 90, { len: 3, h: 1.05, posts: 4, matName: 'rust' }, 5.15);
add('railing', 7.7, -30.35, 90, { len: 3, h: 1.05, posts: 4, matName: 'rust' }, 5.15);
add('awning', 0, -30.35, 0, { w: 16.3, d: 3.9, pitch: 0, thick: 0.1, matName: 'trim' }, 7.7);
add('sign', 4, -28.73, 0, { text: 'OVERLOOK', color: 'cfc7a8', w: 2.8, sides: 'one' }, 7.35);

// Lighting and room dressing.
for (const [x, z, y] of [[0, -14], [-15, -14], [15, -14], [15, -26], [15, -38], [0, -38], [-15, -38], [0, -6.4, 3]]) {
  add('lamp', x, z, 0, {}, y || 0);
}
for (const [x, z, ry] of [[-5, -15.1, 90], [13.5, -13, 0], [18.5, -17.5, 180]]) add('desk', x, z, ry);
for (const [x, z] of [[-19, -19.1], [10.8, -43.2], [19.5, -43.2]]) add('shelf', x, z);
for (const [x, z, s, ry] of [[6.2, -15.7, 1.2, 23], [-13.6, -15.4, 1.1, 11], [19.8, -34.5, 1.3, 17], [-18, -42, 1.4, 11], [-16.7, -40.6, 1, 40]]) {
  add('crate', x, z, ry, { s });
}
for (const [x, z] of [[-19.5, -10.6], [20.8, -10.2], [20.6, -21.4], [9.4, -30.6], [9.3, -36], [-10.5, -42.5]]) add('barrel', x, z);
for (const [x, z] of [[11.5, -22.5], [18.5, -29.5]]) add('pillar', x, z);
add('deadtree', -15, -26);
for (const [x, z, n] of [[0, -26, 6], [4, -29.5, 4], [-11.5, -23, 4], [4, -18.4, 4]]) add('rubble', x, z, 0, { n });

// Economy objects.
for (const [weapon, x, z, ry, zone] of [
  ['revolver', -21.45, -11.2, 90, 2],
  ['shotgun', -21.45, -17, 90, 2],
  ['smg', 17.5, -8.45, 180, 3],
  ['rifle', 21.45, -29.6, -90, 4],
  ['carbine', 21.45, -39, -90, 5],
  ['lmg', 4.6, -32.55, 180, 6]
]) add('weaponbuy', x, z, ry, { weapon, zone });

for (const [perk, x, z, ry, zone, y] of [
  ['reload', -12, -9.4, 180, 2, 0],
  ['speed', 12, -9.4, 180, 3, 0],
  ['health', 21, -36, -90, 5, 0],
  ['headshot', -11, -33.2, 180, 7, 0],
  ['regen', -6.4, -30.35, 90, 0, 5.15]
]) add('perkmachine', x, z, ry, { perk, cost: 0, requiresPower: 'yes', zone }, y);

add('upgrademachine', -6.85, -36, 90, { cost: 3000, requiresPower: 'yes', zone: 6 });
add('machine', -1, -38.2, 0, {
  title: 'GENERATOR', color: 'ff7a2a', big: 'yes', role: 'decor',
  perk: 'reload', cost: 0, requiresPower: 'no', zone: 6
});
add('power', 3, -43.45, 0, { zone: 6 });
add('spawnpoint', 0, 0, 180, {});

const map = {
  app: 'dead-game-forge',
  version: 1,
  name: 'HARVEST FACILITY — EDITABLE',
  description: 'Forge conversion of the original built-in Harvest Facility map.',
  sky: { preset: 'default' },
  spawn: [0, 0, 180],
  spawns: [[0, 0, 180]],
  objects
};

const directory = __dirname;
fs.writeFileSync(path.join(directory, 'harvest-facility-forge.json'), JSON.stringify(map, null, 1));
fs.writeFileSync(
  path.join(directory, 'harvest-facility-forge.js'),
  `/* Generated editable Harvest Facility map. */\nwindow.DEAD_GAME_HARVEST_FORGE_MAP=${JSON.stringify(map)};\n`
);
console.log(`Generated Harvest Facility Forge map with ${objects.length} objects.`);
