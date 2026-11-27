export type ModeId = 'pm' | 'df' | 'jp' | 'aj' | 'sd';

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
  | 'manga_studio'
  | 'noir_cinema'
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
  | 'wig'
  | 'receding'
  | 'tousled_curls'
  | 'bangs_wavy';

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

export type GlassesStyle = 'none' | 'round' | 'square' | 'sunglasses' | 'monocle' | 'clear';

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
  glassesColor?: string;
  facialHair?: FacialHair;
  facialHairColor?: string;
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
  smile?: 'normal' | 'wide';
}

export type FamilyMemberId =
  | 'pola'
  | 'marguerite'
  | 'pierre_pm'
  | 'dominique'
  | 'francis'
  | 'juliette'
  | 'pierre'
  | 'alexis'
  | 'joseph'
  | 'sam'
  | 'denis';

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

export type FamilyTeamMembers = [FamilyMember, FamilyMember, ...FamilyMember[]];

export interface FamilyPair {
  modeId: ModeId;
  shortCode: string;
  label: string;
  themeLabel: string;
  worldName: string;
  primaryColor: string;
  secondaryColor: string;
  members: FamilyTeamMembers;
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

export type ReflectionTheme =
  | 'literature'
  | 'theater'
  | 'music_br'
  | 'cinema'
  | 'gastronomy'
  | 'photography'
  | 'football'
  | 'basketball'
  | 'manga'
  | 'polar';

export interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation?: string;
}

export interface QuizChallengeConfig {
  kind: 'quiz';
  title: string;
  instructions: string;
  themeStyle?: ReflectionTheme;
  timePerQuestionSec: number;
  questions: QuizQuestion[];
  playerHp: number;
  enemyHp: number;
}

export interface RiddleItem {
  clues: [string, string, string];
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation?: string;
}

export interface RiddleChallengeConfig {
  kind: 'riddle_word';
  title: string;
  instructions: string;
  themeStyle?: ReflectionTheme;
  timePerRiddleSec: number;
  riddles: RiddleItem[];
  playerHp: number;
  enemyHp: number;
}

export interface OrderRound {
  prompt: string;
  /** 4 to 7 items in EXACT correct order (shuffled at runtime; NO dates leaked in labels!) */
  orderedItems: string[];
  /** Optional parallel array of reveal tags (e.g. '1921', '1925'...) revealed ONLY once an item is locked in green or round cleared! */
  revealTags?: string[];
  /** Optional directional hint labels when an item is misplaced, defaults to ['▲ Plus tôt', '▼ Plus tard'] */
  hintLabels?: [string, string];
  explanation: string;
}

export interface OrderPuzzleChallengeConfig {
  kind: 'order_puzzle';
  title: string;
  instructions: string;
  themeStyle: ReflectionTheme;
  lives: number;
  rounds: OrderRound[];
}

export interface PairMatchRound {
  prompt: string;
  /** 4 to 6 pairs to associate */
  pairs: { left: string; right: string }[];
  explanation: string;
}

export interface PairMatchChallengeConfig {
  kind: 'pair_match';
  title: string;
  instructions: string;
  themeStyle: ReflectionTheme;
  lives: number;
  rounds: PairMatchRound[];
}

export interface IntruderRound {
  prompt: string;
  items: [string, string, string, string];
  intruderIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface IntruderHuntChallengeConfig {
  kind: 'intruder_hunt';
  title: string;
  instructions: string;
  themeStyle: ReflectionTheme;
  lives: number;
  rounds: IntruderRound[];
}

export interface CategorySortItem {
  label: string;
  categoryIndex: 0 | 1 | 2;
  explanation: string;
}

export interface CategorySortChallengeConfig {
  kind: 'category_sort';
  title: string;
  instructions: string;
  themeStyle: ReflectionTheme;
  lives: number;
  prompt: string;
  /** 2 or 3 crisp category bucket titles (e.g. ['Ballon d’Or', 'Jamais Ballon d’Or']) */
  categories: [string, string] | [string, string, string];
  /** 6 to 8 items to classify one by one (shuffled at runtime!) */
  items: CategorySortItem[];
}

export type SingleChallengeConfig =
  | QuizChallengeConfig
  | RiddleChallengeConfig
  | OrderPuzzleChallengeConfig
  | PairMatchChallengeConfig
  | IntruderHuntChallengeConfig
  | CategorySortChallengeConfig;

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

export type NpcRole = 'main' | 'boss' | 'secondary' | 'gatekeeper' | 'cameo' | 'guest';

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
  customPortraitUrl?: string;
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
  fixedLines?: string[];
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
  bgmId: 'world_pm' | 'world_df' | 'world_jp' | 'world_aj' | 'world_sd';
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

export type ChallengeMistake =
  | {
      kind: 'order_puzzle';
      earlierItem: string;
      laterItem: string;
      chronological: boolean;
    }
  | {
      kind: 'pair_match';
      leftText: string;
      wrongRightText: string;
      correctRightText: string;
    }
  | {
      kind: 'intruder_hunt';
      pickedItem: string;
      intruderItem: string;
    }
  | {
      kind: 'category_sort';
      itemLabel: string;
      wrongCategory: string;
      correctCategory: string;
    }
  | {
      kind: 'quiz';
      question: string;
      wrongAnswer: string;
      correctAnswer: string;
    }
  | {
      kind: 'riddle_word';
      clue: string;
      wrongAnswer: string;
      correctAnswer: string;
    };

export interface ChallengeProgress {
  /** Pour un boss_gauntlet : phase (Acte) atteinte (0, 1 ou 2). Toujours 0 pour un défi simple. */
  bossPhaseIdx: number;
  /** Nombre de manches / questions / cartes déjà réussies dans le mini-jeu en cours. */
  stepIndex: number;
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
  failedMistakes?: Record<string, ChallengeMistake[]>;
  challengeProgress?: Record<string, ChallengeProgress>;
}

export interface GlobalSaveData {
  version: 1;
  muted: boolean;
  modes: Record<ModeId, ModeSaveData>;
}

export type GameScene =
  | 'WELCOME'
  | 'MODE_SELECT'
  | 'OVERWORLD'
  | 'DIALOGUE'
  | 'PAUSE_MENU'
  | 'CHALLENGE'
  | 'ENDING';
