import { describe, expect, it } from 'vitest';
import { WORLDS } from '../src/data';
import { FAMILY_MEMBERS, MODE_ORDER } from '../src/data/familyAvatars';
import { GameButton, InputManager } from '../src/engine/input';
import {
  createDefaultGlobalSave,
  createDefaultModeSave,
  decodeSaveCode,
  encodeSaveCode,
  sanitizeGlobalSave,
} from '../src/engine/saveSystem';
import {
  buildSecondaryDialogue,
  formatLoseHelperLine,
  formatMistakeHint,
  resolveClosestSecondaryForChallenger,
  resolveSecondaryPrimaryBuilding,
  secondaryHasPendingHint,
} from '../src/engine/secondaryHints';
import { CategorySortGame } from '../src/minigames/categorySortGame';
import { IntruderHuntGame } from '../src/minigames/intruderHuntGame';
import { OrderPuzzleGame } from '../src/minigames/orderPuzzleGame';
import { PairMatchGame } from '../src/minigames/pairMatchGame';
import { QuizRiddleGame } from '../src/minigames/quizRiddleGame';
import {
  CategorySortChallengeConfig,
  IntruderHuntChallengeConfig,
  NpcEntity,
  OrderPuzzleChallengeConfig,
  PairMatchChallengeConfig,
  QuizChallengeConfig,
  RiddleChallengeConfig,
} from '../src/types';

function createFakeInput() {
  const just = new Set<GameButton>();
  const fake = {
    isDown: () => false,
    justPressed: (b: GameButton) => just.has(b),
    getDirection: () => null,
    consumeTap: () => null,
    getCanvasHover: () => null,
    isCanvasHeld: () => false,
    getCanvasPointer: () => null,
    endFrame: () => {
      just.clear();
    },
    pressOnce(b: GameButton) {
      just.clear();
      just.add(b);
    },
    clear() {
      just.clear();
    },
  };
  return fake as unknown as InputManager & {
    pressOnce: (b: GameButton) => void;
    clear: () => void;
  };
}

function findNpcWithChallengeKind(kind: string): { modeId: (typeof MODE_ORDER)[number]; npc: NpcEntity } {
  for (const modeId of MODE_ORDER) {
    const npc = WORLDS[modeId].npcs.find(
      (n) => n.role === 'main' && n.challenge?.kind === kind
    );
    if (npc) return { modeId, npc };
  }
  throw new Error(`No main NPC found with challenge kind ${kind}`);
}

describe('Secondary NPC mistake-specific hints', () => {
  it('maps all 60 secondary NPCs across all 5 worlds to a companion building and invites player to return for help before failing', () => {
    let totalSec = 0;
    for (const modeId of MODE_ORDER) {
      const world = WORLDS[modeId];
      const save = createDefaultModeSave(modeId);
      const secNpcs = world.npcs.filter((n) => n.role === 'secondary');
      expect(secNpcs.length).toBe(12);
      totalSec += secNpcs.length;

      for (const npc of secNpcs) {
        const primary = resolveSecondaryPrimaryBuilding(npc, world);
        expect(primary, `${npc.id} should resolve a primary building`).toBeDefined();
        expect(primary!.district).toBe(npc.district);

        expect(secondaryHasPendingHint(npc, world, save)).toBe(false);
        const res = buildSecondaryDialogue(npc, world, save, 0);
        expect(res.isMistakeHint).toBe(false);
        expect(res.targetBadgeId).toBe(primary!.badgeId);
        expect(res.text).toContain(primary!.name);
        expect(res.text).toContain('pas loin d’ici');
        expect(res.text).toContain('revenez me voir');
      }
    }
    expect(totalSec).toBe(60);
  });

  it('OrderPuzzleGame (Chaplin): captures exact inverted movie pair on failure and secondary NPC fixes that specific mistake', () => {
    const world = WORLDS.df;
    const chaplin = world.npcs.find((n) => n.id === 'df_chaplin')!;
    const haroldLloyd = world.npcs.find((n) => n.id === 'df_sec_3')!;
    const cfg = chaplin.challenge as OrderPuzzleChallengeConfig;
    expect(cfg.kind).toBe('order_puzzle');

    const game = new OrderPuzzleGame(cfg);
    // Force a deterministic wrong order: swap the first two true items so item[1] is before item[0]
    const round = cfg.rounds[0];
    game.slots = round.orderedItems.map((text, pos) => ({
      text,
      revealTag: round.revealTags?.[pos],
      correctPos: pos,
      locked: false,
      flashWrong: 0,
      hintDir: 0,
    }));
    const tmp = game.slots[0];
    game.slots[0] = game.slots[1];
    game.slots[1] = tmp;

    const input = createFakeInput();
    // Submit the wrong order until all lives are depleted
    let guard = 0;
    while (game.getResult() === 'playing' && guard < 30) {
      game.cursor = game.slots.length; // Validate button
      input.pressOnce('a');
      game.update(0.05, input);
      input.clear();
      guard++;
    }
    expect(game.getResult()).toBe('lost');

    const mistakes = game.getMistakes();
    expect(mistakes.length).toBeGreaterThan(0);
    expect(mistakes[0]).toEqual({
      kind: 'order_puzzle',
      earlierItem: round.orderedItems[0],
      laterItem: round.orderedItems[1],
      chronological: true,
    });

    const save = createDefaultModeSave('df');
    save.failedMistakes = { [chaplin.badgeId!]: mistakes };

    expect(secondaryHasPendingHint(haroldLloyd, world, save)).toBe(true);
    const dlg = buildSecondaryDialogue(haroldLloyd, world, save, 0);
    expect(dlg.isMistakeHint).toBe(true);
    expect(dlg.text).toContain(round.orderedItems[0]);
    expect(dlg.text).toContain(round.orderedItems[1]);
    expect(dlg.text).toContain('vient avant');
  });

  it('PairMatchGame: captures exact wrong pairing and generates specific fix hint', () => {
    const { npc } = findNpcWithChallengeKind('pair_match');
    const cfg = npc.challenge as PairMatchChallengeConfig;
    const game = new PairMatchGame(cfg);
    const input = createFakeInput();

    // Intentionally pair left[0] with a WRONG right card until lost
    const left0 = game.leftItems[0];
    const wrongRightIdx = game.rightItems.findIndex((r) => r.pairId !== left0.pairId);
    expect(wrongRightIdx).toBeGreaterThanOrEqual(0);
    const wrongRight = game.rightItems[wrongRightIdx];
    const correctRightText = cfg.rounds[0].pairs[left0.pairId].right;

    let guard = 0;
    while (game.getResult() === 'playing' && guard < 30) {
      game.phase = 'pick_left';
      game.leftCursor = 0;
      input.pressOnce('a');
      game.update(0.05, input);
      input.clear();

      game.rightCursor = wrongRightIdx;
      input.pressOnce('a');
      game.update(0.05, input);
      input.clear();
      guard++;
    }
    expect(game.getResult()).toBe('lost');

    const mistakes = game.getMistakes();
    expect(mistakes.length).toBeGreaterThan(0);
    expect(mistakes[0]).toEqual({
      kind: 'pair_match',
      leftText: left0.text,
      wrongRightText: wrongRight.text,
      correctRightText,
    });

    const hint = formatMistakeHint(mistakes[0], npc.name);
    expect(hint).toContain(left0.text);
    expect(hint).toContain(wrongRight.text);
    expect(hint).toContain(correctRightText);
  });

  it('IntruderHuntGame: captures exact mistaken non-intruder pick and reveals the real intruder', () => {
    const { npc } = findNpcWithChallengeKind('intruder_hunt');
    const cfg = npc.challenge as IntruderHuntChallengeConfig;
    const game = new IntruderHuntGame(cfg);
    const input = createFakeInput();

    let guard = 0;
    while (game.getResult() === 'playing' && guard < 80) {
      if (game.revealTimer > 0) {
        game.update(3.0, input);
      } else {
        const round = cfg.rounds[game.roundIndex];
        const wrongIdx = (round.intruderIndex + 1) % 4;
        game.cursor = wrongIdx;
        input.pressOnce('a');
        game.update(0.05, input);
        input.clear();
      }
      guard++;
    }
    expect(game.getResult()).toBe('lost');

    const mistakes = game.getMistakes();
    expect(mistakes.length).toBeGreaterThan(0);
    expect(mistakes[0].kind).toBe('intruder_hunt');
    const hint = formatMistakeHint(mistakes[0], npc.name);
    if (mistakes[0].kind === 'intruder_hunt') {
      expect(hint).toContain(mistakes[0].pickedItem);
      expect(hint).toContain(mistakes[0].intruderItem);
    }
  });

  it('CategorySortGame: captures exact misclassified item and corrects its bucket', () => {
    const { npc } = findNpcWithChallengeKind('category_sort');
    const cfg = npc.challenge as CategorySortChallengeConfig;
    const game = new CategorySortGame(cfg);
    const input = createFakeInput();

    let guard = 0;
    while (game.getResult() === 'playing' && guard < 80) {
      if (game.revealTimer > 0) {
        game.update(3.0, input);
      } else {
        const item = game.items[game.itemIndex];
        const wrongBucket = (item.categoryIndex + 1) % cfg.categories.length;
        game.cursor = wrongBucket;
        input.pressOnce('a');
        game.update(0.05, input);
        input.clear();
      }
      guard++;
    }
    expect(game.getResult()).toBe('lost');

    const mistakes = game.getMistakes();
    expect(mistakes.length).toBeGreaterThan(0);
    expect(mistakes[0].kind).toBe('category_sort');
    const hint = formatMistakeHint(mistakes[0], npc.name);
    if (mistakes[0].kind === 'category_sort') {
      expect(hint).toContain(mistakes[0].itemLabel);
      expect(hint).toContain(mistakes[0].wrongCategory);
      expect(hint).toContain(mistakes[0].correctCategory);
    }
  });

  it('QuizRiddleGame (quiz & riddle_word): captures exact wrong answers and formats specific hints', () => {
    const { npc: quizNpc } = findNpcWithChallengeKind('quiz');
    const quizCfg = quizNpc.challenge as QuizChallengeConfig;
    const quizGame = new QuizRiddleGame(quizCfg, FAMILY_MEMBERS.pola, quizNpc);
    const input = createFakeInput();

    let guard = 0;
    while (quizGame.getResult() === 'playing' && guard < 120) {
      const idx = (quizGame as unknown as { index: number }).index;
      const pauseTimer = (quizGame as unknown as { pauseTimer: number }).pauseTimer;
      if (pauseTimer > 0) {
        quizGame.update(3.0, input);
      } else {
        const wrongChoice = (quizCfg.questions[idx].correctIndex + 1) % 4;
        (quizGame as unknown as { cursor: number }).cursor = wrongChoice;
        input.pressOnce('a');
        quizGame.update(0.05, input);
        input.clear();
      }
      guard++;
    }
    expect(quizGame.getResult()).toBe('lost');
    const quizMistakes = quizGame.getMistakes();
    expect(quizMistakes.length).toBeGreaterThan(0);
    expect(quizMistakes[0].kind).toBe('quiz');
    if (quizMistakes[0].kind === 'quiz') {
      const hint = formatMistakeHint(quizMistakes[0], quizNpc.name);
      expect(hint).toContain(quizMistakes[0].wrongAnswer);
      expect(hint).toContain(quizMistakes[0].correctAnswer);
    }

    const { npc: riddleNpc } = findNpcWithChallengeKind('riddle_word');
    const riddleCfg = riddleNpc.challenge as RiddleChallengeConfig;
    const riddleGame = new QuizRiddleGame(riddleCfg, FAMILY_MEMBERS.pola, riddleNpc);

    guard = 0;
    while (riddleGame.getResult() === 'playing' && guard < 120) {
      const idx = (riddleGame as unknown as { index: number }).index;
      const pauseTimer = (riddleGame as unknown as { pauseTimer: number }).pauseTimer;
      if (pauseTimer > 0) {
        riddleGame.update(3.0, input);
      } else {
        const wrongChoice = (riddleCfg.riddles[idx].correctIndex + 1) % 4;
        (riddleGame as unknown as { cursor: number }).cursor = wrongChoice;
        input.pressOnce('a');
        riddleGame.update(0.05, input);
        input.clear();
      }
      guard++;
    }
    expect(riddleGame.getResult()).toBe('lost');
    const riddleMistakes = riddleGame.getMistakes();
    expect(riddleMistakes.length).toBeGreaterThan(0);
    expect(riddleMistakes[0].kind).toBe('riddle_word');
    if (riddleMistakes[0].kind === 'riddle_word') {
      const hint = formatMistakeHint(riddleMistakes[0], riddleNpc.name);
      expect(hint).toContain(riddleMistakes[0].wrongAnswer);
      expect(hint).toContain(riddleMistakes[0].correctAnswer);
    }
  });

  it('cycles through multiple recorded mistakes and clears hints once the badge is won (saveSystem round-trip)', () => {
    const world = WORLDS.df;
    const haroldLloyd = world.npcs.find((n) => n.id === 'df_sec_3')!;
    const globalSave = createDefaultGlobalSave();
    globalSave.modes.df.failedMistakes = {
      df_chaplin: [
        { kind: 'order_puzzle', earlierItem: 'Le Kid', laterItem: 'La Ruée vers l’or', chronological: true },
        { kind: 'order_puzzle', earlierItem: 'Les Lumières de la ville', laterItem: 'Le Dictateur', chronological: true },
      ],
    };

    // Save code round-trip preserves failedMistakes
    const code = encodeSaveCode(globalSave);
    const decoded = decodeSaveCode(code);
    expect(decoded).not.toBeNull();
    expect(decoded!.modes.df.failedMistakes?.df_chaplin?.length).toBe(2);

    const dlg0 = buildSecondaryDialogue(haroldLloyd, world, decoded!.modes.df, 0);
    const dlg1 = buildSecondaryDialogue(haroldLloyd, world, decoded!.modes.df, 1);
    expect(dlg0.text).toContain('Le Kid');
    expect(dlg1.text).toContain('Le Dictateur');
    expect(dlg0.text).not.toBe(dlg1.text);

    // Once badge is won, sanitizeGlobalSave strips stale mistakes for that badge
    decoded!.modes.df.badges.push('df_chaplin');
    const cleaned = sanitizeGlobalSave(decoded);
    expect(cleaned.modes.df.failedMistakes).toBeUndefined();
    expect(secondaryHasPendingHint(haroldLloyd, world, cleaned.modes.df)).toBe(false);
  });

  it('never spoils the right answer on wrong picks in IntruderHunt, CategorySort, or QuizRiddle', () => {
    const createTextCapturingCtx = () => {
      const texts: string[] = [];
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
        arc: noop,
        ellipse: noop,
        quadraticCurveTo: noop,
        bezierCurveTo: noop,
        fill: noop,
        stroke: noop,
        clip: noop,
        save: noop,
        restore: noop,
        translate: noop,
        scale: noop,
        rotate: noop,
        setLineDash: noop,
        drawImage: noop,
        createLinearGradient: grad,
        createRadialGradient: grad,
        measureText: (t: string) => ({ width: t.length * 5 }),
        fillText: (t: string) => {
          texts.push(t);
        },
        strokeText: noop,
      } as unknown as CanvasRenderingContext2D;
      return { ctx, texts };
    };

    const input = createFakeInput();

    // 1. IntruderHuntGame: wrong pick must NOT display 'C’ÉTAIT L’INTRUS' or round.explanation
    const { npc: intrNpc } = findNpcWithChallengeKind('intruder_hunt');
    const intrCfg = intrNpc.challenge as IntruderHuntChallengeConfig;
    const intrGame = new IntruderHuntGame(intrCfg);
    const wrongIntrIdx = (intrCfg.rounds[0].intruderIndex + 1) % 4;
    intrGame.cursor = wrongIntrIdx;
    input.pressOnce('a');
    intrGame.update(0.05, input);
    input.clear();
    const intrCap = createTextCapturingCtx();
    intrGame.render(intrCap.ctx);
    const intrJoined = intrCap.texts.join(' ');
    expect(intrJoined).not.toContain('C’ÉTAIT L’INTRUS');
    expect(intrJoined).not.toContain(intrCfg.rounds[0].explanation.slice(0, 20));
    expect(intrJoined).toContain('CE N’EST PAS L’INTRUS');

    // 2. CategorySortGame: wrong pick must NOT display 'BONNE CATÉGORIE', 'C’ÉTAIT :', or item.explanation
    const { npc: sortNpc } = findNpcWithChallengeKind('category_sort');
    const sortCfg = sortNpc.challenge as CategorySortChallengeConfig;
    const sortGame = new CategorySortGame(sortCfg);
    const firstItem = sortGame.items[0];
    const wrongBucket = (firstItem.categoryIndex + 1) % sortCfg.categories.length;
    sortGame.cursor = wrongBucket;
    input.pressOnce('a');
    sortGame.update(0.05, input);
    input.clear();
    const sortCap = createTextCapturingCtx();
    sortGame.render(sortCap.ctx);
    const sortJoined = sortCap.texts.join(' ');
    expect(sortJoined).not.toContain('BONNE CATÉGORIE');
    expect(sortJoined).not.toContain('C’ÉTAIT :');
    expect(sortJoined).not.toContain(firstItem.explanation.slice(0, 20));
    expect(sortJoined).toContain('MAUVAISE CATÉGORIE');

    // 3. QuizRiddleGame: wrong answer must NOT display 'Bonne réponse' or question.explanation
    const origDocument = globalThis.document;
    (globalThis as unknown as { document: unknown }).document = {
      createElement: () => ({ width: 0, height: 0, getContext: () => createTextCapturingCtx().ctx }),
    };
    try {
      const { npc: quizNpc } = findNpcWithChallengeKind('quiz');
      const quizCfg = quizNpc.challenge as QuizChallengeConfig;
      const quizGame = new QuizRiddleGame(quizCfg, FAMILY_MEMBERS.pola, quizNpc);
      const wrongQuizIdx = (quizCfg.questions[0].correctIndex + 1) % 4;
      (quizGame as unknown as { cursor: number }).cursor = wrongQuizIdx;
      input.pressOnce('a');
      quizGame.update(0.05, input);
      input.clear();
      const quizCap = createTextCapturingCtx();
      quizGame.render(quizCap.ctx);
      const quizJoined = quizCap.texts.join(' ');
      expect(quizJoined).not.toContain('Bonne réponse');
      if (quizCfg.questions[0].explanation) {
        expect(quizJoined).not.toContain(quizCfg.questions[0].explanation.slice(0, 20));
      }
    } finally {
      (globalThis as unknown as { document: unknown }).document = origDocument;
    }
  });

  it('resolves a named closest secondary helper for every main challenger (60/60) with proper French pronoun, and none for bosses', () => {
    let totalMain = 0;
    for (const modeId of MODE_ORDER) {
      const world = WORLDS[modeId];
      for (const npc of world.npcs) {
        if (npc.role === 'main') {
          totalMain++;
          const helper = resolveClosestSecondaryForChallenger(npc, world);
          expect(helper, `${npc.id} should resolve a secondary helper`).toBeDefined();
          expect(helper!.role).toBe('secondary');
          expect(helper!.district).toBe(npc.district);
          const line = formatLoseHelperLine(helper!);
          expect(line).toContain(helper!.name);
          expect(line).toContain('indice');
        } else if (npc.role === 'boss') {
          expect(resolveClosestSecondaryForChallenger(npc, world)).toBeUndefined();
        }
      }
    }
    expect(totalMain).toBe(60);

    // Spot-check masculine & feminine French pronouns
    const harold = WORLDS.df.npcs.find((n) => n.id === 'df_sec_3')!;
    const emily = WORLDS.pm.npcs.find((n) => n.id === 'pm_sec_6')!;
    expect(formatLoseHelperLine(harold)).toContain('il aura peut-être un indice');
    expect(formatLoseHelperLine(emily)).toContain('elle aura peut-être un indice');
  });
});
