import { soundEngine } from '../audio/soundEngine';
import { InputManager } from '../engine/input';
import { TimingShotChallengeConfig } from '../types';
import { drawMiniGameHud, MG_H, MG_W, MiniGameInstance } from './common';

export class TimingShotGame implements MiniGameInstance {
  private attempt = 1;
  private hits = 0;
  private needle = 0.1; // 0..1
  private needleDir = 1;
  private targetPos = 0.5;
  private targetDir = 1;
  private pauseTimer = 0;
  private banner = '';
  private bannerColor = '#fff';
  private result: 'playing' | 'won' | 'lost' = 'playing';

  // Optional 2nd axis (for dualAxis)
  private stage: 'x' | 'y' = 'x';
  private lockedX = 0.5;

  constructor(private cfg: TimingShotChallengeConfig) {
    this.randomizeTarget();
  }

  private randomizeTarget(): void {
    const half = this.cfg.sweetSpotWidth / 2;
    this.targetPos = half + 0.12 + Math.random() * (0.76 - this.cfg.sweetSpotWidth);
  }

  update(dt: number, input: InputManager): void {
    if (this.result !== 'playing') return;

    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      if (this.pauseTimer <= 0) {
        this.banner = '';
        if (this.hits >= this.cfg.requiredHits) {
          this.result = 'won';
          return;
        }
        const remainingAttempts = this.cfg.totalAttempts - this.attempt;
        if (this.attempt >= this.cfg.totalAttempts || this.hits + remainingAttempts < this.cfg.requiredHits) {
          this.result = this.hits >= this.cfg.requiredHits ? 'won' : 'lost';
          return;
        }
        this.attempt++;
        this.stage = 'x';
        this.randomizeTarget();
      }
      return;
    }

    // Move needle
    this.needle += this.needleDir * this.cfg.needleSpeed * dt;
    if (this.needle >= 1) {
      this.needle = 1;
      this.needleDir = -1;
    } else if (this.needle <= 0) {
      this.needle = 0;
      this.needleDir = 1;
    }

    // Move target if enabled
    if (this.cfg.movingTarget) {
      const half = this.cfg.sweetSpotWidth / 2;
      this.targetPos += this.targetDir * 0.42 * dt;
      if (this.targetPos >= 1 - half) {
        this.targetPos = 1 - half;
        this.targetDir = -1;
      } else if (this.targetPos <= half) {
        this.targetPos = half;
        this.targetDir = 1;
      }
    }

    const tap = input.consumeTap();
    if (input.justPressed('a') || tap) {
      if (this.cfg.dualAxis && this.stage === 'x') {
        this.lockedX = this.needle;
        this.stage = 'y';
        soundEngine.playSelect();
        return;
      }

      const half = this.cfg.sweetSpotWidth / 2;
      const hitMain = Math.abs(this.needle - this.targetPos) <= half;
      const hitDual = !this.cfg.dualAxis || Math.abs(this.lockedX - this.targetPos) <= half * 1.25;

      if (hitMain && hitDual) {
        this.hits++;
        soundEngine.playHitPerfect();
        this.banner = 'EN PLEIN DANS LE MILLE !';
        this.bannerColor = '#66f28d';
      } else {
        soundEngine.playHitMiss();
        this.banner = 'MANQUÉ !';
        this.bannerColor = '#ff7070';
      }
      this.pauseTimer = 0.72;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#141a2b';
    ctx.fillRect(0, 0, MG_W, MG_H);

    drawMiniGameHud(
      ctx,
      this.cfg.title,
      0,
      `Réussis ${this.hits}/${this.cfg.requiredHits} • Essai ${this.attempt}/${this.cfg.totalAttempts}`,
      this.hits / Math.max(1, this.cfg.requiredHits),
      '#f4c542'
    );

    // Visual arena graphic depending on themeStyle
    this.renderThemeScene(ctx);

    // Precision Meter Bar
    const barX = 42;
    const barY = 178;
    const barW = MG_W - 84;
    const barH = 22;

    ctx.fillStyle = '#0d101c';
    ctx.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);
    ctx.fillStyle = '#262d47';
    ctx.fillRect(barX, barY, barW, barH);

    // Sweet spot zone
    const half = this.cfg.sweetSpotWidth / 2;
    const sx = barX + Math.round((this.targetPos - half) * barW);
    const sw = Math.max(10, Math.round(this.cfg.sweetSpotWidth * barW));
    ctx.fillStyle = '#2ca852';
    ctx.fillRect(sx, barY, sw, barH);
    ctx.fillStyle = '#79f59d';
    ctx.fillRect(sx + Math.floor(sw * 0.35), barY, Math.max(4, Math.floor(sw * 0.3)), barH);

    // Needle
    const nx = barX + Math.round(this.needle * barW);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(nx - 2, barY - 4, 4, barH + 8);
    ctx.fillStyle = '#ffd045';
    ctx.fillRect(nx - 1, barY - 2, 2, barH + 4);

    if (this.cfg.dualAxis && this.stage === 'y') {
      const lx = barX + Math.round(this.lockedX * barW);
      ctx.fillStyle = '#7cc4ff';
      ctx.fillRect(lx - 1, barY - 5, 2, barH + 10);
    }

    // Attempt pips
    for (let i = 0; i < this.cfg.totalAttempts; i++) {
      const px = MG_W / 2 - (this.cfg.totalAttempts * 14) / 2 + i * 14;
      ctx.fillStyle = i < this.hits ? '#57d978' : i < this.attempt - 1 ? '#d94848' : '#3a4261';
      ctx.fillRect(px, 212, 10, 10);
    }

    if (this.banner) {
      ctx.fillStyle = 'rgba(12,15,24,0.88)';
      ctx.fillRect(72, 95, 240, 28);
      ctx.strokeStyle = this.bannerColor;
      ctx.strokeRect(72.5, 95.5, 239, 27);
      ctx.fillStyle = this.bannerColor;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.banner, MG_W / 2, 109);
    }

    ctx.fillStyle = '#aab5d9';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      this.cfg.dualAxis
        ? `Appuyez sur Espace/A (${this.stage === 'x' ? '1/2 Direction' : '2/2 Puissance'})`
        : 'Appuyez sur Espace/A ou touchez dans la zone verte !',
      MG_W / 2,
      231
    );
  }

  private renderThemeScene(ctx: CanvasRenderingContext2D): void {
    const cx = MG_W / 2;
    if (this.cfg.themeStyle === 'freekick' || this.cfg.themeStyle === 'duel_pen') {
      // Football goal net
      ctx.fillStyle = '#206b34';
      ctx.fillRect(42, 38, MG_W - 84, 126);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(112, 54, 160, 74);
      // Target bullseye
      const tx = 112 + this.targetPos * 160;
      ctx.fillStyle = '#ff5959';
      ctx.beginPath();
      ctx.arc(tx, 76, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, 144, 9, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.cfg.themeStyle === 'threepoint' || this.cfg.themeStyle === 'buzzer') {
      // Basketball court & backboard
      ctx.fillStyle = '#5c381c';
      ctx.fillRect(42, 38, MG_W - 84, 126);
      ctx.fillStyle = '#f2f5ff';
      ctx.fillRect(cx - 32, 46, 64, 40);
      ctx.strokeStyle = '#d9483b';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 12, 60, 24, 18);
      ctx.fillStyle = '#e8682c';
      ctx.fillRect(cx - 14, 84, 28, 4);
      ctx.beginPath();
      ctx.arc(cx - 40 + this.needle * 80, 140, 9, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.cfg.themeStyle === 'macaron' || this.cfg.themeStyle === 'souffle') {
      // Patisserie plate & stacked macarons/soufflé
      ctx.fillStyle = '#33202d';
      ctx.fillRect(42, 38, MG_W - 84, 126);
      ctx.fillStyle = '#eef2f7';
      ctx.fillRect(cx - 46, 144, 92, 8);
      for (let i = 0; i < this.hits; i++) {
        const y = 132 - i * 14;
        ctx.fillStyle = i % 2 === 0 ? '#f48fa8' : '#7ae0a4';
        ctx.fillRect(cx - 22, y, 44, 10);
        ctx.fillStyle = '#fff3cf';
        ctx.fillRect(cx - 20, y + 4, 40, 2);
      }
    } else {
      // Cinema clapper / stage timing
      ctx.fillStyle = '#1f2336';
      ctx.fillRect(42, 38, MG_W - 84, 126);
      ctx.fillStyle = '#0d1018';
      ctx.fillRect(cx - 36, 64, 72, 54);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 36, 56, 72, 8);
      ctx.fillStyle = '#f4c542';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`PRISE #${this.attempt}`, cx, 95);
    }
  }

  getResult(): 'playing' | 'won' | 'lost' {
    return this.result;
  }
}
