import { ModeId, WorldDefinition } from '../types';
import { createAjWorld } from './worlds/ajWorld';
import { createDfWorld } from './worlds/dfWorld';
import { createJpWorld } from './worlds/jpWorld';
import { createPmWorld } from './worlds/pmWorld';

export function buildAllWorlds(): Record<ModeId, WorldDefinition> {
  return {
    pm: createPmWorld(),
    df: createDfWorld(),
    jp: createJpWorld(),
    aj: createAjWorld(),
  };
}

export const WORLDS: Record<ModeId, WorldDefinition> = buildAllWorlds();
