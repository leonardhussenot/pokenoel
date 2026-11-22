import {
  BuildingMeta,
  ChallengeMistake,
  ModeSaveData,
  NpcEntity,
  WorldDefinition,
} from '../types';

export interface SecondaryDialogueResult {
  messages: string[];
  text: string;
  isMistakeHint: boolean;
  targetBadgeId?: string;
}

function clipClause(text: string, maxLen: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const cut = clean.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLen * 0.55 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/**
 * Resolves the primary companion building for a secondary NPC.
 * Uses `hintTargetBadgeIds[0]` (the 1-to-1 companion house in the same district)
 * and falls back to the geometrically closest building in the district.
 */
export function resolveSecondaryPrimaryBuilding(
  npc: NpcEntity,
  world: WorldDefinition
): BuildingMeta | undefined {
  const districtBuildings = world.buildings.filter((b) => b.district === npc.district);
  if (districtBuildings.length === 0) return undefined;

  const primaryBadgeId = npc.hintTargetBadgeIds?.[0];
  if (primaryBadgeId) {
    const direct = districtBuildings.find((b) => b.badgeId === primaryBadgeId);
    if (direct) return direct;
  }

  let best = districtBuildings[0];
  let bestDist = Math.hypot(best.doorX - npc.x, best.doorY - npc.y);
  for (let i = 1; i < districtBuildings.length; i++) {
    const b = districtBuildings[i];
    const d = Math.hypot(b.doorX - npc.x, b.doorY - npc.y);
    if (d < bestDist) {
      best = b;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Formats a concrete, mistake-specific French hint fixing an exact error
 * the player made during their failed attempt.
 */
export function formatMistakeHint(mistake: ChallengeMistake, targetName: string): string {
  switch (mistake.kind) {
    case 'order_puzzle':
      return mistake.chronological
        ? `Petit coup de pouce pour chez ${targetName} : entre les deux, je suis certain que « ${mistake.earlierItem} » vient avant « ${mistake.laterItem} » !`
        : `Petit coup de pouce pour chez ${targetName} : dans l’ordre attendu, « ${mistake.earlierItem} » doit se placer avant « ${mistake.laterItem} » !`;

    case 'pair_match':
      return `Pour le défi de ${targetName}, « ${mistake.leftText} » ne va pas avec « ${mistake.wrongRightText} »… essayez plutôt de l’associer avec « ${mistake.correctRightText} » !`;

    case 'intruder_hunt':
      return `Chez ${targetName}, « ${mistake.pickedItem} » n’était pas l’intrus ! Méfiez-vous plutôt de « ${mistake.intruderItem} », c’est lui qui ne colle pas !`;

    case 'category_sort':
      return `Petite astuce pour le tri de ${targetName} : « ${mistake.itemLabel} » ne va pas dans « ${mistake.wrongCategory} », mais bien dans « ${mistake.correctCategory} » !`;

    case 'quiz': {
      const shortQ = clipClause(mistake.question, 54);
      return `Pour « ${shortQ} » chez ${targetName}, oubliez « ${mistake.wrongAnswer} » : essayez « ${mistake.correctAnswer} » !`;
    }

    case 'riddle_word': {
      const shortClue = clipClause(mistake.clue, 52);
      return `Pour l’énigme « ${shortClue} » chez ${targetName}, oubliez « ${mistake.wrongAnswer} » : pensez à « ${mistake.correctAnswer} » !`;
    }
  }
}

function pickSecondaryTargetBuilding(
  npc: NpcEntity,
  world: WorldDefinition,
  save: ModeSaveData
): BuildingMeta | undefined {
  const uncollectedInDistrict = world.buildings.filter(
    (b) => b.district === npc.district && !save.badges.includes(b.badgeId)
  );
  if (uncollectedInDistrict.length === 0) return undefined;

  // 1. Primary companion building if still uncollected
  const primary = resolveSecondaryPrimaryBuilding(npc, world);
  if (primary && !save.badges.includes(primary.badgeId)) {
    return primary;
  }

  // 2. Any other preferred target in hintTargetBadgeIds
  if (npc.hintTargetBadgeIds) {
    for (const id of npc.hintTargetBadgeIds) {
      const match = uncollectedInDistrict.find((b) => b.badgeId === id);
      if (match) return match;
    }
  }

  // 3. Closest remaining uncollected building in the same district
  let closest = uncollectedInDistrict[0];
  let bestDist = Math.hypot(closest.doorX - npc.x, closest.doorY - npc.y);
  for (let i = 1; i < uncollectedInDistrict.length; i++) {
    const b = uncollectedInDistrict[i];
    const d = Math.hypot(b.doorX - npc.x, b.doorY - npc.y);
    if (d < bestDist) {
      closest = b;
      bestDist = d;
    }
  }
  return closest;
}

/**
 * Builds the secondary NPC's dialogue:
 * - Before failing the target minigame: points to the nearby house AND invites
 *   the player to come back if they need help.
 * - After failing the target minigame: gives a specific hint fixing an actual
 *   mistake made during that failed attempt.
 */
export function buildSecondaryDialogue(
  npc: NpcEntity,
  world: WorldDefinition,
  save: ModeSaveData,
  hintCycleIndex = 0
): SecondaryDialogueResult {
  const targetBuilding = pickSecondaryTargetBuilding(npc, world, save);
  if (!targetBuilding) {
    const doneMsg =
      'Vous avez déjà réuni tous les badges de ce quartier ! Montez vers la porte au nord pour poursuivre votre aventure !';
    return {
      messages: [doneMsg],
      text: doneMsg,
      isMistakeHint: false,
    };
  }

  const targetNpc = world.npcs.find((n) => n.id === targetBuilding.characterId);
  const targetName = targetNpc?.name ?? 'un grand maître';

  const mistakes = save.failedMistakes?.[targetBuilding.badgeId];
  if (mistakes && mistakes.length > 0) {
    const idx = ((hintCycleIndex % mistakes.length) + mistakes.length) % mistakes.length;
    const hintText = formatMistakeHint(mistakes[idx], targetName);
    return {
      messages: [hintText],
      text: hintText,
      isMistakeHint: true,
      targetBadgeId: targetBuilding.badgeId,
    };
  }

  const intro =
    npc.hintLines?.[0] ?? 'Mon petit doigt me dit qu’un défi passionnant vous attend chez';
  const msg1 = `${intro} ${targetName} ! Rendez-vous dans « ${targetBuilding.name} », pas loin d’ici !`;
  const msg2 =
    'Et si le défi vous résiste, revenez me voir : je vous glisserai un indice sur ce qui vous a piégé !';
  return {
    messages: [msg1, msg2],
    text: `${msg1} ${msg2}`,
    isMistakeHint: false,
    targetBadgeId: targetBuilding.badgeId,
  };
}

const FEMININE_SECONDARY_IDS = new Set([
  'pm_sec_6', // Emily Brontë
  'pm_sec_9', // Mary Shelley
  'df_sec_6', // Gal Costa
  'jp_sec_4', // Dorothea Lange
  'jp_sec_5', // Hélène Darroze
  'jp_sec_7', // Annie Leibovitz
  'sd_sec_3', // Fred Vargas
  'sd_sec_5', // Yōko Kanno
  'sd_sec_6', // Hailee Steinfeld
]);

/**
 * Resolves the closest secondary NPC who can help with a given main challenger's minigame.
 * Prefers the 1-to-1 companion secondary NPC (`hintTargetBadgeIds[0] === challenger.badgeId`),
 * falling back to the geometrically closest secondary NPC to the challenger's house door.
 */
export function resolveClosestSecondaryForChallenger(
  challenger: NpcEntity,
  world: WorldDefinition
): NpcEntity | undefined {
  if (challenger.role !== 'main' || !challenger.badgeId) return undefined;
  const secondaryNpcs = world.npcs.filter(
    (n) => n.role === 'secondary' && n.district === challenger.district
  );
  if (secondaryNpcs.length === 0) return undefined;

  const direct = secondaryNpcs.find((s) => s.hintTargetBadgeIds?.[0] === challenger.badgeId);
  if (direct) return direct;

  const building = world.buildings.find((b) => b.badgeId === challenger.badgeId);
  const refX = building?.doorX ?? challenger.x;
  const refY = building?.doorY ?? challenger.y;

  let best = secondaryNpcs[0];
  let bestDist = Math.hypot(best.x - refX, best.y - refY);
  for (let i = 1; i < secondaryNpcs.length; i++) {
    const s = secondaryNpcs[i];
    const d = Math.hypot(s.x - refX, s.y - refY);
    if (d < bestDist) {
      best = s;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Formats the main character's advice on the defeat screen naming the closest
 * secondary NPC who might have a hint for the player.
 */
export function formatLoseHelperLine(helper: NpcEntity): string {
  const pronoun = FEMININE_SECONDARY_IDS.has(helper.id) ? 'elle' : 'il';
  return `Allez demander de l’aide à ${helper.name} juste dehors : ${pronoun} aura peut-être un indice pour vous aider !`;
}

/**
 * Returns true when this secondary NPC currently has a mistake-specific hint
 * ready for the player (used to highlight their overhead `?` badge in gold).
 */
export function secondaryHasPendingHint(
  npc: NpcEntity,
  world: WorldDefinition,
  save: ModeSaveData
): boolean {
  return buildSecondaryDialogue(npc, world, save, 0).isMistakeHint;
}
