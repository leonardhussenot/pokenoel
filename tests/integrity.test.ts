import { describe, expect, it } from 'vitest';
import { WORLDS } from '../src/data';
import { FAMILY_MEMBERS, FAMILY_PAIRS, MODE_ORDER } from '../src/data/familyAvatars';
import { decodeSaveCode, encodeSaveCode } from '../src/engine/saveSystem';
import { isTileWalkable } from '../src/engine/tilesetRenderer';
import { ChallengeConfig, MapData, ModeSaveData, NpcEntity, WorldDefinition } from '../src/types';

function isArcadeChallenge(c: ChallengeConfig): boolean {
  return c.kind !== 'quiz' && c.kind !== 'riddle_word' && c.kind !== 'boss_gauntlet';
}

function getNpcAt(world: WorldDefinition, mapId: string, x: number, y: number): NpcEntity | undefined {
  return world.npcs.find((n) => {
    if (n.mapId !== mapId) return false;
    if (n.x === x && n.y === y) return true;
    if (n.role === 'cameo' && n.x + 1 === x && n.y === y) return true;
    return false;
  });
}

function bfsReachable(
  world: WorldDefinition,
  map: MapData,
  startX: number,
  startY: number,
  badgeCount: number
): Set<string> {
  const visited = new Set<string>();
  const queue: [number, number][] = [[startX, startY]];
  visited.add(`${startX},${startY}`);

  const canStep = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;
    const t = map.tiles[y][x];
    if (t === 'gate_closed') {
      const gate = world.gates.find((g) => g.tiles.some((gt) => gt.x === x && gt.y === y));
      if (!gate || badgeCount < gate.requiredBadges) return false;
    } else if (!isTileWalkable(t)) {
      return false;
    }
    if (getNpcAt(world, map.id, x, y)) return false;
    return true;
  };

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cx + dx;
      const ny = cy + dy;
      const key = `${nx},${ny}`;
      if (!visited.has(key) && canStep(nx, ny)) {
        visited.add(key);
        queue.push([nx, ny]);
      }
    }
  }
  return visited;
}

function hasAdjacentInSet(set: Set<string>, x: number, y: number): boolean {
  return (
    set.has(`${x + 1},${y}`) ||
    set.has(`${x - 1},${y}`) ||
    set.has(`${x},${y + 1}`) ||
    set.has(`${x},${y - 1}`)
  );
}

describe('PokéNoël : Intégrité globale des 4 mondes', () => {
  it('contient exactement les 4 binômes et les 8 membres de la famille', () => {
    expect(MODE_ORDER).toEqual(['pm', 'df', 'jp', 'aj']);
    expect(Object.keys(FAMILY_MEMBERS)).toHaveLength(8);
    for (const mode of MODE_ORDER) {
      expect(FAMILY_PAIRS[mode]).toBeDefined();
      expect(FAMILY_PAIRS[mode].members).toHaveLength(2);
      expect(WORLDS[mode]).toBeDefined();
    }
  });

  it('possède 52 badges uniques à travers les 4 mondes', () => {
    const ids = new Set<string>();
    for (const mode of MODE_ORDER) {
      const w = WORLDS[mode];
      for (const b of w.badges) {
        expect(ids.has(b.id)).toBe(false);
        ids.add(b.id);
      }
      expect(ids.has(w.bossBadge.id)).toBe(false);
      ids.add(w.bossBadge.id);
    }
    expect(ids.size).toBe(52);
  });

  for (const mode of MODE_ORDER) {
    describe(`Monde ${mode.toUpperCase()} (${WORLDS[mode].worldName})`, () => {
      const world = WORLDS[mode];

      it('contient exactement 12 personnages principaux, 1 Boss Final, 12 secondaires, 3 caméos et 3 portails', () => {
        const mains = world.npcs.filter((n) => n.role === 'main');
        const bosses = world.npcs.filter((n) => n.role === 'boss');
        const secs = world.npcs.filter((n) => n.role === 'secondary');
        const cameos = world.npcs.filter((n) => n.role === 'cameo');
        const gks = world.npcs.filter((n) => n.role === 'gatekeeper');

        expect(mains).toHaveLength(12);
        expect(bosses).toHaveLength(1);
        expect(secs.length).toBeGreaterThanOrEqual(12);
        expect(cameos).toHaveLength(3);
        expect(gks).toHaveLength(3);
        expect(world.badges).toHaveLength(12);
        expect(world.gates.map((g) => g.requiredBadges)).toEqual([4, 8, 12]);
      });

      it('respecte le ratio ~75% mini-jeux arcade / ~25% quiz & énigmes et 3 phases pour le Boss', () => {
        const mains = world.npcs.filter((n) => n.role === 'main');
        const arcadeCount = mains.filter((n) => n.challenge && isArcadeChallenge(n.challenge)).length;
        const quizCount = mains.length - arcadeCount;
        expect(arcadeCount).toBeGreaterThanOrEqual(8);
        expect(arcadeCount).toBeLessThanOrEqual(9);
        expect(quizCount).toBeGreaterThanOrEqual(3);
        expect(quizCount).toBeLessThanOrEqual(4);

        const boss = world.npcs.find((n) => n.role === 'boss')!;
        expect(boss.challenge?.kind).toBe('boss_gauntlet');
        if (boss.challenge?.kind === 'boss_gauntlet') {
          expect(boss.challenge.phases).toHaveLength(3);
        }
      });

      it('vérifie la validité de toutes les questions de quiz et énigmes', () => {
        const checkChallenge = (c: ChallengeConfig) => {
          if (c.kind === 'quiz') {
            expect(c.questions.length).toBeGreaterThanOrEqual(4);
            for (const q of c.questions) {
              expect(q.question.trim().length).toBeGreaterThan(8);
              expect(q.options).toHaveLength(4);
              expect(new Set(q.options).size).toBe(4);
              expect(q.correctIndex).toBeGreaterThanOrEqual(0);
              expect(q.correctIndex).toBeLessThanOrEqual(3);
            }
          } else if (c.kind === 'riddle_word') {
            expect(c.riddles.length).toBeGreaterThanOrEqual(3);
            for (const r of c.riddles) {
              expect(r.clues).toHaveLength(3);
              expect(r.options).toHaveLength(4);
              expect(new Set(r.options).size).toBe(4);
              expect(r.correctIndex).toBeGreaterThanOrEqual(0);
              expect(r.correctIndex).toBeLessThanOrEqual(3);
            }
          } else if (c.kind === 'boss_gauntlet') {
            for (const p of c.phases) {
              checkChallenge(p.challenge);
            }
          }
        };

        for (const npc of world.npcs) {
          if (npc.challenge) checkChallenge(npc.challenge);
        }
      });

      it('prouve par BFS la marchabilité des 4 quartiers, portails, PNJ et intérieurs', () => {
        const ow = world.maps[world.overworldId];
        expect(ow).toBeDefined();

        // District 1 reachability at 0 badges
        const r0 = bfsReachable(world, ow, world.spawnX, world.spawnY, 0);
        for (const b of world.buildings.filter((x) => x.district === 1)) {
          expect(r0.has(`${b.doorX},${b.doorY}`)).toBe(true);
        }
        for (const b of world.buildings.filter((x) => x.district > 1)) {
          expect(r0.has(`${b.doorX},${b.doorY}`)).toBe(false);
        }
        for (const n of world.npcs.filter((x) => x.mapId === ow.id && x.district === 1)) {
          expect(hasAdjacentInSet(r0, n.x, n.y)).toBe(true);
        }

        // District 2 reachability at 4 badges
        const r4 = bfsReachable(world, ow, world.spawnX, world.spawnY, 4);
        for (const b of world.buildings.filter((x) => x.district === 2)) {
          expect(r4.has(`${b.doorX},${b.doorY}`)).toBe(true);
        }
        for (const b of world.buildings.filter((x) => x.district > 2)) {
          expect(r4.has(`${b.doorX},${b.doorY}`)).toBe(false);
        }
        for (const n of world.npcs.filter((x) => x.mapId === ow.id && x.district === 2)) {
          expect(hasAdjacentInSet(r4, n.x, n.y)).toBe(true);
        }

        // District 3 reachability at 8 badges
        const r8 = bfsReachable(world, ow, world.spawnX, world.spawnY, 8);
        for (const b of world.buildings.filter((x) => x.district === 3)) {
          expect(r8.has(`${b.doorX},${b.doorY}`)).toBe(true);
        }
        for (const b of world.buildings.filter((x) => x.district === 4)) {
          expect(r8.has(`${b.doorX},${b.doorY}`)).toBe(false);
        }
        for (const n of world.npcs.filter((x) => x.mapId === ow.id && x.district === 3)) {
          expect(hasAdjacentInSet(r8, n.x, n.y)).toBe(true);
        }

        // Boss Sanctuary reachability at 12 badges
        const r12 = bfsReachable(world, ow, world.spawnX, world.spawnY, 12);
        const bossBuilding = world.buildings.find((x) => x.isBoss)!;
        expect(bossBuilding).toBeDefined();
        expect(r12.has(`${bossBuilding.doorX},${bossBuilding.doorY}`)).toBe(true);

        // Every warp roundtrip & interior NPC reachability
        for (const b of world.buildings) {
          const interior = world.maps[b.interiorMapId];
          expect(interior).toBeDefined();
          const entryWarp = ow.warps.find((w) => w.x === b.doorX && w.y === b.doorY)!;
          expect(entryWarp).toBeDefined();
          expect(isTileWalkable(interior.tiles[entryWarp.targetY][entryWarp.targetX])).toBe(true);

          const exitWarp = interior.warps[0];
          expect(exitWarp).toBeDefined();
          expect(exitWarp.targetMapId).toBe(ow.id);
          expect(isTileWalkable(ow.tiles[exitWarp.targetY][exitWarp.targetX])).toBe(true);
          // Must not land back on the door tile itself!
          expect(exitWarp.targetX === b.doorX && exitWarp.targetY === b.doorY).toBe(false);

          const rIn = bfsReachable(world, interior, entryWarp.targetX, entryWarp.targetY, 12);
          const char = world.npcs.find((n) => n.id === b.characterId)!;
          expect(hasAdjacentInSet(rIn, char.x, char.y)).toBe(true);
          expect(rIn.has(`${exitWarp.x},${exitWarp.y}`)).toBe(true);
        }
      });
    });
  }

  it('encode et décode fidèlement les codes de sauvegarde et rejette les codes corrompus', () => {
    const sampleMode = (id: 'pm' | 'df' | 'jp' | 'aj'): ModeSaveData => ({
      badges: [`${id}_badge_1`, `${id}_badge_2`],
      bossDefeated: id === 'pm',
      metNpcs: [`${id}_sec_1`],
      playTimeSeconds: 325,
      attempts: 7,
      leaderIndex: 1,
      lastMapId: `${id}_overworld`,
      lastX: 30,
      lastY: 38,
    });

    const original = {
      version: 1 as const,
      muted: true,
      modes: {
        pm: sampleMode('pm'),
        df: sampleMode('df'),
        jp: sampleMode('jp'),
        aj: sampleMode('aj'),
      },
    };

    const code = encodeSaveCode(original);
    expect(code.startsWith('PKN1-')).toBe(true);

    const decoded = decodeSaveCode(code);
    expect(decoded).toEqual(original);

    // Corrupted checksum or payload must return null
    expect(decodeSaveCode(code.replace(/^PKN1-[A-Z0-9]{6}/, 'PKN1-ZZZZZZ'))).toBeNull();
    expect(decodeSaveCode('invalid-code')).toBeNull();
  });
});
