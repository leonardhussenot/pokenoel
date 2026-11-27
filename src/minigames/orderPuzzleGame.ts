import { soundEngine } from '../audio/soundEngine';
import { InputManager } from '../engine/input';
import { ChallengeMistake, OrderPuzzleChallengeConfig, OrderRound } from '../types';
import {
  drawFittedSingleLine,
  drawFittedWrappedText,
  drawHearts,
  drawMgParticles,
  drawMiniGameHud,
  drawPanelBox,
  drawReflectionStageBackdrop,
  drawRoundRectPath,
  formatFrenchText,
  getReflectionThemePalette,
  MG_W,
  MgParticle,
  MiniGameInstance,
  updateMgParticles,
} from './common';

export interface OrderSlot {
  text: string;
  revealTag?: string;
  correctPos: number;
  locked: boolean;
  flashWrong: number;
  hintDir: -1 | 0 | 1;
}

interface OrderLayout {
  promptY: number;
  promptH: number;
  slotStartY: number;
  slotH: number;
  slotStep: number;
  validateY: number;
  validateH: number;
  slotFont: number;
  badgeR: number;
}

export class OrderPuzzleGame implements MiniGameInstance {
  rounds: OrderRound[];
  roundIndex = 0;
  slots: OrderSlot[] = [];
  selectedSlot: number | null = null;
  cursor = 0; // 0..slots.length-1 = slots, slots.length = Validate button
  lives: number;
  feedbackTimer = 0;
  result: 'playing' | 'won' | 'lost' = 'playing';

  private elapsed = 0;
  private feedbackElapsed = 0;
  private shakeTimer = 0;
  private wrongHintText = '';
  private wrongHintTimer = 0;
  private particles: MgParticle[] = [];
  private mistakes: ChallengeMistake[] = [];

  getMistakes(): ChallengeMistake[] {
    return [...this.mistakes];
  }

  getCompletedSteps(): number {
    return this.roundIndex;
  }

  useJoker(): string | null {
    if (this.result !== 'playing' || this.feedbackTimer > 0) return null;
    // Pick the first unlocked slot whose item is not yet in its target position (or any unlocked slot)
    let targetPos = this.slots.findIndex((s, i) => !s.locked && s.correctPos !== i);
    if (targetPos === -1) {
      targetPos = this.slots.findIndex((s) => !s.locked);
    }
    if (targetPos === -1) return null;

    const sourceIdx = this.slots.findIndex((s) => s.correctPos === targetPos);
    if (sourceIdx === -1) return null;

    if (sourceIdx !== targetPos) {
      const tmp = this.slots[targetPos];
      this.slots[targetPos] = this.slots[sourceIdx];
      this.slots[sourceIdx] = tmp;
    }
    this.slots[targetPos].locked = true;
    this.slots[targetPos].hintDir = 0;
    this.slots[targetPos].flashWrong = 0;
    this.selectedSlot = null;

    const layout = this.getLayout();
    const cy = layout.slotStartY + targetPos * layout.slotStep + layout.slotH / 2;
    this.spawnSparkles(MG_W / 2, cy, '#ffe066', 14);

    if (this.slots.every((s, i) => s.correctPos === i)) {
      for (const s of this.slots) {
        s.locked = true;
        s.hintDir = 0;
      }
      soundEngine.playHitPerfect();
      this.feedbackTimer = 2.6;
      this.feedbackElapsed = 0;
    }
    return 'Léo a placé et verrouillé une carte !';
  }

  constructor(private cfg: OrderPuzzleChallengeConfig, startStep = 0) {
    this.rounds = cfg.rounds;
    this.lives = Math.max(1, cfg.lives);
    const startRound = Math.max(0, Math.min(Math.floor(startStep), Math.max(0, this.rounds.length - 1)));
    this.loadRound(startRound);
  }

  private getLayout(): OrderLayout {
    const count = Math.max(4, this.slots.length);
    if (count <= 4) {
      return {
        promptY: 30,
        promptH: 33,
        slotStartY: 68,
        slotH: 28,
        slotStep: 32,
        validateY: 200,
        validateH: 24,
        slotFont: 8.5,
        badgeR: 8.2,
      };
    }
    if (count === 5) {
      return {
        promptY: 29,
        promptH: 27,
        slotStartY: 60,
        slotH: 25,
        slotStep: 28,
        validateY: 204,
        validateH: 21,
        slotFont: 8.2,
        badgeR: 7.5,
      };
    }
    if (count === 6) {
      return {
        promptY: 28,
        promptH: 24,
        slotStartY: 56,
        slotH: 22,
        slotStep: 24.5,
        validateY: 205,
        validateH: 20,
        slotFont: 7.9,
        badgeR: 6.9,
      };
    }
    if (count === 7) {
      return {
        promptY: 28,
        promptH: 22,
        slotStartY: 53,
        slotH: 19,
        slotStep: 21,
        validateY: 203,
        validateH: 21,
        slotFont: 7.6,
        badgeR: 6.3,
      };
    }
    const slotStep = Math.floor(146 / count);
    return {
      promptY: 28,
      promptH: 21,
      slotStartY: 52,
      slotH: Math.max(13, slotStep - 2),
      slotStep,
      validateY: 204,
      validateH: 20,
      slotFont: 7.2,
      badgeR: 5.8,
    };
  }

  private loadRound(idx: number): void {
    this.roundIndex = idx;
    const round = this.rounds[idx];
    if (!round) {
      this.result = 'won';
      return;
    }
    const items: OrderSlot[] = round.orderedItems.map((text, pos) => ({
      text,
      revealTag: round.revealTags?.[pos],
      correctPos: pos,
      locked: false,
      flashWrong: 0,
      hintDir: 0,
    }));

    // Fisher-Yates shuffle guaranteed not to start already solved
    for (let attempt = 0; attempt < 12; attempt++) {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = items[i];
        items[i] = items[j];
        items[j] = tmp;
      }
      const misplacedCount = items.reduce(
        (acc, it, i) => acc + (it.correctPos !== i ? 1 : 0),
        0
      );
      if (misplacedCount >= Math.min(2, items.length)) break;
    }

    if (items.length >= 2 && items.every((it, i) => it.correctPos === i)) {
      // Deterministic cyclic derangement fallback (works for any length >= 2)
      const first = items.shift()!;
      items.push(first);
    }

    this.slots = items;
    this.selectedSlot = null;
    this.cursor = 0;
    this.feedbackTimer = 0;
    this.feedbackElapsed = 0;
    this.wrongHintText = '';
    this.wrongHintTimer = 0;
    this.mistakes = [];
  }

  private spawnSparkles(cx: number, cy: number, color: string, count = 10): void {
    for (let i = 0; i < count; i++) {
      const a = (i * Math.PI * 2) / count + Math.random() * 0.35;
      const spd = 28 + Math.random() * 52;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 12,
        life: 0.38 + Math.random() * 0.25,
        maxLife: 0.63,
        size: 3.6,
        color: i % 3 === 0 ? '#ffffff' : color,
        gravity: 65,
        shape: i % 2 === 0 ? 'star' : 'circle',
      });
    }
  }

  private getSlotRect(idx: number) {
    const lay = this.getLayout();
    return {
      x: 16,
      y: Math.round(lay.slotStartY + idx * lay.slotStep),
      w: MG_W - 32,
      h: lay.slotH,
    };
  }

  private getValidateRect() {
    const lay = this.getLayout();
    return {
      x: 92,
      y: lay.validateY,
      w: 200,
      h: lay.validateH,
    };
  }

  private interactSlot(idx: number): void {
    if (idx < 0 || idx >= this.slots.length) return;
    if (this.slots[idx].locked) {
      soundEngine.playBump();
      return;
    }
    if (this.selectedSlot === null) {
      this.selectedSlot = idx;
      soundEngine.playSelect();
      return;
    }
    if (this.selectedSlot === idx) {
      this.selectedSlot = null;
      soundEngine.playCancel();
      return;
    }
    if (this.slots[this.selectedSlot].locked) {
      this.selectedSlot = idx;
      soundEngine.playSelect();
      return;
    }
    // Swap the two cards and clear stale directional hints on moved slots
    const tmp = this.slots[this.selectedSlot];
    this.slots[this.selectedSlot] = this.slots[idx];
    this.slots[idx] = tmp;
    this.slots[this.selectedSlot].flashWrong = 0;
    this.slots[idx].flashWrong = 0;
    this.slots[this.selectedSlot].hintDir = 0;
    this.slots[idx].hintDir = 0;

    const r1 = this.getSlotRect(this.selectedSlot);
    const r2 = this.getSlotRect(idx);
    this.spawnSparkles(r1.x + r1.w / 2, r1.y + r1.h / 2, '#ffd966', 6);
    this.spawnSparkles(r2.x + r2.w / 2, r2.y + r2.h / 2, '#ffd966', 6);

    this.selectedSlot = null;
    soundEngine.playSwap();
  }

  private validateOrder(): void {
    this.selectedSlot = null;
    let lockedCount = 0;
    let allCorrect = true;

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot.correctPos === i) {
        if (!slot.locked) {
          slot.locked = true;
          const r = this.getSlotRect(i);
          this.spawnSparkles(r.x + r.w / 2, r.y + r.h / 2, '#66f28d', 8);
        }
        slot.flashWrong = 0;
        slot.hintDir = 0;
        lockedCount++;
      } else {
        slot.flashWrong = 0.85;
        slot.hintDir = slot.correctPos < i ? -1 : 1;
        allCorrect = false;
      }
    }

    if (allCorrect) {
      soundEngine.playHitPerfect();
      this.spawnSparkles(MG_W / 2, 128, '#ffe066', 18);
      this.feedbackTimer = 3.0;
      this.feedbackElapsed = 0;
      this.wrongHintText = '';
      this.wrongHintTimer = 0;
      return;
    }

    this.lives = Math.max(0, this.lives - 1);
    this.shakeTimer = 0.36;
    soundEngine.playHitMiss();

    // Capture exact inverted pairs from the player's submitted order (unlocked pairs first!)
    const round = this.rounds[this.roundIndex];
    const chronoSignal = `${round.hintLabels?.join(' ') ?? ''} ${round.prompt}`.toLowerCase();
    const hasYearTags =
      Array.isArray(round.revealTags) &&
      round.revealTags.length > 0 &&
      round.revealTags.every((t) => /\b\d{4}\b/.test(t));
    const chronological =
      /tôt|tard|ancien|récent|chronolog|sortie|date|année|siècle|carrière|film/.test(
        chronoSignal
      ) ||
      (!round.hintLabels && hasYearTags);
    const latestMistakes: ChallengeMistake[] = [];
    const seenPairs = new Set<string>();
    const addInversion = (earlier: string, later: string) => {
      const key = `${earlier}|||${later}`;
      if (seenPairs.has(key) || latestMistakes.length >= 4) return;
      seenPairs.add(key);
      latestMistakes.push({
        kind: 'order_puzzle',
        earlierItem: earlier,
        laterItem: later,
        chronological,
      });
    };
    // Pass 1: adjacent unlocked-vs-unlocked inversions (most directly confusing wrong pair!)
    for (let i = 0; i < this.slots.length - 1; i++) {
      const a = this.slots[i];
      const b = this.slots[i + 1];
      if (!a.locked && !b.locked && a.correctPos > b.correctPos) {
        addInversion(b.text, a.text);
      }
    }
    // Pass 2: non-adjacent unlocked-vs-unlocked inversions (crucial when locked slots sit between swapped cards!)
    for (let i = 0; i < this.slots.length && latestMistakes.length < 3; i++) {
      const a = this.slots[i];
      if (a.locked) continue;
      for (let j = i + 2; j < this.slots.length && latestMistakes.length < 3; j++) {
        const b = this.slots[j];
        if (!b.locked && a.correctPos > b.correctPos) {
          addInversion(b.text, a.text);
        }
      }
    }
    // Pass 3: remaining adjacent inversions (including locked-vs-unlocked context)
    for (let i = 0; i < this.slots.length - 1; i++) {
      const a = this.slots[i];
      const b = this.slots[i + 1];
      if (a.correctPos > b.correctPos) {
        addInversion(b.text, a.text);
      }
    }
    // Pass 4: remaining non-adjacent inversions if fewer than 3 found
    for (let i = 0; i < this.slots.length && latestMistakes.length < 3; i++) {
      for (let j = i + 2; j < this.slots.length && latestMistakes.length < 3; j++) {
        const a = this.slots[i];
        const b = this.slots[j];
        if (a.correctPos > b.correctPos) {
          addInversion(b.text, a.text);
        }
      }
    }
    if (latestMistakes.length > 0) {
      this.mistakes = latestMistakes;
    }

    if (this.lives <= 0) {
      this.result = 'lost';
      return;
    }

    const [earlierLbl, laterLbl] = this.rounds[this.roundIndex].hintLabels ?? [
      '▲ Plus tôt',
      '▼ Plus tard',
    ];
    this.wrongHintText =
      lockedCount > 0
        ? `${lockedCount}/${this.slots.length} fixé${lockedCount > 1 ? 's' : ''} en vert ! Suivez les indices ${earlierLbl} / ${laterLbl}.`
        : `Pas encore ! Suivez les indices ${earlierLbl} / ${laterLbl} pour réordonner.`;
    this.wrongHintTimer = 3.0;

    // Move cursor to first unlocked slot for convenience
    const firstUnlocked = this.slots.findIndex((s) => !s.locked);
    if (firstUnlocked >= 0) {
      this.cursor = firstUnlocked;
    }
  }

  private advanceAfterRound(): void {
    this.feedbackTimer = 0;
    this.feedbackElapsed = 0;
    if (this.roundIndex + 1 >= this.rounds.length) {
      this.result = 'won';
      return;
    }
    this.roundIndex++;
    this.loadRound(this.roundIndex);
  }

  update(dt: number, input: InputManager): void {
    if (this.result !== 'playing') return;
    this.elapsed += dt;

    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    if (this.wrongHintTimer > 0) this.wrongHintTimer = Math.max(0, this.wrongHintTimer - dt);
    for (const s of this.slots) {
      if (s.flashWrong > 0) s.flashWrong = Math.max(0, s.flashWrong - dt);
    }

    updateMgParticles(this.particles, dt);

    // Celebration feedback beat after solving a round
    if (this.feedbackTimer > 0) {
      this.feedbackTimer -= dt;
      this.feedbackElapsed += dt;
      const tap = input.consumeTap();
      const skip = this.feedbackElapsed >= 0.45 && (input.justPressed('a') || tap !== null);
      if (this.feedbackTimer <= 0 || skip) {
        this.advanceAfterRound();
      }
      return;
    }

    const totalStops = this.slots.length + 1;
    if (input.justPressed('up')) {
      this.cursor = (this.cursor + totalStops - 1) % totalStops;
      soundEngine.playSelect();
    } else if (input.justPressed('down')) {
      this.cursor = (this.cursor + 1) % totalStops;
      soundEngine.playSelect();
    } else if (input.justPressed('b') && this.selectedSlot !== null) {
      this.selectedSlot = null;
      soundEngine.playCancel();
    }

    const tap = input.consumeTap();
    if (tap) {
      for (let i = 0; i < this.slots.length; i++) {
        const r = this.getSlotRect(i);
        if (tap.x >= r.x && tap.x <= r.x + r.w && tap.y >= r.y && tap.y <= r.y + r.h) {
          this.cursor = i;
          this.interactSlot(i);
          return;
        }
      }
      const vr = this.getValidateRect();
      if (tap.x >= vr.x && tap.x <= vr.x + vr.w && tap.y >= vr.y && tap.y <= vr.y + vr.h) {
        this.cursor = this.slots.length;
        this.validateOrder();
        return;
      }
    }

    if (input.justPressed('a')) {
      if (this.cursor === this.slots.length) {
        this.validateOrder();
      } else {
        this.interactSlot(this.cursor);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pal = getReflectionThemePalette(this.cfg.themeStyle);
    const round = this.rounds[this.roundIndex];
    const lay = this.getLayout();
    const shakeX = this.shakeTimer > 0 ? Math.round(Math.sin(this.shakeTimer * 65) * 3) : 0;
    const [earlierLabel, laterLabel] = round.hintLabels ?? ['▲ Plus tôt', '▼ Plus tard'];

    ctx.save();

    // Thematic stage backdrop
    drawReflectionStageBackdrop(ctx, this.cfg.themeStyle, this.elapsed);

    // Prompt Card + Hearts pill
    drawPanelBox(ctx, 14 + shakeX, lay.promptY, MG_W - 28, lay.promptH, pal.promptBg, pal.accent);

    const heartsW = Math.max(46, this.cfg.lives * 13 + 8);
    const heartsH = Math.min(18, lay.promptH - 4);
    const heartsX = MG_W - 19 - heartsW + shakeX;
    const heartsY = lay.promptY + Math.round((lay.promptH - heartsH) / 2);

    ctx.fillStyle = pal.promptInk;
    drawFittedWrappedText(
      ctx,
      round.prompt,
      21 + shakeX,
      lay.promptY + 2.5,
      MG_W - 44 - heartsW,
      lay.promptH - 5,
      {
        preferredSize: lay.promptH <= 24 ? 8.0 : 8.5,
        minSize: 6.4,
        weight: 'bold',
        lineHeightRatio: 1.18,
        verticalCenter: true,
      }
    );

    ctx.fillStyle = 'rgba(18, 22, 38, 0.88)';
    drawRoundRectPath(ctx, heartsX, heartsY, heartsW, heartsH, 4);
    ctx.fill();
    drawHearts(ctx, heartsX + 5, heartsY + Math.round((heartsH - 11) / 2), this.lives, this.cfg.lives);

    // Numbered Tactile Slots (4 to 7 items dynamically sized!)
    const pillH = Math.min(15, Math.max(12, lay.slotH - 5));
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const r = this.getSlotRect(i);
      const isPicked = this.selectedSlot === i;
      const isCursor = this.cursor === i && this.feedbackTimer <= 0;
      const liftY = isPicked ? -1.5 : 0;
      const rx = r.x + shakeX;
      const ry = r.y + liftY;
      const midY = ry + r.h / 2;

      // Golden halo if picked up
      if (isPicked) {
        const pulse = 0.25 + 0.15 * Math.sin(this.elapsed * 8);
        ctx.fillStyle = `rgba(255, 214, 76, ${pulse})`;
        drawRoundRectPath(ctx, rx - 3, ry - 1.5, r.w + 6, r.h + 3, 5);
        ctx.fill();
      }

      const bg = slot.locked
        ? '#1a5738'
        : slot.flashWrong > 0
          ? '#752534'
          : isPicked
            ? '#524016'
            : isCursor
              ? pal.cardSelectedBg
              : pal.cardBg;

      const border = slot.locked
        ? '#66f28d'
        : slot.flashWrong > 0
          ? '#ff7584'
          : isPicked
            ? '#ffe066'
            : isCursor
              ? '#ffd24c'
              : pal.cardBorder;

      drawPanelBox(ctx, rx, ry, r.w, r.h, bg, border);

      // Left position badge (1..N or ✓)
      const badgeCx = rx + 13;
      ctx.fillStyle = slot.locked
        ? '#66f28d'
        : isPicked
          ? '#ffe066'
          : isCursor
            ? pal.accent
            : '#2c3858';
      ctx.beginPath();
      ctx.arc(badgeCx, midY, lay.badgeR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = slot.locked || isPicked || isCursor ? '#141826' : '#dce4fa';
      ctx.font = `bold ${lay.slotH <= 20 ? 7.5 : 8.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(slot.locked ? '✓' : `${i + 1}`, badgeCx, midY + 0.5);

      // Right-hand status / revealTag / directional clue pill
      const pillY = ry + (r.h - pillH) / 2;
      let rightReservedW = 14;

      if (slot.locked) {
        if (slot.revealTag) {
          const tagText = formatFrenchText(slot.revealTag);
          ctx.font = 'bold 7px sans-serif';
          const pillW = Math.min(84, Math.max(46, Math.ceil(ctx.measureText(`✓ ${tagText}`).width) + 14));
          const pillX = rx + r.w - pillW - 5;
          rightReservedW = pillW + 10;

          ctx.fillStyle = 'rgba(13, 44, 30, 0.92)';
          drawRoundRectPath(ctx, pillX, pillY, pillW, pillH, 3);
          ctx.fill();
          ctx.strokeStyle = '#ffd966';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Emerald check + golden revealTag
          ctx.fillStyle = '#66f28d';
          ctx.font = 'bold 7.2px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText('✓', pillX + 5, midY + 0.4);

          ctx.fillStyle = '#ffe58f';
          drawFittedSingleLine(ctx, tagText, pillX + 14, midY + 0.4, pillW - 18, {
            preferredSize: 7.2,
            minSize: 6.0,
            weight: 'bold',
            family: 'sans-serif',
            align: 'left',
            baseline: 'middle',
          });
        } else {
          const pillW = 42;
          const pillX = rx + r.w - pillW - 5;
          rightReservedW = pillW + 10;
          ctx.fillStyle = 'rgba(102, 242, 141, 0.2)';
          drawRoundRectPath(ctx, pillX, pillY, pillW, pillH, 3);
          ctx.fill();
          ctx.fillStyle = '#8ef7ab';
          ctx.font = 'bold 6.8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✓ FIXÉ', pillX + pillW / 2, midY + 0.4);
        }
      } else if (isPicked) {
        const pillW = 54;
        const pillX = rx + r.w - pillW - 5;
        rightReservedW = pillW + 10;
        ctx.fillStyle = '#ffe066';
        drawRoundRectPath(ctx, pillX, pillY, pillW, pillH, 3);
        ctx.fill();
        ctx.fillStyle = '#1b1406';
        ctx.font = 'bold 6.8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↕ EN MAIN', pillX + pillW / 2, midY + 0.4);
      } else if (this.selectedSlot !== null && isCursor) {
        const pillW = 58;
        const pillX = rx + r.w - pillW - 5;
        rightReservedW = pillW + 10;
        ctx.fillStyle = 'rgba(255, 210, 76, 0.28)';
        drawRoundRectPath(ctx, pillX, pillY, pillW, pillH, 3);
        ctx.fill();
        ctx.fillStyle = '#ffe58f';
        ctx.font = 'bold 6.8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⇄ ÉCHANGER', pillX + pillW / 2, midY + 0.4);
      } else if (slot.hintDir !== 0) {
        const hintLabel = formatFrenchText(slot.hintDir < 0 ? earlierLabel : laterLabel);
        ctx.font = 'bold 6.8px sans-serif';
        const pillW = Math.min(82, Math.max(54, Math.ceil(ctx.measureText(hintLabel).width) + 12));
        const pillX = rx + r.w - pillW - (isCursor ? 15 : 5);
        rightReservedW = pillW + (isCursor ? 20 : 10);

        const isUp = slot.hintDir < 0;
        ctx.fillStyle = isUp ? '#143854' : '#4f2c12';
        drawRoundRectPath(ctx, pillX, pillY, pillW, pillH, 3);
        ctx.fill();
        ctx.strokeStyle = isUp ? '#6bd4ff' : '#ffb85c';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = isUp ? '#c4ecff' : '#ffe2ad';
        drawFittedSingleLine(ctx, hintLabel, pillX + pillW / 2, midY + 0.4, pillW - 6, {
          preferredSize: 6.8,
          minSize: 5.8,
          weight: 'bold',
          family: 'sans-serif',
          align: 'center',
          baseline: 'middle',
        });

        if (isCursor) {
          ctx.fillStyle = '#ffe066';
          ctx.font = 'bold 7.5px sans-serif';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText('◀', rx + r.w - 5, midY + 0.5);
        }
      } else if (isCursor) {
        rightReservedW = 18;
        ctx.fillStyle = '#ffe066';
        ctx.font = 'bold 7.5px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('◀', rx + r.w - 7, midY + 0.5);
      }

      // Item label cleanly fitted inside remaining width (ZERO overlap!)
      const textX = rx + 26;
      const maxTextW = Math.max(80, r.w - 26 - rightReservedW - 4);
      ctx.fillStyle = slot.locked ? '#e8ffef' : isPicked ? '#fff7cc' : '#f4f7ff';
      drawFittedSingleLine(ctx, slot.text, textX, midY + 0.4, maxTextW, {
        preferredSize: lay.slotFont,
        minSize: 6.3,
        weight: '600',
        align: 'left',
        baseline: 'middle',
      });
    }

    // Bottom Validate Button
    const vr = this.getValidateRect();
    const valSelected = this.cursor === this.slots.length && this.feedbackTimer <= 0;
    const pulse = valSelected ? 0.88 + 0.12 * Math.sin(this.elapsed * 7) : 1;

    if (valSelected) {
      ctx.fillStyle = `rgba(102, 242, 141, ${0.26 * pulse})`;
      drawRoundRectPath(ctx, vr.x - 3, vr.y - 2, vr.w + 6, vr.h + 4, 6);
      ctx.fill();
    }

    drawPanelBox(
      ctx,
      vr.x + shakeX,
      vr.y,
      vr.w,
      vr.h,
      valSelected ? '#288a50' : '#1e5c3a',
      valSelected ? '#ffe066' : '#5be88c'
    );

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${vr.h <= 21 ? 8.5 : 9}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      valSelected ? '▶ ✓ VALIDER L’ORDRE' : '✓ VALIDER L’ORDRE',
      vr.x + vr.w / 2 + shakeX,
      vr.y + vr.h / 2 + 0.5
    );

    // Subtle helper / wrong-hint footer line
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (this.wrongHintTimer > 0 && this.wrongHintText) {
      ctx.fillStyle = '#ff9aa5';
      drawFittedSingleLine(ctx, this.wrongHintText, MG_W / 2, 233, MG_W - 18, {
        preferredSize: 7.2,
        minSize: 6.0,
        weight: 'bold',
        family: 'sans-serif',
        align: 'center',
        baseline: 'middle',
      });
    } else {
      ctx.fillStyle = 'rgba(225, 232, 250, 0.76)';
      ctx.font = 'bold 6.8px sans-serif';
      ctx.fillText(
        formatFrenchText(
          this.selectedSlot !== null
            ? 'Choisissez une autre carte pour échanger (B pour annuler)'
            : '↑↓ Naviguer  •  A / Clic : Prendre & échanger deux cartes'
        ),
        MG_W / 2,
        233
      );
    }

    // Particles
    drawMgParticles(ctx, this.particles);

    // Celebration Explanation Overlay when Round is Cleared
    if (this.feedbackTimer > 0) {
      const hasTags =
        Array.isArray(round.revealTags) && round.revealTags.length === round.orderedItems.length;
      const modalY = 64;
      const modalH = 136;

      ctx.fillStyle = 'rgba(10, 14, 28, 0.95)';
      drawRoundRectPath(ctx, 18, modalY, MG_W - 36, modalH, 7);
      ctx.fill();
      ctx.strokeStyle = '#66f28d';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#66f28d';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('★ ORDRE PARFAIT ! ★', MG_W / 2, modalY + 9);

      let contentY = modalY + 26;
      if (hasTags && round.revealTags) {
        const recap = round.revealTags.join('  →  ');
        ctx.fillStyle = 'rgba(255, 217, 102, 0.14)';
        drawRoundRectPath(ctx, 28, contentY, MG_W - 56, 15, 3);
        ctx.fill();
        ctx.fillStyle = '#ffe58f';
        drawFittedSingleLine(ctx, recap, MG_W / 2, contentY + 7.5, MG_W - 66, {
          preferredSize: 7.4,
          minSize: 6.0,
          weight: 'bold',
          family: 'sans-serif',
          align: 'center',
          baseline: 'middle',
        });
        contentY += 20;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.fillRect(34, contentY, MG_W - 68, 1);
        contentY += 7;
      }

      const explMaxH = modalY + modalH - 22 - contentY;
      ctx.fillStyle = '#f4f7ff';
      drawFittedWrappedText(ctx, round.explanation, 30, contentY, MG_W - 60, explMaxH, {
        preferredSize: 8.4,
        minSize: 6.4,
        weight: '600',
        lineHeightRatio: 1.32,
      });

      if (this.feedbackElapsed >= 0.45) {
        const pAlpha = 0.6 + 0.4 * Math.sin(this.elapsed * 7);
        ctx.fillStyle = `rgba(255, 224, 102, ${pAlpha})`;
        ctx.font = 'bold 7.8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(
          this.roundIndex + 1 >= this.rounds.length
            ? '▶ [A / Clic] Terminer le défi'
            : '▶ [A / Clic] Manche suivante',
          MG_W / 2,
          modalY + modalH - 6
        );
      }
    }

    // Calm Untimed Top HUD
    const progress =
      (this.roundIndex + (this.feedbackTimer > 0 ? 1 : 0)) / Math.max(1, this.rounds.length);
    drawMiniGameHud(
      ctx,
      this.cfg.title,
      0,
      `Manche ${this.roundIndex + 1}/${this.rounds.length}  •  ${this.slots.length} éléments`,
      progress,
      pal.accent
    );

    ctx.restore();
  }

  getResult(): 'playing' | 'won' | 'lost' {
    return this.result;
  }
}
