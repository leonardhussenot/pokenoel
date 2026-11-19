import { BadgeDef, Direction, PortraitSpec, SpriteAppearance } from '../types';

const spriteCache = new Map<string, HTMLCanvasElement>();
const portraitCache = new Map<string, HTMLCanvasElement>();
const badgeCache = new Map<string, HTMLCanvasElement>();
const loadedImages = new Map<string, HTMLImageElement>();

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function shadeHex(hex: string, factor: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(0, 2), 16) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(2, 4), 16) * factor)));
  const b = Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(4, 6), 16) * factor)));
  return `rgb(${r},${g},${b})`;
}

export function preloadCustomImage(url?: string): HTMLImageElement | null {
  if (!url || typeof Image === 'undefined') return null;
  let img = loadedImages.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    loadedImages.set(url, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

// ---- 16x24 GBA OVERWORLD SPRITES ----

function renderOverworldSprite(
  app: SpriteAppearance,
  dir: Direction,
  frame: number // 0=idle, 1=stepL, 2=stepR
): HTMLCanvasElement {
  const c = makeCanvas(16, 24);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const px = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  const outline = '#1b1d2b';
  const skinDark = shadeHex(app.skin, 0.84);
  const hairDark = shadeHex(app.hairColor, 0.78);
  const topDark = shadeHex(app.topColor, 0.78);
  const botDark = shadeHex(app.bottomColor, 0.75);
  const accent = app.accentColor ?? '#f4c542';

  const bounce = frame === 0 ? 0 : -1;
  const stepL = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  const stepR = -stepL;

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(3, 21, 10, 2);

  // Legs / Shoes
  if (app.outfitStyle === 'dress') {
    px(4, 16 + bounce, 8, 4, app.topColor);
    px(4, 19 + bounce, 8, 1, topDark);
    px(5, 20 + Math.max(0, stepL), 2, 2, app.skin);
    px(9, 20 + Math.max(0, stepR), 2, 2, app.skin);
    px(5, 21 + Math.max(0, stepL), 2, 2, '#2d2320');
    px(9, 21 + Math.max(0, stepR), 2, 2, '#2d2320');
  } else {
    px(5, 17 + bounce, 3, 4 + (stepL > 0 ? 1 : 0), app.bottomColor);
    px(8, 17 + bounce, 3, 4 + (stepR > 0 ? 1 : 0), botDark);
    px(5, 21 + (stepL > 0 ? 1 : 0), 3, 2, '#241f24');
    px(8, 21 + (stepR > 0 ? 1 : 0), 3, 2, '#241f24');
  }

  // Torso
  px(4, 12 + bounce, 8, 6, outline);
  px(4, 12 + bounce, 8, 5, app.topColor);
  px(4, 16 + bounce, 8, 1, topDark);

  if (app.outfitStyle === 'suit' || app.outfitStyle === 'trench') {
    px(7, 12 + bounce, 2, 4, '#f2f4fa');
    px(7, 13 + bounce, 2, 3, accent);
  } else if (app.outfitStyle === 'chef') {
    px(5, 13 + bounce, 6, 4, '#ffffff');
    px(6, 12 + bounce, 4, 1, accent);
  } else if (app.outfitStyle === 'historical') {
    px(5, 12 + bounce, 6, 2, '#f5efe6');
    px(6, 14 + bounce, 4, 3, accent);
  } else if (app.outfitStyle === 'jersey_foot' || app.outfitStyle === 'jersey_basket') {
    px(5, 12 + bounce, 6, 1, accent);
    px(7, 13 + bounce, 2, 3, accent);
  } else if (app.outfitStyle === 'coat') {
    px(6, 12 + bounce, 4, 1, accent);
    px(4, 12 + bounce, 2, 5, topDark);
    px(10, 12 + bounce, 2, 5, topDark);
  }

  // Arms
  if (dir === 'left') {
    px(6, 13 + bounce + stepL, 3, 4, app.topColor);
    px(6, 16 + bounce + stepL, 2, 2, app.skin);
  } else if (dir === 'right') {
    px(7, 13 + bounce + stepR, 3, 4, app.topColor);
    px(8, 16 + bounce + stepR, 2, 2, app.skin);
  } else {
    px(2, 12 + bounce + stepL, 2, 4, topDark);
    px(2, 16 + bounce + stepL, 2, 1, app.skin);
    px(12, 12 + bounce + stepR, 2, 4, topDark);
    px(12, 16 + bounce + stepR, 2, 1, app.skin);
  }

  // Head
  px(3, 4 + bounce, 10, 8, outline);
  px(4, 5 + bounce, 8, 7, app.skin);
  px(4, 11 + bounce, 8, 1, skinDark);

  // Back/side hair or face
  if (dir === 'up') {
    px(4, 4 + bounce, 8, 8, app.hairColor);
    px(4, 10 + bounce, 8, 2, hairDark);
  } else {
    // Eyes
    if (dir === 'down') {
      px(5, 8 + bounce, 2, 2, '#1d1e2c');
      px(9, 8 + bounce, 2, 2, '#1d1e2c');
    } else if (dir === 'left') {
      px(5, 8 + bounce, 2, 2, '#1d1e2c');
    } else {
      px(9, 8 + bounce, 2, 2, '#1d1e2c');
    }

    // Glasses
    if (app.glasses && app.glasses !== 'none') {
      const gCol = app.glasses === 'sunglasses' ? '#141724' : '#30364a';
      if (dir === 'down') {
        px(4, 7 + bounce, 4, 3, gCol);
        px(8, 7 + bounce, 4, 3, gCol);
        if (app.glasses !== 'sunglasses') {
          px(5, 8 + bounce, 2, 1, '#bde6ff');
          px(9, 8 + bounce, 2, 1, '#bde6ff');
        }
      } else if (dir === 'left') {
        px(4, 7 + bounce, 4, 3, gCol);
      } else {
        px(8, 7 + bounce, 4, 3, gCol);
      }
    }

    // Facial hair
    if (app.facialHair === 'mustache') {
      px(dir === 'left' ? 4 : dir === 'right' ? 9 : 6, 10 + bounce, 4, 1, hairDark);
    } else if (app.facialHair === 'beard' || app.facialHair === 'goatee') {
      px(5, 10 + bounce, 6, 2, hairDark);
    }

    // Hair top & styles
    if (app.hairStyle !== 'bald') {
      px(3, 3 + bounce, 10, 3, app.hairColor);
      if (app.hairStyle === 'spiky') {
        px(4, 2 + bounce, 2, 2, app.hairColor);
        px(7, 1 + bounce, 2, 3, app.hairColor);
        px(10, 2 + bounce, 2, 2, app.hairColor);
      } else if (app.hairStyle === 'curly' || app.hairStyle === 'afro') {
        px(2, 4 + bounce, 2, 5, app.hairColor);
        px(12, 4 + bounce, 2, 5, app.hairColor);
        px(4, 2 + bounce, 8, 2, app.hairColor);
      } else if (app.hairStyle === 'long' || app.hairStyle === 'wavy') {
        px(3, 5 + bounce, 2, 7, hairDark);
        px(11, 5 + bounce, 2, 7, hairDark);
      } else if (app.hairStyle === 'bob') {
        px(3, 5 + bounce, 2, 5, app.hairColor);
        px(11, 5 + bounce, 2, 5, app.hairColor);
      } else if (app.hairStyle === 'bun' || app.hairStyle === 'ponytail') {
        px(6, 2 + bounce, 4, 2, hairDark);
      } else if (app.hairStyle === 'wig') {
        px(2, 3 + bounce, 3, 8, app.hairColor);
        px(11, 3 + bounce, 3, 8, app.hairColor);
      }
    }
  }

  // Headwear
  const hw = app.headwear ?? 'none';
  const hc = app.headwearColor ?? '#3a4159';
  if (hw === 'beret') {
    px(3, 2 + bounce, 9, 3, hc);
    px(7, 1 + bounce, 2, 1, hc);
  } else if (hw === 'tophat') {
    px(2, 3 + bounce, 12, 2, hc);
    px(4, 0 + bounce, 8, 4, hc);
    px(4, 2 + bounce, 8, 1, accent);
  } else if (hw === 'bowler' || hw === 'fedora') {
    px(2, 3 + bounce, 12, 2, hc);
    px(4, 1 + bounce, 8, 3, hc);
  } else if (hw === 'toque') {
    px(4, 2 + bounce, 8, 3, '#ffffff');
    px(5, 0 + bounce, 6, 3, '#f0f3fa');
  } else if (hw === 'headband') {
    px(3, 4 + bounce, 10, 2, hc);
  } else if (hw === 'cap') {
    px(3, 2 + bounce, 10, 3, hc);
    px(dir === 'left' ? 1 : 6, 4 + bounce, 6, 1, shadeHex(hc, 0.75));
  } else if (hw === 'crown') {
    px(4, 1 + bounce, 8, 3, '#f4c542');
    px(4, 0 + bounce, 2, 2, '#ffd966');
    px(7, 0 + bounce, 2, 2, '#ffd966');
    px(10, 0 + bounce, 2, 2, '#ffd966');
  } else if (hw === 'flower' || hw === 'ribbon') {
    px(10, 3 + bounce, 3, 3, hc);
    px(11, 4 + bounce, 1, 1, '#ffe47a');
  } else if (hw === 'feathered_hat') {
    px(2, 3 + bounce, 12, 2, hc);
    px(4, 1 + bounce, 8, 3, hc);
    px(10, 0 + bounce, 4, 2, '#f5f5fa');
  } else if (hw === 'turban') {
    px(3, 1 + bounce, 10, 4, hc);
    px(7, 2 + bounce, 2, 2, '#f4c542');
  }

  return c;
}

export function drawOverworldSprite(
  ctx: CanvasRenderingContext2D,
  app: SpriteAppearance,
  dir: Direction,
  frame: number,
  dx: number,
  dy: number,
  customSpriteSheetUrl?: string
): void {
  const img = preloadCustomImage(customSpriteSheetUrl);
  if (img) {
    const dirRow: Record<Direction, number> = { down: 0, up: 1, left: 2, right: 3 };
    const sx = (frame % 3) * 16;
    const sy = dirRow[dir] * 24;
    ctx.drawImage(img, sx, sy, 16, 24, dx, dy, 16, 24);
    return;
  }

  const key = `${JSON.stringify(app)}:${dir}:${frame % 3}`;
  let cached = spriteCache.get(key);
  if (!cached) {
    cached = renderOverworldSprite(app, dir, frame % 3);
    spriteCache.set(key, cached);
  }
  ctx.drawImage(cached, dx, dy);
}

// ---- 48x48 EXPRESSIVE GBA PORTRAITS ----

function renderPortrait(app: SpriteAppearance, spec: PortraitSpec): HTMLCanvasElement {
  const c = makeCanvas(48, 48);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const px = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  // Gradient-like pixel background
  px(0, 0, 48, 24, spec.bgTop);
  px(0, 24, 48, 24, spec.bgBottom);
  // Subtle retro halftone dots
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let y = 4; y < 44; y += 6) {
    for (let x = (y % 12 === 4 ? 4 : 7); x < 44; x += 6) {
      ctx.fillRect(x, y, 2, 2);
    }
  }

  const skinDark = shadeHex(app.skin, 0.85);
  const skinLight = shadeHex(app.skin, 1.07);
  const hairDark = shadeHex(app.hairColor, 0.78);
  const hairLight = shadeHex(app.hairColor, 1.18);
  const topDark = shadeHex(app.topColor, 0.75);
  const accent = app.accentColor ?? '#f4c542';

  // Back hair layer (for long/wavy/bob/wig)
  if (app.hairStyle === 'long' || app.hairStyle === 'wavy') {
    px(11, 14, 26, 26, hairDark);
    px(12, 16, 24, 24, app.hairColor);
  } else if (app.hairStyle === 'bob') {
    px(12, 14, 24, 17, hairDark);
  } else if (app.hairStyle === 'wig') {
    px(9, 12, 30, 24, app.hairColor);
    px(10, 14, 28, 22, hairDark);
  } else if (app.hairStyle === 'afro' || app.hairStyle === 'curly') {
    px(10, 9, 28, 22, hairDark);
    px(11, 10, 26, 18, app.hairColor);
  }

  // Shoulders / Outfit
  px(8, 35, 32, 13, '#1a1c28');
  px(9, 36, 30, 12, app.topColor);
  px(9, 36, 6, 12, topDark);
  px(33, 36, 6, 12, topDark);

  // Collar styles
  if (spec.collar === 'ruff') {
    px(16, 33, 16, 6, '#f6f3ec');
    px(17, 34, 14, 4, '#ffffff');
    for (let x = 17; x < 31; x += 3) {
      px(x, 38, 1, 1, '#cfc5b4');
    }
  } else if (spec.collar === 'tricolor') {
    px(18, 34, 4, 4, '#1e50b5');
    px(22, 34, 4, 4, '#ffffff');
    px(26, 34, 4, 4, '#c93838');
  } else if (spec.collar === 'scarf') {
    px(15, 34, 18, 6, accent);
    px(24, 38, 5, 10, shadeHex(accent, 0.85));
  } else if (spec.collar === 'bowtie') {
    px(18, 35, 12, 13, '#ffffff');
    px(19, 36, 4, 3, accent);
    px(25, 36, 4, 3, accent);
    px(23, 37, 2, 1, shadeHex(accent, 0.7));
  } else if (spec.collar === 'tie') {
    px(19, 35, 10, 13, '#ffffff');
    px(23, 36, 2, 11, accent);
  } else if (spec.collar === 'necklace') {
    px(18, 37, 12, 2, '#f4c542');
    px(23, 39, 2, 2, '#fff5b8');
  } else if (spec.collar === 'hoodie') {
    px(15, 34, 18, 4, topDark);
  }

  // Neck
  px(20, 31, 8, 6, skinDark);

  // Head silhouette
  px(15, 14, 18, 18, '#1a1c28');
  px(16, 13, 16, 19, app.skin);
  px(14, 19, 2, 5, app.skin); // Left ear
  px(32, 19, 2, 5, app.skin); // Right ear
  px(16, 29, 16, 3, skinDark); // Chin shade
  px(18, 15, 12, 3, skinLight); // Forehead highlight

  // Blush
  if (spec.blush) {
    ctx.fillStyle = 'rgba(235, 105, 120, 0.42)';
    ctx.fillRect(17, 24, 3, 2);
    ctx.fillRect(28, 24, 3, 2);
  }

  // Eyes (Gen 3 GBA style)
  px(18, 20, 4, 4, '#ffffff');
  px(26, 20, 4, 4, '#ffffff');
  px(19, 21, 3, 3, spec.eyeColor);
  px(27, 21, 3, 3, spec.eyeColor);
  px(19, 21, 1, 1, '#ffffff');
  px(27, 21, 1, 1, '#ffffff');
  // Eyebrows
  px(18, 18, 4, 1, hairDark);
  px(26, 18, 4, 1, hairDark);

  // Nose & Smile
  px(23, 24, 2, 2, skinDark);
  px(21, 28, 6, 1, '#8c4c46');
  px(22, 29, 4, 1, '#c4716a');

  // Facial hair
  if (app.facialHair === 'mustache') {
    px(19, 26, 10, 2, hairDark);
    px(18, 27, 2, 1, hairDark);
    px(28, 27, 2, 1, hairDark);
  } else if (app.facialHair === 'goatee') {
    px(19, 26, 10, 2, hairDark);
    px(21, 30, 6, 3, hairDark);
  } else if (app.facialHair === 'beard') {
    px(16, 26, 16, 7, hairDark);
    px(18, 27, 12, 5, app.hairColor);
    px(21, 28, 6, 1, '#d69c92');
  } else if (app.facialHair === 'stubble') {
    ctx.fillStyle = 'rgba(40,30,25,0.28)';
    ctx.fillRect(17, 27, 14, 4);
  }

  // Glasses
  if (app.glasses === 'round') {
    ctx.strokeStyle = '#333b52';
    ctx.lineWidth = 1;
    ctx.strokeRect(17.5, 19.5, 5, 5);
    ctx.strokeRect(25.5, 19.5, 5, 5);
    px(22, 21, 4, 1, '#333b52');
  } else if (app.glasses === 'square') {
    px(17, 19, 6, 1, '#2c3145');
    px(17, 24, 6, 1, '#2c3145');
    px(17, 19, 1, 6, '#2c3145');
    px(22, 19, 1, 6, '#2c3145');
    px(25, 19, 6, 1, '#2c3145');
    px(25, 24, 6, 1, '#2c3145');
    px(25, 19, 1, 6, '#2c3145');
    px(30, 19, 1, 6, '#2c3145');
    px(23, 21, 2, 1, '#2c3145');
  } else if (app.glasses === 'sunglasses') {
    px(17, 19, 6, 5, '#131621');
    px(25, 19, 6, 5, '#131621');
    px(23, 20, 2, 1, '#2c3145');
    px(18, 20, 2, 1, '#58698f');
    px(26, 20, 2, 1, '#58698f');
  } else if (app.glasses === 'monocle') {
    ctx.strokeStyle = '#f4c542';
    ctx.strokeRect(25.5, 19.5, 5, 5);
    px(31, 23, 1, 8, '#f4c542');
  }

  // Front Hair
  if (app.hairStyle !== 'bald') {
    px(15, 10, 18, 6, app.hairColor);
    px(17, 11, 14, 2, hairLight);
    px(15, 14, 3, 5, app.hairColor);
    px(30, 14, 3, 5, app.hairColor);
    if (app.hairStyle === 'spiky') {
      px(16, 7, 3, 4, app.hairColor);
      px(21, 6, 4, 5, app.hairColor);
      px(27, 7, 4, 4, app.hairColor);
    } else if (app.hairStyle === 'sidepart') {
      px(15, 13, 10, 4, app.hairColor);
      px(26, 12, 7, 3, hairLight);
    } else if (app.hairStyle === 'pompadour') {
      px(16, 6, 16, 7, app.hairColor);
      px(18, 7, 12, 3, hairLight);
    } else if (app.hairStyle === 'bun') {
      px(19, 5, 10, 6, hairDark);
      px(20, 6, 8, 4, app.hairColor);
    } else if (app.hairStyle === 'ponytail') {
      px(29, 13, 6, 12, hairDark);
    }
  } else {
    px(18, 12, 10, 2, skinLight);
  }

  // Headwear
  const hw = app.headwear ?? 'none';
  const hc = app.headwearColor ?? '#3a4159';
  if (hw === 'beret') {
    px(13, 7, 20, 6, hc);
    px(15, 6, 14, 3, shadeHex(hc, 1.15));
    px(22, 5, 2, 2, hc);
  } else if (hw === 'tophat') {
    px(11, 10, 26, 3, hc);
    px(15, 2, 18, 9, hc);
    px(15, 9, 18, 2, accent);
  } else if (hw === 'bowler' || hw === 'fedora') {
    px(11, 10, 26, 3, hc);
    px(15, 4, 18, 7, hc);
    px(15, 9, 18, 1, accent);
  } else if (hw === 'toque') {
    px(15, 8, 18, 5, '#e8ecf5');
    px(13, 2, 22, 7, '#ffffff');
  } else if (hw === 'crown') {
    px(15, 6, 18, 6, '#f4c542');
    px(15, 3, 3, 4, '#ffd966');
    px(22, 2, 4, 5, '#ffd966');
    px(30, 3, 3, 4, '#ffd966');
    px(23, 8, 2, 2, '#d93848');
  } else if (hw === 'headband') {
    px(14, 12, 20, 3, hc);
  } else if (hw === 'cap') {
    px(14, 7, 20, 6, hc);
    px(14, 11, 24, 3, shadeHex(hc, 0.8));
  } else if (hw === 'flower' || hw === 'ribbon') {
    px(30, 9, 6, 6, hc);
    px(32, 11, 2, 2, '#ffe47a');
  } else if (hw === 'feathered_hat') {
    px(11, 10, 26, 3, hc);
    px(15, 4, 18, 7, hc);
    px(29, 1, 9, 4, '#ffffff');
  } else if (hw === 'turban') {
    px(13, 5, 22, 8, hc);
    px(15, 6, 18, 3, shadeHex(hc, 1.16));
    px(22, 8, 4, 4, '#f4c542');
  }

  // Signature Foreground Props
  const prop = spec.prop ?? 'none';
  if (prop === 'quill') {
    px(35, 32, 2, 13, '#f2e8d5');
    px(37, 29, 3, 7, '#ffffff');
    px(34, 42, 3, 3, '#f4c542');
  } else if (prop === 'mask') {
    px(32, 33, 10, 9, '#f5efe6');
    px(34, 36, 2, 2, '#1e2130');
    px(38, 36, 2, 2, '#1e2130');
    px(35, 39, 4, 2, '#c93838');
  } else if (prop === 'guitar') {
    px(33, 34, 10, 12, '#b8622a');
    px(36, 37, 4, 4, '#3d1e0d');
    px(37, 27, 2, 9, '#7a401d');
  } else if (prop === 'film' || prop === 'clapper') {
    px(32, 35, 12, 10, '#1d212e');
    px(33, 36, 2, 2, '#ffffff');
    px(37, 36, 2, 2, '#ffffff');
    px(41, 36, 2, 2, '#ffffff');
    px(34, 39, 8, 4, '#79c2f2');
  } else if (prop === 'camera') {
    px(32, 36, 12, 8, '#2b3040');
    px(35, 34, 5, 2, '#cfd6e3');
    px(36, 38, 4, 4, '#6eb8eb');
  } else if (prop === 'whisk') {
    px(36, 36, 2, 10, '#858e9e');
    px(34, 29, 6, 7, '#dfe6f2');
  } else if (prop === 'macaron') {
    px(33, 37, 10, 3, '#f48fa8');
    px(33, 40, 10, 2, '#fff0c7');
    px(33, 42, 10, 3, '#f48fa8');
  } else if (prop === 'soccer') {
    px(33, 36, 10, 10, '#ffffff');
    px(36, 39, 4, 4, '#1b1e29');
  } else if (prop === 'basketball') {
    px(33, 36, 10, 10, '#e36b2b');
    px(33, 40, 10, 1, '#3b1c0a');
    px(37, 36, 1, 10, '#3b1c0a');
  } else if (prop === 'rose') {
    px(36, 36, 2, 10, '#368a46');
    px(34, 31, 6, 5, '#d93848');
  } else if (prop === 'script') {
    px(33, 34, 10, 11, '#f4ebd9');
    px(35, 36, 6, 1, '#5c4b37');
    px(35, 39, 6, 1, '#5c4b37');
  }

  return c;
}

export function drawPortrait(
  ctx: CanvasRenderingContext2D,
  app: SpriteAppearance,
  spec: PortraitSpec,
  dx: number,
  dy: number,
  size = 48,
  customPortraitUrl?: string
): void {
  const img = preloadCustomImage(customPortraitUrl);
  if (img) {
    ctx.drawImage(img, dx, dy, size, size);
    return;
  }
  const key = `${JSON.stringify(app)}:${JSON.stringify(spec)}`;
  let cached = portraitCache.get(key);
  if (!cached) {
    cached = renderPortrait(app, spec);
    portraitCache.set(key, cached);
  }
  ctx.drawImage(cached, dx, dy, size, size);
}

// ---- 20x20 POKÉMON GYM BADGE ICONS ----

function renderBadgeIcon(badge: BadgeDef, unlocked: boolean): HTMLCanvasElement {
  const c = makeCanvas(20, 20);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const px = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  if (!unlocked) {
    // Crisp dark silhouette badge slot
    px(5, 3, 10, 14, '#24293d');
    px(3, 5, 14, 10, '#24293d');
    px(6, 5, 8, 10, '#313752');
    px(8, 8, 4, 4, '#434c6e');
    return c;
  }

  const col = badge.color;
  const rim = badge.rimColor;
  const light = shadeHex(col, 1.28);
  const dark = shadeHex(col, 0.72);

  // Outer metallic bezel & colored jewel base
  px(5, 1, 10, 18, '#171a26');
  px(3, 3, 14, 14, '#171a26');
  px(1, 5, 18, 10, '#171a26');

  px(5, 2, 10, 16, rim);
  px(3, 4, 14, 12, rim);
  px(2, 5, 16, 10, rim);

  px(6, 3, 8, 14, col);
  px(4, 5, 12, 10, col);
  px(6, 4, 6, 3, light);
  px(7, 13, 6, 3, dark);

  // Center emblem in crisp white/gold
  const sym = '#fff9eb';
  switch (badge.icon) {
    case 'crown':
    case 'crown_mvp':
    case 'tiara':
      px(5, 10, 10, 3, sym);
      px(5, 7, 2, 3, sym);
      px(9, 6, 2, 4, sym);
      px(13, 7, 2, 3, sym);
      break;
    case 'quill':
    case 'scroll':
    case 'book':
      px(6, 6, 8, 8, sym);
      px(7, 8, 6, 1, dark);
      px(7, 10, 5, 1, dark);
      break;
    case 'mask':
    case 'tragedy':
      px(5, 7, 10, 6, sym);
      px(7, 9, 2, 2, dark);
      px(11, 9, 2, 2, dark);
      break;
    case 'flower':
    case 'rose_gold':
      px(8, 5, 4, 10, sym);
      px(5, 8, 10, 4, sym);
      px(8, 8, 4, 4, rim);
      break;
    case 'sword':
      px(9, 5, 2, 10, sym);
      px(6, 11, 8, 2, rim);
      break;
    case 'piano':
    case 'bossanote':
    case 'guitar':
      px(7, 6, 2, 8, sym);
      px(9, 6, 4, 2, sym);
      px(5, 12, 4, 3, sym);
      break;
    case 'film':
    case 'camera':
    case 'aperture':
    case 'leica':
    case 'lens':
      px(5, 7, 10, 6, sym);
      px(8, 8, 4, 4, dark);
      px(9, 9, 2, 2, '#79c2f2');
      break;
    case 'toque_gold':
    case 'star_chef':
    case 'whisk':
    case 'macaron':
      px(6, 6, 8, 4, sym);
      px(7, 10, 6, 4, sym);
      break;
    case 'cannon':
    case 'net':
    case 'ballon_dor':
    case 'boot':
    case 'joga':
      px(7, 6, 6, 8, sym);
      px(6, 7, 8, 6, sym);
      px(9, 9, 2, 2, dark);
      break;
    case 'hoop':
    case 'trophy':
    case 'goat':
    case 'ring':
      px(6, 6, 8, 5, sym);
      px(9, 11, 2, 3, sym);
      px(7, 14, 6, 1, sym);
      break;
    default:
      // Sparkling diamond star
      px(9, 5, 2, 10, sym);
      px(5, 9, 10, 2, sym);
      px(7, 7, 6, 6, sym);
      px(9, 9, 2, 2, rim);
  }

  return c;
}

export function drawBadgeIcon(
  ctx: CanvasRenderingContext2D,
  badge: BadgeDef,
  unlocked: boolean,
  dx: number,
  dy: number,
  scale = 1
): void {
  const key = `${badge.id}:${unlocked ? '1' : '0'}`;
  let cached = badgeCache.get(key);
  if (!cached) {
    cached = renderBadgeIcon(badge, unlocked);
    badgeCache.set(key, cached);
  }
  ctx.drawImage(cached, dx, dy, 20 * scale, 20 * scale);
}
