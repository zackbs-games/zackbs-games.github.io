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

function compositeSprites(s1, s2) {
  const sz = 96;
  const cv = document.createElement('canvas');
  cv.width = sz; cv.height = sz;
  const cx = cv.getContext('2d');
  cx.imageSmoothingEnabled = false;
  // Left half: sprite 1
  cx.save();
  cx.beginPath(); cx.rect(0, 0, sz / 2, sz); cx.clip();
  if (s1) cx.drawImage(s1, 0, 0, sz, sz);
  cx.restore();
  // Right half: sprite 2
  cx.save();
  cx.beginPath(); cx.rect(sz / 2, 0, sz / 2, sz); cx.clip();
  if (s2) cx.drawImage(s2, 0, 0, sz, sz);
  cx.restore();
  // Blend seam: draw both at low opacity across the middle third
  cx.save();
  cx.beginPath(); cx.rect(sz / 3, 0, sz / 3, sz); cx.clip();
  cx.globalAlpha = 0.45;
  if (s1) cx.drawImage(s1, 0, 0, sz, sz);
  if (s2) cx.drawImage(s2, 0, 0, sz, sz);
  cx.restore();
  return cv;
}

export function loadFusionSprite(id1, id2) {
  const key = `f_${id1}_${id2}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => { cache.set(key, img); resolve(img); };
    img.onerror = () => {
      // Fall back to compositing the two base sprites side-by-side
      Promise.all([loadSprite(id1), loadSprite(id2)]).then(([s1, s2]) => {
        const cv = (s1 || s2) ? compositeSprites(s1, s2) : null;
        cache.set(key, cv);
        resolve(cv);
      });
    };
    img.src = `https://raw.githubusercontent.com/Aegide/autogen-fusion-sprites/master/Battlers/${id1}.${id2}.png`;
  });
}

export function getFusionSprite(id1, id2) {
  return cache.get(`f_${id1}_${id2}`) ?? null;
}
