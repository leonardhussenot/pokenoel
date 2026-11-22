import { ModeId, WorldDefinition } from '../types';
import { attachGuestsToWorld } from './guests';
import { getNpcPortraitUrl } from './npcPortraits';
import { createAjWorld } from './worlds/ajWorld';
import { createDfWorld } from './worlds/dfWorld';
import { createJpWorld } from './worlds/jpWorld';
import { createPmWorld } from './worlds/pmWorld';
import { createSdWorld } from './worlds/sdWorld';

function attachNpcPortraits(world: WorldDefinition): WorldDefinition {
  for (const npc of world.npcs) {
    if (!npc.customPortraitUrl) {
      const url = getNpcPortraitUrl(npc.id);
      if (url) {
        npc.customPortraitUrl = url;
      }
    }
  }
  return world;
}

export function buildAllWorlds(): Record<ModeId, WorldDefinition> {
  return {
    pm: attachNpcPortraits(attachGuestsToWorld(createPmWorld())),
    df: attachNpcPortraits(attachGuestsToWorld(createDfWorld())),
    jp: attachNpcPortraits(attachGuestsToWorld(createJpWorld())),
    aj: attachNpcPortraits(attachGuestsToWorld(createAjWorld())),
    sd: attachNpcPortraits(attachGuestsToWorld(createSdWorld())),
  };
}

export const WORLDS: Record<ModeId, WorldDefinition> = buildAllWorlds();
