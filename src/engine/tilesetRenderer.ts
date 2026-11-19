import { InteriorTheme, TileType, WorldTheme } from '../types';

export const TILE_SIZE = 16;

export const SOLID_TILES: ReadonlySet<TileType> = new Set([
  'water',
  'tree',
  'wall_a',
  'wall_b',
  'roof_a',
  'roof_b',
  'window',
  'fence',
  'lamp',
  'sign',
  'fountain',
  'pillar',
  'statue',
  'gate_closed',
  'in_wall',
  'bookshelf',
  'stage',
  'counter',
  'table',
  'equipment',
  'hoop_prop',
  'goal_prop',
  'plant',
  'spotlight',
]);

export function isTileWalkable(tile: TileType): boolean {
  return !SOLID_TILES.has(tile);
}

interface ThemePalette {
  grass1: string;
  grass2: string;
  grassBlade: string;
  path1: string;
  path2: string;
  plaza1: string;
  plaza2: string;
  water1: string;
  water2: string;
  waterFoam: string;
  treeDark: string;
  treeMid: string;
  treeLight: string;
  trunk: string;
  wallA: string;
  wallB: string;
  roofA: string;
  roofB: string;
  trim: string;
}

const WORLD_PALETTES: Record<WorldTheme, ThemePalette> = {
  // La Cité des Lettres (Haussmann cream, slate blue, emerald parks)
  pm: {
    grass1: '#59a65f',
    grass2: '#4d9653',
    grassBlade: '#77c27b',
    path1: '#d8c9a8',
    path2: '#c7b590',
    plaza1: '#cfc9be',
    plaza2: '#b8b0a3',
    water1: '#3c80c4',
    water2: '#559ae0',
    waterFoam: '#c7e8ff',
    treeDark: '#235e38',
    treeMid: '#37824c',
    treeLight: '#5cab69',
    trunk: '#6e472d',
    wallA: '#eadfc9',
    wallB: '#d9c5a3',
    roofA: '#43587a',
    roofB: '#7a3345',
    trim: '#d6ae53',
  },
  // Rio-Hollywood (Copacabana sand, ocean teal, warm terracotta & studio gold)
  df: {
    grass1: '#60b35c',
    grass2: '#52a14f',
    grassBlade: '#82d179',
    path1: '#e6c999',
    path2: '#d5b37c',
    plaza1: '#f0efe9',
    plaza2: '#232836',
    water1: '#2394b8',
    water2: '#35b4d6',
    waterFoam: '#d9fbff',
    treeDark: '#1e6e3e',
    treeMid: '#349951',
    treeLight: '#60c46c',
    trunk: '#855736',
    wallA: '#f5dfc1',
    wallB: '#ebbf9d',
    roofA: '#cc563b',
    roofB: '#2b558c',
    trim: '#f4c542',
  },
  // Lumière & Saveurs (Warm stone market, bordeaux awnings, slate darkroom)
  jp: {
    grass1: '#65a858',
    grass2: '#58974c',
    grassBlade: '#85c474',
    path1: '#dcc7a9',
    path2: '#cbb18f',
    plaza1: '#ddd6cc',
    plaza2: '#c5bcb0',
    water1: '#3a7bb0',
    water2: '#4e93cc',
    waterFoam: '#d0ecff',
    treeDark: '#2c6334',
    treeMid: '#438a49',
    treeLight: '#6ab368',
    trunk: '#70492e',
    wallA: '#f2e6d3',
    wallB: '#dfd1bd',
    roofA: '#9e333b',
    roofB: '#38465e',
    trim: '#e0a943',
  },
  // Arena-City (Vibrant turf, stadium steel blue & basketball amber)
  aj: {
    grass1: '#4aa854',
    grass2: '#3f9648',
    grassBlade: '#6cc474',
    path1: '#cfd6e3',
    path2: '#b6bfd1',
    plaza1: '#dee4ef',
    plaza2: '#aeb8cc',
    water1: '#2f72c4',
    water2: '#498fe0',
    waterFoam: '#cce5ff',
    treeDark: '#1f5e39',
    treeMid: '#32824d',
    treeLight: '#56ab6a',
    trunk: '#694630',
    wallA: '#e4eaf5',
    wallB: '#c8d2e6',
    roofA: '#2051a8',
    roofB: '#c93a32',
    trim: '#ffd045',
  },
};

const tileCache = new Map<string, HTMLCanvasElement>();

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function getThemePalette(theme: WorldTheme | InteriorTheme): ThemePalette {
  if (theme in WORLD_PALETTES) {
    return WORLD_PALETTES[theme as WorldTheme];
  }
  switch (theme) {
    case 'theater':
    case 'salon':
      return WORLD_PALETTES.pm;
    case 'samba_club':
    case 'cinema_set':
      return WORLD_PALETTES.df;
    case 'kitchen':
    case 'darkroom':
      return WORLD_PALETTES.jp;
    case 'stadium':
    case 'court':
      return WORLD_PALETTES.aj;
    default:
      return WORLD_PALETTES.pm;
  }
}

function renderTileToCanvas(
  tile: TileType,
  theme: WorldTheme | InteriorTheme,
  animFrame: number
): HTMLCanvasElement {
  const c = makeCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const p = getThemePalette(theme);
  const f = animFrame % 2;

  const px = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  switch (tile) {
    case 'grass': {
      px(0, 0, 16, 16, p.grass1);
      px(2, 3, 2, 1, p.grass2);
      px(10, 11, 2, 1, p.grass2);
      px(5, 8, 1, 2, p.grassBlade);
      px(12, 4, 1, 2, p.grassBlade);
      break;
    }
    case 'grass_flower': {
      px(0, 0, 16, 16, p.grass1);
      px(2, 11, 1, 2, p.grassBlade);
      px(12, 3, 1, 2, p.grassBlade);
      const shift = f;
      px(3 + shift, 4, 3, 3, theme === 'df' ? '#ff7059' : '#fff7f0');
      px(4 + shift, 5, 1, 1, '#f4c542');
      px(10 - shift, 10, 3, 3, theme === 'aj' ? '#ffd045' : '#ff9ec4');
      px(11 - shift, 11, 1, 1, '#fff');
      break;
    }
    case 'path': {
      px(0, 0, 16, 16, p.path1);
      px(1, 2, 4, 2, p.path2);
      px(9, 6, 5, 2, p.path2);
      px(3, 11, 4, 2, p.path2);
      px(12, 13, 3, 2, p.path2);
      break;
    }
    case 'plaza': {
      if (theme === 'df') {
        // Copacabana black & white wave pattern!
        px(0, 0, 16, 16, p.plaza1);
        px(0, 0, 6, 4, p.plaza2);
        px(6, 2, 6, 4, p.plaza2);
        px(12, 4, 4, 4, p.plaza2);
        px(0, 8, 6, 4, p.plaza2);
        px(6, 10, 6, 4, p.plaza2);
        px(12, 12, 4, 4, p.plaza2);
      } else {
        px(0, 0, 16, 16, p.plaza1);
        px(0, 0, 16, 1, p.plaza2);
        px(0, 8, 16, 1, p.plaza2);
        px(0, 0, 1, 8, p.plaza2);
        px(8, 8, 1, 8, p.plaza2);
      }
      break;
    }
    case 'sand': {
      px(0, 0, 16, 16, '#f2d99d');
      px(3, 4, 2, 1, '#dec07c');
      px(11, 9, 2, 1, '#dec07c');
      px(6, 13, 1, 1, '#fff5d9');
      break;
    }
    case 'star_tile': {
      px(0, 0, 16, 16, '#2b2f3d');
      px(0, 0, 16, 1, '#444b61');
      px(0, 0, 1, 16, '#444b61');
      // Coral pink Hollywood star
      px(7, 2, 2, 12, '#ea6c80');
      px(2, 6, 12, 2, '#ea6c80');
      px(5, 5, 6, 5, '#ea6c80');
      px(4, 10, 3, 3, '#ea6c80');
      px(9, 10, 3, 3, '#ea6c80');
      px(6, 6, 4, 3, '#ffd97d');
      break;
    }
    case 'water': {
      px(0, 0, 16, 16, p.water1);
      px(f * 3 + 1, 3, 5, 2, p.water2);
      px(f * 2 + 7, 10, 6, 2, p.water2);
      px(f * 3 + 2, 3, 2, 1, p.waterFoam);
      px(f * 2 + 9, 10, 2, 1, p.waterFoam);
      break;
    }
    case 'bridge': {
      px(0, 0, 16, 16, p.water1);
      px(0, 1, 16, 14, '#9e6b43');
      px(0, 1, 16, 2, '#694122');
      px(0, 13, 16, 2, '#694122');
      for (let x = 2; x < 16; x += 4) {
        px(x, 3, 1, 10, '#784c2a');
      }
      break;
    }
    case 'carpet':
    case 'rug': {
      px(0, 0, 16, 16, '#a82637');
      px(1, 1, 14, 14, '#c73647');
      px(2, 2, 12, 1, '#f4c542');
      px(2, 13, 12, 1, '#f4c542');
      break;
    }
    case 'tree': {
      px(0, 0, 16, 16, p.grass1);
      if (theme === 'df') {
        // Palm tree
        px(6, 9, 4, 7, p.trunk);
        px(7, 8, 2, 2, '#a36e46');
        px(1, 4, 14, 3, p.treeMid);
        px(3, 2, 10, 3, p.treeLight);
        px(0, 6, 5, 2, p.treeDark);
        px(11, 6, 5, 2, p.treeDark);
        px(5, 6, 6, 2, p.treeDark);
      } else {
        // Lush GBA oak/park tree
        px(6, 11, 4, 5, p.trunk);
        px(2, 3, 12, 9, p.treeDark);
        px(3, 2, 10, 8, p.treeMid);
        px(4, 2, 7, 4, p.treeLight);
      }
      break;
    }
    case 'wall_a':
    case 'wall_b': {
      const base = tile === 'wall_a' ? p.wallA : p.wallB;
      px(0, 0, 16, 16, base);
      px(0, 14, 16, 2, '#8b8378');
      px(0, 7, 16, 1, 'rgba(0,0,0,0.08)');
      px(7, 0, 1, 7, 'rgba(0,0,0,0.08)');
      px(15, 8, 1, 6, 'rgba(0,0,0,0.08)');
      break;
    }
    case 'roof_a':
    case 'roof_b': {
      const base = tile === 'roof_a' ? p.roofA : p.roofB;
      px(0, 0, 16, 16, base);
      px(0, 0, 16, 2, 'rgba(255,255,255,0.2)');
      px(0, 13, 16, 3, 'rgba(0,0,0,0.28)');
      for (let x = 0; x < 16; x += 4) {
        px(x, 6, 3, 1, 'rgba(255,255,255,0.12)');
      }
      break;
    }
    case 'window': {
      px(0, 0, 16, 16, p.wallA);
      px(3, 2, 10, 11, '#2f384f');
      px(4, 3, 8, 9, '#79c2f2');
      px(4, 3, 3, 3, '#c9edff');
      px(7, 3, 2, 9, '#2f384f');
      px(4, 7, 8, 1, '#2f384f');
      px(2, 13, 12, 2, p.trim);
      break;
    }
    case 'door': {
      px(0, 0, 16, 16, p.wallA);
      px(2, 1, 12, 15, '#3b2416');
      px(3, 2, 10, 13, '#6e4226');
      px(4, 3, 3, 5, '#ffd778');
      px(9, 3, 3, 5, '#ffd778');
      px(11, 9, 2, 2, '#f4c542');
      px(2, 15, 12, 1, '#c4b89f');
      break;
    }
    case 'fence': {
      px(0, 0, 16, 16, p.grass1);
      px(2, 4, 3, 11, '#7a5230');
      px(11, 4, 3, 11, '#7a5230');
      px(0, 6, 16, 2, '#a37144');
      px(0, 11, 16, 2, '#a37144');
      break;
    }
    case 'lamp': {
      px(0, 0, 16, 16, p.path1);
      px(6, 13, 4, 3, '#2d3345');
      px(7, 6, 2, 8, '#3f475e');
      px(5, 2, 6, 4, '#2d3345');
      px(6, 3, 4, 2, f === 0 ? '#ffe47a' : '#fff4b8');
      break;
    }
    case 'sign': {
      px(0, 0, 16, 16, p.grass1);
      px(7, 10, 2, 6, '#5c3c22');
      px(2, 3, 12, 8, '#a66e3d');
      px(3, 4, 10, 6, '#cfa06b');
      px(4, 5, 8, 1, '#5c3c22');
      px(4, 7, 6, 1, '#5c3c22');
      break;
    }
    case 'fountain': {
      px(0, 0, 16, 16, p.plaza1);
      px(1, 2, 14, 12, '#8b95a8');
      px(2, 3, 12, 10, p.water1);
      px(6, 5, 4, 5, '#cfd6e3');
      px(7, 2 + f, 2, 4, p.waterFoam);
      px(5 + f, 4, 6 - f * 2, 1, p.waterFoam);
      break;
    }
    case 'pillar': {
      px(0, 0, 16, 16, p.plaza1);
      px(3, 1, 10, 3, '#d9d3c7');
      px(4, 4, 8, 9, '#ebe5d8');
      px(6, 4, 1, 9, '#c7bfb0');
      px(9, 4, 1, 9, '#c7bfb0');
      px(3, 13, 10, 3, '#b8b0a2');
      break;
    }
    case 'statue': {
      px(0, 0, 16, 16, p.plaza1);
      px(3, 10, 10, 6, '#7b8394');
      px(5, 3, 6, 7, '#f4c542');
      px(6, 1, 4, 3, '#ffe88a');
      break;
    }
    case 'gate_closed': {
      px(0, 0, 16, 16, p.path1);
      px(0, 0, 16, 3, p.trim);
      px(0, 6, 16, 4, '#c93838');
      px(6, 5, 4, 6, '#f4c542');
      px(7, 7, 2, 2, '#4a2b10');
      break;
    }
    case 'gate_open': {
      px(0, 0, 16, 16, p.path1);
      px(0, 0, 16, 3, '#5bc46d');
      px(1, 3, 2, 13, p.trim);
      px(13, 3, 2, 13, p.trim);
      break;
    }
    case 'floor_wood': {
      px(0, 0, 16, 16, '#b88351');
      px(0, 4, 16, 1, '#96663b');
      px(0, 9, 16, 1, '#96663b');
      px(0, 14, 16, 1, '#96663b');
      px(7, 0, 1, 4, '#96663b');
      px(3, 5, 1, 4, '#96663b');
      px(11, 10, 1, 4, '#96663b');
      break;
    }
    case 'floor_tile': {
      const c1 = theme === 'darkroom' ? '#2c2228' : '#e6dfd3';
      const c2 = theme === 'darkroom' ? '#3d2830' : '#cfc5b4';
      px(0, 0, 8, 8, c1);
      px(8, 8, 8, 8, c1);
      px(8, 0, 8, 8, c2);
      px(0, 8, 8, 8, c2);
      break;
    }
    case 'floor_court': {
      px(0, 0, 16, 16, '#d99e5b');
      px(0, 3, 16, 1, '#bd8240');
      px(0, 11, 16, 1, '#bd8240');
      px(0, 15, 16, 1, '#f2eee6');
      break;
    }
    case 'floor_turf': {
      px(0, 0, 16, 16, '#399e4b');
      px(0, 0, 8, 16, '#44b357');
      break;
    }
    case 'exit_mat': {
      px(0, 0, 16, 16, '#b88351');
      px(1, 3, 14, 11, '#b83232');
      px(2, 4, 12, 9, '#de4e4e');
      px(6, 10, 4, 2, '#ffd978');
      break;
    }
    case 'in_wall': {
      const wallCol = theme === 'darkroom' ? '#36232a' : theme === 'boss_hall' ? '#4f2c3f' : '#58627a';
      px(0, 0, 16, 16, wallCol);
      px(0, 12, 16, 4, '#2b3042');
      px(0, 11, 16, 1, '#d6ae53');
      break;
    }
    case 'bookshelf': {
      px(0, 0, 16, 16, '#5c3922');
      px(1, 2, 14, 5, '#2b1a10');
      px(1, 9, 14, 5, '#2b1a10');
      px(2, 2, 3, 5, '#c93838');
      px(5, 2, 2, 5, '#4287c9');
      px(7, 2, 3, 5, '#e0a943');
      px(11, 2, 3, 5, '#469e5d');
      px(2, 9, 2, 5, '#8c4fb8');
      px(5, 9, 3, 5, '#d97b24');
      px(9, 9, 4, 5, '#3b739c');
      break;
    }
    case 'stage': {
      px(0, 0, 16, 16, '#75202e');
      px(0, 0, 16, 3, '#d9ab43');
      px(0, 13, 16, 3, '#4f121d');
      break;
    }
    case 'counter': {
      px(0, 0, 16, 16, '#875736');
      px(0, 2, 16, 10, '#cf9e6d');
      px(2, 5, 4, 4, '#fff');
      px(9, 5, 5, 4, '#c73647');
      break;
    }
    case 'table': {
      px(0, 0, 16, 16, '#b88351');
      px(2, 2, 12, 10, '#f2e8d5');
      px(3, 12, 2, 3, '#5c3c22');
      px(11, 12, 2, 3, '#5c3c22');
      px(5, 4, 6, 5, '#d95757');
      break;
    }
    case 'equipment': {
      px(0, 0, 16, 16, '#434b5e');
      px(2, 2, 12, 11, '#262b38');
      px(4, 4, 8, 5, '#79c2f2');
      px(4, 10, 3, 2, '#f4c542');
      px(9, 10, 3, 2, '#5bc46d');
      break;
    }
    case 'hoop_prop': {
      px(0, 0, 16, 16, '#d99e5b');
      px(3, 1, 10, 7, '#f2f5ff');
      px(4, 2, 8, 5, '#2b344d');
      px(5, 8, 6, 2, '#e0522b');
      px(6, 10, 4, 4, '#dfe6f2');
      break;
    }
    case 'goal_prop': {
      px(0, 0, 16, 16, '#399e4b');
      px(1, 2, 14, 11, '#e6ecf5');
      px(3, 4, 10, 9, '#2b7a3b');
      for (let x = 4; x < 13; x += 3) {
        px(x, 4, 1, 9, '#c7d3e3');
      }
      break;
    }
    case 'plant': {
      px(0, 0, 16, 16, '#b88351');
      px(5, 10, 6, 5, '#b85a38');
      px(3, 3, 10, 7, '#358f48');
      px(5, 1, 6, 4, '#5bc46d');
      break;
    }
    case 'spotlight': {
      px(0, 0, 16, 16, '#262a3b');
      px(4, 2, 8, 7, '#161824');
      px(5, 4, 6, 4, f === 0 ? '#ffe878' : '#fff6bf');
      px(7, 9, 2, 6, '#7a839e');
      break;
    }
    default: {
      px(0, 0, 16, 16, '#ff00ff');
    }
  }
  return c;
}

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: TileType,
  theme: WorldTheme | InteriorTheme,
  dx: number,
  dy: number,
  animFrame = 0
): void {
  const f = animFrame % 2;
  const key = `${theme}:${tile}:${f}`;
  let cached = tileCache.get(key);
  if (!cached) {
    cached = renderTileToCanvas(tile, theme, f);
    tileCache.set(key, cached);
  }
  ctx.drawImage(cached, dx, dy);
}
