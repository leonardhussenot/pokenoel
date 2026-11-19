import { soundEngine } from '../audio/soundEngine';
import { InputManager } from '../engine/input';
import { KitchenSortChallengeConfig, SortOrderItem } from '../types';
import { drawHearts, drawMiniGameHud, MG_H, MG_W, MiniGameInstance } from './common';

interface FallingToken {
  lane: 0 | 1 | 2;
  y: number;
  item: SortOrderItem;
  isNeededNext: boolean;
  resolved: boolean;
}

export class KitchenSortGame implements MiniGameInstance {
  private cursorLane: 0 | 1 | 2 = 1;
  private elapsed = 0;
  private ordersDone = 0;
  private orderIndex = 0;
  private stepIndex = 0;
  private lives: number;
  private tokens: FallingToken[] = [];
  private spawnTimer = 0.25;
  private feedback = '';
  private feedbackColor = '#fff';
  private feedbackTimer = 0;
  private result: 'playing' | 'won' | 'lost' = 'playing';

  private readonly catchY = 186;

  constructor(private cfg: KitchenSortChallengeConfig) {
    this.lives = cfg.lives;
  }

  private getCurrentOrder() {
    return this.cfg.orders[this.orderIndex % this.cfg.orders.length];
  }

  update(dt: number, input: InputManager): void {
    if (this.result !== 'playing') return;
    this.elapsed += dt;
    if (this.feedbackTimer > 0) this.feedbackTimer -= dt;

    if (input.justPressed('left') && this.cursorLane > 0) {
      this.cursorLane = (this.cursorLane - 1) as 0 | 1 | 2;
      soundEngine.playSelect();
    } else if (input.justPressed('right') && this.cursorLane < 2) {
      this.cursorLane = (this.cursorLane + 1) as 0 | 1 | 2;
      soundEngine.playSelect();
    }

    const tap = input.consumeTap();
    if (tap && tap.y >= 60) {
      const laneW = 104;
      const startX = Math.floor((MG_W - laneW * 3) / 2);
      const lane = Math.floor((tap.x - startX) / laneW);
      if (lane >= 0 && lane < 3) {
        this.cursorLane = lane as 0 | 1 | 2;
      }
    }

    const order = this.getCurrentOrder();
    const targetItem = order.sequence[this.stepIndex];

    // Spawn tokens
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 0.72;
      const lane = Math.floor(Math.random() * 3) as 0 | 1 | 2;
      const pickTarget = Math.random() < 0.48;
      let chosen: SortOrderItem;
      let needed = false;
      if (pickTarget) {
        chosen = targetItem;
        needed = true;
      } else {
        const pool = [...order.distractors, ...order.sequence.filter((s) => s.label !== targetItem.label)];
        chosen = pool[Math.floor(Math.random() * pool.length)] ?? targetItem;
        needed = chosen.label === targetItem.label;
      }
      this.tokens.push({
        lane,
        y: 66,
        item: chosen,
        isNeededNext: needed,
        resolved: false,
      });
    }

    // Update falling tokens
    for (let i = this.tokens.length - 1; i >= 0; i--) {
      const tok = this.tokens[i];
      tok.y += this.cfg.beltSpeed * dt;

      if (!tok.resolved && Math.abs(tok.y - this.catchY) <= 13 && tok.lane === this.cursorLane) {
        tok.resolved = true;
        this.tokens.splice(i, 1);

        if (tok.item.label === targetItem.label) {
          soundEngine.playHitGood();
          this.stepIndex++;
          this.feedback = `OK : ${tok.item.label} !`;
          this.feedbackColor = '#66f28d';
          this.feedbackTimer = 0.55;

          if (this.stepIndex >= order.sequence.length) {
            this.ordersDone++;
            this.orderIndex++;
            this.stepIndex = 0;
            this.tokens = [];
            soundEngine.playHitPerfect();
            this.feedback = 'SÉRIE VALIDÉE !';
            this.feedbackColor = '#ffe27a';
            this.feedbackTimer = 0.75;
            if (this.ordersDone >= this.cfg.requiredOrders) {
              this.result = 'won';
              return;
            }
          }
        } else {
          this.lives--;
          soundEngine.playHitMiss();
          this.feedback = `PAS ${tok.item.label.toUpperCase()} !`;
          this.feedbackColor = '#ff7070';
          this.feedbackTimer = 0.65;
          if (this.lives <= 0) {
            this.result = 'lost';
            return;
          }
        }
        continue;
      }

      if (tok.y > MG_H + 16) {
        this.tokens.splice(i, 1);
      }
    }

    if (this.elapsed >= this.cfg.durationSec) {
      this.result = this.ordersDone >= this.cfg.requiredOrders ? 'won' : 'lost';
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#1b1d2b';
    ctx.fillRect(0, 0, MG_W, MG_H);

    const rem = Math.max(0, this.cfg.durationSec - this.elapsed);
    drawMiniGameHud(
      ctx,
      this.cfg.title,
      rem,
      `Séries ${this.ordersDone}/${this.cfg.requiredOrders}`,
      this.ordersDone / Math.max(1, this.cfg.requiredOrders),
      '#f48fa8'
    );

    const order = this.getCurrentOrder();
    // Order prompt banner
    ctx.fillStyle = '#25293d';
    ctx.fillRect(8, 30, MG_W - 16, 30);
    ctx.strokeStyle = '#f4c542';
    ctx.strokeRect(8.5, 30.5, MG_W - 17, 29);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(order.prompt, 14, 41);

    // Sequence chips
    let cx = 14;
    for (let i = 0; i < order.sequence.length; i++) {
      const item = order.sequence[i];
      const label = i < this.stepIndex ? `✓ ${item.label}` : i === this.stepIndex ? `▶ ${item.label}` : item.label;
      ctx.font = 'bold 8px sans-serif';
      const w = ctx.measureText(label).width + 10;
      ctx.fillStyle =
        i < this.stepIndex ? '#265c3a' : i === this.stepIndex ? '#f4c542' : '#363d5c';
      ctx.fillRect(cx, 46, w, 11);
      ctx.fillStyle = i === this.stepIndex ? '#171926' : '#ffffff';
      ctx.fillText(label, cx + 5, 54);
      cx += w + 6;
    }

    drawHearts(ctx, MG_W - 56, 34, this.lives, this.cfg.lives);

    // 3 Conveyor Lanes
    const laneW = 104;
    const startX = Math.floor((MG_W - laneW * 3) / 2);
    for (let l = 0; l < 3; l++) {
      const lx = startX + l * laneW;
      ctx.fillStyle = l === this.cursorLane ? '#28304d' : '#1f2338';
      ctx.fillRect(lx + 2, 64, laneW - 4, 152);
    }

    // Catch tray
    const trayX = startX + this.cursorLane * laneW + 6;
    ctx.fillStyle = '#f4c542';
    ctx.fillRect(trayX, this.catchY - 4, laneW - 12, 18);
    ctx.fillStyle = '#171926';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ATTRAPER', trayX + (laneW - 12) / 2, this.catchY + 5);

    // Tokens
    for (const tok of this.tokens) {
      const lx = startX + tok.lane * laneW + 10;
      const w = laneW - 20;
      ctx.fillStyle = '#101320';
      ctx.fillRect(lx - 1, Math.round(tok.y) - 10, w + 2, 20);
      ctx.fillStyle = tok.item.color;
      ctx.fillRect(lx, Math.round(tok.y) - 9, w, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tok.item.label, lx + w / 2, Math.round(tok.y));
    }

    if (this.feedbackTimer > 0 && this.feedback) {
      ctx.fillStyle = 'rgba(12,15,24,0.86)';
      ctx.fillRect(112, 72, 160, 18);
      ctx.fillStyle = this.feedbackColor;
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.feedback, MG_W / 2, 81);
    }

    ctx.fillStyle = '#9aa8d4';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('← / → pour déplacer le plateau sous le bon élément dans l’ordre !', MG_W / 2, 229);
  }

  getResult(): 'playing' | 'won' | 'lost' {
    return this.result;
  }
}
