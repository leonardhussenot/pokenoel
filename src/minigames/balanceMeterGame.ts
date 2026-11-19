import { soundEngine } from '../audio/soundEngine';
import { InputManager } from '../engine/input';
import { BalanceMeterChallengeConfig } from '../types';
import { drawMiniGameHud, MG_H, MG_W, MiniGameInstance } from './common';

export class BalanceMeterGame implements MiniGameInstance {
  private elapsed = 0;
  private markerY = 0.5; // 0 (bottom) .. 1 (top)
  private velocity = 0;
  private zoneCenter = 0.55;
  private zoneDir = 1;
  private mastery = 0; // 0..100
  private result: 'playing' | 'won' | 'lost' = 'playing';
  private soundTick = 0;

  constructor(private cfg: BalanceMeterChallengeConfig) {}

  update(dt: number, input: InputManager): void {
    if (this.result !== 'playing') return;
    this.elapsed += dt;

    const thrusting = input.isDown('a') || input.isDown('up') || input.isCanvasHeld();

    // Physics
    const gravity = -1.35;
    const lift = 2.75;
    const turb = Math.sin(this.elapsed * 5.7) * this.cfg.turbulence * 0.45;
    this.velocity += (gravity + (thrusting ? lift : 0) + turb) * dt;
    this.velocity = Math.max(-1.6, Math.min(1.6, this.velocity));
    this.markerY += this.velocity * dt;

    if (this.markerY < 0.04) {
      this.markerY = 0.04;
      this.velocity = Math.max(0, -this.velocity * 0.3);
    } else if (this.markerY > 0.96) {
      this.markerY = 0.96;
      this.velocity = Math.min(0, -this.velocity * 0.3);
    }

    // Drift target zone
    const half = this.cfg.zoneHeight / 2;
    this.zoneCenter += this.zoneDir * this.cfg.zoneDriftSpeed * dt;
    if (Math.random() < dt * 0.8) {
      this.zoneDir *= -1;
    }
    if (this.zoneCenter > 0.92 - half) {
      this.zoneCenter = 0.92 - half;
      this.zoneDir = -1;
    } else if (this.zoneCenter < 0.08 + half) {
      this.zoneCenter = 0.08 + half;
      this.zoneDir = 1;
    }

    // Inside target zone?
    const inZone = Math.abs(this.markerY - this.zoneCenter) <= half;
    if (inZone) {
      this.mastery = Math.min(100, this.mastery + this.cfg.fillRate * dt);
      this.soundTick += dt;
      if (this.soundTick >= 0.25) {
        this.soundTick = 0;
        soundEngine.playBlip(680 + this.mastery * 3);
      }
      if (this.mastery >= 100) {
        this.result = 'won';
        return;
      }
    } else {
      this.mastery = Math.max(0, this.mastery - this.cfg.fillRate * 0.25 * dt);
    }

    if (this.elapsed >= this.cfg.durationSec) {
      this.result = this.mastery >= 100 ? 'won' : 'lost';
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.cfg.themeStyle === 'darkroom' ? '#241418' : '#1b2236';
    ctx.fillRect(0, 0, MG_W, MG_H);

    const rem = Math.max(0, this.cfg.durationSec - this.elapsed);
    drawMiniGameHud(
      ctx,
      this.cfg.title,
      rem,
      `Maîtrise ${Math.floor(this.mastery)}%`,
      this.mastery / 100,
      '#ffb347'
    );

    // Visual station on left
    const themeTitle =
      this.cfg.themeStyle === 'puree'
        ? 'MONTER AU BEURRE'
        : this.cfg.themeStyle === 'darkroom'
          ? 'BAIN RÉVÉLATEUR'
          : this.cfg.themeStyle === 'souffle_oven'
            ? 'CUISSON DU SOUFFLÉ'
            : 'SOUFFLE BOSSA';

    ctx.fillStyle = '#252d47';
    ctx.fillRect(28, 44, 188, 152);
    ctx.strokeStyle = '#f4c542';
    ctx.strokeRect(28.5, 44.5, 187, 151);

    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(themeTitle, 122, 66);

    // Mastery gauge ring/bar
    ctx.fillStyle = '#121626';
    ctx.fillRect(48, 86, 148, 22);
    const half = this.cfg.zoneHeight / 2;
    const inZone = Math.abs(this.markerY - this.zoneCenter) <= half;
    ctx.fillStyle = inZone ? '#57d978' : '#e08b36';
    ctx.fillRect(50, 88, Math.round((this.mastery / 100) * 144), 18);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`${Math.floor(this.mastery)}%`, 122, 97);

    ctx.fillStyle = inZone ? '#79f59d' : '#ff9494';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(inZone ? 'PARFAIT ! GARDEZ LE CAP !' : 'AJUSTEZ LA HAUTEUR !', 122, 134);

    // Vertical balance bar on right
    const barX = 274;
    const barY = 44;
    const barW = 46;
    const barH = 154;

    ctx.fillStyle = '#101320';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
    ctx.fillStyle = '#21273d';
    ctx.fillRect(barX, barY, barW, barH);

    // Target golden/green zone
    const zTop = barY + Math.round((1 - (this.zoneCenter + half)) * barH);
    const zH = Math.max(18, Math.round(this.cfg.zoneHeight * barH));
    ctx.fillStyle = inZone ? '#45c46b' : '#2f8a4e';
    ctx.fillRect(barX + 2, zTop, barW - 4, zH);

    // Player indicator block
    const mY = barY + Math.round((1 - this.markerY) * barH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(barX - 4, mY - 5, barW + 8, 10);
    ctx.fillStyle = '#ffd045';
    ctx.fillRect(barX - 2, mY - 3, barW + 4, 6);

    ctx.fillStyle = '#b4c0e6';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Maintenez Espace / A / ↑ (ou l’écran) pour monter, relâchez pour descendre !', MG_W / 2, 222);
  }

  getResult(): 'playing' | 'won' | 'lost' {
    return this.result;
  }
}
