import { soundEngine } from '../audio/soundEngine';
import { InputManager } from '../engine/input';
import { Direction, ReactionDuelChallengeConfig } from '../types';
import { drawMiniGameHud, MG_H, MG_W, MiniGameInstance } from './common';

type DuelPhase = 'wait' | 'fakeout' | 'flash' | 'resolved';

const DIR_ARROW: Record<Direction, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

const DIRS: Direction[] = ['up', 'down', 'left', 'right'];

export class ReactionDuelGame implements MiniGameInstance {
  private round = 1;
  private wins = 0;
  private phase: DuelPhase = 'wait';
  private phaseTimer = 0;
  private waitDelay = 1.4;
  private targetDir: Direction = 'left';
  private banner = 'PRÉPAREZ-VOUS...';
  private bannerColor = '#dce4ff';
  private result: 'playing' | 'won' | 'lost' = 'playing';

  constructor(private cfg: ReactionDuelChallengeConfig) {
    this.setupRound();
  }

  private setupRound(): void {
    this.phase = 'wait';
    this.phaseTimer = 0;
    this.waitDelay = 1.1 + Math.random() * 1.4;
    this.targetDir = DIRS[Math.floor(Math.random() * DIRS.length)];
    this.banner = 'RESTEZ CONCENTRÉ...';
    this.bannerColor = '#cfd8f5';
  }

  update(dt: number, input: InputManager): void {
    if (this.result !== 'playing') return;
    this.phaseTimer += dt;

    const tap = input.consumeTap();
    const pressedDir = input.getDirectionJustPressed();
    const pressedA = input.justPressed('a') || Boolean(tap);

    if (this.phase === 'wait' || this.phase === 'fakeout') {
      // Pressing early is a fault!
      if (pressedDir || pressedA) {
        soundEngine.playHitMiss();
        this.banner = 'TROP TÔT ! FEINTE !';
        this.bannerColor = '#ff7070';
        this.phase = 'resolved';
        this.phaseTimer = 0;
        return;
      }

      if (this.phase === 'wait' && this.phaseTimer >= this.waitDelay) {
        if (this.cfg.fakeouts && Math.random() < 0.42) {
          this.phase = 'fakeout';
          this.phaseTimer = 0;
          this.waitDelay = 0.65 + Math.random() * 0.8;
          this.banner = '... FEINTE ! NE BOUGEZ PAS !';
          this.bannerColor = '#ffb347';
          soundEngine.playSelect();
        } else {
          this.enterFlash();
        }
      } else if (this.phase === 'fakeout' && this.phaseTimer >= this.waitDelay) {
        this.enterFlash();
      }
      return;
    }

    if (this.phase === 'flash') {
      const windowSec = this.cfg.windowMs / 1000;
      if (this.cfg.directional) {
        if (pressedDir) {
          if (pressedDir === this.targetDir) {
            this.scoreWin();
          } else {
            this.scoreLoss('MAUVAISE DIRECTION !');
          }
          return;
        }
      } else if (pressedA || pressedDir) {
        this.scoreWin();
        return;
      }

      if (this.phaseTimer >= windowSec) {
        this.scoreLoss('TROP LENT !');
      }
      return;
    }

    if (this.phase === 'resolved' && this.phaseTimer >= 0.85) {
      if (this.wins >= this.cfg.requiredWins) {
        this.result = 'won';
        return;
      }
      const remRounds = this.cfg.rounds - this.round;
      if (this.round >= this.cfg.rounds || this.wins + remRounds < this.cfg.requiredWins) {
        this.result = this.wins >= this.cfg.requiredWins ? 'won' : 'lost';
        return;
      }
      this.round++;
      this.setupRound();
    }
  }

  private enterFlash(): void {
    this.phase = 'flash';
    this.phaseTimer = 0;
    this.targetDir = DIRS[Math.floor(Math.random() * DIRS.length)];
    soundEngine.playCountdown(true);
    this.banner = this.cfg.directional
      ? `MAINTENANT : ${DIR_ARROW[this.targetDir]} !`
      : 'MAINTENANT ! FRAPPEZ !';
    this.bannerColor = '#66f28d';
  }

  private scoreWin(): void {
    this.wins++;
    soundEngine.playHitPerfect();
    this.banner = 'PARADE PARFAITE !';
    this.bannerColor = '#66f28d';
    this.phase = 'resolved';
    this.phaseTimer = 0;
  }

  private scoreLoss(msg: string): void {
    soundEngine.playHitMiss();
    this.banner = msg;
    this.bannerColor = '#ff7070';
    this.phase = 'resolved';
    this.phaseTimer = 0;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.phase === 'flash' ? '#2c1e26' : '#171b2d';
    ctx.fillRect(0, 0, MG_W, MG_H);

    drawMiniGameHud(
      ctx,
      this.cfg.title,
      0,
      `Victoires ${this.wins}/${this.cfg.requiredWins} • Duel ${this.round}/${this.cfg.rounds}`,
      this.wins / Math.max(1, this.cfg.requiredWins),
      '#ff6b6b'
    );

    // Dramatic standoff horizon
    ctx.fillStyle = '#252c45';
    ctx.fillRect(0, 152, MG_W, 88);

    // Challenger & Player silhouettes
    ctx.fillStyle = '#e05353';
    ctx.fillRect(284, 114, 30, 44);
    ctx.fillStyle = '#47a8ff';
    ctx.fillRect(70, 118, 30, 40);

    // Central Signal Box
    const cx = MG_W / 2;
    const cy = 96;
    if (this.phase === 'flash') {
      ctx.fillStyle = '#ffdf4d';
      ctx.fillRect(cx - 42, cy - 34, 84, 68);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - 42, cy - 34, 84, 68);
      ctx.fillStyle = '#181a28';
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.cfg.directional ? DIR_ARROW[this.targetDir] : '!', cx, cy + 2);
    } else if (this.phase === 'fakeout') {
      ctx.fillStyle = '#4d321c';
      ctx.fillRect(cx - 32, cy - 24, 64, 48);
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 32, cy - 24, 64, 48);
      ctx.fillStyle = '#ffb347';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('...', cx, cy);
    } else {
      ctx.fillStyle = '#212740';
      ctx.fillRect(cx - 32, cy - 24, 64, 48);
      ctx.strokeStyle = '#53608c';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 32, cy - 24, 64, 48);
      ctx.fillStyle = '#7382b5';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VS', cx, cy);
    }

    // Banner
    ctx.fillStyle = '#111422';
    ctx.fillRect(42, 174, MG_W - 84, 28);
    ctx.strokeStyle = this.bannerColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(42, 174, MG_W - 84, 28);
    ctx.fillStyle = this.bannerColor;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.banner, MG_W / 2, 188);

    ctx.fillStyle = '#9aa8d4';
    ctx.font = '8px sans-serif';
    ctx.fillText(
      this.cfg.directional
        ? 'Appuyez sur la flèche indiquée dès le signal !'
        : 'Appuyez sur Espace/A dès que le signal ! apparaît !',
      MG_W / 2,
      222
    );
  }

  getResult(): 'playing' | 'won' | 'lost' {
    return this.result;
  }
}
