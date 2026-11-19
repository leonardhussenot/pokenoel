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
import { BalanceMeterGame } from './balanceMeterGame';
import { drawPanelBox, drawWrappedText, MG_H, MG_W, MiniGameInstance } from './common';
import { DodgeCollectGame } from './dodgeCollectGame';
import { KitchenSortGame } from './kitchenSortGame';
import { MemoryPatternGame } from './memoryPatternGame';
import { QuizRiddleGame } from './quizRiddleGame';
import { ReactionDuelGame } from './reactionDuelGame';
import { RhythmGame } from './rhythmGame';
import { TimingShotGame } from './timingShotGame';
import { ViewfinderGame } from './viewfinderGame';

type RunnerPhase =
  | 'vs_splash'
  | 'brief'
  | 'playing'
  | 'boss_intermission'
  | 'won'
  | 'lost';

export class ChallengeRunner {
  private phase: RunnerPhase = 'vs_splash';
  private timer = 0;
  private bossPhaseIdx = 0;
  private currentMini: MiniGameInstance | null = null;
  private loseCursor = 0; // 0 = Réessayer, 1 = Quitter
  private done: 'active' | 'won' | 'aborted' = 'active';
  private isBoss: boolean;

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
      case 'rhythm':
        return new RhythmGame(cfg);
      case 'dodge_collect':
        return new DodgeCollectGame(cfg);
      case 'timing_shot':
        return new TimingShotGame(cfg);
      case 'viewfinder':
        return new ViewfinderGame(cfg);
      case 'reaction_duel':
        return new ReactionDuelGame(cfg);
      case 'kitchen_sort':
        return new KitchenSortGame(cfg);
      case 'balance_meter':
        return new BalanceMeterGame(cfg);
      case 'memory_pattern':
        return new MemoryPatternGame(cfg);
      case 'quiz':
      case 'riddle_word':
        return new QuizRiddleGame(cfg, this.getLeader(), this.challenger);
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
      const tap = input.consumeTap();
      if (this.timer >= 0.6 && (input.justPressed('a') || input.justPressed('b') || tap)) {
        soundEngine.playConfirm();
        this.done = 'won';
      }
      return;
    }

    if (this.phase === 'lost') {
      if (input.justPressed('left') || input.justPressed('right') || input.justPressed('up') || input.justPressed('down')) {
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

  render(ctx: CanvasRenderingContext2D): void {
    if (this.phase === 'playing' && this.currentMini) {
      this.currentMini.render(ctx);
      return;
    }

    if (this.phase === 'vs_splash') {
      ctx.fillStyle = '#0f1324';
      ctx.fillRect(0, 0, MG_W, MG_H);
      // Diagonal battle slash
      ctx.fillStyle = this.isBoss ? '#801c31' : '#25448c';
      ctx.fillRect(0, 62, MG_W, 116);
      ctx.fillStyle = '#f4c542';
      ctx.fillRect(0, 60, MG_W, 3);
      ctx.fillRect(0, 177, MG_W, 3);

      const slide = Math.min(1, this.timer * 3.5);
      const leftX = Math.round(-60 + slide * 94);
      const rightX = Math.round(MG_W + 12 - slide * 112);

      drawPortrait(
        ctx,
        this.pair[0].appearance,
        this.pair[0].portrait,
        leftX,
        82,
        48,
        this.pair[0].customPortraitUrl
      );
      drawPortrait(
        ctx,
        this.pair[1].appearance,
        this.pair[1].portrait,
        leftX + 52,
        90,
        40,
        this.pair[1].customPortraitUrl
      );
      drawPortrait(ctx, this.challenger.appearance, this.challenger.portrait, rightX, 80, 52);

      ctx.fillStyle = '#ffe27a';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VS', MG_W / 2, 114);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(
        this.isBoss ? `BOSS FINAL : ${this.challenger.name.toUpperCase()}` : this.challenger.name,
        MG_W / 2,
        36
      );
      ctx.fillStyle = '#cfd8f5';
      ctx.font = '9px sans-serif';
      ctx.fillText(`Enjeu : ${this.badge.name}`, MG_W / 2, 206);
      return;
    }

    if (this.phase === 'brief' || this.phase === 'boss_intermission') {
      ctx.fillStyle = '#14192b';
      ctx.fillRect(0, 0, MG_W, MG_H);

      const cfg = this.getActiveSingleConfig();
      const boxTitle =
        this.config.kind === 'boss_gauntlet'
          ? `Phase ${this.bossPhaseIdx + 1}/3 — ${this.config.phases[this.bossPhaseIdx].phaseTitle}`
          : cfg.title;

      drawPortrait(ctx, this.challenger.appearance, this.challenger.portrait, 16, 18, 48);
      ctx.fillStyle = '#ffe27a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(this.challenger.name, 74, 22);
      ctx.fillStyle = '#a8b8e6';
      ctx.font = '9px sans-serif';
      ctx.fillText(this.challenger.title, 74, 37);

      if (this.config.kind === 'boss_gauntlet') {
        // Boss HP Pips
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i >= this.bossPhaseIdx ? '#e03e4d' : '#313852';
          ctx.fillRect(74 + i * 26, 52, 22, 7);
        }
      }

      drawPanelBox(ctx, 16, 76, MG_W - 32, 116, '#f6f3ea', '#28365e');
      ctx.fillStyle = '#1b2238';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(boxTitle, 28, 86);

      ctx.font = '9px sans-serif';
      let nextY = 106;
      if (this.phase === 'boss_intermission' && this.config.kind === 'boss_gauntlet') {
        ctx.fillStyle = '#8d2438';
        nextY = drawWrappedText(
          ctx,
          `« ${this.config.phases[this.bossPhaseIdx].taunt} »`,
          28,
          nextY,
          MG_W - 56,
          12
        );
        nextY += 4;
      }
      ctx.fillStyle = '#242c44';
      drawWrappedText(ctx, cfg.instructions, 28, nextY, MG_W - 56, 13);

      ctx.fillStyle = '#57d978';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[Espace / A] Commencer le défi !', MG_W / 2, 214);
      return;
    }

    if (this.phase === 'won') {
      ctx.fillStyle = '#141d2e';
      ctx.fillRect(0, 0, MG_W, MG_H);
      drawPanelBox(ctx, 22, 22, MG_W - 44, MG_H - 44, '#1c2640', '#f4c542');

      ctx.fillStyle = '#ffe27a';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('VICTOIRE ! BADGE OBTENU !', MG_W / 2, 36);

      drawBadgeIcon(ctx, this.badge, true, MG_W / 2 - 20, 56, 2);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(this.badge.name, MG_W / 2, 104);

      ctx.fillStyle = '#cfd8f5';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      const msg =
        this.challenger.winLines?.[0] ??
        `Bravo ${this.pair[0].name} et ${this.pair[1].name} ! Vous méritez ce badge.`;
      drawWrappedText(ctx, msg, 38, 126, MG_W - 76, 12);

      ctx.fillStyle = '#79f59d';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[Espace / A] Continuer', MG_W / 2, 196);
      return;
    }

    if (this.phase === 'lost') {
      ctx.fillStyle = '#1d1421';
      ctx.fillRect(0, 0, MG_W, MG_H);
      drawPanelBox(ctx, 24, 24, MG_W - 48, 192, '#241b2e', '#e05353');

      drawPortrait(ctx, this.challenger.appearance, this.challenger.portrait, 38, 40, 48);
      ctx.fillStyle = '#ff9494';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('DÉFI MANQUÉ !', 98, 44);

      ctx.fillStyle = '#f2eef7';
      ctx.font = '9px sans-serif';
      const taunt =
        this.challenger.loseLines?.[0] ??
        'Presque ! Prenez une grande respiration et retentez votre chance.';
      drawWrappedText(ctx, taunt, 98, 70, MG_W - 138, 12);

      // Two buttons: Réessayer / Quitter
      const btnY = 166;
      drawPanelBox(
        ctx,
        52,
        btnY,
        126,
        30,
        this.loseCursor === 0 ? '#2f8a4e' : '#2a2438',
        this.loseCursor === 0 ? '#f4c542' : '#585070'
      );
      drawPanelBox(
        ctx,
        206,
        btnY,
        126,
        30,
        this.loseCursor === 1 ? '#993342' : '#2a2438',
        this.loseCursor === 1 ? '#f4c542' : '#585070'
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
