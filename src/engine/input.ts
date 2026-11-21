import { Direction } from '../types';
import { SCREEN_H, SCREEN_W } from './overworld';

export type GameButton =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'a'
  | 'b'
  | 'run'
  | 'swap'
  | 'menu'
  | 'mute';

const KEY_TO_BUTTON: Record<string, GameButton> = {
  ArrowUp: 'up',
  KeyW: 'up',
  KeyZ: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  KeyQ: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'a',
  Enter: 'a',
  KeyE: 'a',
  Escape: 'b',
  Backspace: 'b',
  KeyX: 'b',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  KeyC: 'swap',
  Tab: 'swap',
  KeyM: 'mute',
};

export interface CanvasTap {
  x: number;
  y: number;
}

export class InputManager {
  private held = new Set<GameButton>();
  private pressed = new Set<GameButton>();
  private dirOrder: Direction[] = [];
  private canvasTap: CanvasTap | null = null;
  private canvasHeld = false;
  private canvasPointer: CanvasTap | null = null;
  private canvasHover: CanvasTap | null = null;
  private onAnyGesture: (() => void) | null = null;

  attach(canvas: HTMLCanvasElement, onAnyGesture?: () => void): void {
    this.onAnyGesture = onAnyGesture ?? null;
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      this.onAnyGesture?.();
      // Do not hijack typing or modal dialog navigation (info/settings/save)
      if (
        (document.activeElement &&
          (document.activeElement.tagName === 'TEXTAREA' ||
            document.activeElement.tagName === 'INPUT')) ||
        document.querySelector('dialog[open]')
      ) {
        return;
      }

      const btn = this.resolveButton(e);
      if (!btn) return;

      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)
      ) {
        e.preventDefault();
      }
      this.pressButton(btn);
    });

    window.addEventListener('keyup', (e) => {
      const btn = this.resolveButton(e);
      if (!btn) return;
      this.releaseButton(btn);
    });

    window.addEventListener('blur', () => {
      this.held.clear();
      this.dirOrder = [];
      this.canvasHeld = false;
    });

    // Touch / Mouse buttons in the GBA shell
    const buttons = document.querySelectorAll<HTMLElement>('[data-btn]');
    buttons.forEach((el) => {
      const btnName = el.dataset.btn as GameButton | undefined;
      if (!btnName) return;

      const start = (ev: Event) => {
        ev.preventDefault();
        this.onAnyGesture?.();
        el.classList.add('active');
        if (btnName === 'menu') {
          this.pressButton('menu');
        } else {
          this.pressButton(btnName);
        }
      };
      const end = (ev: Event) => {
        ev.preventDefault();
        el.classList.remove('active');
        this.releaseButton(btnName);
      };

      el.addEventListener('pointerdown', start);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('pointerleave', end);
    });

    // Direct canvas clicks/taps & continuous hold mapped to 384x240 logical coordinates
    const mapCanvasCoords = (e: PointerEvent): CanvasTap | null => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      return {
        x: Math.floor(((e.clientX - rect.left) / rect.width) * SCREEN_W),
        y: Math.floor(((e.clientY - rect.top) / rect.height) * SCREEN_H),
      };
    };

    canvas.addEventListener('pointerdown', (e) => {
      this.onAnyGesture?.();
      const pt = mapCanvasCoords(e);
      if (!pt) return;
      this.canvasTap = pt;
      this.canvasHeld = true;
      this.canvasPointer = pt;
    });

    canvas.addEventListener('pointermove', (e) => {
      const pt = mapCanvasCoords(e);
      if (pt) {
        this.canvasHover = pt;
        if (this.canvasHeld) this.canvasPointer = pt;
      }
    });

    const endCanvasHold = () => {
      this.canvasHeld = false;
    };
    canvas.addEventListener('pointerup', endCanvasHold);
    canvas.addEventListener('pointercancel', endCanvasHold);
    canvas.addEventListener('pointerleave', () => {
      this.canvasHeld = false;
      this.canvasHover = null;
    });
  }

  private resolveButton(e: KeyboardEvent): GameButton | null {
    // Handle AZERTY vs QWERTY nicely by checking e.key as well as e.code
    const key = e.key.toLowerCase();
    if (key === 'z' || key === 'w') return 'up';
    if (key === 'q' || key === 'a') return 'left';
    if (key === 's') return 'down';
    if (key === 'd') return 'right';
    if (key === 'm') return 'mute';
    if (key === 'c') return 'swap';
    if (key === 'x') return 'b';
    if (key === 'e') return 'a';
    return KEY_TO_BUTTON[e.code] ?? null;
  }

  pressButton(btn: GameButton): void {
    if (!this.held.has(btn)) {
      this.pressed.add(btn);
    }
    this.held.add(btn);
    if (btn === 'up' || btn === 'down' || btn === 'left' || btn === 'right') {
      this.dirOrder = [btn, ...this.dirOrder.filter((d) => d !== btn)];
    }
  }

  releaseButton(btn: GameButton): void {
    this.held.delete(btn);
    if (btn === 'up' || btn === 'down' || btn === 'left' || btn === 'right') {
      this.dirOrder = this.dirOrder.filter((d) => d !== btn);
    }
  }

  isDown(btn: GameButton): boolean {
    return this.held.has(btn);
  }

  justPressed(btn: GameButton): boolean {
    return this.pressed.has(btn);
  }

  getDirectionHeld(): Direction | null {
    return this.dirOrder[0] ?? null;
  }

  getDirectionJustPressed(): Direction | null {
    for (const d of this.dirOrder) {
      if (this.pressed.has(d)) return d;
    }
    for (const d of ['up', 'down', 'left', 'right'] as const) {
      if (this.pressed.has(d)) return d;
    }
    return null;
  }

  getCanvasTap(): CanvasTap | null {
    return this.canvasTap;
  }

  isCanvasHeld(): boolean {
    return this.canvasHeld;
  }

  getCanvasPointer(): CanvasTap | null {
    return this.canvasPointer;
  }

  getCanvasHover(): CanvasTap | null {
    return this.canvasHover;
  }

  consumeTap(): CanvasTap | null {
    const t = this.canvasTap;
    this.canvasTap = null;
    return t;
  }

  endFrame(): void {
    this.pressed.clear();
    this.canvasTap = null;
  }
}
