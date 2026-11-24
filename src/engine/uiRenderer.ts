import { FAMILY_PAIRS, GAME_MASTER_LEO, MODE_ORDER } from '../data/familyAvatars';
import { drawBadgeIcon, drawOverworldSprite, drawPortrait } from './pixelRenderer';
import { formatFrenchDeName } from './secondaryHints';
import {
  drawFittedSingleLine,
  drawFittedWrappedText,
  drawPanelBox,
  drawRoundRectPath,
  drawStarPath,
  drawWrappedText,
  MG_H,
  MG_W,
} from '../minigames/common';
import {
  BadgeDef,
  GlobalSaveData,
  ModeId,
  ModeSaveData,
  PortraitSpec,
  SpriteAppearance,
  WorldDefinition,
} from '../types';

export interface DialogueMessage {
  speaker: string;
  text: string;
  appearance?: SpriteAppearance;
  portrait?: PortraitSpec;
  customPortraitUrl?: string;
  voicePitch?: number;
}

export class DialogueController {
  private queue: DialogueMessage[] = [];
  private index = 0;
  private charCount = 0;
  private blipTick = 0;
  private onComplete: (() => void) | null = null;

  start(messages: DialogueMessage[], onComplete?: () => void): void {
    if (messages.length === 0) {
      this.queue = [];
      this.index = 0;
      this.charCount = 0;
      this.blipTick = 0;
      this.onComplete = null;
      onComplete?.();
      return;
    }
    this.queue = messages;
    this.index = 0;
    this.charCount = 0;
    this.blipTick = 0;
    this.onComplete = onComplete ?? null;
  }

  isActive(): boolean {
    return this.queue.length > 0 && this.index < this.queue.length;
  }

  update(
    dt: number,
    advancePressed: boolean,
    playBlip: (pitch: number) => void
  ): boolean {
    if (!this.isActive()) return false;
    const msg = this.queue[this.index];

    if (this.charCount < msg.text.length) {
      this.charCount = Math.min(msg.text.length, this.charCount + dt * 48);
      this.blipTick += dt;
      if (this.blipTick >= 0.055) {
        this.blipTick = 0;
        playBlip(msg.voicePitch ?? 500);
      }
      if (advancePressed) {
        this.charCount = msg.text.length;
      }
      return true;
    }

    if (advancePressed) {
      this.index++;
      this.charCount = 0;
      if (this.index >= this.queue.length) {
        const cb = this.onComplete;
        this.queue = [];
        this.onComplete = null;
        cb?.();
        return false;
      }
    }
    return true;
  }

  render(ctx: CanvasRenderingContext2D, animTimer: number): void {
    if (!this.isActive()) return;
    const msg = this.queue[this.index];
    const boxY = MG_H - 74;
    const boxH = 68;

    drawPanelBox(ctx, 6, boxY, MG_W - 12, boxH, '#f8f5ec', '#28365e');

    let textX = 16;
    let textW = MG_W - 32;
    if (msg.appearance && msg.portrait) {
      ctx.fillStyle = '#1b2238';
      ctx.fillRect(14, boxY + 10, 48, 48);
      drawPortrait(
        ctx,
        msg.appearance,
        msg.portrait,
        14,
        boxY + 10,
        48,
        msg.customPortraitUrl
      );
      ctx.strokeStyle = '#d6ae53';
      ctx.strokeRect(13.5, boxY + 9.5, 49, 49);
      textX = 70;
      textW = MG_W - 86;
    }

    // Speaker nameplate
    ctx.fillStyle = '#28365e';
    ctx.font = '700 9px system-ui, -apple-system, "Segoe UI", sans-serif';
    const nameW = Math.min(180, ctx.measureText(msg.speaker).width + 14);
    ctx.fillRect(textX, boxY - 9, nameW, 14);
    ctx.strokeStyle = '#f4c542';
    ctx.strokeRect(textX + 0.5, boxY - 8.5, nameW - 1, 13);
    ctx.fillStyle = '#ffe680';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg.speaker, textX + 6, boxY - 2);

    // Wrapped typewriter text (size computed on full message so typewriter never jumps or clips)
    const countWrappedLines = (fullText: string, maxWidth: number): number => {
      const words = fullText.split(' ');
      let line = '';
      let lines = 1;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines++;
          line = word;
        } else {
          line = test;
        }
      }
      return lines;
    };

    ctx.fillStyle = '#1b2033';
    ctx.textBaseline = 'top';
    let fontSize = 9.5;
    let lineH = 13;
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    if (countWrappedLines(msg.text, textW) > 4) {
      fontSize = 8.5;
      lineH = 11.2;
      ctx.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      if (countWrappedLines(msg.text, textW) > 4) {
        fontSize = 7.8;
        lineH = 10.2;
        ctx.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      }
    }
    const shown = msg.text.slice(0, Math.floor(this.charCount));
    drawWrappedText(ctx, shown, textX, boxY + 10, textW, lineH);

    if (this.charCount >= msg.text.length && Math.floor(animTimer * 3) % 2 === 0) {
      ctx.fillStyle = '#c93838';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('▼', MG_W - 16, boxY + boxH - 16);
    }
  }
}

export function getModeCardRects() {
  // Balanced festive 5-card layout inside 384x240: 3 cards on top row + 2 centered on bottom row
  return [
    { x: 10, y: 36, w: 116, h: 93 },
    { x: 134, y: 36, w: 116, h: 93 },
    { x: 258, y: 36, w: 116, h: 93 },
    { x: 70, y: 137, w: 116, h: 93 },
    { x: 198, y: 137, w: 116, h: 93 },
  ];
}

function drawGiftBow(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.strokeStyle = '#ffe58f';
  ctx.fillStyle = 'rgba(246, 206, 108, 0.28)';
  ctx.lineWidth = 1.15;
  // Left loop
  ctx.beginPath();
  ctx.ellipse(cx - 3.6, cy, 3.4, 2.0, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Right loop
  ctx.beginPath();
  ctx.ellipse(cx + 3.6, cy, 3.4, 2.0, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Tails
  ctx.beginPath();
  ctx.moveTo(cx - 1.2, cy + 1.2);
  ctx.lineTo(cx - 3.5, cy + 4.2);
  ctx.moveTo(cx + 1.2, cy + 1.2);
  ctx.lineTo(cx + 3.5, cy + 4.2);
  ctx.stroke();
  // Center knot
  ctx.fillStyle = '#ffe68c';
  ctx.beginPath();
  ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function getWelcomeContinueButtonRect() {
  return { x: 96, y: 186, w: 192, h: 28 };
}

function drawFestiveNightBackdrop(ctx: CanvasRenderingContext2D, timer: number): void {
  // Illustrated Winter Christmas Eve Night Sky
  const sky = ctx.createLinearGradient(0, 0, 0, MG_H);
  sky.addColorStop(0, '#0a1026');
  sky.addColorStop(0.45, '#142044');
  sky.addColorStop(0.82, '#211c3c');
  sky.addColorStop(1, '#161b32');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, MG_W, MG_H);

  // Subtle warm festive horizon glow
  if (typeof ctx.createRadialGradient === 'function') {
    const glow = ctx.createRadialGradient(MG_W / 2, MG_H * 0.52, 12, MG_W / 2, MG_H * 0.52, 210);
    glow.addColorStop(0, 'rgba(244, 198, 108, 0.10)');
    glow.addColorStop(0.6, 'rgba(130, 74, 142, 0.06)');
    glow.addColorStop(1, 'rgba(10, 14, 30, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, MG_W, MG_H);
  }

  // Twinkling background winter stars
  for (let i = 0; i < 28; i++) {
    const sx = (i * 53 + 17) % MG_W;
    const sy = 4 + ((i * 29) % 190);
    const twinkle = 0.22 + 0.55 * (0.5 + 0.5 * Math.sin(timer * (1.8 + (i % 4) * 0.5) + i * 1.7));
    ctx.fillStyle =
      i % 3 === 0
        ? `rgba(255, 232, 160, ${twinkle.toFixed(2)})`
        : `rgba(218, 232, 255, ${(twinkle * 0.75).toFixed(2)})`;
    const sz = i % 5 === 0 ? 1.5 : 1;
    ctx.fillRect(sx, sy, sz, sz);
  }

  // Soft distant snowy pine silhouettes along the very bottom edge
  ctx.fillStyle = '#0e152b';
  for (let tx = -4; tx < MG_W + 12; tx += 18) {
    const th = 10 + ((tx * 7) % 7);
    ctx.beginPath();
    ctx.moveTo(tx, MG_H);
    ctx.lineTo(tx + 7, MG_H - th);
    ctx.lineTo(tx + 14, MG_H);
    ctx.closePath();
    ctx.fill();
  }

  // Soft falling snowflakes (back layer)
  for (let i = 0; i < 24; i++) {
    const speed = 7 + (i % 4) * 2.5;
    const fx = (i * 39 + Math.sin(timer * 0.9 + i * 1.3) * 9 + timer * 3.5 + MG_W) % MG_W;
    const fy = (i * 23 + timer * speed) % MG_H;
    const r = i % 4 === 0 ? 1.3 : 0.85;
    ctx.fillStyle = `rgba(255, 250, 240, ${i % 3 === 0 ? 0.48 : 0.28})`;
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Festive Header with Golden Fairy-Light Garland
  const headerGrad = ctx.createLinearGradient(0, 0, 0, 31);
  headerGrad.addColorStop(0, 'rgba(12, 16, 36, 0.92)');
  headerGrad.addColorStop(1, 'rgba(18, 24, 48, 0.55)');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, MG_W, 31);

  // Delicate swooping golden garland wire across the top
  ctx.save();
  ctx.strokeStyle = 'rgba(244, 206, 118, 0.42)';
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.moveTo(0, 3);
  for (let x = 0; x <= MG_W; x += 64) {
    ctx.quadraticCurveTo(x + 32, 10, x + 64, 3);
  }
  ctx.stroke();

  // Warm twinkling fairy-light bulbs along the garland
  const bulbColors = ['#ffe17d', '#ff7b89', '#79e8a8', '#fff2cc'];
  for (let b = 0; b < 13; b++) {
    const bx = 14 + b * 30;
    const phase = (bx % 64) / 64;
    const by = 3 + Math.sin(phase * Math.PI) * 3.8;
    const pulse = 0.65 + 0.35 * Math.sin(timer * 3.1 + b * 1.15);
    const col = bulbColors[b % bulbColors.length];
    if (typeof ctx.createRadialGradient === 'function') {
      const bglow = ctx.createRadialGradient(bx, by + 1, 0.5, bx, by + 1, 6.5);
      bglow.addColorStop(0, `rgba(255, 232, 165, ${(0.36 * pulse).toFixed(2)})`);
      bglow.addColorStop(1, 'rgba(255, 232, 165, 0)');
      ctx.fillStyle = bglow;
      ctx.beginPath();
      ctx.arc(bx, by + 1, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.72 + 0.28 * pulse;
    ctx.beginPath();
    ctx.arc(bx, by + 1, 1.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Subtle gold bottom divider line
  const ruleGrad = ctx.createLinearGradient(0, 0, MG_W, 0);
  ruleGrad.addColorStop(0, 'rgba(244, 206, 118, 0.12)');
  ruleGrad.addColorStop(0.5, 'rgba(244, 206, 118, 0.62)');
  ruleGrad.addColorStop(1, 'rgba(244, 206, 118, 0.12)');
  ctx.fillStyle = ruleGrad;
  ctx.fillRect(0, 30, MG_W, 0.9);
}

export function renderWelcomeScreen(
  ctx: CanvasRenderingContext2D,
  welcomeMessage: string,
  timer = 0
): void {
  drawFestiveNightBackdrop(ctx, timer);

  // Header Crest
  ctx.fillStyle = '#fff0bc';
  ctx.font = 'bold 10.5px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦ LE GRAND JEU DE NOËL 2026 ✦', MG_W / 2, 20.5);

  // Left: Gilded Portrait of Léo (Maître du Jeu) with warm breathing halo
  const px = 22;
  const py = 49;
  const pSize = 86;
  const glowPulse = 0.24 + 0.12 * Math.sin(timer * 2.8);
  if (typeof ctx.createRadialGradient === 'function') {
    const halo = ctx.createRadialGradient(
      px + pSize / 2,
      py + pSize / 2,
      18,
      px + pSize / 2,
      py + pSize / 2,
      64
    );
    halo.addColorStop(0, `rgba(255, 218, 122, ${glowPulse.toFixed(2)})`);
    halo.addColorStop(1, 'rgba(255, 218, 122, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(px - 22, py - 22, pSize + 44, pSize + 44);
  }

  ctx.fillStyle = '#121629';
  drawRoundRectPath(ctx, px - 4, py - 4, pSize + 8, pSize + 8, 7);
  ctx.fill();
  drawPortrait(
    ctx,
    GAME_MASTER_LEO.appearance,
    GAME_MASTER_LEO.portrait,
    px,
    py,
    pSize,
    GAME_MASTER_LEO.customPortraitUrl
  );
  ctx.strokeStyle = '#f4ce76';
  ctx.lineWidth = 1.8;
  drawRoundRectPath(ctx, px - 3, py - 3, pSize + 6, pSize + 6, 6);
  ctx.stroke();

  // Nameplate Pill under Léo
  ctx.fillStyle = '#241838';
  drawRoundRectPath(ctx, px - 10, py + pSize + 7, pSize + 20, 18, 9);
  ctx.fill();
  ctx.strokeStyle = 'rgba(244, 206, 118, 0.72)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#ffe999';
  drawFittedSingleLine(
    ctx,
    `${GAME_MASTER_LEO.name} • ${GAME_MASTER_LEO.roleLabel}`,
    px + pSize / 2,
    py + pSize + 16,
    pSize + 12,
    {
      preferredSize: 7.4,
      minSize: 5.4,
      weight: 'bold',
      align: 'center',
      baseline: 'middle',
    }
  );

  // Right: Warm parchment speech bubble pointing left at Léo
  const bx = 130;
  const by = 48;
  const bw = 232;
  const bh = 114;

  ctx.fillStyle = 'rgba(4, 7, 18, 0.52)';
  drawRoundRectPath(ctx, bx + 2, by + 3, bw, bh, 10);
  ctx.fill();

  ctx.fillStyle = '#fbf6ea';
  drawRoundRectPath(ctx, bx, by, bw, bh, 10);
  ctx.fill();
  ctx.strokeStyle = '#d9ae54';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Speech tail triangle
  ctx.beginPath();
  ctx.moveTo(bx + 1, by + 38);
  ctx.lineTo(bx - 12, by + 46);
  ctx.lineTo(bx + 1, by + 54);
  ctx.closePath();
  ctx.fillStyle = '#fbf6ea';
  ctx.fill();
  ctx.strokeStyle = '#d9ae54';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(bx, by + 38);
  ctx.lineTo(bx - 12, by + 46);
  ctx.lineTo(bx, by + 54);
  ctx.stroke();

  // Inner delicate border
  ctx.strokeStyle = 'rgba(40, 54, 94, 0.16)';
  ctx.lineWidth = 0.8;
  drawRoundRectPath(ctx, bx + 5, by + 5, bw - 10, bh - 10, 6);
  ctx.stroke();

  // Randomized Welcome Message
  ctx.fillStyle = '#1b2238';
  drawFittedWrappedText(ctx, `« ${welcomeMessage} »`, bx + 14, by + 13, bw - 28, bh - 26, {
    preferredSize: 10.0,
    minSize: 7.4,
    weight: '600',
    lineHeightRatio: 1.36,
    verticalCenter: true,
  });

  // Glowing Gilded Continue Button
  const btn = getWelcomeContinueButtonRect();
  const btnPulse = 0.86 + 0.14 * Math.sin(timer * 4.5);
  ctx.save();
  ctx.fillStyle = `rgba(244, 206, 118, ${(0.18 * btnPulse).toFixed(2)})`;
  drawRoundRectPath(ctx, btn.x - 3, btn.y - 3, btn.w + 6, btn.h + 6, 17);
  ctx.fill();

  const btnGrad = ctx.createLinearGradient(0, btn.y, 0, btn.y + btn.h);
  btnGrad.addColorStop(0, '#f3ca6d');
  btnGrad.addColorStop(1, '#c48d2d');
  ctx.fillStyle = btnGrad;
  drawRoundRectPath(ctx, btn.x, btn.y, btn.w, btn.h, 14);
  ctx.fill();
  ctx.strokeStyle = '#fff3c4';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = '#1a1206';
  ctx.font = 'bold 9.5px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('▶ Choisir notre équipe', btn.x + btn.w / 2, btn.y + btn.h / 2 + 0.5);
  ctx.restore();

  // Gentle foreground snow motes
  for (let i = 0; i < 8; i++) {
    const fx = (i * 51 + Math.sin(timer * 1.1 + i * 2) * 12 + timer * 6 + MG_W) % MG_W;
    const fy = (i * 37 + timer * (13 + (i % 3) * 3)) % MG_H;
    ctx.fillStyle = 'rgba(255, 250, 236, 0.42)';
    ctx.beginPath();
    ctx.arc(fx, fy, 1.35, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function renderModeSelectScreen(
  ctx: CanvasRenderingContext2D,
  save: GlobalSaveData,
  selectedIndex: number,
  timer = 0
): void {
  drawFestiveNightBackdrop(ctx, timer);

  // Header Title & Completion Pill
  const totalModes = MODE_ORDER.length;
  const clearedCount = MODE_ORDER.filter((m) => save.modes[m].bossDefeated).length;
  const allCleared = clearedCount === totalModes;
  ctx.fillStyle = '#fff0bc';
  ctx.font = 'bold 10.5px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Choisissez votre équipe', 14, 20.5);

  const badgeText = allCleared
    ? `★ ${totalModes}/${totalModes} • JOYEUX NOËL !`
    : `★ ${clearedCount}/${totalModes}`;
  ctx.font = 'bold 8.2px system-ui, -apple-system, "Segoe UI", sans-serif';
  const pillW = Math.ceil(ctx.measureText(badgeText).width) + 14;
  const pillX = MG_W - 12 - pillW;
  ctx.fillStyle = allCleared ? 'rgba(46, 128, 76, 0.45)' : 'rgba(244, 206, 118, 0.14)';
  drawRoundRectPath(ctx, pillX, 13.5, pillW, 13, 6.5);
  ctx.fill();
  ctx.strokeStyle = allCleared ? '#79f59d' : 'rgba(244, 206, 118, 0.55)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = allCleared ? '#9bffb8' : '#ffe69a';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, pillX + pillW / 2, 20.2);

  // 3. 3+2 Gift / Polaroid Collector Cards (Zero Theme Spoilers!)
  const rects = getModeCardRects();
  MODE_ORDER.forEach((modeId, idx) => {
    const pair = FAMILY_PAIRS[modeId];
    const modeSave = save.modes[modeId];
    const base = rects[idx];
    const selected = idx === selectedIndex;
    const liftY = selected ? -2 : 0;
    const x = base.x;
    const y = base.y + liftY;
    const w = base.w;
    const h = base.h;

    ctx.save();

    // Warm outer golden halo & drop shadow on selected card
    if (selected) {
      ctx.fillStyle = 'rgba(247, 214, 116, 0.15)';
      drawRoundRectPath(ctx, x - 3, y - 3, w + 6, h + 6, 11);
      ctx.fill();
      ctx.fillStyle = 'rgba(5, 8, 18, 0.55)';
      drawRoundRectPath(ctx, x + 1, y + 4, w, h, 9);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(5, 8, 18, 0.38)';
      drawRoundRectPath(ctx, x + 1, y + 2, w, h, 9);
      ctx.fill();
    }

    // Rounded satin card body
    const cardGrad = ctx.createLinearGradient(x, y, x, y + h);
    if (selected) {
      cardGrad.addColorStop(0, '#2a345a');
      cardGrad.addColorStop(1, '#1a223d');
    } else {
      cardGrad.addColorStop(0, '#1d2440');
      cardGrad.addColorStop(1, '#14192e');
    }
    ctx.fillStyle = cardGrad;
    drawRoundRectPath(ctx, x, y, w, h, 8.5);
    ctx.fill();

    // Top gift ribbon strip clipped to card top
    ctx.save();
    drawRoundRectPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 8);
    ctx.clip();
    const ribGrad = ctx.createLinearGradient(x, y, x + w, y);
    ribGrad.addColorStop(0, pair.primaryColor);
    ribGrad.addColorStop(1, pair.primaryColor);
    ctx.fillStyle = ribGrad;
    ctx.fillRect(x, y, w, 16);
    // Subtle ribbon sheen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.13)';
    ctx.fillRect(x, y, w, 5);
    // Thin gold ribbon trim
    ctx.fillStyle = 'rgba(255, 228, 148, 0.55)';
    ctx.fillRect(x, y + 15.2, w, 0.9);
    ctx.restore();

    // Card border
    ctx.strokeStyle = selected ? '#f7d674' : 'rgba(130, 152, 206, 0.34)';
    ctx.lineWidth = selected ? 1.5 : 0.9;
    drawRoundRectPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 8);
    ctx.stroke();

    // Pair Name on ribbon + delicate golden gift bow (fitted cleanly inside 116px card without overlap)
    let labelMaxW = w - 26;
    if (modeSave.bossDefeated) {
      ctx.font = 'bold 7.4px system-ui, -apple-system, "Segoe UI", sans-serif';
      const roiW = Math.ceil(ctx.measureText('★ ROI').width);
      labelMaxW = Math.max(52, w - 14 - roiW);
    }
    ctx.fillStyle = '#ffffff';
    drawFittedSingleLine(ctx, pair.label, x + 6, y + 8.3, labelMaxW, {
      preferredSize: pair.members.length > 2 ? 7.4 : 8.2,
      minSize: 5.4,
      weight: 'bold',
      align: 'left',
      baseline: 'middle',
    });

    if (modeSave.bossDefeated) {
      ctx.fillStyle = '#ffe588';
      ctx.font = 'bold 7.4px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ ROI', x + w - 5, y + 8.3);
    } else {
      drawGiftBow(ctx, x + w - 11, y + 8.2);
    }

    // Two or three Polaroid-framed HD Family Portraits
    const members = pair.members;
    const isTrio = members.length >= 3;
    const pSize = isTrio ? 31 : 42;
    const frameW = pSize + (isTrio ? 3.5 : 4);
    const frameH = pSize + (isTrio ? 6 : 7);
    const gap = isTrio ? 2 : 6;
    const totalW = members.length * frameW + (members.length - 1) * gap;
    const startPx = x + (w - totalW) / 2;
    const pAy = isTrio ? y + 25 : y + 20.5;

    const drawPolaroid = (
      fx: number,
      fy: number,
      member: (typeof pair.members)[0],
      tiltRad: number
    ) => {
      ctx.save();
      ctx.translate(fx + frameW / 2, fy + frameH / 2);
      ctx.rotate(selected ? tiltRad * 0.4 : tiltRad);
      // Soft photo drop shadow
      ctx.fillStyle = 'rgba(6, 9, 20, 0.45)';
      drawRoundRectPath(ctx, -frameW / 2 + 1, -frameH / 2 + 1.5, frameW, frameH, 2.5);
      ctx.fill();
      // Warm cream polaroid paper border
      ctx.fillStyle = selected ? '#fffaf0' : '#ebe3d3';
      drawRoundRectPath(ctx, -frameW / 2, -frameH / 2, frameW, frameH, 2.2);
      ctx.fill();
      // Crisp HD portrait inside
      drawPortrait(
        ctx,
        member.appearance,
        member.portrait,
        -pSize / 2,
        -frameH / 2 + 1.8,
        pSize,
        member.customPortraitUrl
      );
      ctx.strokeStyle = selected ? 'rgba(218, 172, 74, 0.65)' : 'rgba(40, 48, 72, 0.35)';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(-pSize / 2, -frameH / 2 + 1.8, pSize, pSize);
      ctx.restore();
    };

    const tilts = isTrio ? [-0.032, 0, 0.032] : [-0.025, 0.025];
    members.forEach((mem, idx) => {
      const fx = startPx + idx * (frameW + gap);
      const fy = isTrio && idx === 1 ? pAy - 1.5 : pAy;
      drawPolaroid(fx, fy, mem, tilts[idx] ?? 0);
    });

    // 12 Mini Golden Badge Stars + Discrete Counter at Bottom of Card
    const count = modeSave.badges.length;
    const starY = y + h - 15.5;
    const starStep = 7.6;
    const starSpan = 11 * starStep;
    const starStartX = x + (w - starSpan) / 2;
    for (let s = 0; s < 12; s++) {
      const sx = starStartX + s * starStep;
      const earned = s < count;
      if (earned) {
        const shimmer = 0.85 + 0.15 * Math.sin(timer * 4 + s * 0.7);
        ctx.fillStyle = modeSave.bossDefeated ? '#fff099' : '#ffd54f';
        ctx.globalAlpha = shimmer;
        drawStarPath(ctx, sx, starY, 3.0, 1.38, 5);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = selected ? '#3b4870' : '#2a3352';
        drawStarPath(ctx, sx, starY, 2.55, 1.15, 5);
        ctx.fill();
      }
    }

    ctx.fillStyle = count > 0 || selected ? '#ffe699' : '#96a5cf';
    ctx.font = 'bold 6.9px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(modeSave.bossDefeated ? '12/12 ★' : `${count}/12`, x + w / 2, y + h - 6.2);

    ctx.restore();
  });

  // Gentle foreground snow motes
  for (let i = 0; i < 10; i++) {
    const fx = (i * 47 + Math.cos(timer * 0.8 + i) * 12 + timer * 5 + MG_W) % MG_W;
    const fy = (i * 31 + timer * (13 + (i % 3) * 3)) % MG_H;
    ctx.fillStyle = 'rgba(255, 252, 245, 0.34)';
    ctx.beginPath();
    ctx.arc(fx, fy, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

export type PauseSubView = 'menu' | 'badges' | 'notebook' | 'map';

export const PAUSE_OPTIONS = [
  'Boîte à Badges',
  'Carnet de Rencontres',
  'Carte du Monde',
  'Sauvegarde & Code',
  'Changer d’équipe',
] as const;

export function getPauseMenuPanelRect() {
  return { x: 188, y: 18, w: 184, h: 160 };
}

export function getPauseOptionRects() {
  return PAUSE_OPTIONS.map((_, i) => ({
    x: 196,
    y: 46 + i * 20,
    w: 168,
    h: 16,
  }));
}

export function getPauseBackButtonRect() {
  return { x: MG_W - 72, y: 18, w: 52, h: 15 };
}

export function getBadgeSlotRects(count = 13) {
  const cols = 7;
  return Array.from({ length: count }, (_, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const bx = 32 + col * 48;
    const by = 46 + row * 48;
    return { x: bx - 4, y: by - 4, w: 40, h: 40 };
  });
}

export function getNotebookRowRects(total: number, subCursor: number) {
  const start = Math.max(0, Math.min(Math.max(0, total - 8), subCursor - 3));
  const rows: { index: number; x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < 8 && start + i < total; i++) {
    rows.push({
      index: start + i,
      x: 20,
      y: 38 + i * 21,
      w: 148,
      h: 18,
    });
  }
  return rows;
}

function drawBackPill(ctx: CanvasRenderingContext2D, light = false): void {
  const r = getPauseBackButtonRect();
  ctx.save();
  ctx.fillStyle = light ? 'rgba(40, 54, 94, 0.14)' : 'rgba(244, 206, 118, 0.14)';
  drawRoundRectPath(ctx, r.x, r.y, r.w, r.h, 7.5);
  ctx.fill();
  ctx.strokeStyle = light ? 'rgba(40, 54, 94, 0.45)' : 'rgba(244, 206, 118, 0.6)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = light ? '#28365e' : '#ffe69a';
  ctx.font = 'bold 7.2px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✕ Retour', r.x + r.w / 2, r.y + r.h / 2 + 0.3);
  ctx.restore();
}

export function renderPauseMenu(
  ctx: CanvasRenderingContext2D,
  world: WorldDefinition,
  save: ModeSaveData,
  cursor: number,
  subView: PauseSubView,
  subCursor: number,
  playerPos: { x: number; y: number }
): void {
  ctx.fillStyle = 'rgba(10, 14, 26, 0.72)';
  ctx.fillRect(0, 0, MG_W, MG_H);

  if (subView === 'menu') {
    const panel = getPauseMenuPanelRect();
    drawPanelBox(ctx, panel.x, panel.y, panel.w, panel.h, '#f8f5ec', '#28365e');
    ctx.fillStyle = '#1b2033';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('MENU DU VOYAGE', 202, 28);

    const optRects = getPauseOptionRects();
    PAUSE_OPTIONS.forEach((opt, i) => {
      const rect = optRects[i];
      const sel = i === cursor;
      if (sel) {
        ctx.fillStyle = '#28365e';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      }
      ctx.fillStyle = sel ? '#ffe680' : '#262d42';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`${sel ? '▶ ' : '  '}${opt}`, 200, rect.y + 3);
    });

    // Quick pair summary card on left
    const pair = FAMILY_PAIRS[world.modeId];
    drawPanelBox(ctx, 12, 18, 166, 104, '#1b2238', '#f4c542');
    ctx.fillStyle = '#ffe27a';
    drawFittedSingleLine(ctx, pair.label, 22, 28, 146, {
      preferredSize: 9,
      minSize: 7.2,
      weight: 'bold',
      align: 'left',
      baseline: 'top',
    });
    ctx.fillStyle = '#cbd5f5';
    drawFittedSingleLine(ctx, world.worldName, 22, 42, 146, {
      preferredSize: 8,
      minSize: 6.5,
      align: 'left',
      baseline: 'top',
    });
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Badges : ${save.badges.length} / 12`, 22, 58);
    ctx.fillText(
      `Boss Final : ${save.bossDefeated ? 'Vaincu ★' : 'À défier'}`,
      22,
      72
    );
    ctx.fillText(`Rencontres : ${save.metNpcs.length}`, 22, 86);
    const mins = Math.floor(save.playTimeSeconds / 60);
    const secs = save.playTimeSeconds % 60;
    ctx.fillText(`Temps : ${mins}m ${String(secs).padStart(2, '0')}s`, 22, 100);

    // Léo (Maître du Jeu) with "Besoin d'aide ?" speech bubble on bottom-left
    const lx = 16;
    const ly = 140;
    const lSize = 58;
    ctx.fillStyle = '#121629';
    drawRoundRectPath(ctx, lx - 3, ly - 3, lSize + 6, lSize + 6, 5);
    ctx.fill();
    drawPortrait(
      ctx,
      GAME_MASTER_LEO.appearance,
      GAME_MASTER_LEO.portrait,
      lx,
      ly,
      lSize,
      GAME_MASTER_LEO.customPortraitUrl
    );
    ctx.strokeStyle = '#f4ce76';
    ctx.lineWidth = 1.4;
    drawRoundRectPath(ctx, lx - 2.5, ly - 2.5, lSize + 5, lSize + 5, 4.5);
    ctx.stroke();

    // Small gold nameplate under Léo
    ctx.fillStyle = '#241838';
    drawRoundRectPath(ctx, lx + 4, ly + lSize + 4, lSize - 8, 13, 6.5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(244, 206, 118, 0.7)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = '#ffe999';
    ctx.font = 'bold 7.2px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(GAME_MASTER_LEO.name, lx + lSize / 2, ly + lSize + 10.6);

    // Speech bubble pointing left at Léo
    const sbx = 85;
    const sby = 150;
    const sbw = 92;
    const sbh = 38;
    ctx.fillStyle = '#fbf6ea';
    drawRoundRectPath(ctx, sbx, sby, sbw, sbh, 7);
    ctx.fill();
    ctx.strokeStyle = '#d9ae54';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(sbx + 1, sby + 13);
    ctx.lineTo(sbx - 8, sby + 19);
    ctx.lineTo(sbx + 1, sby + 25);
    ctx.closePath();
    ctx.fillStyle = '#fbf6ea';
    ctx.fill();
    ctx.strokeStyle = '#d9ae54';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sbx, sby + 13);
    ctx.lineTo(sbx - 8, sby + 19);
    ctx.lineTo(sbx, sby + 25);
    ctx.stroke();

    ctx.fillStyle = '#1b2238';
    ctx.font = 'bold 8.6px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Besoin d’aide ?', sbx + sbw / 2, sby + sbh / 2 + 0.5);
    return;
  }

  if (subView === 'badges') {
    const allBadges: BadgeDef[] = [...world.badges, world.bossBadge];
    drawPanelBox(ctx, 12, 12, MG_W - 24, MG_H - 24, '#182038', '#f4c542');

    ctx.fillStyle = '#ffe27a';
    drawFittedSingleLine(ctx, `Boîte à Badges — ${world.worldName}`, 24, 21, MG_W - 104, {
      preferredSize: 11,
      minSize: 8,
      weight: 'bold',
      align: 'left',
      baseline: 'top',
    });
    drawBackPill(ctx, false);

    // Grid of 13 badges
    const slots = getBadgeSlotRects(allBadges.length);
    allBadges.forEach((badge, idx) => {
      const slot = slots[idx];
      const bx = slot.x + 4;
      const by = slot.y + 4;
      const unlocked =
        badge.district === 4
          ? save.bossDefeated
          : save.badges.includes(badge.id);

      if (idx === subCursor) {
        ctx.fillStyle = '#33467a';
        ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
        ctx.strokeStyle = '#f4c542';
        ctx.strokeRect(slot.x - 0.5, slot.y - 0.5, slot.w + 1, slot.h + 1);
      }
      drawBadgeIcon(ctx, badge, unlocked, bx, by, 1.6);
    });

    // Selected badge details
    const chosen = allBadges[subCursor] ?? allBadges[0];
    const unlocked =
      chosen.district === 4
        ? save.bossDefeated
        : save.badges.includes(chosen.id);
    drawPanelBox(ctx, 22, 152, MG_W - 44, 64, '#101526', '#4a5a8a');
    ctx.fillStyle = unlocked ? '#ffe27a' : '#8a94b8';
    drawFittedSingleLine(
      ctx,
      unlocked
        ? `${chosen.name} (${chosen.characterName} • ${chosen.category})`
        : `??? — Quartier ${chosen.district} (${chosen.category})`,
      32,
      160,
      MG_W - 64,
      {
        preferredSize: 9,
        minSize: 6.5,
        weight: 'bold',
        align: 'left',
        baseline: 'top',
      }
    );
    ctx.fillStyle = '#d4ddf7';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    drawWrappedText(
      ctx,
      unlocked
        ? chosen.description
        : `Parlez aux personnages du quartier ${chosen.district} pour trouver ${chosen.characterName}.`,
      32,
      176,
      MG_W - 64,
      11
    );
    return;
  }

  if (subView === 'notebook') {
    const entries = world.npcs.filter((n) => n.role === 'main' || n.role === 'boss');
    drawPanelBox(ctx, 12, 12, MG_W - 24, MG_H - 24, '#f8f5ec', '#28365e');
    ctx.fillStyle = '#1b2033';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Carnet de Rencontres', 22, 20);
    drawBackPill(ctx, true);

    const chosen = entries[subCursor % entries.length];
    const met = save.metNpcs.includes(chosen.id);
    const won =
      chosen.role === 'boss'
        ? save.bossDefeated
        : chosen.badgeId
          ? save.badges.includes(chosen.badgeId)
          : false;

    // Left scrollable list
    const rows = getNotebookRowRects(entries.length, subCursor);
    for (const row of rows) {
      const e = entries[row.index];
      const sel = row.index === subCursor;
      if (sel) {
        ctx.fillStyle = '#28365e';
        ctx.fillRect(row.x, row.y, row.w, row.h);
      }
      const isMet = save.metNpcs.includes(e.id);
      ctx.fillStyle = sel ? '#ffe680' : '#242b40';
      drawFittedSingleLine(
        ctx,
        `${sel ? '▶ ' : ''}${isMet ? e.name : '??? (À rencontrer)'}`,
        row.x + 4,
        row.y + row.h / 2,
        row.w - 8,
        {
          preferredSize: 8,
          minSize: 6.2,
          weight: 'bold',
          align: 'left',
          baseline: 'middle',
        }
      );
    }

    // Subtle scroll hints for left list
    const firstIdx = rows[0]?.index ?? 0;
    const lastIdx = rows[rows.length - 1]?.index ?? 0;
    ctx.fillStyle = '#5a668a';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    if (firstIdx > 0) ctx.fillText('▲', 166, 28);
    if (lastIdx < entries.length - 1) ctx.fillText('▼', 166, 208);

    // Right detail card
    drawPanelBox(ctx, 178, 38, 182, 178, '#1b2238', '#d6ae53');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    if (met) {
      drawPortrait(
        ctx,
        chosen.appearance,
        chosen.portrait,
        190,
        48,
        48,
        chosen.customPortraitUrl
      );
      ctx.fillStyle = '#ffe27a';
      ctx.font = 'bold 9.5px sans-serif';
      const nameEndY = drawWrappedText(ctx, chosen.name, 246, 56, 106, 12);
      ctx.font = '8px sans-serif';
      ctx.fillStyle = won ? '#66f28d' : '#ff9494';
      ctx.fillText(won ? 'Badge obtenu ✓' : 'À défier !', 246, nameEndY + 4);
      ctx.fillStyle = '#e6ebff';
      drawWrappedText(ctx, chosen.notebookBio ?? '', 190, 104, 158, 11);
    } else {
      ctx.fillStyle = '#8b98c4';
      ctx.font = 'bold 9px sans-serif';
      drawWrappedText(
        ctx,
        `Personnage du Quartier ${chosen.district}. Explorez les bâtiments et parlez aux habitants pour des indices !`,
        190,
        74,
        158,
        12
      );
    }
    return;
  }

  if (subView === 'map') {
    drawPanelBox(ctx, 18, 14, MG_W - 36, MG_H - 28, '#141a2b', '#f4c542');
    ctx.fillStyle = '#ffe27a';
    drawFittedSingleLine(ctx, `Carte — ${world.worldName}`, 30, 22, MG_W - 110, {
      preferredSize: 10,
      minSize: 8,
      weight: 'bold',
      align: 'left',
      baseline: 'top',
    });
    drawBackPill(ctx, false);

    // Minimap scaled 3x (60*3 = 180 x 44*3 = 132)
    const mx = 34;
    const my = 44;
    const scale = 3;
    const ow = world.maps[world.overworldId];
    for (let y = 0; y < ow.height; y++) {
      for (let x = 0; x < ow.width; x++) {
        const t = ow.tiles[y][x];
        let c = '#3b7a47';
        if (t === 'water') c = '#3474b5';
        else if (t === 'sand') c = '#e5ca87';
        else if (t === 'bridge') c = '#a67a4e';
        else if (t === 'path' || t === 'plaza' || t === 'star_tile') c = '#c7b898';
        else if (t === 'carpet') c = '#b83242';
        else if (t === 'tree') c = '#1f4729';
        else if (t === 'wall_a' || t === 'wall_b' || t === 'roof_a' || t === 'roof_b') c = '#6e768f';
        else if (t === 'gate_closed') {
          const gate = world.gates.find((g) => g.tiles.some((gt) => gt.x === x && gt.y === y));
          c = gate && save.badges.length >= gate.requiredBadges ? '#57d978' : '#f4c542';
        }
        ctx.fillStyle = c;
        ctx.fillRect(mx + x * scale, my + y * scale, scale, scale);
      }
    }

    // Building status dots
    for (const b of world.buildings) {
      const won = b.isBoss ? save.bossDefeated : save.badges.includes(b.badgeId);
      ctx.fillStyle = won ? '#57d978' : b.isBoss ? '#ffd045' : '#ff4d5e';
      ctx.fillRect(mx + b.doorX * scale - 1, my + b.doorY * scale - 1, 5, 5);
    }

    // Player marker
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mx + playerPos.x * scale - 2, my + playerPos.y * scale - 2, 6, 6);
    ctx.fillStyle = '#3fb8ff';
    ctx.fillRect(mx + playerPos.x * scale - 1, my + playerPos.y * scale - 1, 4, 4);

    // Legend on right
    const lx = 224;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Légende :', lx, 44);
    const items: [string, string][] = [
      ['■ Vous êtes ici', '#3fb8ff'],
      ['■ Défi à relever (!)', '#ff4d5e'],
      ['■ Badge obtenu (✓)', '#57d978'],
      ['■ Boss Final (★)', '#ffd045'],
    ];
    items.forEach(([txt, col], i) => {
      ctx.fillStyle = col;
      ctx.font = '8px sans-serif';
      ctx.fillText(txt, lx, 64 + i * 16);
    });

    ctx.fillStyle = '#ffd978';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('Quartiers :', lx, 134);
    world.districts.forEach((d, i) => {
      ctx.fillStyle = '#cbd5f5';
      drawFittedSingleLine(ctx, `${d.id}. ${d.name}`, lx, 148 + i * 14, 134, {
        preferredSize: 8,
        minSize: 5.8,
        align: 'left',
        baseline: 'top',
      });
    });
  }
}

export function renderEndingCeremony(
  ctx: CanvasRenderingContext2D,
  modeId: ModeId,
  world: WorldDefinition,
  save: ModeSaveData,
  timer: number
): void {
  const pair = FAMILY_PAIRS[modeId];
  const members = pair.members;

  // Festive gradient sky
  const grad = ctx.createLinearGradient(0, 0, 0, MG_H);
  grad.addColorStop(0, '#190f2e');
  grad.addColorStop(0.5, '#3b1533');
  grad.addColorStop(1, '#12262e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, MG_W, MG_H);

  // Fireworks bursts
  const fwColors = ['#ffd452', '#ff6b8b', '#66f28d', '#6ec6ff'];
  for (let b = 0; b < 4; b++) {
    const phase = (timer * 0.9 + b * 0.45) % 1.8;
    if (phase < 1.0) {
      const fx = 54 + b * 92;
      const fy = 36 + (b % 2) * 18;
      ctx.fillStyle = fwColors[b];
      for (let p = 0; p < 8; p++) {
        const ang = (p / 8) * Math.PI * 2;
        const r = phase * 22;
        ctx.fillRect(Math.round(fx + Math.cos(ang) * r), Math.round(fy + Math.sin(ang) * r), 2, 2);
      }
    }
  }

  // Gentle snowfall
  for (let i = 0; i < 40; i++) {
    const sx = (i * 53 + Math.sin(timer * 1.4 + i) * 8 + MG_W) % MG_W;
    const sy = (i * 31 + timer * 22) % MG_H;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
  }

  // Panthéon header + Big "JOYEUX NOËL" banner!
  ctx.fillStyle = '#9ff5b6';
  drawFittedSingleLine(
    ctx,
    `PANTHÉON DES CHAMPIONS — ${world.worldName.toUpperCase()}`,
    MG_W / 2,
    10,
    MG_W - 24,
    {
      preferredSize: 9,
      minSize: 7,
      weight: 'bold',
      align: 'center',
      baseline: 'top',
    }
  );

  ctx.fillStyle = '#c92a42';
  ctx.fillRect(24, 24, MG_W - 48, 28);
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, MG_W - 48, 28);

  ctx.fillStyle = '#ffe97d';
  drawFittedSingleLine(
    ctx,
    `★ JOYEUX NOËL, ${pair.label.toUpperCase()} ! ★`,
    MG_W / 2,
    38,
    MG_W - 60,
    {
      preferredSize: 13.5,
      minSize: 8.2,
      weight: 'bold',
      align: 'center',
      baseline: 'middle',
    }
  );

  // Team Portraits & Hopping Sprites
  if (members.length >= 3) {
    const [mA, mB, mC] = members;
    drawPortrait(ctx, mA.appearance, mA.portrait, 16, 62, 38, mA.customPortraitUrl);
    drawPortrait(ctx, mB.appearance, mB.portrait, 58, 62, 38, mB.customPortraitUrl);
    drawPortrait(ctx, mC.appearance, mC.portrait, MG_W - 54, 62, 38, mC.customPortraitUrl);

    const hopA = Math.abs(Math.round(Math.sin(timer * 5) * 4));
    const hopB = Math.abs(Math.round(Math.cos(timer * 5) * 4));
    const hopC = Math.abs(Math.round(Math.sin(timer * 5 + 1.8) * 4));
    drawOverworldSprite(ctx, mA.appearance, 'down', Math.floor(timer * 4) % 3, 102, 84 - hopA, mA.customSpriteSheetUrl);
    drawOverworldSprite(ctx, mB.appearance, 'down', Math.floor(timer * 4 + 1) % 3, MG_W - 102, 84 - hopB, mB.customSpriteSheetUrl);
    drawOverworldSprite(ctx, mC.appearance, 'down', Math.floor(timer * 4 + 2) % 3, MG_W - 80, 84 - hopC, mC.customSpriteSheetUrl);
  } else {
    const [mA, mB] = members;
    drawPortrait(ctx, mA.appearance, mA.portrait, 34, 62, 48, mA.customPortraitUrl);
    drawPortrait(ctx, mB.appearance, mB.portrait, MG_W - 82, 62, 48, mB.customPortraitUrl);

    const hopA = Math.abs(Math.round(Math.sin(timer * 5) * 4));
    const hopB = Math.abs(Math.round(Math.cos(timer * 5) * 4));
    drawOverworldSprite(ctx, mA.appearance, 'down', Math.floor(timer * 4) % 3, 92, 84 - hopA, mA.customSpriteSheetUrl);
    drawOverworldSprite(ctx, mB.appearance, 'down', Math.floor(timer * 4 + 1) % 3, MG_W - 108, 84 - hopB, mB.customSpriteSheetUrl);
  }

  // Supreme Boss Badge in center
  drawBadgeIcon(ctx, world.bossBadge, true, MG_W / 2 - 16, 62, 1.6);
  ctx.fillStyle = '#ffffff';
  drawFittedSingleLine(ctx, world.bossBadge.name, MG_W / 2, 102, 156, {
    preferredSize: 8,
    minSize: 6.2,
    weight: 'bold',
    align: 'center',
    baseline: 'middle',
  });

  // All 12 Badges row
  const startX = Math.floor((MG_W - 12 * 26) / 2);
  world.badges.forEach((badge, i) => {
    drawBadgeIcon(ctx, badge, true, startX + i * 26, 120, 1.15);
  });

  // Gift Dedication Box
  drawPanelBox(ctx, 26, 150, MG_W - 52, 58, '#161b30', '#ffd452');
  ctx.fillStyle = '#fff5d6';
  drawFittedSingleLine(
    ctx,
    `Félicitations ! Vous avez triomphé ${formatFrenchDeName(world.bossBadge.characterName)} !`,
    MG_W / 2,
    158,
    MG_W - 68,
    {
      preferredSize: 9,
      minSize: 7,
      weight: 'bold',
      align: 'center',
      baseline: 'top',
    }
  );
  ctx.fillStyle = '#cbd8ff';
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const mins = Math.floor(save.playTimeSeconds / 60);
  const secs = save.playTimeSeconds % 60;
  ctx.fillText(
    `Badges : 12/12 + Boss  •  Rencontres : ${save.metNpcs.length}  •  Temps : ${mins}m ${String(secs).padStart(2, '0')}s`,
    MG_W / 2,
    174
  );
  ctx.fillStyle = '#79f59d';
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText(
    'Avec tout notre amour, très Joyeux Noël à toute la famille ! ♥',
    MG_W / 2,
    190
  );

  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('[Espace / A] Revenir au menu des mondes', MG_W / 2, 220);
}
