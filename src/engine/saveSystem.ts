import { ChallengeMistake, GlobalSaveData, ModeId, ModeSaveData } from '../types';

export const SAVE_STORAGE_KEY = 'pokenoel_save_v1';

const DEFAULT_SPAWNS: Record<ModeId, { mapId: string; x: number; y: number }> = {
  pm: { mapId: 'pm_overworld', x: 30, y: 39 },
  df: { mapId: 'df_overworld', x: 30, y: 39 },
  jp: { mapId: 'jp_overworld', x: 30, y: 39 },
  aj: { mapId: 'aj_overworld', x: 30, y: 39 },
  sd: { mapId: 'sd_overworld', x: 30, y: 39 },
};

export function createDefaultModeSave(modeId: ModeId): ModeSaveData {
  const spawn = DEFAULT_SPAWNS[modeId];
  return {
    badges: [],
    bossDefeated: false,
    metNpcs: [],
    playTimeSeconds: 0,
    attempts: 0,
    leaderIndex: 0,
    lastMapId: spawn.mapId,
    lastX: spawn.x,
    lastY: spawn.y,
  };
}

export function createDefaultGlobalSave(): GlobalSaveData {
  return {
    version: 1,
    muted: false,
    modes: {
      pm: createDefaultModeSave('pm'),
      df: createDefaultModeSave('df'),
      jp: createDefaultModeSave('jp'),
      aj: createDefaultModeSave('aj'),
      sd: createDefaultModeSave('sd'),
    },
  };
}

function isValidMistake(m: unknown): m is ChallengeMistake {
  if (!m || typeof m !== 'object') return false;
  const o = m as Record<string, unknown>;
  switch (o.kind) {
    case 'order_puzzle':
      return (
        typeof o.earlierItem === 'string' &&
        typeof o.laterItem === 'string' &&
        typeof o.chronological === 'boolean'
      );
    case 'pair_match':
      return (
        typeof o.leftText === 'string' &&
        typeof o.wrongRightText === 'string' &&
        typeof o.correctRightText === 'string'
      );
    case 'intruder_hunt':
      return typeof o.pickedItem === 'string' && typeof o.intruderItem === 'string';
    case 'category_sort':
      return (
        typeof o.itemLabel === 'string' &&
        typeof o.wrongCategory === 'string' &&
        typeof o.correctCategory === 'string'
      );
    case 'quiz':
      return (
        typeof o.question === 'string' &&
        typeof o.wrongAnswer === 'string' &&
        typeof o.correctAnswer === 'string'
      );
    case 'riddle_word':
      return (
        typeof o.clue === 'string' &&
        typeof o.wrongAnswer === 'string' &&
        typeof o.correctAnswer === 'string'
      );
    default:
      return false;
  }
}

function sanitizeFailedMistakes(
  raw: unknown,
  badges: string[]
): Record<string, ChallengeMistake[]> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, ChallengeMistake[]> = {};
  let hasAny = false;
  for (const [badgeId, list] of Object.entries(raw as Record<string, unknown>)) {
    if (badges.includes(badgeId) || !Array.isArray(list)) continue;
    const cleaned = list.filter(isValidMistake).slice(0, 5);
    if (cleaned.length > 0) {
      out[badgeId] = cleaned;
      hasAny = true;
    }
  }
  return hasAny ? out : undefined;
}

function sanitizeModeSave(modeId: ModeId, raw: unknown): ModeSaveData {
  const def = createDefaultModeSave(modeId);
  if (!raw || typeof raw !== 'object') return def;
  const obj = raw as Partial<ModeSaveData>;
  const badges = Array.isArray(obj.badges)
    ? [...new Set(obj.badges.filter((x) => typeof x === 'string'))]
    : [];
  const failedMistakes = sanitizeFailedMistakes(obj.failedMistakes, badges);
  return {
    badges,
    bossDefeated: Boolean(obj.bossDefeated),
    metNpcs: Array.isArray(obj.metNpcs) ? [...new Set(obj.metNpcs.filter((x) => typeof x === 'string'))] : [],
    playTimeSeconds: typeof obj.playTimeSeconds === 'number' && Number.isFinite(obj.playTimeSeconds) ? Math.max(0, Math.floor(obj.playTimeSeconds)) : 0,
    attempts: typeof obj.attempts === 'number' && Number.isFinite(obj.attempts) ? Math.max(0, Math.floor(obj.attempts)) : 0,
    leaderIndex: obj.leaderIndex === 1 ? 1 : 0,
    lastMapId: typeof obj.lastMapId === 'string' && obj.lastMapId.length > 0 ? obj.lastMapId : def.lastMapId,
    lastX: typeof obj.lastX === 'number' && Number.isFinite(obj.lastX) ? obj.lastX : def.lastX,
    lastY: typeof obj.lastY === 'number' && Number.isFinite(obj.lastY) ? obj.lastY : def.lastY,
    ...(failedMistakes ? { failedMistakes } : {}),
  };
}

export function sanitizeGlobalSave(raw: unknown): GlobalSaveData {
  const def = createDefaultGlobalSave();
  if (!raw || typeof raw !== 'object') return def;
  const obj = raw as Partial<GlobalSaveData>;
  const modes = (obj.modes ?? {}) as Partial<Record<ModeId, unknown>>;
  return {
    version: 1,
    muted: Boolean(obj.muted),
    modes: {
      pm: sanitizeModeSave('pm', modes.pm),
      df: sanitizeModeSave('df', modes.df),
      jp: sanitizeModeSave('jp', modes.jp),
      aj: sanitizeModeSave('aj', modes.aj),
      sd: sanitizeModeSave('sd', modes.sd),
    },
  };
}

export function loadGlobalSave(): GlobalSaveData {
  try {
    if (typeof localStorage === 'undefined') return createDefaultGlobalSave();
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return createDefaultGlobalSave();
    return sanitizeGlobalSave(JSON.parse(raw));
  } catch {
    return createDefaultGlobalSave();
  }
}

export function saveGlobalSave(data: GlobalSaveData): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota / private mode failures
  }
}

function computeChecksum(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64ToUtf8(b64: string): string {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function encodeSaveCode(data: GlobalSaveData): string {
  const json = JSON.stringify(sanitizeGlobalSave(data));
  const payload = utf8ToBase64(json);
  const check = computeChecksum(payload);
  return `PKN1-${check}-${payload}`;
}

export function decodeSaveCode(code: string): GlobalSaveData | null {
  try {
    const clean = code.trim();
    const match = /^PKN1-([A-Z0-9]{6})-([A-Za-z0-9\-_]+)$/.exec(clean);
    if (!match) return null;
    const [, check, payload] = match;
    if (computeChecksum(payload) !== check) return null;
    const json = base64ToUtf8(payload);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1 || !parsed.modes) {
      return null;
    }
    return sanitizeGlobalSave(parsed);
  } catch {
    return null;
  }
}
