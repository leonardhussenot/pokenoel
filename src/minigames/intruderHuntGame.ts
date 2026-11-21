import { soundEngine } from '../audio/soundEngine';
import { InputManager } from '../engine/input';
import { IntruderHuntChallengeConfig, IntruderRound } from '../types';
import {
  drawFittedWrappedText,
  drawHearts,
  drawMgParticles,
  drawMiniGameHud,
  drawPanelBox,
  drawReflectionStageBackdrop,
  drawRoundRectPath,
  drawSpotlightBeam,
  formatFrenchText,
  getReflectionThemePalette,
  MG_W,
  MgParticle,
  MiniGameInstance,
  updateMgParticles,
} from './common';

const CARD_NUMERALS = ['I', 'II', 'III', 'IV'] as const;

export class IntruderHuntGame implements MiniGameInstance {
  rounds: IntruderRound[];
  roundIndex = 0;
  cursor = 0;
  lives: number;
  revealTimer = 0;
  selectedIdx: number | null = null;
  wasCorrect = false;
  result: 'playing' | 'won' | 'lost' = 'playing';

  private elapsed = 0;
  private revealElapsed = 0;
  private shakeTimer = 0;
  private particles: MgParticle[] = [];

  constructor(private cfg: IntruderHuntChallengeConfig) {
    this.rounds = cfg.rounds;
    this.lives = Math.max(1, cfg.lives);
  }

  private getCardRects() {
    return [
      { x: 14, y: 74, w: 172, h: 66 },
      { x: 198, y: 74, w: 172, h: 66 },
      { x: 14, y: 150, w: 172, h: 66 },
      { x: 198, y: 150, w: 172, h: 66 },
    ];
  }

  private spawnRevealBurst(cx: number, cy: number, color: string): void {
    this.particles.push({
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      life: 0.36,
      maxLife: 0.36,
      size: 24,
      color,
      shape: 'ring',
    });
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI * 2) / 16 + Math.random() * 0.25;
      const spd = 34 + Math.random() * 58;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 10,
        life: 0.4 + Math.random() * 0.25,
        maxLife: 0.65,
        size: 4,
        color: i % 3 === 0 ? '#ffffff' : color,
        gravity: 60,
        shape: i % 2 === 0 ? 'star' : 'circle',
      });
    }
  }

  private selectCard(idx: number): void {
    const round = this.rounds[this.roundIndex];
    this.selectedIdx = idx;
    this.wasCorrect = idx === round.intruderIndex;
    this.revealTimer = 2.6;
    this.revealElapsed = 0;

    const targetRect = this.getCardRects()[round.intruderIndex];
    const cx = targetRect.x + targetRect.w / 2;
    const cy = targetRect.y + targetRect.h / 2;

    if (this.wasCorrect) {
      soundEngine.playHitPerfect();
      this.spawnRevealBurst(cx, cy, '#66f28d');
    } else {
      this.lives = Math.max(0, this.lives - 1);
      this.shakeTimer = 0.36;
      soundEngine.playHitMiss();
      this.spawnRevealBurst(cx, cy, '#ff7584');
    }
  }

  private finishReveal(): void {
    this.revealTimer = 0;
    this.revealElapsed = 0;
    this.selectedIdx = null;
    if (this.lives <= 0) {
      this.result = 'lost';
      return;
    }
    if (this.roundIndex + 1 >= this.rounds.length) {
      this.result = 'won';
      return;
    }
    this.roundIndex++;
    this.cursor = 0;
  }

  update(dt: number, input: InputManager): void {
    if (this.result !== 'playing') return;
    this.elapsed += dt;

    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    updateMgParticles(this.particles, dt);

    if (this.revealTimer > 0) {
      this.revealTimer -= dt;
      this.revealElapsed += dt;
      const tap = input.consumeTap();
      const canSkip = this.revealElapsed >= 0.45 && (input.justPressed('a') || tap !== null);
      if (this.revealTimer <= 0 || canSkip) {
        this.finishReveal();
      }
      return;
    }

    if (input.justPressed('up') || input.justPressed('down')) {
      this.cursor = (this.cursor + 2) % 4;
      soundEngine.playSelect();
    } else if (input.justPressed('left')) {
      this.cursor = this.cursor % 2 === 1 ? this.cursor - 1 : this.cursor + 1;
      soundEngine.playSelect();
    } else if (input.justPressed('right')) {
      this.cursor = this.cursor % 2 === 0 ? this.cursor + 1 : this.cursor - 1;
      soundEngine.playSelect();
    }

    const tap = input.consumeTap();
    if (tap) {
      const rects = this.getCardRects();
      for (let i = 0; i < 4; i++) {
        const r = rects[i];
        if (tap.x >= r.x && tap.x <= r.x + r.w && tap.y >= r.y && tap.y <= r.y + r.h) {
          this.cursor = i;
          this.selectCard(i);
          return;
        }
      }
    }

    if (input.justPressed('a')) {
      this.selectCard(this.cursor);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pal = getReflectionThemePalette(this.cfg.themeStyle);
    const round = this.rounds[this.roundIndex];
    const shakeX = this.shakeTimer > 0 ? Math.round(Math.sin(this.shakeTimer * 65) * 3) : 0;
    const inReveal = this.revealTimer > 0;
    const rects = this.getCardRects();

    ctx.save();

    // Rich themed stage backdrop
    drawReflectionStageBackdrop(ctx, this.cfg.themeStyle, this.elapsed);

    // Dramatic spotlight on the true intruder during reveal!
    if (inReveal) {
      const intrRect = rects[round.intruderIndex];
      drawSpotlightBeam(
        ctx,
        intrRect.x + intrRect.w / 2 + shakeX,
        26,
        intrRect.x + intrRect.w / 2 + shakeX,
        intrRect.y + intrRect.h + 12,
        14,
        92,
        this.wasCorrect ? 'rgba(102, 242, 141, 0.28)' : 'rgba(255, 130, 142, 0.28)'
      );
    }

    // Prompt Card + Hearts Pill
    drawPanelBox(ctx, 14 + shakeX, 31, MG_W - 28, 36, pal.promptBg, pal.accent);

    const heartsW = Math.max(46, this.cfg.lives * 13 + 8);
    const heartsX = MG_W - 20 - heartsW + shakeX;
    ctx.fillStyle = pal.promptInk;
    drawFittedWrappedText(ctx, round.prompt, 22 + shakeX, 34, MG_W - 48 - heartsW, 30, {
      preferredSize: 8.5,
      minSize: 6.4,
      weight: 'bold',
      lineHeightRatio: 1.24,
      verticalCenter: true,
    });

    ctx.fillStyle = 'rgba(18, 22, 38, 0.88)';
    drawRoundRectPath(ctx, heartsX, 39, heartsW, 20, 4);
    ctx.fill();
    drawHearts(ctx, heartsX + 5, 43, this.lives, this.cfg.lives);

    // 2x2 Framed Gallery Cards
    for (let i = 0; i < 4; i++) {
      const r = rects[i];
      const rx = r.x + shakeX;
      const isCursor = !inReveal && this.cursor === i;
      const isIntruder = inReveal && i === round.intruderIndex;
      const isWrongPick = inReveal && i === this.selectedIdx && !this.wasCorrect;
      const dimmed = inReveal && !isIntruder && !isWrongPick;

      ctx.save();
      if (dimmed) ctx.globalAlpha = 0.45;

      // Soft focus glow for active selection or revealed intruder
      if (isCursor || isIntruder) {
        const pulse = 0.22 + 0.14 * Math.sin(this.elapsed * 7);
        ctx.fillStyle = isIntruder
          ? this.wasCorrect
            ? `rgba(102, 242, 141, ${pulse + 0.12})`
            : `rgba(255, 130, 142, ${pulse + 0.12})`
          : `rgba(255, 218, 92, ${pulse})`;
        drawRoundRectPath(ctx, rx - 3, r.y - 3, r.w + 6, r.h + 6, 6);
        ctx.fill();
      }

      const bg = isIntruder
        ? this.wasCorrect
          ? '#1a5e3a'
          : '#5e2236'
        : isWrongPick
          ? '#6e202c'
          : isCursor
            ? pal.cardSelectedBg
            : pal.cardBg;

      const border = isIntruder
        ? this.wasCorrect
          ? '#66f28d'
          : '#ff8a96'
        : isWrongPick
          ? '#ff7070'
          : isCursor
            ? '#ffe066'
            : pal.cardBorder;

      drawPanelBox(ctx, rx, r.y, r.w, r.h, bg, border);

      // Inner gallery mat frame
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(rx + 5.5, r.y + 5.5, r.w - 11, r.h - 11);

      // Roman numeral medallion top-left
      ctx.fillStyle = isIntruder
        ? this.wasCorrect
          ? '#66f28d'
          : '#ffe066'
        : isCursor
          ? '#ffe066'
          : '#2c3858';
      drawRoundRectPath(ctx, rx + 8, r.y + 8, 18, 13, 3);
      ctx.fill();
      ctx.fillStyle = isCursor || isIntruder ? '#141826' : '#cfd8f5';
      ctx.font = 'bold 7.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(CARD_NUMERALS[i], rx + 17, r.y + 15);

      // Card label text (auto-fitted, never clips!)
      ctx.fillStyle = isCursor || isIntruder ? '#fff9db' : '#f2f5ff';
      const labelTop = r.y + 18;
      const labelMaxH = isIntruder || isWrongPick ? r.h - 38 : r.h - 24;
      drawFittedWrappedText(ctx, round.items[i], rx + r.w / 2, labelTop, r.w - 20, labelMaxH, {
        preferredSize: 8.5,
        minSize: 6.2,
        weight: '600',
        lineHeightRatio: 1.24,
        align: 'center',
        verticalCenter: true,
      });

      // Reveal stamp ribbon at bottom of card
      if (isIntruder) {
        ctx.fillStyle = this.wasCorrect ? '#66f28d' : '#ff8a96';
        drawRoundRectPath(ctx, rx + 24, r.y + r.h - 17, r.w - 48, 13, 3);
        ctx.fill();
        ctx.fillStyle = '#121824';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          formatFrenchText(this.wasCorrect ? '★ INTRUS DÉMASQUÉ !' : '★ C’ÉTAIT L’INTRUS !'),
          rx + r.w / 2,
          r.y + r.h - 10.5
        );
      } else if (isWrongPick) {
        ctx.fillStyle = '#ff7070';
        drawRoundRectPath(ctx, rx + 36, r.y + r.h - 17, r.w - 72, 13, 3);
        ctx.fill();
        ctx.fillStyle = '#1a0c12';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✗ PAS L’INTRUS', rx + r.w / 2, r.y + r.h - 10.5);
      }

      ctx.restore();
    }

    // Particles
    drawMgParticles(ctx, this.particles);

    // Crisp Explanation Toast positioned on the opposite row so the intruder stays 100% visible!
    if (inReveal) {
      const intruderInTopRow = round.intruderIndex < 2;
      const boxY = intruderInTopRow ? 146 : 70;
      const boxH = 78;
      const accentColor = this.wasCorrect ? '#66f28d' : '#ff8a96';

      ctx.fillStyle = 'rgba(10, 14, 28, 0.96)';
      drawRoundRectPath(ctx, 14, boxY, MG_W - 28, boxH, 6);
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = accentColor;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(
        formatFrenchText(this.wasCorrect ? '★ INTRUS DÉMASQUÉ ! ★' : 'C’ÉTAIT L’INTRUS !'),
        MG_W / 2,
        boxY + 6
      );

      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.fillRect(28, boxY + 21, MG_W - 56, 1);

      ctx.fillStyle = '#f4f7ff';
      drawFittedWrappedText(ctx, round.explanation, 24, boxY + 25, MG_W - 48, boxH - 38, {
        preferredSize: 8.1,
        minSize: 6.2,
        weight: '600',
        lineHeightRatio: 1.28,
      });

      if (this.revealElapsed >= 0.45) {
        const pAlpha = 0.6 + 0.4 * Math.sin(this.elapsed * 7);
        ctx.fillStyle = `rgba(255, 224, 102, ${pAlpha})`;
        ctx.font = 'bold 7.2px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('▶ Suite [A / Clic]', MG_W - 22, boxY + boxH - 4);
      }
    } else {
      ctx.fillStyle = 'rgba(225, 232, 250, 0.78)';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        formatFrenchText('Flèches pour choisir  •  A / Clic pour démasquer l’intrus'),
        MG_W / 2,
        230
      );
    }

    // Calm Untimed Top HUD
    const progress =
      (this.roundIndex + (inReveal ? 1 : 0)) / Math.max(1, this.rounds.length);
    drawMiniGameHud(
      ctx,
      this.cfg.title,
      0,
      `Manche ${this.roundIndex + 1}/${this.rounds.length}`,
      progress,
      pal.accent
    );

    ctx.restore();
  }

  getResult(): 'playing' | 'won' | 'lost' {
    return this.result;
  }
}
