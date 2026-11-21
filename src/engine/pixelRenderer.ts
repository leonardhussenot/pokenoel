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

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function safeEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill = true
): void {
  ctx.beginPath();
  if (typeof ctx.ellipse === 'function') {
    ctx.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  } else {
    ctx.arc(cx, cy, Math.max(0.5, (rx + ry) * 0.5), 0, Math.PI * 2);
  }
  if (fill) ctx.fill();
  else ctx.stroke();
}

function safeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill = true
): void {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, rad);
  } else {
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.lineTo(x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.lineTo(x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.lineTo(x, y + h - rad);
    ctx.lineTo(x, y + rad);
    if (typeof ctx.closePath === 'function') ctx.closePath();
  }
  if (fill) ctx.fill();
  else ctx.stroke();
}

function safeRadialGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  inner: string,
  outer: string
): void {
  if (typeof ctx.createRadialGradient === 'function') {
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = inner;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
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

export function preloadPortraitUrls(urls: Array<string | undefined>): void {
  for (const url of urls) {
    if (url) preloadCustomImage(url);
  }
}

// ---- 64x96 HIGH-DEFINITION OVERWORLD SPRITES (drawn into 16x24 logical = 1:1 on 4x canvas) ----

function renderOverworldSprite(
  app: SpriteAppearance,
  dir: Direction,
  frame: number // 0=idle, 1=stepL, 2=stepR
): HTMLCanvasElement {
  const c = makeCanvas(64, 96);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  if (typeof ctx.scale === 'function') {
    ctx.scale(2, 2);
  }

  const px = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  const outline = '#181a28';
  const skinDark = shadeHex(app.skin, 0.84);
  const skinLight = shadeHex(app.skin, 1.07);
  const hairDark = shadeHex(app.hairColor, 0.74);
  const hairLight = shadeHex(app.hairColor, 1.18);
  const topDark = shadeHex(app.topColor, 0.74);
  const topLight = shadeHex(app.topColor, 1.15);
  const botDark = shadeHex(app.bottomColor, 0.72);
  const accent = app.accentColor ?? '#f4c542';

  const bounce = frame === 0 ? 0 : -2;
  const stepL = frame === 1 ? -2 : frame === 2 ? 2 : 0;
  const stepR = -stepL;

  // Soft elliptical ground shadow
  ctx.fillStyle = 'rgba(12, 16, 28, 0.34)';
  safeEllipse(ctx, 16, 44, 10, 3.2);

  // Legs & Shoes
  if (app.outfitStyle === 'dress') {
    ctx.fillStyle = outline;
    safeRoundRect(ctx, 7, 32 + bounce, 18, 9, 3);
    ctx.fillStyle = app.topColor;
    safeRoundRect(ctx, 8, 32 + bounce, 16, 8, 2.5);
    px(8, 38 + bounce, 16, 2, topDark);
    px(10, 39 + Math.max(0, stepL), 4, 4, app.skin);
    px(18, 39 + Math.max(0, stepR), 4, 4, app.skin);
    ctx.fillStyle = '#261e1c';
    safeRoundRect(ctx, 9, 42 + Math.max(0, stepL), 5, 3, 1.5);
    safeRoundRect(ctx, 18, 42 + Math.max(0, stepR), 5, 3, 1.5);
  } else {
    // Left & right trousers with stride offset
    ctx.fillStyle = outline;
    safeRoundRect(ctx, 9, 34 + bounce, 6, 9 + (stepL > 0 ? 2 : 0), 2);
    safeRoundRect(ctx, 17, 34 + bounce, 6, 9 + (stepR > 0 ? 2 : 0), 2);
    px(10, 34 + bounce, 5, 8 + (stepL > 0 ? 2 : 0), app.bottomColor);
    px(17, 34 + bounce, 5, 8 + (stepR > 0 ? 2 : 0), botDark);
    // Shoes with light toe highlight
    ctx.fillStyle = '#221d24';
    safeRoundRect(ctx, 9, 42 + (stepL > 0 ? 2 : 0), 6, 4, 1.5);
    safeRoundRect(ctx, 17, 42 + (stepR > 0 ? 2 : 0), 6, 4, 1.5);
    px(10, 43 + (stepL > 0 ? 2 : 0), 3, 1, '#524b59');
    px(18, 43 + (stepR > 0 ? 2 : 0), 3, 1, '#524b59');
  }

  // Torso with soft shading & crisp silhouette
  ctx.fillStyle = outline;
  safeRoundRect(ctx, 7, 23 + bounce, 18, 13, 3.5);
  ctx.fillStyle = app.topColor;
  safeRoundRect(ctx, 8, 24 + bounce, 16, 11, 2.5);
  px(8, 24 + bounce, 16, 2, topLight);
  px(8, 33 + bounce, 16, 2, topDark);

  // Outfit details
  if (app.outfitStyle === 'suit' || app.outfitStyle === 'trench') {
    px(13, 24 + bounce, 6, 8, '#f4f6fc');
    px(15, 25 + bounce, 2, 7, accent);
    px(10, 25 + bounce, 3, 7, topDark);
    px(19, 25 + bounce, 3, 7, topDark);
  } else if (app.outfitStyle === 'chef') {
    px(10, 25 + bounce, 12, 9, '#ffffff');
    px(12, 24 + bounce, 8, 2, accent);
    px(13, 28 + bounce, 2, 2, '#cfd6e3');
    px(17, 28 + bounce, 2, 2, '#cfd6e3');
  } else if (app.outfitStyle === 'historical') {
    px(10, 24 + bounce, 12, 4, '#f7f1e6');
    px(12, 28 + bounce, 8, 6, accent);
    px(15, 28 + bounce, 2, 6, '#fff5cc');
  } else if (app.outfitStyle === 'jersey_foot' || app.outfitStyle === 'jersey_basket') {
    px(10, 24 + bounce, 12, 2, accent);
    px(13, 27 + bounce, 6, 5, accent);
    px(14, 28 + bounce, 4, 3, app.topColor);
  } else if (app.outfitStyle === 'coat') {
    // Stylish coat lapels / stripes (e.g., Francis's navy & white striped jacket, Dominique's scarf coat)
    px(8, 24 + bounce, 4, 10, topDark);
    px(20, 24 + bounce, 4, 10, topDark);
    px(12, 24 + bounce, 8, 3, accent);
    px(13, 27 + bounce, 6, 2, shadeHex(accent, 0.85));
    px(9, 26 + bounce, 3, 2, accent);
    px(20, 26 + bounce, 3, 2, accent);
  }

  // Arms
  if (dir === 'left') {
    ctx.fillStyle = outline;
    safeRoundRect(ctx, 11, 25 + bounce + stepL, 7, 9, 2);
    ctx.fillStyle = app.topColor;
    safeRoundRect(ctx, 12, 26 + bounce + stepL, 5, 7, 1.5);
    ctx.fillStyle = app.skin;
    safeRoundRect(ctx, 12, 32 + bounce + stepL, 4, 3, 1.2);
  } else if (dir === 'right') {
    ctx.fillStyle = outline;
    safeRoundRect(ctx, 14, 25 + bounce + stepR, 7, 9, 2);
    ctx.fillStyle = app.topColor;
    safeRoundRect(ctx, 15, 26 + bounce + stepR, 5, 7, 1.5);
    ctx.fillStyle = app.skin;
    safeRoundRect(ctx, 16, 32 + bounce + stepR, 4, 3, 1.2);
  } else {
    ctx.fillStyle = outline;
    safeRoundRect(ctx, 4, 24 + bounce + stepL, 5, 9, 2);
    safeRoundRect(ctx, 23, 24 + bounce + stepR, 5, 9, 2);
    ctx.fillStyle = topDark;
    safeRoundRect(ctx, 5, 25 + bounce + stepL, 3, 7, 1.2);
    safeRoundRect(ctx, 24, 25 + bounce + stepR, 3, 7, 1.2);
    ctx.fillStyle = app.skin;
    safeRoundRect(ctx, 5, 31 + bounce + stepL, 3, 3, 1);
    safeRoundRect(ctx, 24, 31 + bounce + stepR, 3, 3, 1);
  }

  // Back hair layer for long / wavy / curly / wig
  if (
    dir !== 'up' &&
    (app.hairStyle === 'long' ||
      app.hairStyle === 'wavy' ||
      app.hairStyle === 'bangs_wavy' ||
      app.hairStyle === 'wig')
  ) {
    ctx.fillStyle = hairDark;
    safeRoundRect(ctx, 5, 10 + bounce, 22, 17, 5);
  }

  // Head with rounded illustrated contour
  ctx.fillStyle = outline;
  safeRoundRect(ctx, 6, 7 + bounce, 20, 17, 6);
  ctx.fillStyle = app.skin;
  safeRoundRect(ctx, 7, 8 + bounce, 18, 15, 5.5);
  // Subtle forehead highlight & chin shading
  ctx.fillStyle = skinLight;
  safeRoundRect(ctx, 10, 9 + bounce, 12, 4, 2);
  ctx.fillStyle = skinDark;
  safeRoundRect(ctx, 8, 20 + bounce, 16, 3, 2);

  if (dir === 'up') {
    // Full back-of-head hair
    ctx.fillStyle = app.hairColor;
    safeRoundRect(ctx, 7, 7 + bounce, 18, 16, 5.5);
    ctx.fillStyle = hairDark;
    safeRoundRect(ctx, 7, 18 + bounce, 18, 5, 3);
    ctx.fillStyle = hairLight;
    safeRoundRect(ctx, 10, 9 + bounce, 12, 3, 1.5);
  } else {
    // Expressive eyes with sclera, pupil & catchlight
    const drawEye = (ex: number, ey: number) => {
      px(ex, ey, 4, 4, '#ffffff');
      px(ex + 1, ey, 3, 4, '#1b1d2b');
      px(ex + 1, ey + 1, 1, 1, '#ffffff');
    };
    if (dir === 'down') {
      drawEye(10, 14 + bounce);
      drawEye(18, 14 + bounce);
    } else if (dir === 'left') {
      drawEye(9, 14 + bounce);
    } else {
      drawEye(19, 14 + bounce);
    }

    // Subtle smile
    px(dir === 'left' ? 10 : dir === 'right' ? 19 : 14, 20 + bounce, 4, 1, shadeHex(app.skin, 0.72));

    // Facial hair
    const fhColor = app.facialHairColor ?? hairDark;
    if (app.facialHair === 'mustache') {
      px(dir === 'left' ? 8 : dir === 'right' ? 17 : 12, 19 + bounce, 8, 2, fhColor);
    } else if (app.facialHair === 'goatee') {
      px(12, 19 + bounce, 8, 2, fhColor);
      px(13, 21 + bounce, 6, 3, fhColor);
    } else if (app.facialHair === 'beard') {
      ctx.fillStyle = fhColor;
      safeRoundRect(ctx, 8, 18 + bounce, 16, 6, 3);
      px(12, 19 + bounce, 8, 1, shadeHex(app.skin, 0.85));
    } else if (app.facialHair === 'stubble') {
      ctx.fillStyle = hexToRgba(fhColor, 0.45);
      safeRoundRect(ctx, 9, 19 + bounce, 14, 4, 2);
    }

    // Glasses (crisp frames & lens glint!)
    if (app.glasses && app.glasses !== 'none') {
      const gCol =
        app.glassesColor ??
        (app.glasses === 'sunglasses'
          ? '#151824'
          : app.glasses === 'clear'
            ? '#dce3ee'
            : '#2c3145');
      const drawLens = (lx: number, ly: number) => {
        if (app.glasses === 'sunglasses') {
          ctx.fillStyle = shadeHex(gCol, 0.72);
          safeRoundRect(ctx, lx - 1, ly - 1, 8, 6, 2);
          ctx.fillStyle = gCol;
          safeRoundRect(ctx, lx, ly, 6, 4, 1.5);
          px(lx + 1, ly + 1, 2, 1, 'rgba(255,255,255,0.55)');
        } else {
          ctx.strokeStyle = gCol;
          ctx.lineWidth = 1.4;
          safeRoundRect(ctx, lx, ly, 6, 5, app.glasses === 'round' ? 2.5 : 1, false);
          ctx.fillStyle = app.glasses === 'clear' ? 'rgba(215,240,255,0.28)' : 'rgba(185,225,255,0.22)';
          ctx.fillRect(lx + 1, ly + 1, 4, 3);
        }
      };
      if (dir === 'down') {
        drawLens(9, 13 + bounce);
        drawLens(17, 13 + bounce);
        px(15, 15 + bounce, 2, 1, gCol);
      } else if (dir === 'left') {
        drawLens(8, 13 + bounce);
      } else {
        drawLens(18, 13 + bounce);
      }
    }

    // Detailed Hair styles
    if (app.hairStyle !== 'bald') {
      if (app.hairStyle === 'receding') {
        px(6, 8 + bounce, 4, 7, app.hairColor);
        px(22, 8 + bounce, 4, 7, app.hairColor);
        px(10, 6 + bounce, 12, 3, hairDark);
        px(12, 6 + bounce, 8, 2, hairLight);
      } else {
        ctx.fillStyle = app.hairColor;
        safeRoundRect(ctx, 6, 5 + bounce, 20, 7, 3.5);
        ctx.fillStyle = hairLight;
        safeRoundRect(ctx, 9, 6 + bounce, 14, 2.5, 1.2);
        if (app.hairStyle === 'spiky') {
          px(8, 3 + bounce, 4, 4, app.hairColor);
          px(14, 1 + bounce, 4, 5, hairLight);
          px(20, 3 + bounce, 4, 4, app.hairColor);
        } else if (
          app.hairStyle === 'curly' ||
          app.hairStyle === 'afro' ||
          app.hairStyle === 'tousled_curls'
        ) {
          ctx.fillStyle = app.hairColor;
          safeEllipse(ctx, 7, 11 + bounce, 4, 5);
          safeEllipse(ctx, 25, 11 + bounce, 4, 5);
          safeEllipse(ctx, 11, 6 + bounce, 5, 3.5);
          safeEllipse(ctx, 21, 6 + bounce, 5, 3.5);
          ctx.fillStyle = hairLight;
          safeEllipse(ctx, 16, 5 + bounce, 5, 3);
        } else if (
          app.hairStyle === 'long' ||
          app.hairStyle === 'wavy' ||
          app.hairStyle === 'bangs_wavy'
        ) {
          ctx.fillStyle = app.hairColor;
          safeRoundRect(ctx, 5, 9 + bounce, 4, 15, 2);
          safeRoundRect(ctx, 23, 9 + bounce, 4, 15, 2);
          if (app.hairStyle === 'bangs_wavy') {
            px(9, 10 + bounce, 6, 3, hairDark);
            px(17, 10 + bounce, 6, 3, hairDark);
            px(13, 9 + bounce, 6, 3, hairLight);
          }
        } else if (app.hairStyle === 'bob') {
          ctx.fillStyle = app.hairColor;
          safeRoundRect(ctx, 5, 9 + bounce, 4, 11, 2);
          safeRoundRect(ctx, 23, 9 + bounce, 4, 11, 2);
        } else if (app.hairStyle === 'bun' || app.hairStyle === 'ponytail') {
          ctx.fillStyle = hairDark;
          safeEllipse(ctx, 16, 4 + bounce, 4.5, 3);
        } else if (app.hairStyle === 'wig') {
          ctx.fillStyle = app.hairColor;
          safeRoundRect(ctx, 4, 7 + bounce, 5, 16, 2.5);
          safeRoundRect(ctx, 23, 7 + bounce, 5, 16, 2.5);
        } else if (app.hairStyle === 'pompadour') {
          ctx.fillStyle = app.hairColor;
          safeRoundRect(ctx, 8, 2 + bounce, 16, 7, 3.5);
          ctx.fillStyle = hairLight;
          safeRoundRect(ctx, 10, 3 + bounce, 12, 3, 1.5);
        }
      }
    }
  }

  // Headwear
  const hw = app.headwear ?? 'none';
  const hc = app.headwearColor ?? '#3a4159';
  if (hw === 'beret') {
    ctx.fillStyle = hc;
    safeEllipse(ctx, 15, 6 + bounce, 10, 3.5);
    px(15, 2 + bounce, 2, 2, hc);
  } else if (hw === 'tophat') {
    px(4, 6 + bounce, 24, 3, hc);
    px(8, 0 + bounce, 16, 7, hc);
    px(8, 5 + bounce, 16, 2, accent);
  } else if (hw === 'bowler' || hw === 'fedora') {
    px(4, 6 + bounce, 24, 3, hc);
    ctx.fillStyle = hc;
    safeRoundRect(ctx, 8, 1 + bounce, 16, 6, 3);
    px(8, 5 + bounce, 16, 1, accent);
  } else if (hw === 'toque') {
    ctx.fillStyle = '#ffffff';
    safeEllipse(ctx, 16, 3 + bounce, 9, 4);
    px(9, 5 + bounce, 14, 4, '#eef2fa');
  } else if (hw === 'headband') {
    px(6, 8 + bounce, 20, 3, hc);
  } else if (hw === 'cap') {
    ctx.fillStyle = hc;
    safeRoundRect(ctx, 6, 4 + bounce, 20, 5, 2.5);
    px(dir === 'left' ? 2 : 12, 8 + bounce, 12, 2, shadeHex(hc, 0.72));
  } else if (hw === 'crown') {
    px(8, 3 + bounce, 16, 5, '#f4c542');
    px(8, 0 + bounce, 4, 4, '#ffe066');
    px(14, 0 + bounce, 4, 4, '#ffe066');
    px(20, 0 + bounce, 4, 4, '#ffe066');
    px(15, 4 + bounce, 2, 2, '#d93848');
  } else if (hw === 'flower' || hw === 'ribbon') {
    ctx.fillStyle = hc;
    safeEllipse(ctx, 23, 8 + bounce, 3.5, 3.5);
    px(22, 7 + bounce, 2, 2, '#ffe47a');
  } else if (hw === 'feathered_hat') {
    px(4, 6 + bounce, 24, 3, hc);
    px(8, 2 + bounce, 16, 5, hc);
    ctx.fillStyle = '#ffffff';
    safeEllipse(ctx, 24, 3 + bounce, 5, 2);
  } else if (hw === 'turban') {
    ctx.fillStyle = hc;
    safeEllipse(ctx, 16, 5 + bounce, 10, 4.5);
    px(14, 4 + bounce, 4, 4, '#f4c542');
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
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cached, dx, dy, 16, 24);
  ctx.restore();
}

// ---- 192x192 HIGH-DEFINITION ILLUSTRATED PORTRAITS (1:1 on 4x canvas) ----

function renderPortrait(app: SpriteAppearance, spec: PortraitSpec): HTMLCanvasElement {
  const c = makeCanvas(192, 192);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  if (typeof ctx.scale === 'function') {
    ctx.scale(2, 2);
  }

  const px = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  // Rich multi-stop backdrop + warm storybook golden bokeh (matches painted family portraits!)
  const bg = ctx.createLinearGradient(0, 0, 0, 96);
  bg.addColorStop(0, spec.bgTop);
  bg.addColorStop(1, spec.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 96, 96);

  safeRadialGlow(ctx, 48, 46, 48, 'rgba(255, 232, 178, 0.24)', 'rgba(255, 232, 178, 0)');
  safeRadialGlow(ctx, 20, 62, 11, 'rgba(255, 218, 138, 0.20)', 'rgba(255, 218, 138, 0)');
  safeRadialGlow(ctx, 78, 44, 13, 'rgba(255, 218, 138, 0.18)', 'rgba(255, 218, 138, 0)');
  safeRadialGlow(ctx, 82, 64, 8, 'rgba(255, 226, 160, 0.22)', 'rgba(255, 226, 160, 0)');
  safeRadialGlow(ctx, 16, 48, 7, 'rgba(255, 236, 180, 0.16)', 'rgba(255, 236, 180, 0)');

  const outline = '#181a28';
  const skinDark = shadeHex(app.skin, 0.85);
  const skinMid = shadeHex(app.skin, 0.93);
  const skinLight = shadeHex(app.skin, 1.08);
  const hairDark = shadeHex(app.hairColor, 0.72);
  const hairLight = shadeHex(app.hairColor, 1.22);
  const topDark = shadeHex(app.topColor, 0.74);
  const topLight = shadeHex(app.topColor, 1.15);
  const accent = app.accentColor ?? '#f4c542';

  // Back hair volume (long, wavy, bangs_wavy, bob, wig, afro, curly, tousled_curls)
  if (app.hairStyle === 'long' || app.hairStyle === 'wavy' || app.hairStyle === 'bangs_wavy') {
    ctx.fillStyle = hairDark;
    safeRoundRect(ctx, 20, 26, 56, 52, 18);
    ctx.fillStyle = app.hairColor;
    safeRoundRect(ctx, 22, 30, 52, 46, 16);
    // Soft wavy hair strand locks on sides
    ctx.fillStyle = hairLight;
    safeEllipse(ctx, 26, 54, 4, 12);
    safeEllipse(ctx, 70, 54, 4, 12);
  } else if (app.hairStyle === 'bob') {
    ctx.fillStyle = hairDark;
    safeRoundRect(ctx, 22, 26, 52, 38, 16);
    ctx.fillStyle = app.hairColor;
    safeRoundRect(ctx, 24, 28, 48, 34, 14);
  } else if (app.hairStyle === 'wig') {
    ctx.fillStyle = hairDark;
    safeRoundRect(ctx, 16, 22, 64, 52, 18);
    ctx.fillStyle = app.hairColor;
    safeRoundRect(ctx, 18, 24, 60, 48, 16);
    // Powdered wig side curls
    ctx.fillStyle = hairLight;
    safeEllipse(ctx, 22, 42, 6, 7);
    safeEllipse(ctx, 22, 56, 6, 7);
    safeEllipse(ctx, 74, 42, 6, 7);
    safeEllipse(ctx, 74, 56, 6, 7);
  } else if (
    app.hairStyle === 'afro' ||
    app.hairStyle === 'curly' ||
    app.hairStyle === 'tousled_curls'
  ) {
    ctx.fillStyle = hairDark;
    safeEllipse(ctx, 48, 36, 30, 25);
    ctx.fillStyle = app.hairColor;
    safeEllipse(ctx, 48, 34, 28, 22);
    // Individual volumetric curls around outer crown
    safeEllipse(ctx, 24, 28, 9, 9);
    safeEllipse(ctx, 72, 28, 9, 9);
    safeEllipse(ctx, 21, 42, 8, 9);
    safeEllipse(ctx, 75, 42, 8, 9);
    safeEllipse(ctx, 34, 18, 10, 8);
    safeEllipse(ctx, 62, 18, 10, 8);
    ctx.fillStyle = hairLight;
    safeEllipse(ctx, 48, 17, 12, 7);
  }

  // Shoulders & Outfit
  ctx.fillStyle = outline;
  safeRoundRect(ctx, 14, 68, 68, 32, 16);
  ctx.fillStyle = app.topColor;
  safeRoundRect(ctx, 16, 70, 64, 30, 14);
  // Shoulder shading
  ctx.fillStyle = topDark;
  safeRoundRect(ctx, 16, 72, 12, 26, 6);
  safeRoundRect(ctx, 68, 72, 12, 26, 6);
  ctx.fillStyle = topLight;
  px(28, 71, 40, 3, topLight);

  if (app.outfitStyle === 'coat' && app.accentColor) {
    // Crisp jacket shoulder stripes & lapel trim (Francis's striped navy jacket / coats)
    px(19, 73, 9, 5, app.accentColor);
    px(19, 80, 7, 3, app.accentColor);
    px(68, 73, 9, 5, app.accentColor);
    px(70, 80, 7, 3, app.accentColor);
  } else if (app.outfitStyle === 'jersey_foot' || app.outfitStyle === 'jersey_basket') {
    // Athletic jersey V-neck trim & number detail (Alexis #10!)
    px(30, 70, 36, 4, accent);
    px(18, 76, 6, 20, accent);
    px(72, 76, 6, 20, accent);
    if (app.jerseyNumber) {
      ctx.fillStyle = accent;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(app.jerseyNumber, 48, 86);
    }
  } else if (app.outfitStyle === 'chef') {
    // Double-breasted white chef jacket with buttons
    px(30, 72, 36, 24, '#ffffff');
    px(40, 78, 3, 3, '#3b4252');
    px(53, 78, 3, 3, '#3b4252');
    px(40, 86, 3, 3, '#3b4252');
    px(53, 86, 3, 3, '#3b4252');
  }

  // Collar styles
  if (spec.collar === 'ruff') {
    ctx.fillStyle = '#f5efe4';
    safeEllipse(ctx, 48, 72, 18, 7);
    ctx.fillStyle = '#ffffff';
    for (let x = 32; x <= 62; x += 5) {
      safeEllipse(ctx, x, 73, 3, 4);
    }
  } else if (spec.collar === 'tricolor') {
    px(34, 68, 9, 9, '#1e50b5');
    px(43, 68, 10, 9, '#ffffff');
    px(53, 68, 9, 9, '#c93838');
  } else if (spec.collar === 'scarf') {
    // Warm draped scarf (Dominique's signature orange scarf!)
    ctx.fillStyle = accent;
    safeRoundRect(ctx, 29, 67, 38, 13, 6);
    ctx.fillStyle = shadeHex(accent, 1.15);
    px(33, 69, 30, 3, shadeHex(accent, 1.15));
    ctx.fillStyle = shadeHex(accent, 0.84);
    safeRoundRect(ctx, 48, 76, 11, 20, 4);
  } else if (spec.collar === 'bowtie') {
    px(36, 70, 24, 26, '#ffffff');
    ctx.fillStyle = accent;
    safeRoundRect(ctx, 37, 72, 9, 7, 2);
    safeRoundRect(ctx, 50, 72, 9, 7, 2);
    ctx.fillStyle = shadeHex(accent, 0.72);
    safeRoundRect(ctx, 45, 73, 6, 5, 1.5);
  } else if (spec.collar === 'tie') {
    px(37, 70, 22, 26, '#ffffff');
    ctx.fillStyle = accent;
    px(45, 72, 6, 22, accent);
    px(46, 72, 2, 20, shadeHex(accent, 1.2));
  } else if (spec.collar === 'necklace') {
    // Gleaming gold chain & pendant (Joseph!)
    ctx.strokeStyle = '#f4c542';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(48, 67, 13, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#ffe585';
    safeEllipse(ctx, 48, 81, 3.2, 3.8);
    px(47, 79, 2, 2, '#ffffff');
  } else if (spec.collar === 'hoodie') {
    ctx.fillStyle = topDark;
    safeRoundRect(ctx, 29, 67, 38, 10, 5);
    px(42, 74, 2, 12, '#e8edf7');
    px(52, 74, 2, 12, '#e8edf7');
  }

  // Neck with chin cast shadow
  ctx.fillStyle = app.skin;
  safeRoundRect(ctx, 40, 60, 16, 14, 5);
  ctx.fillStyle = skinDark;
  safeRoundRect(ctx, 40, 60, 16, 6, 3);

  // Ears
  ctx.fillStyle = outline;
  safeEllipse(ctx, 28, 44, 4.8, 6.5);
  safeEllipse(ctx, 68, 44, 4.8, 6.5);
  ctx.fillStyle = app.skin;
  safeEllipse(ctx, 29, 44, 3.8, 5.5);
  safeEllipse(ctx, 67, 44, 3.8, 5.5);
  ctx.fillStyle = skinDark;
  safeEllipse(ctx, 29, 44, 1.8, 3);
  safeEllipse(ctx, 67, 44, 1.8, 3);

  // Sculpted illustrated head silhouette with directional 3D lighting
  ctx.fillStyle = outline;
  safeEllipse(ctx, 48, 43, 20.5, 22.8);
  const faceGrad = ctx.createLinearGradient(28, 22, 68, 66);
  faceGrad.addColorStop(0, skinLight);
  faceGrad.addColorStop(0.5, app.skin);
  faceGrad.addColorStop(1, skinMid);
  ctx.fillStyle = faceGrad;
  safeEllipse(ctx, 48, 43, 19.2, 21.4);
  // Refined chin & cheek warm contours
  ctx.fillStyle = skinLight;
  safeEllipse(ctx, 45, 31, 11, 5);
  safeEllipse(ctx, 37, 48, 4.5, 2.5);
  safeEllipse(ctx, 59, 48, 4.5, 2.5);
  ctx.fillStyle = hexToRgba(skinDark, 0.35);
  safeEllipse(ctx, 48, 60.5, 11, 3.2);

  // Soft cheek blush
  if (spec.blush) {
    safeRadialGlow(ctx, 35, 49.5, 6.5, 'rgba(235, 100, 120, 0.34)', 'rgba(235, 100, 120, 0)');
    safeRadialGlow(ctx, 61, 49.5, 6.5, 'rgba(235, 100, 120, 0.34)', 'rgba(235, 100, 120, 0)');
  }

  // Expressive Illustrated Almond Eyes with eyelid crease & twin catchlights
  const drawPortraitEye = (cx: number, cy: number, side: -1 | 1) => {
    // Upper eyelid crease
    ctx.strokeStyle = hexToRgba(skinDark, 0.72);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy + 1.4, 5.8, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();

    // Sclera
    ctx.fillStyle = '#fbfcff';
    safeEllipse(ctx, cx, cy, 4.7, 3.6);
    // Rich iris
    ctx.fillStyle = spec.eyeColor;
    safeEllipse(ctx, cx + side * -0.15, cy + 0.15, 2.9, 3.1);
    ctx.fillStyle = shadeHex(spec.eyeColor, 1.35);
    safeEllipse(ctx, cx + side * -0.15, cy + 1.1, 1.6, 1.1);
    // Pupil
    ctx.fillStyle = '#121420';
    safeEllipse(ctx, cx + side * -0.15, cy + 0.15, 1.5, 1.65);
    // Crisp twin catchlights
    ctx.fillStyle = '#ffffff';
    safeEllipse(ctx, cx - 1.1, cy - 1.0, 1.0, 1.0);
    safeEllipse(ctx, cx + 1.2, cy + 0.9, 0.55, 0.55);
    // Curved dark upper lash line
    ctx.strokeStyle = '#181a28';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(cx, cy + 1.8, 5.2, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();
  };
  drawPortraitEye(39, 43, -1);
  drawPortraitEye(57, 43, 1);

  // Sculpted Arched Eyebrows
  ctx.strokeStyle = hairDark;
  ctx.lineWidth = 2.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(33.5, 37.2);
  if (typeof ctx.quadraticCurveTo === 'function') {
    ctx.quadraticCurveTo(38.5, 34.4, 44.2, 36.4);
  } else {
    ctx.lineTo(44.2, 36.4);
  }
  ctx.moveTo(51.8, 36.4);
  if (typeof ctx.quadraticCurveTo === 'function') {
    ctx.quadraticCurveTo(57.5, 34.4, 62.5, 37.2);
  } else {
    ctx.lineTo(62.5, 37.2);
  }
  ctx.stroke();

  // Contoured 3D Nose bridge, tip highlight & subtle shadow
  ctx.strokeStyle = hexToRgba(skinDark, 0.78);
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(47.4, 43.2);
  ctx.lineTo(46.8, 49.5);
  if (typeof ctx.quadraticCurveTo === 'function') {
    ctx.quadraticCurveTo(48, 51.3, 49.6, 50.1);
  } else {
    ctx.lineTo(49.6, 50.1);
  }
  ctx.stroke();
  ctx.fillStyle = skinLight;
  safeEllipse(ctx, 48.2, 48.2, 1.3, 2.0);
  ctx.fillStyle = hexToRgba(skinDark, 0.48);
  safeEllipse(ctx, 48, 51.4, 2.8, 1.0);

  // Natural Painted Smile & Lips (replaces blocky teeth rectangle)
  if (spec.smile === 'wide') {
    ctx.fillStyle = '#9e4749';
    ctx.beginPath();
    ctx.moveTo(40.5, 55.2);
    if (typeof ctx.quadraticCurveTo === 'function') {
      ctx.quadraticCurveTo(48, 56.2, 55.5, 55.2);
      ctx.quadraticCurveTo(53.5, 60.4, 48, 60.6);
      ctx.quadraticCurveTo(42.5, 60.4, 40.5, 55.2);
    } else {
      ctx.lineTo(55.5, 55.2);
      ctx.lineTo(48, 60.6);
    }
    ctx.fill();
    // Soft curved teeth glint
    ctx.fillStyle = '#fff9f2';
    ctx.beginPath();
    ctx.moveTo(42.2, 55.9);
    if (typeof ctx.quadraticCurveTo === 'function') {
      ctx.quadraticCurveTo(48, 56.6, 53.8, 55.9);
      ctx.quadraticCurveTo(52.4, 58.3, 48, 58.5);
      ctx.quadraticCurveTo(43.6, 58.3, 42.2, 55.9);
    } else {
      ctx.lineTo(53.8, 55.9);
      ctx.lineTo(48, 58.5);
    }
    ctx.fill();
    // Subtle lower lip shadow
    ctx.strokeStyle = hexToRgba(skinDark, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(48, 56.5, 4.8, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();
  } else {
    // Warm subtle painted lips
    ctx.fillStyle = '#c97874';
    safeEllipse(ctx, 48, 56.8, 5.4, 1.8);
    ctx.strokeStyle = '#7c3838';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(42.2, 56.2);
    if (typeof ctx.quadraticCurveTo === 'function') {
      ctx.quadraticCurveTo(48, 58.4, 53.8, 56.2);
    } else {
      ctx.lineTo(53.8, 56.2);
    }
    ctx.stroke();
  }

  // Detailed Facial Hair (honoring facialHairColor!)
  const fhCol = app.facialHairColor ?? hairDark;
  const fhLight = shadeHex(fhCol, 1.14);
  const fhDark = shadeHex(fhCol, 0.8);
  if (app.facialHair === 'mustache') {
    ctx.fillStyle = fhCol;
    safeRoundRect(ctx, 38, 52, 20, 4.2, 2);
    safeEllipse(ctx, 38, 54.5, 3, 2);
    safeEllipse(ctx, 58, 54.5, 3, 2);
  } else if (app.facialHair === 'goatee') {
    ctx.fillStyle = fhCol;
    safeRoundRect(ctx, 39, 52, 18, 3.5, 1.8);
    safeRoundRect(ctx, 41, 59, 14, 6.5, 3.2);
    ctx.fillStyle = fhLight;
    safeRoundRect(ctx, 43, 60, 10, 4, 2);
  } else if (app.facialHair === 'beard') {
    // Rich full sculpted beard (Pierre's light-gray beard, Hugo, etc.)
    ctx.fillStyle = fhDark;
    safeEllipse(ctx, 48, 58, 18.5, 10.5);
    ctx.fillStyle = fhCol;
    safeEllipse(ctx, 48, 57, 17, 9.5);
    ctx.fillStyle = fhLight;
    safeEllipse(ctx, 48, 56, 12, 6);
    // Warm mouth peeking through beard
    ctx.fillStyle = '#c4837a';
    safeRoundRect(ctx, 43, 55, 10, 2.4, 1.2);
  } else if (app.facialHair === 'stubble') {
    ctx.fillStyle = hexToRgba(fhCol, 0.34);
    safeEllipse(ctx, 48, 58, 15, 7);
    ctx.fillStyle = hexToRgba(fhCol, 0.65);
    for (let sx = 36; sx <= 60; sx += 4) {
      px(sx, 58 + (sx % 3), 1.5, 1.5, hexToRgba(fhCol, 0.7));
      px(sx + 2, 61, 1.5, 1.5, hexToRgba(fhCol, 0.65));
    }
  }

  // High-Definition Glasses with Crisp Reflections
  const gCol = app.glassesColor;
  if (app.glasses === 'round') {
    // Marguerite's dark round glasses
    const col = gCol ?? '#282d3d';
    ctx.fillStyle = 'rgba(210, 238, 255, 0.14)';
    safeEllipse(ctx, 39, 43, 6.2, 5.8);
    safeEllipse(ctx, 57, 43, 6.2, 5.8);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.1;
    safeEllipse(ctx, 39, 43, 6.2, 5.8, false);
    safeEllipse(ctx, 57, 43, 6.2, 5.8, false);
    px(45, 42, 6, 2, col);
    // Crisp specular diagonal glint
    ctx.fillStyle = 'rgba(255,255,255,0.52)';
    px(35, 39.5, 2.5, 1.2, 'rgba(255,255,255,0.55)');
    px(53, 39.5, 2.5, 1.2, 'rgba(255,255,255,0.55)');
  } else if (app.glasses === 'square') {
    const sc = gCol ?? '#2c3145';
    ctx.fillStyle = 'rgba(200, 232, 255, 0.14)';
    safeRoundRect(ctx, 32, 38, 13, 10, 2);
    safeRoundRect(ctx, 51, 38, 13, 10, 2);
    ctx.strokeStyle = sc;
    ctx.lineWidth = 2.1;
    safeRoundRect(ctx, 32, 38, 13, 10, 2, false);
    safeRoundRect(ctx, 51, 38, 13, 10, 2, false);
    px(45, 42, 6, 2, sc);
  } else if (app.glasses === 'clear') {
    // Pola's stylish translucent clear frames!
    const cc = gCol ?? '#dce3ee';
    ctx.fillStyle = 'rgba(215, 240, 255, 0.24)';
    safeRoundRect(ctx, 32, 37.5, 13.5, 11, 3);
    safeRoundRect(ctx, 50.5, 37.5, 13.5, 11, 3);
    ctx.strokeStyle = cc;
    ctx.lineWidth = 2.2;
    safeRoundRect(ctx, 32, 37.5, 13.5, 11, 3, false);
    safeRoundRect(ctx, 50.5, 37.5, 13.5, 11, 3, false);
    px(45.5, 41.5, 5, 2, cc);
    // Glossy lens highlight
    px(34, 39.5, 4, 1.5, 'rgba(255,255,255,0.68)');
    px(52.5, 39.5, 4, 1.5, 'rgba(255,255,255,0.68)');
  } else if (app.glasses === 'sunglasses') {
    // Dominique, Juliette, Pierre, Joseph's distinct sunglasses!
    const lens = gCol ?? '#161924';
    const rim = shadeHex(lens, 0.65);
    const glint = shadeHex(lens, 2.0);
    ctx.fillStyle = rim;
    safeRoundRect(ctx, 31, 37, 15, 11.5, 3.5);
    safeRoundRect(ctx, 50, 37, 15, 11.5, 3.5);
    ctx.fillStyle = lens;
    safeRoundRect(ctx, 32.5, 38.5, 12, 8.5, 2.5);
    safeRoundRect(ctx, 51.5, 38.5, 12, 8.5, 2.5);
    px(46, 40.5, 4, 2.2, rim);
    // Sleek angled lens reflection
    ctx.fillStyle = glint;
    px(34, 40, 5, 2, glint);
    px(53, 40, 5, 2, glint);
    ctx.fillStyle = 'rgba(255,255,255,0.52)';
    px(34.5, 40, 3, 1.2, 'rgba(255,255,255,0.55)');
    px(53.5, 40, 3, 1.2, 'rgba(255,255,255,0.55)');
  } else if (app.glasses === 'monocle') {
    const mc = gCol ?? '#f4c542';
    ctx.strokeStyle = mc;
    ctx.lineWidth = 2;
    safeEllipse(ctx, 57, 43, 6.2, 5.8, false);
    px(63, 46, 1.5, 18, mc);
  }

  // Front Hair Layer (richly shaded strands!)
  if (app.hairStyle !== 'bald') {
    if (app.hairStyle === 'receding') {
      // High forehead, silver/ash temples & soft crown (Francis & Pierre!)
      ctx.fillStyle = skinLight;
      safeEllipse(ctx, 48, 28, 12, 4);
      ctx.fillStyle = app.hairColor;
      safeRoundRect(ctx, 27, 22, 9, 17, 4);
      safeRoundRect(ctx, 60, 22, 9, 17, 4);
      ctx.fillStyle = hairDark;
      safeEllipse(ctx, 48, 21, 14, 4.5);
      ctx.fillStyle = app.hairColor;
      safeEllipse(ctx, 48, 20, 11, 3.5);
      ctx.fillStyle = hairLight;
      safeEllipse(ctx, 31, 25, 3.5, 4);
      safeEllipse(ctx, 65, 25, 3.5, 4);
    } else {
      ctx.fillStyle = app.hairColor;
      safeEllipse(ctx, 48, 25, 21, 10.5);
      ctx.fillStyle = hairLight;
      safeEllipse(ctx, 46, 22, 13, 4);
      // Side locks framing temples
      ctx.fillStyle = app.hairColor;
      safeRoundRect(ctx, 27, 26, 6, 13, 3);
      safeRoundRect(ctx, 63, 26, 6, 13, 3);

      if (app.hairStyle === 'spiky') {
        // Joseph's energetic golden spiky hair!
        const drawSpike = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, col: string) => {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.lineTo(x3, y3);
          ctx.fill();
        };
        drawSpike(30, 24, 34, 11, 41, 22, app.hairColor);
        drawSpike(39, 22, 47, 9, 54, 22, hairLight);
        drawSpike(52, 22, 60, 11, 66, 24, app.hairColor);
        drawSpike(44, 21, 51, 12, 57, 21, app.hairColor);
      } else if (app.hairStyle === 'sidepart') {
        // Alexis's neat side-parted hair
        ctx.fillStyle = app.hairColor;
        safeRoundRect(ctx, 28, 24, 24, 9, 4);
        ctx.fillStyle = hairLight;
        safeRoundRect(ctx, 51, 22, 16, 7, 3.5);
        px(50, 20, 2, 10, hairDark);
      } else if (app.hairStyle === 'pompadour') {
        ctx.fillStyle = app.hairColor;
        safeEllipse(ctx, 48, 18, 18, 9);
        ctx.fillStyle = hairLight;
        safeEllipse(ctx, 45, 15, 12, 4.5);
      } else if (app.hairStyle === 'bun') {
        ctx.fillStyle = hairDark;
        safeEllipse(ctx, 48, 13, 10, 7);
        ctx.fillStyle = app.hairColor;
        safeEllipse(ctx, 48, 12, 8.5, 5.5);
        ctx.fillStyle = hairLight;
        safeEllipse(ctx, 46, 10, 4, 2.5);
      } else if (app.hairStyle === 'ponytail') {
        ctx.fillStyle = hairDark;
        safeRoundRect(ctx, 60, 26, 12, 26, 6);
        ctx.fillStyle = app.hairColor;
        safeRoundRect(ctx, 61, 28, 9, 22, 4.5);
      } else if (app.hairStyle === 'tousled_curls') {
        // Marguerite's dark curls & Dominique's silver curls!
        ctx.fillStyle = app.hairColor;
        safeEllipse(ctx, 32, 22, 8, 6);
        safeEllipse(ctx, 64, 22, 8, 6);
        safeEllipse(ctx, 48, 26, 13, 5);
        ctx.fillStyle = hairLight;
        safeEllipse(ctx, 44, 19, 9, 5);
        safeEllipse(ctx, 57, 21, 7, 4);
        ctx.fillStyle = hairDark;
        safeEllipse(ctx, 27, 34, 5, 7);
        safeEllipse(ctx, 69, 34, 5, 7);
      } else if (app.hairStyle === 'bangs_wavy') {
        // Pola's signature wavy brown hair & soft parted bangs!
        ctx.fillStyle = app.hairColor;
        safeRoundRect(ctx, 26, 25, 8, 24, 4);
        safeRoundRect(ctx, 62, 25, 8, 24, 4);
        // Soft parted curtain bangs across forehead
        ctx.fillStyle = hairDark;
        safeEllipse(ctx, 37, 29, 8.5, 5.5);
        safeEllipse(ctx, 59, 29, 8.5, 5.5);
        ctx.fillStyle = app.hairColor;
        safeEllipse(ctx, 38, 28, 7.5, 4.5);
        safeEllipse(ctx, 58, 28, 7.5, 4.5);
        ctx.fillStyle = hairLight;
        safeEllipse(ctx, 44, 24, 7, 3.5);
      }
    }
  } else {
    ctx.fillStyle = skinLight;
    safeEllipse(ctx, 46, 26, 10, 3.5);
  }

  // Headwear
  const hw = app.headwear ?? 'none';
  const hc = app.headwearColor ?? '#3a4159';
  if (hw === 'beret') {
    ctx.fillStyle = hc;
    safeEllipse(ctx, 46, 18, 22, 8);
    ctx.fillStyle = shadeHex(hc, 1.18);
    safeEllipse(ctx, 43, 15, 14, 4);
    px(45, 8, 4, 4, hc);
  } else if (hw === 'tophat') {
    ctx.fillStyle = hc;
    safeRoundRect(ctx, 21, 19, 54, 6, 3);
    safeRoundRect(ctx, 30, 3, 36, 18, 3);
    px(30, 16, 36, 4, accent);
  } else if (hw === 'bowler' || hw === 'fedora') {
    ctx.fillStyle = hc;
    safeRoundRect(ctx, 21, 19, 54, 6, 3);
    safeEllipse(ctx, 48, 15, 19, 9);
    px(30, 17, 36, 3, accent);
  } else if (hw === 'toque') {
    ctx.fillStyle = '#ffffff';
    safeEllipse(ctx, 37, 11, 11, 8);
    safeEllipse(ctx, 48, 9, 13, 9);
    safeEllipse(ctx, 59, 11, 11, 8);
    ctx.fillStyle = '#e8edf7';
    safeRoundRect(ctx, 30, 15, 36, 9, 3);
  } else if (hw === 'crown') {
    ctx.fillStyle = '#f4c542';
    safeRoundRect(ctx, 30, 12, 36, 11, 2);
    px(30, 6, 7, 8, '#ffe066');
    px(44, 4, 8, 10, '#ffe066');
    px(59, 6, 7, 8, '#ffe066');
    ctx.fillStyle = '#d93848';
    safeEllipse(ctx, 48, 17, 3, 3);
  } else if (hw === 'headband') {
    ctx.fillStyle = hc;
    safeRoundRect(ctx, 28, 23, 40, 5.5, 2.5);
  } else if (hw === 'cap') {
    ctx.fillStyle = hc;
    safeEllipse(ctx, 48, 17, 20, 9);
    ctx.fillStyle = shadeHex(hc, 0.78);
    safeRoundRect(ctx, 28, 20, 46, 5.5, 2.8);
  } else if (hw === 'flower' || hw === 'ribbon') {
    ctx.fillStyle = hc;
    safeEllipse(ctx, 64, 22, 7, 7);
    ctx.fillStyle = '#ffe47a';
    safeEllipse(ctx, 64, 22, 3, 3);
  } else if (hw === 'feathered_hat') {
    ctx.fillStyle = hc;
    safeRoundRect(ctx, 21, 19, 54, 6, 3);
    safeEllipse(ctx, 48, 15, 19, 8);
    ctx.fillStyle = '#ffffff';
    safeEllipse(ctx, 68, 9, 12, 4);
  } else if (hw === 'turban') {
    ctx.fillStyle = hc;
    safeEllipse(ctx, 48, 16, 23, 10);
    ctx.fillStyle = shadeHex(hc, 1.18);
    safeEllipse(ctx, 45, 13, 16, 5);
    ctx.fillStyle = '#f4c542';
    safeEllipse(ctx, 48, 18, 4.5, 5);
  }

  // Signature Foreground Props (crisp 2x illustrated details!)
  const prop = spec.prop ?? 'none';
  if (prop === 'quill') {
    ctx.fillStyle = '#ffffff';
    safeEllipse(ctx, 76, 66, 5, 14);
    px(71, 64, 4, 24, '#f2e8d5');
    px(69, 84, 6, 6, '#f4c542');
  } else if (prop === 'mask') {
    ctx.fillStyle = '#f7f1e6';
    safeRoundRect(ctx, 64, 65, 22, 20, 6);
    ctx.fillStyle = '#1e2130';
    safeEllipse(ctx, 70, 72, 2.5, 2.5);
    safeEllipse(ctx, 80, 72, 2.5, 2.5);
    ctx.fillStyle = '#c93838';
    safeRoundRect(ctx, 71, 78, 8, 3.5, 1.5);
  } else if (prop === 'guitar') {
    px(74, 52, 4, 20, '#6e3a19');
    ctx.fillStyle = '#c46c31';
    safeEllipse(ctx, 76, 80, 11, 12);
    ctx.fillStyle = '#381b0c';
    safeEllipse(ctx, 76, 78, 4, 4);
    px(75, 54, 2, 28, '#f5e6cc');
  } else if (prop === 'flute') {
    px(64, 72, 26, 4, '#d9e0eb');
    px(68, 73, 2, 2, '#58627a');
    px(74, 73, 2, 2, '#58627a');
    px(80, 73, 2, 2, '#58627a');
  } else if (prop === 'film' || prop === 'clapper') {
    ctx.fillStyle = '#1c202e';
    safeRoundRect(ctx, 64, 69, 25, 21, 3);
    px(66, 71, 5, 4, '#ffffff');
    px(74, 71, 5, 4, '#ffffff');
    px(82, 71, 5, 4, '#ffffff');
    px(68, 78, 17, 9, '#79c2f2');
    px(70, 80, 7, 3, '#d4f0ff');
  } else if (prop === 'camera') {
    ctx.fillStyle = '#252a38';
    safeRoundRect(ctx, 64, 71, 25, 17, 3);
    px(70, 67, 10, 4, '#cfd6e3');
    ctx.fillStyle = '#9aa6bd';
    safeEllipse(ctx, 76.5, 79.5, 6.2, 6.2);
    ctx.fillStyle = '#4f9be0';
    safeEllipse(ctx, 76.5, 79.5, 4.2, 4.2);
    px(74, 77, 2.5, 2, '#ffffff');
  } else if (prop === 'whisk') {
    px(74, 74, 4, 18, '#7a8499');
    ctx.strokeStyle = '#e6ecf5';
    ctx.lineWidth = 1.6;
    safeEllipse(ctx, 76, 65, 6, 9, false);
    safeEllipse(ctx, 76, 65, 3, 9, false);
  } else if (prop === 'macaron') {
    ctx.fillStyle = '#f48fa8';
    safeRoundRect(ctx, 65, 73, 22, 6, 3);
    ctx.fillStyle = '#fff0c7';
    safeRoundRect(ctx, 66, 79, 20, 4, 2);
    ctx.fillStyle = '#f48fa8';
    safeRoundRect(ctx, 65, 83, 22, 6, 3);
  } else if (prop === 'soccer') {
    ctx.fillStyle = '#ffffff';
    safeEllipse(ctx, 76, 80, 10.5, 10.5);
    ctx.fillStyle = '#1b1e29';
    safeEllipse(ctx, 76, 80, 4, 4);
    px(74, 70, 4, 3, '#1b1e29');
    px(66, 79, 3, 4, '#1b1e29');
    px(83, 79, 3, 4, '#1b1e29');
  } else if (prop === 'basketball') {
    ctx.fillStyle = '#e86f2a';
    safeEllipse(ctx, 76, 80, 10.5, 10.5);
    ctx.strokeStyle = '#3b1c0a';
    ctx.lineWidth = 1.6;
    safeEllipse(ctx, 76, 80, 10.5, 10.5, false);
    px(66, 79.5, 20, 1.5, '#3b1c0a');
    px(75.5, 70, 1.5, 20, '#3b1c0a');
  } else if (prop === 'whistle') {
    ctx.fillStyle = '#cfd6e3';
    safeEllipse(ctx, 76, 80, 6, 6);
    px(78, 75, 10, 5, '#cfd6e3');
  } else if (prop === 'rose') {
    px(74, 73, 3.5, 19, '#368a46');
    ctx.fillStyle = '#d93848';
    safeEllipse(ctx, 76, 67, 7, 6);
    ctx.fillStyle = '#ff6b7d';
    safeEllipse(ctx, 75, 65, 3.5, 3);
  } else if (prop === 'script') {
    ctx.fillStyle = '#f7eed9';
    safeRoundRect(ctx, 66, 68, 21, 23, 2);
    px(70, 73, 13, 2, '#5c4b37');
    px(70, 78, 13, 2, '#5c4b37');
    px(70, 83, 9, 2, '#5c4b37');
  }

  // Subtle glossy portrait inner frame edge
  ctx.strokeStyle = 'rgba(255, 240, 195, 0.28)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 94, 94);

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
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (img) {
    const sw = img.naturalWidth;
    const sh = img.naturalHeight;
    if (sw > 0 && sh > 0) {
      if (sw === sh) {
        ctx.drawImage(img, 0, 0, sw, sh, dx, dy, size, size);
      } else if (sw > sh) {
        const sx = Math.round((sw - sh) / 2);
        ctx.drawImage(img, sx, 0, sh, sh, dx, dy, size, size);
      } else {
        const sy = Math.round((sh - sw) * 0.15);
        ctx.drawImage(img, 0, sy, sw, sw, dx, dy, size, size);
      }
    } else {
      ctx.drawImage(img, dx, dy, size, size);
    }
    ctx.restore();
    return;
  }
  const key = `${JSON.stringify(app)}:${JSON.stringify(spec)}`;
  let cached = portraitCache.get(key);
  if (!cached) {
    cached = renderPortrait(app, spec);
    portraitCache.set(key, cached);
  }
  ctx.drawImage(cached, dx, dy, size, size);
  ctx.restore();
}

// ---- 80x80 HIGH-DEFINITION METALLIC GYM BADGES (drawn into 20*scale) ----

function renderBadgeIcon(badge: BadgeDef, unlocked: boolean): HTMLCanvasElement {
  const c = makeCanvas(80, 80);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  if (typeof ctx.scale === 'function') {
    ctx.scale(2, 2);
  }

  const px = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  if (!unlocked) {
    ctx.fillStyle = '#1d2233';
    safeEllipse(ctx, 20, 20, 15, 15);
    ctx.fillStyle = '#2d344f';
    safeEllipse(ctx, 20, 20, 11.5, 11.5);
    ctx.fillStyle = '#3f486b';
    safeEllipse(ctx, 20, 20, 5.5, 5.5);
    return c;
  }

  const col = badge.color;
  const rim = badge.rimColor;
  const light = shadeHex(col, 1.32);
  const dark = shadeHex(col, 0.68);
  const rimLight = shadeHex(rim, 1.25);
  const rimDark = shadeHex(rim, 0.72);

  // Outer dark outline
  ctx.fillStyle = '#151824';
  safeEllipse(ctx, 20, 20, 18.5, 18.5);

  // 3D Beveled metallic rim
  const rimGrad = ctx.createLinearGradient(4, 4, 36, 36);
  rimGrad.addColorStop(0, rimLight);
  rimGrad.addColorStop(0.5, rim);
  rimGrad.addColorStop(1, rimDark);
  ctx.fillStyle = rimGrad;
  safeEllipse(ctx, 20, 20, 16.5, 16.5);

  // Inner recessed enamel jewel
  const gemGrad = ctx.createLinearGradient(8, 6, 32, 34);
  gemGrad.addColorStop(0, light);
  gemGrad.addColorStop(0.5, col);
  gemGrad.addColorStop(1, dark);
  ctx.fillStyle = gemGrad;
  safeEllipse(ctx, 20, 20, 13, 13);

  // Glossy top crescent sheen
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  safeEllipse(ctx, 18, 12.5, 8, 3.8);

  // Crisp high-def center emblem
  const sym = '#fffaf0';
  switch (badge.icon) {
    case 'crown':
    case 'crown_mvp':
    case 'tiara':
      px(10, 20, 20, 6, sym);
      px(10, 14, 4, 6, sym);
      px(18, 12, 4, 8, sym);
      px(26, 14, 4, 6, sym);
      px(19, 21, 2, 2, rim);
      break;
    case 'quill':
    case 'scroll':
    case 'book':
      ctx.fillStyle = sym;
      safeRoundRect(ctx, 12, 11, 16, 18, 2);
      px(15, 15, 10, 2, dark);
      px(15, 19, 10, 2, dark);
      px(15, 23, 7, 2, dark);
      break;
    case 'mask':
    case 'tragedy':
      ctx.fillStyle = sym;
      safeRoundRect(ctx, 10, 13, 20, 14, 4);
      ctx.fillStyle = dark;
      safeEllipse(ctx, 15.5, 18.5, 2.2, 2.2);
      safeEllipse(ctx, 24.5, 18.5, 2.2, 2.2);
      px(16, 23, 8, 2, dark);
      break;
    case 'flower':
    case 'rose_gold':
      ctx.fillStyle = sym;
      safeEllipse(ctx, 20, 13, 4.5, 4.5);
      safeEllipse(ctx, 20, 27, 4.5, 4.5);
      safeEllipse(ctx, 13, 20, 4.5, 4.5);
      safeEllipse(ctx, 27, 20, 4.5, 4.5);
      ctx.fillStyle = rim;
      safeEllipse(ctx, 20, 20, 4, 4);
      break;
    case 'sword':
      px(18.5, 9, 3, 21, sym);
      px(12, 22, 16, 3, rimLight);
      break;
    case 'piano':
    case 'bossanote':
    case 'guitar':
    case 'mic':
      px(16, 11, 3, 16, sym);
      px(19, 11, 8, 3.5, sym);
      ctx.fillStyle = sym;
      safeEllipse(ctx, 14.5, 26, 4.5, 3.5);
      break;
    case 'film':
    case 'camera':
    case 'aperture':
    case 'leica':
    case 'lens':
    case 'flash':
      ctx.fillStyle = sym;
      safeRoundRect(ctx, 10, 14, 20, 13, 2.5);
      ctx.fillStyle = dark;
      safeEllipse(ctx, 20, 20.5, 4.5, 4.5);
      ctx.fillStyle = '#79c2f2';
      safeEllipse(ctx, 20, 20.5, 2.5, 2.5);
      break;
    case 'toque_gold':
    case 'star_chef':
    case 'whisk':
    case 'macaron':
    case 'copper_pot':
    case 'ladle':
      ctx.fillStyle = sym;
      safeEllipse(ctx, 15, 15, 4.5, 4.5);
      safeEllipse(ctx, 20, 13, 5, 5);
      safeEllipse(ctx, 25, 15, 4.5, 4.5);
      px(14, 19, 12, 8, sym);
      break;
    case 'cannon':
    case 'net':
    case 'ballon_dor':
    case 'boot':
    case 'joga':
    case 'bolt':
    case 'shield':
      ctx.fillStyle = sym;
      safeEllipse(ctx, 20, 20, 8.5, 8.5);
      ctx.fillStyle = dark;
      safeEllipse(ctx, 20, 20, 3.5, 3.5);
      break;
    case 'hoop':
    case 'trophy':
    case 'goat':
    case 'ring':
      ctx.fillStyle = sym;
      safeRoundRect(ctx, 12, 11, 16, 10, 3);
      px(18, 21, 4, 6, sym);
      px(14, 27, 12, 2.5, sym);
      break;
    default:
      // Gleaming 4-point diamond star
      ctx.fillStyle = sym;
      ctx.beginPath();
      ctx.moveTo(20, 9);
      ctx.lineTo(23.5, 16.5);
      ctx.lineTo(31, 20);
      ctx.lineTo(23.5, 23.5);
      ctx.lineTo(20, 31);
      ctx.lineTo(16.5, 23.5);
      ctx.lineTo(9, 20);
      ctx.lineTo(16.5, 16.5);
      ctx.fill();
      ctx.fillStyle = rimLight;
      safeEllipse(ctx, 20, 20, 2.8, 2.8);
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
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cached, dx, dy, 20 * scale, 20 * scale);
  ctx.restore();
}
