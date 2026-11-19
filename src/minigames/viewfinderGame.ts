import { soundEngine } from '../audio/soundEngine';
import { InputManager } from '../engine/input';
import { ViewfinderChallengeConfig } from '../types';
import { drawMiniGameHud, MG_H, MG_W, MiniGameInstance } from './common';

interface PhotoTarget {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  label: string;
}

export class ViewfinderGame implements MiniGameInstance {
  private fx = MG_W / 2;
  private fy = 130;
  private elapsed = 0;
  private shots = 0;
  private filmLeft: number;
  private flashAlpha = 0;
  private feedback = '';
  private feedbackColor = '#fff';
  private feedbackTimer = 0;
  private target: PhotoTarget;
  private result: 'playing' | 'won' | 'lost' = 'playing';

  constructor(private cfg: ViewfinderChallengeConfig) {
    this.filmLeft = cfg.maxFilm;
    this.target = this.spawnTarget();
  }

  private spawnTarget(): PhotoTarget {
    return {
      x: 70 + Math.random() * (MG_W - 140),
      y: 66 + Math.random() * (MG_H - 120),
      vx: (Math.random() < 0.5 ? 1 : -1) * this.cfg.subjectSpeed,
      vy: (Math.random() < 0.5 ? 1 : -1) * (this.cfg.subjectSpeed * 0.65),
      phase: 0,
      label:
        this.cfg.themeStyle === 'puddle_jump'
          ? 'SAUT'
          : this.cfg.themeStyle === 'wildlife'
            ? 'FAUNE'
            : this.cfg.themeStyle === 'thriller_birds'
              ? 'INDICE'
              : 'SUJET',
    };
  }

  private isPeakMoment(): boolean {
    if (!this.cfg.requiresPeakMoment) return true;
    return Math.sin(this.target.phase * 3.1) > 0.15;
  }

  update(dt: number, input: InputManager): void {
    if (this.result !== 'playing') return;
    this.elapsed += dt;
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - dt * 4);
    if (this.feedbackTimer > 0) this.feedbackTimer -= dt;

    // Move viewfinder
    const speed = 165;
    let dx = 0;
    let dy = 0;
    if (input.isDown('left')) dx -= 1;
    if (input.isDown('right')) dx += 1;
    if (input.isDown('up')) dy -= 1;
    if (input.isDown('down')) dy += 1;
    this.fx = Math.max(36, Math.min(MG_W - 36, this.fx + dx * speed * dt));
    this.fy = Math.max(54, Math.min(MG_H - 34, this.fy + dy * speed * dt));

    // Move target
    this.target.phase += dt;
    this.target.x += this.target.vx * dt;
    this.target.y += this.target.vy * dt;
    if (this.target.x < 38 || this.target.x > MG_W - 38) {
      this.target.vx *= -1;
      this.target.x = Math.max(38, Math.min(MG_W - 38, this.target.x));
    }
    if (this.target.y < 54 || this.target.y > MG_H - 36) {
      this.target.vy *= -1;
      this.target.y = Math.max(54, Math.min(MG_H - 36, this.target.y));
    }

    // Optional canvas tap aims & snaps!
    const tap = input.consumeTap();
    if (tap && tap.y >= 32) {
      this.fx = Math.max(36, Math.min(MG_W - 36, tap.x));
      this.fy = Math.max(54, Math.min(MG_H - 34, tap.y));
      this.takeShot();
      return;
    }

    if (input.justPressed('a')) {
      this.takeShot();
    }

    if (this.elapsed >= this.cfg.durationSec && this.result === 'playing') {
      this.result = this.shots >= this.cfg.requiredShots ? 'won' : 'lost';
    }
  }

  private takeShot(): void {
    if (this.filmLeft <= 0) return;
    this.filmLeft--;
    this.flashAlpha = 0.85;

    const half = this.cfg.frameSize / 2;
    const inFrame =
      Math.abs(this.target.x - this.fx) <= half &&
      Math.abs(this.target.y - this.fy) <= half;
    const peak = this.isPeakMoment();

    if (inFrame && peak) {
      this.shots++;
      soundEngine.playHitPerfect();
      this.feedback = 'CLICHÉ PARFAIT !';
      this.feedbackColor = '#66f28d';
      this.feedbackTimer = 0.7;
      if (this.shots >= this.cfg.requiredShots) {
        this.result = 'won';
        return;
      }
      this.target = this.spawnTarget();
    } else if (inFrame && !peak) {
      soundEngine.playHitMiss();
      this.feedback = 'ATTENDEZ L’INSTANT !';
      this.feedbackColor = '#ffd045';
      this.feedbackTimer = 0.7;
    } else {
      soundEngine.playHitMiss();
      this.feedback = 'HORS CADRE !';
      this.feedbackColor = '#ff7070';
      this.feedbackTimer = 0.65;
    }

    const needed = this.cfg.requiredShots - this.shots;
    if (this.filmLeft < needed) {
      this.result = 'lost';
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const bw =
      this.cfg.themeStyle === 'nature_bw' ||
      this.cfg.themeStyle === 'paris_street' ||
      this.cfg.themeStyle === 'puddle_jump';

    ctx.fillStyle = bw ? '#26282e' : '#1b263b';
    ctx.fillRect(0, 0, MG_W, MG_H);

    // Atmospheric backdrop silhouettes
    ctx.fillStyle = bw ? '#353840' : '#253552';
    ctx.fillRect(20, 46, 52, 130);
    ctx.fillRect(92, 72, 68, 104);
    ctx.fillRect(218, 56, 74, 120);
    ctx.fillRect(310, 48, 54, 128);
    ctx.fillStyle = bw ? '#484c57' : '#314569';
    ctx.fillRect(0, 176, MG_W, MG_H - 176);

    const rem = Math.max(0, this.cfg.durationSec - this.elapsed);
    drawMiniGameHud(
      ctx,
      this.cfg.title,
      rem,
      `Photos ${this.shots}/${this.cfg.requiredShots} • Pellicule ${this.filmLeft}`,
      this.shots / Math.max(1, this.cfg.requiredShots),
      '#e6ecf5'
    );

    // Draw moving target
    const peak = this.isPeakMoment();
    const jumpOffset = this.cfg.requiresPeakMoment && peak ? -8 : 0;
    const tx = Math.round(this.target.x);
    const ty = Math.round(this.target.y + jumpOffset);

    ctx.fillStyle = peak ? '#ffd452' : '#9aa4bd';
    ctx.fillRect(tx - 8, ty - 10, 16, 20);
    ctx.fillStyle = '#141724';
    ctx.fillRect(tx - 5, ty - 7, 10, 7);
    ctx.fillStyle = peak ? '#ff5c77' : '#cfd6e6';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(peak ? '★ INSTANT !' : this.target.label, tx, ty - 14);

    // Draw camera viewfinder brackets
    const half = Math.floor(this.cfg.frameSize / 2);
    const left = Math.round(this.fx - half);
    const top = Math.round(this.fy - half);
    const s = this.cfg.frameSize;
    const inFrame =
      Math.abs(this.target.x - this.fx) <= half &&
      Math.abs(this.target.y - this.fy) <= half;

    ctx.strokeStyle = inFrame && peak ? '#66f28d' : inFrame ? '#ffd045' : '#ffffff';
    ctx.lineWidth = 2;
    const arm = 10;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(left, top + arm);
    ctx.lineTo(left, top);
    ctx.lineTo(left + arm, top);
    // Top-right
    ctx.moveTo(left + s - arm, top);
    ctx.lineTo(left + s, top);
    ctx.lineTo(left + s, top + arm);
    // Bottom-left
    ctx.moveTo(left, top + s - arm);
    ctx.lineTo(left, top + s);
    ctx.lineTo(left + arm, top + s);
    // Bottom-right
    ctx.moveTo(left + s - arm, top + s);
    ctx.lineTo(left + s, top + s);
    ctx.lineTo(left + s, top + s - arm);
    ctx.stroke();

    // Center focus crosshair
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(Math.round(this.fx) - 4, Math.round(this.fy), 9, 1);
    ctx.fillRect(Math.round(this.fx), Math.round(this.fy) - 4, 1, 9);

    if (this.feedbackTimer > 0 && this.feedback) {
      ctx.fillStyle = 'rgba(12,15,24,0.85)';
      ctx.fillRect(112, 34, 160, 18);
      ctx.fillStyle = this.feedbackColor;
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.feedback, MG_W / 2, 43);
    }

    if (this.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashAlpha.toFixed(2)})`;
      ctx.fillRect(0, 26, MG_W, MG_H - 26);
    }

    ctx.fillStyle = '#c4cde6';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Flèches pour viser + Espace/A pour déclencher (ou touchez le sujet)',
      MG_W / 2,
      MG_H - 8
    );
  }

  getResult(): 'playing' | 'won' | 'lost' {
    return this.result;
  }
}
