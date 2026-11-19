export type ModeId = 'pm' | 'df' | 'jp' | 'aj';

export type Direction = 'down' | 'up' | 'left' | 'right';

export type WorldTheme = ModeId;

export type InteriorTheme =
  | 'theater'
  | 'salon'
  | 'samba_club'
  | 'cinema_set'
  | 'kitchen'
  | 'darkroom'
  | 'stadium'
  | 'court'
  | 'boss_hall';

export type TileType =
  | 'grass'
  | 'grass_flower'
  | 'path'
  | 'plaza'
  | 'bridge'
  | 'carpet'
  | 'sand'
  | 'star_tile'
  | 'door'
  | 'water'
  | 'tree'
  | 'wall_a'
  | 'wall_b'
  | 'roof_a'
  | 'roof_b'
  | 'window'
  | 'fence'
  | 'lamp'
  | 'sign'
  | 'fountain'
  | 'pillar'
  | 'statue'
  | 'gate_closed'
  | 'gate_open'
  | 'floor_wood'
  | 'floor_tile'
  | 'floor_court'
  | 'floor_turf'
  | 'rug'
  | 'exit_mat'
  | 'in_wall'
  | 'bookshelf'
  | 'stage'
  | 'counter'
  | 'table'
  | 'equipment'
  | 'hoop_prop'
  | 'goal_prop'
  | 'plant'
  | 'spotlight';

export type HairStyle =
  | 'short'
  | 'bob'
  | 'long'
  | 'curly'
  | 'wavy'
  | 'bald'
  | 'ponytail'
  | 'spiky'
  | 'bun'
  | 'sidepart'
  | 'pompadour'
  | 'afro'
  | 'wig';

export type Headwear =
  | 'none'
  | 'beret'
  | 'tophat'
  | 'bowler'
  | 'toque'
  | 'crown'
  | 'headband'
  | 'cap'
  | 'flower'
  | 'ribbon'
  | 'fedora'
  | 'feathered_hat'
  | 'turban';

export type GlassesStyle = 'none' | 'round' | 'square' | 'sunglasses' | 'monocle';

export type FacialHair = 'none' | 'mustache' | 'goatee' | 'beard' | 'stubble';

export type OutfitStyle =
  | 'casual'
  | 'coat'
  | 'dress'
  | 'suit'
  | 'historical'
  | 'chef'
  | 'jersey_foot'
  | 'jersey_basket'
  | 'vintage'
  | 'trench';

export interface SpriteAppearance {
  skin: string;
  hairColor: string;
  hairStyle: HairStyle;
  headwear?: Headwear;
  headwearColor?: string;
  glasses?: GlassesStyle;
  facialHair?: FacialHair;
  topColor: string;
  bottomColor: string;
  accentColor?: string;
  outfitStyle: OutfitStyle;
  jerseyNumber?: string;
}

export type PortraitProp =
  | 'none'
  | 'quill'
  | 'mask'
  | 'guitar'
  | 'flute'
  | 'film'
  | 'camera'
  | 'whisk'
  | 'macaron'
  | 'soccer'
  | 'basketball'
  | 'whistle'
  | 'rose'
  | 'clapper'
  | 'script';

export type CollarStyle =
  | 'normal'
  | 'ruff'
  | 'tricolor'
  | 'scarf'
  | 'bowtie'
  | 'tie'
  | 'necklace'
  | 'hoodie';

export interface PortraitSpec {
  bgTop: string;
  bgBottom: string;
  eyeColor: string;
  prop?: PortraitProp;
  collar?: CollarStyle;
  blush?: boolean;
}

export type FamilyMemberId =
  | 'pola'
  | 'marguerite'
  | 'dominique'
  | 'francis'
  | 'juliette'
  | 'pierre'
  | 'alexis'
  | 'joseph';

export interface FamilyMember {
  id: FamilyMemberId;
  name: string;
  voicePitch: number;
  appearance: SpriteAppearance;
  portrait: PortraitSpec;
  /** Optionnel : chemin ou Data URL vers un portrait pixel-art personnalisé issu d'une photo */
  customPortraitUrl?: string;
  /** Optionnel : chemin ou Data URL vers une planche de sprite 16x24 personnalisée */
  customSpriteSheetUrl?: string;
}

export interface FamilyPair {
  modeId: ModeId;
  shortCode: string;
  label: string;
  themeLabel: string;
  worldName: string;
  primaryColor: string;
  secondaryColor: string;
  members: [FamilyMember, FamilyMember];
}

export type BadgeIconShape =
  | 'flower'
  | 'quill'
  | 'ship'
  | 'mask'
  | 'crown'
  | 'book'
  | 'heart'
  | 'tragedy'
  | 'fan'
  | 'scroll'
  | 'sword'
  | 'globe'
  | 'piano'
  | 'drum'
  | 'cane'
  | 'train'
  | 'mic'
  | 'fedora'
  | 'umbrella'
  | 'bossanote'
  | 'guitar'
  | 'diamond'
  | 'tiara'
  | 'film'
  | 'whisk'
  | 'macaron'
  | 'camera'
  | 'aperture'
  | 'star_chef'
  | 'copper_pot'
  | 'mountain'
  | 'lens'
  | 'ladle'
  | 'atom'
  | 'flash'
  | 'leica'
  | 'toque_gold'
  | 'bolt'
  | 'shield'
  | 'hoop'
  | 'trophy'
  | 'boot'
  | 'joga'
  | 'net'
  | 'crown_mvp'
  | 'cannon'
  | 'goat'
  | 'snake'
  | 'ring'
  | 'ballon_dor'
  | 'rose_gold';

export interface BadgeDef {
  id: string;
  name: string;
  characterId: string;
  characterName: string;
  district: 1 | 2 | 3 | 4;
  category: string;
  icon: BadgeIconShape;
  color: string;
  rimColor: string;
  description: string;
}

export interface RhythmChallengeConfig {
  kind: 'rhythm';
  title: string;
  instructions: string;
  themeStyle:
    | 'poetry'
    | 'theater'
    | 'samba'
    | 'bossa'
    | 'jazz'
    | 'tap'
    | 'chanson'
    | 'football'
    | 'dribble'
    | 'kitchen';
  bpm: number;
  durationSec: number;
  requiredScoreRatio: number;
  laneLabels: [string, string, string, string];
  laneColors: [string, string, string, string];
  notes: [number, number, number, number];
  density: 'medium' | 'brisk' | 'intense';
}

export interface DodgeCollectChallengeConfig {
  kind: 'dodge_collect';
  title: string;
  instructions: string;
  themeStyle:
    | 'boat'
    | 'factory'
    | 'train'
    | 'carnival'
    | 'film_run'
    | 'war_photo'
    | 'football_dribble'
    | 'court_drive'
    | 'birds'
    | 'kitchen_rush';
  durationSec: number;
  targetCount: number;
  lives: number;
  hazardSpeed: number;
  spawnRate: number;
  playerLabel: string;
  collectLabel: string;
  hazardLabel: string;
}

export interface TimingShotChallengeConfig {
  kind: 'timing_shot';
  title: string;
  instructions: string;
  themeStyle:
    | 'freekick'
    | 'threepoint'
    | 'macaron'
    | 'souffle'
    | 'buzzer'
    | 'duel_pen'
    | 'cinema_clap';
  totalAttempts: number;
  requiredHits: number;
  needleSpeed: number;
  sweetSpotWidth: number;
  movingTarget: boolean;
  dualAxis?: boolean;
}

export interface ViewfinderChallengeConfig {
  kind: 'viewfinder';
  title: string;
  instructions: string;
  themeStyle:
    | 'paris_street'
    | 'nature_bw'
    | 'red_carpet'
    | 'wildlife'
    | 'puddle_jump'
    | 'spotlight'
    | 'thriller_birds';
  durationSec: number;
  requiredShots: number;
  maxFilm: number;
  subjectSpeed: number;
  frameSize: number;
  requiresPeakMoment: boolean;
}

export interface ReactionDuelChallengeConfig {
  kind: 'reaction_duel';
  title: string;
  instructions: string;
  themeStyle:
    | 'sword'
    | 'stage_cue'
    | 'block_shot'
    | 'chase_block'
    | 'penalty_save'
    | 'cinema_draw';
  rounds: number;
  requiredWins: number;
  windowMs: number;
  directional: boolean;
  fakeouts: boolean;
}

export interface SortOrderItem {
  label: string;
  color: string;
}

export interface KitchenSortChallengeConfig {
  kind: 'kitchen_sort';
  title: string;
  instructions: string;
  themeStyle: 'recipe' | 'rhyme' | 'pamphlet' | 'molecular' | 'film_edit';
  durationSec: number;
  requiredOrders: number;
  lives: number;
  beltSpeed: number;
  orders: {
    prompt: string;
    sequence: SortOrderItem[];
    distractors: SortOrderItem[];
  }[];
}

export interface BalanceMeterChallengeConfig {
  kind: 'balance_meter';
  title: string;
  instructions: string;
  themeStyle: 'puree' | 'darkroom' | 'souffle_oven' | 'bossa_breath';
  durationSec: number;
  zoneHeight: number;
  zoneDriftSpeed: number;
  turbulence: number;
  fillRate: number;
}

export interface MemoryPatternChallengeConfig {
  kind: 'memory_pattern';
  title: string;
  instructions: string;
  themeStyle: 'theater_cues' | 'bossa_chords' | 'play_calls' | 'gala_menu';
  padLabels: [string, string, string, string];
  padColors: [string, string, string, string];
  padNotes: [number, number, number, number];
  rounds: number[];
  playbackMs: number;
  lives: number;
}

export interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

export interface QuizChallengeConfig {
  kind: 'quiz';
  title: string;
  instructions: string;
  timePerQuestionSec: number;
  questions: QuizQuestion[];
  playerHp: number;
  enemyHp: number;
}

export interface RiddleItem {
  clues: [string, string, string];
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

export interface RiddleChallengeConfig {
  kind: 'riddle_word';
  title: string;
  instructions: string;
  timePerRiddleSec: number;
  riddles: RiddleItem[];
  playerHp: number;
  enemyHp: number;
}

export type SingleChallengeConfig =
  | RhythmChallengeConfig
  | DodgeCollectChallengeConfig
  | TimingShotChallengeConfig
  | ViewfinderChallengeConfig
  | ReactionDuelChallengeConfig
  | KitchenSortChallengeConfig
  | BalanceMeterChallengeConfig
  | MemoryPatternChallengeConfig
  | QuizChallengeConfig
  | RiddleChallengeConfig;

export interface BossPhaseConfig {
  phaseTitle: string;
  taunt: string;
  challenge: SingleChallengeConfig;
}

export interface BossChallengeConfig {
  kind: 'boss_gauntlet';
  title: string;
  phases: BossPhaseConfig[];
}

export type ChallengeConfig = SingleChallengeConfig | BossChallengeConfig;

export interface Warp {
  x: number;
  y: number;
  targetMapId: string;
  targetX: number;
  targetY: number;
  targetDir: Direction;
}

export interface SignPost {
  x: number;
  y: number;
  title: string;
  subtitle?: string;
}

export interface DistrictGate {
  id: string;
  districtLabel: string;
  requiredBadges: number;
  tiles: { x: number; y: number }[];
  gatekeeperNpcId: string;
}

export type NpcRole = 'main' | 'boss' | 'secondary' | 'gatekeeper' | 'cameo';

export interface CameoLine {
  speaker: string;
  portraitOwner: 'a' | 'b';
  text: string;
}

export interface NpcEntity {
  id: string;
  name: string;
  title: string;
  role: NpcRole;
  district: 1 | 2 | 3 | 4;
  mapId: string;
  x: number;
  y: number;
  dir: Direction;
  appearance: SpriteAppearance;
  portrait: PortraitSpec;
  voicePitch: number;
  badgeId?: string;
  challenge?: ChallengeConfig;
  introLines?: string[];
  alreadyWonLines?: string[];
  winLines?: string[];
  loseLines?: string[];
  duoWinReaction?: string;
  notebookBio?: string;
  hintTargetBadgeIds?: string[];
  hintLines?: string[];
  gateId?: string;
  cameoPairCode?: ModeId;
  partnerName?: string;
  partnerAppearance?: SpriteAppearance;
  partnerPortrait?: PortraitSpec;
  cameoLines?: CameoLine[];
}

export interface MapData {
  id: string;
  name: string;
  isInterior: boolean;
  theme: WorldTheme | InteriorTheme;
  width: number;
  height: number;
  tiles: TileType[][];
  warps: Warp[];
  signs: SignPost[];
}

export interface DistrictMeta {
  id: 1 | 2 | 3 | 4;
  name: string;
  minY: number;
  maxY: number;
}

export interface BuildingMeta {
  id: string;
  name: string;
  district: 1 | 2 | 3 | 4;
  doorX: number;
  doorY: number;
  interiorMapId: string;
  characterId: string;
  badgeId: string;
  isBoss?: boolean;
}

export interface WorldDefinition {
  modeId: ModeId;
  worldName: string;
  subtitle: string;
  bgmId: 'world_pm' | 'world_df' | 'world_jp' | 'world_aj';
  overworldId: string;
  spawnX: number;
  spawnY: number;
  districts: DistrictMeta[];
  gates: DistrictGate[];
  buildings: BuildingMeta[];
  maps: Record<string, MapData>;
  npcs: NpcEntity[];
  badges: BadgeDef[];
  bossBadge: BadgeDef;
}

export interface ModeSaveData {
  badges: string[];
  bossDefeated: boolean;
  metNpcs: string[];
  playTimeSeconds: number;
  attempts: number;
  leaderIndex: 0 | 1;
  lastMapId: string;
  lastX: number;
  lastY: number;
}

export interface GlobalSaveData {
  version: 1;
  muted: boolean;
  modes: Record<ModeId, ModeSaveData>;
}

export type GameScene =
  | 'TITLE'
  | 'MODE_SELECT'
  | 'OVERWORLD'
  | 'DIALOGUE'
  | 'PAUSE_MENU'
  | 'CHALLENGE'
  | 'ENDING';
