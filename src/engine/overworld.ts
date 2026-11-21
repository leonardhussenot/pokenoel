import { soundEngine } from '../audio/soundEngine';
import {
  Direction,
  DistrictGate,
  FamilyMember,
  MapData,
  ModeSaveData,
  NpcEntity,
  SignPost,
  WorldDefinition,
  WorldTheme,
} from '../types';
import { InputManager } from './input';
import { drawOverworldSprite, drawPortrait } from './pixelRenderer';
import { drawTile, isTileWalkable, TILE_SIZE } from './tilesetRenderer';
import { WorldAtmosphere } from './worldAtmosphere';

export const SCREEN_W = 384;
export const SCREEN_H = 240;
export const RENDER_SCALE = 4;

const DIR_DELTA: Record<Direction, { dx: number; dy: number }> = {
  down: { dx: 0, dy: 1 },
  up: { dx: 0, dy: -1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const THEME_ACCENT: Record<WorldTheme, string> = {
  pm: '#e0b853',
  df: '#2ec4de',
  jp: '#e87654',
  aj: '#4a9eff',
};

const THEME_HUD_STYLE: Record<
  WorldTheme,
  { bgTop: string; bgBottom: string; trimMid: string; pillTint: string }
> = {
  pm: {
    bgTop: 'rgba(28, 15, 24, 0.94)',
    bgBottom: 'rgba(18, 10, 17, 0.90)',
    trimMid: '#e8c166',
    pillTint: 'rgba(232, 193, 102, 0.20)',
  },
  df: {
    bgTop: 'rgba(16, 26, 40, 0.94)',
    bgBottom: 'rgba(11, 18, 30, 0.90)',
    trimMid: '#f2c872',
    pillTint: 'rgba(242, 200, 114, 0.20)',
  },
  jp: {
    bgTop: 'rgba(28, 18, 17, 0.94)',
    bgBottom: 'rgba(19, 12, 12, 0.90)',
    trimMid: '#efb976',
    pillTint: 'rgba(239, 185, 118, 0.20)',
  },
  aj: {
    bgTop: 'rgba(14, 24, 46, 0.94)',
    bgBottom: 'rgba(10, 17, 34, 0.90)',
    trimMid: '#f4ce72',
    pillTint: 'rgba(244, 206, 114, 0.20)',
  },
};

function safeRoundRectFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, rad);
  } else {
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.lineTo(x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.lineTo(x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.lineTo(x, y + h - rad);
    ctx.lineTo(x, y + rad);
    if (typeof ctx.closePath === 'function') ctx.closePath();
  }
  ctx.fill();
}

function safeRoundRectStroke(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, rad);
  } else {
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.lineTo(x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.lineTo(x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.lineTo(x, y + h - rad);
    ctx.lineTo(x, y + rad);
    if (typeof ctx.closePath === 'function') ctx.closePath();
  }
  ctx.stroke();
}

function formatLandmarkShortLabel(name: string): string {
  const dashIdx = name.indexOf('—');
  const candidate = dashIdx >= 0 ? name.slice(dashIdx + 1).trim() : name.trim();
  if (candidate.length <= 32) return candidate;
  return `${candidate.slice(0, 31)}…`;
}

export interface OverworldCallbacks {
  onInteractNpc: (npc: NpcEntity) => void;
  onInspectSign: (sign: SignPost) => void;
  onLockedGateBump: (gate: DistrictGate) => void;
  onOpenPauseMenu: () => void;
}

export class OverworldEngine {
  private mapId: string;
  private leaderX: number;
  private leaderY: number;
  private leaderDir: Direction = 'down';

  private followerX: number;
  private followerY: number;
  private followerDir: Direction = 'down';

  private moving = false;
  private moveProgress = 0; // 0..1
  private moveStartX = 0;
  private moveStartY = 0;
  private followerStartX = 0;
  private followerStartY = 0;
  private stepToggle = false;
  private bumpCooldown = 0;
  private warpCooldown = 0;
  private fadeAlpha = 0;
  private swapHopTimer = 0;
  private animTimer = 0;
  private toastMessage = '';
  private toastTimer = 0;
  private atmosphere = new WorldAtmosphere();

  constructor(
    private world: WorldDefinition,
    private pairMembers: [FamilyMember, FamilyMember],
    private save: ModeSaveData,
    private callbacks: OverworldCallbacks
  ) {
    const startMap = world.maps[save.lastMapId] ? save.lastMapId : world.overworldId;
    this.mapId = startMap;
    const map = world.maps[startMap];
    const validPos =
      save.lastX >= 0 &&
      save.lastX < map.width &&
      save.lastY >= 0 &&
      save.lastY < map.height &&
      this.canStandOnTile(map, save.lastX, save.lastY);

    this.leaderX = validPos ? save.lastX : world.spawnX;
    this.leaderY = validPos ? save.lastY : world.spawnY;
    this.followerX = this.leaderX;
    this.followerY = Math.min(map.height - 2, this.leaderY + 1);
    if (!this.canStandOnTile(map, this.followerX, this.followerY)) {
      this.followerX = this.leaderX;
      this.followerY = this.leaderY;
    }
    this.moveStartX = this.leaderX;
    this.moveStartY = this.leaderY;
    this.followerStartX = this.followerX;
    this.followerStartY = this.followerY;
    this.atmosphere.resetForMap(map);
  }

  getCurrentMap(): MapData {
    return this.world.maps[this.mapId];
  }

  getLeaderMember(): FamilyMember {
    return this.pairMembers[0];
  }

  getFollowerMember(): FamilyMember {
    return this.pairMembers[1];
  }

  getPosition(): { mapId: string; x: number; y: number } {
    return { mapId: this.mapId, x: this.leaderX, y: this.leaderY };
  }

  showToast(msg: string, duration = 2.2): void {
    this.toastMessage = msg;
    this.toastTimer = duration;
  }

  isGateUnlocked(gate: DistrictGate): boolean {
    return this.save.badges.length >= gate.requiredBadges;
  }

  private getGateAt(x: number, y: number): DistrictGate | undefined {
    if (this.mapId !== this.world.overworldId) return undefined;
    return this.world.gates.find((g) => g.tiles.some((t) => t.x === x && t.y === y));
  }

  private getNpcAt(mapId: string, x: number, y: number): NpcEntity | undefined {
    return this.world.npcs.find((n) => {
      if (n.mapId !== mapId) return false;
      if (n.x === x && n.y === y) return true;
      if (n.role === 'cameo' && n.x + 1 === x && n.y === y) return true;
      return false;
    });
  }

  private canStandOnTile(map: MapData, x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;
    const tile = map.tiles[y][x];
    if (tile === 'gate_closed') {
      const gate = this.getGateAt(x, y);
      if (!gate || !this.isGateUnlocked(gate)) return false;
    } else if (!isTileWalkable(tile)) {
      return false;
    }
    if (this.getNpcAt(map.id, x, y)) return false;
    return true;
  }

  update(dt: number, input: InputManager): void {
    this.animTimer += dt;
    this.atmosphere.update(dt, this.getCurrentMap());

    if (this.bumpCooldown > 0) this.bumpCooldown -= dt;
    if (this.warpCooldown > 0) this.warpCooldown -= dt;
    if (this.fadeAlpha > 0) this.fadeAlpha = Math.max(0, this.fadeAlpha - dt * 3.8);
    if (this.swapHopTimer > 0) this.swapHopTimer = Math.max(0, this.swapHopTimer - dt);
    if (this.toastTimer > 0) this.toastTimer = Math.max(0, this.toastTimer - dt);

    if (input.justPressed('menu') || input.justPressed('b')) {
      soundEngine.playConfirm();
      this.callbacks.onOpenPauseMenu();
      return;
    }

    if (this.moving) {
      const speed = input.isDown('run') ? 10.5 : 6.8; // tiles per sec
      this.moveProgress += dt * speed;
      if (this.moveProgress >= 1) {
        this.moving = false;
        this.moveProgress = 0;
        this.save.lastMapId = this.mapId;
        this.save.lastX = this.leaderX;
        this.save.lastY = this.leaderY;
        this.checkWarp();
      }
      return;
    }

    // Interact with A button
    if (input.justPressed('a')) {
      this.tryInteract();
      return;
    }

    // Movement
    const dir = input.getDirectionHeld();
    if (dir) {
      this.tryStartMove(dir, input.isDown('run'));
    }
  }

  private tryStartMove(dir: Direction, running: boolean): void {
    this.leaderDir = dir;
    const map = this.getCurrentMap();
    const { dx, dy } = DIR_DELTA[dir];
    const nx = this.leaderX + dx;
    const ny = this.leaderY + dy;

    // Check warp even if destination is a door tile (door is walkable!)
    if (!this.canStandOnTile(map, nx, ny)) {
      if (this.bumpCooldown <= 0) {
        this.bumpCooldown = 0.35;
        const gate = this.getGateAt(nx, ny);
        if (gate && !this.isGateUnlocked(gate)) {
          soundEngine.playBump();
          this.callbacks.onLockedGateBump(gate);
          return;
        }
        soundEngine.playBump();
      }
      return;
    }

    // Emit crisp footsteps dust puff at vacated tile
    this.atmosphere.emitStepDust(
      this.leaderX * TILE_SIZE + TILE_SIZE * 0.5,
      this.leaderY * TILE_SIZE + TILE_SIZE - 2,
      running
    );

    this.moveStartX = this.leaderX;
    this.moveStartY = this.leaderY;
    this.followerStartX = this.followerX;
    this.followerStartY = this.followerY;

    // Follower steps onto leader's vacated tile
    const prevLeaderX = this.leaderX;
    const prevLeaderY = this.leaderY;
    if (prevLeaderX !== this.followerX || prevLeaderY !== this.followerY) {
      const fdx = prevLeaderX - this.followerX;
      const fdy = prevLeaderY - this.followerY;
      if (Math.abs(fdx) + Math.abs(fdy) === 1) {
        if (fdx > 0) this.followerDir = 'right';
        else if (fdx < 0) this.followerDir = 'left';
        else if (fdy > 0) this.followerDir = 'down';
        else if (fdy < 0) this.followerDir = 'up';
        this.followerX = prevLeaderX;
        this.followerY = prevLeaderY;
      } else {
        this.followerX = prevLeaderX;
        this.followerY = prevLeaderY;
        this.followerDir = dir;
      }
    }

    this.leaderX = nx;
    this.leaderY = ny;
    this.moving = true;
    this.moveProgress = 0;
    this.stepToggle = !this.stepToggle;
    soundEngine.playStep();
  }

  private checkWarp(): void {
    if (this.warpCooldown > 0) return;
    const map = this.getCurrentMap();
    const warp = map.warps.find((w) => w.x === this.leaderX && w.y === this.leaderY);
    if (!warp) return;

    const targetMap = this.world.maps[warp.targetMapId];
    if (!targetMap) return;

    soundEngine.playDoor();
    this.mapId = targetMap.id;
    this.leaderX = warp.targetX;
    this.leaderY = warp.targetY;
    this.leaderDir = warp.targetDir;
    this.moveStartX = this.leaderX;
    this.moveStartY = this.leaderY;

    // Place follower neatly right behind or beside leader on arrival
    const { dx, dy } = DIR_DELTA[warp.targetDir];
    const behindX = this.leaderX - dx;
    const behindY = this.leaderY - dy;
    if (this.canStandOnTile(targetMap, behindX, behindY)) {
      this.followerX = behindX;
      this.followerY = behindY;
    } else {
      this.followerX = this.leaderX;
      this.followerY = this.leaderY;
    }
    this.followerStartX = this.followerX;
    this.followerStartY = this.followerY;
    this.followerDir = warp.targetDir;

    this.save.lastMapId = this.mapId;
    this.save.lastX = this.leaderX;
    this.save.lastY = this.leaderY;
    this.warpCooldown = 0.22;
    this.fadeAlpha = 1;
    this.atmosphere.resetForMap(targetMap);
  }

  private tryInteract(): void {
    const map = this.getCurrentMap();
    const { dx, dy } = DIR_DELTA[this.leaderDir];
    const tx = this.leaderX + dx;
    const ty = this.leaderY + dy;

    const npc = this.getNpcAt(map.id, tx, ty);
    if (npc) {
      if (npc.role !== 'cameo') {
        const opp: Record<Direction, Direction> = {
          down: 'up',
          up: 'down',
          left: 'right',
          right: 'left',
        };
        npc.dir = opp[this.leaderDir];
      }
      soundEngine.playSelect();
      this.callbacks.onInteractNpc(npc);
      return;
    }

    const sign = map.signs.find((s) => s.x === tx && s.y === ty);
    if (sign) {
      soundEngine.playSelect();
      this.callbacks.onInspectSign(sign);
      return;
    }

    const gate = this.getGateAt(tx, ty);
    if (gate && !this.isGateUnlocked(gate)) {
      soundEngine.playBump();
      this.callbacks.onLockedGateBump(gate);
    }
  }

  private getCurrentDistrictName(): string {
    if (this.mapId !== this.world.overworldId) {
      return this.getCurrentMap().name;
    }
    const found = this.world.districts.find(
      (d) => this.leaderY >= d.minY && this.leaderY <= d.maxY
    );
    return found?.name ?? this.world.worldName;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const map = this.getCurrentMap();
    const tileAnimFrame = Math.floor(this.animTimer * 3.4) % 4;

    const lerpX = this.moving
      ? this.moveStartX + (this.leaderX - this.moveStartX) * this.moveProgress
      : this.leaderX;
    const lerpY = this.moving
      ? this.moveStartY + (this.leaderY - this.moveStartY) * this.moveProgress
      : this.leaderY;

    const fLerpX = this.moving
      ? this.followerStartX + (this.followerX - this.followerStartX) * this.moveProgress
      : this.followerX;
    const fLerpY = this.moving
      ? this.followerStartY + (this.followerY - this.followerStartY) * this.moveProgress
      : this.followerY;

    // Camera calculation
    const mapPxW = map.width * TILE_SIZE;
    const mapPxH = map.height * TILE_SIZE;
    let camX = Math.round(lerpX * TILE_SIZE + TILE_SIZE / 2 - SCREEN_W / 2);
    let camY = Math.round(lerpY * TILE_SIZE + TILE_SIZE / 2 - SCREEN_H / 2);

    if (mapPxW <= SCREEN_W) {
      camX = -Math.floor((SCREEN_W - mapPxW) / 2);
    } else {
      camX = Math.max(0, Math.min(mapPxW - SCREEN_W, camX));
    }
    if (mapPxH <= SCREEN_H) {
      camY = -Math.floor((SCREEN_H - mapPxH) / 2);
    } else {
      camY = Math.max(0, Math.min(mapPxH - SCREEN_H, camY));
    }

    // Background fill
    ctx.fillStyle = map.isInterior
      ? map.theme === 'darkroom'
        ? '#140a0f'
        : '#101320'
      : '#162b1f';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // 1. Draw visible HD tiles
    const minTX = Math.max(0, Math.floor(camX / TILE_SIZE));
    const maxTX = Math.min(map.width - 1, Math.ceil((camX + SCREEN_W) / TILE_SIZE));
    const minTY = Math.max(0, Math.floor(camY / TILE_SIZE));
    const maxTY = Math.min(map.height - 1, Math.ceil((camY + SCREEN_H) / TILE_SIZE));

    for (let ty = minTY; ty <= maxTY; ty++) {
      for (let tx = minTX; tx <= maxTX; tx++) {
        let tile = map.tiles[ty][tx];
        if (tile === 'gate_closed') {
          const gate = this.getGateAt(tx, ty);
          if (gate && this.isGateUnlocked(gate)) {
            tile = 'gate_open';
          }
        }
        drawTile(ctx, tile, map.theme, tx * TILE_SIZE - camX, ty * TILE_SIZE - camY, tileAnimFrame);
      }
    }

    // 2. Ground-layer atmosphere (lamp pools, water glints, cloud shadows, dust puffs, swap sparkles)
    this.atmosphere.renderGroundEffects(ctx, map, camX, camY, this.animTimer);

    // 3. Collect drawable entities for Y-sorting
    interface DrawActor {
      sortY: number;
      draw: () => void;
    }
    const actors: DrawActor[] = [];

    const walkFrame = this.moving
      ? this.moveProgress < 0.5
        ? this.stepToggle
          ? 1
          : 2
        : 0
      : 0;

    // Leader
    const leaderMember = this.getLeaderMember();
    const hopOffset =
      this.swapHopTimer > 0
        ? -Math.round(Math.sin((this.swapHopTimer / 0.28) * Math.PI) * 5.5)
        : 0;
    actors.push({
      sortY: lerpY,
      draw: () => {
        drawOverworldSprite(
          ctx,
          leaderMember.appearance,
          this.leaderDir,
          walkFrame,
          Math.round(lerpX * TILE_SIZE - camX),
          Math.round(lerpY * TILE_SIZE - camY - 8 + hopOffset),
          leaderMember.customSpriteSheetUrl
        );
      },
    });

    // Follower
    const followerMember = this.getFollowerMember();
    if (fLerpX !== lerpX || fLerpY !== lerpY) {
      actors.push({
        sortY: fLerpY,
        draw: () => {
          drawOverworldSprite(
            ctx,
            followerMember.appearance,
            this.followerDir,
            walkFrame,
            Math.round(fLerpX * TILE_SIZE - camX),
            Math.round(fLerpY * TILE_SIZE - camY - 8),
            followerMember.customSpriteSheetUrl
          );
        },
      });
    }

    // NPCs on current map
    const npcs = this.world.npcs.filter((n) => n.mapId === map.id);
    for (const npc of npcs) {
      const bob = Math.sin(this.animTimer * 3.6 + npc.x * 1.3 + npc.y * 0.7) * 1.3;
      actors.push({
        sortY: npc.y,
        draw: () => {
          const sx = npc.x * TILE_SIZE - camX;
          const sy = npc.y * TILE_SIZE - camY - 8;
          drawOverworldSprite(ctx, npc.appearance, npc.dir, 0, sx, sy);

          if (npc.role === 'cameo' && npc.partnerAppearance) {
            drawOverworldSprite(ctx, npc.partnerAppearance, npc.dir, 0, sx + TILE_SIZE, sy);
            this.drawTag(ctx, sx + 12, sy - 10 + bob, '♥', '#ff7096');
          } else if (npc.role === 'main' || npc.role === 'boss') {
            const won = npc.badgeId ? this.save.badges.includes(npc.badgeId) : this.save.bossDefeated;
            this.drawTag(
              ctx,
              sx + 4,
              sy - 11 + bob,
              won ? '✓' : npc.role === 'boss' ? '★' : '!',
              won ? '#57d978' : npc.role === 'boss' ? '#ffd045' : '#ff5a5a'
            );
          } else if (npc.role === 'secondary') {
            this.drawTag(ctx, sx + 4, sy - 10 + bob, '?', '#7cc4ff');
          } else if (npc.role === 'guest') {
            this.drawTag(ctx, sx + 4, sy - 10 + bob, '…', '#f4ce76');
          } else if (npc.role === 'gatekeeper') {
            const gate = this.world.gates.find((g) => g.id === npc.gateId);
            if (gate && !this.isGateUnlocked(gate)) {
              this.drawTag(ctx, sx + 4, sy - 11 + bob, `${gate.requiredBadges}`, '#ff944d');
            }
          }
        },
      });
    }

    actors.sort((a, b) => a.sortY - b.sortY);
    for (const actor of actors) {
      actor.draw();
    }

    // 4. Elegant subtle landmark building nameplates & completion indicators on overworld
    if (!map.isInterior) {
      this.renderLandmarkNameplates(ctx, camX, camY);
    }

    // 5. Air-layer atmosphere (searchlights, autumn leaves, carnival confetti, steam, curtains, safelight)
    this.atmosphere.renderAirEffects(ctx, map, camX, camY, this.animTimer);

    // 6. Sleek Top HUD
    this.renderHud(ctx, leaderMember);

    // Toast notification
    if (this.toastTimer > 0 && this.toastMessage) {
      ctx.save();
      ctx.font = '600 8.2px system-ui, -apple-system, "Segoe UI", sans-serif';
      const tw = Math.ceil(ctx.measureText(this.toastMessage).width) + 22;
      const tx = Math.floor((SCREEN_W - tw) / 2);
      const toastGrad = ctx.createLinearGradient(0, 26, 0, 41);
      toastGrad.addColorStop(0, 'rgba(22, 19, 34, 0.94)');
      toastGrad.addColorStop(1, 'rgba(13, 12, 22, 0.92)');
      ctx.fillStyle = toastGrad;
      safeRoundRectFill(ctx, tx, 26, tw, 15, 7.5);
      ctx.strokeStyle = 'rgba(244, 206, 118, 0.72)';
      ctx.lineWidth = 0.85;
      safeRoundRectStroke(ctx, tx + 0.4, 26.4, tw - 0.8, 14.2, 7.1);
      ctx.fillStyle = '#fff6dc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.toastMessage, SCREEN_W / 2, 33.8);
      ctx.restore();
    }

    // Door fade overlay
    if (this.fadeAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, this.fadeAlpha).toFixed(2)})`;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
  }

  private renderLandmarkNameplates(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number
  ): void {
    const bob = Math.sin(this.animTimer * 3.0) * 1.1;
    const accent = THEME_ACCENT[this.world.modeId];

    ctx.save();
    for (const b of this.world.buildings) {
      const won = b.isBoss
        ? this.save.bossDefeated
        : this.save.badges.includes(b.badgeId);
      const centerX = b.doorX * TILE_SIZE - camX + 8;
      const roofY = (b.doorY - (b.isBoss ? 4 : 3)) * TILE_SIZE - camY;

      if (centerX < -60 || centerX > SCREEN_W + 60 || roofY < 10 || roofY > SCREEN_H + 30) {
        continue;
      }

      const shortLabel = formatLandmarkShortLabel(b.name);
      ctx.font = '600 6px system-ui, -apple-system, "Segoe UI", sans-serif';
      const textW = Math.ceil(ctx.measureText(shortLabel).width);
      const pillW = Math.min(148, textW + 22);
      const pillH = 12;
      const px = Math.round(centerX - pillW / 2);
      const py = Math.round(roofY - 12 + bob * 0.5);

      // Subtle translucent dark-glass nameplate
      ctx.fillStyle = 'rgba(14, 18, 32, 0.84)';
      safeRoundRectFill(ctx, px, py, pillW, pillH, 3.5);
      ctx.strokeStyle = won ? '#57d978' : b.isBoss ? '#ffd045' : accent;
      ctx.lineWidth = 0.8;
      safeRoundRectStroke(ctx, px + 0.4, py + 0.4, pillW - 0.8, pillH - 0.8, 3.5);

      // Status badge circle on left of pill with generous breathing room before label
      const statusCol = won ? '#57d978' : b.isBoss ? '#ffd045' : '#ff5e5e';
      const statusSym = won ? '✓' : b.isBoss ? '★' : '!';
      ctx.fillStyle = statusCol;
      ctx.beginPath();
      ctx.arc(px + 7.2, py + 6, 3.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#111420';
      ctx.font = 'bold 5.8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(statusSym, px + 7.2, py + 6.3);

      // Crisp building label
      ctx.fillStyle = won ? '#d9ffe2' : '#fff8e8';
      ctx.font = '600 6px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(shortLabel, px + 14.5, py + 6.2);
    }
    ctx.restore();
  }

  private drawTag(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    symbol: string,
    color: string
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 18, 30, 0.9)';
    safeRoundRectFill(ctx, x - 0.5, y - 0.5, 10, 11, 2.5);
    ctx.fillStyle = color;
    safeRoundRectFill(ctx, x + 0.5, y + 0.5, 8, 9, 2);
    ctx.fillStyle = '#111420';
    ctx.font = 'bold 6.8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, x + 4.5, y + 5.2);
    ctx.restore();
  }

  private renderHud(ctx: CanvasRenderingContext2D, leader: FamilyMember): void {
    const hudTheme = THEME_HUD_STYLE[this.world.modeId];
    const hudH = 21;
    ctx.save();

    // Soft floating drop shadow beneath HUD bar
    const shadowGrad = ctx.createLinearGradient(0, hudH, 0, hudH + 4);
    shadowGrad.addColorStop(0, 'rgba(4, 4, 10, 0.36)');
    shadowGrad.addColorStop(1, 'rgba(4, 4, 10, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, hudH, SCREEN_W, 4);

    // Warm dark-glass gradient bar harmonizing with the outer Collector-Edition frame
    const hudGrad = ctx.createLinearGradient(0, 0, 0, hudH);
    hudGrad.addColorStop(0, hudTheme.bgTop);
    hudGrad.addColorStop(1, hudTheme.bgBottom);
    ctx.fillStyle = hudGrad;
    ctx.fillRect(0, 0, SCREEN_W, hudH);

    // Subtle warm center champagne luster
    const lusterGrad = ctx.createLinearGradient(0, 0, SCREEN_W, 0);
    lusterGrad.addColorStop(0, 'rgba(244, 206, 118, 0)');
    lusterGrad.addColorStop(0.5, 'rgba(244, 206, 118, 0.06)');
    lusterGrad.addColorStop(1, 'rgba(244, 206, 118, 0)');
    ctx.fillStyle = lusterGrad;
    ctx.fillRect(0, 0, SCREEN_W, hudH);

    // Delicate inner top sheen catching the brushed-gold screen rim
    ctx.fillStyle = 'rgba(255, 245, 214, 0.14)';
    ctx.fillRect(0, 0, SCREEN_W, 0.6);

    // Delicate brushed-gold hairline bottom trim matching outer frame
    const trimGrad = ctx.createLinearGradient(0, 0, SCREEN_W, 0);
    trimGrad.addColorStop(0, 'rgba(244, 206, 118, 0.32)');
    trimGrad.addColorStop(0.25, hudTheme.trimMid);
    trimGrad.addColorStop(0.5, 'rgba(255, 244, 208, 0.88)');
    trimGrad.addColorStop(0.75, hudTheme.trimMid);
    trimGrad.addColorStop(1, 'rgba(244, 206, 118, 0.32)');
    ctx.fillStyle = trimGrad;
    ctx.fillRect(0, hudH - 0.9, SCREEN_W, 0.9);

    // Two crisp gilded miniature portrait lockets side-by-side for the duo!
    const [memA, memB] = this.pairMembers;
    const frameGrad = ctx.createLinearGradient(3, 2, 3, 19);
    frameGrad.addColorStop(0, '#fff4cf');
    frameGrad.addColorStop(0.5, hudTheme.trimMid);
    frameGrad.addColorStop(1, '#a97a2c');

    const drawHudLocket = (lx: number, member: FamilyMember) => {
      ctx.fillStyle = 'rgba(8, 8, 16, 0.92)';
      safeRoundRectFill(ctx, lx, 2, 17, 17, 3);
      drawPortrait(ctx, member.appearance, member.portrait, lx + 1, 3, 15, member.customPortraitUrl);
      ctx.strokeStyle = frameGrad;
      ctx.lineWidth = 0.95;
      safeRoundRectStroke(ctx, lx + 0.4, 2.4, 16.2, 16.2, 2.6);
    };
    drawHudLocket(3, memA);
    drawHudLocket(22, memB);

    // Compute right-hand badge pill first so left text never collides
    const pillY = 3.6;
    const pillH = 13.4;
    const pillR = pillH / 2;

    const badgeStr = `★ ${this.save.badges.length}/12${this.save.bossDefeated ? ' ♛' : ''}`;
    ctx.font = '700 8px system-ui, -apple-system, "Segoe UI", sans-serif';
    const bw = Math.ceil(ctx.measureText(badgeStr).width) + 12;
    const bx = SCREEN_W - 4 - bw;

    // Duo names + golden diamond separator + district name (gracefully clipped if long)
    const nameX = 43.5;
    const maxTextRight = bx - 6;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const duoLabel = `${memA.name} & ${memB.name}`;
    ctx.font = '700 8px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = '#fff7e4';
    ctx.fillText(duoLabel, nameX, 10.6);
    const nameW = ctx.measureText(duoLabel).width;

    const sepX = nameX + nameW + 4;
    ctx.font = '700 5.5px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(244, 206, 118, 0.85)';
    ctx.fillText('◆', sepX, 10.5);

    const distX = sepX + 7.5;
    const availW = Math.max(24, maxTextRight - distX);
    ctx.font = '500 7.7px system-ui, -apple-system, "Segoe UI", sans-serif';
    let districtName = this.getCurrentDistrictName();
    if (ctx.measureText(districtName).width > availW) {
      while (districtName.length > 4 && ctx.measureText(`${districtName}…`).width > availW) {
        districtName = districtName.slice(0, -1);
      }
      districtName = `${districtName}…`;
    }
    ctx.fillStyle = '#e3d9c5';
    ctx.fillText(districtName, distX, 10.6);
    void leader;

    // Refined gilded badge pill
    const badgeGrad = ctx.createLinearGradient(0, pillY, 0, pillY + pillH);
    badgeGrad.addColorStop(0, hudTheme.pillTint);
    badgeGrad.addColorStop(1, 'rgba(176, 126, 42, 0.14)');
    ctx.fillStyle = badgeGrad;
    safeRoundRectFill(ctx, bx, pillY, bw, pillH, pillR);
    ctx.strokeStyle = 'rgba(244, 206, 118, 0.66)';
    ctx.lineWidth = 0.8;
    safeRoundRectStroke(ctx, bx + 0.35, pillY + 0.35, bw - 0.7, pillH - 0.7, pillR);
    ctx.font = '700 8px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff0be';
    ctx.fillText(badgeStr, bx + bw / 2, 10.6);

    ctx.restore();
  }
}
