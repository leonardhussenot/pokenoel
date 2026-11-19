import { soundEngine } from '../audio/soundEngine';
import { InputManager } from '../engine/input';
import { MemoryPatternChallengeConfig } from '../types';
import { drawHearts, drawMiniGameHud, MG_H, MG_W, MiniGameInstance } from './common';

const PAD_DIRS = ['up', 'left', 'right', 'down'] as const;
const PAD_ARROWS = ['↑', '←', '→', '↓'] as const;

export class MemoryPatternGame implements MiniGameInstance {
  private roundIdx = 0;
  private lives: number;
  private sequence: number[] = [];
  private state: 'showing' | 'input' | 'pause' = 'showing';
  private showIdx = 0;
  private showTimer = 0.5;
  private activePad = -1;
  private inputIdx = 0;
  private banner = 'OBSERVEZ LA SÉQUENCE...';
  private bannerColor = '#ffe27a';
  private result: 'playing' | 'won' | 'lost' = 'playing';

  constructor(private cfg: MemoryPatternChallengeConfig) {
    this.lives = cfg.lives;
    this.startRound();
  }

  private startRound(): void {
    const len = this.cfg.rounds[this.roundIdx] ?? 4;
    this.sequence = Array.from({ length: len }, () => Math.floor(Math.random() * 4));
    this.state = 'showing';
    this.showIdx = -1;
    this.showTimer = 0.5;
    this.activePad = -1;
    this.inputIdx = 0;
    this.banner = `MANCHE ${this.roundIdx + 1}/${this.cfg.rounds.length} : OBSERVEZ !`;
    this.bannerColor = '#ffe27a';
  }

  update(dt: number, input: InputManager): void {
    if (this.result !== 'playing') return;

    if (this.state === 'showing') {
      this.showTimer -= dt;
      if (this.showTimer <= 0) {
        if (this.activePad !== -1) {
          this.activePad = -1;
          this.showTimer = 0.14;
        } else {
          this.showIdx++;
          if (this.showIdx >= this.sequence.length) {
            this.state = 'input';
            this.banner = 'À VOUS DE REPRODUIRE !';
            this.bannerColor = '#7cc4ff';
          } else {
            const pad = this.sequence[this.showIdx];
            this.activePad = pad;
            this.showTimer = this.cfg.playbackMs / 1000;
            soundEngine.playNote(this.cfg.padNotes[pad], 0.18);
          }
        }
      }
      return;
    }

    if (this.state === 'pause') {
      this.showTimer -= dt;
      if (this.showTimer <= 0) {
        this.activePad = -1;
        this.startRound();
      }
      return;
    }

    // Input state
    let chosenPad = -1;
    for (let i = 0; i < 4; i++) {
      if (input.justPressed(PAD_DIRS[i])) {
        chosenPad = i;
        break;
      }
    }

    const tap = input.consumeTap();
    if (tap) {
      const rects = this.getPadRects();
      for (let i = 0; i < 4; i++) {
        const r = rects[i];
        if (tap.x >= r.x && tap.x <= r.x + r.w && tap.y >= r.y && tap.y <= r.y + r.h) {
          chosenPad = i;
          break;
        }
      }
    }

    if (chosenPad === -1) return;
    this.activePad = chosenPad;
    const expected = this.sequence[this.inputIdx];

    if (chosenPad === expected) {
      soundEngine.playNote(this.cfg.padNotes[chosenPad], 0.16);
      this.inputIdx++;
      if (this.inputIdx >= this.sequence.length) {
        this.roundIdx++;
        if (this.roundIdx >= this.cfg.rounds.length) {
          soundEngine.playHitPerfect();
          this.result = 'won';
          return;
        }
        this.state = 'pause';
        this.showTimer = 0.8;
        this.banner = 'PARFAIT ! MANCHE SUIVANTE...';
        this.bannerColor = '#66f28d';
        soundEngine.playHitGood();
      }
    } else {
      this.lives--;
      soundEngine.playHitMiss();
      if (this.lives <= 0) {
        this.result = 'lost';
        return;
      }
      this.state = 'pause';
      this.showTimer = 0.9;
      this.banner = 'ERREUR ! OBSERVEZ À NOUVEAU...';
      this.bannerColor = '#ff7070';
    }
  }

  private getPadRects() {
    // Diamond layout matching Up, Left, Right, Down!
    return [
      { x: 132, y: 48, w: 120, h: 42 }, // 0: up
      { x: 48, y: 98, w: 120, h: 42 }, // 1: left
      { x: 216, y: 98, w: 120, h: 42 }, // 2: right
      { x: 132, y: 148, w: 120, h: 42 }, // 3: down
    ];
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#15192b';
    ctx.fillRect(0, 0, MG_W, MG_H);

    drawMiniGameHud(
      ctx,
      this.cfg.title,
      0,
      `Séquence ${this.roundIdx + 1}/${this.cfg.rounds.length}`,
      this.roundIdx / Math.max(1, this.cfg.rounds.length),
      '#b37eff'
    );

    drawHearts(ctx, 10, 32, this.lives, this.cfg.lives);

    ctx.fillStyle = this.bannerColor;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.banner, MG_W / 2 + 16, 40);

    const rects = this.getPadRects();
    for (let i = 0; i < 4; i++) {
      const r = rects[i];
      const lit = this.activePad === i;
      ctx.fillStyle = lit ? '#ffffff' : this.cfg.padColors[i];
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = lit ? '#ffe27a' : '#0f1220';
      ctx.lineWidth = lit ? 3 : 2;
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      ctx.fillStyle = lit ? '#151828' : '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${PAD_ARROWS[i]} ${this.cfg.padLabels[i]}`, r.x + r.w / 2, r.y + r.h / 2);
    }

    ctx.fillStyle = '#9aa8d4';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Progression : ${this.state === 'input' ? this.inputIdx : 0}/${this.sequence.length}  •  Flèches ou touchez les pavés`,
      MG_W / 2,
      224
    );
  }

  getResult(): 'playing' | 'won' | 'lost' {
    return this.result;
  }
}
