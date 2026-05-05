// Fetches official Pokémon sprites from PokéAPI CDN and stitches them into a
// WebGPU-ready atlas (8 species × 3 tiers = 24 cells, each 96×96 px).

const SPRITE_SIZE = 96;

const SPECIES_ORDER = [
  'oddish', 'bulbasaur', 'squirtle', 'snorlax',
  'jolteon', 'geodude', 'charmander', 'psyduck',
];

// Maps each base key + tier to a PokéDex ID
const POKEMON_IDS = {
  oddish:     [43,  44,  45],   // Oddish → Gloom → Vileplume
  bulbasaur:  [1,   2,   3],    // Bulbasaur → Ivysaur → Venusaur
  squirtle:   [7,   8,   9],    // Squirtle → Wartortle → Blastoise
  snorlax:    [143, 143, 143],  // Snorlax (no real evolution)
  jolteon:    [135, 135, 135],  // Jolteon (no real evolution)
  geodude:    [74,  75,  76],   // Geodude → Graveler → Golem
  charmander: [4,   5,   6],    // Charmander → Charmeleon → Charizard
  psyduck:    [54,  55,  55],   // Psyduck → Golduck
};

const COLS = SPECIES_ORDER.length; // 8
const ROWS = 3;
const ATLAS_W = COLS * SPRITE_SIZE; // 768
const ATLAS_H = ROWS * SPRITE_SIZE; // 288

function spriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load sprite: ${url}`));
    img.src = url;
  });
}

// Returns { imageBitmap, uvMap }
// uvMap[baseKey][tier] = { uvX, uvY, uvW, uvH }  (normalised 0–1)
export async function buildSpriteAtlas() {
  const offscreen = document.createElement('canvas');
  offscreen.width  = ATLAS_W;
  offscreen.height = ATLAS_H;
  const ctx = offscreen.getContext('2d');

  const uvMap = {};
  const loads = [];

  for (let col = 0; col < SPECIES_ORDER.length; col++) {
    const key  = SPECIES_ORDER[col];
    const ids  = POKEMON_IDS[key];
    uvMap[key] = [];

    for (let tier = 0; tier < 3; tier++) {
      uvMap[key][tier] = {
        uvX: col  / COLS,
        uvY: tier / ROWS,
        uvW: 1    / COLS,
        uvH: 1    / ROWS,
      };

      const c = col, t = tier, id = ids[tier];
      loads.push(
        loadImage(spriteUrl(id))
          .then(img => ctx.drawImage(img, c * SPRITE_SIZE, t * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE))
          .catch(() => { /* leave cell blank on network failure */ })
      );
    }
  }

  await Promise.all(loads);
  const imageBitmap = await createImageBitmap(offscreen);
  return { imageBitmap, uvMap };
}
