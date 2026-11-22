import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WORLDS } from '../src/data';
import { FAMILY_MEMBERS, FAMILY_PAIRS, MODE_ORDER } from '../src/data/familyAvatars';
import { GameButton, InputManager } from '../src/engine/input';
import { drawBadgeIcon, drawOverworldSprite, drawPortrait } from '../src/engine/pixelRenderer';
import { drawTile } from '../src/engine/tilesetRenderer';
import { CategorySortGame } from '../src/minigames/categorySortGame';
import { ChallengeRunner } from '../src/minigames/challengeRunner';
import { MiniGameInstance } from '../src/minigames/common';
import { IntruderHuntGame } from '../src/minigames/intruderHuntGame';
import { OrderPuzzleGame } from '../src/minigames/orderPuzzleGame';
import { PairMatchGame } from '../src/minigames/pairMatchGame';
import { QuizRiddleGame } from '../src/minigames/quizRiddleGame';
import {
  CategorySortChallengeConfig,
  FamilyMember,
  IntruderHuntChallengeConfig,
  NpcEntity,
  OrderPuzzleChallengeConfig,
  PairMatchChallengeConfig,
  QuizChallengeConfig,
  ReflectionTheme,
  SingleChallengeConfig,
} from '../src/types';

function createMockCtx(drawnTexts?: string[]): CanvasRenderingContext2D {
  const noop = () => {};
  const grad = () => ({ addColorStop: noop });
  const ctx = {
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    shadowBlur: 0,
    shadowColor: 'transparent',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    font: '10px sans-serif',
    textAlign: 'left',
    textBaseline: 'top',
    imageSmoothingEnabled: false,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    quadraticCurveTo: noop,
    bezierCurveTo: noop,
    arc: noop,
    arcTo: noop,
    ellipse: noop,
    rect: noop,
    roundRect: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    fillText: (text: string) => {
      if (drawnTexts) drawnTexts.push(String(text));
    },
    strokeText: noop,
    drawImage: noop,
    save: noop,
    restore: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
    transform: noop,
    setTransform: noop,
    resetTransform: noop,
    setLineDash: noop,
    getLineDash: () => [],
    measureText: (text: string) => ({ width: text.length * 5.2 }),
    createLinearGradient: grad,
    createRadialGradient: grad,
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

class TestInput extends InputManager {
  tapAt(x: number, y: number): void {
    (this as unknown as { canvasTap: { x: number; y: number } | null }).canvasTap = { x, y };
  }
  holdCanvas(held: boolean): void {
    (this as unknown as { canvasHeld: boolean }).canvasHeld = held;
  }
  tapButton(btn: GameButton): void {
    this.pressButton(btn);
  }
}

let originalDocumentDescriptor: PropertyDescriptor | undefined;

beforeAll(() => {
  originalDocumentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const mockDoc = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 384,
          height: 240,
          getContext: () => createMockCtx(),
        };
      }
      return {};
    },
    querySelector: () => null,
    activeElement: null,
  };
  Object.defineProperty(globalThis, 'document', {
    value: mockDoc,
    configurable: true,
    writable: true,
  });
});

afterAll(() => {
  if (originalDocumentDescriptor) {
    Object.defineProperty(globalThis, 'document', originalDocumentDescriptor);
  } else {
    delete (globalThis as { document?: unknown }).document;
  }
});

function instantiateSingle(
  cfg: SingleChallengeConfig,
  leader: FamilyMember,
  challenger: NpcEntity
): MiniGameInstance {
  switch (cfg.kind) {
    case 'quiz':
    case 'riddle_word':
      return new QuizRiddleGame(cfg, leader, challenger);
    case 'order_puzzle':
      return new OrderPuzzleGame(cfg);
    case 'pair_match':
      return new PairMatchGame(cfg);
    case 'intruder_hunt':
      return new IntruderHuntGame(cfg);
    case 'category_sort':
      return new CategorySortGame(cfg);
  }
}

/**
 * Drives any MiniGameInstance to a verified 'won' state while exercising
 * update() + render() across gameplay states. Works both standalone and
 * inside ChallengeRunner (via optional tick callback).
 */
function driveMiniGameToWin(
  game: MiniGameInstance,
  cfg: SingleChallengeConfig,
  ctx: CanvasRenderingContext2D,
  stepFn?: (dt: number, input: TestInput) => void
): void {
  const input = new TestInput();
  const step = (dt: number, doRender = true) => {
    if (stepFn) {
      stepFn(dt, input);
    } else {
      game.update(dt, input);
      if (doRender) game.render(ctx);
    }
    input.endFrame();
  };

  switch (cfg.kind) {
    case 'quiz':
    case 'riddle_word': {
      for (let i = 0; i < cfg.enemyHp + 2 && game.getResult() === 'playing'; i++) {
        const internals = game as unknown as { index: number; cursor: number; pauseTimer: number };
        const correctIdx =
          cfg.kind === 'quiz'
            ? cfg.questions[internals.index].correctIndex
            : cfg.riddles[internals.index].correctIndex;
        internals.cursor = correctIdx;
        input.tapButton('a');
        input.releaseButton('a');
        step(0.016, true);

        let settle = 0;
        while (internals.pauseTimer > 0 && game.getResult() === 'playing' && settle < 30) {
          step(0.2, true);
          settle++;
        }
      }
      break;
    }

    case 'order_puzzle': {
      const og = game as OrderPuzzleGame;
      for (let r = 0; r < cfg.rounds.length && game.getResult() === 'playing'; r++) {
        const n = og.slots.length;
        // Selection-sort slots using real pick-up & swap interactions (works for 4..7 items)
        for (let targetPos = 0; targetPos < n; targetPos++) {
          const currentIdx = og.slots.findIndex((s) => s.correctPos === targetPos);
          if (currentIdx !== targetPos) {
            og.cursor = currentIdx;
            input.tapButton('a');
            input.releaseButton('a');
            step(0.016, true);

            og.cursor = targetPos;
            input.tapButton('a');
            input.releaseButton('a');
            step(0.016, true);
          }
        }
        // Validate via Validate button (cursor = slots.length)
        og.cursor = n;
        input.tapButton('a');
        input.releaseButton('a');
        step(0.016, true);

        // Wait through explanation celebration beat (auto-advance)
        let settle = 0;
        while (og.feedbackTimer > 0 && game.getResult() === 'playing' && settle < 30) {
          step(0.2, true);
          settle++;
        }
      }
      break;
    }

    case 'pair_match': {
      const pg = game as PairMatchGame;
      for (let r = 0; r < cfg.rounds.length && game.getResult() === 'playing'; r++) {
        const n = pg.leftItems.length;
        for (let leftIdx = 0; leftIdx < n && game.getResult() === 'playing'; leftIdx++) {
          const pairId = pg.leftItems[leftIdx].pairId;
          const rightIdx = pg.rightItems.findIndex((it) => it.pairId === pairId);

          pg.leftCursor = leftIdx;
          input.tapButton('a');
          input.releaseButton('a');
          step(0.016, true);

          pg.rightCursor = rightIdx;
          input.tapButton('a');
          input.releaseButton('a');
          step(0.016, true);
        }

        let settle = 0;
        while (pg.feedbackTimer > 0 && game.getResult() === 'playing' && settle < 30) {
          step(0.2, true);
          settle++;
        }
      }
      break;
    }

    case 'intruder_hunt': {
      const ig = game as IntruderHuntGame;
      for (let r = 0; r < cfg.rounds.length && game.getResult() === 'playing'; r++) {
        ig.cursor = cfg.rounds[ig.roundIndex].intruderIndex;
        input.tapButton('a');
        input.releaseButton('a');
        step(0.016, true);

        let settle = 0;
        while (ig.revealTimer > 0 && game.getResult() === 'playing' && settle < 30) {
          step(0.2, true);
          settle++;
        }
      }
      break;
    }

    case 'category_sort': {
      const cg = game as CategorySortGame;
      for (let i = 0; i < cfg.items.length + 2 && game.getResult() === 'playing'; i++) {
        cg.cursor = cg.items[cg.itemIndex].categoryIndex;
        input.tapButton('a');
        input.releaseButton('a');
        step(0.016, true);

        let settle = 0;
        while (cg.revealTimer > 0 && game.getResult() === 'playing' && settle < 30) {
          step(0.2, true);
          settle++;
        }
      }
      break;
    }
  }
}

/**
 * Drives any MiniGameInstance to a verified 'lost' state while exercising
 * update() + render().
 */
function driveMiniGameToLoss(
  game: MiniGameInstance,
  cfg: SingleChallengeConfig,
  ctx: CanvasRenderingContext2D,
  stepFn?: (dt: number, input: TestInput) => void
): void {
  const input = new TestInput();
  const step = (dt: number, doRender = true) => {
    if (stepFn) {
      stepFn(dt, input);
    } else {
      game.update(dt, input);
      if (doRender) game.render(ctx);
    }
    input.endFrame();
  };

  switch (cfg.kind) {
    case 'quiz':
    case 'riddle_word': {
      for (let i = 0; i < cfg.playerHp + 2 && game.getResult() === 'playing'; i++) {
        const internals = game as unknown as { index: number; cursor: number; pauseTimer: number };
        const correctIdx =
          cfg.kind === 'quiz'
            ? cfg.questions[internals.index].correctIndex
            : cfg.riddles[internals.index].correctIndex;
        internals.cursor = (correctIdx + 1) % 4;
        input.tapButton('a');
        input.releaseButton('a');
        step(0.016, true);

        let settle = 0;
        while (internals.pauseTimer > 0 && game.getResult() === 'playing' && settle < 30) {
          step(0.2, true);
          settle++;
        }
      }
      break;
    }

    case 'order_puzzle': {
      const og = game as OrderPuzzleGame;
      // Guaranteed initial shuffle is NOT solved, so validating repeatedly loses lives cleanly
      for (let attempt = 0; attempt < cfg.lives + 2 && game.getResult() === 'playing'; attempt++) {
        og.cursor = og.slots.length;
        input.tapButton('a');
        input.releaseButton('a');
        step(0.016, true);
      }
      break;
    }

    case 'pair_match': {
      const pg = game as PairMatchGame;
      for (let attempt = 0; attempt < cfg.lives + 2 && game.getResult() === 'playing'; attempt++) {
        const leftIdx = pg.leftItems.findIndex((it) => !it.matched);
        const wrongRightIdx = pg.rightItems.findIndex(
          (it) => !it.matched && it.pairId !== pg.leftItems[leftIdx].pairId
        );
        pg.leftCursor = leftIdx;
        input.tapButton('a');
        input.releaseButton('a');
        step(0.016, true);

        pg.rightCursor = wrongRightIdx;
        input.tapButton('a');
        input.releaseButton('a');
        step(0.016, true);
      }
      break;
    }

    case 'intruder_hunt': {
      const ig = game as IntruderHuntGame;
      for (let attempt = 0; attempt < cfg.lives + 2 && game.getResult() === 'playing'; attempt++) {
        const wrongIdx = (cfg.rounds[ig.roundIndex].intruderIndex + 1) % 4;
        ig.cursor = wrongIdx;
        input.tapButton('a');
        input.releaseButton('a');
        step(0.016, true);

        let settle = 0;
        while (ig.revealTimer > 0 && game.getResult() === 'playing' && settle < 30) {
          step(0.2, true);
          settle++;
        }
      }
      break;
    }

    case 'category_sort': {
      const cg = game as CategorySortGame;
      for (let attempt = 0; attempt < cfg.lives + 2 && game.getResult() === 'playing'; attempt++) {
        const wrongBucket = (cg.items[cg.itemIndex].categoryIndex + 1) % cfg.categories.length;
        cg.cursor = wrongBucket;
        input.tapButton('a');
        input.releaseButton('a');
        step(0.016, true);

        let settle = 0;
        while (cg.revealTimer > 0 && game.getResult() === 'playing' && settle < 30) {
          step(0.2, true);
          settle++;
        }
      }
      break;
    }
  }
}

function assertMathematicalPlayability(cfg: SingleChallengeConfig): void {
  switch (cfg.kind) {
    case 'quiz': {
      expect(cfg.questions.length).toBeGreaterThanOrEqual(cfg.enemyHp + 1);
      break;
    }
    case 'riddle_word': {
      expect(cfg.riddles.length).toBeGreaterThanOrEqual(cfg.enemyHp + 1);
      break;
    }
    case 'order_puzzle': {
      expect(cfg.lives).toBeGreaterThanOrEqual(1);
      expect(cfg.rounds.length).toBeGreaterThanOrEqual(1);
      for (const r of cfg.rounds) {
        expect(r.orderedItems.length).toBeGreaterThanOrEqual(4);
        expect(r.orderedItems.length).toBeLessThanOrEqual(7);
        expect(new Set(r.orderedItems.map((s) => s.trim())).size).toBe(r.orderedItems.length);
        if (r.revealTags) {
          expect(r.revealTags).toHaveLength(r.orderedItems.length);
        }
      }
      break;
    }
    case 'pair_match': {
      expect(cfg.lives).toBeGreaterThanOrEqual(1);
      expect(cfg.rounds.length).toBeGreaterThanOrEqual(1);
      for (const r of cfg.rounds) {
        expect(r.pairs.length).toBeGreaterThanOrEqual(4);
        expect(r.pairs.length).toBeLessThanOrEqual(6);
        expect(new Set(r.pairs.map((p) => p.left.trim())).size).toBe(r.pairs.length);
        expect(new Set(r.pairs.map((p) => p.right.trim())).size).toBe(r.pairs.length);
      }
      break;
    }
    case 'intruder_hunt': {
      expect(cfg.lives).toBeGreaterThanOrEqual(1);
      expect(cfg.rounds.length).toBeGreaterThanOrEqual(3);
      for (const r of cfg.rounds) {
        expect(r.items).toHaveLength(4);
        expect(r.intruderIndex).toBeGreaterThanOrEqual(0);
        expect(r.intruderIndex).toBeLessThanOrEqual(3);
      }
      break;
    }
    case 'category_sort': {
      expect(cfg.lives).toBeGreaterThanOrEqual(1);
      expect(cfg.categories.length).toBeGreaterThanOrEqual(2);
      expect(cfg.categories.length).toBeLessThanOrEqual(3);
      expect(cfg.items.length).toBeGreaterThanOrEqual(6);
      expect(cfg.items.length).toBeLessThanOrEqual(8);
      for (const it of cfg.items) {
        expect(it.categoryIndex).toBeGreaterThanOrEqual(0);
        expect(it.categoryIndex).toBeLessThan(cfg.categories.length);
      }
      break;
    }
  }
}

describe('PokéNoël : Tests unitaires des 6 moteurs de réflexion & quiz', () => {
  const ctx = createMockCtx();

  it('OrderPuzzleGame (7 films de Chaplin) : revealTags cachés avant verrouillage, indices hintDir, verrouillage partiel en vert, victoire et défaite', () => {
    const npc = WORLDS.df.npcs.find((n) => n.id === 'df_chaplin')!;
    expect(npc.challenge?.kind).toBe('order_puzzle');
    const cfg = npc.challenge as OrderPuzzleChallengeConfig;
    expect(cfg.rounds[0].orderedItems).toHaveLength(7);
    expect(cfg.rounds[0].revealTags).toHaveLength(7);

    const game = new OrderPuzzleGame(cfg);
    // Initial shuffle must NEVER start already solved
    expect(game.slots.every((s, idx) => s.correctPos === idx)).toBe(false);

    // Verify NO revealTags are drawn before any slot is locked!
    const initialTexts: string[] = [];
    game.render(createMockCtx(initialTexts));
    for (const tag of cfg.rounds[0].revealTags!) {
      expect(
        initialTexts.some((t) => t.includes(tag)),
        `revealTag "${tag}" ne doit PAS apparaître avant verrouillage`
      ).toBe(false);
    }

    const input = new TestInput();
    // Place slots 0, 1, 2, 3, 4 in exact order, and swap 5 & 6 to test partial green locks + hintDir!
    const arranged = [0, 1, 2, 3, 4, 6, 5].map((pos) => game.slots.find((s) => s.correctPos === pos)!);
    game.slots = arranged;

    // Click Validate button directly via mouse/tap (7-item layout: y = 203..224, x = 92..292)
    input.tapAt(190, 213);
    game.update(0.016, input);
    input.endFrame();

    expect(game.lives).toBe(cfg.lives - 1);
    for (let i = 0; i < 5; i++) {
      expect(game.slots[i].locked).toBe(true);
      expect(game.slots[i].hintDir).toBe(0);
    }
    // Slot 5 holds correctPos 6 (belongs later -> hintDir = +1); Slot 6 holds correctPos 5 (belongs earlier -> hintDir = -1)
    expect(game.slots[5].locked).toBe(false);
    expect(game.slots[5].hintDir).toBe(1);
    expect(game.slots[6].locked).toBe(false);
    expect(game.slots[6].hintDir).toBe(-1);

    // After partial validate, locked slots MUST reveal their golden revealTags, while unlocked slots stay hidden
    const postValidateTexts: string[] = [];
    game.render(createMockCtx(postValidateTexts));
    expect(postValidateTexts.some((t) => t.includes(cfg.rounds[0].revealTags![0]))).toBe(true);
    expect(postValidateTexts.some((t) => t.includes(cfg.rounds[0].revealTags![4]))).toBe(true);
    expect(postValidateTexts.some((t) => t.includes(cfg.rounds[0].revealTags![5]))).toBe(false);
    expect(postValidateTexts.some((t) => t.includes(cfg.rounds[0].revealTags![6]))).toBe(false);
    // Directional clues rendered for misplaced items
    expect(postValidateTexts.some((t) => t.includes('Plus tôt'))).toBe(true);
    expect(postValidateTexts.some((t) => t.includes('Plus tard'))).toBe(true);

    // Attempting to pick locked slot 0 (y: 53..72) must NOT select it
    input.tapAt(100, 62);
    game.update(0.016, input);
    input.endFrame();
    expect(game.selectedSlot).toBeNull();

    // Swap slots 5 (y: 158..177) and 6 (y: 179..198) via mouse/tap -> clears hintDir & fixes order
    input.tapAt(120, 167);
    game.update(0.016, input);
    input.endFrame();
    expect(game.selectedSlot).toBe(5);
    game.render(ctx);

    input.tapAt(120, 188);
    game.update(0.016, input);
    input.endFrame();
    expect(game.selectedSlot).toBeNull();
    expect(game.slots[5].correctPos).toBe(5);
    expect(game.slots[6].correctPos).toBe(6);
    expect(game.slots[5].hintDir).toBe(0);
    expect(game.slots[6].hintDir).toBe(0);

    // Validate again -> Round 1 solved with celebration explanation overlay
    input.tapAt(190, 213);
    game.update(0.016, input);
    input.endFrame();
    expect(game.feedbackTimer).toBeGreaterThan(0);
    game.render(ctx);

    // Skip explanation after 0.45s via A press -> advances to Round 2 (or wins if 1 round)
    game.update(0.5, input);
    input.tapButton('a');
    input.releaseButton('a');
    game.update(0.016, input);
    input.endFrame();
    if (cfg.rounds.length > 1) {
      expect(game.roundIndex).toBe(1);
      expect(game.feedbackTimer).toBe(0);
      driveMiniGameToWin(game, cfg, ctx);
    }
    expect(game.getResult()).toBe('won');

    // Loss flow
    const loseGame = new OrderPuzzleGame(cfg);
    driveMiniGameToLoss(loseGame, cfg, ctx);
    expect(loseGame.getResult()).toBe('lost');
  });

  it('PairMatchGame (5+ paires) : rubans de Bézier, clavier (pick_left/pick_right/annuler) + souris/tactile, victoire et défaite', () => {
    const npc = WORLDS.pm.npcs.find((n) => n.id === 'pm_rimbaud')!;
    expect(npc.challenge?.kind).toBe('pair_match');
    const cfg = npc.challenge as PairMatchChallengeConfig;
    expect(cfg.rounds[0].pairs.length).toBeGreaterThanOrEqual(5);

    const game = new PairMatchGame(cfg);
    // Right column must not be trivially straight across
    expect(game.rightItems.every((it, idx) => it.pairId === idx)).toBe(false);
    game.render(ctx);

    const input = new TestInput();
    // Dynamic row geometry for 5 vs 6 pairs
    const count = game.leftItems.length;
    const cardStartY = count === 5 ? 60 : count === 6 ? 56 : 70;
    const cardStep = count === 5 ? 33 : count === 6 ? 28 : 38;
    const cardHalfH = count === 5 ? 14 : count === 6 ? 12 : 16;

    // Tapping right column before picking left should not lose a life
    input.tapAt(280, cardStartY + cardHalfH);
    game.update(0.016, input);
    input.endFrame();
    expect(game.lives).toBe(cfg.lives);
    expect(game.phase).toBe('pick_left');

    // Keyboard: select left 0 with 'right', then cancel with 'b'
    input.tapButton('right');
    input.releaseButton('right');
    game.update(0.016, input);
    input.endFrame();
    expect(game.phase).toBe('pick_right');
    expect(game.selectedLeft).toBe(0);
    game.render(ctx);

    input.tapButton('b');
    input.releaseButton('b');
    game.update(0.016, input);
    input.endFrame();
    expect(game.phase).toBe('pick_left');
    expect(game.selectedLeft).toBeNull();

    // Mouse/tap mismatch -> deducts 1 life
    const wrongRightIdx = game.rightItems.findIndex((it) => it.pairId !== game.leftItems[0].pairId);
    input.tapAt(80, cardStartY + 0 * cardStep + cardHalfH);
    game.update(0.016, input);
    input.endFrame();
    expect(game.selectedLeft).toBe(0);

    input.tapAt(280, cardStartY + wrongRightIdx * cardStep + cardHalfH);
    game.update(0.016, input);
    input.endFrame();
    expect(game.lives).toBe(cfg.lives - 1);
    expect(game.matchedLinks).toHaveLength(0);
    game.render(ctx);

    // Mouse/tap match pair 0 -> adds Bezier ribbon link!
    const correctRightIdx = game.rightItems.findIndex((it) => it.pairId === game.leftItems[0].pairId);
    input.tapAt(80, cardStartY + 0 * cardStep + cardHalfH);
    game.update(0.016, input);
    input.endFrame();
    input.tapAt(280, cardStartY + correctRightIdx * cardStep + cardHalfH);
    game.update(0.016, input);
    input.endFrame();
    expect(game.matchedLinks).toHaveLength(1);
    expect(game.leftItems[0].matched).toBe(true);
    expect(game.rightItems[correctRightIdx].matched).toBe(true);
    game.render(ctx);

    // Complete full game -> won, plus 6-pair synthetic test!
    const winGame = new PairMatchGame(cfg);
    driveMiniGameToWin(winGame, cfg, ctx);
    expect(winGame.getResult()).toBe('won');

    const loseGame = new PairMatchGame(cfg);
    driveMiniGameToLoss(loseGame, cfg, ctx);
    expect(loseGame.getResult()).toBe('lost');

    const sixPairCfg: PairMatchChallengeConfig = {
      kind: 'pair_match',
      title: 'Test 6 paires',
      instructions: 'Reliez 6 paires',
      themeStyle: 'literature',
      lives: 3,
      rounds: [
        {
          prompt: 'Reliez les 6 éléments',
          pairs: [
            { left: 'A1', right: 'B1' },
            { left: 'A2', right: 'B2' },
            { left: 'A3', right: 'B3' },
            { left: 'A4', right: 'B4' },
            { left: 'A5', right: 'B5' },
            { left: 'A6', right: 'B6' },
          ],
          explanation: 'Explication complète des 6 paires.',
        },
      ],
    };
    const sixGame = new PairMatchGame(sixPairCfg);
    expect(sixGame.leftItems).toHaveLength(6);
    driveMiniGameToWin(sixGame, sixPairCfg, ctx);
    expect(sixGame.getResult()).toBe('won');
  });

  it('CategorySortGame : Tri d’Expert 2 catégories et 3 catégories, clavier (←/→ + A) + clic direct, cœur perdu + explication, victoire et défaite', () => {
    // 1) Find a real 2-bucket category_sort (e.g. pm_racine or aj_ronaldinho)
    const allCategoryChallenges: CategorySortChallengeConfig[] = [];
    for (const mode of MODE_ORDER) {
      for (const npc of WORLDS[mode].npcs) {
        if (npc.challenge?.kind === 'category_sort') {
          allCategoryChallenges.push(npc.challenge);
        } else if (npc.challenge?.kind === 'boss_gauntlet') {
          for (const ph of npc.challenge.phases) {
            if (ph.challenge.kind === 'category_sort') allCategoryChallenges.push(ph.challenge);
          }
        }
      }
    }
    const twoBucketCfg = allCategoryChallenges.find((c) => c.categories.length === 2);
    const threeBucketCfg = allCategoryChallenges.find((c) => c.categories.length === 3);
    expect(twoBucketCfg, 'Au moins un CategorySort à 2 catégories doit exister').toBeDefined();
    expect(threeBucketCfg, 'Au moins un CategorySort à 3 catégories doit exister').toBeDefined();

    // Test 2-bucket keyboard + click + wrong-bucket reveal + win/loss
    const g2 = new CategorySortGame(twoBucketCfg!);
    const input = new TestInput();
    g2.render(ctx);

    // Keyboard navigation ←/→ wraps between 0 and 1
    expect(g2.cursor).toBe(0);
    input.tapButton('right');
    input.releaseButton('right');
    g2.update(0.016, input);
    input.endFrame();
    expect(g2.cursor).toBe(1);

    input.tapButton('left');
    input.releaseButton('left');
    g2.update(0.016, input);
    input.endFrame();
    expect(g2.cursor).toBe(0);

    // Click directly on the CORRECT bucket for item 0 (2-bucket rects: [14..186, 198..370], y: 144..220)
    const correct0 = g2.items[0].categoryIndex;
    const bucket2CentersX = [100, 284];
    input.tapAt(bucket2CentersX[correct0], 180);
    g2.update(0.016, input);
    input.endFrame();
    expect(g2.lastCorrect).toBe(true);
    expect(g2.bucketCounts[correct0]).toBe(1);
    expect(g2.revealTimer).toBeGreaterThan(0);
    expect(g2.lives).toBe(twoBucketCfg!.lives);
    g2.render(ctx);

    // Skip reveal after 0.4s via tap -> itemIndex advances to 1
    g2.update(0.45, input);
    input.tapAt(192, 100);
    g2.update(0.016, input);
    input.endFrame();
    expect(g2.itemIndex).toBe(1);
    expect(g2.revealTimer).toBe(0);

    // Pick WRONG bucket on item 1 via keyboard A -> loses 1 life & reveals right category
    const wrong1 = (g2.items[1].categoryIndex + 1) % 2;
    g2.cursor = wrong1;
    input.tapButton('a');
    input.releaseButton('a');
    g2.update(0.016, input);
    input.endFrame();
    expect(g2.lastCorrect).toBe(false);
    expect(g2.lastPickedBucket).toBe(wrong1);
    expect(g2.lives).toBe(twoBucketCfg!.lives - 1);
    expect(g2.revealTimer).toBeGreaterThan(0);
    g2.render(ctx);

    // Full win & loss runs on both 2-bucket and 3-bucket configs
    const win2 = new CategorySortGame(twoBucketCfg!);
    driveMiniGameToWin(win2, twoBucketCfg!, ctx);
    expect(win2.getResult()).toBe('won');

    const lose2 = new CategorySortGame(twoBucketCfg!);
    driveMiniGameToLoss(lose2, twoBucketCfg!, ctx);
    expect(lose2.getResult()).toBe('lost');

    // Test 3-bucket navigation & direct tap on bucket #3 (x: 258..372, y: 144..220)
    const g3 = new CategorySortGame(threeBucketCfg!);
    g3.render(ctx);
    input.tapButton('right');
    input.releaseButton('right');
    g3.update(0.016, input);
    input.endFrame();
    expect(g3.cursor).toBe(1);
    input.tapButton('right');
    input.releaseButton('right');
    g3.update(0.016, input);
    input.endFrame();
    expect(g3.cursor).toBe(2);
    input.tapButton('right');
    input.releaseButton('right');
    g3.update(0.016, input);
    input.endFrame();
    expect(g3.cursor).toBe(0);

    // Direct tap on correct bucket for item 0 (3-bucket centers: 69, 192, 315)
    const bucket3CentersX = [69, 192, 315];
    const c3 = g3.items[0].categoryIndex;
    input.tapAt(bucket3CentersX[c3], 180);
    g3.update(0.016, input);
    input.endFrame();
    expect(g3.lastCorrect).toBe(true);
    expect(g3.bucketCounts[c3]).toBe(1);
    g3.render(ctx);

    const win3 = new CategorySortGame(threeBucketCfg!);
    driveMiniGameToWin(win3, threeBucketCfg!, ctx);
    expect(win3.getResult()).toBe('won');

    const lose3 = new CategorySortGame(threeBucketCfg!);
    driveMiniGameToLoss(lose3, threeBucketCfg!, ctx);
    expect(lose3.getResult()).toBe('lost');
  });

  it('IntruderHuntGame : navigation 2×2 clavier + souris/tactile, révélation + explication, victoire et défaite', () => {
    const npc = WORLDS.jp.npcs.find((n) => n.id === 'jp_escoffier')!;
    expect(npc.challenge?.kind).toBe('intruder_hunt');
    const cfg = npc.challenge as IntruderHuntChallengeConfig;

    const game = new IntruderHuntGame(cfg);
    const input = new TestInput();
    game.render(ctx);

    // Keyboard 2x2 navigation: 0 -> right -> 1 -> down -> 3
    input.tapButton('right');
    input.releaseButton('right');
    game.update(0.016, input);
    input.endFrame();
    expect(game.cursor).toBe(1);

    input.tapButton('down');
    input.releaseButton('down');
    game.update(0.016, input);
    input.endFrame();
    expect(game.cursor).toBe(3);

    // Mouse/tap directly on the true intruder card of Round 0
    const intrIdx = cfg.rounds[0].intruderIndex;
    const cardCenters = [
      { x: 100, y: 107 },
      { x: 284, y: 107 },
      { x: 100, y: 183 },
      { x: 284, y: 183 },
    ];
    input.tapAt(cardCenters[intrIdx].x, cardCenters[intrIdx].y);
    game.update(0.016, input);
    input.endFrame();

    expect(game.wasCorrect).toBe(true);
    expect(game.revealTimer).toBeGreaterThan(0);
    expect(game.lives).toBe(cfg.lives);
    game.render(ctx);

    // Skip reveal after 0.45s via tap -> Round 1
    game.update(0.5, input);
    input.tapAt(192, 120);
    game.update(0.016, input);
    input.endFrame();
    expect(game.roundIndex).toBe(1);

    // Wrong pick on Round 1 -> loses 1 life & shows reveal
    const wrongIdx = (cfg.rounds[1].intruderIndex + 1) % 4;
    input.tapAt(cardCenters[wrongIdx].x, cardCenters[wrongIdx].y);
    game.update(0.016, input);
    input.endFrame();
    expect(game.wasCorrect).toBe(false);
    expect(game.lives).toBe(cfg.lives - 1);
    game.render(ctx);

    // Full win & loss runs
    const winGame = new IntruderHuntGame(cfg);
    driveMiniGameToWin(winGame, cfg, ctx);
    expect(winGame.getResult()).toBe('won');

    const loseGame = new IntruderHuntGame(cfg);
    driveMiniGameToLoss(loseGame, cfg, ctx);
    expect(loseGame.getResult()).toBe('lost');
  });

  it('QuizRiddleGame : 100 % calme et sans chrono (aucune pénalité de temps) + explication + clic direct', () => {
    const world = WORLDS.pm;
    const leader = FAMILY_PAIRS.pm.members[0];
    const npc = world.npcs.find((n) => n.id === 'pm_sand')!;
    expect(npc.challenge?.kind).toBe('quiz');
    const cfg = npc.challenge as QuizChallengeConfig;

    const game = new QuizRiddleGame(cfg, leader, npc);
    const input = new TestInput();

    // Advance 120 full seconds with zero input: must NEVER time out or lose HP!
    for (let i = 0; i < 240; i++) {
      game.update(0.5, input);
      input.endFrame();
    }
    const internals = game as unknown as {
      playerHp: number;
      enemyHp: number;
      feedbackExplanation: string;
      pauseTimer: number;
    };
    expect(game.getResult()).toBe('playing');
    expect(internals.playerHp).toBe(cfg.playerHp);
    expect(internals.enemyHp).toBe(cfg.enemyHp);
    game.render(ctx);

    // Tap directly on the correct option box
    const optionCenters = [
      { x: 99, y: 178 },
      { x: 285, y: 178 },
      { x: 99, y: 215 },
      { x: 285, y: 215 },
    ];
    const cIdx = cfg.questions[0].correctIndex;
    input.tapAt(optionCenters[cIdx].x, optionCenters[cIdx].y);
    game.update(0.016, input);
    input.endFrame();
    expect(internals.enemyHp).toBe(cfg.enemyHp - 1);
    expect(internals.pauseTimer).toBeGreaterThan(0);
    expect(internals.feedbackExplanation.length).toBeGreaterThan(5);
    game.render(ctx);
  });

  it('ChallengeRunner : abandon sur brief, défaite -> Réessayer -> incrément essais -> Quitter', () => {
    const world = WORLDS.pm;
    const pair = FAMILY_PAIRS.pm;
    const npc = world.npcs.find((n) => n.id === 'pm_rimbaud')!;
    const badge = world.badges.find((b) => b.id === npc.badgeId)!;
    const cfg = npc.challenge as SingleChallengeConfig;

    // 1) Abort on brief via B
    let attempts = 0;
    const abortRunner = new ChallengeRunner(npc, badge, pair.members, 0, cfg, () => {
      attempts++;
    });
    expect(attempts).toBe(1);
    const input = new TestInput();
    abortRunner.update(1.7, input); // -> brief
    abortRunner.render(ctx);
    input.tapButton('b');
    input.releaseButton('b');
    abortRunner.update(0.016, input);
    input.endFrame();
    expect(abortRunner.getStatus()).toBe('aborted');

    // 2) Lose -> Retry -> Lose -> Quit
    attempts = 0;
    const retryRunner = new ChallengeRunner(npc, badge, pair.members, 0, cfg, () => {
      attempts++;
    });
    retryRunner.update(1.7, input); // -> brief
    input.tapButton('a');
    input.releaseButton('a');
    retryRunner.update(0.016, input); // -> playing
    input.endFrame();

    const rInternals = retryRunner as unknown as {
      phase: string;
      currentMini: MiniGameInstance | null;
      loseCursor: number;
    };
    expect(rInternals.phase).toBe('playing');
    expect(rInternals.currentMini).not.toBeNull();

    // Drive first attempt to loss
    driveMiniGameToLoss(rInternals.currentMini!, cfg, ctx, (dt, inp) => {
      retryRunner.update(dt, inp);
      retryRunner.render(ctx);
    });
    expect(rInternals.phase).toBe('lost');
    retryRunner.render(ctx);

    // Select Réessayer (cursor = 0)
    input.tapButton('a');
    input.releaseButton('a');
    retryRunner.update(0.016, input);
    input.endFrame();
    expect(attempts).toBe(2);
    expect(rInternals.phase).toBe('playing');

    // Drive second attempt to loss
    driveMiniGameToLoss(rInternals.currentMini!, cfg, ctx, (dt, inp) => {
      retryRunner.update(dt, inp);
      retryRunner.render(ctx);
    });
    expect(rInternals.phase).toBe('lost');

    // Move cursor to Quitter (1) and press A
    input.tapButton('right');
    input.releaseButton('right');
    retryRunner.update(0.016, input);
    input.endFrame();
    expect(rInternals.loseCursor).toBe(1);
    retryRunner.render(ctx);

    input.tapButton('a');
    input.releaseButton('a');
    retryRunner.update(0.016, input);
    input.endFrame();
    expect(retryRunner.getStatus()).toBe('aborted');
  });
});

describe('PokéNoël : Simulation bout-en-bout (Victoire + Défaite + Rendu) des 75 phases & 5 Boss', () => {
  const ctx = createMockCtx();
  const seenThemeStyles = new Set<string>();
  const seenKinds = new Set<SingleChallengeConfig['kind']>();
  let totalSimulatedPhases = 0;

  for (const modeId of MODE_ORDER) {
    const world = WORLDS[modeId];
    const pair = FAMILY_PAIRS[modeId];
    const leader = pair.members[0];
    const mains = world.npcs.filter((n) => n.role === 'main');
    const boss = world.npcs.find((n) => n.role === 'boss')!;

    describe(`Mode ${modeId.toUpperCase()} — 12 défis principaux + Boss 3 phases`, () => {
      for (const npc of mains) {
        it(`${npc.name} (${npc.challenge?.kind}) : victoire, défaite, rendu et ChallengeRunner complet`, () => {
          expect(npc.challenge).toBeDefined();
          const cfg = npc.challenge as SingleChallengeConfig;
          expect(cfg.kind).not.toBe('boss_gauntlet');

          seenKinds.add(cfg.kind);
          if ('themeStyle' in cfg && cfg.themeStyle) {
            seenThemeStyles.add(cfg.themeStyle);
          }
          totalSimulatedPhases++;

          // 1) Mathematical playability check
          assertMathematicalPlayability(cfg);

          // 2) Standalone full WIN simulation + render
          const winGame = instantiateSingle(cfg, leader, npc);
          driveMiniGameToWin(winGame, cfg, ctx);
          expect(winGame.getResult()).toBe('won');

          // 3) Standalone full LOSS simulation + render
          const loseGame = instantiateSingle(cfg, leader, npc);
          driveMiniGameToLoss(loseGame, cfg, ctx);
          expect(loseGame.getResult()).toBe('lost');

          // 4) Full ChallengeRunner end-to-end completion: vs_splash -> brief -> playing -> won -> done='won'
          const badge = world.badges.find((b) => b.id === npc.badgeId)!;
          expect(badge).toBeDefined();
          const input = new TestInput();
          const runner = new ChallengeRunner(npc, badge, pair.members, 0, cfg, () => {});
          runner.render(ctx);
          runner.update(1.7, input); // vs_splash -> brief
          runner.render(ctx);

          input.tapButton('a');
          input.releaseButton('a');
          runner.update(0.016, input); // brief -> playing
          input.endFrame();

          const rInternals = runner as unknown as {
            phase: string;
            currentMini: MiniGameInstance | null;
          };
          expect(rInternals.phase).toBe('playing');
          expect(rInternals.currentMini).not.toBeNull();

          driveMiniGameToWin(rInternals.currentMini!, cfg, ctx, (dt, inp) => {
            runner.update(dt, inp);
            runner.render(ctx);
          });
          expect(rInternals.phase).toBe('won');
          runner.render(ctx);

          // Wait past 0.6s celebration lock and confirm
          runner.update(0.65, input);
          runner.render(ctx);
          input.tapButton('a');
          input.releaseButton('a');
          runner.update(0.016, input);
          input.endFrame();
          expect(runner.getStatus()).toBe('won');
        });
      }

      it(`BOSS FINAL ${boss.name} : 3 phases (victoire + défaite), Gauntlet complet -> won, et retry réinitialise en Phase 1`, () => {
        expect(boss.challenge?.kind).toBe('boss_gauntlet');
        if (boss.challenge?.kind !== 'boss_gauntlet') return;
        expect(boss.challenge.phases).toHaveLength(3);

        // Standalone win + loss simulation on each of the 3 boss phases
        for (const ph of boss.challenge.phases) {
          seenKinds.add(ph.challenge.kind);
          if ('themeStyle' in ph.challenge && ph.challenge.themeStyle) {
            seenThemeStyles.add(ph.challenge.themeStyle);
          }
          totalSimulatedPhases++;
          assertMathematicalPlayability(ph.challenge);

          const gWin = instantiateSingle(ph.challenge, leader, boss);
          driveMiniGameToWin(gWin, ph.challenge, ctx);
          expect(gWin.getResult()).toBe('won');

          const gLose = instantiateSingle(ph.challenge, leader, boss);
          driveMiniGameToLoss(gLose, ph.challenge, ctx);
          expect(gLose.getResult()).toBe('lost');
        }

        // Full 3-phase Boss Gauntlet victory through ChallengeRunner
        const input = new TestInput();
        const runner = new ChallengeRunner(boss, world.bossBadge, pair.members, 0, boss.challenge, () => {});
        const rInternals = runner as unknown as {
          phase: string;
          bossPhaseIdx: number;
          currentMini: MiniGameInstance | null;
        };

        runner.render(ctx);
        runner.update(1.7, input); // -> brief (Phase 1)
        runner.render(ctx);

        for (let p = 0; p < 3; p++) {
          expect(rInternals.bossPhaseIdx).toBe(p);
          input.tapButton('a');
          input.releaseButton('a');
          runner.update(0.016, input); // brief / boss_intermission -> playing
          input.endFrame();
          expect(rInternals.phase).toBe('playing');

          driveMiniGameToWin(rInternals.currentMini!, boss.challenge.phases[p].challenge, ctx, (dt, inp) => {
            runner.update(dt, inp);
            runner.render(ctx);
          });

          if (p < 2) {
            expect(rInternals.phase).toBe('boss_intermission');
            expect(rInternals.bossPhaseIdx).toBe(p + 1);
            runner.render(ctx);
          } else {
            expect(rInternals.phase).toBe('won');
            runner.render(ctx);
          }
        }

        runner.update(0.65, input);
        runner.render(ctx);
        input.tapButton('a');
        input.releaseButton('a');
        runner.update(0.016, input);
        input.endFrame();
        expect(runner.getStatus()).toBe('won');

        // Boss defeat in Phase 2 -> Retry must reset bossPhaseIdx back to 0 (Phase 1)!
        let bossAttempts = 0;
        const retryBoss = new ChallengeRunner(boss, world.bossBadge, pair.members, 0, boss.challenge, () => {
          bossAttempts++;
        });
        const rb = retryBoss as unknown as {
          phase: string;
          bossPhaseIdx: number;
          currentMini: MiniGameInstance | null;
        };
        retryBoss.update(1.7, input); // -> brief
        input.tapButton('a');
        input.releaseButton('a');
        retryBoss.update(0.016, input); // -> playing Phase 1
        input.endFrame();

        // Win Phase 1 -> boss_intermission (Phase 2)
        driveMiniGameToWin(rb.currentMini!, boss.challenge.phases[0].challenge, ctx, (dt, inp) => {
          retryBoss.update(dt, inp);
          retryBoss.render(ctx);
        });
        expect(rb.phase).toBe('boss_intermission');
        expect(rb.bossPhaseIdx).toBe(1);

        // Start Phase 2 and LOSE it
        input.tapButton('a');
        input.releaseButton('a');
        retryBoss.update(0.016, input);
        input.endFrame();
        expect(rb.phase).toBe('playing');

        driveMiniGameToLoss(rb.currentMini!, boss.challenge.phases[1].challenge, ctx, (dt, inp) => {
          retryBoss.update(dt, inp);
          retryBoss.render(ctx);
        });
        expect(rb.phase).toBe('lost');
        retryBoss.render(ctx);

        // Press A on Réessayer -> must reset to Phase 1 (bossPhaseIdx === 0)!
        input.tapButton('a');
        input.releaseButton('a');
        retryBoss.update(0.016, input);
        input.endFrame();
        expect(bossAttempts).toBe(2);
        expect(rb.bossPhaseIdx).toBe(0);
        expect(rb.phase).toBe('playing');
      });
    });
  }

  it('vérifie que les 75 phases utilisent uniquement les 6 genres réflexion/quiz et couvrent les 10 scènes thématiques', () => {
    expect(totalSimulatedPhases).toBe(75);
    const expectedKinds: SingleChallengeConfig['kind'][] = [
      'quiz',
      'riddle_word',
      'order_puzzle',
      'pair_match',
      'intruder_hunt',
      'category_sort',
    ];
    expect(seenKinds.size).toBe(6);
    for (const kind of expectedKinds) {
      expect(seenKinds.has(kind), `Le genre ${kind} doit apparaître dans le jeu`).toBe(true);
    }

    const expectedThemes: ReflectionTheme[] = [
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
    ];
    for (const theme of expectedThemes) {
      expect(seenThemeStyles.has(theme), `Le décor thématique ${theme} doit être utilisé`).toBe(true);
    }
  });

  it('rend sans erreur toutes les tuiles des 5 mondes & intérieurs, les 10 avatars famille, les PNJ et les 65 badges', () => {
    for (const member of Object.values(FAMILY_MEMBERS)) {
      drawPortrait(ctx, member.appearance, member.portrait, 0, 0, 48, member.customPortraitUrl);
      for (const dir of ['down', 'up', 'left', 'right'] as const) {
        for (let frame = 0; frame < 3; frame++) {
          drawOverworldSprite(ctx, member.appearance, dir, frame, 0, 0, member.customSpriteSheetUrl);
        }
      }
    }

    for (const modeId of MODE_ORDER) {
      const world = WORLDS[modeId];
      for (const badge of [...world.badges, world.bossBadge]) {
        drawBadgeIcon(ctx, badge, true, 0, 0, 2);
        drawBadgeIcon(ctx, badge, false, 0, 0, 1);
      }

      for (const npc of world.npcs) {
        drawPortrait(ctx, npc.appearance, npc.portrait, 0, 0, 48);
        drawOverworldSprite(ctx, npc.appearance, npc.dir, 0, 0, 0);
      }

      for (const map of Object.values(world.maps)) {
        const uniqueTiles = new Set<string>();
        for (const row of map.tiles) {
          for (const t of row) {
            if (!uniqueTiles.has(t)) {
              uniqueTiles.add(t);
              drawTile(ctx, t, map.theme, 0, 0, 0);
              drawTile(ctx, t, map.theme, 0, 0, 1);
            }
          }
        }
      }
    }
  });
});
