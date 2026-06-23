const fs = require('fs');
const path = require('path');

const directory = __dirname;
const weaponsDirectory = path.join(directory, 'weapons');

const preferredWeaponOrder = ['pistol', 'smg', 'shotgun', 'revolver', 'carbine', 'rifle', 'lmg'];
const defaultWeaponInfo = {
  pistol: { name: 'Field Pistol', short: 'Pistol' },
  smg: { name: 'Mill SMG', short: 'SMG' },
  shotgun: { name: 'Trench Shotgun', short: 'Shotgun' },
  revolver: { name: 'Rust Revolver', short: 'Revolver' },
  carbine: { name: 'Hunting Carbine', short: 'Carbine' },
  rifle: { name: 'Service Rifle', short: 'Rifle' },
  lmg: { name: 'Belt Fed', short: 'LMG' },
};

const legacyIdsByOldFilename = {
  '1911handgunmodel.json': ['forge_1911handgunmodel'],
  'millsmgfixed.json': ['forge_millsmgfixed'],
  'minismg.json': ['forge_minismg'],
  'trenchshotgunfixed.json': ['forge_trenchshotgunfixed'],
  'semiautorifle.json': ['forge_semiautorifle'],
  'm4riflemodel.json': ['forge_m4riflemodel'],
  'akfixed.json': ['forge_akfixed'],
};

const oldFilenameByNewPath = {
  'weapons/pistol/usemodel.json': '1911handgunmodel.json',
  'weapons/smg/usemodel.json': 'millsmgfixed.json',
  'weapons/smg/mini-smg.json': 'minismg.json',
  'weapons/shotgun/usemodel.json': 'trenchshotgunfixed.json',
  'weapons/carbine/usemodel.json': 'semiautorifle.json',
  'weapons/rifle/usemodel.json': 'M4RifleModel.json',
  'weapons/rifle/service-rifle-ak.json': 'akfixed.json',
};

const runtimeYawOffsetByPath = {
  'weapons/rifle/usemodel.json': -Math.PI / 2,
};

function toPosixPath(filename) {
  return filename.split(path.sep).join('/');
}

function displayName(filename) {
  return path.basename(filename, path.extname(filename))
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function titleFromFolder(folder) {
  return folder
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function weaponIdFromFolder(folder) {
  const normalized = folder
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'weapon';
}

function uniqueWeaponId(folder, usedIds) {
  const base = weaponIdFromFolder(folder);
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${base}_${suffix++}`;
  }
  usedIds.add(id);
  return id;
}

function catalogId(filename) {
  return `forge_${filename
    .toLowerCase()
    .replace(/\.json$/i, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}`;
}

function readJsonProject(filename) {
  try {
    const project = JSON.parse(fs.readFileSync(filename, 'utf8'));
    return project && project.object ? project : null;
  } catch (error) {
    console.warn(`Skipping ${filename}: ${error.message}`);
    return null;
  }
}

function walkJsonFiles(root) {
  if (!fs.existsSync(root)) return [];
  const found = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      found.push(...walkJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      found.push(fullPath);
    }
  }
  return found;
}

function orderedWeaponFolders() {
  if (!fs.existsSync(weaponsDirectory)) return [];
  const folders = fs.readdirSync(weaponsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const rank = new Map(preferredWeaponOrder.map((id, index) => [id, index]));
  return folders.sort((a, b) => {
    const ai = rank.has(a) ? rank.get(a) : 1000;
    const bi = rank.has(b) ? rank.get(b) : 1000;
    return ai === bi ? a.localeCompare(b) : ai - bi;
  });
}

const usedWeaponIds = new Set();
const slotByFolder = new Map();
const weaponSlots = orderedWeaponFolders().map((folder, index) => {
  const id = uniqueWeaponId(folder, usedWeaponIds);
  const info = defaultWeaponInfo[id] || {};
  const modelPath = toPosixPath(path.join('weapons', folder, 'usemodel.json'));
  const absoluteModelPath = path.join(directory, modelPath);
  const project = fs.existsSync(absoluteModelPath) ? readJsonProject(absoluteModelPath) : null;
  const userData = (project && project.object && project.object.userData) || {};
  const name = info.name || userData.forgeProjectName || titleFromFolder(folder);
  const slot = {
    id,
    folder,
    slot: String(index + 1),
    name,
    short: info.short || titleFromFolder(folder),
    modelPath,
    path: modelPath,
    catalogId: id,
    hasUseModel: !!project,
    runtimeYawOffset: runtimeYawOffsetByPath[modelPath] || 0,
  };
  slotByFolder.set(folder, slot);
  return slot;
});

const modelsByFile = {};
const sourceFiles = [];

const files = walkJsonFiles(directory)
  .sort((a, b) => toPosixPath(path.relative(directory, a)).localeCompare(toPosixPath(path.relative(directory, b))));

for (const absolutePath of files) {
  const relPath = toPosixPath(path.relative(directory, absolutePath));
  const project = readJsonProject(absolutePath);
  if (!project) continue;

  const userData = project.object.userData || {};
  const parts = relPath.split('/');
  const weaponFolder = parts[0] === 'weapons' ? parts[1] : '';
  const slot = slotByFolder.get(weaponFolder);
  const weaponId = slot ? slot.id : (userData.forgeWeaponId && userData.forgeWeaponId !== 'custom' ? userData.forgeWeaponId : null);
  const gameSlot = !!(slot && relPath === slot.modelPath);
  const oldFilename = oldFilenameByNewPath[relPath] || path.basename(relPath);
  const legacyCatalogIds = legacyIdsByOldFilename[oldFilename.toLowerCase()] || [];
  const entryName = gameSlot
    ? slot.name
    : userData.forgeProjectName || displayName(relPath);

  modelsByFile[relPath] = project;
  if (!modelsByFile[oldFilename]) modelsByFile[oldFilename] = project;
  if (gameSlot && weaponId && !modelsByFile[weaponId]) modelsByFile[weaponId] = project;

  sourceFiles.push({
    filename: relPath,
    path: relPath,
    catalogId: gameSlot && slot ? slot.catalogId : catalogId(relPath),
    legacyCatalogIds,
    name: entryName,
    weaponId,
    folder: weaponFolder || null,
    slot: slot ? slot.slot : null,
    gameSlot,
    gameReady: gameSlot || userData.forgeGameReady === true,
    runtimeYawOffset: runtimeYawOffsetByPath[relPath] || 0
  });
}

const output = [
  '/* Generated by build-weapon-catalog.js. Rebuild after adding weapon folders or replacing usemodel.json. */',
  `window.DEAD_GAME_WEAPON_SLOTS=${JSON.stringify(weaponSlots)};`,
  `window.DEAD_GAME_SOURCE_WEAPON_FILES=${JSON.stringify(sourceFiles)};`,
  `window.DEAD_GAME_WEAPON_MODELS_BY_FILE=${JSON.stringify(modelsByFile)};`,
  ''
].join('\n');

fs.writeFileSync(path.join(directory, 'weapon-model-catalog.js'), output);
console.log(`Bundled ${sourceFiles.length} weapon model${sourceFiles.length === 1 ? '' : 's'} across ${weaponSlots.length} weapon slot${weaponSlots.length === 1 ? '' : 's'}.`);
