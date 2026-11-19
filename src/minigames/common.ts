import { InputManager } from '../engine/input';

export const MG_W = 384;
export const MG_H = 240;

export interface MiniGameInstance {
  update(dt: number, input: InputManager): void;
  render(ctx: CanvasRenderingContext2D): void;
  getResult(): 'playing' | 'won' | 'lost';
}

export function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ');
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

export function drawPanelBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  bg = '#1b2036',
  border = '#f4c542'
): void {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#0f1220';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
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
  ctx.fillStyle = '#121626';
  ctx.fillRect(0, 0, MG_W, 26);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 25, MG_W, 1);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 8, 9);

  ctx.textAlign = 'right';
  ctx.fillStyle = timerSec <= 5 ? '#ff7070' : '#ffe27a';
  ctx.fillText(`${Math.max(0, Math.ceil(timerSec))}s  |  ${statText}`, MG_W - 8, 9);

  // Progress bar at bottom of header
  ctx.fillStyle = '#252c45';
  ctx.fillRect(8, 17, MG_W - 16, 5);
  const clamped = Math.max(0, Math.min(1, progressRatio));
  ctx.fillStyle = clamped >= 1 ? '#57d978' : accent;
  ctx.fillRect(8, 17, Math.round((MG_W - 16) * clamped), 5);
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
    ctx.fillStyle = i < current ? '#ff4d6d' : '#3d435c';
    ctx.fillText('♥', x + i * 12, y);
  }
  ctx.restore();
}
