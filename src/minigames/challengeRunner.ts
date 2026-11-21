import { soundEngine } from '../audio/soundEngine';
import { InputManager } from '../engine/input';
import { drawBadgeIcon, drawPortrait } from '../engine/pixelRenderer';
import {
  BadgeDef,
  ChallengeConfig,
  FamilyMember,
  NpcEntity,
  SingleChallengeConfig,
} from '../types';
import { CategorySortGame } from './categorySortGame';
import {
  drawFittedWrappedText,
  drawPanelBox,
  drawRoundRectPath,
  drawSpotlightBeam,
  drawStarPath,
  drawWrappedText,
  formatFrenchText,
  MG_H,
  MG_W,
  MiniGameInstance,
} from './common';
import { IntruderHuntGame } from './intruderHuntGame';
import { OrderPuzzleGame } from './orderPuzzleGame';
import { PairMatchGame } from './pairMatchGame';
import { QuizRiddleGame } from './quizRiddleGame';

type RunnerPhase =
  | 'vs_splash'
  | 'brief'
  | 'playing'
  | 'boss_intermission'
  | 'won'
  | 'lost';

interface ConfettiBit {
  x: number;
  y: number;
  vy: number;
  vx: number;
  w: number;
  h: number;
  color: string;
  phase: number;
}

const CONFETTI_COLORS = ['#ffe066', '#ff6b8b', '#57e389', '#66c2ff', '#c285ff', '#ff9b42'];

function getKindTag(kind: SingleChallengeConfig['kind']): { label: string; color: string } {
  switch (kind) {
    case 'quiz':
      return { label: '? QUIZ', color: '#2e6bb8' };
    case 'riddle_word':
      return { label: '❖ ÉNIGMES', color: '#8f3b5b' };
    case 'order_puzzle':
      return { label: '⇅ MISE EN ORDRE', color: '#b56c2a' };
    case 'pair_match':
      return { label: '∞ ASSOCIATIONS', color: '#2d7d63' };
    case 'intruder_hunt':
      return { label: '✦ L’INTRUS', color: '#7a3f99' };
    case 'category_sort':
      return { label: '▤ TRI D’EXPERT', color: '#2d6e7e' };
  }
}

function isCalmReflectionKind(kind: SingleChallengeConfig['kind']): boolean {
  return (
    kind === 'quiz' ||
    kind === 'riddle_word' ||
    kind === 'order_puzzle' ||
    kind === 'pair_match' ||
    kind === 'intruder_hunt' ||
    kind === 'category_sort'
  );
}

export class ChallengeRunner {
  private phase: RunnerPhase = 'vs_splash';
  private timer = 0;
  private bossPhaseIdx = 0;
  private currentMini: MiniGameInstance | null = null;
  private loseCursor = 0; // 0 = Réessayer, 1 = Quitter
  private done: 'active' | 'won' | 'aborted' = 'active';
  private isBoss: boolean;
  private confetti: ConfettiBit[] = [];

  constructor(
    private challenger: NpcEntity,
    private badge: BadgeDef,
    private pair: [FamilyMember, FamilyMember],
    private leaderIndex: 0 | 1,
    private config: ChallengeConfig,
    private onAttemptIncrement: () => void
  ) {
    this.isBoss = config.kind === 'boss_gauntlet';
    soundEngine.playBgm(this.isBoss ? 'boss' : 'battle');
    soundEngine.playBossHit();
    this.onAttemptIncrement();
    this.initConfetti();
  }

  private initConfetti(): void {
    this.confetti = Array.from({ length: 34 }, (_, i) => ({
      x: (i * 37 + 11) % MG_W,
      y: -((i * 29) % MG_H),
      vy: 36 + (i % 5) * 14,
      vx: ((i % 3) - 1) * 14,
      w: 4 + (i % 3),
      h: 2.5 + (i % 2),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      phase: i * 0.7,
    }));
  }

  private getLeader(): FamilyMember {
    return this.pair[this.leaderIndex];
  }

  private getActiveSingleConfig(): SingleChallengeConfig {
    if (this.config.kind === 'boss_gauntlet') {
      return this.config.phases[this.bossPhaseIdx].challenge;
    }
    return this.config;
  }

  private instantiateMiniGame(cfg: SingleChallengeConfig): MiniGameInstance {
    switch (cfg.kind) {
      case 'quiz':
      case 'riddle_word':
        return new QuizRiddleGame(cfg, this.getLeader(), this.challenger);
      case 'order_puzzle':
        return new OrderPuzzleGame(cfg);
      case 'pair_match':
        return new PairMatchGame(cfg);
      case 'intruder_hunt':
        return new IntruderHuntGame(cfg);
      case 'category_sort':
        return new CategorySortGame(cfg);
    }
  }

  update(dt: number, input: InputManager): void {
    this.timer += dt;

    if (this.phase === 'vs_splash') {
      const tap = input.consumeTap();
      if (this.timer >= 1.6 || input.justPressed('a') || tap) {
        this.phase = 'brief';
        this.timer = 0;
      }
      return;
    }

    if (this.phase === 'brief') {
      const tap = input.consumeTap();
      if (input.justPressed('a') || tap) {
        soundEngine.playConfirm();
        this.currentMini = this.instantiateMiniGame(this.getActiveSingleConfig());
        this.phase = 'playing';
        this.timer = 0;
      } else if (input.justPressed('b')) {
        soundEngine.playCancel();
        this.done = 'aborted';
      }
      return;
    }

    if (this.phase === 'playing' && this.currentMini) {
      this.currentMini.update(dt, input);
      const res = this.currentMini.getResult();
      if (res === 'won') {
        if (
          this.config.kind === 'boss_gauntlet' &&
          this.bossPhaseIdx < this.config.phases.length - 1
        ) {
          soundEngine.playBossHit();
          this.bossPhaseIdx++;
          this.phase = 'boss_intermission';
          this.timer = 0;
        } else {
          soundEngine.playBadgeFanfare();
          this.phase = 'won';
          this.timer = 0;
        }
      } else if (res === 'lost') {
        soundEngine.playDefeat();
        this.phase = 'lost';
        this.loseCursor = 0;
        this.timer = 0;
      }
      return;
    }

    if (this.phase === 'boss_intermission') {
      const tap = input.consumeTap();
      if (input.justPressed('a') || tap) {
        soundEngine.playConfirm();
        this.currentMini = this.instantiateMiniGame(this.getActiveSingleConfig());
        this.phase = 'playing';
        this.timer = 0;
      }
      return;
    }

    if (this.phase === 'won') {
      for (const c of this.confetti) {
        c.y += c.vy * dt;
        c.x += (c.vx + Math.sin(this.timer * 3 + c.phase) * 14) * dt;
        if (c.y > MG_H + 8) {
          c.y = -6;
          c.x = ((c.x % MG_W) + MG_W) % MG_W;
        }
      }
      const tap = input.consumeTap();
      if (this.timer >= 0.6 && (input.justPressed('a') || input.justPressed('b') || tap)) {
        soundEngine.playConfirm();
        this.done = 'won';
      }
      return;
    }

    if (this.phase === 'lost') {
      if (
        input.justPressed('left') ||
        input.justPressed('right') ||
        input.justPressed('up') ||
        input.justPressed('down')
      ) {
        this.loseCursor = this.loseCursor === 0 ? 1 : 0;
        soundEngine.playSelect();
      }
      const tap = input.consumeTap();
      if (tap) {
        if (tap.x < MG_W / 2 && tap.y > 165) {
          this.retry();
        } else if (tap.x >= MG_W / 2 && tap.y > 165) {
          this.done = 'aborted';
        }
        return;
      }
      if (input.justPressed('a')) {
        if (this.loseCursor === 0) {
          this.retry();
        } else {
          soundEngine.playCancel();
          this.done = 'aborted';
        }
      } else if (input.justPressed('b')) {
        soundEngine.playCancel();
        this.done = 'aborted';
      }
    }
  }

  private retry(): void {
    soundEngine.playConfirm();
    this.onAttemptIncrement();
    this.bossPhaseIdx = 0;
    this.currentMini = this.instantiateMiniGame(this.getActiveSingleConfig());
    this.phase = 'playing';
    this.timer = 0;
  }

  private drawBossGems(ctx: CanvasRenderingContext2D, startX: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const gx = startX + i * 24;
      const active = i >= this.bossPhaseIdx;
      const pulse = active ? 0.5 + 0.5 * Math.sin(this.timer * 5 + i) : 0;

      if (active) {
        ctx.fillStyle = `rgba(255, 84, 112, ${0.24 + pulse * 0.22})`;
        ctx.beginPath();
        ctx.arc(gx + 8, y + 6, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      // Faceted diamond gem
      ctx.fillStyle = active ? '#ff3b5c' : '#2f354d';
      ctx.beginPath();
      ctx.moveTo(gx + 8, y);
      ctx.lineTo(gx + 16, y + 6);
      ctx.lineTo(gx + 8, y + 12);
      ctx.lineTo(gx, y + 6);
      ctx.fill();

      ctx.strokeStyle = active ? '#ffe27a' : '#4a5270';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (active) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(gx + 6, y + 3, 2.5, 2.5);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.phase === 'playing' && this.currentMini) {
      this.currentMini.render(ctx);
      return;
    }

    if (this.phase === 'vs_splash') {
      // Dramatic Electric VS Splash!
      const bg = ctx.createLinearGradient(0, 0, MG_W, MG_H);
      bg.addColorStop(0, this.isBoss ? '#1f0814' : '#0b122b');
      bg.addColorStop(1, this.isBoss ? '#330c1e' : '#16254f');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, MG_W, MG_H);

      // Animated diagonal/horizontal electric speedlines!
      for (let i = 0; i < 16; i++) {
        const y = 60 + ((i * 7.4) % 118);
        const speed = 260 + (i % 4) * 90;
        const len = 40 + (i % 5) * 18;
        const x = ((this.timer * speed + i * 73) % (MG_W + len)) - len;
        ctx.fillStyle =
          i % 3 === 0 ? 'rgba(255, 232, 130, 0.28)' : 'rgba(255, 255, 255, 0.14)';
        ctx.fillRect(x, y, len, 1.5);
      }

      // Dual-tone central clash band
      const bandGrad = ctx.createLinearGradient(0, 58, MG_W, 180);
      bandGrad.addColorStop(0, '#1e428f');
      bandGrad.addColorStop(0.5, this.isBoss ? '#8f1932' : '#2d3b78');
      bandGrad.addColorStop(1, this.isBoss ? '#5e1024' : '#6e2845');
      ctx.fillStyle = bandGrad;
      ctx.fillRect(0, 60, MG_W, 118);

      // Diagonal lightning divider slash in middle
      ctx.fillStyle = 'rgba(255, 224, 102, 0.25)';
      ctx.beginPath();
      ctx.moveTo(MG_W / 2 + 24, 60);
      ctx.lineTo(MG_W / 2 + 34, 60);
      ctx.lineTo(MG_W / 2 - 24, 178);
      ctx.lineTo(MG_W / 2 - 34, 178);
      ctx.fill();

      // Glowing golden top & bottom band borders
      ctx.fillStyle = '#ffe066';
      ctx.fillRect(0, 58, MG_W, 3);
      ctx.fillRect(0, 177, MG_W, 3);

      // Smooth ease-out slide for portraits
      const rawSlide = Math.min(1, this.timer * 3.4);
      const slide = 1 - Math.pow(1 - rawSlide, 3);
      const leftX = Math.round(-68 + slide * 94);
      const rightX = Math.round(MG_W + 20 - slide * 116);

      // Crisp golden portrait frames for duo
      ctx.fillStyle = '#0e1326';
      ctx.fillRect(leftX - 2, 80, 52, 52);
      ctx.strokeStyle = '#66c2ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(leftX - 1.5, 80.5, 51, 51);
      drawPortrait(
        ctx,
        this.pair[0].appearance,
        this.pair[0].portrait,
        leftX,
        82,
        48,
        this.pair[0].customPortraitUrl
      );

      ctx.fillStyle = '#0e1326';
      ctx.fillRect(leftX + 54, 90, 44, 44);
      ctx.strokeStyle = '#66c2ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(leftX + 54.5, 90.5, 43, 43);
      drawPortrait(
        ctx,
        this.pair[1].appearance,
        this.pair[1].portrait,
        leftX + 56,
        92,
        40,
        this.pair[1].customPortraitUrl
      );

      // Duo nameplate
      ctx.fillStyle = 'rgba(10, 14, 28, 0.85)';
      drawRoundRectPath(ctx, leftX - 2, 138, 100, 15, 3);
      ctx.fill();
      ctx.fillStyle = '#d8ebff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${this.pair[0].name} & ${this.pair[1].name}`, leftX + 48, 145.5);

      // Crisp framed Challenger portrait
      ctx.fillStyle = '#0e1326';
      ctx.fillRect(rightX - 3, 76, 62, 62);
      ctx.strokeStyle = this.isBoss ? '#ffd94d' : '#ff7b8a';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(rightX - 2.5, 76.5, 61, 61);
      drawPortrait(
        ctx,
        this.challenger.appearance,
        this.challenger.portrait,
        rightX,
        79,
        56,
        this.challenger.customPortraitUrl
      );

      ctx.fillStyle = 'rgba(10, 14, 28, 0.85)';
      drawRoundRectPath(ctx, rightX - 18, 142, 92, 15, 3);
      ctx.fill();
      ctx.fillStyle = '#ffe58f';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText(this.challenger.name, rightX + 28, 149.5);

      // Pulsing electric VS medallion in center!
      const vsPulse = 1 + Math.sin(this.timer * 14) * 0.08;
      ctx.fillStyle = 'rgba(255, 224, 102, 0.28)';
      ctx.beginPath();
      ctx.arc(MG_W / 2, 118, Math.round(24 * vsPulse), 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#14192e';
      ctx.beginPath();
      ctx.arc(MG_W / 2, 118, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Radiating tiny star sparks around VS
      for (let k = 0; k < 4; k++) {
        const a = this.timer * 4 + (k * Math.PI) / 2;
        ctx.fillStyle = '#fff5b8';
        drawStarPath(ctx, MG_W / 2 + Math.cos(a) * 26, 118 + Math.sin(a) * 26, 4, 1.5, 4, a);
        ctx.fill();
      }

      ctx.fillStyle = '#ffe27a';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VS', MG_W / 2, 119);

      // Top Header Banner
      ctx.fillStyle = this.isBoss ? '#ffd94d' : '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(
        this.isBoss
          ? `★ BOSS FINAL : ${this.challenger.name.toUpperCase()} ★`
          : `DÉFI : ${this.challenger.name.toUpperCase()}`,
        MG_W / 2,
        30
      );

      // Bottom Badge Preview Pill
      ctx.fillStyle = 'rgba(18, 24, 46, 0.92)';
      drawRoundRectPath(ctx, 84, 192, 216, 34, 6);
      ctx.fill();
      ctx.strokeStyle = this.badge.rimColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      drawBadgeIcon(ctx, this.badge, true, 94, 199, 1);
      ctx.fillStyle = '#9aa8d4';
      ctx.font = 'bold 7.5px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('ENJEU DU DÉFI :', 124, 203);
      ctx.fillStyle = '#ffe58f';
      ctx.font = 'bold 9.5px sans-serif';
      ctx.fillText(this.badge.name, 124, 216);
      return;
    }

    if (this.phase === 'brief' || this.phase === 'boss_intermission') {
      const bg = ctx.createLinearGradient(0, 0, 0, MG_H);
      bg.addColorStop(0, this.isBoss ? '#240c18' : '#12182e');
      bg.addColorStop(1, '#0e1222');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, MG_W, MG_H);

      // Subtle overhead spotlight glow
      drawSpotlightBeam(
        ctx,
        MG_W / 2,
        0,
        MG_W / 2,
        180,
        30,
        170,
        this.isBoss ? 'rgba(255, 110, 120, 0.14)' : 'rgba(120, 180, 255, 0.12)'
      );

      const cfg = this.getActiveSingleConfig();
      const kindTag = getKindTag(cfg.kind);
      const boxTitle =
        this.config.kind === 'boss_gauntlet'
          ? `Phase ${this.bossPhaseIdx + 1}/3 — ${this.config.phases[this.bossPhaseIdx].phaseTitle}`
          : cfg.title;

      // Framed Challenger portrait
      ctx.fillStyle = '#0d101d';
      ctx.fillRect(14, 14, 52, 52);
      ctx.strokeStyle = this.isBoss ? '#ffd94d' : '#f4c542';
      ctx.lineWidth = 2;
      ctx.strokeRect(14.5, 14.5, 51, 51);
      drawPortrait(
        ctx,
        this.challenger.appearance,
        this.challenger.portrait,
        16,
        16,
        48,
        this.challenger.customPortraitUrl
      );

      ctx.fillStyle = '#ffe27a';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(this.challenger.name, 76, 22);

      // Badge preview in top right
      drawBadgeIcon(ctx, this.badge, true, MG_W - 38, 24, 1);

      if (this.config.kind === 'boss_gauntlet') {
        this.drawBossGems(ctx, 76, 43);
        if (isCalmReflectionKind(cfg.kind)) {
          ctx.fillStyle = 'rgba(255, 226, 122, 0.16)';
          drawRoundRectPath(ctx, 156, 42, 92, 15, 4);
          ctx.fill();
          ctx.fillStyle = '#ffe58f';
          ctx.font = 'bold 7px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✦ Réflexion • Sans chrono', 202, 49.5);
        }
      } else {
        // Challenge kind pill tag under name
        ctx.fillStyle = kindTag.color;
        drawRoundRectPath(ctx, 76, 42, 96, 15, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(kindTag.label, 124, 49.5);

        if (isCalmReflectionKind(cfg.kind)) {
          ctx.fillStyle = 'rgba(255, 226, 122, 0.16)';
          drawRoundRectPath(ctx, 178, 42, 92, 15, 4);
          ctx.fill();
          ctx.fillStyle = '#ffe58f';
          ctx.font = 'bold 7px sans-serif';
          ctx.fillText('✦ Sans chrono', 224, 49.5);
        }
      }

      // Clean inviting briefing parchment card
      drawPanelBox(ctx, 14, 74, MG_W - 28, 118, '#f8f4ea', this.isBoss ? '#d93848' : '#3a548c');

      ctx.fillStyle = '#182038';
      ctx.font = 'bold 10.5px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(boxTitle, 26, 84);

      // Kind tag in card corner for boss phases
      if (this.config.kind === 'boss_gauntlet') {
        ctx.fillStyle = kindTag.color;
        drawRoundRectPath(ctx, MG_W - 114, 82, 90, 14, 3);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(kindTag.label, MG_W - 69, 89);
      }

      ctx.fillStyle = 'rgba(40, 54, 94, 0.16)';
      ctx.fillRect(26, 100, MG_W - 52, 1);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = '9px sans-serif';
      let nextY = 107;
      if (this.phase === 'boss_intermission' && this.config.kind === 'boss_gauntlet') {
        ctx.fillStyle = '#8f1f36';
        ctx.font = 'bold 8.5px sans-serif';
        nextY = drawWrappedText(
          ctx,
          `« ${this.config.phases[this.bossPhaseIdx].taunt} »`,
          26,
          nextY,
          MG_W - 52,
          12
        );
        nextY += 5;
      }
      ctx.fillStyle = '#242c44';
      drawFittedWrappedText(ctx, cfg.instructions, 26, nextY, MG_W - 52, Math.max(28, 186 - nextY), {
        preferredSize: 9.0,
        minSize: 6.8,
        weight: '600',
        lineHeightRatio: 1.35,
      });

      // Pulsing Start CTA button pill
      const pulse = 0.85 + 0.15 * Math.sin(this.timer * 6);
      ctx.fillStyle = `rgba(47, 158, 88, ${pulse})`;
      drawRoundRectPath(ctx, 88, 202, 208, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#9ef5b8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatFrenchText('▶ [Espace / A] Commencer le défi !'), MG_W / 2, 214.5);
      return;
    }

    if (this.phase === 'won') {
      // Joyful Victory Celebration with Rotating Golden Sunburst & Animated Confetti!
      const bg = ctx.createLinearGradient(0, 0, 0, MG_H);
      bg.addColorStop(0, '#13203d');
      bg.addColorStop(0.55, '#1d2d52');
      bg.addColorStop(1, '#10182b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, MG_W, MG_H);

      // Rotating golden sunburst rays radiating behind the earned badge!
      const sunX = MG_W / 2;
      const sunY = 78;
      const rays = 12;
      for (let i = 0; i < rays; i++) {
        const a1 = this.timer * 0.45 + (i * Math.PI * 2) / rays;
        const a2 = a1 + Math.PI / rays;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 224, 102, 0.12)' : 'rgba(255, 244, 180, 0.05)';
        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        ctx.lineTo(sunX + Math.cos(a1) * 230, sunY + Math.sin(a1) * 230);
        ctx.lineTo(sunX + Math.cos(a2) * 230, sunY + Math.sin(a2) * 230);
        ctx.fill();
      }

      drawPanelBox(ctx, 18, 16, MG_W - 36, MG_H - 32, 'rgba(22, 32, 58, 0.88)', '#f4c542');

      // Victory header ribbon
      ctx.fillStyle = '#ffe27a';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(
        this.isBoss ? '★ BOSS FINAL VAINCU ! ★' : '★ VICTOIRE ! BADGE OBTENU ! ★',
        MG_W / 2,
        26
      );

      // Duo celebrating on left & right of the badge!
      const cheerBob = Math.round(Math.abs(Math.sin(this.timer * 6)) * 3);
      drawPortrait(
        ctx,
        this.pair[0].appearance,
        this.pair[0].portrait,
        36,
        54 - cheerBob,
        38,
        this.pair[0].customPortraitUrl
      );
      drawPortrait(
        ctx,
        this.pair[1].appearance,
        this.pair[1].portrait,
        MG_W - 74,
        54 - cheerBob,
        38,
        this.pair[1].customPortraitUrl
      );

      // Glowing aura & bobbing earned badge icon!
      const badgeBob = Math.round(Math.sin(this.timer * 4.5) * 3);
      ctx.fillStyle = 'rgba(255, 224, 102, 0.25)';
      ctx.beginPath();
      ctx.arc(MG_W / 2, 74 + badgeBob, 26, 0, Math.PI * 2);
      ctx.fill();
      drawBadgeIcon(ctx, this.badge, true, MG_W / 2 - 20, 54 + badgeBob, 2);

      // Orbiting golden sparkles around badge
      for (let s = 0; s < 5; s++) {
        const sa = this.timer * 2.6 + (s * Math.PI * 2) / 5;
        ctx.fillStyle = s % 2 === 0 ? '#fff6bd' : '#79f59d';
        drawStarPath(
          ctx,
          MG_W / 2 + Math.cos(sa) * 30,
          74 + badgeBob + Math.sin(sa) * 18,
          4.2,
          1.8,
          4,
          sa * 2
        );
        ctx.fill();
      }

      // Badge Name Pill
      ctx.fillStyle = '#2a3a66';
      drawRoundRectPath(ctx, 102, 104, 180, 18, 5);
      ctx.fill();
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.badge.name, MG_W / 2, 113.5);

      // Congratulatory quote
      ctx.fillStyle = '#dde6fa';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const msg =
        this.challenger.winLines?.[0] ??
        `Bravo ${this.pair[0].name} et ${this.pair[1].name} ! Vous méritez ce badge.`;
      drawWrappedText(ctx, `« ${msg} »`, 36, 132, MG_W - 72, 12);

      // Shimmering falling confetti on top!
      for (const c of this.confetti) {
        ctx.fillStyle = c.color;
        ctx.fillRect(c.x, c.y, c.w, c.h);
      }

      // Pulsing continue prompt
      const alpha = 0.65 + 0.35 * Math.sin(this.timer * 6);
      ctx.fillStyle = `rgba(121, 245, 157, ${alpha})`;
      ctx.font = 'bold 9.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('[Espace / A] Continuer l’aventure', MG_W / 2, 202);
      return;
    }

    if (this.phase === 'lost') {
      // Witty, Punchy Defeat Screen
      const bg = ctx.createLinearGradient(0, 0, 0, MG_H);
      bg.addColorStop(0, '#241322');
      bg.addColorStop(1, '#140c18');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, MG_W, MG_H);

      // Subtle diagonal mood stripes
      ctx.fillStyle = 'rgba(255, 84, 104, 0.05)';
      for (let x = -40; x < MG_W + 40; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 12, 0);
        ctx.lineTo(x - 36, MG_H);
        ctx.lineTo(x - 48, MG_H);
        ctx.fill();
      }

      drawPanelBox(ctx, 20, 20, MG_W - 40, 198, '#23182e', '#e05365');

      // Animated challenger reaction (gentle cheeky bob!)
      const bob = Math.round(Math.sin(this.timer * 4) * 2);
      ctx.fillStyle = '#120d1a';
      ctx.fillRect(34, 36 + bob, 52, 52);
      ctx.strokeStyle = '#ff8090';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(34.5, 36.5 + bob, 51, 51);
      drawPortrait(
        ctx,
        this.challenger.appearance,
        this.challenger.portrait,
        36,
        38 + bob,
        48,
        this.challenger.customPortraitUrl
      );

      // Cheeky speech icon above portrait
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.arc(84, 38 + bob, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1224';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', 84, 38.5 + bob);

      ctx.fillStyle = '#ff8c9b';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('DÉFI MANQUÉ — PRESQUE !', 98, 38);

      // Speech card for challenger's witty taunt
      ctx.fillStyle = 'rgba(14, 10, 24, 0.65)';
      drawRoundRectPath(ctx, 98, 58, MG_W - 134, 88, 5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 148, 160, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#f5effa';
      ctx.font = '9px sans-serif';
      const taunt =
        this.challenger.loseLines?.[0] ??
        'Presque ! Prenez une grande respiration et retentez votre chance.';
      drawWrappedText(ctx, `« ${taunt} »`, 106, 68, MG_W - 150, 12.5);

      ctx.fillStyle = '#b4a8cc';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText(`— ${this.challenger.name}`, 106, 128);

      // Two crisp tactile buttons: Réessayer / Quitter (keep y=166 so tap y > 165 matches!)
      const btnY = 166;
      const pulse = 0.75 + 0.25 * Math.sin(this.timer * 7);

      if (this.loseCursor === 0) {
        ctx.fillStyle = `rgba(102, 242, 141, ${0.22 * pulse})`;
        drawRoundRectPath(ctx, 48, btnY - 3, 134, 36, 7);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255, 107, 122, ${0.22 * pulse})`;
        drawRoundRectPath(ctx, 202, btnY - 3, 134, 36, 7);
        ctx.fill();
      }

      drawPanelBox(
        ctx,
        52,
        btnY,
        126,
        30,
        this.loseCursor === 0 ? '#2b8a4e' : '#2a2238',
        this.loseCursor === 0 ? '#ffe066' : '#585070'
      );
      drawPanelBox(
        ctx,
        206,
        btnY,
        126,
        30,
        this.loseCursor === 1 ? '#993044' : '#2a2238',
        this.loseCursor === 1 ? '#ffe066' : '#585070'
      );

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.loseCursor === 0 ? '▶ Réessayer' : 'Réessayer', 115, btnY + 15);
      ctx.fillText(this.loseCursor === 1 ? '▶ Quitter' : 'Quitter', 269, btnY + 15);
    }
  }

  getStatus(): 'active' | 'won' | 'aborted' {
    return this.done;
  }
}
