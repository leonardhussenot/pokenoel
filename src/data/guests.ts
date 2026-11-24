import { isTileWalkable } from '../engine/tilesetRenderer';
import { ModeId, NpcEntity, WorldDefinition } from '../types';
import { getNpcPortraitUrl } from './npcPortraits';

interface GuestCoord {
  x: number;
  y: number;
  district: 1 | 2 | 3;
}

function getSafeGuestCandidates(world: WorldDefinition): GuestCoord[] {
  const ow = world.maps[world.overworldId];
  if (!ow) return [];

  const forbidden = new Set<string>();
  const markNeighborhood = (cx: number, cy: number, radius = 1) => {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        forbidden.add(`${cx + dx},${cy + dy}`);
      }
    }
  };

  // Avoid spawn & initial follower tile
  markNeighborhood(world.spawnX, world.spawnY, 2);
  markNeighborhood(world.spawnX, world.spawnY + 1, 1);

  // Avoid building doors & exit landing tiles
  for (const b of world.buildings) {
    markNeighborhood(b.doorX, b.doorY, 2);
    markNeighborhood(b.doorX, b.doorY + 1, 1);
  }

  // Avoid warps
  for (const w of ow.warps) {
    markNeighborhood(w.x, w.y, 1);
  }

  // Avoid gates
  for (const g of world.gates) {
    for (const gt of g.tiles) {
      markNeighborhood(gt.x, gt.y, 2);
    }
  }

  // Avoid signs
  for (const s of ow.signs) {
    markNeighborhood(s.x, s.y, 1);
  }

  // Avoid all non-guest overworld NPCs (including 2-tile cameos)
  for (const npc of world.npcs) {
    if (npc.mapId !== ow.id || npc.role === 'guest') continue;
    markNeighborhood(npc.x, npc.y, 1);
    if (npc.role === 'cameo') {
      markNeighborhood(npc.x + 1, npc.y, 1);
    }
  }

  const playableDistricts = world.districts.filter(
    (d): d is typeof d & { id: 1 | 2 | 3 } => d.id === 1 || d.id === 2 || d.id === 3
  );

  const candidates: GuestCoord[] = [];
  const restrictedTiles = new Set(['door', 'bridge', 'gate_closed', 'gate_open']);

  for (const d of playableDistricts) {
    for (let y = Math.max(1, d.minY); y <= Math.min(ow.height - 2, d.maxY); y++) {
      for (let x = 1; x <= ow.width - 2; x++) {
        if (forbidden.has(`${x},${y}`)) continue;
        const center = ow.tiles[y][x];
        if (!isTileWalkable(center) || restrictedTiles.has(center)) continue;

        // Require full 3x3 walkable clearance so the guest can NEVER narrow or block any path
        let open3x3 = true;
        for (let dy = -1; dy <= 1 && open3x3; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nt = ow.tiles[y + dy][x + dx];
            if (!isTileWalkable(nt) || restrictedTiles.has(nt)) {
              open3x3 = false;
              break;
            }
          }
        }
        if (open3x3) {
          candidates.push({ x, y, district: d.id });
        }
      }
    }
  }

  return candidates;
}

function buildGuestTemplates(modeId: ModeId, overworldId: string): [NpcEntity, NpcEntity] {
  const melenchon: NpcEntity = {
    id: `${modeId}_guest_melenchon`,
    name: 'Jean-Luc Mélenchon',
    title: '',
    role: 'guest',
    district: 1,
    mapId: overworldId,
    x: 20,
    y: 39,
    dir: 'down',
    voicePitch: 295,
    appearance: {
      skin: '#f0c4a4',
      hairColor: '#d7dce6',
      hairStyle: 'sidepart',
      headwear: 'none',
      glasses: 'square',
      glassesColor: '#1f2333',
      facialHair: 'none',
      topColor: '#1b2646',
      bottomColor: '#161b2e',
      accentColor: '#d62839',
      outfitStyle: 'suit',
    },
    portrait: {
      bgTop: '#5e1b2d',
      bgBottom: '#1a2038',
      eyeColor: '#2d3b4e',
      collar: 'tie',
      prop: 'none',
      smile: 'wide',
    },
    fixedLines: ['Votez pour moi !'],
    customPortraitUrl: getNpcPortraitUrl(`${modeId}_guest_melenchon`),
  };

  const zucman: NpcEntity = {
    id: `${modeId}_guest_zucman`,
    name: 'Gabriel Zucman',
    title: '',
    role: 'guest',
    district: 2,
    mapId: overworldId,
    x: 38,
    y: 28,
    dir: 'down',
    voicePitch: 365,
    appearance: {
      skin: '#f2c8aa',
      hairColor: '#3a2920',
      hairStyle: 'sidepart',
      headwear: 'none',
      glasses: 'none',
      facialHair: 'stubble',
      facialHairColor: '#524036',
      topColor: '#2c4166',
      bottomColor: '#222634',
      accentColor: '#e4eefc',
      outfitStyle: 'suit',
    },
    portrait: {
      bgTop: '#1f4d43',
      bgBottom: '#13222b',
      eyeColor: '#3a2c22',
      collar: 'normal',
      prop: 'none',
      smile: 'normal',
    },
    fixedLines: ['Tax billionaires!'],
    customPortraitUrl: getNpcPortraitUrl(`${modeId}_guest_zucman`),
  };

  return [melenchon, zucman];
}

export function randomizeGuestsInWorld(world: WorldDefinition): void {
  const guests = world.npcs.filter((n) => n.role === 'guest');
  if (guests.length === 0) return;

  const candidates = getSafeGuestCandidates(world);
  if (candidates.length === 0) return;

  const chosen: GuestCoord[] = [];
  for (const guest of guests) {
    // Prefer spots well spaced from already placed guests
    const spaced = candidates.filter((c) =>
      chosen.every((prev) => Math.abs(c.x - prev.x) + Math.abs(c.y - prev.y) >= 6)
    );
    const nonOverlap = candidates.filter((c) =>
      chosen.every((prev) => c.x !== prev.x || c.y !== prev.y)
    );
    const pool = spaced.length > 0 ? spaced : nonOverlap.length > 0 ? nonOverlap : candidates;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    guest.x = pick.x;
    guest.y = pick.y;
    guest.district = pick.district;
    chosen.push(pick);
  }
}

export function attachGuestsToWorld(world: WorldDefinition): WorldDefinition {
  const [melenchon, zucman] = buildGuestTemplates(world.modeId, world.overworldId);
  world.npcs.push(melenchon, zucman);
  randomizeGuestsInWorld(world);
  return world;
}
