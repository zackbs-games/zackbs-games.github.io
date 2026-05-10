const cache = new Map();

export function loadSprite(id) {
  if (cache.has(id)) return Promise.resolve(cache.get(id));
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => { cache.set(id, img); resolve(img); };
    img.onerror = () => { cache.set(id, null); resolve(null); };
    img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  });
}

export function getSprite(id) {
  return cache.get(id) ?? null;
}
