import { soundEngine } from '../audio/soundEngine';
import { InputManager } from '../engine/input';
import { ChallengeMistake, PairMatchChallengeConfig, PairMatchRound } from '../types';
import {
  drawFittedSingleLine,
  drawFittedWrappedText,
  drawHearts,
  drawMgParticles,
  drawMiniGameHud,
  drawPanelBox,
  drawReflectionStageBackdrop,
  drawRoundRectPath,
  formatFrenchText,
  getReflectionThemePalette,
  MG_W,
  MgParticle,
  MiniGameInstance,
  updateMgParticles,
} from './common';

export interface PairCardItem {
  text: string;
  pairId: number;
  matched: boolean;
}

export interface MatchedLink {
  leftIdx: number;
  rightIdx: number;
  color: string;
}

interface PairLayout {
  promptY: number;
  promptH: number;
  cardStartY: number;
  cardH: number;
  cardStep: number;
  leftX: number;
  rightX: number;
  cardW: number;
  cardFont: number;
}

const LINK_COLORS = ['#66f28d', '#ffe066', '#66d9ff', '#ff99cc', '#ffab5e', '#c59bff'] as const;

export class PairMatchGame implements MiniGameInstance {
  rounds: PairMatchRound[];
  roundIndex = 0;
  leftItems: PairCardItem[] = [];
  rightItems: PairCardItem[] = [];
  phase: 'pick_left' | 'pick_right' = 'pick_left';
  leftCursor = 0;
  rightCursor = 0;
  selectedLeft: number | null = null;
  matchedLinks: MatchedLink[] = [];
  lives: number;
  feedbackTimer = 0;
  result: 'playing' | 'won' | 'lost' = 'playing';

  private elapsed = 0;
  private feedbackElapsed = 0;
  private shakeTimer = 0;
  private wrongFlash: { leftIdx: number; rightIdx: number; timer: number } | null = null;
  private statusHint = '';
  private statusHintTimer = 0;
  private particles: MgParticle[] = [];
  private mistakes: ChallengeMistake[] = [];

  getMistakes(): ChallengeMistake[] {
    return [...this.mistakes];
  }

  constructor(private cfg: PairMatchChallengeConfig) {
    this.rounds = cfg.rounds;
    this.lives = Math.max(1, cfg.lives);
    this.loadRound(0);
  }

  private getLayout(): PairLayout {
    const count = Math.max(4, this.leftItems.length);
    if (count <= 4) {
      return {
        promptY: 30,
        promptH: 34,
        cardStartY: 70,
        cardH: 33,
        cardStep: 38,
        leftX: 12,
        rightX: 222,
        cardW: 150,
        cardFont: 8.0,
      };
    }
    if (count === 5) {
      return {
        promptY: 29,
        promptH: 27,
        cardStartY: 60,
        cardH: 29,
        cardStep: 33,
        leftX: 10,
        rightX: 222,
        cardW: 152,
        cardFont: 7.7,
      };
    }
    if (count === 6) {
      return {
        promptY: 28,
        promptH: 24,
        cardStartY: 56,
        cardH: 25,
        cardStep: 28,
        leftX: 10,
        rightX: 220,
        cardW: 154,
        cardFont: 7.3,
      };
    }
    const cardStep = Math.floor(168 / count);
    return {
      promptY: 28,
      promptH: 23,
      cardStartY: 55,
      cardH: Math.max(16, cardStep - 2),
      cardStep,
      leftX: 10,
      rightX: 220,
      cardW: 154,
      cardFont: 6.8,
    };
  }

  private loadRound(idx: number): void {
    const round = this.rounds[idx];
    if (!round) {
      this.result = 'won';
      return;
    }
    this.leftItems = round.pairs.map((p, i) => ({
      text: p.left,
      pairId: i,
      matched: false,
    }));

    const right: PairCardItem[] = round.pairs.map((p, i) => ({
      text: p.right,
      pairId: i,
      matched: false,
    }));

    // Shuffle right column so pairs aren't trivially straight across
    for (let attempt = 0; attempt < 12; attempt++) {
      for (let i = right.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = right[i];
        right[i] = right[j];
        right[j] = tmp;
      }
      const straightMatches = right.reduce((acc, it, i) => acc + (it.pairId === i ? 1 : 0), 0);
      if (straightMatches <= Math.max(0, right.length - 2)) break;
    }
    if (right.length >= 2 && right.every((it, i) => it.pairId === i)) {
      const first = right.shift()!;
      right.push(first);
    }

    this.rightItems = right;
    this.matchedLinks = [];
    this.phase = 'pick_left';
    this.leftCursor = 0;
    this.rightCursor = 0;
    this.selectedLeft = null;
    this.feedbackTimer = 0;
    this.feedbackElapsed = 0;
    this.wrongFlash = null;
    this.statusHint = '';
    this.statusHintTimer = 0;
  }

  private getLeftRect(idx: number) {
    const lay = this.getLayout();
    return {
      x: lay.leftX,
      y: Math.round(lay.cardStartY + idx * lay.cardStep),
      w: lay.cardW,
      h: lay.cardH,
    };
  }

  private getRightRect(idx: number) {
    const lay = this.getLayout();
    return {
      x: lay.rightX,
      y: Math.round(lay.cardStartY + idx * lay.cardStep),
      w: lay.cardW,
      h: lay.cardH,
    };
  }

  private nextUnmatched(items: PairCardItem[], start: number, dir: 1 | -1): number {
    for (let step = 1; step <= items.length; step++) {
      const idx = (start + dir * step + items.length) % items.length;
      if (!items[idx].matched) return idx;
    }
    return start;
  }

  private firstUnmatched(items: PairCardItem[]): number {
    const idx = items.findIndex((it) => !it.matched);
    return idx >= 0 ? idx : 0;
  }

  private spawnMatchBurst(x: number, y: number, color: string, count = 12): void {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.3,
      maxLife: 0.3,
      size: 16,
      color,
      shape: 'ring',
    });
    for (let i = 0; i < count; i++) {
      const a = (i * Math.PI * 2) / count + Math.random() * 0.3;
      const spd = 28 + Math.random() * 48;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 8,
        life: 0.38 + Math.random() * 0.24,
        maxLife: 0.62,
        size: 3.6,
        color: i % 3 === 0 ? '#ffffff' : color,
        gravity: 55,
        shape: i % 2 === 0 ? 'star' : 'circle',
      });
    }
  }

  private attemptMatch(leftIdx: number, rightIdx: number): void {
    const left = this.leftItems[leftIdx];
    const right = this.rightItems[rightIdx];
    if (!left || !right || left.matched || right.matched) return;

    if (left.pairId === right.pairId) {
      left.matched = true;
      right.matched = true;
      const color = LINK_COLORS[this.matchedLinks.length % LINK_COLORS.length];
      this.matchedLinks.push({ leftIdx, rightIdx, color });

      const lr = this.getLeftRect(leftIdx);
      const rr = this.getRightRect(rightIdx);
      const midX = MG_W / 2;
      const midY = (lr.y + lr.h / 2 + rr.y + rr.h / 2) / 2;
      this.spawnMatchBurst(midX, midY, color, 14);

      this.selectedLeft = null;
      this.phase = 'pick_left';
      this.wrongFlash = null;

      if (this.matchedLinks.length >= this.leftItems.length) {
        soundEngine.playHitPerfect();
        this.spawnMatchBurst(MG_W / 2, 134, '#ffe066', 18);
        this.feedbackTimer = 2.8;
        this.feedbackElapsed = 0;
        return;
      }

      soundEngine.playHitGood();
      this.leftCursor = this.firstUnmatched(this.leftItems);
      this.rightCursor = this.firstUnmatched(this.rightItems);
    } else {
      const round = this.rounds[this.roundIndex];
      const correctRightText = round.pairs[left.pairId]?.right ?? '';
      if (correctRightText) {
        this.mistakes = this.mistakes.filter(
          (m) => !(m.kind === 'pair_match' && m.leftText === left.text)
        );
        this.mistakes.unshift({
          kind: 'pair_match',
          leftText: left.text,
          wrongRightText: right.text,
          correctRightText,
        });
      }

      this.lives = Math.max(0, this.lives - 1);
      this.shakeTimer = 0.36;
      this.wrongFlash = { leftIdx, rightIdx, timer: 0.7 };
      this.selectedLeft = null;
      this.phase = 'pick_left';
      soundEngine.playHitMiss();

      if (this.lives <= 0) {
        this.result = 'lost';
        return;
      }

      this.statusHint = 'Association incorrecte — réessayez !';
      this.statusHintTimer = 1.8;
      this.leftCursor = this.firstUnmatched(this.leftItems);
    }
  }

  private advanceAfterRound(): void {
    this.feedbackTimer = 0;
    this.feedbackElapsed = 0;
    if (this.roundIndex + 1 >= this.rounds.length) {
      this.result = 'won';
      return;
    }
    this.roundIndex++;
    this.loadRound(this.roundIndex);
  }

  update(dt: number, input: InputManager): void {
    if (this.result !== 'playing') return;
    this.elapsed += dt;

    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    if (this.statusHintTimer > 0) this.statusHintTimer = Math.max(0, this.statusHintTimer - dt);
    if (this.wrongFlash) {
      this.wrongFlash.timer -= dt;
      if (this.wrongFlash.timer <= 0) this.wrongFlash = null;
    }

    updateMgParticles(this.particles, dt);

    if (this.feedbackTimer > 0) {
      this.feedbackTimer -= dt;
      this.feedbackElapsed += dt;
      const tap = input.consumeTap();
      const skip = this.feedbackElapsed >= 0.45 && (input.justPressed('a') || tap !== null);
      if (this.feedbackTimer <= 0 || skip) {
        this.advanceAfterRound();
      }
      return;
    }

    // Mouse / Touch interaction
    const tap = input.consumeTap();
    if (tap) {
      for (let i = 0; i < this.leftItems.length; i++) {
        const lr = this.getLeftRect(i);
        if (
          !this.leftItems[i].matched &&
          tap.x >= lr.x &&
          tap.x <= lr.x + lr.w &&
          tap.y >= lr.y &&
          tap.y <= lr.y + lr.h
        ) {
          this.leftCursor = i;
          if (this.selectedLeft === i) {
            this.selectedLeft = null;
            this.phase = 'pick_left';
            soundEngine.playCancel();
          } else {
            this.selectedLeft = i;
            this.phase = 'pick_right';
            this.rightCursor = this.firstUnmatched(this.rightItems);
            soundEngine.playSelect();
          }
          return;
        }
      }
      for (let j = 0; j < this.rightItems.length; j++) {
        const rr = this.getRightRect(j);
        if (
          !this.rightItems[j].matched &&
          tap.x >= rr.x &&
          tap.x <= rr.x + rr.w &&
          tap.y >= rr.y &&
          tap.y <= rr.y + rr.h
        ) {
          this.rightCursor = j;
          if (this.selectedLeft !== null) {
            this.attemptMatch(this.selectedLeft, j);
          } else {
            this.statusHint = 'Sélectionnez d’abord une carte à gauche !';
            this.statusHintTimer = 1.6;
            soundEngine.playSelect();
          }
          return;
        }
      }
    }

    // Keyboard controls
    if (this.phase === 'pick_left') {
      if (this.leftItems[this.leftCursor]?.matched) {
        this.leftCursor = this.firstUnmatched(this.leftItems);
      }
      if (input.justPressed('up')) {
        this.leftCursor = this.nextUnmatched(this.leftItems, this.leftCursor, -1);
        soundEngine.playSelect();
      } else if (input.justPressed('down')) {
        this.leftCursor = this.nextUnmatched(this.leftItems, this.leftCursor, 1);
        soundEngine.playSelect();
      } else if (input.justPressed('a') || input.justPressed('right')) {
        if (!this.leftItems[this.leftCursor]?.matched) {
          this.selectedLeft = this.leftCursor;
          this.phase = 'pick_right';
          this.rightCursor = this.firstUnmatched(this.rightItems);
          soundEngine.playSelect();
        }
      }
    } else {
      if (this.rightItems[this.rightCursor]?.matched) {
        this.rightCursor = this.firstUnmatched(this.rightItems);
      }
      if (input.justPressed('up')) {
        this.rightCursor = this.nextUnmatched(this.rightItems, this.rightCursor, -1);
        soundEngine.playSelect();
      } else if (input.justPressed('down')) {
        this.rightCursor = this.nextUnmatched(this.rightItems, this.rightCursor, 1);
        soundEngine.playSelect();
      } else if (input.justPressed('left') || input.justPressed('b')) {
        this.selectedLeft = null;
        this.phase = 'pick_left';
        soundEngine.playCancel();
      } else if (input.justPressed('a')) {
        if (this.selectedLeft !== null && !this.rightItems[this.rightCursor]?.matched) {
          this.attemptMatch(this.selectedLeft, this.rightCursor);
        }
      }
    }
  }

  private drawBezierLink(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    preview = false
  ): void {
    const cx1 = x1 + 24;
    const cx2 = x2 - 24;

    ctx.save();
    if (preview) {
      const alpha = 0.45 + 0.25 * Math.sin(this.elapsed * 8);
      ctx.strokeStyle = `rgba(255, 224, 102, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(cx1, y1, cx2, y2, x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Soft outer glow
      ctx.globalAlpha = 0.26;
      ctx.strokeStyle = color;
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(cx1, y1, cx2, y2, x2, y2);
      ctx.stroke();

      // Crisp inner ribbon
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(cx1, y1, cx2, y2, x2, y2);
      ctx.stroke();

      // Anchor nodes
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x1, y1, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x2, y2, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pal = getReflectionThemePalette(this.cfg.themeStyle);
    const round = this.rounds[this.roundIndex];
    const lay = this.getLayout();
    const shakeX = this.shakeTimer > 0 ? Math.round(Math.sin(this.shakeTimer * 65) * 3) : 0;

    ctx.save();

    // Thematic stage backdrop
    drawReflectionStageBackdrop(ctx, this.cfg.themeStyle, this.elapsed);

    // Prompt Card + Hearts pill
    drawPanelBox(ctx, 12 + shakeX, lay.promptY, MG_W - 24, lay.promptH, pal.promptBg, pal.accent);

    const heartsW = Math.max(46, this.cfg.lives * 13 + 8);
    const heartsH = Math.min(18, lay.promptH - 4);
    const heartsX = MG_W - 17 - heartsW + shakeX;
    const heartsY = lay.promptY + Math.round((lay.promptH - heartsH) / 2);

    ctx.fillStyle = pal.promptInk;
    drawFittedWrappedText(
      ctx,
      round.prompt,
      19 + shakeX,
      lay.promptY + 2.5,
      MG_W - 40 - heartsW,
      lay.promptH - 5,
      {
        preferredSize: lay.promptH <= 26 ? 8.0 : 8.5,
        minSize: 6.4,
        weight: 'bold',
        lineHeightRatio: 1.18,
        verticalCenter: true,
      }
    );

    ctx.fillStyle = 'rgba(18, 22, 38, 0.88)';
    drawRoundRectPath(ctx, heartsX, heartsY, heartsW, heartsH, 4);
    ctx.fill();
    drawHearts(ctx, heartsX + 5, heartsY + Math.round((heartsH - 11) / 2), this.lives, this.cfg.lives);

    // Draw matched Bezier ribbons in the center channel!
    for (const link of this.matchedLinks) {
      const lr = this.getLeftRect(link.leftIdx);
      const rr = this.getRightRect(link.rightIdx);
      this.drawBezierLink(
        ctx,
        lr.x + lr.w + shakeX,
        lr.y + lr.h / 2,
        rr.x + shakeX,
        rr.y + rr.h / 2,
        link.color,
        false
      );
    }

    // Active preview curve while picking the right-side partner
    if (this.phase === 'pick_right' && this.selectedLeft !== null && this.feedbackTimer <= 0) {
      const lr = this.getLeftRect(this.selectedLeft);
      const rr = this.getRightRect(this.rightCursor);
      this.drawBezierLink(
        ctx,
        lr.x + lr.w + shakeX,
        lr.y + lr.h / 2,
        rr.x + shakeX,
        rr.y + rr.h / 2,
        '#ffe066',
        true
      );
    }

    // Render Left Column Cards (4 to 6 items)
    for (let i = 0; i < this.leftItems.length; i++) {
      const item = this.leftItems[i];
      const r = this.getLeftRect(i);
      const rx = r.x + shakeX;
      const isSelected = this.selectedLeft === i;
      const isCursor =
        this.phase === 'pick_left' &&
        this.leftCursor === i &&
        !item.matched &&
        this.feedbackTimer <= 0;
      const isWrong = this.wrongFlash?.leftIdx === i;
      const linkColor = this.matchedLinks.find((l) => l.leftIdx === i)?.color;

      const bg = item.matched
        ? '#1d5a3b'
        : isWrong
          ? '#7a2333'
          : isSelected
            ? '#544118'
            : isCursor
              ? pal.cardSelectedBg
              : pal.cardBg;
      const border = item.matched
        ? (linkColor ?? '#66f28d')
        : isWrong
          ? '#ff7584'
          : isSelected
            ? '#ffe066'
            : isCursor
              ? '#ffd24c'
              : pal.cardBorder;

      drawPanelBox(ctx, rx, r.y, r.w, r.h, bg, border);

      // Anchor dot on right edge of left card
      ctx.fillStyle = item.matched
        ? (linkColor ?? '#66f28d')
        : isSelected
          ? '#ffe066'
          : '#52628f';
      ctx.beginPath();
      ctx.arc(rx + r.w - 4, r.y + r.h / 2, 2.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = item.matched ? '#e8ffef' : isSelected ? '#fff7cc' : '#f4f7ff';
      drawFittedWrappedText(
        ctx,
        item.text,
        rx + (r.w - 8) / 2 + 2,
        r.y + 2,
        r.w - 16,
        r.h - 4,
        {
          preferredSize: lay.cardFont,
          minSize: 5.8,
          weight: '600',
          lineHeightRatio: 1.18,
          align: 'center',
          verticalCenter: true,
        }
      );
    }

    // Render Right Column Cards (4 to 6 items)
    for (let j = 0; j < this.rightItems.length; j++) {
      const item = this.rightItems[j];
      const r = this.getRightRect(j);
      const rx = r.x + shakeX;
      const isCursor =
        this.phase === 'pick_right' &&
        this.rightCursor === j &&
        !item.matched &&
        this.feedbackTimer <= 0;
      const isWrong = this.wrongFlash?.rightIdx === j;
      const linkColor = this.matchedLinks.find((l) => l.rightIdx === j)?.color;

      const bg = item.matched
        ? '#1d5a3b'
        : isWrong
          ? '#7a2333'
          : isCursor
            ? pal.cardSelectedBg
            : pal.cardBg;
      const border = item.matched
        ? (linkColor ?? '#66f28d')
        : isWrong
          ? '#ff7584'
          : isCursor
            ? '#ffe066'
            : pal.cardBorder;

      drawPanelBox(ctx, rx, r.y, r.w, r.h, bg, border);

      // Anchor dot on left edge of right card
      ctx.fillStyle = item.matched
        ? (linkColor ?? '#66f28d')
        : isCursor
          ? '#ffe066'
          : '#52628f';
      ctx.beginPath();
      ctx.arc(rx + 4, r.y + r.h / 2, 2.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = item.matched ? '#e8ffef' : isCursor ? '#fff7cc' : '#f4f7ff';
      drawFittedWrappedText(
        ctx,
        item.text,
        rx + (r.w + 8) / 2 - 2,
        r.y + 2,
        r.w - 16,
        r.h - 4,
        {
          preferredSize: lay.cardFont,
          minSize: 5.8,
          weight: '600',
          lineHeightRatio: 1.18,
          align: 'center',
          verticalCenter: true,
        }
      );
    }

    // Footer guidance line
    if (this.statusHintTimer > 0 && this.statusHint) {
      ctx.fillStyle = '#ff9aa5';
      drawFittedSingleLine(ctx, this.statusHint, MG_W / 2, 232.5, MG_W - 20, {
        preferredSize: 7.3,
        minSize: 6.0,
        weight: 'bold',
        family: 'sans-serif',
        align: 'center',
        baseline: 'middle',
      });
    } else {
      ctx.fillStyle = 'rgba(225, 232, 250, 0.78)';
      ctx.font = 'bold 6.9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        formatFrenchText(
          this.phase === 'pick_right'
            ? 'Choisissez la correspondance à droite (← / B pour annuler)'
            : '↑↓ Choisir à gauche  •  A / → / Clic pour relier les paires'
        ),
        MG_W / 2,
        232.5
      );
    }

    // Sparkle particles
    drawMgParticles(ctx, this.particles);

    // Round Cleared Celebration & Explanation Modal
    if (this.feedbackTimer > 0) {
      const modalY = 66;
      const modalH = 132;

      ctx.fillStyle = 'rgba(10, 14, 28, 0.95)';
      drawRoundRectPath(ctx, 18, modalY, MG_W - 36, modalH, 7);
      ctx.fill();
      ctx.strokeStyle = '#66f28d';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#66f28d';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('★ TOUTES LES PAIRES RELIÉES ! ★', MG_W / 2, modalY + 9);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.fillRect(34, modalY + 26, MG_W - 68, 1);

      ctx.fillStyle = '#f4f7ff';
      drawFittedWrappedText(ctx, round.explanation, 30, modalY + 33, MG_W - 60, modalH - 54, {
        preferredSize: 8.5,
        minSize: 6.4,
        weight: '600',
        lineHeightRatio: 1.32,
      });

      if (this.feedbackElapsed >= 0.45) {
        const pAlpha = 0.6 + 0.4 * Math.sin(this.elapsed * 7);
        ctx.fillStyle = `rgba(255, 224, 102, ${pAlpha})`;
        ctx.font = 'bold 7.8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(
          this.roundIndex + 1 >= this.rounds.length
            ? '▶ [A / Clic] Terminer le défi'
            : '▶ [A / Clic] Manche suivante',
          MG_W / 2,
          modalY + modalH - 6
        );
      }
    }

    // Calm Untimed Top HUD
    const progress =
      (this.roundIndex + this.matchedLinks.length / Math.max(1, this.leftItems.length)) /
      Math.max(1, this.rounds.length);
    drawMiniGameHud(
      ctx,
      this.cfg.title,
      0,
      `Manche ${this.roundIndex + 1}/${this.rounds.length}  •  Paires ${this.matchedLinks.length}/${this.leftItems.length}`,
      progress,
      pal.accent
    );

    ctx.restore();
  }

  getResult(): 'playing' | 'won' | 'lost' {
    return this.result;
  }
}
