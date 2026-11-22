/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { WORLDS } from '../src/data';
import { FAMILY_MEMBERS, FAMILY_PAIRS, MODE_ORDER } from '../src/data/familyAvatars';
import { randomizeGuestsInWorld } from '../src/data/guests';
import { decodeSaveCode, encodeSaveCode } from '../src/engine/saveSystem';
import { isTileWalkable } from '../src/engine/tilesetRenderer';
import { ChallengeConfig, MapData, ModeSaveData, NpcEntity, ReflectionTheme, SingleChallengeConfig, WorldDefinition } from '../src/types';

const REFLECTION_KINDS = [
  'quiz',
  'riddle_word',
  'order_puzzle',
  'pair_match',
  'intruder_hunt',
  'category_sort',
] as const;
type ReflectionKind = (typeof REFLECTION_KINDS)[number];

const LEGACY_DYNAMIC_MINIGAME_FILES = [
  'balanceMeterGame.ts',
  'dodgeCollectGame.ts',
  'kitchenSortGame.ts',
  'memoryPatternGame.ts',
  'reactionDuelGame.ts',
  'rhythmGame.ts',
  'timingShotGame.ts',
  'viewfinderGame.ts',
] as const;

const LEAKED_YEAR_RE = /\b(1[6-9]\d{2}|20[0-2]\d)\b/;

const VALID_REFLECTION_THEMES = new Set<ReflectionTheme>([
  'literature',
  'theater',
  'music_br',
  'cinema',
  'gastronomy',
  'photography',
  'football',
  'basketball',
  'manga',
  'polar',
]);

function isReflectionChallenge(c: ChallengeConfig): c is Extract<SingleChallengeConfig, { kind: ReflectionKind }> {
  return (REFLECTION_KINDS as readonly string[]).includes(c.kind);
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

describe('Noël 2026 : Intégrité globale des 5 mondes', () => {
  it('contient exactement les 5 binômes et les 10 membres de la famille', () => {
    expect(MODE_ORDER).toEqual(['pm', 'df', 'jp', 'aj', 'sd']);
    expect(Object.keys(FAMILY_MEMBERS)).toHaveLength(10);
    for (const mode of MODE_ORDER) {
      expect(FAMILY_PAIRS[mode]).toBeDefined();
      expect(FAMILY_PAIRS[mode].members).toHaveLength(2);
      expect(WORLDS[mode]).toBeDefined();
    }
  });

  it('possède 65 badges uniques à travers les 5 mondes', () => {
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
    expect(ids.size).toBe(65);
  });

  it('supprime intégralement les 8 anciens fichiers de mini-jeux dynamiques', () => {
    const minigameFiles = Object.keys(import.meta.glob('../src/minigames/*.ts')).map((p) =>
      p.split('/').pop()!
    );
    expect(minigameFiles.length).toBeGreaterThanOrEqual(7);
    for (const file of LEGACY_DYNAMIC_MINIGAME_FILES) {
      expect(
        minigameFiles.includes(file),
        `L’ancien mini-jeu dynamique ${file} doit être supprimé`
      ).toBe(false);
    }
    expect(minigameFiles.sort()).toEqual([
      'categorySortGame.ts',
      'challengeRunner.ts',
      'common.ts',
      'intruderHuntGame.ts',
      'orderPuzzleGame.ts',
      'pairMatchGame.ts',
      'quizRiddleGame.ts',
    ]);
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

      it('impose 100 % quiz & jeux de réflexion (0 arcade dynamique) et utilise les 6 genres sur les 15 phases', () => {
        const mains = world.npcs.filter((n) => n.role === 'main');
        const seenKinds = new Set<string>();

        for (const npc of mains) {
          expect(npc.challenge).toBeDefined();
          expect(
            isReflectionChallenge(npc.challenge!),
            `${npc.id} utilise un genre non-réflexion : ${npc.challenge?.kind}`
          ).toBe(true);
          seenKinds.add(npc.challenge!.kind);
        }

        const boss = world.npcs.find((n) => n.role === 'boss')!;
        expect(boss.challenge?.kind).toBe('boss_gauntlet');
        if (boss.challenge?.kind === 'boss_gauntlet') {
          expect(boss.challenge.phases).toHaveLength(3);
          for (const p of boss.challenge.phases) {
            expect(
              isReflectionChallenge(p.challenge),
              `Boss ${boss.id} (${p.phaseTitle}) utilise un genre non-réflexion : ${p.challenge.kind}`
            ).toBe(true);
            seenKinds.add(p.challenge.kind);
          }
        }

        for (const kind of REFLECTION_KINDS) {
          expect(
            seenKinds.has(kind),
            `Le monde ${mode.toUpperCase()} doit contenir au moins une phase de type "${kind}"`
          ).toBe(true);
        }
      });

      it('vérifie la validité et le niveau expert des 6 genres (quiz, énigmes, mise en ordre, associations, intrus, tri d’expert)', () => {
        const checkChallenge = (c: ChallengeConfig, label: string) => {
          if (c.kind === 'quiz') {
            expect(c.enemyHp).toBeGreaterThanOrEqual(1);
            expect(c.playerHp).toBeGreaterThanOrEqual(1);
            expect(c.questions.length).toBeGreaterThanOrEqual(c.enemyHp + 1);
            if (c.themeStyle) {
              expect(VALID_REFLECTION_THEMES.has(c.themeStyle), `${label}: themeStyle invalide`).toBe(true);
            }
            for (const q of c.questions) {
              expect(q.question.trim().length, `${label}: question trop courte`).toBeGreaterThan(8);
              expect(q.options).toHaveLength(4);
              const trimmed = q.options.map((o) => o.trim());
              for (const opt of trimmed) {
                expect(opt.length).toBeGreaterThan(0);
              }
              expect(new Set(trimmed).size, `${label}: options dupliquées`).toBe(4);
              expect(q.correctIndex).toBeGreaterThanOrEqual(0);
              expect(q.correctIndex).toBeLessThanOrEqual(3);
              expect(q.explanation?.trim().length ?? 0, `${label}: explanation manquante`).toBeGreaterThan(5);
            }
          } else if (c.kind === 'riddle_word') {
            expect(c.enemyHp).toBeGreaterThanOrEqual(1);
            expect(c.playerHp).toBeGreaterThanOrEqual(1);
            expect(c.riddles.length).toBeGreaterThanOrEqual(c.enemyHp + 1);
            if (c.themeStyle) {
              expect(VALID_REFLECTION_THEMES.has(c.themeStyle), `${label}: themeStyle invalide`).toBe(true);
            }
            for (const r of c.riddles) {
              expect(r.clues).toHaveLength(3);
              for (const clue of r.clues) {
                expect(clue.trim().length).toBeGreaterThan(4);
              }
              expect(r.options).toHaveLength(4);
              const trimmed = r.options.map((o) => o.trim());
              for (const opt of trimmed) {
                expect(opt.length).toBeGreaterThan(0);
              }
              expect(new Set(trimmed).size, `${label}: options dupliquées`).toBe(4);
              expect(r.correctIndex).toBeGreaterThanOrEqual(0);
              expect(r.correctIndex).toBeLessThanOrEqual(3);
              expect(r.explanation?.trim().length ?? 0, `${label}: explanation manquante`).toBeGreaterThan(5);
            }
          } else if (c.kind === 'order_puzzle') {
            expect(VALID_REFLECTION_THEMES.has(c.themeStyle), `${label}: themeStyle invalide`).toBe(true);
            expect(c.lives).toBeGreaterThanOrEqual(1);
            expect(c.rounds.length).toBeGreaterThanOrEqual(1);
            for (const [ri, r] of c.rounds.entries()) {
              expect(r.prompt.trim().length).toBeGreaterThan(5);
              expect(r.explanation.trim().length).toBeGreaterThan(5);
              expect(
                r.orderedItems.length,
                `${label} R${ri + 1}: orderedItems doit contenir entre 4 et 7 éléments`
              ).toBeGreaterThanOrEqual(4);
              expect(
                r.orderedItems.length,
                `${label} R${ri + 1}: orderedItems doit contenir entre 4 et 7 éléments`
              ).toBeLessThanOrEqual(7);
              const trimmed = r.orderedItems.map((item) => item.trim());
              for (const item of trimmed) {
                expect(item.length).toBeGreaterThan(0);
                expect(
                  LEAKED_YEAR_RE.test(item),
                  `${label} R${ri + 1}: date/année 4 chiffres divulguée dans la carte "${item}" (à mettre dans revealTags)`
                ).toBe(false);
              }
              expect(new Set(trimmed).size, `${label} R${ri + 1}: orderedItems dupliqués`).toBe(trimmed.length);
              if (r.revealTags !== undefined) {
                expect(
                  r.revealTags.length,
                  `${label} R${ri + 1}: revealTags doit correspondre à orderedItems.length`
                ).toBe(r.orderedItems.length);
                for (const tag of r.revealTags) {
                  expect(tag.trim().length, `${label} R${ri + 1}: revealTag vide`).toBeGreaterThan(0);
                }
              }
              if (r.hintLabels !== undefined) {
                expect(r.hintLabels).toHaveLength(2);
                expect(r.hintLabels[0].trim().length).toBeGreaterThan(0);
                expect(r.hintLabels[1].trim().length).toBeGreaterThan(0);
              }
            }
          } else if (c.kind === 'pair_match') {
            expect(VALID_REFLECTION_THEMES.has(c.themeStyle), `${label}: themeStyle invalide`).toBe(true);
            expect(c.lives).toBeGreaterThanOrEqual(1);
            expect(c.rounds.length).toBeGreaterThanOrEqual(1);
            for (const [ri, r] of c.rounds.entries()) {
              expect(r.prompt.trim().length).toBeGreaterThan(5);
              expect(r.explanation.trim().length).toBeGreaterThan(5);
              expect(
                r.pairs.length,
                `${label} R${ri + 1}: pairs doit contenir entre 4 et 6 paires`
              ).toBeGreaterThanOrEqual(4);
              expect(
                r.pairs.length,
                `${label} R${ri + 1}: pairs doit contenir entre 4 et 6 paires`
              ).toBeLessThanOrEqual(6);
              const lefts = r.pairs.map((p) => p.left.trim());
              const rights = r.pairs.map((p) => p.right.trim());
              for (const l of lefts) expect(l.length).toBeGreaterThan(0);
              for (const rt of rights) expect(rt.length).toBeGreaterThan(0);
              expect(new Set(lefts).size, `${label} R${ri + 1}: lefts dupliqués`).toBe(r.pairs.length);
              expect(new Set(rights).size, `${label} R${ri + 1}: rights dupliqués`).toBe(r.pairs.length);
            }
          } else if (c.kind === 'intruder_hunt') {
            expect(VALID_REFLECTION_THEMES.has(c.themeStyle), `${label}: themeStyle invalide`).toBe(true);
            expect(c.lives).toBeGreaterThanOrEqual(1);
            expect(c.rounds.length).toBeGreaterThanOrEqual(3);
            for (const [ri, r] of c.rounds.entries()) {
              expect(r.prompt.trim().length).toBeGreaterThan(5);
              expect(r.explanation.trim().length).toBeGreaterThan(5);
              expect(r.items).toHaveLength(4);
              const trimmed = r.items.map((item) => item.trim());
              for (const item of trimmed) {
                expect(item.length).toBeGreaterThan(0);
              }
              expect(new Set(trimmed).size, `${label} R${ri + 1}: items dupliqués`).toBe(4);
              expect(r.intruderIndex).toBeGreaterThanOrEqual(0);
              expect(r.intruderIndex).toBeLessThanOrEqual(3);
            }
          } else if (c.kind === 'category_sort') {
            expect(VALID_REFLECTION_THEMES.has(c.themeStyle), `${label}: themeStyle invalide`).toBe(true);
            expect(c.lives).toBeGreaterThanOrEqual(1);
            expect(c.prompt.trim().length).toBeGreaterThan(5);
            expect(
              c.categories.length,
              `${label}: categories doit contenir 2 ou 3 catégories`
            ).toBeGreaterThanOrEqual(2);
            expect(
              c.categories.length,
              `${label}: categories doit contenir 2 ou 3 catégories`
            ).toBeLessThanOrEqual(3);
            const trimmedCats = c.categories.map((cat) => cat.trim());
            for (const cat of trimmedCats) {
              expect(cat.length).toBeGreaterThan(0);
            }
            expect(new Set(trimmedCats).size, `${label}: catégories dupliquées`).toBe(c.categories.length);
            expect(
              c.items.length,
              `${label}: items doit contenir entre 6 et 8 éléments`
            ).toBeGreaterThanOrEqual(6);
            expect(
              c.items.length,
              `${label}: items doit contenir entre 6 et 8 éléments`
            ).toBeLessThanOrEqual(8);
            const seenLabels = new Set<string>();
            const usedCategories = new Set<number>();
            for (const item of c.items) {
              const trimmedLabel = item.label.trim();
              expect(trimmedLabel.length).toBeGreaterThan(0);
              expect(seenLabels.has(trimmedLabel), `${label}: item dupliqué "${trimmedLabel}"`).toBe(false);
              seenLabels.add(trimmedLabel);
              expect(item.categoryIndex).toBeGreaterThanOrEqual(0);
              expect(item.categoryIndex).toBeLessThan(c.categories.length);
              usedCategories.add(item.categoryIndex);
              expect(item.explanation.trim().length, `${label}: explanation vide pour "${trimmedLabel}"`).toBeGreaterThan(5);
            }
            for (let ci = 0; ci < c.categories.length; ci++) {
              expect(
                usedCategories.has(ci),
                `${label}: la catégorie "${c.categories[ci]}" n’est utilisée par aucun élément`
              ).toBe(true);
            }
          } else if (c.kind === 'boss_gauntlet') {
            for (const p of c.phases) {
              checkChallenge(p.challenge, `${label} > ${p.phaseTitle}`);
            }
          } else {
            throw new Error(`${label}: genre interdit ${(c as { kind: string }).kind}`);
          }
        };

        for (const npc of world.npcs) {
          if (npc.challenge) checkChallenge(npc.challenge, npc.id);
        }
      });

      it('garantit des dialogues, biographies et indices complets pour chaque PNJ du monde', () => {
        for (const npc of world.npcs) {
          if (npc.role === 'main' || npc.role === 'boss') {
            expect(npc.introLines?.length ?? 0).toBeGreaterThanOrEqual(1);
            expect(npc.winLines?.length ?? 0).toBeGreaterThanOrEqual(1);
            expect(npc.loseLines?.length ?? 0).toBeGreaterThanOrEqual(1);
            expect(npc.alreadyWonLines?.length ?? 0).toBeGreaterThanOrEqual(1);
            expect(npc.duoWinReaction?.trim().length ?? 0).toBeGreaterThan(5);
            expect(npc.notebookBio?.trim().length ?? 0).toBeGreaterThan(10);
          } else if (npc.role === 'secondary') {
            expect(npc.hintLines?.length ?? 0).toBeGreaterThanOrEqual(1);
          } else if (npc.role === 'cameo') {
            expect(npc.cameoLines?.length ?? 0).toBeGreaterThanOrEqual(2);
          }
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

      it('place aléatoirement Jean-Luc Mélenchon et Gabriel Zucman sans jamais bloquer la carte', () => {
        const guests = world.npcs.filter((n) => n.role === 'guest');
        expect(guests).toHaveLength(2);

        const melenchon = guests.find((n) => n.name === 'Jean-Luc Mélenchon');
        const zucman = guests.find((n) => n.name === 'Gabriel Zucman');
        expect(melenchon).toBeDefined();
        expect(zucman).toBeDefined();
        expect(melenchon!.fixedLines).toEqual(['Votez pour moi !']);
        expect(zucman!.fixedLines).toEqual(['Tax billionaires!']);

        const ow = world.maps[world.overworldId];
        for (let iter = 0; iter < 10; iter++) {
          randomizeGuestsInWorld(world);
          expect(melenchon!.x === zucman!.x && melenchon!.y === zucman!.y).toBe(false);
          expect(isTileWalkable(ow.tiles[melenchon!.y][melenchon!.x])).toBe(true);
          expect(isTileWalkable(ow.tiles[zucman!.y][zucman!.x])).toBe(true);
          const r8 = bfsReachable(world, ow, world.spawnX, world.spawnY, 8);
          expect(hasAdjacentInSet(r8, melenchon!.x, melenchon!.y)).toBe(true);
          expect(hasAdjacentInSet(r8, zucman!.x, zucman!.y)).toBe(true);
        }
      });
    });
  }

  it('encode et décode fidèlement les codes de sauvegarde et rejette les codes corrompus', () => {
    const sampleMode = (id: 'pm' | 'df' | 'jp' | 'aj' | 'sd'): ModeSaveData => ({
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
        sd: sampleMode('sd'),
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
