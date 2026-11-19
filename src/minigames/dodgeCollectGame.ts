import { soundEngine } from '../audio/soundEngine';
import { InputManager } from '../engine/input';
import { DodgeCollectChallengeConfig } from '../types';
import { drawHearts, drawMiniGameHud, MG_H, MG_W, MiniGameInstance } from './common';

interface EntityItem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  kind: 'good' | 'hazard';
}

export class DodgeCollectGame implements MiniGameInstance {
  private px = MG_W / 2;
  private py = 188;
  private readonly pRadius = 10;
  private items: EntityItem[] = [];
  private elapsed = 0;
  private spawnTimer = 0.2;
  private collectTimer = 0.35;
  private collected = 0;
  private lives: number;
  private invuln = 0;
  private result: 'playing' | 'won' | 'lost' = 'playing';

  constructor(private cfg: DodgeCollectChallengeConfig) {
    this.lives = cfg.lives;
  }

  update(dt: number, input: InputManager): void {
    if (this.result !== 'playing') return;
    this.elapsed += dt;
    if (this.invuln > 0) this.invuln -= dt;

    // Player movement (4 directions inside arena)
    const speed = 152;
    let dx = 0;
    let dy = 0;
    if (input.isDown('left')) dx -= 1;
    if (input.isDown('right')) dx += 1;
    if (input.isDown('up')) dy -= 1;
    if (input.isDown('down')) dy += 1;

    // Optional canvas touch steer toward pointer hold or tap
    const ptr = input.isCanvasHeld() ? input.getCanvasPointer() : input.getCanvasTap();
    if (ptr && dx === 0 && dy === 0) {
      const tx = ptr.x - this.px;
      const ty = ptr.y - this.py;
      const dist = Math.hypot(tx, ty);
      if (dist > 6) {
        dx = tx / dist;
        dy = ty / dist;
      }
    }

    if (dx !== 0 && dy !== 0 && Math.abs(dx) === 1 && Math.abs(dy) === 1) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    this.px = Math.max(18, Math.min(MG_W - 18, this.px + dx * speed * dt));
    this.py = Math.max(44, Math.min(MG_H - 18, this.py + dy * speed * dt));

    // Spawn hazards
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 1 / Math.max(0.8, this.cfg.spawnRate);
      const fromSide = Math.random() < 0.25;
      if (fromSide) {
        const leftSide = Math.random() < 0.5;
        this.items.push({
          x: leftSide ? -8 : MG_W + 8,
          y: 52 + Math.random() * (MG_H - 80),
          vx: (leftSide ? 1 : -1) * (this.cfg.hazardSpeed * 0.9),
          vy: (Math.random() - 0.5) * 35,
          r: 8,
          kind: 'hazard',
        });
      } else {
        this.items.push({
          x: 20 + Math.random() * (MG_W - 40),
          y: 26,
          vx: (Math.random() - 0.5) * 52,
          vy: this.cfg.hazardSpeed * (0.85 + Math.random() * 0.35),
          r: 8,
          kind: 'hazard',
        });
      }
    }

    // Spawn collectibles
    this.collectTimer -= dt;
    if (this.collectTimer <= 0) {
      this.collectTimer = Math.max(0.65, (this.cfg.durationSec / (this.cfg.targetCount * 1.45)));
      this.items.push({
        x: 24 + Math.random() * (MG_W - 48),
        y: 28,
        vx: (Math.random() - 0.5) * 28,
        vy: this.cfg.hazardSpeed * 0.65,
        r: 9,
        kind: 'good',
      });
    }

    // Update entities & collisions
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.x += it.vx * dt;
      it.y += it.vy * dt;

      if (it.x < -24 || it.x > MG_W + 24 || it.y > MG_H + 24) {
        this.items.splice(i, 1);
        continue;
      }

      const d = Math.hypot(it.x - this.px, it.y - this.py);
      if (d < it.r + this.pRadius) {
        if (it.kind === 'good') {
          this.items.splice(i, 1);
          this.collected++;
          soundEngine.playHitGood();
          if (this.collected >= this.cfg.targetCount) {
            this.result = 'won';
            return;
          }
        } else if (this.invuln <= 0) {
          this.items.splice(i, 1);
          this.lives--;
          this.invuln = 0.9;
          soundEngine.playHitMiss();
          if (this.lives <= 0) {
            this.result = 'lost';
            return;
          }
        }
      }
    }

    if (this.elapsed >= this.cfg.durationSec) {
      this.result = this.collected >= this.cfg.targetCount ? 'won' : 'lost';
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Theme arena backdrop
    const bgMap: Record<string, string> = {
      boat: '#143354',
      factory: '#232836',
      train: '#2b241d',
      carnival: '#2b193d',
      film_run: '#1c212e',
      war_photo: '#292721',
      football_dribble: '#1e5e31',
      court_drive: '#6b4222',
      birds: '#26303d',
      kitchen_rush: '#2e2228',
    };
    ctx.fillStyle = bgMap[this.cfg.themeStyle] ?? '#1a2436';
    ctx.fillRect(0, 0, MG_W, MG_H);

    // Subtle field/arena lines
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    for (let x = 48; x < MG_W; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 26);
      ctx.lineTo(x, MG_H);
      ctx.stroke();
    }

    const rem = Math.max(0, this.cfg.durationSec - this.elapsed);
    drawMiniGameHud(
      ctx,
      this.cfg.title,
      rem,
      `${this.cfg.collectLabel}: ${this.collected}/${this.cfg.targetCount}`,
      this.collected / Math.max(1, this.cfg.targetCount),
      '#57d978'
    );

    drawHearts(ctx, 8, 30, this.lives, this.cfg.lives);

    // Draw items
    for (const it of this.items) {
      if (it.kind === 'good') {
        ctx.fillStyle = '#ffe059';
        ctx.beginPath();
        ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#694a09';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#402c03';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', it.x, it.y + 0.5);
      } else {
        ctx.fillStyle = '#e03e4d';
        ctx.fillRect(Math.round(it.x - it.r), Math.round(it.y - it.r), it.r * 2, it.r * 2);
        ctx.strokeStyle = '#ffd1d6';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(Math.round(it.x - it.r), Math.round(it.y - it.r), it.r * 2, it.r * 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', it.x, it.y + 0.5);
      }
    }

    // Draw player
    const blink = this.invuln > 0 && Math.floor(this.invuln * 16) % 2 === 0;
    if (!blink) {
      ctx.fillStyle = '#3fb8ff';
      ctx.beginPath();
      ctx.arc(this.px, this.py, this.pRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#0c233b';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.cfg.playerLabel.slice(0, 3).toUpperCase(), this.px, this.py + 0.5);
    }

    // Legend footer
    ctx.fillStyle = 'rgba(12,15,24,0.75)';
    ctx.fillRect(0, MG_H - 14, MG_W, 14);
    ctx.fillStyle = '#d6def5';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Attrapez ★ (${this.cfg.collectLabel}) • Évitez ! (${this.cfg.hazardLabel})`,
      MG_W / 2,
      MG_H - 6
    );
  }

  getResult(): 'playing' | 'won' | 'lost' {
    return this.result;
  }
}
