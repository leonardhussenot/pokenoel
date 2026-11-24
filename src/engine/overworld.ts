import { soundEngine } from '../audio/soundEngine';
import {
  Direction,
  DistrictGate,
  FamilyMember,
  FamilyTeamMembers,
  MapData,
  ModeSaveData,
  NpcEntity,
  SignPost,
  WorldDefinition,
  WorldTheme,
} from '../types';
import { InputManager } from './input';
import { drawOverworldSprite, drawPortrait } from './pixelRenderer';
import { secondaryHasPendingHint } from './secondaryHints';
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
  sd: '#2ec4d6',
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
  sd: {
    bgTop: 'rgba(14, 27, 40, 0.94)',
    bgBottom: 'rgba(9, 18, 28, 0.90)',
    trimMid: '#58d8e6',
    pillTint: 'rgba(46, 196, 214, 0.22)',
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

  private follower2X: number;
  private follower2Y: number;
  private follower2Dir: Direction = 'down';

  private moving = false;
  private moveProgress = 0; // 0..1
  private moveStartX = 0;
  private moveStartY = 0;
  private followerStartX = 0;
  private followerStartY = 0;
  private follower2StartX = 0;
  private follower2StartY = 0;
  private stepToggle = false;
  private bumpCooldown = 0;
  private warpCooldown = 0;
  private fadeAlpha = 0;
  private animTimer = 0;
  private toastMessage = '';
  private toastTimer = 0;
  private atmosphere = new WorldAtmosphere();
  private autoPath: Direction[] = [];
  private autoTargetTile: { x: number; y: number } | null = null;
  private autoInteractTarget: { x: number; y: number } | null = null;
  private tapRipple: { x: number; y: number; timer: number } | null = null;

  constructor(
    private world: WorldDefinition,
    private pairMembers: FamilyTeamMembers,
    private save: ModeSaveData,
    private callbacks: OverworldCallbacks
  ) {
    const startMap = world.maps[save.lastMapId] ? save.lastMapId : world.overworldId;
    this.mapId = startMap;
    const candidateMap = world.maps[startMap];
    const validPos =
      Number.isInteger(save.lastX) &&
      Number.isInteger(save.lastY) &&
      save.lastX >= 0 &&
      save.lastX < candidateMap.width &&
      save.lastY >= 0 &&
      save.lastY < candidateMap.height &&
      this.canStandOnTile(candidateMap, save.lastX, save.lastY);

    if (!validPos) {
      this.mapId = world.overworldId;
    }
    const map = world.maps[this.mapId];
    this.leaderX = validPos ? save.lastX : world.spawnX;
    this.leaderY = validPos ? save.lastY : world.spawnY;
    this.followerX = this.leaderX;
    this.followerY = Math.min(map.height - 2, this.leaderY + 1);
    if (!this.canStandOnTile(map, this.followerX, this.followerY)) {
      this.followerX = this.leaderX;
      this.followerY = this.leaderY;
    }
    this.follower2X = this.followerX;
    this.follower2Y = Math.min(map.height - 2, this.followerY + 1);
    if (
      (this.follower2X === this.followerX && this.follower2Y === this.followerY) ||
      !this.canStandOnTile(map, this.follower2X, this.follower2Y)
    ) {
      this.follower2X = this.followerX;
      this.follower2Y = this.followerY;
    }
    this.moveStartX = this.leaderX;
    this.moveStartY = this.leaderY;
    this.followerStartX = this.followerX;
    this.followerStartY = this.followerY;
    this.follower2StartX = this.follower2X;
    this.follower2StartY = this.follower2Y;
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

  private cancelAutoWalk(): void {
    this.autoPath = [];
    this.autoTargetTile = null;
    this.autoInteractTarget = null;
  }

  private computeCamera(map: MapData, lerpX: number, lerpY: number): { camX: number; camY: number } {
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
    return { camX, camY };
  }

  private findPathToGoals(
    map: MapData,
    startX: number,
    startY: number,
    goals: { x: number; y: number }[],
    maxNodes = 420
  ): { path: Direction[]; target: { x: number; y: number } } | null {
    const goalSet = new Set(goals.map((g) => `${g.x},${g.y}`));
    if (goalSet.size === 0) return null;
    if (goalSet.has(`${startX},${startY}`)) {
      return { path: [], target: { x: startX, y: startY } };
    }

    const dirs: { dir: Direction; dx: number; dy: number }[] = [
      { dir: 'up', dx: 0, dy: -1 },
      { dir: 'down', dx: 0, dy: 1 },
      { dir: 'left', dx: -1, dy: 0 },
      { dir: 'right', dx: 1, dy: 0 },
    ];

    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
    const visited = new Set<string>([`${startX},${startY}`]);
    const parent = new Map<string, { prevKey: string; dir: Direction }>();
    let head = 0;

    while (head < queue.length && visited.size < maxNodes) {
      const curr = queue[head++];
      const currKey = `${curr.x},${curr.y}`;
      for (const { dir, dx, dy } of dirs) {
        const nx = curr.x + dx;
        const ny = curr.y + dy;
        const nKey = `${nx},${ny}`;
        if (visited.has(nKey)) continue;
        if (!this.canStandOnTile(map, nx, ny)) continue;
        visited.add(nKey);
        parent.set(nKey, { prevKey: currKey, dir });
        if (goalSet.has(nKey)) {
          const path: Direction[] = [];
          let trace = nKey;
          while (trace !== `${startX},${startY}`) {
            const step = parent.get(trace);
            if (!step) break;
            path.push(step.dir);
            trace = step.prevKey;
          }
          path.reverse();
          return { path, target: { x: nx, y: ny } };
        }
        queue.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  private handleOverworldTap(tapX: number, tapY: number): void {
    // Ignore taps inside the top HUD bar
    if (tapY <= 21) return;

    const map = this.getCurrentMap();
    const lerpX = this.moving
      ? this.moveStartX + (this.leaderX - this.moveStartX) * this.moveProgress
      : this.leaderX;
    const lerpY = this.moving
      ? this.moveStartY + (this.leaderY - this.moveStartY) * this.moveProgress
      : this.leaderY;
    const { camX, camY } = this.computeCamera(map, lerpX, lerpY);

    const tx = Math.floor((tapX + camX) / TILE_SIZE);
    const ty = Math.floor((tapY + camY) / TILE_SIZE);
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return;

    // 1. Check if player tapped an NPC (including their upper sprite head tile), sign, or locked gate
    const tappedNpc = this.getNpcAt(map.id, tx, ty) ?? this.getNpcAt(map.id, tx, ty + 1);
    const tappedSign = map.signs.find((s) => s.x === tx && s.y === ty);
    const tappedGate = this.getGateAt(tx, ty);
    const isLockedGate = Boolean(tappedGate && !this.isGateUnlocked(tappedGate));

    if (tappedNpc || tappedSign || isLockedGate) {
      const ix = tappedNpc ? (tappedNpc.role === 'cameo' && tx === tappedNpc.x + 1 ? tappedNpc.x + 1 : tappedNpc.x) : tx;
      const iy = tappedNpc ? tappedNpc.y : ty;
      const adjGoals = [
        { x: ix, y: iy + 1 },
        { x: ix, y: iy - 1 },
        { x: ix - 1, y: iy },
        { x: ix + 1, y: iy },
      ].filter((g) => this.canStandOnTile(map, g.x, g.y));

      const res = this.findPathToGoals(map, this.leaderX, this.leaderY, adjGoals);
      if (res) {
        this.autoPath = res.path;
        this.autoTargetTile = res.target;
        this.autoInteractTarget = { x: ix, y: iy };
        this.tapRipple = { x: ix, y: iy, timer: 0.55 };
        if (this.autoPath.length === 0 && !this.moving) {
          this.faceTile(ix, iy);
          this.autoInteractTarget = null;
          this.autoTargetTile = null;
          this.tryInteract();
        }
      }
      return;
    }

    // 2. If player tapped a building roof/wall/nameplate on overworld, walk straight into its door!
    let destX = tx;
    let destY = ty;
    if (!this.canStandOnTile(map, destX, destY) && !map.isInterior) {
      const bld = this.world.buildings.find(
        (b) => Math.abs(tx - b.doorX) <= 1 && ty >= b.doorY - 3 && ty <= b.doorY
      );
      if (bld && this.canStandOnTile(map, bld.doorX, bld.doorY)) {
        destX = bld.doorX;
        destY = bld.doorY;
      }
    }

    if (!this.canStandOnTile(map, destX, destY)) return;

    const res = this.findPathToGoals(map, this.leaderX, this.leaderY, [{ x: destX, y: destY }]);
    if (res && res.path.length > 0) {
      this.autoPath = res.path;
      this.autoTargetTile = res.target;
      this.autoInteractTarget = null;
      this.tapRipple = { x: destX, y: destY, timer: 0.55 };
    }
  }

  private faceTile(tx: number, ty: number): void {
    const dx = tx - this.leaderX;
    const dy = ty - this.leaderY;
    if (Math.abs(dx) >= Math.abs(dy)) {
      this.leaderDir = dx >= 0 ? 'right' : 'left';
    } else {
      this.leaderDir = dy >= 0 ? 'down' : 'up';
    }
  }

  update(dt: number, input: InputManager): void {
    this.animTimer += dt;
    this.atmosphere.update(dt, this.getCurrentMap());

    if (this.bumpCooldown > 0) this.bumpCooldown -= dt;
    if (this.warpCooldown > 0) this.warpCooldown -= dt;
    if (this.fadeAlpha > 0) this.fadeAlpha = Math.max(0, this.fadeAlpha - dt * 3.8);
    if (this.toastTimer > 0) this.toastTimer = Math.max(0, this.toastTimer - dt);
    if (this.tapRipple) {
      this.tapRipple.timer -= dt;
      if (this.tapRipple.timer <= 0) this.tapRipple = null;
    }

    if (input.justPressed('menu') || input.justPressed('b')) {
      this.cancelAutoWalk();
      soundEngine.playConfirm();
      this.callbacks.onOpenPauseMenu();
      return;
    }

    // Consume tap-to-walk / tap-to-interact anytime on the overworld
    const tap = input.consumeTap();
    if (tap) {
      this.handleOverworldTap(tap.x, tap.y);
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
        const warped = this.checkWarp();
        if (warped) return;
      } else {
        return;
      }
    }

    // Interact with A button
    if (input.justPressed('a')) {
      this.cancelAutoWalk();
      this.tryInteract();
      return;
    }

    // Manual movement cancels any tap-to-walk path
    const dir = input.getDirectionHeld();
    if (dir) {
      this.cancelAutoWalk();
      this.tryStartMove(dir, input.isDown('run'));
      return;
    }

    // Follow active tap-to-walk path
    if (this.autoPath.length > 0) {
      const nextDir = this.autoPath.shift()!;
      this.tryStartMove(nextDir, input.isDown('run'));
      if (!this.moving) {
        this.cancelAutoWalk();
      }
      return;
    }

    // Arrived at tap-to-interact target!
    if (this.autoInteractTarget) {
      const target = this.autoInteractTarget;
      this.cancelAutoWalk();
      this.faceTile(target.x, target.y);
      this.tryInteract();
    } else if (this.autoTargetTile) {
      this.autoTargetTile = null;
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
    this.follower2StartX = this.follower2X;
    this.follower2StartY = this.follower2Y;

    // 2nd follower (if trio) steps onto 1st follower's vacated tile
    const prevFollowerX = this.followerX;
    const prevFollowerY = this.followerY;
    const prevLeaderX = this.leaderX;
    const prevLeaderY = this.leaderY;
    const followerWillMove = prevLeaderX !== this.followerX || prevLeaderY !== this.followerY;

    if (followerWillMove && this.pairMembers.length >= 3) {
      if (prevFollowerX !== this.follower2X || prevFollowerY !== this.follower2Y) {
        const f2dx = prevFollowerX - this.follower2X;
        const f2dy = prevFollowerY - this.follower2Y;
        if (Math.abs(f2dx) + Math.abs(f2dy) === 1) {
          if (f2dx > 0) this.follower2Dir = 'right';
          else if (f2dx < 0) this.follower2Dir = 'left';
          else if (f2dy > 0) this.follower2Dir = 'down';
          else if (f2dy < 0) this.follower2Dir = 'up';
          this.follower2X = prevFollowerX;
          this.follower2Y = prevFollowerY;
        } else {
          this.follower2X = prevFollowerX;
          this.follower2Y = prevFollowerY;
          this.follower2Dir = this.followerDir;
        }
      }
    }

    // 1st follower steps onto leader's vacated tile
    if (followerWillMove) {
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

  private checkWarp(): boolean {
    if (this.warpCooldown > 0) return false;
    const map = this.getCurrentMap();
    const warp = map.warps.find((w) => w.x === this.leaderX && w.y === this.leaderY);
    if (!warp) return false;

    const targetMap = this.world.maps[warp.targetMapId];
    if (!targetMap) return false;

    this.cancelAutoWalk();
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
    this.follower2X = this.followerX;
    this.follower2Y = this.followerY;
    this.follower2StartX = this.follower2X;
    this.follower2StartY = this.follower2Y;
    this.follower2Dir = warp.targetDir;

    this.save.lastMapId = this.mapId;
    this.save.lastX = this.leaderX;
    this.save.lastY = this.leaderY;
    this.warpCooldown = 0.22;
    this.fadeAlpha = 1;
    this.atmosphere.resetForMap(targetMap);
    return true;
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

    const f2LerpX = this.moving
      ? this.follower2StartX + (this.follower2X - this.follower2StartX) * this.moveProgress
      : this.follower2X;
    const f2LerpY = this.moving
      ? this.follower2StartY + (this.follower2Y - this.follower2StartY) * this.moveProgress
      : this.follower2Y;

    // Camera calculation
    const { camX, camY } = this.computeCamera(map, lerpX, lerpY);

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

    // 2. Ground-layer atmosphere (lamp pools, water glints, cloud shadows, dust puffs)
    this.atmosphere.renderGroundEffects(ctx, map, camX, camY, this.animTimer);

    // 2b. Tap-to-walk destination marker & ripple
    if (this.autoTargetTile || this.tapRipple) {
      ctx.save();
      if (this.autoTargetTile) {
        const tx = this.autoTargetTile.x * TILE_SIZE - camX + 8;
        const ty = this.autoTargetTile.y * TILE_SIZE - camY + 8;
        const pulse = 0.65 + 0.35 * Math.sin(this.animTimer * 6.5);
        ctx.strokeStyle = `rgba(255, 224, 118, ${(0.82 * pulse).toFixed(2)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(tx, ty + 2, 5.2, 3.2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (this.tapRipple) {
        const rx = this.tapRipple.x * TILE_SIZE - camX + 8;
        const ry = this.tapRipple.y * TILE_SIZE - camY + 8;
        const progress = 1 - this.tapRipple.timer / 0.55;
        ctx.strokeStyle = `rgba(255, 240, 170, ${(0.75 * (1 - progress)).toFixed(2)})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(rx, ry + 2, 3.5 + progress * 7, 2.2 + progress * 4.2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

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
    actors.push({
      sortY: lerpY,
      draw: () => {
        drawOverworldSprite(
          ctx,
          leaderMember.appearance,
          this.leaderDir,
          walkFrame,
          Math.round(lerpX * TILE_SIZE - camX),
          Math.round(lerpY * TILE_SIZE - camY - 8),
          leaderMember.customSpriteSheetUrl
        );
      },
    });

    // Follower 1
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

    // Follower 2 (for 3-member trio)
    const follower2Member = this.pairMembers[2];
    if (
      follower2Member &&
      (f2LerpX !== fLerpX || f2LerpY !== fLerpY) &&
      (f2LerpX !== lerpX || f2LerpY !== lerpY)
    ) {
      actors.push({
        sortY: f2LerpY,
        draw: () => {
          drawOverworldSprite(
            ctx,
            follower2Member.appearance,
            this.follower2Dir,
            walkFrame,
            Math.round(f2LerpX * TILE_SIZE - camX),
            Math.round(f2LerpY * TILE_SIZE - camY - 8),
            follower2Member.customSpriteSheetUrl
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
            const won =
              npc.role === 'boss'
                ? this.save.bossDefeated
                : npc.badgeId
                  ? this.save.badges.includes(npc.badgeId)
                  : false;
            this.drawTag(
              ctx,
              sx + 4,
              sy - 11 + bob,
              won ? '✓' : npc.role === 'boss' ? '★' : '!',
              won ? '#57d978' : npc.role === 'boss' ? '#ffd045' : '#ff5a5a'
            );
          } else if (npc.role === 'secondary') {
            const hasHint = secondaryHasPendingHint(npc, this.world, this.save);
            this.drawTag(ctx, sx + 4, sy - 10 + bob, '?', hasHint ? '#ffd045' : '#7cc4ff');
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

    // 4. Elegant subtle landmark building nameplates & unbeaten door crests on overworld
    if (!map.isInterior) {
      this.renderUnbeatenDoorCrests(ctx, camX, camY);
      this.renderLandmarkNameplates(ctx, camX, camY);
    }

    // 5. Air-layer atmosphere (searchlights, autumn leaves, carnival confetti, steam, curtains, safelight)
    this.atmosphere.renderAirEffects(ctx, map, camX, camY, this.animTimer);

    // 5b. Progressive Christmas Eve sky & gentle snowfall on overworld (0 -> 4 -> 8 -> 12 badges)
    if (!map.isInterior) {
      this.renderChristmasEveAmbiance(ctx, camX, camY, lerpX, lerpY);
    }

    // 6. Sleek Top HUD
    this.renderHud(ctx);

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

  private renderUnbeatenDoorCrests(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number
  ): void {
    const badgesCount = this.save.badges.length;
    ctx.save();
    for (const b of this.world.buildings) {
      const won = b.isBoss
        ? this.save.bossDefeated
        : this.save.badges.includes(b.badgeId);
      if (won) continue;
      if (b.isBoss && badgesCount < 12) continue;

      const cx = b.doorX * TILE_SIZE - camX + 8;
      const doorTopY = b.doorY * TILE_SIZE - camY;
      if (cx < -24 || cx > SCREEN_W + 24 || doorTopY < -20 || doorTopY > SCREEN_H + 24) {
        continue;
      }

      const pulse = 0.7 + 0.3 * Math.sin(this.animTimer * 4.2 + b.doorX * 0.7);
      const bob = Math.sin(this.animTimer * 3.4 + b.doorX) * 1.4;

      // Soft warm doorway threshold glow
      if (typeof ctx.createRadialGradient === 'function') {
        const doorGlow = ctx.createRadialGradient(cx, doorTopY + 9, 1, cx, doorTopY + 9, 14);
        doorGlow.addColorStop(0, `rgba(255, 224, 120, ${(0.28 * pulse).toFixed(2)})`);
        doorGlow.addColorStop(1, 'rgba(255, 210, 90, 0)');
        ctx.fillStyle = doorGlow;
        ctx.beginPath();
        ctx.arc(cx, doorTopY + 9, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      // Subtle floating golden crest diamond right above the doorway
      const crestY = doorTopY - 4 + bob;
      const r = b.isBoss ? 4.4 : 3.4;
      ctx.fillStyle = b.isBoss
        ? `rgba(255, 216, 74, ${(0.88 * pulse).toFixed(2)})`
        : `rgba(255, 210, 96, ${(0.82 * pulse).toFixed(2)})`;
      ctx.beginPath();
      ctx.moveTo(cx, crestY - r);
      ctx.lineTo(cx + r * 0.85, crestY);
      ctx.lineTo(cx, crestY + r);
      ctx.lineTo(cx - r * 0.85, crestY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 250, 224, 0.9)';
      ctx.lineWidth = 0.65;
      ctx.stroke();

      // Tiny inner sparkle dot
      ctx.fillStyle = '#fffdf0';
      ctx.fillRect(cx - 0.6, crestY - 0.6, 1.2, 1.2);
    }
    ctx.restore();
  }

  private renderChristmasEveAmbiance(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    lerpX: number,
    lerpY: number
  ): void {
    const badges = this.save.badges.length;
    if (badges < 4) return; // 0-3 badges: crisp bright winter afternoon

    ctx.save();

    if (badges < 8) {
      // 4-7 badges: warm golden sunset glow
      const sunset = ctx.createLinearGradient(0, 21, 0, SCREEN_H);
      sunset.addColorStop(0, 'rgba(255, 152, 68, 0.14)');
      sunset.addColorStop(0.55, 'rgba(232, 98, 108, 0.06)');
      sunset.addColorStop(1, 'rgba(42, 24, 68, 0.05)');
      ctx.fillStyle = sunset;
      ctx.fillRect(0, 21, SCREEN_W, SCREEN_H - 21);
    } else if (badges < 12) {
      // 8-11 badges: cozy blue-hour twilight + warm glowing doorways + gentle snow
      const twilight = ctx.createLinearGradient(0, 21, 0, SCREEN_H);
      twilight.addColorStop(0, 'rgba(22, 32, 78, 0.20)');
      twilight.addColorStop(1, 'rgba(16, 22, 54, 0.11)');
      ctx.fillStyle = twilight;
      ctx.fillRect(0, 21, SCREEN_W, SCREEN_H - 21);
    } else {
      // 12 badges: magical Christmas Eve starry night!
      const night = ctx.createLinearGradient(0, 21, 0, SCREEN_H);
      night.addColorStop(0, 'rgba(10, 16, 48, 0.28)');
      night.addColorStop(1, 'rgba(8, 12, 38, 0.17)');
      ctx.fillStyle = night;
      ctx.fillRect(0, 21, SCREEN_W, SCREEN_H - 21);

      // Subtle twinkling stars along the upper band
      for (let i = 0; i < 16; i++) {
        const sx = (i * 47 + 19) % SCREEN_W;
        const sy = 25 + ((i * 13) % 34);
        const tw = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(this.animTimer * 2.8 + i * 1.4));
        ctx.fillStyle = `rgba(255, 244, 196, ${tw.toFixed(2)})`;
        ctx.fillRect(sx, sy, i % 4 === 0 ? 1.4 : 1, i % 4 === 0 ? 1.4 : 1);
      }
    }

    // Warm festive lantern pools at building doors & gentle lantern around player (8+ badges)
    if (badges >= 8 && typeof ctx.createRadialGradient === 'function') {
      const prevComp = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'lighter';
      for (const b of this.world.buildings) {
        const lx = b.doorX * TILE_SIZE - camX + 8;
        const ly = b.doorY * TILE_SIZE - camY + 6;
        if (lx < -32 || lx > SCREEN_W + 32 || ly < -20 || ly > SCREEN_H + 32) continue;
        const rad = b.isBoss ? 30 : 22;
        const glow = ctx.createRadialGradient(lx, ly, 2, lx, ly, rad);
        glow.addColorStop(0, badges >= 12 ? 'rgba(255, 214, 124, 0.22)' : 'rgba(255, 214, 124, 0.14)');
        glow.addColorStop(1, 'rgba(255, 196, 92, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(lx, ly, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      // Cozy warm lantern halo around the player at 12 badges
      if (badges >= 12) {
        const px = lerpX * TILE_SIZE - camX + 8;
        const py = lerpY * TILE_SIZE - camY + 6;
        const pGlow = ctx.createRadialGradient(px, py, 3, px, py, 34);
        pGlow.addColorStop(0, 'rgba(255, 232, 164, 0.16)');
        pGlow.addColorStop(1, 'rgba(255, 216, 120, 0)');
        ctx.fillStyle = pGlow;
        ctx.beginPath();
        ctx.arc(px, py, 34, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = prevComp;
    }

    // Gentle Christmas Eve snowfall (8-11: light flurries, 12+: festive snow)
    if (badges >= 8) {
      const flakeCount = badges >= 12 ? 22 : 12;
      for (let i = 0; i < flakeCount; i++) {
        const speed = 10 + (i % 4) * 3.5;
        const fx =
          (i * 41 + Math.sin(this.animTimer * 1.1 + i * 1.7) * 10 + this.animTimer * 5 + SCREEN_W) %
          SCREEN_W;
        const fy = 22 + ((i * 29 + this.animTimer * speed) % (SCREEN_H - 22));
        const r = i % 3 === 0 ? 1.25 : 0.85;
        ctx.fillStyle = `rgba(255, 252, 245, ${badges >= 12 ? 0.55 : 0.36})`;
        ctx.beginPath();
        ctx.arc(fx, fy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
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

      if (centerX < -80 || centerX > SCREEN_W + 80 || roofY < 10 || roofY > SCREEN_H + 30) {
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
      ctx.fillText(shortLabel, px + 14.5, py + 6.2, pillW - 19);
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

  private renderHud(ctx: CanvasRenderingContext2D): void {
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

    // Two or three crisp gilded miniature portrait lockets side-by-side for the team!
    const members = this.pairMembers;
    const isTrio = members.length >= 3;
    const frameGrad = ctx.createLinearGradient(3, 2, 3, 19);
    frameGrad.addColorStop(0, '#fff4cf');
    frameGrad.addColorStop(0.5, hudTheme.trimMid);
    frameGrad.addColorStop(1, '#a97a2c');

    const locketStep = isTrio ? 18 : 19;
    const drawHudLocket = (lx: number, member: FamilyMember) => {
      ctx.fillStyle = 'rgba(8, 8, 16, 0.92)';
      safeRoundRectFill(ctx, lx, 2, 17, 17, 3);
      drawPortrait(ctx, member.appearance, member.portrait, lx + 1, 3, 15, member.customPortraitUrl);
      ctx.strokeStyle = frameGrad;
      ctx.lineWidth = 0.95;
      safeRoundRectStroke(ctx, lx + 0.4, 2.4, 16.2, 16.2, 2.6);
    };
    members.forEach((m, idx) => {
      drawHudLocket(3 + idx * locketStep, m);
    });

    // Compute right-hand badge pill first so left text never collides
    const pillY = 3.6;
    const pillH = 13.4;
    const pillR = pillH / 2;

    const badgeStr = `★ ${this.save.badges.length}/12${this.save.bossDefeated ? ' ♛' : ''}`;
    ctx.font = '700 8px system-ui, -apple-system, "Segoe UI", sans-serif';
    const bw = Math.ceil(ctx.measureText(badgeStr).width) + 12;
    const bx = SCREEN_W - 4 - bw;

    // Team names + golden diamond separator + district name (gracefully clipped if long)
    const nameX = 3 + (members.length - 1) * locketStep + 17 + 4.5;
    const maxTextRight = bx - 6;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const teamLabel =
      members.length >= 3
        ? `${members[0].name}, ${members[1].name} & ${members[2].name}`
        : `${members[0].name} & ${members[1].name}`;
    ctx.font = `700 ${isTrio ? 7.2 : 8}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillStyle = '#fff7e4';
    ctx.fillText(teamLabel, nameX, 10.6);
    const nameW = ctx.measureText(teamLabel).width;

    const sepX = nameX + nameW + 3.5;
    ctx.font = '700 5.5px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(244, 206, 118, 0.85)';
    ctx.fillText('◆', sepX, 10.5);

    const distX = sepX + 7;
    const availW = Math.max(24, maxTextRight - distX);
    ctx.font = `500 ${isTrio ? 7.2 : 7.7}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    let districtName = this.getCurrentDistrictName();
    if (ctx.measureText(districtName).width > availW) {
      while (districtName.length > 4 && ctx.measureText(`${districtName}…`).width > availW) {
        districtName = districtName.slice(0, -1);
      }
      districtName = `${districtName}…`;
    }
    ctx.fillStyle = '#e3d9c5';
    ctx.fillText(districtName, distX, 10.6);

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
