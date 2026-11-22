import { InteriorTheme, MapData, WorldTheme } from '../types';
import { TILE_SIZE } from './tilesetRenderer';

const SCREEN_W = 384;
const SCREEN_H = 240;

type AmbientKind =
  | 'leaf'
  | 'page'
  | 'confetti'
  | 'note'
  | 'steam'
  | 'bokeh'
  | 'petal'
  | 'spark'
  | 'dust'
  | 'ember'
  | 'bird'
  | 'rain';

interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  spin: number;
  color: string;
  alpha: number;
  kind: AmbientKind;
}

interface TransientFx {
  x: number; // world pixel coords
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: 'dust' | 'sparkle';
}

interface FlashEvent {
  x: number; // screen coords
  y: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

function safeClosePath(ctx: CanvasRenderingContext2D): void {
  if (typeof ctx.closePath === 'function') {
    ctx.closePath();
  }
}

function safeFillCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
  ctx.fill();
}

function safeRadialGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  innerColor: string,
  outerColor: string
): void {
  if (typeof ctx.createRadialGradient === 'function') {
    const grad = ctx.createRadialGradient(x, y, 0.5, x, y, r);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(1, outerColor);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = innerColor;
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export class WorldAtmosphere {
  private particles: AmbientParticle[] = [];
  private fx: TransientFx[] = [];
  private flashes: FlashEvent[] = [];
  private currentTheme: WorldTheme | InteriorTheme | null = null;
  private flashCooldown = 1.6;
  private rngState = 1337;

  private rand(): number {
    // Deterministic fast LCG so atmosphere is lively & smooth
    this.rngState = (this.rngState * 1664525 + 1013904223) >>> 0;
    return this.rngState / 4294967296;
  }

  resetForMap(map: MapData): void {
    this.currentTheme = map.theme;
    this.particles = [];
    this.fx = [];
    this.flashes = [];
    this.seedParticles(map.theme);
  }

  private seedParticles(theme: WorldTheme | InteriorTheme): void {
    const push = (p: AmbientParticle) => this.particles.push(p);

    if (theme === 'pm') {
      // Drifting golden & russet Parisian autumn leaves + floating parchment pages + distant birds
      const leafColors = ['#e8a838', '#d97630', '#f5c851', '#c74d32', '#e0933b'];
      for (let i = 0; i < 24; i++) {
        push({
          x: this.rand() * SCREEN_W,
          y: this.rand() * SCREEN_H,
          vx: 8 + this.rand() * 12,
          vy: 10 + this.rand() * 11,
          size: 2.2 + this.rand() * 1.6,
          phase: this.rand() * Math.PI * 2,
          spin: 2.2 + this.rand() * 2.5,
          color: leafColors[i % leafColors.length],
          alpha: 0.85,
          kind: 'leaf',
        });
      }
      for (let i = 0; i < 6; i++) {
        push({
          x: this.rand() * SCREEN_W,
          y: this.rand() * SCREEN_H,
          vx: 6 + this.rand() * 8,
          vy: 7 + this.rand() * 7,
          size: 3.2,
          phase: this.rand() * Math.PI * 2,
          spin: 1.8,
          color: '#f7eed9',
          alpha: 0.72,
          kind: 'page',
        });
      }
      for (let i = 0; i < 3; i++) {
        push({
          x: this.rand() * SCREEN_W,
          y: 35 + this.rand() * 130,
          vx: 22 + this.rand() * 14,
          vy: -3 + this.rand() * 6,
          size: 3.5,
          phase: this.rand() * Math.PI * 2,
          spin: 7,
          color: 'rgba(34, 42, 60, 0.42)',
          alpha: 0.45,
          kind: 'bird',
        });
      }
    } else if (theme === 'df') {
      // Colorful Rio Carnival confetti + rising golden music notes!
      const confettiColors = ['#ffd447', '#2ec4de', '#ff5978', '#52d977', '#ff9633', '#ffffff'];
      for (let i = 0; i < 28; i++) {
        push({
          x: this.rand() * SCREEN_W,
          y: this.rand() * SCREEN_H,
          vx: -6 + this.rand() * 18,
          vy: 12 + this.rand() * 15,
          size: 2.0 + this.rand() * 1.5,
          phase: this.rand() * Math.PI * 2,
          spin: 4 + this.rand() * 4,
          color: confettiColors[i % confettiColors.length],
          alpha: 0.88,
          kind: 'confetti',
        });
      }
      for (let i = 0; i < 7; i++) {
        push({
          x: this.rand() * SCREEN_W,
          y: this.rand() * SCREEN_H,
          vx: -4 + this.rand() * 8,
          vy: -(10 + this.rand() * 10),
          size: 7,
          phase: this.rand() * Math.PI * 2,
          spin: 2.5,
          color: i % 2 === 0 ? '#ffe066' : '#73f0ff',
          alpha: 0.72,
          kind: 'note',
        });
      }
    } else if (theme === 'jp') {
      // Warm rising café steam wisps + glowing guinguette bokeh orbs + fluttering petals
      for (let i = 0; i < 14; i++) {
        push({
          x: this.rand() * SCREEN_W,
          y: this.rand() * SCREEN_H,
          vx: -2 + this.rand() * 5,
          vy: -(9 + this.rand() * 9),
          size: 4 + this.rand() * 4,
          phase: this.rand() * Math.PI * 2,
          spin: 1.5,
          color: '#fff7eb',
          alpha: 0.24,
          kind: 'steam',
        });
      }
      const bokehCols = ['#ffe082', '#ffb86c', '#ffd1a9', '#fff4cc'];
      for (let i = 0; i < 16; i++) {
        push({
          x: this.rand() * SCREEN_W,
          y: 22 + this.rand() * (SCREEN_H - 30),
          vx: 3 + this.rand() * 6,
          vy: -2 + this.rand() * 4,
          size: 2.5 + this.rand() * 3.0,
          phase: this.rand() * Math.PI * 2,
          spin: 1.8,
          color: bokehCols[i % bokehCols.length],
          alpha: 0.34,
          kind: 'bokeh',
        });
      }
      for (let i = 0; i < 10; i++) {
        push({
          x: this.rand() * SCREEN_W,
          y: this.rand() * SCREEN_H,
          vx: 9 + this.rand() * 9,
          vy: 8 + this.rand() * 8,
          size: 2.0,
          phase: this.rand() * Math.PI * 2,
          spin: 3,
          color: i % 2 === 0 ? '#ffd1dc' : '#d6b8ff',
          alpha: 0.78,
          kind: 'petal',
        });
      }
    } else if (theme === 'aj') {
      // Championship blue/gold/crimson confetti + rising energy sparks!
      const champColors = ['#3b82f6', '#ffd242', '#ef4444', '#ffffff', '#60a5fa'];
      for (let i = 0; i < 24; i++) {
        push({
          x: this.rand() * SCREEN_W,
          y: this.rand() * SCREEN_H,
          vx: -5 + this.rand() * 14,
          vy: 14 + this.rand() * 16,
          size: 2.1 + this.rand() * 1.4,
          phase: this.rand() * Math.PI * 2,
          spin: 4.5 + this.rand() * 3.5,
          color: champColors[i % champColors.length],
          alpha: 0.85,
          kind: 'confetti',
        });
      }
      for (let i = 0; i < 12; i++) {
        push({
          x: this.rand() * SCREEN_W,
          y: this.rand() * SCREEN_H,
          vx: -4 + this.rand() * 8,
          vy: -(16 + this.rand() * 16),
          size: 1.8,
          phase: this.rand() * Math.PI * 2,
          spin: 5,
          color: i % 2 === 0 ? '#ffe066' : '#93c5fd',
          alpha: 0.78,
          kind: 'spark',
        });
      }
    } else if (theme === 'theater' || theme === 'salon' || theme === 'cinema_set') {
      for (let i = 0; i < 20; i++) {
        push({
          x: 40 + this.rand() * (SCREEN_W - 80),
          y: 25 + this.rand() * (SCREEN_H - 45),
          vx: -3 + this.rand() * 6,
          vy: -4 + this.rand() * 6,
          size: 1.2 + this.rand() * 1.3,
          phase: this.rand() * Math.PI * 2,
          spin: 2,
          color: theme === 'cinema_set' ? '#d9ecff' : '#fff0ba',
          alpha: 0.48,
          kind: 'dust',
        });
      }
    } else if (theme === 'samba_club') {
      const noteCols = ['#ffe066', '#ff6b9d', '#4ce0f5', '#7ef296'];
      for (let i = 0; i < 12; i++) {
        push({
          x: 60 + this.rand() * (SCREEN_W - 120),
          y: 40 + this.rand() * (SCREEN_H - 70),
          vx: -4 + this.rand() * 8,
          vy: -(10 + this.rand() * 10),
          size: 7.5,
          phase: this.rand() * Math.PI * 2,
          spin: 2.8,
          color: noteCols[i % noteCols.length],
          alpha: 0.78,
          kind: 'note',
        });
      }
    } else if (theme === 'kitchen') {
      for (let i = 0; i < 16; i++) {
        push({
          x: 70 + this.rand() * (SCREEN_W - 140),
          y: 45 + this.rand() * (SCREEN_H - 80),
          vx: -2 + this.rand() * 4,
          vy: -(11 + this.rand() * 9),
          size: 4 + this.rand() * 3.5,
          phase: this.rand() * Math.PI * 2,
          spin: 1.6,
          color: '#fff8ed',
          alpha: 0.28,
          kind: 'steam',
        });
      }
    } else if (theme === 'darkroom') {
      for (let i = 0; i < 16; i++) {
        push({
          x: 65 + this.rand() * (SCREEN_W - 130),
          y: 35 + this.rand() * (SCREEN_H - 65),
          vx: -2 + this.rand() * 4,
          vy: -(4 + this.rand() * 6),
          size: 1.6 + this.rand() * 1.4,
          phase: this.rand() * Math.PI * 2,
          spin: 2,
          color: '#ff6675',
          alpha: 0.42,
          kind: 'dust',
        });
      }
    } else if (theme === 'stadium' || theme === 'court') {
      for (let i = 0; i < 14; i++) {
        push({
          x: 55 + this.rand() * (SCREEN_W - 110),
          y: 35 + this.rand() * (SCREEN_H - 65),
          vx: -4 + this.rand() * 8,
          vy: -(10 + this.rand() * 12),
          size: 1.8,
          phase: this.rand() * Math.PI * 2,
          spin: 4,
          color: theme === 'stadium' ? '#93c5fd' : '#ffe066',
          alpha: 0.65,
          kind: 'spark',
        });
      }
    } else if (theme === 'sd') {
      // Subtle neon-cyan & warm sepia rain streaks + floating cyber/cinema sparks
      const rainCols = ['#5ee6f5', '#f2be72', '#8cebf7', '#e6a65c'];
      for (let i = 0; i < 22; i++) {
        push({
          x: this.rand() * SCREEN_W,
          y: this.rand() * SCREEN_H,
          vx: -14 - this.rand() * 8,
          vy: 42 + this.rand() * 28,
          size: 4 + this.rand() * 3.5,
          phase: this.rand() * Math.PI * 2,
          spin: 2.5,
          color: rainCols[i % rainCols.length],
          alpha: 0.34,
          kind: 'rain',
        });
      }
      for (let i = 0; i < 14; i++) {
        push({
          x: this.rand() * SCREEN_W,
          y: this.rand() * SCREEN_H,
          vx: -3 + this.rand() * 7,
          vy: -(10 + this.rand() * 12),
          size: 1.7 + this.rand() * 0.9,
          phase: this.rand() * Math.PI * 2,
          spin: 4.2,
          color: i % 2 === 0 ? '#4ce4f5' : '#f5c06b',
          alpha: 0.72,
          kind: 'spark',
        });
      }
    } else if (theme === 'manga_studio') {
      for (let i = 0; i < 16; i++) {
        push({
          x: 50 + this.rand() * (SCREEN_W - 100),
          y: 32 + this.rand() * (SCREEN_H - 60),
          vx: -3 + this.rand() * 6,
          vy: -(8 + this.rand() * 10),
          size: 1.6 + this.rand() * 0.8,
          phase: this.rand() * Math.PI * 2,
          spin: 3.8,
          color: i % 2 === 0 ? '#4ce4f5' : '#ffd875',
          alpha: 0.62,
          kind: 'spark',
        });
      }
    } else if (theme === 'noir_cinema') {
      for (let i = 0; i < 18; i++) {
        push({
          x: 45 + this.rand() * (SCREEN_W - 90),
          y: 28 + this.rand() * (SCREEN_H - 50),
          vx: -2 + this.rand() * 5,
          vy: -3 + this.rand() * 6,
          size: 1.2 + this.rand() * 1.2,
          phase: this.rand() * Math.PI * 2,
          spin: 1.8,
          color: '#f2d399',
          alpha: 0.44,
          kind: 'dust',
        });
      }
    } else if (theme === 'boss_hall') {
      for (let i = 0; i < 24; i++) {
        push({
          x: 50 + this.rand() * (SCREEN_W - 100),
          y: 30 + this.rand() * (SCREEN_H - 50),
          vx: -4 + this.rand() * 8,
          vy: -(12 + this.rand() * 14),
          size: 1.6 + this.rand() * 1.8,
          phase: this.rand() * Math.PI * 2,
          spin: 3.5,
          color: i % 3 === 0 ? '#fff5bd' : '#f7c948',
          alpha: 0.78,
          kind: 'ember',
        });
      }
    }
  }

  emitStepDust(worldX: number, worldY: number, running: boolean): void {
    const count = running ? 4 : 2;
    for (let i = 0; i < count; i++) {
      const ang = this.rand() * Math.PI * 2;
      const spd = (running ? 14 : 8) + this.rand() * 10;
      this.fx.push({
        x: worldX + (this.rand() - 0.5) * 6,
        y: worldY + (this.rand() - 0.5) * 3,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.45 - 5,
        life: 0,
        maxLife: running ? 0.34 : 0.25,
        size: running ? 2.4 : 1.7,
        color: running ? 'rgba(255, 245, 220, 0.75)' : 'rgba(235, 226, 204, 0.58)',
        kind: 'dust',
      });
    }
  }

  emitSwapBurst(worldX: number, worldY: number, accentColor = '#ffe066'): void {
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + this.rand() * 0.3;
      const spd = 22 + this.rand() * 24;
      this.fx.push({
        x: worldX,
        y: worldY - 6,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 8,
        life: 0,
        maxLife: 0.42 + this.rand() * 0.16,
        size: 2.4 + this.rand() * 1.2,
        color: i % 2 === 0 ? accentColor : '#ffffff',
        kind: 'sparkle',
      });
    }
  }

  update(dt: number, map: MapData): void {
    if (this.currentTheme !== map.theme) {
      this.resetForMap(map);
    }
    const clampedDt = Math.min(dt, 0.05);

    for (const p of this.particles) {
      p.phase += clampedDt * p.spin;
      const sway =
        p.kind === 'leaf' || p.kind === 'page' || p.kind === 'confetti' || p.kind === 'petal'
          ? Math.sin(p.phase) * 14
          : p.kind === 'steam' || p.kind === 'note'
            ? Math.sin(p.phase) * 6
            : 0;
      p.x += (p.vx + sway) * clampedDt;
      p.y += p.vy * clampedDt;

      // Wrap smoothly around screen bounds
      if (p.x > SCREEN_W + 14) p.x = -12;
      if (p.x < -14) p.x = SCREEN_W + 12;
      if (p.y > SCREEN_H + 14) p.y = 18;
      if (p.y < 14) p.y = SCREEN_H + 10;
    }

    // Update transient step dust & swap sparkles
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.life += clampedDt;
      if (f.life >= f.maxLife) {
        this.fx.splice(i, 1);
        continue;
      }
      f.x += f.vx * clampedDt;
      f.y += f.vy * clampedDt;
      f.vx *= 0.92;
      f.vy *= 0.92;
    }

    // Occasional camera flashes in JP (photo galleries) & AJ (stadiums) & DF (red carpet)
    if (map.theme === 'jp' || map.theme === 'aj' || map.theme === 'df') {
      this.flashCooldown -= clampedDt;
      if (this.flashCooldown <= 0) {
        this.flashCooldown = map.theme === 'aj' ? 1.1 + this.rand() * 1.4 : 1.8 + this.rand() * 2.2;
        this.flashes.push({
          x: 24 + this.rand() * (SCREEN_W - 48),
          y: 30 + this.rand() * (SCREEN_H - 60),
          life: 0,
          maxLife: 0.32,
          radius: map.theme === 'aj' ? 14 : 11,
          color: map.theme === 'df' ? '#fff3b8' : '#ffffff',
        });
      }
    }

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const fl = this.flashes[i];
      fl.life += clampedDt;
      if (fl.life >= fl.maxLife) {
        this.flashes.splice(i, 1);
      }
    }
  }

  /**
   * Ground-layer ambient pass: drawn AFTER tiles and BEFORE characters/NPCs.
   * Renders warm lamp halos on the ground, shimmering water glints, passing cloud shadows,
   * footsteps dust puffs, and leader-swap sparkles.
   */
  renderGroundEffects(
    ctx: CanvasRenderingContext2D,
    map: MapData,
    camX: number,
    camY: number,
    time: number
  ): void {
    ctx.save();

    const minTX = Math.max(0, Math.floor(camX / TILE_SIZE));
    const maxTX = Math.min(map.width - 1, Math.ceil((camX + SCREEN_W) / TILE_SIZE));
    const minTY = Math.max(0, Math.floor(camY / TILE_SIZE));
    const maxTY = Math.min(map.height - 1, Math.ceil((camY + SCREEN_H) / TILE_SIZE));

    const pulse = 0.88 + Math.sin(time * 3.1) * 0.12;

    // Scan visible tiles for lamp pools, water glints, and spotlights
    for (let ty = minTY; ty <= maxTY; ty++) {
      const row = map.tiles[ty];
      for (let tx = minTX; tx <= maxTX; tx++) {
        const tile = row[tx];
        const sx = tx * TILE_SIZE - camX + 8;
        const sy = ty * TILE_SIZE - camY + 8;

        if (tile === 'lamp') {
          const isAj = map.theme === 'aj';
          const r = isAj ? 26 * pulse : 21 * pulse;
          safeRadialGlow(
            ctx,
            sx,
            sy + 3,
            r,
            isAj ? 'rgba(210, 235, 255, 0.24)' : 'rgba(255, 224, 130, 0.26)',
            'rgba(255, 224, 130, 0)'
          );
        } else if (tile === 'spotlight') {
          safeRadialGlow(
            ctx,
            sx,
            sy + 14,
            26 * pulse,
            'rgba(255, 236, 158, 0.25)',
            'rgba(255, 236, 158, 0)'
          );
        } else if (tile === 'water') {
          // Shimmering animated specular sparkle on water tiles
          const waveHash = Math.sin(time * 3.6 + tx * 2.1 + ty * 1.7);
          if (waveHash > 0.72) {
            const alpha = (waveHash - 0.72) * 2.8;
            ctx.fillStyle =
              map.theme === 'pm'
                ? `rgba(255, 238, 175, ${Math.min(0.85, alpha).toFixed(2)})`
                : `rgba(235, 252, 255, ${Math.min(0.9, alpha).toFixed(2)})`;
            const gx = sx - 4 + ((tx * 7 + ty * 3) % 9);
            const gy = sy - 4 + ((tx * 5 + ty * 11) % 8);
            ctx.fillRect(gx - 1.5, gy, 3.5, 1);
            ctx.fillRect(gx, gy - 1.5, 1, 3.5);
          }
        }
      }
    }

    // Soft passing cloud shadows on overworld for depth & movement
    if (!map.isInterior) {
      for (let i = 0; i < 3; i++) {
        const cx = ((time * (9 + i * 3) + i * 175 - camX * 0.35) % (SCREEN_W + 180) + (SCREEN_W + 180)) % (SCREEN_W + 180) - 90;
        const cy = 55 + i * 68 + Math.sin(time * 0.3 + i) * 14;
        safeRadialGlow(
          ctx,
          cx,
          cy,
          56 + i * 10,
          'rgba(18, 28, 48, 0.075)',
          'rgba(18, 28, 48, 0)'
        );
      }
    } else if (map.theme === 'court') {
      // Glossy arena floor overhead reflection sheen
      safeRadialGlow(ctx, SCREEN_W * 0.5, SCREEN_H * 0.52, 95, 'rgba(255, 248, 224, 0.14)', 'rgba(255, 248, 224, 0)');
    }

    // Render transient footsteps dust & swap sparkle bursts
    for (const f of this.fx) {
      const progress = f.life / f.maxLife;
      const alpha = Math.max(0, 1 - progress);
      const sx = f.x - camX;
      const sy = f.y - camY;
      ctx.globalAlpha = alpha;
      if (f.kind === 'dust') {
        safeFillCircle(ctx, sx, sy, f.size * (0.7 + progress * 0.6), f.color);
      } else {
        const r = f.size * (1 - progress * 0.45);
        ctx.fillStyle = f.color;
        ctx.fillRect(sx - r, sy - 0.5, r * 2, 1.2);
        ctx.fillRect(sx - 0.5, sy - r, 1.2, r * 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * Air-layer ambient pass: drawn AFTER sprites and BEFORE HUD.
   * Renders sweeping searchlights/floodlights, thematic particles, steam, bokeh, camera flashes,
   * and interior atmospheric framing (curtains, safelight, golden beams).
   */
  renderAirEffects(
    ctx: CanvasRenderingContext2D,
    map: MapData,
    _camX: number,
    _camY: number,
    time: number
  ): void {
    ctx.save();

    // 1. Theme-specific architectural lighting beams & atmospheric washes
    if (map.theme === 'df') {
      // Sweeping golden Hollywood searchlight beams!
      this.drawLightCone(ctx, 56, SCREEN_H + 10, -0.45 + Math.sin(time * 0.72) * 0.38, 270, 34, 'rgba(255, 232, 138, 0.14)');
      this.drawLightCone(ctx, SCREEN_W - 56, SCREEN_H + 10, -2.68 + Math.cos(time * 0.64) * 0.36, 270, 34, 'rgba(130, 236, 255, 0.11)');
      // Warm Rio sunset top rim tint
      const warm = ctx.createLinearGradient(0, 20, 0, 95);
      warm.addColorStop(0, 'rgba(255, 196, 105, 0.10)');
      warm.addColorStop(1, 'rgba(255, 196, 105, 0)');
      ctx.fillStyle = warm;
      ctx.fillRect(0, 20, SCREEN_W, 75);
    } else if (map.theme === 'aj') {
      // Sweeping Championship Stadium floodlight cones!
      this.drawLightCone(ctx, 22, 20, 0.72 + Math.sin(time * 0.85) * 0.22, 230, 36, 'rgba(180, 222, 255, 0.12)');
      this.drawLightCone(ctx, SCREEN_W - 22, 20, 2.42 + Math.cos(time * 0.78) * 0.22, 230, 36, 'rgba(255, 224, 128, 0.11)');
    } else if (map.theme === 'pm') {
      // Warm Parisian golden hour atmospheric wash
      const sun = ctx.createLinearGradient(0, 20, SCREEN_W, SCREEN_H);
      sun.addColorStop(0, 'rgba(255, 214, 138, 0.09)');
      sun.addColorStop(0.55, 'rgba(255, 214, 138, 0)');
      sun.addColorStop(1, 'rgba(72, 42, 74, 0.06)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 20, SCREEN_W, SCREEN_H - 20);
    } else if (map.theme === 'jp') {
      // Subtle warm bistro guinguette top-bar glow
      const bistro = ctx.createLinearGradient(0, 20, 0, 80);
      bistro.addColorStop(0, 'rgba(255, 206, 130, 0.11)');
      bistro.addColorStop(1, 'rgba(255, 206, 130, 0)');
      ctx.fillStyle = bistro;
      ctx.fillRect(0, 20, SCREEN_W, 60);
    } else if (map.theme === 'theater') {
      // Draped crimson velvet theater side curtains & warm golden stage footlight wash
      this.drawTheaterCurtains(ctx, time);
      safeRadialGlow(ctx, SCREEN_W * 0.5, 92, 95, 'rgba(255, 222, 130, 0.17)', 'rgba(255, 222, 130, 0)');
    } else if (map.theme === 'salon') {
      // Diagonal warm sunlit Parisian salon window shafts
      this.drawLightCone(ctx, 72, 20, 1.12, 205, 32, 'rgba(255, 236, 178, 0.13)');
      this.drawLightCone(ctx, 215, 20, 1.12, 205, 32, 'rgba(255, 236, 178, 0.10)');
    } else if (map.theme === 'samba_club') {
      // Rotating colorful Rio club spotlights
      this.drawLightCone(ctx, 88, 22, 1.32 + Math.sin(time * 1.4) * 0.35, 200, 34, 'rgba(255, 92, 152, 0.15)');
      this.drawLightCone(ctx, SCREEN_W - 88, 22, 1.82 + Math.cos(time * 1.2) * 0.35, 200, 34, 'rgba(54, 218, 240, 0.15)');
    } else if (map.theme === 'cinema_set') {
      // Sweeping Hollywood studio klieg lights
      this.drawLightCone(ctx, 78, 22, 1.2 + Math.sin(time * 0.9) * 0.25, 210, 36, 'rgba(255, 246, 204, 0.16)');
      this.drawLightCone(ctx, SCREEN_W - 78, 22, 1.94 + Math.cos(time * 0.85) * 0.25, 210, 36, 'rgba(210, 232, 255, 0.13)');
    } else if (map.theme === 'kitchen') {
      // Cozy warm stove amber ambiance from upper kitchen line
      safeRadialGlow(ctx, SCREEN_W * 0.5, 68, 120, 'rgba(255, 190, 105, 0.16)', 'rgba(255, 190, 105, 0)');
    } else if (map.theme === 'darkroom') {
      // Atmospheric crimson safelight wash + soft vignette
      ctx.fillStyle = 'rgba(145, 14, 28, 0.18)';
      ctx.fillRect(0, 20, SCREEN_W, SCREEN_H - 20);
      safeRadialGlow(ctx, SCREEN_W * 0.5, 86, 105, 'rgba(255, 58, 76, 0.20)', 'rgba(40, 6, 14, 0.22)');
    } else if (map.theme === 'stadium') {
      this.drawLightCone(ctx, 74, 20, 1.25, 210, 42, 'rgba(220, 240, 255, 0.15)');
      this.drawLightCone(ctx, SCREEN_W - 74, 20, 1.89, 210, 42, 'rgba(220, 240, 255, 0.15)');
    } else if (map.theme === 'court') {
      safeRadialGlow(ctx, SCREEN_W * 0.5, 110, 125, 'rgba(255, 246, 214, 0.14)', 'rgba(255, 246, 214, 0)');
    } else if (map.theme === 'sd') {
      // Subtle neon-cyan & warm sepia nocturnal skyline wash + light beams
      this.drawLightCone(ctx, 44, SCREEN_H + 8, -0.52 + Math.sin(time * 0.65) * 0.25, 250, 32, 'rgba(46, 196, 214, 0.12)');
      this.drawLightCone(ctx, SCREEN_W - 44, SCREEN_H + 8, -2.62 + Math.cos(time * 0.58) * 0.25, 250, 32, 'rgba(232, 168, 86, 0.11)');
      const wash = ctx.createLinearGradient(0, 20, SCREEN_W, SCREEN_H);
      wash.addColorStop(0, 'rgba(46, 196, 214, 0.08)');
      wash.addColorStop(0.55, 'rgba(20, 32, 48, 0)');
      wash.addColorStop(1, 'rgba(212, 148, 82, 0.08)');
      ctx.fillStyle = wash;
      ctx.fillRect(0, 20, SCREEN_W, SCREEN_H - 20);
    } else if (map.theme === 'manga_studio') {
      // Crisp cyan-teal studio desk light glow
      safeRadialGlow(ctx, SCREEN_W * 0.5, 96, 115, 'rgba(76, 228, 245, 0.14)', 'rgba(16, 28, 44, 0)');
    } else if (map.theme === 'noir_cinema') {
      // Dramatic warm sepia diagonal noir light shafts
      this.drawLightCone(ctx, 68, 20, 1.15, 210, 30, 'rgba(245, 206, 138, 0.14)');
      this.drawLightCone(ctx, 210, 20, 1.15, 210, 30, 'rgba(245, 206, 138, 0.10)');
    } else if (map.theme === 'boss_hall') {
      // Majestic golden sanctuary light shafts descending on the Boss
      this.drawLightCone(ctx, SCREEN_W * 0.5 - 32, 20, 1.48, 210, 32, 'rgba(255, 226, 122, 0.18)');
      this.drawLightCone(ctx, SCREEN_W * 0.5 + 32, 20, 1.66, 210, 32, 'rgba(255, 226, 122, 0.18)');
    }

    // 2. Ambient particles
    for (const p of this.particles) {
      const shimmer = 0.72 + Math.sin(p.phase) * 0.28;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha * shimmer));

      if (p.kind === 'leaf') {
        const w = Math.max(1.2, Math.abs(Math.cos(p.phase)) * p.size * 1.4);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - w * 0.5, p.y - p.size * 0.45, w, p.size * 0.9);
        ctx.fillStyle = 'rgba(255, 245, 200, 0.45)';
        ctx.fillRect(p.x - w * 0.2, p.y - p.size * 0.3, Math.max(0.8, w * 0.4), p.size * 0.35);
      } else if (p.kind === 'page') {
        const w = Math.max(1.5, Math.abs(Math.cos(p.phase)) * 4.5);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - w * 0.5, p.y - 2.2, w, 4.4);
        ctx.fillStyle = 'rgba(110, 90, 68, 0.45)';
        ctx.fillRect(p.x - w * 0.3, p.y - 0.8, w * 0.6, 0.8);
      } else if (p.kind === 'confetti') {
        const w = Math.max(1, Math.abs(Math.sin(p.phase)) * p.size * 1.5);
        const h = Math.max(1, Math.abs(Math.cos(p.phase * 0.8)) * p.size * 1.2);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - w * 0.5, p.y - h * 0.5, w, h);
      } else if (p.kind === 'note') {
        ctx.fillStyle = p.color;
        ctx.font = `bold ${Math.round(p.size)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.sin(p.phase) > 0 ? '♪' : '♫', p.x, p.y);
      } else if (p.kind === 'steam') {
        safeRadialGlow(ctx, p.x, p.y, p.size, 'rgba(255, 248, 238, 0.28)', 'rgba(255, 248, 238, 0)');
      } else if (p.kind === 'bokeh') {
        safeRadialGlow(ctx, p.x, p.y, p.size * 1.6, p.color, 'rgba(255, 224, 130, 0)');
      } else if (p.kind === 'petal') {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 1.2, p.y - 0.8, 2.4, 1.6);
      } else if (p.kind === 'spark' || p.kind === 'ember') {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(p.x - 0.4, p.y - 0.4, 0.8, 0.8);
      } else if (p.kind === 'dust') {
        safeFillCircle(ctx, p.x, p.y, p.size, p.color);
      } else if (p.kind === 'bird') {
        const flap = Math.sin(time * p.spin + p.phase) * 2.4;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(p.x - 3.5, p.y + flap);
        ctx.lineTo(p.x, p.y);
        ctx.lineTo(p.x + 3.5, p.y + flap);
        ctx.stroke();
      } else if (p.kind === 'rain') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.size * 0.32, p.y + p.size);
        ctx.stroke();
      }
    }

    // 3. Camera flashes (JP galleries, AJ stadiums, DF Hollywood red carpet)
    ctx.globalAlpha = 1;
    for (const fl of this.flashes) {
      const t = fl.life / fl.maxLife;
      const intensity = Math.sin(t * Math.PI);
      const r = fl.radius * (0.4 + t * 0.9);
      ctx.globalAlpha = intensity * 0.85;
      safeRadialGlow(ctx, fl.x, fl.y, r, fl.color, 'rgba(255,255,255,0)');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(fl.x - r * 0.65, fl.y - 0.5, r * 1.3, 1);
      ctx.fillRect(fl.x - 0.5, fl.y - r * 0.65, 1, r * 1.3);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawLightCone(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    angle: number,
    length: number,
    halfSpread: number,
    color: string
  ): void {
    const ex = ox + Math.cos(angle) * length;
    const ey = oy + Math.sin(angle) * length;
    const px = -Math.sin(angle) * halfSpread;
    const py = Math.cos(angle) * halfSpread;

    const grad = ctx.createLinearGradient(ox, oy, ex, ey);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(ox - px * 0.14, oy - py * 0.14);
    ctx.lineTo(ox + px * 0.14, oy + py * 0.14);
    ctx.lineTo(ex + px, ey + py);
    ctx.lineTo(ex - px, ey - py);
    safeClosePath(ctx);
    ctx.fill();
  }

  private drawTheaterCurtains(ctx: CanvasRenderingContext2D, time: number): void {
    const sway = Math.sin(time * 1.4) * 1.5;
    // Left draped velvet curtain
    const lg = ctx.createLinearGradient(0, 20, 28, 20);
    lg.addColorStop(0, '#591120');
    lg.addColorStop(0.6, '#8c1d33');
    lg.addColorStop(1, '#4a0d19');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(28 + sway, 20);
    ctx.lineTo(18 + sway * 0.6, 120);
    ctx.lineTo(24 + sway, SCREEN_H);
    ctx.lineTo(0, SCREEN_H);
    safeClosePath(ctx);
    ctx.fill();

    // Right draped velvet curtain
    const rg = ctx.createLinearGradient(SCREEN_W - 28, 20, SCREEN_W, 20);
    rg.addColorStop(0, '#4a0d19');
    rg.addColorStop(0.4, '#8c1d33');
    rg.addColorStop(1, '#591120');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(SCREEN_W, 20);
    ctx.lineTo(SCREEN_W - 28 - sway, 20);
    ctx.lineTo(SCREEN_W - 18 - sway * 0.6, 120);
    ctx.lineTo(SCREEN_W - 24 - sway, SCREEN_H);
    ctx.lineTo(SCREEN_W, SCREEN_H);
    safeClosePath(ctx);
    ctx.fill();

    // Gold curtain trim cords
    ctx.fillStyle = '#e0b853';
    ctx.fillRect(0, 118, 20, 3);
    ctx.fillRect(SCREEN_W - 20, 118, 20, 3);
  }
}
