import { soundEngine } from '../audio/soundEngine';
import { InputManager } from '../engine/input';
import { drawPortrait } from '../engine/pixelRenderer';
import {
  FamilyMember,
  NpcEntity,
  QuizChallengeConfig,
  RiddleChallengeConfig,
} from '../types';
import { drawMiniGameHud, drawPanelBox, drawWrappedText, MG_H, MG_W, MiniGameInstance } from './common';

export class QuizRiddleGame implements MiniGameInstance {
  private index = 0;
  private cursor = 0;
  private playerHp: number;
  private enemyHp: number;
  private timer: number;
  private pauseTimer = 0;
  private feedback = '';
  private feedbackColor = '#fff';
  private enemyShake = 0;
  private playerShake = 0;
  private result: 'playing' | 'won' | 'lost' = 'playing';

  constructor(
    private cfg: QuizChallengeConfig | RiddleChallengeConfig,
    private leader: FamilyMember,
    private challenger: NpcEntity
  ) {
    this.playerHp = cfg.playerHp;
    this.enemyHp = cfg.enemyHp;
    this.timer =
      cfg.kind === 'quiz' ? cfg.timePerQuestionSec : cfg.timePerRiddleSec;
  }

  private getTotalItems(): number {
    return this.cfg.kind === 'quiz'
      ? this.cfg.questions.length
      : this.cfg.riddles.length;
  }

  update(dt: number, input: InputManager): void {
    if (this.result !== 'playing') return;
    if (this.enemyShake > 0) this.enemyShake = Math.max(0, this.enemyShake - dt);
    if (this.playerShake > 0) this.playerShake = Math.max(0, this.playerShake - dt);

    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      if (this.pauseTimer <= 0) {
        this.feedback = '';
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
        this.timer =
          this.cfg.kind === 'quiz'
            ? this.cfg.timePerQuestionSec
            : this.cfg.timePerRiddleSec;
      }
      return;
    }

    this.timer -= dt;
    if (this.timer <= 0) {
      this.resolveAnswer(-1);
      return;
    }

    if (input.justPressed('up')) {
      this.cursor = (this.cursor + 2) % 4;
      soundEngine.playSelect();
    } else if (input.justPressed('down')) {
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
    const correctIdx =
      this.cfg.kind === 'quiz'
        ? this.cfg.questions[this.index].correctIndex
        : this.cfg.riddles[this.index].correctIndex;

    if (choiceIdx === correctIdx) {
      this.enemyHp = Math.max(0, this.enemyHp - 1);
      this.enemyShake = 0.45;
      soundEngine.playBossHit();
      this.feedback = 'EXCELLENT ! COUP CRITIQUE !';
      this.feedbackColor = '#66f28d';
    } else {
      this.playerHp = Math.max(0, this.playerHp - 1);
      this.playerShake = 0.45;
      soundEngine.playHitMiss();
      const opts =
        this.cfg.kind === 'quiz'
          ? this.cfg.questions[this.index].options
          : this.cfg.riddles[this.index].options;
      this.feedback =
        choiceIdx === -1
          ? `TEMPS ÉCOULÉ ! Réponse : ${opts[correctIdx]}`
          : `RATÉ ! C’était : ${opts[correctIdx]}`;
      this.feedbackColor = '#ff7070';
    }
    this.pauseTimer = 1.05;
  }

  private getOptionRects() {
    return [
      { x: 10, y: 158, w: 178, h: 34 },
      { x: 196, y: 158, w: 178, h: 34 },
      { x: 10, y: 196, w: 178, h: 34 },
      { x: 196, y: 196, w: 178, h: 34 },
    ];
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#141b2e';
    ctx.fillRect(0, 0, MG_W, MG_H);

    drawMiniGameHud(
      ctx,
      this.cfg.title,
      this.timer,
      `Adversaire PV ${this.enemyHp}/${this.cfg.enemyHp}`,
      (this.cfg.enemyHp - this.enemyHp) / Math.max(1, this.cfg.enemyHp),
      '#66c2ff'
    );

    // Pokémon Battle Portrait Arena
    const pOff = this.playerShake > 0 ? Math.round(Math.sin(this.playerShake * 50) * 4) : 0;
    const eOff = this.enemyShake > 0 ? Math.round(Math.sin(this.enemyShake * 50) * 4) : 0;

    // Player mini box
    drawPortrait(
      ctx,
      this.leader.appearance,
      this.leader.portrait,
      12 + pOff,
      32,
      36,
      this.leader.customPortraitUrl
    );
    this.drawHpBar(ctx, 54, 34, 118, this.leader.name, this.playerHp, this.cfg.playerHp, '#57d978');

    // Enemy mini box
    drawPortrait(ctx, this.challenger.appearance, this.challenger.portrait, MG_W - 48 + eOff, 32, 36);
    this.drawHpBar(
      ctx,
      MG_W - 172,
      34,
      118,
      this.challenger.name,
      this.enemyHp,
      this.cfg.enemyHp,
      '#ff6b6b'
    );

    // Question / Riddle Panel
    drawPanelBox(ctx, 10, 74, MG_W - 20, 78, '#f7f4eb', '#2a3659');
    ctx.fillStyle = '#181e30';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    if (this.cfg.kind === 'quiz') {
      const q = this.cfg.questions[this.index];
      ctx.font = 'bold 9px sans-serif';
      drawWrappedText(ctx, q.question, 18, 82, MG_W - 38, 13);
    } else {
      const r = this.cfg.riddles[this.index];
      ctx.font = 'bold 8px sans-serif';
      let y = 80;
      for (let i = 0; i < 3; i++) {
        y = drawWrappedText(ctx, `Indice ${i + 1} : ${r.clues[i]}`, 18, y, MG_W - 38, 11);
      }
    }

    // 4 Options
    const opts =
      this.cfg.kind === 'quiz'
        ? this.cfg.questions[this.index].options
        : this.cfg.riddles[this.index].options;
    const rects = this.getOptionRects();
    for (let i = 0; i < 4; i++) {
      const r = rects[i];
      const selected = i === this.cursor;
      drawPanelBox(
        ctx,
        r.x,
        r.y,
        r.w,
        r.h,
        selected ? '#2c3d69' : '#1b2238',
        selected ? '#f4c542' : '#4a5882'
      );
      ctx.fillStyle = selected ? '#ffe680' : '#f2f4fa';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const prefix = selected ? '▶ ' : '  ';
      drawWrappedText(ctx, `${prefix}${opts[i]}`, r.x + 6, r.y + 6, r.w - 12, 10);
    }

    if (this.feedback) {
      ctx.fillStyle = 'rgba(12,15,24,0.92)';
      ctx.fillRect(24, 106, MG_W - 48, 28);
      ctx.strokeStyle = this.feedbackColor;
      ctx.strokeRect(24.5, 106.5, MG_W - 49, 27);
      ctx.fillStyle = this.feedbackColor;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.feedback, MG_W / 2, 120);
    }
  }

  private drawHpBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    name: string,
    hp: number,
    maxHp: number,
    color: string
  ): void {
    ctx.fillStyle = '#0e1220';
    ctx.fillRect(x, y, w, 30);
    ctx.strokeStyle = '#586796';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 29);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(name, x + 5, y + 4);

    ctx.fillStyle = '#252c45';
    ctx.fillRect(x + 5, y + 17, w - 10, 7);
    ctx.fillStyle = color;
    ctx.fillRect(x + 5, y + 17, Math.round(((w - 10) * hp) / Math.max(1, maxHp)), 7);
  }

  getResult(): 'playing' | 'won' | 'lost' {
    return this.result;
  }
}
