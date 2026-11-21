import { FAMILY_PAIRS, MODE_ORDER } from '../data/familyAvatars';
import { drawBadgeIcon, drawOverworldSprite, drawPortrait } from './pixelRenderer';
import {
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

    // Wrapped typewriter text
    ctx.fillStyle = '#1b2033';
    ctx.font = '600 9.5px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textBaseline = 'top';
    const shown = msg.text.slice(0, Math.floor(this.charCount));
    drawWrappedText(ctx, shown, textX, boxY + 11, textW, 13);

    if (this.charCount >= msg.text.length && Math.floor(animTimer * 3) % 2 === 0) {
      ctx.fillStyle = '#c93838';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('▼', MG_W - 16, boxY + boxH - 16);
    }
  }
}

export function getModeCardRects() {
  return [
    { x: 12, y: 36, w: 174, h: 93 },
    { x: 198, y: 36, w: 174, h: 93 },
    { x: 12, y: 137, w: 174, h: 93 },
    { x: 198, y: 137, w: 174, h: 93 },
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

export function renderModeSelectScreen(
  ctx: CanvasRenderingContext2D,
  save: GlobalSaveData,
  selectedIndex: number,
  timer = 0
): void {
  // 1. Illustrated Winter Christmas Eve Night Sky
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
    ctx.fillStyle = i % 3 === 0 ? `rgba(255, 232, 160, ${twinkle.toFixed(2)})` : `rgba(218, 232, 255, ${(twinkle * 0.75).toFixed(2)})`;
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

  // 2. Festive Header with Golden Fairy-Light Garland
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

  // Header Title & Completion Pill
  const clearedCount = MODE_ORDER.filter((m) => save.modes[m].bossDefeated).length;
  ctx.fillStyle = '#fff0bc';
  ctx.font = 'bold 10.5px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Choisissez votre binôme', 14, 20.5);

  const badgeText = clearedCount === 4 ? '★ 4/4 • JOYEUX NOËL !' : `★ ${clearedCount}/4`;
  ctx.font = 'bold 8.2px system-ui, -apple-system, "Segoe UI", sans-serif';
  const pillW = Math.ceil(ctx.measureText(badgeText).width) + 14;
  const pillX = MG_W - 12 - pillW;
  ctx.fillStyle = clearedCount === 4 ? 'rgba(46, 128, 76, 0.45)' : 'rgba(244, 206, 118, 0.14)';
  drawRoundRectPath(ctx, pillX, 13.5, pillW, 13, 6.5);
  ctx.fill();
  ctx.strokeStyle = clearedCount === 4 ? '#79f59d' : 'rgba(244, 206, 118, 0.55)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = clearedCount === 4 ? '#9bffb8' : '#ffe69a';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, pillX + pillW / 2, 20.2);

  // 3. 2×2 Gift / Polaroid Collector Cards (Zero Theme Spoilers!)
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
    ribGrad.addColorStop(1, selected ? pair.primaryColor : pair.primaryColor);
    ctx.fillStyle = ribGrad;
    ctx.fillRect(x, y, w, 17);
    // Subtle ribbon sheen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.13)';
    ctx.fillRect(x, y, w, 5);
    // Thin gold ribbon trim
    ctx.fillStyle = 'rgba(255, 228, 148, 0.55)';
    ctx.fillRect(x, y + 16.2, w, 0.9);
    ctx.restore();

    // Card border
    ctx.strokeStyle = selected ? '#f7d674' : 'rgba(130, 152, 206, 0.34)';
    ctx.lineWidth = selected ? 1.5 : 0.9;
    drawRoundRectPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 8);
    ctx.stroke();

    // Pair Name on ribbon + delicate golden gift bow
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9.2px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(pair.label, x + 9, y + 8.8);

    if (modeSave.bossDefeated) {
      ctx.fillStyle = '#ffe588';
      ctx.font = 'bold 7.8px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('★ ROI', x + w - 8, y + 8.8);
    } else {
      drawGiftBow(ctx, x + w - 14, y + 8.5);
    }

    // Two Polaroid-framed HD Family Portraits
    const [mA, mB] = pair.members;
    const pSize = 46;
    const frameW = pSize + 4;
    const frameH = pSize + 7;
    const pAy = y + 21.5;
    const pAx = x + Math.floor(w / 2) - frameW - 4;
    const pBx = x + Math.floor(w / 2) + 4;

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
        -frameH / 2 + 2,
        pSize,
        member.customPortraitUrl
      );
      ctx.strokeStyle = selected ? 'rgba(218, 172, 74, 0.65)' : 'rgba(40, 48, 72, 0.35)';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(-pSize / 2, -frameH / 2 + 2, pSize, pSize);
      ctx.restore();
    };

    drawPolaroid(pAx, pAy, mA, -0.028);
    drawPolaroid(pBx, pAy, mB, 0.028);

    // Cute animated duo sprites hopping beside the polaroids on the selected card!
    if (selected) {
      const hopA = Math.abs(Math.sin(timer * 5.2)) * 3;
      const hopB = Math.abs(Math.sin(timer * 5.2 + 1.2)) * 3;
      const walkFrame = Math.floor(timer * 4.5) % 3;
      drawOverworldSprite(
        ctx,
        mA.appearance,
        'down',
        walkFrame,
        x + 8,
        y + 42 - hopA,
        mA.customSpriteSheetUrl
      );
      drawOverworldSprite(
        ctx,
        mB.appearance,
        'down',
        (walkFrame + 1) % 3,
        x + w - 24,
        y + 42 - hopB,
        mB.customSpriteSheetUrl
      );
    }

    // 12 Mini Golden Badge Stars + Discrete Counter at Bottom of Card
    const count = modeSave.badges.length;
    const starY = y + h - 8.5;
    const starStartX = x + 15;
    const starStep = 10.2;
    for (let s = 0; s < 12; s++) {
      const sx = starStartX + s * starStep;
      const earned = s < count;
      if (earned) {
        const shimmer = 0.85 + 0.15 * Math.sin(timer * 4 + s * 0.7);
        ctx.fillStyle = modeSave.bossDefeated ? '#fff099' : '#ffd54f';
        ctx.globalAlpha = shimmer;
        drawStarPath(ctx, sx, starY, 3.6, 1.65, 5);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = selected ? '#3b4870' : '#2a3352';
        drawStarPath(ctx, sx, starY, 3.0, 1.35, 5);
        ctx.fill();
      }
    }

    ctx.fillStyle = count > 0 || selected ? '#ffe699' : '#96a5cf';
    ctx.font = 'bold 7.6px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(modeSave.bossDefeated ? '12/12 ★' : `${count}/12`, x + w - 9, starY + 0.4);

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
  'Changer de binôme',
] as const;

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
    drawPanelBox(ctx, 188, 18, 184, 160, '#f8f5ec', '#28365e');
    ctx.fillStyle = '#1b2033';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('MENU DU VOYAGE', 202, 28);

    PAUSE_OPTIONS.forEach((opt, i) => {
      const y = 48 + i * 20;
      const sel = i === cursor;
      if (sel) {
        ctx.fillStyle = '#28365e';
        ctx.fillRect(196, y - 2, 168, 16);
      }
      ctx.fillStyle = sel ? '#ffe680' : '#262d42';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`${sel ? '▶ ' : '  '}${opt}`, 200, y + 1);
    });

    // Quick pair summary card on left
    const pair = FAMILY_PAIRS[world.modeId];
    drawPanelBox(ctx, 12, 18, 166, 98, '#1b2238', '#f4c542');
    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(pair.label, 22, 28);
    ctx.fillStyle = '#cbd5f5';
    ctx.font = '8px sans-serif';
    ctx.fillText(world.worldName, 22, 42);
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
    return;
  }

  if (subView === 'badges') {
    const allBadges: BadgeDef[] = [...world.badges, world.bossBadge];
    drawPanelBox(ctx, 12, 12, MG_W - 24, MG_H - 24, '#182038', '#f4c542');

    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Boîte à Badges — ${world.worldName}`, 24, 22);

    // Grid of 13 badges (6 + 7 or 5 + 5 + 3)
    const cols = 7;
    allBadges.forEach((badge, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const bx = 32 + col * 48;
      const by = 46 + row * 48;
      const unlocked =
        badge.district === 4
          ? save.bossDefeated
          : save.badges.includes(badge.id);

      if (idx === subCursor) {
        ctx.fillStyle = '#33467a';
        ctx.fillRect(bx - 4, by - 4, 40, 40);
        ctx.strokeStyle = '#f4c542';
        ctx.strokeRect(bx - 4.5, by - 4.5, 41, 41);
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
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(
      unlocked
        ? `${chosen.name} (${chosen.characterName} • ${chosen.category})`
        : `??? — Quartier ${chosen.district} (${chosen.category})`,
      32,
      160
    );
    ctx.fillStyle = '#d4ddf7';
    ctx.font = '8px sans-serif';
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

    const chosen = entries[subCursor % entries.length];
    const met = save.metNpcs.includes(chosen.id);
    const won = chosen.badgeId ? save.badges.includes(chosen.badgeId) : save.bossDefeated;

    // Left scrollable list
    const start = Math.max(0, Math.min(entries.length - 8, subCursor - 3));
    for (let i = 0; i < 8 && start + i < entries.length; i++) {
      const idx = start + i;
      const e = entries[idx];
      const y = 40 + i * 21;
      const sel = idx === subCursor;
      if (sel) {
        ctx.fillStyle = '#28365e';
        ctx.fillRect(20, y - 2, 148, 18);
      }
      const isMet = save.metNpcs.includes(e.id);
      ctx.fillStyle = sel ? '#ffe680' : '#242b40';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText(
        `${sel ? '▶ ' : ''}${isMet ? e.name : '??? (À rencontrer)'}`,
        24,
        y + 3
      );
    }

    // Right detail card
    drawPanelBox(ctx, 178, 38, 182, 178, '#1b2238', '#d6ae53');
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
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Carte — ${world.worldName}`, 30, 22);

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
        else if (t === 'path' || t === 'plaza' || t === 'star_tile') c = '#c7b898';
        else if (t === 'carpet') c = '#b83242';
        else if (t === 'tree') c = '#1f4729';
        else if (t === 'wall_a' || t === 'wall_b' || t === 'roof_a' || t === 'roof_b') c = '#6e768f';
        else if (t === 'gate_closed') c = '#f4c542';
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
    const lx = 228;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
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
      ctx.font = '8px sans-serif';
      ctx.fillText(`${d.id}. ${d.name}`, lx, 148 + i * 14);
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
  const [mA, mB] = pair.members;

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
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#9ff5b6';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText(`PANTHÉON DES CHAMPIONS — ${world.worldName.toUpperCase()}`, MG_W / 2, 10);

  ctx.fillStyle = '#c92a42';
  ctx.fillRect(24, 24, MG_W - 48, 28);
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, MG_W - 48, 28);

  ctx.fillStyle = '#ffe97d';
  ctx.font = 'bold 14px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(`★ JOYEUX NOËL, ${mA.name.toUpperCase()} & ${mB.name.toUpperCase()} ! ★`, MG_W / 2, 38);

  // Duo Portraits & Hopping Sprites
  drawPortrait(ctx, mA.appearance, mA.portrait, 34, 62, 48, mA.customPortraitUrl);
  drawPortrait(ctx, mB.appearance, mB.portrait, MG_W - 82, 62, 48, mB.customPortraitUrl);

  const hopA = Math.abs(Math.round(Math.sin(timer * 5) * 4));
  const hopB = Math.abs(Math.round(Math.cos(timer * 5) * 4));
  drawOverworldSprite(ctx, mA.appearance, 'down', Math.floor(timer * 4) % 3, 92, 84 - hopA, mA.customSpriteSheetUrl);
  drawOverworldSprite(ctx, mB.appearance, 'down', Math.floor(timer * 4 + 1) % 3, MG_W - 108, 84 - hopB, mB.customSpriteSheetUrl);

  // Supreme Boss Badge in center
  drawBadgeIcon(ctx, world.bossBadge, true, MG_W / 2 - 16, 62, 1.6);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText(world.bossBadge.name, MG_W / 2, 100);

  // All 12 Badges row
  const startX = Math.floor((MG_W - 12 * 26) / 2);
  world.badges.forEach((badge, i) => {
    drawBadgeIcon(ctx, badge, true, startX + i * 26, 120, 1.15);
  });

  // Gift Dedication Box
  drawPanelBox(ctx, 26, 150, MG_W - 52, 58, '#161b30', '#ffd452');
  ctx.fillStyle = '#fff5d6';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(
    `Félicitations ! Vous avez triomphé de ${world.bossBadge.characterName} !`,
    MG_W / 2,
    158
  );
  ctx.fillStyle = '#cbd8ff';
  ctx.font = '8px sans-serif';
  const mins = Math.floor(save.playTimeSeconds / 60);
  const secs = save.playTimeSeconds % 60;
  ctx.fillText(
    `Badges : 12/12 + Boss  •  Rencontres : ${save.metNpcs.length}  •  Temps : ${mins}m ${secs}s`,
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
