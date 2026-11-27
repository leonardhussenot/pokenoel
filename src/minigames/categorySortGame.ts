import { soundEngine } from '../audio/soundEngine';
import { InputManager } from '../engine/input';
import { CategorySortChallengeConfig, CategorySortItem, ChallengeMistake } from '../types';
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

const BUCKET_ACCENTS = ['#59b8ff', '#f4c542', '#c28cff'] as const;

interface FlyCardAnim {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number;
  dur: number;
  color: string;
}

// Single non-leaking module-level digit shortcut dispatcher (AZERTY + QWERTY friendly)
interface DigitTarget {
  lastTickMs: number;
  queueDigit: (idx: number) => void;
}
let activeDigitTarget: DigitTarget | null = null;
let digitListenerAttached = false;

function ensureDigitListener(): void {
  if (digitListenerAttached || typeof window === 'undefined') return;
  digitListenerAttached = true;
  window.addEventListener('keydown', (e) => {
    if (!activeDigitTarget) return;
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (Date.now() - activeDigitTarget.lastTickMs > 500) {
      activeDigitTarget = null;
      return;
    }
    if (
      (typeof document !== 'undefined' &&
        document.activeElement &&
        (document.activeElement.tagName === 'TEXTAREA' ||
          document.activeElement.tagName === 'INPUT')) ||
      (typeof document !== 'undefined' && document.querySelector('dialog[open]'))
    ) {
      return;
    }
    let idx = -1;
    if (e.code === 'Digit1' || e.code === 'Numpad1' || e.key === '1') idx = 0;
    else if (e.code === 'Digit2' || e.code === 'Numpad2' || e.key === '2') idx = 1;
    else if (e.code === 'Digit3' || e.code === 'Numpad3' || e.key === '3') idx = 2;
    if (idx >= 0) {
      activeDigitTarget.queueDigit(idx);
    }
  });
}

export class CategorySortGame implements MiniGameInstance {
  items: CategorySortItem[];
  itemIndex = 0;
  cursor = 0;
  lives: number;
  bucketCounts: number[];
  revealTimer = 0;
  lastCorrect = false;
  private mistakes: ChallengeMistake[] = [];

  getMistakes(): ChallengeMistake[] {
    return [...this.mistakes];
  }

  getCompletedSteps(): number {
    return this.itemOutcomes.filter((o) => o === 'correct').length;
  }

  useJoker(): string | null {
    if (this.result !== 'playing' || this.revealTimer > 0) return null;
    const item = this.items[this.itemIndex];
    if (!item) return null;
    const correctBucket = Math.min(this.cfg.categories.length - 1, Math.max(0, item.categoryIndex));
    this.jokerHintBucket = correctBucket;
    this.cursor = correctBucket;
    return 'Léo vous montre la bonne catégorie !';
  }
  private jokerHintBucket: number | null = null;
  lastPickedBucket: number | null = null;
  result: 'playing' | 'won' | 'lost' = 'playing';

  private elapsed = 0;
  private revealElapsed = 0;
  private cardEnterTimer = 0;
  private shakeTimer = 0;
  private pendingDigit: number | null = null;
  private itemOutcomes: ('pending' | 'correct' | 'wrong')[];
  private bucketPopTimers: number[];
  private flyAnim: FlyCardAnim | null = null;
  private particles: MgParticle[] = [];
  private digitTarget: DigitTarget;

  constructor(private cfg: CategorySortChallengeConfig, startStep = 0) {
    this.lives = Math.max(1, cfg.lives);
    this.bucketCounts = cfg.categories.map(() => 0);
    this.bucketPopTimers = cfg.categories.map(() => 0);
    this.digitTarget = {
      lastTickMs: Date.now(),
      queueDigit: (idx: number) => {
        if (this.result === 'playing' && this.revealTimer <= 0 && idx < this.cfg.categories.length) {
          this.pendingDigit = idx;
        }
      },
    };

    // Fisher-Yates shuffle copy so card order isn't predictable
    const copy = cfg.items.map((it) => ({ ...it }));
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    this.items = copy;
    this.itemOutcomes = copy.map(() => 'pending');

    if (copy.length > 0 && startStep > 0) {
      const clampedStart = Math.max(0, Math.min(Math.floor(startStep), copy.length - 1));
      this.itemIndex = clampedStart;
      for (let i = 0; i < clampedStart; i++) {
        this.itemOutcomes[i] = 'correct';
        const bIdx = Math.min(cfg.categories.length - 1, Math.max(0, copy[i].categoryIndex));
        this.bucketCounts[bIdx]++;
      }
    }

    if (this.items.length === 0) {
      this.result = 'won';
    } else {
      ensureDigitListener();
      this.registerActiveDigitTarget();
    }
  }

  private registerActiveDigitTarget(): void {
    this.digitTarget.lastTickMs = Date.now();
    activeDigitTarget = this.digitTarget;
  }

  private releaseActiveDigitTarget(): void {
    if (activeDigitTarget === this.digitTarget) {
      activeDigitTarget = null;
    }
  }

  private getCardRect() {
    return { x: 34, y: 66, w: MG_W - 68, h: 68 };
  }

  private getBucketRects() {
    const count = this.cfg.categories.length;
    if (count === 2) {
      return [
        { x: 14, y: 144, w: 172, h: 76 },
        { x: 198, y: 144, w: 172, h: 76 },
      ];
    }
    return [
      { x: 12, y: 144, w: 114, h: 76 },
      { x: 135, y: 144, w: 114, h: 76 },
      { x: 258, y: 144, w: 114, h: 76 },
    ];
  }

  private spawnBucketBurst(cx: number, cy: number, color: string, count = 14): void {
    this.particles.push({
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      life: 0.34,
      maxLife: 0.34,
      size: 20,
      color,
      shape: 'ring',
    });
    for (let i = 0; i < count; i++) {
      const a = (i * Math.PI * 2) / count + Math.random() * 0.28;
      const spd = 30 + Math.random() * 54;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 12,
        life: 0.38 + Math.random() * 0.24,
        maxLife: 0.62,
        size: 3.8,
        color: i % 3 === 0 ? '#ffffff' : color,
        gravity: 65,
        shape: i % 2 === 0 ? 'star' : 'circle',
      });
    }
  }

  private assignToBucket(bucketIdx: number): void {
    if (bucketIdx < 0 || bucketIdx >= this.cfg.categories.length) return;
    const item = this.items[this.itemIndex];
    if (!item) return;

    const correctBucket = Math.min(this.cfg.categories.length - 1, Math.max(0, item.categoryIndex));
    this.lastPickedBucket = bucketIdx;
    this.lastCorrect = bucketIdx === correctBucket;
    this.revealTimer = 2.1;
    this.revealElapsed = 0;

    const cardR = this.getCardRect();
    const bucketRects = this.getBucketRects();
    const targetR = bucketRects[correctBucket];

    if (this.lastCorrect) {
      this.bucketCounts[correctBucket]++;
      this.bucketPopTimers[correctBucket] = 0.35;
      this.itemOutcomes[this.itemIndex] = 'correct';
      this.flyAnim = {
        fromX: cardR.x + cardR.w / 2,
        fromY: cardR.y + cardR.h / 2,
        toX: targetR.x + targetR.w / 2,
        toY: targetR.y + targetR.h / 2,
        t: 0,
        dur: 0.24,
        color: '#66f28d',
      };
      this.spawnBucketBurst(targetR.x + targetR.w / 2, targetR.y + targetR.h / 2, '#66f28d', 15);
      soundEngine.playHitPerfect();
    } else {
      const wrongCategory = this.cfg.categories[bucketIdx] ?? '';
      const correctCategory = this.cfg.categories[correctBucket] ?? '';
      if (item.label && wrongCategory && correctCategory) {
        const already = this.mistakes.some(
          (m) =>
            m.kind === 'category_sort' &&
            m.itemLabel === item.label &&
            m.wrongCategory === wrongCategory
        );
        if (!already) {
          this.mistakes.unshift({
            kind: 'category_sort',
            itemLabel: item.label,
            wrongCategory,
            correctCategory,
          });
        }
      }
      const pickedR = bucketRects[bucketIdx] ?? targetR;
      this.lives = Math.max(0, this.lives - 1);
      this.itemOutcomes[this.itemIndex] = 'wrong';
      this.shakeTimer = 0.36;
      this.spawnBucketBurst(pickedR.x + pickedR.w / 2, pickedR.y + pickedR.h / 2, '#ff8a96', 12);
      soundEngine.playHitMiss();
    }
  }

  private finishReveal(): void {
    this.revealTimer = 0;
    this.revealElapsed = 0;
    this.lastPickedBucket = null;
    this.jokerHintBucket = null;
    this.flyAnim = null;

    if (this.lives <= 0) {
      this.result = 'lost';
      this.releaseActiveDigitTarget();
      return;
    }
    if (this.itemIndex + 1 >= this.items.length) {
      this.result = 'won';
      this.releaseActiveDigitTarget();
      return;
    }
    this.itemIndex++;
    this.cardEnterTimer = 0;
  }

  update(dt: number, input: InputManager): void {
    if (this.result !== 'playing') {
      this.releaseActiveDigitTarget();
      return;
    }
    this.registerActiveDigitTarget();

    this.elapsed += dt;
    this.cardEnterTimer = Math.min(1, this.cardEnterTimer + dt * 4.8);
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    for (let i = 0; i < this.bucketPopTimers.length; i++) {
      if (this.bucketPopTimers[i] > 0) {
        this.bucketPopTimers[i] = Math.max(0, this.bucketPopTimers[i] - dt);
      }
    }
    if (this.flyAnim) {
      this.flyAnim.t += dt;
      if (this.flyAnim.t >= this.flyAnim.dur) {
        this.flyAnim = null;
      }
    }
    updateMgParticles(this.particles, dt);

    // Reveal & Explanation beat
    if (this.revealTimer > 0) {
      this.pendingDigit = null;
      this.revealTimer -= dt;
      this.revealElapsed += dt;
      const tap = input.consumeTap();
      const canSkip = this.revealElapsed >= 0.4 && (input.justPressed('a') || tap !== null);
      if (this.revealTimer <= 0 || canSkip) {
        this.finishReveal();
      }
      return;
    }

    const bucketCount = this.cfg.categories.length;

    // Direct 1/2/3 keyboard shortcut
    if (this.pendingDigit !== null) {
      const idx = this.pendingDigit;
      this.pendingDigit = null;
      if (idx >= 0 && idx < bucketCount) {
        this.cursor = idx;
        this.assignToBucket(idx);
        return;
      }
    }

    if (input.justPressed('left')) {
      this.cursor = (this.cursor + bucketCount - 1) % bucketCount;
      soundEngine.playSelect();
    } else if (input.justPressed('right')) {
      this.cursor = (this.cursor + 1) % bucketCount;
      soundEngine.playSelect();
    }

    const tap = input.consumeTap();
    if (tap) {
      const rects = this.getBucketRects();
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (tap.x >= r.x && tap.x <= r.x + r.w && tap.y >= r.y && tap.y <= r.y + r.h) {
          this.cursor = i;
          this.assignToBucket(i);
          return;
        }
      }
    }

    if (input.justPressed('a')) {
      this.assignToBucket(this.cursor);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pal = getReflectionThemePalette(this.cfg.themeStyle);
    const item = this.items[Math.min(this.itemIndex, Math.max(0, this.items.length - 1))];
    const shakeX = this.shakeTimer > 0 ? Math.round(Math.sin(this.shakeTimer * 65) * 3) : 0;
    const inReveal = this.revealTimer > 0;
    const bucketRects = this.getBucketRects();
    const cardR = this.getCardRect();

    ctx.save();

    // Rich themed stage backdrop
    drawReflectionStageBackdrop(ctx, this.cfg.themeStyle, this.elapsed);

    // Prompt Banner + Hearts Pill (y = 28..52)
    drawPanelBox(ctx, 14 + shakeX, 28, MG_W - 28, 24, pal.promptBg, pal.accent);

    const heartsW = Math.max(46, this.cfg.lives * 13 + 8);
    const heartsX = MG_W - 19 - heartsW + shakeX;
    ctx.fillStyle = pal.promptInk;
    drawFittedWrappedText(ctx, this.cfg.prompt, 21 + shakeX, 30.5, MG_W - 44 - heartsW, 19, {
      preferredSize: 8.1,
      minSize: 6.4,
      weight: 'bold',
      lineHeightRatio: 1.15,
      verticalCenter: true,
    });

    ctx.fillStyle = 'rgba(18, 22, 38, 0.88)';
    drawRoundRectPath(ctx, heartsX, 31, heartsW, 18, 4);
    ctx.fill();
    drawHearts(ctx, heartsX + 5, 34.5, this.lives, this.cfg.lives);

    // Progress pips strip (y = 56..62)
    const nItems = this.items.length;
    if (nItems > 0 && !inReveal) {
      const pipGap = 6;
      const totalPipsW = (nItems - 1) * (8 + pipGap) + 16;
      let px = Math.round((MG_W - totalPipsW) / 2);
      for (let i = 0; i < nItems; i++) {
        const isCurrent = i === this.itemIndex;
        const w = isCurrent ? 16 : 8;
        const outcome = this.itemOutcomes[i];
        ctx.fillStyle =
          outcome === 'correct'
            ? '#66f28d'
            : outcome === 'wrong'
              ? '#ff7584'
              : isCurrent
                ? '#ffe066'
                : 'rgba(220, 230, 255, 0.25)';
        drawRoundRectPath(ctx, px, 56, w, 4.5, 2.2);
        ctx.fill();
        px += w + pipGap;
      }
    }

    // Active Showcase Card (when not obscured by reveal explanation modal)
    if (item && !inReveal) {
      const remaining = this.items.length - 1 - this.itemIndex;
      const ease = 1 - Math.pow(1 - this.cardEnterTimer, 3);
      const slideY = Math.round((1 - ease) * 14);
      const cx = cardR.x + shakeX;
      const cy = cardR.y + slideY;

      ctx.save();
      ctx.globalAlpha = 0.25 + 0.75 * ease;

      // Stacked flashcard depth hints behind the active card
      if (remaining >= 2) {
        drawPanelBox(ctx, cx + 8, cy + 5, cardR.w - 16, cardR.h, 'rgba(18, 22, 38, 0.72)', 'rgba(255,255,255,0.12)');
      }
      if (remaining >= 1) {
        drawPanelBox(ctx, cx + 4, cy + 2.5, cardR.w - 8, cardR.h, 'rgba(24, 28, 48, 0.85)', 'rgba(255,255,255,0.18)');
      }

      // Main showcase card
      drawPanelBox(ctx, cx, cy, cardR.w, cardR.h, '#fcf7ec', pal.accent);

      // Inner refined gallery border
      ctx.strokeStyle = 'rgba(40, 32, 22, 0.14)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx + 5.5, cy + 5.5, cardR.w - 11, cardR.h - 11);

      // Top card index tag
      ctx.fillStyle = '#232c4d';
      drawRoundRectPath(ctx, cx + cardR.w / 2 - 36, cy + 6, 72, 12, 3);
      ctx.fill();
      ctx.fillStyle = '#ffe58f';
      ctx.font = 'bold 6.8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`CARTE ${this.itemIndex + 1} / ${this.items.length}`, cx + cardR.w / 2, cy + 12.2);

      // Main connoisseur item label
      ctx.fillStyle = '#181c2e';
      drawFittedWrappedText(ctx, item.label, cx + cardR.w / 2, cy + 21, cardR.w - 28, cardR.h - 27, {
        preferredSize: 10.2,
        minSize: 7.2,
        weight: 'bold',
        lineHeightRatio: 1.24,
        align: 'center',
        verticalCenter: true,
      });

      ctx.restore();
    }

    // 2 or 3 Expert Bucket Zones (y = 144..220)
    const correctBucket = item
      ? Math.min(this.cfg.categories.length - 1, Math.max(0, item.categoryIndex))
      : 0;

    for (let i = 0; i < this.cfg.categories.length; i++) {
      const r = bucketRects[i];
      const rx = r.x + shakeX;
      const isCursor = !inReveal && this.cursor === i;
      const isTrueBucket = inReveal && this.lastCorrect && i === correctBucket;
      const isWrongPick = inReveal && i === this.lastPickedBucket && !this.lastCorrect;
      const dimmed = inReveal && !isTrueBucket && !isWrongPick;
      const pop = this.bucketPopTimers[i] > 0 ? Math.round(Math.sin((this.bucketPopTimers[i] / 0.35) * Math.PI) * 3) : 0;
      const ry = r.y - (isCursor ? 2 : 0) - pop;
      const accent = BUCKET_ACCENTS[i % BUCKET_ACCENTS.length];

      ctx.save();
      if (dimmed) ctx.globalAlpha = 0.44;

      // Focus or reveal halo
      if (isCursor || isTrueBucket || isWrongPick) {
        const pulse = 0.24 + 0.14 * Math.sin(this.elapsed * 7);
        ctx.fillStyle = isTrueBucket
          ? `rgba(102, 242, 141, ${pulse + 0.12})`
          : isWrongPick
            ? `rgba(255, 117, 132, ${pulse + 0.1})`
            : `rgba(255, 218, 92, ${pulse})`;
        drawRoundRectPath(ctx, rx - 3, ry - 3, r.w + 6, r.h + 6, 6);
        ctx.fill();
      }

      const bg = isTrueBucket
        ? '#1a5e3a'
        : isWrongPick
          ? '#6e202c'
          : isCursor
            ? pal.cardSelectedBg
            : pal.cardBg;

      const border = isTrueBucket
        ? '#66f28d'
        : isWrongPick
          ? '#ff7584'
          : isCursor
            ? '#ffe066'
            : accent;

      drawPanelBox(ctx, rx, ry, r.w, r.h, bg, border);

      // Top colored accent header bar inside bucket
      ctx.fillStyle = isTrueBucket
        ? 'rgba(102, 242, 141, 0.24)'
        : isWrongPick
          ? 'rgba(255, 117, 132, 0.24)'
          : 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(rx + 3, ry + 3, r.w - 6, 16);

      // Keycap badge (1 / 2 / 3) top-left
      ctx.fillStyle = isTrueBucket
        ? '#66f28d'
        : isCursor
          ? '#ffe066'
          : accent;
      drawRoundRectPath(ctx, rx + 6, ry + 5, 14, 12, 3);
      ctx.fill();
      ctx.fillStyle = '#121626';
      ctx.font = 'bold 7.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}`, rx + 13, ry + 11.2);

      // Filed card count pill top-right
      const countLabel = `${this.bucketCounts[i]} ✓`;
      ctx.fillStyle = 'rgba(10, 14, 28, 0.72)';
      drawRoundRectPath(ctx, rx + r.w - 30, ry + 5, 24, 12, 3);
      ctx.fill();
      ctx.fillStyle = this.bucketCounts[i] > 0 ? '#8ef7ab' : '#9aa8cc';
      ctx.font = 'bold 6.8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(countLabel, rx + r.w - 18, ry + 11.2);

      // Category title centered inside bucket
      ctx.fillStyle = isCursor || isTrueBucket ? '#fff9db' : '#f2f5ff';
      drawFittedWrappedText(
        ctx,
        this.cfg.categories[i],
        rx + r.w / 2,
        ry + 21,
        r.w - 14,
        r.h - 38,
        {
          preferredSize: this.cfg.categories.length === 2 ? 9.2 : 8.2,
          minSize: 6.4,
          weight: 'bold',
          lineHeightRatio: 1.2,
          align: 'center',
          verticalCenter: true,
        }
      );

      // Bottom action / reveal ribbon (never reveal right bucket on wrong pick!)
      if (isTrueBucket) {
        ctx.fillStyle = '#66f28d';
        drawRoundRectPath(ctx, rx + 10, ry + r.h - 15, r.w - 20, 11, 3);
        ctx.fill();
        ctx.fillStyle = '#101822';
        ctx.font = 'bold 6.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓ BIEN CLASSÉ', rx + r.w / 2, ry + r.h - 9.3);
      } else if (isWrongPick) {
        ctx.fillStyle = '#ff7584';
        drawRoundRectPath(ctx, rx + 14, ry + r.h - 15, r.w - 28, 11, 3);
        ctx.fill();
        ctx.fillStyle = '#1a0c12';
        ctx.font = 'bold 6.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✗ PAS ICI', rx + r.w / 2, ry + r.h - 9.3);
      } else if (!inReveal && this.jokerHintBucket === i) {
        ctx.fillStyle = '#ffe066';
        drawRoundRectPath(ctx, rx + 10, ry + r.h - 15, r.w - 20, 11, 3);
        ctx.fill();
        ctx.fillStyle = '#1a1406';
        ctx.font = 'bold 6.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★ JOKER LÉO', rx + r.w / 2, ry + r.h - 9.3);
      } else if (isCursor) {
        ctx.fillStyle = '#ffe066';
        drawRoundRectPath(ctx, rx + 16, ry + r.h - 15, r.w - 32, 11, 3);
        ctx.fill();
        ctx.fillStyle = '#1a1406';
        ctx.font = 'bold 6.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('▶ CLASSER ICI', rx + r.w / 2, ry + r.h - 9.3);
      }

      ctx.restore();
    }

    // Flying card animation into bucket on correct pick
    if (this.flyAnim) {
      const p = Math.min(1, this.flyAnim.t / this.flyAnim.dur);
      const ease = 1 - Math.pow(1 - p, 2);
      const fx = this.flyAnim.fromX + (this.flyAnim.toX - this.flyAnim.fromX) * ease;
      const fy =
        this.flyAnim.fromY +
        (this.flyAnim.toY - this.flyAnim.fromY) * ease -
        Math.sin(p * Math.PI) * 18;
      const scale = 1 - 0.65 * ease;
      const fw = 54 * scale;
      const fh = 22 * scale;
      ctx.save();
      ctx.globalAlpha = 1 - p * 0.5;
      ctx.fillStyle = '#fcf7ec';
      drawRoundRectPath(ctx, fx - fw / 2, fy - fh / 2, fw, fh, 3);
      ctx.fill();
      ctx.strokeStyle = this.flyAnim.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // Particles
    drawMgParticles(ctx, this.particles);

    // Reveal Toast (show right category & explanation ONLY on correct pick; never spoil on wrong pick!)
    if (inReveal && item) {
      const boxY = 56;
      const boxH = this.lastCorrect ? 82 : 60;
      const accentColor = this.lastCorrect ? '#66f28d' : '#ff8a96';
      const rightCatName = this.cfg.categories[correctBucket];

      ctx.fillStyle = 'rgba(10, 14, 28, 0.96)';
      drawRoundRectPath(ctx, 14, boxY, MG_W - 28, boxH, 6);
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = accentColor;
      drawFittedSingleLine(
        ctx,
        this.lastCorrect ? `★ BIEN CLASSÉ : ${rightCatName} ★` : '✗ MAUVAISE CATÉGORIE !',
        MG_W / 2,
        boxY + 11,
        MG_W - 44,
        {
          preferredSize: 9.6,
          minSize: 7.2,
          weight: 'bold',
          family: 'sans-serif',
          align: 'center',
          baseline: 'middle',
        }
      );

      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.fillRect(26, boxY + 21, MG_W - 52, 1);

      if (this.lastCorrect) {
        // Subtle card label reminder + explanation
        ctx.fillStyle = '#ffe58f';
        drawFittedSingleLine(ctx, `« ${item.label} »`, 24, boxY + 28, MG_W - 48, {
          preferredSize: 7.4,
          minSize: 6.2,
          weight: 'bold',
          family: 'sans-serif',
          align: 'left',
          baseline: 'middle',
        });

        ctx.fillStyle = '#f4f7ff';
        drawFittedWrappedText(ctx, item.explanation, 24, boxY + 35, MG_W - 48, boxH - 48, {
          preferredSize: 7.9,
          minSize: 6.2,
          weight: '600',
          lineHeightRatio: 1.28,
        });
      } else {
        ctx.fillStyle = '#f4f7ff';
        drawFittedWrappedText(
          ctx,
          'Vous perdez 1 cœur ! Cet élément ne va pas dans cette catégorie.',
          MG_W / 2,
          boxY + 25,
          MG_W - 48,
          boxH - 36,
          {
            preferredSize: 8.1,
            minSize: 6.4,
            weight: '600',
            lineHeightRatio: 1.26,
            align: 'center',
          }
        );
      }

      if (this.revealElapsed >= 0.4) {
        const pAlpha = 0.6 + 0.4 * Math.sin(this.elapsed * 7);
        ctx.fillStyle = `rgba(255, 224, 102, ${pAlpha})`;
        ctx.font = 'bold 7.2px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('▶ Suite [A / Clic]', MG_W - 22, boxY + boxH - 4);
      }
    } else {
      ctx.fillStyle = 'rgba(225, 232, 250, 0.78)';
      ctx.font = 'bold 6.9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const numRange = this.cfg.categories.length === 2 ? '1-2' : '1-3';
      ctx.fillText(
        formatFrenchText(`←→ / ${numRange} Choisir une catégorie  •  A / Clic pour classer`),
        MG_W / 2,
        232
      );
    }

    // Calm Untimed Top HUD
    const completed = this.itemIndex + (inReveal && this.lives > 0 ? 1 : 0);
    const progress = completed / Math.max(1, this.items.length);
    drawMiniGameHud(
      ctx,
      this.cfg.title,
      0,
      `Carte ${Math.min(this.itemIndex + 1, Math.max(1, this.items.length))}/${this.items.length}`,
      progress,
      pal.accent
    );

    ctx.restore();
  }

  getResult(): 'playing' | 'won' | 'lost' {
    return this.result;
  }
}
