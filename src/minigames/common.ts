import { InputManager } from '../engine/input';
import { ChallengeMistake, ReflectionTheme } from '../types';

export const MG_W = 384;
export const MG_H = 240;

export interface MiniGameInstance {
  update(dt: number, input: InputManager): void;
  render(ctx: CanvasRenderingContext2D): void;
  getResult(): 'playing' | 'won' | 'lost';
  getMistakes?(): ChallengeMistake[];
}

export interface MgParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity?: number;
  shape?: 'square' | 'circle' | 'star' | 'ring';
}

export function updateMgParticles(particles: MgParticle[], dt: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.gravity) {
      p.vy += p.gravity * dt;
    }
  }
}

export function drawMgParticles(ctx: CanvasRenderingContext2D, particles: MgParticle[]): void {
  for (const p of particles) {
    const ratio = Math.max(0, Math.min(1, p.life / Math.max(0.001, p.maxLife)));
    ctx.save();
    ctx.globalAlpha = ratio;
    if (p.shape === 'ring') {
      const r = p.size * (1.8 - ratio * 0.9);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1, 2.2 * ratio);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, r), 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.shape === 'circle') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.8, p.size * (0.4 + 0.6 * ratio)), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'star') {
      ctx.fillStyle = p.color;
      drawStarPath(ctx, p.x, p.y, Math.max(1.5, p.size * ratio), Math.max(0.7, p.size * 0.45 * ratio), 4, (1 - ratio) * 2);
      ctx.fill();
    } else {
      const s = Math.max(1, p.size * (0.5 + 0.5 * ratio));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

export function drawStarPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points = 5,
  rotation = -Math.PI / 2
): void {
  ctx.beginPath();
  let firstX = cx;
  let firstY = cy;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = rotation + (i * Math.PI) / points;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) {
      firstX = px;
      firstY = py;
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.lineTo(firstX, firstY);
}

export function drawRoundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.arc(x + w - rad, y + rad, rad, -Math.PI / 2, 0);
  ctx.lineTo(x + w, y + h - rad);
  ctx.arc(x + w - rad, y + h - rad, rad, 0, Math.PI / 2);
  ctx.lineTo(x + rad, y + h);
  ctx.arc(x + rad, y + h - rad, rad, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + rad);
  ctx.arc(x + rad, y + rad, rad, Math.PI, Math.PI * 1.5);
  ctx.lineTo(x + rad, y);
}

export function drawSpotlightBeam(
  ctx: CanvasRenderingContext2D,
  topX: number,
  topY: number,
  botX: number,
  botY: number,
  topHalf: number,
  botHalf: number,
  colorTop: string,
  colorBottom = 'rgba(255,255,255,0)'
): void {
  const grad = ctx.createLinearGradient(topX, topY, botX, botY);
  grad.addColorStop(0, colorTop);
  grad.addColorStop(1, colorBottom);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(topX - topHalf, topY);
  ctx.lineTo(topX + topHalf, topY);
  ctx.lineTo(botX + botHalf, botY);
  ctx.lineTo(botX - botHalf, botY);
  ctx.lineTo(topX - topHalf, topY);
  ctx.fill();
}

export function formatFrenchText(text: string): string {
  return text.replace(/ ([;:?!»])/g, '\u00A0$1').replace(/« /g, '«\u00A0');
}

function normalizeFrenchPunctuationSpaces(text: string): string {
  return formatFrenchText(text);
}

export function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = normalizeFrenchPunctuationSpaces(text).split(' ');
  let line = '';
  let cy = y;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = words[i];
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, cy);
    cy += lineHeight;
  }
  return cy;
}

export function drawFittedSingleLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options: {
    preferredSize?: number;
    minSize?: number;
    weight?: string;
    family?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
  } = {}
): void {
  const formatted = formatFrenchText(text);
  const preferredSize = options.preferredSize ?? 8.5;
  const minSize = options.minSize ?? 6.2;
  const weight = options.weight ?? '600';
  const family = options.family ?? 'system-ui, -apple-system, "Segoe UI", sans-serif';
  const align = options.align ?? 'left';
  const baseline = options.baseline ?? 'middle';

  let size = preferredSize;
  ctx.font = `${weight} ${size.toFixed(1)}px ${family}`;
  while (size > minSize && ctx.measureText(formatted).width > maxWidth) {
    size = Math.max(minSize, size - 0.35);
    ctx.font = `${weight} ${size.toFixed(1)}px ${family}`;
  }

  let out = formatted;
  if (ctx.measureText(out).width > maxWidth && out.length > 3) {
    while (out.length > 2 && ctx.measureText(`${out}…`).width > maxWidth) {
      out = out.slice(0, -1);
    }
    out = `${out.trimEnd()}…`;
  }

  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(out, x, y);
}

export function drawFittedWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  options: {
    preferredSize?: number;
    minSize?: number;
    weight?: string;
    family?: string;
    lineHeightRatio?: number;
    align?: CanvasTextAlign;
    verticalCenter?: boolean;
  } = {}
): number {
  const preferredSize = options.preferredSize ?? 8.5;
  const minSize = options.minSize ?? 6.2;
  const weight = options.weight ?? '600';
  const family = options.family ?? 'system-ui, -apple-system, "Segoe UI", sans-serif';
  const lineHeightRatio = options.lineHeightRatio ?? 1.32;
  const align = options.align ?? 'left';
  const verticalCenter = options.verticalCenter ?? false;

  let size = preferredSize;
  let lines: string[] = [];
  let lh = size * lineHeightRatio;

  while (true) {
    ctx.font = `${weight} ${size.toFixed(1)}px ${family}`;
    lines = wrapTextLines(ctx, text, maxWidth);
    lh = size * lineHeightRatio;
    const fitsWidth = lines.every((l) => ctx.measureText(l).width <= maxWidth + 0.5);
    if ((fitsWidth && lines.length * lh <= maxHeight + 0.5) || size <= minSize) {
      break;
    }
    size = Math.max(minSize, size - 0.4);
  }

  const maxLines = Math.max(1, Math.floor((maxHeight + 0.5) / lh));
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[lines.length - 1];
    while (last.length > 2 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last.trimEnd()}…`;
  }

  const totalH = lines.length * lh;
  const startY = verticalCenter ? y + Math.max(0, (maxHeight - totalH) / 2) : y;

  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + i * lh);
  }
  return startY + totalH;
}

export function drawPanelBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  bg = '#1b2036',
  border = '#f4c542'
): void {
  // Soft drop shadow
  ctx.fillStyle = 'rgba(6, 8, 18, 0.45)';
  ctx.fillRect(x + 2, y + 2, w, h);

  // Main panel fill
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);

  // Subtle top bevel sheen
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(x + 2, y + 2, Math.max(0, w - 4), Math.min(6, Math.max(1, Math.floor(h * 0.22))));

  // Outer dark frame
  ctx.strokeStyle = '#0d101d';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Inner accent border
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

  // Tiny decorative corner pixels
  ctx.fillStyle = border;
  ctx.fillRect(x + 2, y + 2, 2, 2);
  ctx.fillRect(x + w - 4, y + 2, 2, 2);
  ctx.fillRect(x + 2, y + h - 4, 2, 2);
  ctx.fillRect(x + w - 4, y + h - 4, 2, 2);
}

export function drawMiniGameHud(
  ctx: CanvasRenderingContext2D,
  title: string,
  timerSec: number,
  statText: string,
  progressRatio: number,
  accent = '#f4c542'
): void {
  ctx.save();
  const hdrGrad = ctx.createLinearGradient(0, 0, 0, 26);
  hdrGrad.addColorStop(0, '#181e34');
  hdrGrad.addColorStop(1, '#0e1222');
  ctx.fillStyle = hdrGrad;
  ctx.fillRect(0, 0, MG_W, 26);

  // Glowing accent bottom edge
  ctx.fillStyle = accent;
  ctx.fillRect(0, 25, MG_W, 1.5);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(0, 0, MG_W, 1);

  // Small accent diamond before title
  ctx.fillStyle = accent;
  ctx.fillRect(6, 7, 4, 4);

  // Right-side stat + timer badge (measure first so title never collides!)
  ctx.font = 'bold 8.5px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const lowTime = timerSec > 0 && timerSec <= 5;
  const label = formatFrenchText(
    timerSec > 0 ? `${Math.max(0, Math.ceil(timerSec))}s  •  ${statText}` : statText
  );
  const labelW = ctx.measureText(label).width;
  ctx.fillStyle = lowTime ? '#ff6b7a' : '#ffe484';
  ctx.fillText(label, MG_W - 8, 9.5);

  const maxTitleW = Math.max(80, MG_W - 28 - labelW);
  ctx.fillStyle = '#ffffff';
  drawFittedSingleLine(ctx, title, 14, 9.5, maxTitleW, {
    preferredSize: 9,
    minSize: 6.8,
    weight: 'bold',
    family: 'sans-serif',
    align: 'left',
    baseline: 'middle',
  });

  // Glossy progress track
  const barX = 8;
  const barY = 17;
  const barW = MG_W - 16;
  const barH = 5;
  ctx.fillStyle = '#202740';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);

  const clamped = Math.max(0, Math.min(1, progressRatio));
  const fillW = Math.round(barW * clamped);
  if (fillW > 0) {
    ctx.fillStyle = clamped >= 1 ? '#57e389' : accent;
    ctx.fillRect(barX, barY, fillW, barH);
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.fillRect(barX, barY, fillW, 2);
    // Bright tip
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(barX + Math.max(0, fillW - 2), barY, 2, barH);
  }
  ctx.restore();
}

export function drawHearts(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  current: number,
  max: number
): void {
  ctx.save();
  ctx.font = 'bold 11px sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  for (let i = 0; i < max; i++) {
    const hx = x + i * 13;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText('♥', hx + 1, y + 1);
    ctx.fillStyle = i < current ? '#ff4d6d' : '#3a415c';
    ctx.fillText('♥', hx, y);
    if (i < current) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(hx + 2, y + 3, 2, 1.5);
    }
  }
  ctx.restore();
}

export function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = normalizeFrenchPunctuationSpaces(text).split(' ');
  const lines: string[] = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = words[i];
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function drawCenteredWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3
): void {
  const rawLines = wrapTextLines(ctx, text, maxWidth);
  const lines = rawLines.slice(0, maxLines);
  if (rawLines.length > maxLines && lines.length > 0) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = last.length > 3 ? `${last.slice(0, -1)}…` : last;
  }
  const totalH = (lines.length - 1) * lineHeight;
  const startY = centerY - totalH / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], centerX, startY + i * lineHeight);
  }
}

export interface ReflectionThemePalette {
  accent: string;
  accentSoft: string;
  cardBg: string;
  cardSelectedBg: string;
  cardBorder: string;
  promptBg: string;
  promptInk: string;
  beam: string;
}

export function getReflectionThemePalette(theme: ReflectionTheme): ReflectionThemePalette {
  switch (theme) {
    case 'literature':
      return {
        accent: '#f4c542',
        accentSoft: 'rgba(244, 197, 66, 0.2)',
        cardBg: 'rgba(38, 22, 24, 0.92)',
        cardSelectedBg: 'rgba(84, 48, 34, 0.96)',
        cardBorder: '#7d5642',
        promptBg: '#fbf4e4',
        promptInk: '#241815',
        beam: 'rgba(255, 218, 138, 0.18)',
      };
    case 'theater':
      return {
        accent: '#ffd452',
        accentSoft: 'rgba(255, 107, 122, 0.22)',
        cardBg: 'rgba(42, 14, 26, 0.92)',
        cardSelectedBg: 'rgba(92, 24, 44, 0.96)',
        cardBorder: '#8c354c',
        promptBg: '#fcf3e6',
        promptInk: '#291019',
        beam: 'rgba(255, 226, 130, 0.18)',
      };
    case 'music_br':
      return {
        accent: '#ffad42',
        accentSoft: 'rgba(255, 173, 66, 0.22)',
        cardBg: 'rgba(34, 21, 56, 0.92)',
        cardSelectedBg: 'rgba(72, 39, 94, 0.96)',
        cardBorder: '#7c4c96',
        promptBg: '#fdf5e8',
        promptInk: '#241638',
        beam: 'rgba(255, 182, 104, 0.18)',
      };
    case 'cinema':
      return {
        accent: '#ffd866',
        accentSoft: 'rgba(255, 216, 102, 0.2)',
        cardBg: 'rgba(18, 24, 42, 0.93)',
        cardSelectedBg: 'rgba(40, 52, 84, 0.96)',
        cardBorder: '#4c5f8c',
        promptBg: '#f7f5ee',
        promptInk: '#151c2e',
        beam: 'rgba(235, 242, 255, 0.16)',
      };
    case 'gastronomy':
      return {
        accent: '#ffb64c',
        accentSoft: 'rgba(255, 182, 76, 0.22)',
        cardBg: 'rgba(40, 25, 20, 0.92)',
        cardSelectedBg: 'rgba(84, 48, 30, 0.96)',
        cardBorder: '#87573c',
        promptBg: '#fcf6ea',
        promptInk: '#291a12',
        beam: 'rgba(255, 212, 140, 0.18)',
      };
    case 'photography':
      return {
        accent: '#ff8a6b',
        accentSoft: 'rgba(255, 138, 107, 0.2)',
        cardBg: 'rgba(30, 17, 24, 0.93)',
        cardSelectedBg: 'rgba(74, 30, 40, 0.96)',
        cardBorder: '#7a3f4e',
        promptBg: '#f9f4f0',
        promptInk: '#221319',
        beam: 'rgba(255, 140, 118, 0.18)',
      };
    case 'football':
      return {
        accent: '#5be88c',
        accentSoft: 'rgba(91, 232, 140, 0.2)',
        cardBg: 'rgba(14, 34, 46, 0.92)',
        cardSelectedBg: 'rgba(24, 72, 64, 0.96)',
        cardBorder: '#3a7a68',
        promptBg: '#f4fbf6',
        promptInk: '#102620',
        beam: 'rgba(200, 245, 255, 0.16)',
      };
    case 'basketball':
      return {
        accent: '#ff9944',
        accentSoft: 'rgba(255, 153, 68, 0.22)',
        cardBg: 'rgba(34, 22, 34, 0.92)',
        cardSelectedBg: 'rgba(84, 45, 32, 0.96)',
        cardBorder: '#8a543c',
        promptBg: '#fdf6ec',
        promptInk: '#261812',
        beam: 'rgba(255, 204, 132, 0.18)',
      };
    case 'manga':
      return {
        accent: '#32d6e8',
        accentSoft: 'rgba(50, 214, 232, 0.22)',
        cardBg: 'rgba(14, 28, 46, 0.93)',
        cardSelectedBg: 'rgba(24, 58, 86, 0.96)',
        cardBorder: '#3c7a96',
        promptBg: '#f2fafc',
        promptInk: '#102230',
        beam: 'rgba(92, 232, 248, 0.18)',
      };
    case 'polar':
      return {
        accent: '#e8b25a',
        accentSoft: 'rgba(232, 178, 90, 0.22)',
        cardBg: 'rgba(28, 24, 26, 0.93)',
        cardSelectedBg: 'rgba(64, 48, 36, 0.96)',
        cardBorder: '#826444',
        promptBg: '#faf5ea',
        promptInk: '#211914',
        beam: 'rgba(245, 212, 146, 0.18)',
      };
  }
}

export function inferReflectionTheme(
  npc: { id: string; mapId?: string; portrait?: { prop?: string } },
  explicit?: ReflectionTheme
): ReflectionTheme {
  if (explicit) return explicit;
  const prop = npc.portrait?.prop;
  if (prop === 'mask' || prop === 'script') return 'theater';
  if (prop === 'quill' || prop === 'rose') return 'literature';
  if (prop === 'guitar' || prop === 'flute') return 'music_br';
  if (prop === 'film' || prop === 'clapper') return 'cinema';
  if (prop === 'whisk' || prop === 'macaron') return 'gastronomy';
  if (prop === 'camera') return 'photography';
  if (prop === 'soccer' || prop === 'whistle') return 'football';
  if (prop === 'basketball') return 'basketball';

  const mapId = npc.mapId ?? '';
  if (mapId.includes('noir') || mapId.includes('polar')) return 'polar';
  if (mapId.includes('manga')) return 'manga';
  if (mapId.includes('theater')) return 'theater';
  if (mapId.includes('salon')) return 'literature';
  if (mapId.includes('samba')) return 'music_br';
  if (mapId.includes('cinema')) return 'cinema';
  if (mapId.includes('kitchen')) return 'gastronomy';
  if (mapId.includes('darkroom')) return 'photography';
  if (mapId.includes('stadium')) return 'football';
  if (mapId.includes('court')) return 'basketball';

  if (npc.id.startsWith('pm_')) return 'literature';
  if (npc.id.startsWith('df_')) return 'music_br';
  if (npc.id.startsWith('jp_')) return 'gastronomy';
  if (npc.id.startsWith('aj_')) return 'football';
  if (npc.id.startsWith('sd_')) return 'manga';
  return 'literature';
}

export function drawReflectionStageBackdrop(
  ctx: CanvasRenderingContext2D,
  theme: ReflectionTheme,
  elapsed: number
): void {
  ctx.save();

  if (theme === 'literature') {
    // Warm candlelit mahogany Parisian study
    const bg = ctx.createLinearGradient(0, 0, 0, MG_H);
    bg.addColorStop(0, '#2e1616');
    bg.addColorStop(0.55, '#1e0f13');
    bg.addColorStop(1, '#12090d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, MG_W, MG_H);

    // Warm mahogany wainscoting / tall bookshelf silhouettes on flanks
    ctx.fillStyle = 'rgba(72, 34, 24, 0.36)';
    ctx.fillRect(0, 26, 26, MG_H - 26);
    ctx.fillRect(MG_W - 26, 26, 26, MG_H - 26);
    ctx.fillStyle = 'rgba(244, 197, 66, 0.14)';
    for (let sy = 44; sy < MG_H; sy += 28) {
      ctx.fillRect(2, sy, 22, 2);
      ctx.fillRect(MG_W - 24, sy, 22, 2);
    }
    // Book spine hints on shelves
    const spineColors = ['#6e2b2b', '#2b4d40', '#4f3863', '#8c5a2b'];
    for (let row = 0; row < 6; row++) {
      const y = 48 + row * 28;
      for (let b = 0; b < 4; b++) {
        ctx.fillStyle = spineColors[(row + b) % spineColors.length];
        ctx.globalAlpha = 0.25;
        ctx.fillRect(4 + b * 5, y, 4, 20);
        ctx.fillRect(MG_W - 22 + b * 5, y, 4, 20);
      }
    }
    ctx.globalAlpha = 1;

    // Warm pulsating candle / banker's lamp glow
    const flicker = 0.88 + 0.12 * Math.sin(elapsed * 4.3) * Math.cos(elapsed * 2.1);
    const lamp = ctx.createRadialGradient(MG_W / 2, 74, 8, MG_W / 2, 92, 165);
    lamp.addColorStop(0, `rgba(255, 214, 128, ${0.26 * flicker})`);
    lamp.addColorStop(0.5, `rgba(235, 162, 76, ${0.1 * flicker})`);
    lamp.addColorStop(1, 'rgba(30, 15, 19, 0)');
    ctx.fillStyle = lamp;
    ctx.fillRect(0, 26, MG_W, MG_H - 26);

    // Golden parchment scroll filigree frame lines
    ctx.strokeStyle = 'rgba(244, 197, 66, 0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(28.5, 30.5, MG_W - 57, MG_H - 36);
    // Decorative gold corner scrolls
    ctx.fillStyle = 'rgba(244, 197, 66, 0.35)';
    for (const [cx, cy] of [
      [31, 33],
      [MG_W - 35, 33],
      [31, MG_H - 10],
      [MG_W - 35, MG_H - 10],
    ]) {
      ctx.fillRect(cx, cy, 4, 4);
    }

    // Drifting golden ink motes
    for (let i = 0; i < 14; i++) {
      const mx = (i * 31 + 17 + Math.sin(elapsed * 0.9 + i) * 10) % MG_W;
      const my = MG_H - (((elapsed * (10 + (i % 4) * 3) + i * 29) % (MG_H - 30)) + 2);
      const a = 0.2 + 0.35 * (0.5 + 0.5 * Math.sin(elapsed * 2.6 + i * 1.4));
      ctx.fillStyle = `rgba(255, 224, 130, ${a})`;
      ctx.beginPath();
      ctx.arc(mx, my, i % 3 === 0 ? 1.8 : 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme === 'theater') {
    // Royal crimson stage
    const bg = ctx.createLinearGradient(0, 0, 0, MG_H);
    bg.addColorStop(0, '#2b0916');
    bg.addColorStop(0.65, '#190814');
    bg.addColorStop(1, '#10060c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, MG_W, MG_H);

    // Sweeping golden stage spotlights
    const sway = Math.sin(elapsed * 1.1) * 28;
    drawSpotlightBeam(ctx, 72, 26, 128 + sway, MG_H, 10, 74, 'rgba(255, 226, 130, 0.17)');
    drawSpotlightBeam(
      ctx,
      MG_W - 72,
      26,
      MG_W - 128 - sway,
      MG_H,
      10,
      74,
      'rgba(255, 206, 140, 0.15)'
    );

    // Plush wooden stage floor lip at bottom
    ctx.fillStyle = '#331618';
    ctx.fillRect(0, MG_H - 14, MG_W, 14);
    ctx.fillStyle = 'rgba(255, 212, 92, 0.25)';
    ctx.fillRect(0, MG_H - 14, MG_W, 1.5);

    // Lush crimson velvet curtains framing left & right
    const leftGrad = ctx.createLinearGradient(0, 0, 26, 0);
    leftGrad.addColorStop(0, '#5c0e22');
    leftGrad.addColorStop(0.55, '#8c1934');
    leftGrad.addColorStop(1, '#4a0b1b');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 26, 22, MG_H - 26);

    const rightGrad = ctx.createLinearGradient(MG_W - 26, 0, MG_W, 0);
    rightGrad.addColorStop(0, '#4a0b1b');
    rightGrad.addColorStop(0.45, '#8c1934');
    rightGrad.addColorStop(1, '#5c0e22');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(MG_W - 22, 26, 22, MG_H - 26);

    // Curtain vertical pleat shadows & gold trim
    ctx.fillStyle = 'rgba(25, 2, 10, 0.35)';
    ctx.fillRect(7, 26, 3, MG_H - 26);
    ctx.fillRect(15, 26, 2, MG_H - 26);
    ctx.fillRect(MG_W - 10, 26, 3, MG_H - 26);
    ctx.fillRect(MG_W - 17, 26, 2, MG_H - 26);
    ctx.fillStyle = '#e8b948';
    ctx.fillRect(21, 26, 1.5, MG_H - 26);
    ctx.fillRect(MG_W - 22.5, 26, 1.5, MG_H - 26);

    // Top crimson scalloped valance
    ctx.fillStyle = '#73122a';
    ctx.fillRect(0, 26, MG_W, 7);
    ctx.fillStyle = '#e8b948';
    ctx.fillRect(0, 33, MG_W, 1.5);

    // Glowing brass footlights along the bottom
    for (let i = 0; i < 9; i++) {
      const fx = 36 + i * 39;
      const glowPulse = 0.78 + 0.22 * Math.sin(elapsed * 3.1 + i * 0.9);
      const fg = ctx.createRadialGradient(fx, MG_H - 4, 1, fx, MG_H - 6, 18);
      fg.addColorStop(0, `rgba(255, 228, 130, ${0.42 * glowPulse})`);
      fg.addColorStop(1, 'rgba(255, 200, 90, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(fx, MG_H - 6, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d9a441';
      ctx.fillRect(fx - 4, MG_H - 5, 8, 4);
      ctx.fillStyle = '#fff5be';
      ctx.fillRect(fx - 2, MG_H - 4, 4, 2);
    }
  } else if (theme === 'music_br') {
    // Warm twilight Rio de Janeiro sky
    const sky = ctx.createLinearGradient(0, 26, 0, MG_H);
    sky.addColorStop(0, '#221242');
    sky.addColorStop(0.45, '#592452');
    sky.addColorStop(0.78, '#9e4547');
    sky.addColorStop(1, '#1d142e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, MG_W, MG_H);

    // Subtle Rio mountain / Sugarloaf silhouette
    ctx.fillStyle = 'rgba(22, 13, 38, 0.65)';
    ctx.beginPath();
    ctx.moveTo(0, MG_H);
    ctx.lineTo(0, 178);
    ctx.quadraticCurveTo(64, 146, 130, 174);
    ctx.quadraticCurveTo(215, 160, 286, 170);
    ctx.quadraticCurveTo(334, 130, 384, 170);
    ctx.lineTo(MG_W, MG_H);
    ctx.closePath();
    ctx.fill();

    // Illuminated Lapa Arches (Aqueduto da Carioca) across lower horizon
    ctx.fillStyle = 'rgba(248, 232, 204, 0.16)';
    ctx.fillRect(0, 182, MG_W, 8);
    for (let i = 0; i < 8; i++) {
      const ax = i * 48 + 4;
      // Pillars
      ctx.fillStyle = 'rgba(248, 232, 204, 0.16)';
      ctx.fillRect(ax, 190, 9, 50);
      // Warm glowing arch lamp underneath each span
      const lampGlow = 0.75 + 0.25 * Math.sin(elapsed * 2.4 + i);
      ctx.fillStyle = `rgba(255, 202, 108, ${0.22 * lampGlow})`;
      ctx.beginPath();
      ctx.arc(ax + 24, 197, 13, Math.PI, 0);
      ctx.fill();
    }

    // Tropical twilight bokeh lights
    const bokehColors = [
      'rgba(255, 206, 98, 0.22)',
      'rgba(255, 126, 140, 0.2)',
      'rgba(102, 232, 198, 0.18)',
    ];
    for (let i = 0; i < 10; i++) {
      const bx = (i * 41 + 19 + Math.sin(elapsed * 0.7 + i) * 8) % MG_W;
      const by = 46 + ((i * 23) % 130);
      const r = 4 + (i % 3) * 3;
      ctx.fillStyle = bokehColors[i % bokehColors.length];
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Drifting golden musical notes
    for (let i = 0; i < 8; i++) {
      const nx = (i * 51 + 16 + Math.sin(elapsed * 1.4 + i * 1.3) * 12) % (MG_W - 12);
      const ny = MG_H - (((elapsed * (14 + (i % 3) * 4) + i * 33) % (MG_H - 36)) + 8);
      ctx.fillStyle = 'rgba(255, 224, 122, 0.42)';
      ctx.beginPath();
      ctx.arc(nx, ny, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(nx + 1.5, ny - 8, 1.3, 8);
      ctx.fillRect(nx + 1.5, ny - 8, 4.5, 1.8);
    }
  } else if (theme === 'cinema') {
    // Classic Hollywood Noir / Art Deco studio
    const bg = ctx.createLinearGradient(0, 0, 0, MG_H);
    bg.addColorStop(0, '#0e1322');
    bg.addColorStop(0.55, '#172036');
    bg.addColorStop(1, '#090c16');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, MG_W, MG_H);

    // Sweeping Hollywood searchlights from bottom corners
    const sweep1 = Math.sin(elapsed * 0.85) * 65;
    const sweep2 = Math.cos(elapsed * 0.72) * 65;
    drawSpotlightBeam(ctx, 180 + sweep1, 26, 24, MG_H, 52, 8, 'rgba(255, 232, 168, 0.14)');
    drawSpotlightBeam(
      ctx,
      MG_W - 180 + sweep2,
      26,
      MG_W - 24,
      MG_H,
      52,
      8,
      'rgba(195, 222, 255, 0.13)'
    );

    // Art Deco subtle gold fan lines behind center
    ctx.strokeStyle = 'rgba(255, 214, 102, 0.1)';
    ctx.lineWidth = 1;
    for (let r = 46; r <= 120; r += 26) {
      ctx.beginPath();
      ctx.arc(MG_W / 2, MG_H, r, Math.PI, 0);
      ctx.stroke();
    }

    // 35mm Filmstrip sprocket rails on left & right edges
    ctx.fillStyle = '#070910';
    ctx.fillRect(0, 26, 12, MG_H - 26);
    ctx.fillRect(MG_W - 12, 26, 12, MG_H - 26);
    ctx.fillStyle = 'rgba(255, 216, 102, 0.32)';
    ctx.fillRect(12, 26, 1, MG_H - 26);
    ctx.fillRect(MG_W - 13, 26, 1, MG_H - 26);

    const scroll = (elapsed * 14) % 14;
    ctx.fillStyle = 'rgba(230, 236, 250, 0.24)';
    for (let y = 24 - 14 + scroll; y < MG_H; y += 14) {
      if (y >= 26) {
        ctx.fillRect(3, y, 6, 7);
        ctx.fillRect(MG_W - 9, y, 6, 7);
      }
    }

    // Subtle warm projector dust motes
    const dustSpan = MG_W - 44;
    for (let i = 0; i < 10; i++) {
      const rawX = i * 39 + Math.sin(elapsed * 0.8 + i) * 14;
      const px = 22 + (((rawX % dustSpan) + dustSpan) % dustSpan);
      const py = 36 + ((i * 27 + elapsed * 6) % (MG_H - 44));
      ctx.fillStyle = 'rgba(255, 240, 200, 0.22)';
      ctx.fillRect(px, py, 1.8, 1.8);
    }
  } else if (theme === 'gastronomy') {
    // Warm Michelin kitchen / copper glow
    const bg = ctx.createLinearGradient(0, 0, 0, MG_H);
    bg.addColorStop(0, '#2a1813');
    bg.addColorStop(0.6, '#1c1110');
    bg.addColorStop(1, '#120c0d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, MG_W, MG_H);

    // Subtle Parisian kitchen subway tiles
    ctx.strokeStyle = 'rgba(255, 230, 196, 0.06)';
    ctx.lineWidth = 1;
    for (let ty = 34; ty < MG_H; ty += 16) {
      ctx.beginPath();
      ctx.moveTo(0, ty);
      ctx.lineTo(MG_W, ty);
      ctx.stroke();
      const offset = ((ty / 16) % 2) * 14;
      for (let tx = offset; tx < MG_W; tx += 28) {
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx, ty + 16);
        ctx.stroke();
      }
    }

    // Warm copper sheen / candlelight radial glow
    const glow = ctx.createRadialGradient(MG_W / 2, 128, 12, MG_W / 2, 128, 175);
    glow.addColorStop(0, 'rgba(255, 184, 88, 0.18)');
    glow.addColorStop(0.6, 'rgba(214, 114, 56, 0.08)');
    glow.addColorStop(1, 'rgba(20, 12, 12, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 26, MG_W, MG_H - 26);

    // Hanging brushed copper pan silhouettes at upper corners
    for (const cx of [28, MG_W - 28]) {
      ctx.fillStyle = 'rgba(218, 130, 68, 0.22)';
      ctx.fillRect(cx - 1, 26, 2, 16);
      ctx.beginPath();
      ctx.arc(cx, 50, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 206, 134, 0.28)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Soft rising steam wisps
    ctx.strokeStyle = 'rgba(255, 244, 224, 0.13)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const sx = 34 + i * 64;
      const shift = ((elapsed * 18 + i * 25) % 90) / 90;
      const baseY = MG_H - shift * 110;
      const sway = Math.sin(elapsed * 2 + i) * 7;
      ctx.beginPath();
      ctx.moveTo(sx, baseY + 26);
      ctx.quadraticCurveTo(sx + sway, baseY + 12, sx - sway * 0.6, baseY - 12);
      ctx.stroke();
    }
  } else if (theme === 'photography') {
    // Stylish crimson-amber darkroom & Parisian gallery wall
    const bg = ctx.createLinearGradient(0, 0, 0, MG_H);
    bg.addColorStop(0, '#260e16');
    bg.addColorStop(0.55, '#170f17');
    bg.addColorStop(1, '#0d0c12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, MG_W, MG_H);

    // Darkroom safelight radial glow (top-left) + warm gallery light (top-right)
    const safe = ctx.createRadialGradient(48, 42, 6, 48, 42, 150);
    safe.addColorStop(0, 'rgba(255, 86, 74, 0.24)');
    safe.addColorStop(1, 'rgba(38, 14, 22, 0)');
    ctx.fillStyle = safe;
    ctx.fillRect(0, 26, MG_W, MG_H - 26);

    const gallery = ctx.createRadialGradient(MG_W - 48, 46, 6, MG_W - 48, 46, 140);
    gallery.addColorStop(0, 'rgba(255, 212, 160, 0.16)');
    gallery.addColorStop(1, 'rgba(23, 15, 23, 0)');
    ctx.fillStyle = gallery;
    ctx.fillRect(0, 26, MG_W, MG_H - 26);

    // Subtle aperture bokeh rings
    for (let i = 0; i < 7; i++) {
      const bx = 30 + ((i * 58 + Math.sin(elapsed * 0.6 + i) * 10) % (MG_W - 60));
      const by = 48 + ((i * 31) % 148);
      const r = 7 + (i % 3) * 5;
      ctx.strokeStyle = 'rgba(255, 168, 138, 0.12)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Crisp viewfinder corner brackets & subtle rule-of-thirds guides
    ctx.strokeStyle = 'rgba(255, 190, 158, 0.26)';
    ctx.lineWidth = 1.2;
    const bx1 = 8;
    const by1 = 31;
    const bx2 = MG_W - 8;
    const by2 = MG_H - 6;
    const arm = 12;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(bx1, by1 + arm);
    ctx.lineTo(bx1, by1);
    ctx.lineTo(bx1 + arm, by1);
    // Top-right
    ctx.moveTo(bx2 - arm, by1);
    ctx.lineTo(bx2, by1);
    ctx.lineTo(bx2, by1 + arm);
    // Bottom-left
    ctx.moveTo(bx1, by2 - arm);
    ctx.lineTo(bx1, by2);
    ctx.lineTo(bx1 + arm, by2);
    // Bottom-right
    ctx.moveTo(bx2 - arm, by2);
    ctx.lineTo(bx2, by2);
    ctx.lineTo(bx2, by2 - arm);
    ctx.stroke();

    // Subtle contact sheet frame numbers at very bottom
    ctx.fillStyle = 'rgba(255, 174, 136, 0.25)';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let f = 0; f < 6; f++) {
      ctx.fillText(`35MM • ${f + 12}A`, 36 + f * 62, MG_H - 1);
    }
  } else if (theme === 'football') {
    // Floodlit night stadium sky
    const sky = ctx.createLinearGradient(0, 26, 0, 172);
    sky.addColorStop(0, '#07142b');
    sky.addColorStop(1, '#102948');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, MG_W, 172);

    // Sweeping white-cyan stadium floodlights
    const sway = Math.sin(elapsed * 0.9) * 22;
    drawSpotlightBeam(ctx, 28, 28, 128 + sway, 195, 8, 86, 'rgba(220, 245, 255, 0.18)');
    drawSpotlightBeam(
      ctx,
      MG_W - 28,
      28,
      MG_W - 128 - sway,
      195,
      8,
      86,
      'rgba(220, 245, 255, 0.18)'
    );

    // Subtle stadium crowd tier & sparkling camera flashes
    ctx.fillStyle = 'rgba(10, 18, 36, 0.72)';
    ctx.fillRect(0, 134, MG_W, 38);
    for (let i = 0; i < 16; i++) {
      const fx = (i * 25 + 9) % MG_W;
      const fy = 140 + ((i * 11) % 24);
      const flash = Math.pow(0.5 + 0.5 * Math.sin(elapsed * 3.8 + i * 2.1), 4);
      ctx.fillStyle = `rgba(255, 248, 210, ${0.12 + 0.45 * flash})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lush floodlit emerald pitch stripes along bottom
    const pitchY = 170;
    const stripeCount = 8;
    const stripeW = MG_W / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#185434' : '#1d643e';
      ctx.fillRect(i * stripeW, pitchY, stripeW + 1, MG_H - pitchY);
    }
    // Crisp white pitch lines & center circle arc
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.34)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, pitchY + 2);
    ctx.lineTo(MG_W, pitchY + 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(MG_W / 2, MG_H + 8, 44, Math.PI, 0);
    ctx.stroke();
  } else if (theme === 'manga') {
    // Cyberpunk Neo-Tokyo & Manga Studio backdrop
    const sky = ctx.createLinearGradient(0, 26, 0, MG_H);
    sky.addColorStop(0, '#091426');
    sky.addColorStop(0.55, '#11263d');
    sky.addColorStop(1, '#08121f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, MG_W, MG_H);

    // Subtle neon cyan & magenta horizon glows
    const cyanGlow = ctx.createRadialGradient(84, 152, 10, 84, 152, 130);
    cyanGlow.addColorStop(0, 'rgba(46, 196, 214, 0.24)');
    cyanGlow.addColorStop(1, 'rgba(17, 38, 61, 0)');
    ctx.fillStyle = cyanGlow;
    ctx.fillRect(0, 26, MG_W, MG_H - 26);

    const pinkGlow = ctx.createRadialGradient(MG_W - 76, 146, 10, MG_W - 76, 146, 120);
    pinkGlow.addColorStop(0, 'rgba(235, 92, 158, 0.16)');
    pinkGlow.addColorStop(1, 'rgba(17, 38, 61, 0)');
    ctx.fillStyle = pinkGlow;
    ctx.fillRect(0, 26, MG_W, MG_H - 26);

    // Subtle Neo-Tokyo skyline silhouette with lit windows
    const towers = [
      { x: 6, w: 30, h: 64 },
      { x: 42, w: 22, h: 86 },
      { x: 70, w: 36, h: 54 },
      { x: 278, w: 34, h: 60 },
      { x: 318, w: 24, h: 88 },
      { x: 348, w: 30, h: 66 },
    ];
    for (const t of towers) {
      ctx.fillStyle = 'rgba(8, 15, 28, 0.72)';
      ctx.fillRect(t.x, MG_H - t.h, t.w, t.h);
      ctx.fillStyle = 'rgba(76, 228, 245, 0.26)';
      for (let wy = MG_H - t.h + 6; wy < MG_H - 8; wy += 9) {
        for (let wx = t.x + 4; wx < t.x + t.w - 5; wx += 7) {
          ctx.fillRect(wx, wy, 3, 4);
        }
      }
    }

    // Crisp manga speed-line accent rays in upper corners
    ctx.strokeStyle = 'rgba(92, 232, 248, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 32 + i * 14);
      ctx.lineTo(44 - i * 4, 48 + i * 11);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(MG_W, 32 + i * 14);
      ctx.lineTo(MG_W - 44 + i * 4, 48 + i * 11);
      ctx.stroke();
    }

    // Rising cyber sparks
    for (let i = 0; i < 12; i++) {
      const sx = (i * 33 + 17 + Math.sin(elapsed * 1.1 + i) * 10) % MG_W;
      const sy = MG_H - (((elapsed * (16 + (i % 4) * 4) + i * 27) % (MG_H - 34)) + 4);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(92, 232, 248, 0.45)' : 'rgba(255, 212, 120, 0.38)';
      ctx.fillRect(sx, sy, 1.8, 1.8);
    }
  } else if (theme === 'polar') {
    // Rainy French Film Noir & Polar Detective backdrop
    const bg = ctx.createLinearGradient(0, 26, 0, MG_H);
    bg.addColorStop(0, '#171416');
    bg.addColorStop(0.55, '#211c1b');
    bg.addColorStop(1, '#100e10');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, MG_W, MG_H);

    // Venetian-blind diagonal sepia light shafts
    const sway = Math.sin(elapsed * 0.55) * 10;
    for (let i = 0; i < 4; i++) {
      drawSpotlightBeam(
        ctx,
        36 + i * 82,
        26,
        96 + i * 82 + sway,
        MG_H,
        14,
        26,
        'rgba(245, 206, 138, 0.08)'
      );
    }

    // Warm Parisian streetlamp mist glow on the right
    const lamp = ctx.createRadialGradient(MG_W - 44, 62, 6, MG_W - 44, 62, 128);
    lamp.addColorStop(0, 'rgba(245, 198, 112, 0.22)');
    lamp.addColorStop(0.6, 'rgba(186, 124, 62, 0.07)');
    lamp.addColorStop(1, 'rgba(20, 16, 16, 0)');
    ctx.fillStyle = lamp;
    ctx.fillRect(0, 26, MG_W, MG_H - 26);

    // Subtle film-noir diagonal rain streaks
    ctx.strokeStyle = 'rgba(232, 214, 184, 0.14)';
    ctx.lineWidth = 0.85;
    for (let i = 0; i < 16; i++) {
      const rx = (i * 27 + 12 - ((elapsed * 24) % MG_W) + MG_W) % MG_W;
      const ry = 28 + ((i * 31 + elapsed * 58) % (MG_H - 32));
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 3, ry + 8);
      ctx.stroke();
    }
  } else {
    // 'basketball' — Polished NBA hardwood court under arena lights
    const ceiling = ctx.createLinearGradient(0, 26, 0, 174);
    ceiling.addColorStop(0, '#121324');
    ceiling.addColorStop(1, '#261826');
    ctx.fillStyle = ceiling;
    ctx.fillRect(0, 0, MG_W, 174);

    // Arena spotlights sweeping from rafters
    const sway = Math.sin(elapsed * 1.0) * 20;
    drawSpotlightBeam(ctx, 88, 26, 132 + sway, 195, 10, 74, 'rgba(255, 210, 138, 0.16)');
    drawSpotlightBeam(
      ctx,
      MG_W - 88,
      26,
      MG_W - 132 - sway,
      195,
      10,
      74,
      'rgba(255, 178, 112, 0.16)'
    );

    // Subtle arena crowd lights
    for (let i = 0; i < 12; i++) {
      const cx = (i * 33 + 14) % MG_W;
      const cy = 142 + ((i * 9) % 24);
      const glow = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(elapsed * 2.5 + i * 1.7));
      ctx.fillStyle = `rgba(255, 186, 104, ${glow})`;
      ctx.fillRect(cx, cy, 2, 2);
    }

    // Polished golden hardwood court planks along bottom
    const floorY = 172;
    const courtGrad = ctx.createLinearGradient(0, floorY, 0, MG_H);
    courtGrad.addColorStop(0, '#784522');
    courtGrad.addColorStop(0.45, '#995b2c');
    courtGrad.addColorStop(1, '#613518');
    ctx.fillStyle = courtGrad;
    ctx.fillRect(0, floorY, MG_W, MG_H - floorY);

    // Subtle hardwood plank seams
    ctx.strokeStyle = 'rgba(42, 20, 8, 0.28)';
    ctx.lineWidth = 1;
    for (let y = floorY + 10; y < MG_H; y += 11) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(MG_W, y);
      ctx.stroke();
    }

    // Crisp arena paint lines & three-point arc
    ctx.strokeStyle = 'rgba(255, 238, 204, 0.42)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, floorY + 2);
    ctx.lineTo(MG_W, floorY + 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(MG_W / 2, MG_H + 14, 62, Math.PI, 0);
    ctx.stroke();
  }

  ctx.restore();
}
