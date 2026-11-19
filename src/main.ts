import './styles.css';
import { PokeNoelGame } from './game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error('Canvas #game-canvas introuvable.');
}

const game = new PokeNoelGame(canvas);
game.start();
