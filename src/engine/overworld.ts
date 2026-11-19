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
} from '../types';
import { InputManager } from './input';
import { drawOverworldSprite, drawPortrait } from './pixelRenderer';
import { drawTile, isTileWalkable, TILE_SIZE } from './tilesetRenderer';

export const SCREEN_W = 384;
export const SCREEN_H = 240;

const DIR_DELTA: Record<Direction, { dx: number; dy: number }> = {
  down: { dx: 0, dy: 1 },
  up: { dx: 0, dy: -1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

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
  }

  getCurrentMap(): MapData {
    return this.world.maps[this.mapId];
  }

  getLeaderMember(): FamilyMember {
    return this.pairMembers[this.save.leaderIndex];
  }

  getFollowerMember(): FamilyMember {
    return this.pairMembers[this.save.leaderIndex === 0 ? 1 : 0];
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

  swapLeader(): void {
    this.save.leaderIndex = this.save.leaderIndex === 0 ? 1 : 0;
    this.swapHopTimer = 0.28;
    soundEngine.playSwap();
    this.showToast(`${this.getLeaderMember().name} passe en tête !`, 1.6);
  }

  update(dt: number, input: InputManager): void {
    this.animTimer += dt;
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

    if (input.justPressed('swap')) {
      this.swapLeader();
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
      this.tryStartMove(dir);
    }
  }

  private tryStartMove(dir: Direction): void {
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
  }

  private tryInteract(): void {
    const map = this.getCurrentMap();
    const { dx, dy } = DIR_DELTA[this.leaderDir];
    const tx = this.leaderX + dx;
    const ty = this.leaderY + dy;

    const npc = this.getNpcAt(map.id, tx, ty);
    if (npc) {
      // Turn NPC toward player if not cameo pair
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
    const waterFrame = Math.floor(this.animTimer * 2.2) % 2;

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

    // Background fill (black in interiors, forest dark outside)
    ctx.fillStyle = map.isInterior ? '#11131d' : '#1b3623';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // Draw visible tiles
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
        drawTile(ctx, tile, map.theme, tx * TILE_SIZE - camX, ty * TILE_SIZE - camY, waterFrame);
      }
    }

    // Collect drawable entities for Y-sorting
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
    const hopOffset = this.swapHopTimer > 0 ? -Math.round(Math.sin((this.swapHopTimer / 0.28) * Math.PI) * 5) : 0;
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

    // Follower (only draw if not sitting directly under leader)
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
      const bob = Math.floor((this.animTimer * 2 + npc.x) % 2);
      actors.push({
        sortY: npc.y,
        draw: () => {
          const sx = npc.x * TILE_SIZE - camX;
          const sy = npc.y * TILE_SIZE - camY - 8;
          drawOverworldSprite(ctx, npc.appearance, npc.dir, 0, sx, sy);

          if (npc.role === 'cameo' && npc.partnerAppearance) {
            drawOverworldSprite(ctx, npc.partnerAppearance, npc.dir, 0, sx + TILE_SIZE, sy);
            // Warm heart/star cameo tag
            this.drawTag(ctx, sx + 12, sy - 9 + bob, '♥', '#ff7096');
          } else if (npc.role === 'main' || npc.role === 'boss') {
            const won = npc.badgeId ? this.save.badges.includes(npc.badgeId) : this.save.bossDefeated;
            this.drawTag(
              ctx,
              sx + 4,
              sy - 10 + bob,
              won ? '✓' : npc.role === 'boss' ? '★' : '!',
              won ? '#57d978' : npc.role === 'boss' ? '#ffd045' : '#ff5a5a'
            );
          } else if (npc.role === 'secondary') {
            this.drawTag(ctx, sx + 4, sy - 9 + bob, '?', '#7cc4ff');
          } else if (npc.role === 'gatekeeper') {
            const gate = this.world.gates.find((g) => g.id === npc.gateId);
            if (gate && !this.isGateUnlocked(gate)) {
              this.drawTag(ctx, sx + 4, sy - 10 + bob, `${gate.requiredBadges}`, '#ff944d');
            }
          }
        },
      });
    }

    // Building completion indicators on overworld roofs/doors
    if (!map.isInterior) {
      const bob = Math.floor((this.animTimer * 2) % 2);
      for (const b of this.world.buildings) {
        const won = b.isBoss
          ? this.save.bossDefeated
          : this.save.badges.includes(b.badgeId);
        const sx = b.doorX * TILE_SIZE - camX + 4;
        const sy = (b.doorY - 2) * TILE_SIZE - camY - 4 + bob;
        if (sx >= -16 && sx <= SCREEN_W + 16 && sy >= -16 && sy <= SCREEN_H + 16) {
          this.drawTag(
            ctx,
            sx,
            sy,
            won ? '✓' : b.isBoss ? '★' : '!',
            won ? '#57d978' : b.isBoss ? '#ffd045' : '#ff5a5a'
          );
        }
      }
    }

    actors.sort((a, b) => a.sortY - b.sortY);
    for (const actor of actors) {
      actor.draw();
    }

    // Compact GBA Top HUD
    this.renderHud(ctx, leaderMember);

    // Toast notification (e.g. leader swapped)
    if (this.toastTimer > 0 && this.toastMessage) {
      ctx.save();
      ctx.font = 'bold 9px sans-serif';
      const tw = ctx.measureText(this.toastMessage).width + 18;
      const tx = Math.floor((SCREEN_W - tw) / 2);
      ctx.fillStyle = 'rgba(18, 22, 38, 0.9)';
      ctx.fillRect(tx, 26, tw, 16);
      ctx.strokeStyle = '#f4c542';
      ctx.strokeRect(tx + 0.5, 26.5, tw - 1, 15);
      ctx.fillStyle = '#fff5d1';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.toastMessage, SCREEN_W / 2, 34);
      ctx.restore();
    }

    // Door fade overlay
    if (this.fadeAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, this.fadeAlpha).toFixed(2)})`;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
  }

  private drawTag(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    symbol: string,
    color: string
  ): void {
    ctx.save();
    ctx.fillStyle = '#151824';
    ctx.fillRect(x, y, 9, 10);
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, 7, 8);
    ctx.fillStyle = '#111420';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, x + 4.5, y + 5.5);
    ctx.restore();
  }

  private renderHud(ctx: CanvasRenderingContext2D, leader: FamilyMember): void {
    ctx.save();
    ctx.fillStyle = 'rgba(16, 20, 34, 0.86)';
    ctx.fillRect(0, 0, SCREEN_W, 20);
    ctx.fillStyle = '#f4c542';
    ctx.fillRect(0, 20, SCREEN_W, 1);

    // Mini portrait (16x16)
    drawPortrait(ctx, leader.appearance, leader.portrait, 3, 2, 16, leader.customPortraitUrl);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const districtName = this.getCurrentDistrictName();
    ctx.fillText(`${leader.name} • ${districtName}`, 23, 10);

    // Badge count pill on right
    const badgeStr = `Badges ${this.save.badges.length}/12${this.save.bossDefeated ? ' ★' : ''}`;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffe27a';
    ctx.fillText(badgeStr, SCREEN_W - 62, 10);

    // Menu hint
    ctx.fillStyle = '#9db3e6';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('[Échap] Menu', SCREEN_W - 6, 10);
    ctx.restore();
  }
}
