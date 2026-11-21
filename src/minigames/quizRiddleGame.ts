import { soundEngine } from '../audio/soundEngine';
import { InputManager } from '../engine/input';
import { drawPortrait } from '../engine/pixelRenderer';
import {
  FamilyMember,
  NpcEntity,
  QuizChallengeConfig,
  ReflectionTheme,
  RiddleChallengeConfig,
} from '../types';
import {
  drawFittedSingleLine,
  drawFittedWrappedText,
  drawMgParticles,
  drawMiniGameHud,
  drawPanelBox,
  drawReflectionStageBackdrop,
  drawRoundRectPath,
  drawStarPath,
  formatFrenchText,
  getReflectionThemePalette,
  inferReflectionTheme,
  MG_W,
  MgParticle,
  MiniGameInstance,
  updateMgParticles,
} from './common';

interface BattleProjectile {
  fromX: number;
  toX: number;
  y: number;
  age: number;
  duration: number;
  color: string;
  coreColor: string;
  impacted: boolean;
  targetSide: 'enemy' | 'player';
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;
const CLUE_COLORS = ['#3b6ea5', '#b85c2e', '#7a3b8c'] as const;

const RIGHT_CALLOUTS = [
  'EXCELLENT !',
  'SUPER EFFICACE !',
  'BIEN VU !',
  'QUELLE CULTURE !',
];

export class QuizRiddleGame implements MiniGameInstance {
  private elapsed = 0;
  private index = 0;
  private cursor = 0;
  private playerHp: number;
  private enemyHp: number;
  private displayPlayerHp: number;
  private displayEnemyHp: number;
  private pauseTimer = 0;
  private pauseElapsed = 0;
  private feedback = '';
  private feedbackSub = '';
  private feedbackExplanation = '';
  private feedbackColor = '#fff';
  private lastChoiceIdx: number | null = null;
  private lastCorrectIdx = 0;
  private enemyShake = 0;
  private playerShake = 0;
  private screenShake = 0;
  private impactFlash = 0;
  private impactSide: 'enemy' | 'player' | null = null;
  private projectile: BattleProjectile | null = null;
  private particles: MgParticle[] = [];
  private hitStreak = 0;
  private result: 'playing' | 'won' | 'lost' = 'playing';
  private theme: ReflectionTheme;

  constructor(
    private cfg: QuizChallengeConfig | RiddleChallengeConfig,
    private leader: FamilyMember,
    private challenger: NpcEntity
  ) {
    this.playerHp = cfg.playerHp;
    this.enemyHp = cfg.enemyHp;
    this.displayPlayerHp = cfg.playerHp;
    this.displayEnemyHp = cfg.enemyHp;
    this.theme = inferReflectionTheme(challenger, cfg.themeStyle);
  }

  private getTotalItems(): number {
    return this.cfg.kind === 'quiz'
      ? this.cfg.questions.length
      : this.cfg.riddles.length;
  }

  private spawnImpactBurst(x: number, y: number, color: string): void {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.32,
      maxLife: 0.32,
      size: 20,
      color,
      shape: 'ring',
    });
    for (let i = 0; i < 14; i++) {
      const a = (i * Math.PI * 2) / 14 + Math.random() * 0.3;
      const spd = 48 + Math.random() * 68;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 0.34 + Math.random() * 0.2,
        maxLife: 0.54,
        size: 4.5,
        color: i % 3 === 0 ? '#ffffff' : color,
        gravity: 90,
        shape: i % 2 === 0 ? 'star' : 'circle',
      });
    }
  }

  private finishFeedbackBeat(): void {
    this.pauseTimer = 0;
    this.pauseElapsed = 0;
    this.feedback = '';
    this.feedbackSub = '';
    this.feedbackExplanation = '';
    this.lastChoiceIdx = null;
    if (this.enemyHp <= 0) {
      this.result = 'won';
      return;
    }
    if (this.playerHp <= 0) {
      this.result = 'lost';
      return;
    }
    this.index = (this.index + 1) % this.getTotalItems();
    this.cursor = 0;
  }

  update(dt: number, input: InputManager): void {
    if (this.result !== 'playing') return;
    this.elapsed += dt;

    // Smoothly animate HP bars toward real HP
    const hpSpeed = dt * 3.8;
    if (this.displayPlayerHp > this.playerHp) {
      this.displayPlayerHp = Math.max(this.playerHp, this.displayPlayerHp - hpSpeed);
    }
    if (this.displayEnemyHp > this.enemyHp) {
      this.displayEnemyHp = Math.max(this.enemyHp, this.displayEnemyHp - hpSpeed);
    }

    if (this.enemyShake > 0) this.enemyShake = Math.max(0, this.enemyShake - dt);
    if (this.playerShake > 0) this.playerShake = Math.max(0, this.playerShake - dt);
    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt);
    if (this.impactFlash > 0) this.impactFlash = Math.max(0, this.impactFlash - dt);

    // Update flying energy projectile
    if (this.projectile) {
      this.projectile.age += dt;
      const p = Math.min(1, this.projectile.age / this.projectile.duration);
      const curX = this.projectile.fromX + (this.projectile.toX - this.projectile.fromX) * p;
      const arcY = this.projectile.y - Math.sin(p * Math.PI) * 14;

      if (!this.projectile.impacted && Math.random() < 0.7) {
        this.particles.push({
          x: curX,
          y: arcY,
          vx: (Math.random() - 0.5) * 18,
          vy: (Math.random() - 0.5) * 18,
          life: 0.18,
          maxLife: 0.18,
          size: 3,
          color: this.projectile.color,
          shape: 'circle',
        });
      }

      if (p >= 1 && !this.projectile.impacted) {
        this.projectile.impacted = true;
        this.impactFlash = 0.22;
        this.impactSide = this.projectile.targetSide;
        this.screenShake = 0.16;
        this.spawnImpactBurst(this.projectile.toX, this.projectile.y, this.projectile.color);
        if (this.projectile.targetSide === 'enemy') {
          this.enemyShake = 0.4;
        } else {
          this.playerShake = 0.4;
        }
      }
      if (this.projectile.age >= this.projectile.duration + 0.12) {
        this.projectile = null;
      }
    }

    updateMgParticles(this.particles, dt);

    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      this.pauseElapsed += dt;
      const tap = input.consumeTap();
      const canSkip = this.pauseElapsed >= 0.4 && (input.justPressed('a') || tap !== null);
      if (this.pauseTimer <= 0 || canSkip) {
        this.finishFeedbackBeat();
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
      const boxes = this.getOptionRects();
      for (let i = 0; i < 4; i++) {
        const b = boxes[i];
        if (tap.x >= b.x && tap.x <= b.x + b.w && tap.y >= b.y && tap.y <= b.y + b.h) {
          this.cursor = i;
          this.resolveAnswer(i);
          return;
        }
      }
    }

    if (input.justPressed('a')) {
      this.resolveAnswer(this.cursor);
    }
  }

  private resolveAnswer(choiceIdx: number): void {
    const item =
      this.cfg.kind === 'quiz'
        ? this.cfg.questions[this.index]
        : this.cfg.riddles[this.index];
    const correctIdx = item.correctIndex;
    const explanation = item.explanation?.trim() ?? '';

    this.lastChoiceIdx = choiceIdx;
    this.lastCorrectIdx = correctIdx;
    this.feedbackExplanation = explanation;

    if (choiceIdx === correctIdx) {
      this.enemyHp = Math.max(0, this.enemyHp - 1);
      this.hitStreak++;
      this.enemyShake = 0.42;
      soundEngine.playBossHit();
      this.projectile = {
        fromX: 46,
        toX: MG_W - 32,
        y: 50,
        age: 0,
        duration: 0.24,
        color: '#66f28d',
        coreColor: '#fff6b8',
        impacted: false,
        targetSide: 'enemy',
      };
      this.feedback =
        this.enemyHp <= 0
          ? 'C’EST GAGNÉ !'
          : RIGHT_CALLOUTS[(this.hitStreak - 1) % RIGHT_CALLOUTS.length];
      this.feedbackSub =
        this.enemyHp <= 0
          ? `${this.challenger.name} s’incline avec panache !`
          : `${this.challenger.name} perd 1 PV !`;
      this.feedbackColor = '#66f28d';
    } else {
      this.playerHp = Math.max(0, this.playerHp - 1);
      this.hitStreak = 0;
      this.playerShake = 0.42;
      soundEngine.playHitMiss();
      this.projectile = {
        fromX: MG_W - 46,
        toX: 30,
        y: 50,
        age: 0,
        duration: 0.24,
        color: '#ff5e6c',
        coreColor: '#ffd6a5',
        impacted: false,
        targetSide: 'player',
      };
      this.feedback = 'PAS TOUT À FAIT !';
      this.feedbackSub = `Bonne réponse : ${item.options[correctIdx]}`;
      this.feedbackColor = '#ff7b89';
    }

    this.pauseElapsed = 0;
    this.pauseTimer = explanation ? 2.5 : 1.7;
  }

  private getOptionRects() {
    return [
      { x: 10, y: 162, w: 178, h: 33 },
      { x: 196, y: 162, w: 178, h: 33 },
      { x: 10, y: 199, w: 178, h: 33 },
      { x: 196, y: 199, w: 178, h: 33 },
    ];
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pal = getReflectionThemePalette(this.theme);
    const shakeX = this.screenShake > 0 ? Math.round(Math.sin(this.screenShake * 90) * 2.5) : 0;

    ctx.save();

    // Rich themed stage backdrop!
    drawReflectionStageBackdrop(ctx, this.theme, this.elapsed);

    // Subtle frosted battle stage header strip behind portraits
    ctx.fillStyle = 'rgba(10, 12, 22, 0.48)';
    ctx.fillRect(0, 26, MG_W, 46);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, 71, MG_W, 1);

    // Pokémon-style Duel Portrait Arena
    const pOff = this.playerShake > 0 ? Math.round(Math.sin(this.playerShake * 55) * 3.5) : 0;
    const eOff = this.enemyShake > 0 ? Math.round(Math.sin(this.enemyShake * 55) * 3.5) : 0;

    // Player frame & portrait
    ctx.fillStyle = '#0d1120';
    ctx.fillRect(10 + pOff + shakeX, 30, 40, 40);
    ctx.strokeStyle = '#57d978';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(10.5 + pOff + shakeX, 30.5, 39, 39);
    drawPortrait(
      ctx,
      this.leader.appearance,
      this.leader.portrait,
      12 + pOff + shakeX,
      32,
      36,
      this.leader.customPortraitUrl
    );
    if (this.impactFlash > 0 && this.impactSide === 'player') {
      ctx.fillStyle = 'rgba(255, 110, 110, 0.55)';
      ctx.fillRect(12 + pOff + shakeX, 32, 36, 36);
    }

    this.drawHpBar(
      ctx,
      54 + shakeX,
      33,
      118,
      this.leader.name,
      this.playerHp,
      this.displayPlayerHp,
      this.cfg.playerHp,
      '#57d978'
    );

    // Center glowing VS medallion
    const vsPulse = 0.78 + 0.22 * Math.sin(this.elapsed * 4.5);
    ctx.fillStyle = `rgba(255, 224, 102, ${0.18 * vsPulse})`;
    ctx.beginPath();
    ctx.arc(MG_W / 2 + shakeX, 49, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 9.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', MG_W / 2 + shakeX, 49.5);

    // Enemy frame & portrait
    ctx.fillStyle = '#0d1120';
    ctx.fillRect(MG_W - 50 + eOff + shakeX, 30, 40, 40);
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(MG_W - 49.5 + eOff + shakeX, 30.5, 39, 39);
    drawPortrait(
      ctx,
      this.challenger.appearance,
      this.challenger.portrait,
      MG_W - 48 + eOff + shakeX,
      32,
      36,
      this.challenger.customPortraitUrl
    );
    if (this.impactFlash > 0 && this.impactSide === 'enemy') {
      ctx.fillStyle = 'rgba(255, 255, 210, 0.65)';
      ctx.fillRect(MG_W - 48 + eOff + shakeX, 32, 36, 36);
    }

    this.drawHpBar(
      ctx,
      MG_W - 172 + shakeX,
      33,
      118,
      this.challenger.name,
      this.enemyHp,
      this.displayEnemyHp,
      this.cfg.enemyHp,
      '#ff6b6b'
    );

    // Flying glowing attack orb projectile
    if (this.projectile && !this.projectile.impacted) {
      const p = Math.min(1, this.projectile.age / this.projectile.duration);
      const px = this.projectile.fromX + (this.projectile.toX - this.projectile.fromX) * p;
      const py = this.projectile.y - Math.sin(p * Math.PI) * 14;
      ctx.fillStyle = this.projectile.color;
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this.projectile.coreColor;
      drawStarPath(ctx, px, py, 6, 2.6, 5, this.elapsed * 14);
      ctx.fill();
    }

    // Question / Riddle Card
    drawPanelBox(ctx, 10 + shakeX, 75, MG_W - 20, 82, pal.promptBg, pal.accent);

    if (this.cfg.kind === 'quiz') {
      const q = this.cfg.questions[this.index];
      // Small Q badge pill in top-left of card
      ctx.fillStyle = '#243259';
      drawRoundRectPath(ctx, 17 + shakeX, 80, 46, 13, 3);
      ctx.fill();
      ctx.fillStyle = '#ffe27a';
      ctx.font = 'bold 7.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Q ${this.index + 1}/${this.cfg.questions.length}`, 40 + shakeX, 86.5);

      ctx.fillStyle = pal.promptInk;
      drawFittedWrappedText(ctx, q.question, 18 + shakeX, 96, MG_W - 38, 56, {
        preferredSize: 9.0,
        minSize: 6.6,
        weight: '600',
        lineHeightRatio: 1.32,
      });
    } else {
      // Riddle: 3 distinct numbered parchment clue strips
      const r = this.cfg.riddles[this.index];
      const stripY = 80;
      const stripH = 23;
      for (let i = 0; i < 3; i++) {
        const sy = stripY + i * (stripH + 1);
        ctx.fillStyle = i % 2 === 0 ? '#efe8d5' : '#e6ddc6';
        drawRoundRectPath(ctx, 16 + shakeX, sy, MG_W - 32, stripH, 3);
        ctx.fill();

        ctx.fillStyle = CLUE_COLORS[i];
        ctx.beginPath();
        ctx.arc(25 + shakeX, sy + stripH / 2, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}`, 25 + shakeX, sy + stripH / 2 + 0.5);

        ctx.fillStyle = '#1c2233';
        drawFittedWrappedText(ctx, r.clues[i], 36 + shakeX, sy + 1.5, MG_W - 56, stripH - 3, {
          preferredSize: 7.9,
          minSize: 6.0,
          weight: '600',
          lineHeightRatio: 1.18,
          verticalCenter: true,
        });
      }
    }

    // 4 Tactile Option Cards
    const opts =
      this.cfg.kind === 'quiz'
        ? this.cfg.questions[this.index].options
        : this.cfg.riddles[this.index].options;
    const rects = this.getOptionRects();
    for (let i = 0; i < 4; i++) {
      const r = rects[i];
      const rx = r.x + shakeX;
      const selected = i === this.cursor;
      const inReveal = this.pauseTimer > 0 && this.lastChoiceIdx !== null;
      const isCorrectReveal = inReveal && i === this.lastCorrectIdx;
      const isWrongReveal = inReveal && i === this.lastChoiceIdx && i !== this.lastCorrectIdx;

      const cardBg = isCorrectReveal
        ? '#1f6e3f'
        : isWrongReveal
          ? '#7d2230'
          : selected
            ? pal.cardSelectedBg
            : pal.cardBg;
      const cardBorder = isCorrectReveal
        ? '#66f28d'
        : isWrongReveal
          ? '#ff7070'
          : selected
            ? '#ffd24c'
            : pal.cardBorder;

      drawPanelBox(ctx, rx, r.y, r.w, r.h, cardBg, cardBorder);

      // A / B / C / D badge circle
      ctx.fillStyle = isCorrectReveal
        ? '#66f28d'
        : isWrongReveal
          ? '#ff7070'
          : selected
            ? '#ffd24c'
            : '#2e3a5c';
      ctx.beginPath();
      ctx.arc(rx + 13, r.y + r.h / 2, 7.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = selected || isCorrectReveal || isWrongReveal ? '#141826' : '#cfd8f5';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(OPTION_LETTERS[i], rx + 13, r.y + r.h / 2 + 0.5);

      ctx.fillStyle = selected || isCorrectReveal ? '#fff7d6' : '#eef2fa';
      drawFittedWrappedText(ctx, opts[i], rx + 25, r.y + 3, r.w - 31, r.h - 6, {
        preferredSize: 8.2,
        minSize: 6.1,
        weight: '600',
        lineHeightRatio: 1.2,
        verticalCenter: true,
      });
    }

    // Impact particles
    drawMgParticles(ctx, this.particles);

    // Crisp Commentary & Cultural Explanation Overlay (leaves option cards visible!)
    if (this.feedback) {
      const hasExpl = this.feedbackExplanation.length > 0;
      const boxY = hasExpl ? 72 : 94;
      const boxH = hasExpl ? 86 : 46;

      ctx.fillStyle = 'rgba(11, 15, 29, 0.96)';
      drawRoundRectPath(ctx, 14, boxY, MG_W - 28, boxH, 6);
      ctx.fill();
      ctx.strokeStyle = this.feedbackColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = this.feedbackColor;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(formatFrenchText(this.feedback), MG_W / 2, boxY + 6);

      if (this.feedbackSub) {
        ctx.fillStyle = '#ffe58f';
        drawFittedSingleLine(ctx, this.feedbackSub, MG_W / 2, boxY + 23, MG_W - 48, {
          preferredSize: 8.0,
          minSize: 6.2,
          weight: 'bold',
          family: 'sans-serif',
          align: 'center',
          baseline: 'middle',
        });
      }

      if (hasExpl) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.fillRect(28, boxY + 31, MG_W - 56, 1);

        ctx.fillStyle = '#eef2fc';
        drawFittedWrappedText(
          ctx,
          this.feedbackExplanation,
          24,
          boxY + 35,
          MG_W - 48,
          boxH - 47,
          {
            preferredSize: 7.9,
            minSize: 6.1,
            weight: '600',
            lineHeightRatio: 1.26,
          }
        );
      }

      if (this.pauseElapsed >= 0.4) {
        const pulse = 0.55 + 0.45 * Math.sin(this.elapsed * 7);
        ctx.fillStyle = `rgba(180, 200, 235, ${pulse})`;
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('▶ Suite [A / Clic]', MG_W - 22, boxY + boxH - 4);
      }
    }

    // Calm untimed Top HUD (timerSec = 0!)
    const itemLabel =
      this.cfg.kind === 'quiz'
        ? `Question ${this.index + 1}/${this.cfg.questions.length}`
        : `Énigme ${this.index + 1}/${this.cfg.riddles.length}`;
    drawMiniGameHud(
      ctx,
      this.cfg.title,
      0,
      `${itemLabel}  •  PV ${this.enemyHp}/${this.cfg.enemyHp}`,
      (this.cfg.enemyHp - this.enemyHp) / Math.max(1, this.cfg.enemyHp),
      pal.accent
    );

    ctx.restore();
  }

  private drawHpBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    name: string,
    hp: number,
    displayHp: number,
    maxHp: number,
    defaultColor: string
  ): void {
    ctx.fillStyle = 'rgba(12, 16, 30, 0.92)';
    drawRoundRectPath(ctx, x, y, w, 32, 4);
    ctx.fill();
    ctx.strokeStyle = '#52628f';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(name, x + 6, y + 4);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#b9c6e8';
    ctx.font = 'bold 7.5px sans-serif';
    ctx.fillText(`${hp}/${maxHp}`, x + w - 6, y + 4.5);

    const barX = x + 6;
    const barY = y + 17;
    const barW = w - 12;
    const barH = 8;

    ctx.fillStyle = '#222942';
    ctx.fillRect(barX, barY, barW, barH);

    const trailW = Math.round((barW * Math.max(0, displayHp)) / Math.max(1, maxHp));
    if (trailW > 0) {
      ctx.fillStyle = '#ffe066';
      ctx.fillRect(barX, barY, trailW, barH);
    }

    const realRatio = hp / Math.max(1, maxHp);
    const barColor =
      defaultColor === '#57d978'
        ? realRatio <= 0.34
          ? '#ff5e6c'
          : realRatio <= 0.67
            ? '#ffb347'
            : '#57d978'
        : '#ff5e6c';
    const realW = Math.round(barW * Math.max(0, realRatio));
    if (realW > 0) {
      ctx.fillStyle = barColor;
      ctx.fillRect(barX, barY, realW, barH);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fillRect(barX, barY, realW, 2.5);
    }

    ctx.fillStyle = 'rgba(12, 16, 30, 0.55)';
    for (let s = 1; s < maxHp; s++) {
      const sx = barX + Math.round((barW * s) / maxHp);
      ctx.fillRect(sx, barY, 1, barH);
    }
  }

  getResult(): 'playing' | 'won' | 'lost' {
    return this.result;
  }
}
