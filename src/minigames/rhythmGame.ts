import { soundEngine } from '../audio/soundEngine';
import { InputManager } from '../engine/input';
import { RhythmChallengeConfig } from '../types';
import { drawMiniGameHud, MG_H, MG_W, MiniGameInstance } from './common';

interface BeatNote {
  lane: 0 | 1 | 2 | 3;
  targetTime: number;
  hit: boolean;
  missed: boolean;
}

const LANE_KEYS = ['←', '↑', '↓', '→'] as const;
const LANE_BTNS = ['left', 'up', 'down', 'right'] as const;

export class RhythmGame implements MiniGameInstance {
  private elapsed = 0;
  private notes: BeatNote[] = [];
  private score = 0;
  private maxPossibleScore = 1;
  private combo = 0;
  private feedback = '';
  private feedbackColor = '#fff';
  private feedbackTimer = 0;
  private laneFlash = [0, 0, 0, 0];
  private result: 'playing' | 'won' | 'lost' = 'playing';

  private readonly hitY = 196;
  private readonly scrollSpeed = 128; // px per sec

  constructor(private cfg: RhythmChallengeConfig) {
    this.generateChart();
  }

  private generateChart(): void {
    const beatSec = 60 / this.cfg.bpm;
    const step =
      this.cfg.density === 'intense'
        ? beatSec * 0.5
        : this.cfg.density === 'brisk'
          ? beatSec * 0.75
          : beatSec;

    let t = 1.3;
    let idx = 0;
    while (t < this.cfg.durationSec - 0.8) {
      const lane = ((idx * 3 + Math.floor(Math.sin(idx * 1.7) * 2 + 4)) % 4) as 0 | 1 | 2 | 3;
      this.notes.push({ lane, targetTime: t, hit: false, missed: false });

      // Occasional double-hit or syncopated offbeat on intense/brisk
      if (this.cfg.density === 'intense' && idx % 5 === 3 && t + step * 0.5 < this.cfg.durationSec - 0.8) {
        const lane2 = ((lane + 2) % 4) as 0 | 1 | 2 | 3;
        this.notes.push({ lane: lane2, targetTime: t + step * 0.5, hit: false, missed: false });
      }
      t += step;
      idx++;
    }
    this.maxPossibleScore = Math.max(1, this.notes.length * 100);
  }

  update(dt: number, input: InputManager): void {
    if (this.result !== 'playing') return;
    this.elapsed += dt;
    if (this.feedbackTimer > 0) this.feedbackTimer -= dt;
    for (let i = 0; i < 4; i++) {
      if (this.laneFlash[i] > 0) this.laneFlash[i] = Math.max(0, this.laneFlash[i] - dt);
    }

    // Check lane inputs (directions OR canvas tap on lane column)
    const tap = input.consumeTap();
    const pressedLanes: boolean[] = [
      input.justPressed('left'),
      input.justPressed('up'),
      input.justPressed('down'),
      input.justPressed('right'),
    ];
    if (tap && tap.y >= 26) {
      const colW = 72;
      const startX = Math.floor((MG_W - colW * 4) / 2);
      const laneIdx = Math.floor((tap.x - startX) / colW);
      if (laneIdx >= 0 && laneIdx < 4) {
        pressedLanes[laneIdx] = true;
      }
    }

    for (let lane = 0; lane < 4; lane++) {
      if (!pressedLanes[lane]) continue;
      this.laneFlash[lane] = 0.16;
      const target = this.notes.find(
        (n) => !n.hit && !n.missed && n.lane === lane && Math.abs(n.targetTime - this.elapsed) <= 0.22
      );
      if (target) {
        const diff = Math.abs(target.targetTime - this.elapsed);
        target.hit = true;
        this.combo++;
        soundEngine.playNote(this.cfg.notes[lane], 0.14);
        if (diff <= 0.085) {
          this.score += 100;
          this.feedback = `PARFAIT ! x${this.combo}`;
          this.feedbackColor = '#66f28d';
        } else {
          this.score += 70;
          this.feedback = `BIEN ! x${this.combo}`;
          this.feedbackColor = '#ffe27a';
        }
        this.feedbackTimer = 0.55;
      } else {
        this.combo = 0;
        soundEngine.playHitMiss();
        this.feedback = 'À CÔTÉ !';
        this.feedbackColor = '#ff7070';
        this.feedbackTimer = 0.45;
      }
    }

    // Mark missed notes that passed hit zone
    for (const note of this.notes) {
      if (!note.hit && !note.missed && this.elapsed - note.targetTime > 0.22) {
        note.missed = true;
        this.combo = 0;
        this.feedback = 'RATÉ !';
        this.feedbackColor = '#ff7070';
        this.feedbackTimer = 0.45;
      }
    }

    // End condition
    const targetScore = Math.round(this.maxPossibleScore * this.cfg.requiredScoreRatio);
    if (this.elapsed >= this.cfg.durationSec) {
      this.result = this.score >= targetScore ? 'won' : 'lost';
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#151828';
    ctx.fillRect(0, 0, MG_W, MG_H);

    const targetScore = Math.round(this.maxPossibleScore * this.cfg.requiredScoreRatio);
    const ratio = this.score / Math.max(1, targetScore);
    const remaining = Math.max(0, this.cfg.durationSec - this.elapsed);

    drawMiniGameHud(
      ctx,
      this.cfg.title,
      remaining,
      `Score ${this.score}/${targetScore}`,
      ratio,
      '#7cc4ff'
    );

    const colW = 72;
    const startX = Math.floor((MG_W - colW * 4) / 2);

    // Lanes
    for (let i = 0; i < 4; i++) {
      const lx = startX + i * colW;
      ctx.fillStyle = i % 2 === 0 ? '#1d2238' : '#222842';
      ctx.fillRect(lx, 26, colW - 2, MG_H - 26);

      if (this.laneFlash[i] > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.fillRect(lx, 26, colW - 2, MG_H - 26);
      }

      // Target receptor
      ctx.fillStyle = '#0e111d';
      ctx.fillRect(lx + 6, this.hitY - 10, colW - 14, 20);
      ctx.strokeStyle = this.cfg.laneColors[i];
      ctx.lineWidth = 2;
      ctx.strokeRect(lx + 6, this.hitY - 10, colW - 14, 20);

      // Lane direction & label
      ctx.fillStyle = this.cfg.laneColors[i];
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${LANE_KEYS[i]} ${this.cfg.laneLabels[i]}`, lx + (colW - 2) / 2, this.hitY + 21);
    }

    // Hit line
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(startX, this.hitY, colW * 4 - 2, 1);

    // Notes
    for (const note of this.notes) {
      if (note.hit) continue;
      const dtToHit = note.targetTime - this.elapsed;
      const ny = this.hitY - dtToHit * this.scrollSpeed;
      if (ny < 26 || ny > MG_H) continue;

      const lx = startX + note.lane * colW;
      const col = note.missed ? '#555a70' : this.cfg.laneColors[note.lane];
      ctx.fillStyle = '#0f1220';
      ctx.fillRect(lx + 10, Math.round(ny) - 8, colW - 22, 16);
      ctx.fillStyle = col;
      ctx.fillRect(lx + 12, Math.round(ny) - 6, colW - 26, 12);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(LANE_KEYS[note.lane], lx + (colW - 2) / 2, Math.round(ny));
    }

    // Feedback popup
    if (this.feedbackTimer > 0 && this.feedback) {
      ctx.fillStyle = 'rgba(12, 15, 28, 0.85)';
      ctx.fillRect(122, 54, 140, 22);
      ctx.fillStyle = this.feedbackColor;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.feedback, MG_W / 2, 65);
    }

    // Touch hint
    ctx.fillStyle = '#8b95b8';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Flèches / ZQSD ou touchez les pistes au bon rythme !', MG_W / 2, 233);
    void LANE_BTNS;
  }

  getResult(): 'playing' | 'won' | 'lost' {
    return this.result;
  }
}
