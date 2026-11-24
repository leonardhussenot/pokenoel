import { InteriorTheme, TileType, WorldTheme } from '../types';

export const TILE_SIZE = 16;
const HD = 32; // 2x high-definition tile canvas drawn into 16x16 logical space (4x backing store => crisp 2x2 physical px)

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
  grass3: string;
  grassBlade: string;
  path1: string;
  path2: string;
  pathGrout: string;
  plaza1: string;
  plaza2: string;
  plazaAccent: string;
  water1: string;
  water2: string;
  waterDeep: string;
  waterFoam: string;
  treeDark: string;
  treeMid: string;
  treeLight: string;
  treeAccent: string;
  trunk: string;
  trunkDark: string;
  wallA: string;
  wallAShade: string;
  wallB: string;
  wallBShade: string;
  roofA: string;
  roofALight: string;
  roofB: string;
  roofBLight: string;
  trim: string;
  trimDark: string;
  carpetMain: string;
  carpetDark: string;
}

const WORLD_PALETTES: Record<WorldTheme, ThemePalette> = {
  // La Cité des Lettres — Haussmann Paris, Luxembourg autumn parks, Comédie-Française
  pm: {
    grass1: '#539e5d',
    grass2: '#468a4f',
    grass3: '#64b36d',
    grassBlade: '#82cf86',
    path1: '#d9ccb2',
    path2: '#c7b89a',
    pathGrout: '#9c8e74',
    plaza1: '#e3dcd0',
    plaza2: '#ccc3b4',
    plazaAccent: '#d4af55',
    water1: '#2f72b5',
    water2: '#4c94db',
    waterDeep: '#20528a',
    waterFoam: '#d6efff',
    treeDark: '#1f5433',
    treeMid: '#347d47',
    treeLight: '#64ab57',
    treeAccent: '#d99838', // warm Paris autumn gold foliage highlights
    trunk: '#6e472d',
    trunkDark: '#472c1a',
    wallA: '#f2e8d5',
    wallAShade: '#d9cbb0',
    wallB: '#e3cfaa',
    wallBShade: '#c4ab82',
    roofA: '#485e82',
    roofALight: '#6c85ad',
    roofB: '#8a2338',
    roofBLight: '#b83952',
    trim: '#e0b853',
    trimDark: '#9e7a24',
    carpetMain: '#b8253b',
    carpetDark: '#7d1626',
  },
  // Rio-Hollywood — Copacabana mosaic, turquoise surf, golden beach, Art Deco cinema
  df: {
    grass1: '#4db359',
    grass2: '#3f9c4b',
    grass3: '#68cc6e',
    grassBlade: '#93e388',
    path1: '#eccfa1',
    path2: '#dbb782',
    pathGrout: '#b58d59',
    plaza1: '#f5f2ea',
    plaza2: '#1f2533',
    plazaAccent: '#f4c542',
    water1: '#1599ba',
    water2: '#2ec4de',
    waterDeep: '#0d6f8f',
    waterFoam: '#e3fcff',
    treeDark: '#186b3a',
    treeMid: '#2fa351',
    treeLight: '#6ad474',
    treeAccent: '#a8eb75',
    trunk: '#8f5d38',
    trunkDark: '#5c381f',
    wallA: '#fae3c6',
    wallAShade: '#e3be96',
    wallB: '#f2b894',
    wallBShade: '#d18e69',
    roofA: '#d45539',
    roofALight: '#f07c59',
    roofB: '#224c8c',
    roofBLight: '#3d74bf',
    trim: '#f7c948',
    trimDark: '#b5841d',
    carpetMain: '#cc293c',
    carpetDark: '#8a1625',
  },
  // Lumière & Saveurs — Parisian culinary market, bordeaux awnings, monochrome photo gallery
  jp: {
    grass1: '#65a656',
    grass2: '#559148',
    grass3: '#7ac267',
    grassBlade: '#9ad685',
    path1: '#e0cbb0',
    path2: '#cdb392',
    pathGrout: '#a3896a',
    plaza1: '#eae2d6',
    plaza2: '#cbc0b0',
    plazaAccent: '#c48f3b',
    water1: '#3574a8',
    water2: '#5698cc',
    waterDeep: '#24527a',
    waterFoam: '#d9f0ff',
    treeDark: '#2c5c34',
    treeMid: '#48854c',
    treeLight: '#76b370',
    treeAccent: '#99cc8f',
    trunk: '#704b31',
    trunkDark: '#4a2f1d',
    wallA: '#f7ecda',
    wallAShade: '#dfd0b8',
    wallB: '#3a4254',
    wallBShade: '#262c38',
    roofA: '#ad2b38',
    roofALight: '#f5ebd8', // cream awning stripe
    roofB: '#323d52',
    roofBLight: '#576b8c',
    trim: '#e3aa42',
    trimDark: '#9c6e1c',
    carpetMain: '#8f2232',
    carpetDark: '#5e121e',
  },
  // Arena-City — Championship mowed turf, streetball courts, steel-blue & crimson stadiums
  aj: {
    grass1: '#3ea84b',
    grass2: '#339440',
    grass3: '#52bd5e',
    grassBlade: '#77db80',
    path1: '#d2dae8',
    path2: '#bac5d9',
    pathGrout: '#8c99b0',
    plaza1: '#2d579c',
    plaza2: '#e37e32',
    plazaAccent: '#ffd447',
    water1: '#236bc4',
    water2: '#4896eb',
    waterDeep: '#16498f',
    waterFoam: '#d4ebff',
    treeDark: '#1b5936',
    treeMid: '#2e854c',
    treeLight: '#58b870',
    treeAccent: '#82db8e',
    trunk: '#694731',
    trunkDark: '#422a1b',
    wallA: '#e8eef7',
    wallAShade: '#c3cfe3',
    wallB: '#25385c',
    wallBShade: '#18243d',
    roofA: '#1c54b8',
    roofALight: '#4280eb',
    roofB: '#cc352d',
    roofBLight: '#f05a4f',
    trim: '#ffd242',
    trimDark: '#b88a14',
    carpetMain: '#1f56b8',
    carpetDark: '#12367a',
  },
  // Néo-Tokyo Noir — Cyberpunk manga neon-cyan & French polar sepia-amber cinema
  sd: {
    grass1: '#35786c',
    grass2: '#2b635a',
    grass3: '#479486',
    grassBlade: '#6cc4b4',
    path1: '#c5ccd9',
    path2: '#adb6c7',
    pathGrout: '#768299',
    plaza1: '#233247',
    plaza2: '#1a2536',
    plazaAccent: '#2ec4d6',
    water1: '#155c78',
    water2: '#268ca8',
    waterDeep: '#0d3d52',
    waterFoam: '#9ef2ff',
    treeDark: '#1c4240',
    treeMid: '#2e6662',
    treeLight: '#589c94',
    treeAccent: '#f28cb1', // subtle sakura-neon blossom accent
    trunk: '#594236',
    trunkDark: '#382820',
    wallA: '#e8e2d5',
    wallAShade: '#c9c0ae',
    wallB: '#26334a',
    wallBShade: '#192233',
    roofA: '#1d7e91',
    roofALight: '#39b8cc',
    roofB: '#8a5229',
    roofBLight: '#c98647',
    trim: '#f0c456',
    trimDark: '#9e7422',
    carpetMain: '#1c6d82',
    carpetDark: '#104454',
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
    case 'manga_studio':
    case 'noir_cinema':
      return WORLD_PALETTES.sd;
    case 'boss_hall':
    default:
      return WORLD_PALETTES.pm;
  }
}

function safeEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number
): void {
  ctx.beginPath();
  if (typeof ctx.ellipse === 'function') {
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  } else {
    ctx.arc(cx, cy, Math.max(1, (rx + ry) * 0.5), 0, Math.PI * 2);
  }
  ctx.fill();
}

function drawGroundBase(
  ctx: CanvasRenderingContext2D,
  p: ThemePalette,
  theme: WorldTheme | InteriorTheme
): void {
  ctx.fillStyle = p.grass1;
  ctx.fillRect(0, 0, HD, HD);
  if (theme === 'aj') {
    // Crisp mowed pitch stripes
    ctx.fillStyle = p.grass2;
    ctx.fillRect(0, 0, 16, HD);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(16, 0, 1, HD);
  } else {
    ctx.fillStyle = p.grass2;
    ctx.fillRect(3, 5, 5, 2);
    ctx.fillRect(19, 17, 6, 2);
    ctx.fillRect(7, 25, 4, 2);
  }
}

function renderTileToCanvas(
  tile: TileType,
  theme: WorldTheme | InteriorTheme,
  animFrame: number
): HTMLCanvasElement {
  const c = makeCanvas(HD, HD);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const p = getThemePalette(theme);
  const f4 = animFrame % 4;
  const f2 = animFrame % 2;

  const px = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  switch (tile) {
    case 'grass': {
      drawGroundBase(ctx, p, theme);
      // Lush grass blades
      px(6, 12, 2, 4, p.grassBlade);
      px(8, 13, 1, 3, p.grass3);
      px(23, 7, 2, 4, p.grassBlade);
      px(25, 8, 1, 3, p.grass3);
      px(14, 24, 2, 3, p.grassBlade);
      px(26, 22, 2, 3, p.grass3);
      if (theme === 'pm') {
        // Subtle Parisian autumn fallen leaves
        px(11, 8, 2, 2, '#d99838');
        px(24, 26, 2, 1, '#c96832');
      } else if (theme === 'df') {
        // Sunlit tropical clover highlights
        px(10, 6, 3, 2, p.grass3);
        px(20, 24, 3, 2, p.grass3);
      } else if (theme === 'jp') {
        // Tiny Provençal sage sprigs
        px(9, 19, 2, 2, '#99c48d');
        px(22, 14, 2, 2, '#99c48d');
      } else if (theme === 'aj') {
        // Crisp mowed stadium turf sparkle
        px(4, 9, 2, 1, '#68cf73');
        px(20, 21, 2, 1, '#68cf73');
      } else if (theme === 'sd') {
        // Subtle sakura petals & nocturnal cyan moss glint
        px(10, 9, 2, 1, '#f28cb1');
        px(23, 25, 2, 1, '#58d8e6');
      }
      break;
    }

    case 'grass_flower': {
      drawGroundBase(ctx, p, theme);
      const sway = f4 === 1 ? 1 : f4 === 3 ? -1 : 0;
      const drawBloom = (cx: number, cy: number, petal: string, center: string) => {
        px(cx + sway, cy + 4, 2, 4, p.treeMid);
        px(cx - 2 + sway, cy + 1, 6, 3, petal);
        px(cx - 1 + sway, cy - 1, 4, 6, petal);
        px(cx + sway, cy + 1, 2, 2, center);
      };
      if (theme === 'pm') {
        // Parisian rose & golden marigold garden bed
        drawBloom(8, 8, '#f77492', '#ffe066');
        drawBloom(22, 19, '#fff5e6', '#e0b853');
        drawBloom(10, 23, '#b88ae6', '#fff2b3');
      } else if (theme === 'df') {
        // Vivid tropical hibiscus & bird of paradise
        drawBloom(9, 8, '#ff594d', '#ffe047');
        drawBloom(22, 18, '#ff9c2a', '#fff5b8');
        drawBloom(11, 24, '#ff4d94', '#ffe047');
      } else if (theme === 'jp') {
        // Provençal lavender & buttercups
        px(7 + sway, 6, 3, 9, '#8b68c9');
        px(8 + sway, 5, 2, 6, '#b091eb');
        px(8 + sway, 14, 1, 4, '#3d7844');
        px(21 - sway, 15, 3, 9, '#8b68c9');
        px(22 - sway, 14, 2, 6, '#b091eb');
        px(22 - sway, 23, 1, 4, '#3d7844');
        drawBloom(14, 22, '#ffe066', '#d48224');
      } else if (theme === 'sd') {
        // Neo-Tokyo sakura pink & glowing cyan-amber blossoms
        drawBloom(9, 9, '#f59ab8', '#fff0c4');
        drawBloom(22, 19, '#6ee8f5', '#ffffff');
        drawBloom(11, 23, '#f2c472', '#fff7dc');
      } else {
        // Arena celebratory gold & blue flowers
        drawBloom(9, 9, '#ffd242', '#ffffff');
        drawBloom(22, 20, '#59a6ff', '#ffe066');
      }
      break;
    }

    case 'path': {
      px(0, 0, HD, HD, p.path1);
      if (theme === 'pm' || theme === 'jp') {
        // Parisian cobblestone pavés (curved staggered courses)
        px(0, 0, HD, 1, p.pathGrout);
        px(0, 8, HD, 1, p.pathGrout);
        px(0, 16, HD, 1, p.pathGrout);
        px(0, 24, HD, 1, p.pathGrout);
        const rows = [
          [2, 10, 18, 26],
          [6, 14, 22, 30],
          [0, 8, 16, 24],
          [4, 12, 20, 28],
        ];
        rows.forEach((cols, r) => {
          const y0 = r * 8;
          cols.forEach((x0, idx) => {
            px(x0, y0 + 1, 1, 7, p.pathGrout);
            if ((r + idx) % 2 === 0) {
              px(x0 + 1, y0 + 1, 6, 6, p.path2);
              px(x0 + 2, y0 + 2, 4, 1, 'rgba(255,255,255,0.22)');
            } else {
              px(x0 + 2, y0 + 2, 4, 1, 'rgba(255,255,255,0.28)');
            }
          });
        });
      } else if (theme === 'df') {
        // Sun-baked sandstone promenade with subtle brass strip
        px(0, 0, HD, 1, p.pathGrout);
        px(0, 16, HD, 1, p.pathGrout);
        px(15, 0, 1, 16, p.pathGrout);
        px(31, 16, 1, 16, p.pathGrout);
        px(2, 2, 12, 12, p.path2);
        px(18, 18, 12, 12, p.path2);
        px(2, 2, 11, 2, 'rgba(255,248,225,0.35)');
        px(18, 18, 11, 2, 'rgba(255,248,225,0.35)');
      } else if (theme === 'sd') {
        // Rain-slicked Neo-Tokyo & Quai des Orfèvres stone sidewalk with subtle cyan/amber sheen
        px(0, 0, HD, 1, p.pathGrout);
        px(0, 16, HD, 1, p.pathGrout);
        px(0, 0, 1, HD, p.pathGrout);
        px(16, 0, 1, HD, p.pathGrout);
        px(2, 2, 13, 13, p.path2);
        px(18, 18, 13, 13, p.path2);
        px(4, 5, 6, 1, 'rgba(46, 196, 214, 0.25)');
        px(20, 23, 6, 1, 'rgba(240, 196, 86, 0.25)');
      } else {
        // Arena modern concrete concourse with athletic blue/gold accent line
        px(0, 0, HD, 1, p.pathGrout);
        px(0, 16, HD, 1, p.pathGrout);
        px(0, 0, 1, HD, p.pathGrout);
        px(16, 0, 1, HD, p.pathGrout);
        px(1, 1, 15, 2, 'rgba(255,255,255,0.45)');
        px(17, 17, 14, 14, p.path2);
        px(17, 17, 14, 2, 'rgba(255,255,255,0.28)');
      }
      break;
    }

    case 'plaza': {
      if (theme === 'df') {
        // Iconic Copacabana undulating black-and-white wave mosaic!
        px(0, 0, HD, HD, p.plaza1);
        ctx.fillStyle = p.plaza2;
        for (let x = 0; x < HD; x++) {
          const wave = Math.round(Math.sin((x / HD) * Math.PI * 2) * 3.5);
          ctx.fillRect(x, (wave + 4 + HD) % HD, 1, 7);
          ctx.fillRect(x, (wave + 20 + HD) % HD, 1, 7);
        }
        // Subtle mosaic stone speckle
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        for (let y = 2; y < HD; y += 6) {
          for (let x = (y % 12 === 2 ? 2 : 5); x < HD; x += 6) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      } else if (theme === 'aj') {
        // Sleek athletic court-blue stadium asphalt concourse with crisp subtle court trim
        px(0, 0, HD, HD, '#315491');
        px(1, 1, 30, 30, '#385fa3');
        // Fine athletic acrylic court surface texture
        px(4, 6, 2, 1, 'rgba(255,255,255,0.08)');
        px(21, 12, 2, 1, 'rgba(255,255,255,0.08)');
        px(11, 24, 2, 1, 'rgba(255,255,255,0.08)');
        px(26, 26, 2, 1, 'rgba(15,28,58,0.16)');
        // Clean architectural slab bevel & crisp thin court stripe
        px(0, 0, HD, 1, 'rgba(180,215,255,0.22)');
        px(0, 0, 1, HD, 'rgba(180,215,255,0.14)');
        px(0, 31, HD, 1, 'rgba(14,25,52,0.32)');
        px(31, 0, 1, HD, 'rgba(14,25,52,0.22)');
        px(0, 15, HD, 1, 'rgba(255,255,255,0.24)');
        px(15, 14, 2, 3, 'rgba(255, 210, 66, 0.45)');
      } else if (theme === 'jp') {
        // Warm Parisian bistro travertine & slate checkerboard terrace
        px(0, 0, 16, 16, p.plaza1);
        px(16, 16, 16, 16, p.plaza1);
        px(16, 0, 16, 16, p.plaza2);
        px(0, 16, 16, 16, p.plaza2);
        px(0, 0, HD, 1, 'rgba(90,72,54,0.25)');
        px(0, 16, HD, 1, 'rgba(90,72,54,0.25)');
        px(0, 0, 1, HD, 'rgba(90,72,54,0.25)');
        px(16, 0, 1, HD, 'rgba(90,72,54,0.25)');
        px(14, 14, 4, 4, p.plazaAccent);
      } else if (theme === 'sd') {
        // Sleek dark-slate Neo-Tokyo & Noir plaza with inlaid cyan-and-gold cyber trim
        px(0, 0, HD, HD, p.plaza1);
        px(1, 1, 14, 14, p.plaza2);
        px(17, 17, 14, 14, p.plaza2);
        px(0, 0, HD, 1, 'rgba(76, 224, 240, 0.16)');
        px(0, 16, HD, 1, 'rgba(76, 224, 240, 0.12)');
        px(0, 0, 1, HD, 'rgba(76, 224, 240, 0.14)');
        px(16, 0, 1, HD, 'rgba(76, 224, 240, 0.12)');
        px(14, 14, 5, 5, '#121b29');
        px(15, 15, 3, 3, p.plazaAccent);
        px(16, 16, 1, 1, p.trim);
      } else {
        // PM: Place des Vosges cream limestone flagstones with gilded corner rosettes
        px(0, 0, HD, HD, p.plaza1);
        px(0, 0, HD, 1, p.plaza2);
        px(0, 16, HD, 1, p.plaza2);
        px(0, 0, 1, HD, p.plaza2);
        px(16, 0, 1, HD, p.plaza2);
        px(1, 1, 15, 2, 'rgba(255,255,255,0.4)');
        px(17, 17, 15, 2, 'rgba(255,255,255,0.4)');
        px(14, 14, 5, 5, p.plaza2);
        px(15, 15, 3, 3, p.plazaAccent);
      }
      break;
    }

    case 'sand': {
      px(0, 0, HD, HD, '#f5dd9d');
      // Gentle wind-rippled dune highlights
      px(2, 6, 12, 2, '#e8c77b');
      px(3, 5, 10, 1, '#fff3cf');
      px(16, 18, 13, 2, '#e8c77b');
      px(17, 17, 11, 1, '#fff3cf');
      px(5, 26, 9, 2, '#e3be70');
      // Tiny sparkling sunlit sand grains & shell
      px(10, 13, 2, 2, '#fff9e6');
      px(25, 9, 2, 2, '#f2b8a2');
      px(26, 9, 1, 1, '#fff4eb');
      break;
    }

    case 'star_tile': {
      // Iconic Hollywood Walk of Fame terrazzo & coral-pink brass-rimmed star
      px(0, 0, HD, HD, '#262b38');
      px(0, 0, HD, 1, '#464f66');
      px(0, 0, 1, HD, '#464f66');
      px(0, 31, HD, 1, '#141720');
      px(31, 0, 1, HD, '#141720');
      // Subtle terrazzo speckles
      px(4, 5, 1, 1, '#58627a');
      px(26, 7, 1, 1, '#58627a');
      px(6, 26, 1, 1, '#58627a');
      px(25, 25, 1, 1, '#58627a');

      // 5-pointed star polygon
      const drawStar = (outerR: number, innerR: number, fill: string) => {
        ctx.fillStyle = fill;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const angle = -Math.PI / 2 + (i * Math.PI) / 5;
          const r = i % 2 === 0 ? outerR : innerR;
          const x = 16 + Math.cos(angle) * r;
          const y = 16.5 + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.fill();
      };
      drawStar(13.2, 5.5, '#f2c14e'); // Brass rim
      drawStar(11.0, 4.4, '#eb6a7e'); // Iconic coral pink star
      drawStar(4.2, 1.8, '#ffe38a'); // Gold cinema emblem center
      break;
    }

    case 'water': {
      const grad = ctx.createLinearGradient(0, 0, 0, HD);
      grad.addColorStop(0, p.water1);
      grad.addColorStop(0.5, p.water2);
      grad.addColorStop(1, p.waterDeep);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, HD, HD);

      const shift = f4 * 4;
      // Animated shimmering wave crests
      px((3 + shift) % 28, 6, 9, 2, p.waterFoam);
      px((1 + shift) % 28, 8, 12, 2, 'rgba(255,255,255,0.22)');
      px((16 + shift) % 28, 16, 10, 2, p.waterFoam);
      px((14 + shift) % 28, 18, 13, 2, 'rgba(255,255,255,0.2)');
      px((7 + shift) % 28, 26, 8, 2, p.waterFoam);

      if (theme === 'pm') {
        // Warm Seine golden streetlight reflection glint
        px((20 - shift + 32) % 28, 11, 4, 2, 'rgba(255, 224, 130, 0.35)');
      } else if (theme === 'df') {
        // Bright tropical turquoise surf sparkle
        px((10 + shift) % 28, 12, 3, 2, '#ffffff');
      } else if (theme === 'sd') {
        // Neon-cyan & amber noir reflection shimmer on canal water
        px((18 - shift + 32) % 28, 11, 5, 2, 'rgba(76, 228, 245, 0.42)');
        px((6 + shift) % 28, 22, 4, 2, 'rgba(240, 196, 86, 0.35)');
      }
      break;
    }

    case 'bridge': {
      px(0, 0, HD, HD, p.waterDeep);
      if (theme === 'aj') {
        // Sleek steel-and-glass stadium bridge
        px(0, 3, HD, 26, '#8f9db5');
        px(0, 5, HD, 22, '#cfd8e8');
        px(0, 3, HD, 3, '#1c54b8');
        px(0, 26, HD, 3, '#1c54b8');
        px(0, 15, HD, 2, '#ffd242');
        for (let x = 4; x < HD; x += 8) {
          px(x, 6, 1, 20, '#a3b0c7');
        }
      } else if (theme === 'pm') {
        // Ornate Parisian stone & cast-iron Pont des Arts
        px(0, 2, HD, 28, '#cfc5b4');
        px(0, 5, HD, 22, '#dfd6c7');
        px(0, 2, HD, 4, '#2d473d');
        px(0, 26, HD, 4, '#2d473d');
        px(0, 3, HD, 1, '#e0b853');
        px(0, 28, HD, 1, '#e0b853');
        for (let x = 3; x < HD; x += 6) {
          px(x, 6, 1, 20, '#b8ae9c');
        }
      } else if (theme === 'sd') {
        // Noir cast-iron & neon-trimmed canal footbridge
        px(0, 2, HD, 28, '#38465c');
        px(0, 5, HD, 22, '#4c5c75');
        px(0, 2, HD, 3, '#182233');
        px(0, 27, HD, 3, '#182233');
        px(0, 4, HD, 1, '#2ec4d6');
        px(0, 27, HD, 1, '#f0c456');
        for (let x = 4; x < HD; x += 8) {
          px(x, 6, 1, 20, '#2e394d');
        }
      } else {
        // Warm timber boardwalk / canal footbridge
        px(0, 2, HD, 28, '#a67044');
        px(0, 2, HD, 4, '#6b4222');
        px(0, 26, HD, 4, '#6b4222');
        px(0, 6, HD, 2, '#c48d5c');
        for (let x = 0; x < HD; x += 6) {
          px(x, 6, 1, 20, '#784c2a');
          px(x + 2, 8, 2, 16, 'rgba(255,235,200,0.12)');
        }
      }
      break;
    }

    case 'carpet':
    case 'rug': {
      px(0, 0, HD, HD, p.carpetDark);
      px(2, 2, HD - 4, HD - 4, p.carpetMain);
      // Ornate woven gold trim
      px(4, 3, HD - 8, 2, p.trim);
      px(4, HD - 5, HD - 8, 2, p.trim);
      px(3, 4, 2, HD - 8, p.trim);
      px(HD - 5, 4, 2, HD - 8, p.trim);
      // Center subtle diamond motif
      px(14, 12, 4, 8, 'rgba(255,235,165,0.22)');
      px(12, 14, 8, 4, 'rgba(255,235,165,0.22)');
      break;
    }

    case 'tree': {
      drawGroundBase(ctx, p, theme);
      // Soft dappled ground shadow
      ctx.fillStyle = 'rgba(15, 25, 18, 0.30)';
      safeEllipse(ctx, 16, 27, 11, 4);

      if (theme === 'df') {
        // Swaying tropical Rio palm tree with curved ringed trunk, coconuts & arching fronds!
        const sw = f2 === 1 ? 1 : 0;
        // Curved ringed trunk
        px(13, 21, 6, 8, p.trunk);
        px(14, 16, 5, 7, p.trunk);
        px(15, 11, 4, 6, p.trunk);
        px(13, 23, 6, 1, p.trunkDark);
        px(14, 19, 5, 1, p.trunkDark);
        px(15, 15, 4, 1, p.trunkDark);
        // Coconuts cluster
        px(13, 11, 3, 3, '#5c361a');
        px(17, 11, 3, 3, '#4a2912');
        px(15, 12, 3, 3, '#6e4222');
        // Lush arched palm fronds
        ctx.fillStyle = p.treeDark;
        safeEllipse(ctx, 7 + sw, 12, 7, 3);
        safeEllipse(ctx, 25 + sw, 12, 7, 3);
        safeEllipse(ctx, 16 + sw, 14, 9, 3);
        ctx.fillStyle = p.treeMid;
        safeEllipse(ctx, 8 + sw, 9, 8, 3);
        safeEllipse(ctx, 24 + sw, 9, 8, 3);
        safeEllipse(ctx, 16 + sw, 6, 8, 4);
        ctx.fillStyle = p.treeLight;
        safeEllipse(ctx, 11 + sw, 7, 5, 2);
        safeEllipse(ctx, 21 + sw, 7, 5, 2);
        safeEllipse(ctx, 16 + sw, 4, 5, 2);
      } else if (theme === 'jp') {
        // Sculpted Mediterranean cypress / olive tree
        px(13, 21, 6, 8, p.trunk);
        px(13, 21, 2, 8, p.trunkDark);
        ctx.fillStyle = p.treeDark;
        safeEllipse(ctx, 16, 15, 11, 10);
        ctx.fillStyle = p.treeMid;
        safeEllipse(ctx, 15, 13, 9, 9);
        ctx.fillStyle = p.treeLight;
        safeEllipse(ctx, 13, 10, 6, 6);
        ctx.fillStyle = p.treeAccent;
        safeEllipse(ctx, 12, 8, 3, 3);
        // Olive / citrus tiny fruit accents
        px(19, 15, 2, 2, '#f2cc59');
        px(10, 16, 2, 2, '#f2cc59');
      } else if (theme === 'aj') {
        // Architectural Olympic Park tree in stone planter ring
        px(8, 23, 16, 6, '#9ca8bd');
        px(10, 24, 12, 4, '#6b4c35');
        px(14, 18, 4, 8, p.trunk);
        ctx.fillStyle = p.treeDark;
        safeEllipse(ctx, 16, 13, 11, 9);
        ctx.fillStyle = p.treeMid;
        safeEllipse(ctx, 16, 11, 9, 8);
        ctx.fillStyle = p.treeLight;
        safeEllipse(ctx, 13, 8, 6, 5);
        ctx.fillStyle = p.treeAccent;
        safeEllipse(ctx, 12, 6, 3, 2);
      } else if (theme === 'sd') {
        // Nocturnal Tokyo sakura-accented tree
        px(13, 20, 6, 9, p.trunk);
        px(13, 20, 2, 9, p.trunkDark);
        ctx.fillStyle = p.treeDark;
        safeEllipse(ctx, 16, 15, 13, 10);
        ctx.fillStyle = p.treeMid;
        safeEllipse(ctx, 15, 12, 11, 9);
        ctx.fillStyle = p.treeLight;
        safeEllipse(ctx, 13, 9, 7, 6);
        // Delicate cherry-blossom pink clusters
        ctx.fillStyle = p.treeAccent;
        safeEllipse(ctx, 21, 11, 4.5, 3.2);
        safeEllipse(ctx, 10, 14, 3.5, 2.5);
        safeEllipse(ctx, 16, 6, 4, 2.5);
        px(20, 10, 2, 2, '#ffd6e6');
      } else {
        // PM: Lush Parisian Luxembourg chestnut tree with warm autumn gold leaves!
        px(12, 20, 8, 9, p.trunk);
        px(12, 20, 3, 9, p.trunkDark);
        ctx.fillStyle = p.treeDark;
        safeEllipse(ctx, 16, 15, 13, 10);
        ctx.fillStyle = p.treeMid;
        safeEllipse(ctx, 15, 12, 11, 9);
        ctx.fillStyle = p.treeLight;
        safeEllipse(ctx, 13, 9, 7, 6);
        // Warm autumn gold leaf clusters
        ctx.fillStyle = p.treeAccent;
        safeEllipse(ctx, 21, 11, 4, 3);
        safeEllipse(ctx, 10, 14, 3, 2);
        px(16, 5, 4, 3, '#f2ba49');
      }
      break;
    }

    case 'wall_a':
    case 'wall_b': {
      const isA = tile === 'wall_a';
      const base = isA ? p.wallA : p.wallB;
      const shade = isA ? p.wallAShade : p.wallBShade;
      px(0, 0, HD, HD, base);

      if (theme === 'pm') {
        // Haussmann carved limestone ashlar + string-course cornice + wrought iron trim
        px(0, 0, HD, 3, shade);
        px(0, 10, HD, 1, 'rgba(110,95,70,0.22)');
        px(0, 20, HD, 1, 'rgba(110,95,70,0.22)');
        px(15, 0, 1, 10, 'rgba(110,95,70,0.18)');
        px(7, 10, 1, 10, 'rgba(110,95,70,0.18)');
        px(23, 10, 1, 10, 'rgba(110,95,70,0.18)');
        // Stone plinth
        px(0, 27, HD, 5, '#9c9282');
        px(0, 27, HD, 1, '#fff6e3');
        if (!isA) {
          // Theater pilaster + gold cornice accent
          px(2, 3, 4, 24, '#d1b588');
          px(26, 3, 4, 24, '#d1b588');
          px(0, 2, HD, 2, p.trim);
        }
      } else if (theme === 'df') {
        // Art Deco Hollywood stucco or colorful Lapa colonial wall
        px(0, 0, HD, 3, p.trim);
        px(0, 27, HD, 5, shade);
        if (isA) {
          // Art Deco geometric fluted lines
          px(4, 5, 2, 20, shade);
          px(15, 5, 2, 20, shade);
          px(26, 5, 2, 20, shade);
          px(8, 12, 16, 2, p.trim);
        } else {
          // Colorful Rio tiled wainscot
          px(0, 20, HD, 12, '#22879e');
          for (let x = 0; x < HD; x += 8) {
            px(x + 2, 22, 4, 4, '#59d2e0');
            px(x + 4, 26, 4, 4, '#f7c948');
          }
        }
      } else if (theme === 'jp') {
        if (isA) {
          // Warm Parisian patisserie cream stone + dark timber wainscoting
          px(0, 0, HD, 2, shade);
          px(0, 19, HD, 13, '#523424');
          px(0, 18, HD, 2, p.trim);
          px(3, 21, 11, 9, '#694430');
          px(18, 21, 11, 9, '#694430');
        } else {
          // Sleek dark-slate photo gallery facade with crimson safelight strip & B&W print
          px(0, 0, HD, 3, '#c9343b');
          px(0, 27, HD, 5, shade);
          px(6, 7, 20, 16, '#e6e8ed');
          px(8, 9, 16, 12, '#232833');
          px(10, 12, 12, 7, '#a8b2c4');
          px(13, 14, 6, 5, '#4c566b');
        }
      } else if (theme === 'sd') {
        if (isA) {
          // Quai des Orfèvres / French Noir carved warm stone facade with sepia brass trim
          px(0, 0, HD, 3, '#8a5229');
          px(0, 3, HD, 1, p.trim);
          px(0, 11, HD, 1, 'rgba(90, 76, 58, 0.22)');
          px(0, 20, HD, 1, 'rgba(90, 76, 58, 0.22)');
          px(0, 26, HD, 6, '#6e6456');
          px(3, 6, 3, 18, shade);
          px(26, 6, 3, 18, shade);
        } else {
          // Neo-Tokyo Akihabara dark indigo cyber tower with glowing cyan neon rail
          px(0, 0, HD, 3, '#1d7e91');
          px(0, 3, HD, 2, '#5ee6f5');
          px(0, 27, HD, 5, shade);
          px(0, 5, 3, 22, shade);
          px(15, 5, 2, 22, shade);
          px(29, 5, 3, 22, shade);
          px(5, 9, 8, 14, '#15384a');
          px(19, 9, 8, 14, '#15384a');
          px(6, 11, 6, 2, '#4ce4f5');
          px(20, 11, 6, 2, '#f0c456');
        }
      } else {
        // AJ: Modern glass-and-steel stadium facade with LED ribbon!
        px(0, 0, HD, 3, isA ? '#1c54b8' : '#cc352d');
        px(0, 3, HD, 2, p.trim);
        px(0, 27, HD, 5, shade);
        // Steel structural ribs
        px(0, 5, 3, 22, shade);
        px(15, 5, 2, 22, shade);
        px(29, 5, 3, 22, shade);
        // Tinted architectural glass strip
        px(5, 8, 8, 16, isA ? '#6ba7e6' : '#3a5482');
        px(19, 8, 8, 16, isA ? '#6ba7e6' : '#3a5482');
        px(6, 9, 3, 14, 'rgba(255,255,255,0.28)');
        px(20, 9, 3, 14, 'rgba(255,255,255,0.28)');
      }
      break;
    }

    case 'roof_a':
    case 'roof_b': {
      const isA = tile === 'roof_a';
      const base = isA ? p.roofA : p.roofB;
      const light = isA ? p.roofALight : p.roofBLight;

      if (theme === 'jp' && isA) {
        // Signature red-and-cream striped Parisian patisserie awning!
        for (let x = 0; x < HD; x += 8) {
          px(x, 0, 4, HD - 4, base);
          px(x + 4, 0, 4, HD - 4, light);
          // Scalloped bottom valance
          px(x, HD - 5, 4, 4, '#821c27');
          px(x + 4, HD - 5, 4, 4, '#d9ccb4');
        }
        px(0, 0, HD, 3, 'rgba(255,255,255,0.25)');
        px(0, HD - 2, HD, 2, 'rgba(0,0,0,0.32)');
      } else if (theme === 'pm' && isA) {
        // Iconic Parisian zinc mansard slate roof with standing seams & dormer hint
        const grad = ctx.createLinearGradient(0, 0, 0, HD);
        grad.addColorStop(0, light);
        grad.addColorStop(1, '#31425e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, HD, HD);
        for (let x = 4; x < HD; x += 8) {
          px(x, 0, 1, HD, 'rgba(255,255,255,0.22)');
          px(x + 1, 0, 1, HD, 'rgba(0,0,0,0.22)');
        }
        px(0, 0, HD, 3, '#a6bad9');
        px(0, HD - 4, HD, 4, '#243045');
        px(0, HD - 5, HD, 1, p.trim);
      } else if ((theme === 'pm' || theme === 'df') && !isA) {
        // Grand Theatre / Hollywood Cinema marquee roof with twinkling bulbs!
        const grad = ctx.createLinearGradient(0, 0, 0, HD);
        grad.addColorStop(0, light);
        grad.addColorStop(1, base);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, HD, HD);
        px(0, 0, HD, 3, p.trim);
        px(0, HD - 6, HD, 6, '#1f1926');
        px(0, HD - 7, HD, 2, p.trim);
        // Animated marquee lights
        for (let x = 2; x < HD; x += 6) {
          const lit = ((x / 6 + f2) % 2) === 0;
          px(x, HD - 4, 3, 3, lit ? '#fff5b8' : '#d99a32');
        }
      } else if (theme === 'df' && isA) {
        // Sunlit Rio terracotta clay barrel tiles
        px(0, 0, HD, HD, base);
        for (let x = 0; x < HD; x += 8) {
          px(x, 0, 5, HD, light);
          px(x + 5, 0, 3, HD, '#a63a24');
          px(x + 1, 8, 4, 2, 'rgba(0,0,0,0.16)');
          px(x + 1, 18, 4, 2, 'rgba(0,0,0,0.16)');
        }
        px(0, HD - 4, HD, 4, '#7d2817');
      } else if (theme === 'aj') {
        // Sleek curved metallic stadium truss roof
        const grad = ctx.createLinearGradient(0, 0, 0, HD);
        grad.addColorStop(0, light);
        grad.addColorStop(0.7, base);
        grad.addColorStop(1, '#142038');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, HD, HD);
        // Silver metallic roof trusses
        for (let x = 0; x < HD; x += 8) {
          px(x, 0, 2, HD - 4, 'rgba(230,240,255,0.28)');
        }
        px(0, HD - 4, HD, 2, p.trim);
        px(0, HD - 2, HD, 2, '#101829');
      } else if (theme === 'sd') {
        // Neo-Tokyo cyber teal roof (roof_a) & French Noir sepia-copper cinema marquee roof (roof_b)
        const grad = ctx.createLinearGradient(0, 0, 0, HD);
        grad.addColorStop(0, light);
        grad.addColorStop(1, base);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, HD, HD);
        for (let x = 4; x < HD; x += 8) {
          px(x, 0, 1, HD - 5, 'rgba(255,255,255,0.16)');
          px(x + 1, 0, 1, HD - 5, 'rgba(0,0,0,0.22)');
        }
        px(0, HD - 5, HD, 5, '#121b29');
        px(0, HD - 6, HD, 2, isA ? '#4ce4f5' : p.trim);
        for (let x = 3; x < HD; x += 8) {
          const lit = ((Math.floor(x / 8) + f2) % 2) === 0;
          px(x, HD - 3, 3, 2, isA ? (lit ? '#9ef6ff' : '#2ec4d6') : lit ? '#fff0b3' : '#d99a32');
        }
      } else {
        // JP gallery skylight roof
        px(0, 0, HD, HD, base);
        px(3, 4, 11, 20, '#6a89b8');
        px(18, 4, 11, 20, '#6a89b8');
        px(4, 5, 4, 18, '#a3c6f2');
        px(19, 5, 4, 18, '#a3c6f2');
        px(0, HD - 4, HD, 4, '#1b2230');
        px(0, HD - 5, HD, 1, p.trim);
      }
      break;
    }

    case 'window': {
      px(0, 0, HD, HD, p.wallA);
      if (theme === 'pm') {
        // Tall Haussmann French window with warm amber library glow & wrought-iron balcony!
        px(5, 3, 22, 23, '#3b332c');
        px(7, 5, 18, 19, '#ffdf85');
        px(7, 5, 18, 8, '#ffeeb8');
        // Dark muntins
        px(15, 5, 2, 19, '#3b332c');
        px(7, 13, 18, 2, '#3b332c');
        // Wrought-iron Juliette balcony railing
        px(3, 19, 26, 2, '#1d222e');
        px(3, 25, 26, 3, '#c7b89a');
        for (let x = 5; x <= 25; x += 4) {
          px(x, 20, 2, 5, '#1d222e');
        }
      } else if (theme === 'df') {
        // Art Deco sunny teal-shuttered window
        px(2, 4, 5, 21, '#1e8599');
        px(25, 4, 5, 21, '#1e8599');
        px(7, 4, 18, 21, '#26344a');
        px(9, 6, 14, 17, '#79d6f2');
        px(9, 6, 6, 8, '#d4f7ff');
        px(15, 6, 2, 17, '#f7c948');
        px(5, 25, 22, 3, p.trim);
      } else if (theme === 'jp') {
        // Warm patisserie display vitrine with glowing croissants/cakes!
        px(3, 4, 26, 22, '#4a2e1d');
        px(5, 6, 22, 18, '#ffe6a3');
        px(5, 6, 22, 6, '#fff5d4');
        // Pastry silhouettes on display shelf
        px(5, 17, 22, 2, '#8c5a37');
        px(8, 14, 4, 3, '#d9843b');
        px(14, 13, 4, 4, '#f27999');
        px(20, 14, 4, 3, '#e0a943');
        px(2, 26, 28, 3, p.trim);
      } else if (theme === 'sd') {
        // Neo-Tokyo & Noir glowing twin-tone studio window (cyan + warm noir venetian blind glow)
        px(3, 4, 26, 22, '#1b2638');
        px(5, 6, 10, 18, '#55d8eb');
        px(6, 7, 4, 14, '#b8f7ff');
        px(17, 6, 10, 18, '#f0c46c');
        for (let y = 8; y < 22; y += 3) {
          px(17, y, 10, 1, 'rgba(60, 38, 18, 0.35)');
        }
        px(15, 6, 2, 18, '#1b2638');
        px(2, 26, 28, 3, p.trim);
      } else {
        // AJ: Panoramic stadium skybox glass with bright interior glow & diagonal sheen
        px(3, 4, 26, 22, '#1d2c4a');
        px(5, 6, 22, 18, '#5ea8f2');
        px(6, 7, 8, 16, '#a6d8ff');
        px(16, 6, 2, 18, '#1d2c4a');
        px(2, 26, 28, 3, p.trim);
      }
      break;
    }

    case 'door': {
      px(0, 0, HD, HD, p.wallA);
      // Stone arch / frame
      px(4, 2, 24, 30, '#2a201b');
      // Inviting door leaves
      const doorCol =
        theme === 'aj'
          ? '#1c448f'
          : theme === 'df'
            ? '#9e322e'
            : theme === 'jp'
              ? '#633822'
              : theme === 'sd'
                ? '#174659'
                : '#6e2330';
      const doorLit =
        theme === 'aj' ? '#70c2ff' : theme === 'sd' ? '#7ceef7' : '#ffe285';
      px(6, 4, 20, 26, doorCol);
      // Center seam
      px(15, 4, 2, 26, '#2a201b');
      // Glowing glass panes
      px(8, 7, 6, 10, doorLit);
      px(18, 7, 6, 10, doorLit);
      px(9, 8, 2, 5, '#ffffff');
      px(19, 8, 2, 5, '#ffffff');
      // Brass handles
      px(13, 19, 2, 3, p.trim);
      px(17, 19, 2, 3, p.trim);
      // Top transom / lintel trim
      px(4, 1, 24, 3, p.trim);
      // Stone threshold step
      px(3, 29, 26, 3, '#d9d0be');
      break;
    }

    case 'fence': {
      drawGroundBase(ctx, p, theme);
      if (theme === 'pm') {
        // Parisian black wrought-iron park fence with gilded spear tips
        px(0, 12, HD, 2, '#1c222e');
        px(0, 24, HD, 2, '#1c222e');
        for (let x = 3; x < HD; x += 6) {
          px(x, 8, 2, 21, '#262e3d');
          px(x, 5, 2, 3, '#e0b853');
        }
      } else if (theme === 'df') {
        // White & teal Rio promenade balustrade
        px(0, 10, HD, 4, '#f5f2ea');
        px(0, 24, HD, 4, '#d9d3c5');
        for (let x = 3; x < HD; x += 7) {
          px(x, 14, 4, 10, '#f5f2ea');
          px(x + 1, 15, 2, 8, '#28a6bd');
        }
      } else if (theme === 'aj') {
        // Modern stadium perimeter ad-board barrier
        px(0, 9, HD, 18, '#1b4796');
        px(0, 9, HD, 3, '#ffd242');
        px(0, 25, HD, 3, '#102652');
        px(4, 15, 10, 4, '#ffffff');
        px(18, 15, 10, 4, '#ffd242');
      } else if (theme === 'sd') {
        // Sleek Neo-Tokyo & Quai dark-iron railing with cyan neon rail
        px(0, 11, HD, 2, '#1a2433');
        px(0, 10, HD, 1, '#2ec4d6');
        px(0, 24, HD, 2, '#1a2433');
        for (let x = 3; x < HD; x += 6) {
          px(x, 12, 2, 16, '#2e3c52');
        }
      } else {
        // JP warm wooden bistro planter railing
        px(2, 8, 4, 21, '#6e4528');
        px(26, 8, 4, 21, '#6e4528');
        px(0, 12, HD, 3, '#9c673e');
        px(0, 21, HD, 3, '#9c673e');
        // Tiny flower planter on top
        px(8, 9, 16, 4, '#3c8546');
        px(10, 8, 3, 3, '#f26d85');
        px(19, 8, 3, 3, '#ffd959');
      }
      break;
    }

    case 'lamp': {
      px(0, 0, HD, HD, p.path1);
      // Warm ground halo preview baked softly
      ctx.fillStyle = theme === 'sd' ? 'rgba(76, 224, 240, 0.16)' : 'rgba(255, 224, 128, 0.16)';
      safeEllipse(ctx, 16, 26, 12, 5);

      const glowCol = f2 === 0 ? '#ffe787' : '#fff7cc';
      if (theme === 'aj') {
        // Towering Stadium Floodlight Pylon
        px(11, 26, 10, 5, '#47536b');
        px(14, 10, 4, 17, '#7c8ba6');
        px(15, 10, 1, 17, '#c2cee3');
        px(6, 3, 20, 9, '#232c3d');
        px(8, 5, 5, 5, glowCol);
        px(14, 5, 4, 5, '#ffffff');
        px(19, 5, 5, 5, glowCol);
      } else if (theme === 'pm') {
        // Classic dark-green Parisian cast-iron streetlamp
        px(11, 25, 10, 6, '#1f3b31');
        px(14, 11, 4, 15, '#294d40');
        px(10, 4, 12, 8, '#1f3b31');
        px(12, 6, 8, 5, glowCol);
        px(14, 2, 4, 2, '#e0b853');
      } else if (theme === 'sd') {
        // Nocturnal Tokyo-Noir lantern post with glowing cyan/amber bezel
        px(11, 26, 10, 5, '#1b2636');
        px(14, 11, 4, 16, '#2d3d54');
        px(9, 4, 14, 8, '#1b2636');
        px(11, 6, 5, 4, f2 === 0 ? '#5ee6f5' : '#aef8ff');
        px(16, 6, 5, 4, glowCol);
        px(13, 2, 6, 2, '#2ec4d6');
      } else {
        // Art Deco globe / Parisian guinguette amber lamp
        px(12, 26, 8, 5, '#2d3345');
        px(14, 12, 4, 15, '#454e66');
        ctx.fillStyle = glowCol;
        safeEllipse(ctx, 16, 8, 6, 6);
        ctx.fillStyle = '#ffffff';
        safeEllipse(ctx, 14, 6, 2, 2);
      }
      break;
    }

    case 'sign': {
      drawGroundBase(ctx, p, theme);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      safeEllipse(ctx, 16, 28, 8, 3);
      if (theme === 'aj') {
        // Digital LED stadium info kiosk
        px(13, 21, 6, 8, '#3f4b63');
        px(4, 4, 24, 18, '#182238');
        px(6, 6, 20, 14, '#1b4796');
        px(8, 9, 16, 2, '#ffd242');
        px(8, 13, 12, 2, '#ffffff');
        px(8, 16, 14, 2, '#79c2f2');
      } else if (theme === 'pm') {
        // Classic Paris green & gold plaque stand
        px(14, 20, 4, 9, '#234237');
        px(4, 5, 24, 16, '#1e3b30');
        px(6, 7, 20, 12, '#2d5748');
        px(5, 6, 22, 1, '#e0b853');
        px(5, 19, 22, 1, '#e0b853');
        px(8, 10, 16, 2, '#f5ebd8');
        px(10, 14, 12, 2, '#f5ebd8');
      } else if (theme === 'jp') {
        // Parisian slate chalkboard bistro easel
        px(7, 22, 3, 7, '#6e4528');
        px(22, 22, 3, 7, '#6e4528');
        px(5, 5, 22, 18, '#855331');
        px(7, 7, 18, 14, '#242933');
        px(9, 10, 14, 2, '#f5ebd8');
        px(9, 14, 10, 2, '#ffe082');
        px(9, 17, 12, 1, '#f5ebd8');
      } else if (theme === 'sd') {
        // Sleek Neo-Tokyo / Polar neon-cyan & amber dossier kiosk
        px(13, 21, 6, 8, '#26334a');
        px(4, 4, 24, 18, '#131d2b');
        px(5, 5, 22, 16, '#1c2b40');
        px(5, 5, 22, 2, '#2ec4d6');
        px(8, 10, 16, 2, '#f0c456');
        px(8, 14, 13, 2, '#e8e2d5');
        px(8, 18, 10, 1, '#5ee6f5');
      } else {
        // DF Retro Hollywood clapperboard signpost
        px(14, 21, 4, 8, '#5c3b24');
        px(4, 5, 24, 17, '#1d2230');
        px(5, 5, 5, 4, '#ffffff');
        px(14, 5, 5, 4, '#ffffff');
        px(23, 5, 4, 4, '#ffffff');
        px(7, 12, 18, 2, '#f7c948');
        px(7, 16, 13, 2, '#ffffff');
      }
      break;
    }

    case 'fountain': {
      px(0, 0, HD, HD, p.plaza1);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      safeEllipse(ctx, 16, 27, 14, 5);
      // Outer stone basin
      ctx.fillStyle = '#8b95a8';
      safeEllipse(ctx, 16, 19, 14, 10);
      ctx.fillStyle = '#d4dae6';
      safeEllipse(ctx, 16, 17, 14, 9);
      // Shimmering water pool inside
      ctx.fillStyle = p.water1;
      safeEllipse(ctx, 16, 17, 11, 7);
      ctx.fillStyle = p.water2;
      safeEllipse(ctx, 16, 16, 8, 5);
      // Center sculpted tier
      px(13, 9, 6, 10, '#dfe4ed');
      px(11, 12, 10, 3, '#c4ccdb');
      // Animated arcing water jets!
      const jetH = f4 === 0 ? 4 : f4 === 1 ? 3 : f4 === 2 ? 5 : 4;
      px(15, jetH, 2, 9 - jetH + 2, '#e6f7ff');
      px(11 - f2, jetH + 3, 4, 2, p.waterFoam);
      px(17 + f2, jetH + 3, 4, 2, p.waterFoam);
      px(9, 14 + f2, 3, 2, '#ffffff');
      px(20, 14 + f2, 3, 2, '#ffffff');
      break;
    }

    case 'pillar': {
      px(0, 0, HD, HD, p.plaza1);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      safeEllipse(ctx, 16, 29, 10, 3);
      if (theme === 'aj') {
        // Steel & illuminated gold championship pylon
        px(7, 2, 18, 5, '#4c5973');
        px(9, 7, 14, 20, '#cfd8e8');
        px(14, 7, 4, 20, '#ffd242');
        px(7, 26, 18, 5, '#354057');
      } else {
        // Classical fluted marble column with gilded capital
        px(6, 2, 20, 5, '#ded7c8');
        px(7, 3, 18, 2, p.trim);
        px(8, 7, 16, 19, '#f2ece0');
        px(11, 7, 2, 19, '#d1c8b6');
        px(15, 7, 2, 19, '#d1c8b6');
        px(19, 7, 2, 19, '#d1c8b6');
        px(6, 26, 20, 5, '#bfb6a4');
      }
      break;
    }

    case 'statue': {
      px(0, 0, HD, HD, p.plaza1);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      safeEllipse(ctx, 16, 29, 11, 4);
      // Marble / dark plinth
      px(6, 20, 20, 10, '#697285');
      px(8, 21, 16, 7, '#8993a8');
      px(11, 23, 10, 3, p.trim);
      // Gleaming gilded trophy / statue figure
      px(11, 8, 10, 12, '#e8b938');
      px(12, 9, 6, 9, '#ffe278');
      ctx.fillStyle = '#f5c742';
      safeEllipse(ctx, 16, 6, 4, 4);
      px(14, 4, 2, 2, '#fff9d6');
      // Subtle sparkle
      if (f2 === 0) {
        px(22, 4, 2, 6, '#fff8cc');
        px(20, 6, 6, 2, '#fff8cc');
      }
      break;
    }

    case 'gate_closed': {
      px(0, 0, HD, HD, p.path1);
      // Grand wrought-iron & gilded district barrier
      px(0, 0, HD, 6, p.trim);
      px(0, 2, HD, 2, '#fff2b3');
      for (let x = 2; x < HD; x += 6) {
        px(x, 6, 3, 24, '#2a3042');
      }
      // Red velvet barrier ribbon & golden emblem lock
      px(0, 12, HD, 8, '#c92e3b');
      px(0, 13, HD, 2, '#f05966');
      px(10, 10, 12, 12, '#e0b038');
      px(12, 12, 8, 8, '#ffe278');
      px(14, 14, 4, 4, '#5e3914');
      break;
    }

    case 'gate_open': {
      px(0, 0, HD, HD, p.path1);
      // Open ceremonial archway with emerald unlocked beacon!
      px(0, 0, HD, 5, '#42b862');
      px(0, 1, HD, 2, '#96f2aa');
      px(1, 5, 4, 27, p.trim);
      px(27, 5, 4, 27, p.trim);
      px(2, 6, 2, 25, '#fff0ad');
      px(28, 6, 2, 25, '#fff0ad');
      break;
    }

    // ---- RICH INTERIOR TILES ----

    case 'floor_wood': {
      if (theme === 'boss_hall') {
        // Grand royal marble floor with inlaid gold diamond borders
        px(0, 0, HD, HD, '#ebe3d5');
        px(0, 0, HD, 1, '#c7b89e');
        px(0, 0, 1, HD, '#c7b89e');
        px(2, 2, 28, 28, '#f5efe4');
        px(13, 13, 6, 6, '#e0b853');
        px(14, 14, 4, 4, '#8c2235');
      } else {
        const w1 =
          theme === 'theater'
            ? '#8c4e2d'
            : theme === 'samba_club'
              ? '#9e6234'
              : theme === 'manga_studio'
                ? '#455469'
                : theme === 'noir_cinema'
                  ? '#695240'
                  : '#bf8854';
        const w2 =
          theme === 'theater'
            ? '#733c20'
            : theme === 'samba_club'
              ? '#824d25'
              : theme === 'manga_studio'
                ? '#364354'
                : theme === 'noir_cinema'
                  ? '#544031'
                  : '#a36e3e';
        const line =
          theme === 'theater'
            ? '#4f2713'
            : theme === 'manga_studio'
              ? '#242e3b'
              : theme === 'noir_cinema'
                ? '#3b2c21'
                : '#7a502b';
        px(0, 0, HD, HD, w1);
        for (let y = 0; y < HD; y += 8) {
          px(0, y, HD, 1, line);
          px(0, y + 1, HD, 2, 'rgba(255,235,200,0.14)');
          const joint = ((y / 8) * 11 + 5) % HD;
          px(joint, y, 1, 8, line);
          px((joint + 1) % HD, y + 1, 10, 6, w2);
        }
      }
      break;
    }

    case 'floor_tile': {
      const c1 = theme === 'darkroom' ? '#261b22' : '#f2ece1';
      const c2 = theme === 'darkroom' ? '#36212a' : '#d4c9b8';
      px(0, 0, 16, 16, c1);
      px(16, 16, 16, 16, c1);
      px(16, 0, 16, 16, c2);
      px(0, 16, 16, 16, c2);
      px(0, 0, HD, 1, 'rgba(0,0,0,0.14)');
      px(0, 16, HD, 1, 'rgba(0,0,0,0.14)');
      px(0, 0, 1, HD, 'rgba(0,0,0,0.14)');
      px(16, 0, 1, HD, 'rgba(0,0,0,0.14)');
      if (theme === 'darkroom') {
        px(2, 2, 12, 2, 'rgba(220, 48, 65, 0.12)');
      }
      break;
    }

    case 'floor_court': {
      // Polished maple hardwood basketball arena court
      px(0, 0, HD, HD, '#dfa25d');
      for (let y = 0; y < HD; y += 6) {
        px(0, y, HD, 1, '#c48641');
        px(0, y + 1, HD, 2, 'rgba(255,245,220,0.18)');
      }
      // Subtle painted court line sheen
      px(0, 30, HD, 2, '#f5f2ea');
      break;
    }

    case 'floor_turf': {
      // Stadium interior lush mowed football turf
      px(0, 0, 16, HD, '#39a34c');
      px(16, 0, 16, HD, '#44b858');
      px(4, 8, 2, 3, '#68d477');
      px(22, 20, 2, 3, '#68d477');
      break;
    }

    case 'exit_mat': {
      px(
        0,
        0,
        HD,
        HD,
        theme === 'stadium'
          ? '#39a34c'
          : theme === 'court'
            ? '#dfa25d'
            : theme === 'manga_studio'
              ? '#364354'
              : theme === 'noir_cinema'
                ? '#544031'
                : '#a36e3e'
      );
      px(2, 5, 28, 22, '#992632');
      px(4, 7, 24, 18, '#d43f4d');
      px(6, 9, 20, 1, '#ffe078');
      px(6, 22, 20, 1, '#ffe078');
      // Downward exit chevron arrow
      px(11, 14, 10, 2, '#fff5c2');
      px(13, 16, 6, 2, '#fff5c2');
      px(15, 18, 2, 2, '#fff5c2');
      break;
    }

    case 'in_wall': {
      if (theme === 'theater') {
        // Crimson velvet paneling + gilded molding
        px(0, 0, HD, HD, '#6e1c2e');
        px(3, 3, 26, 17, '#87243a');
        px(4, 4, 24, 15, '#6e1c2e');
        px(3, 3, 26, 1, '#e0b853');
        px(0, 22, HD, 2, '#e0b853');
        px(0, 24, HD, 8, '#3d151e');
      } else if (theme === 'salon') {
        // Parisian Haussmann cream-sage boiserie
        px(0, 0, HD, HD, '#d9d3c3');
        px(4, 4, 24, 16, '#ebe5d5');
        px(4, 4, 24, 1, '#b8ae99');
        px(0, 22, HD, 2, '#d4af55');
        px(0, 24, HD, 8, '#7a705f');
      } else if (theme === 'samba_club') {
        // Nocturnal Lapa indigo & neon amber club wall
        px(0, 0, HD, HD, '#26234a');
        px(0, 10, HD, 2, '#f29f38');
        px(0, 22, HD, 2, '#2ec4de');
        px(0, 24, HD, 8, '#17152e');
      } else if (theme === 'cinema_set') {
        // Soundstage acoustic charcoal panels + studio yellow trim
        px(0, 0, HD, HD, '#2d313d');
        for (let x = 2; x < HD; x += 6) {
          px(x, 3, 4, 18, '#3b4052');
        }
        px(0, 22, HD, 3, '#e8b938');
        px(0, 25, HD, 7, '#1a1d26');
      } else if (theme === 'kitchen') {
        // Parisian brigade white subway tiles + copper rail
        px(0, 0, HD, HD, '#edeae4');
        for (let y = 0; y < 22; y += 6) {
          px(0, y, HD, 1, '#c9c4ba');
          for (let x = (y % 12 === 0 ? 0 : 6); x < HD; x += 12) {
            px(x, y, 1, 6, '#c9c4ba');
          }
        }
        px(0, 22, HD, 2, '#c97642');
        px(0, 24, HD, 8, '#545c6b');
      } else if (theme === 'darkroom') {
        // Light-sealed burgundy-black studio wall with crimson safelight strip
        px(0, 0, HD, HD, '#26171e');
        px(0, 8, HD, 3, '#c92638');
        px(0, 9, HD, 1, '#ff707d');
        px(0, 23, HD, 9, '#170d12');
      } else if (theme === 'stadium' || theme === 'court') {
        // Modern arena wall with blue/crimson championship ribbon
        px(0, 0, HD, HD, '#253554');
        px(0, 12, HD, 4, theme === 'stadium' ? '#1c54b8' : '#cc352d');
        px(0, 16, HD, 2, '#ffd242');
        px(0, 24, HD, 8, '#152036');
      } else if (theme === 'manga_studio') {
        // Sleek Neo-Tokyo manga & animation studio wall with glowing cyan neon rail
        px(0, 0, HD, HD, '#1f2e42');
        px(4, 3, 24, 15, '#293d57');
        px(6, 5, 9, 11, '#d9eef7');
        px(17, 5, 9, 11, '#f2e8d5');
        px(0, 21, HD, 2, '#2ec4d6');
        px(0, 23, HD, 9, '#131d2b');
      } else if (theme === 'noir_cinema') {
        // Classic French polar & art-house cinema charcoal-sepia paneling with brass strip
        px(0, 0, HD, HD, '#2b2421');
        px(3, 3, 26, 17, '#3d332e');
        px(5, 5, 22, 13, '#2b2421');
        px(0, 22, HD, 2, '#d9a452');
        px(0, 24, HD, 8, '#1a1513');
      } else {
        // boss_hall: Palatial gilded crimson-purple marble wall
        px(0, 0, HD, HD, '#54233b');
        px(4, 3, 24, 18, '#6b2e4c');
        px(4, 3, 24, 2, '#f0c44d');
        px(0, 22, HD, 2, '#f0c44d');
        px(0, 24, HD, 8, '#2b1220');
      }
      break;
    }

    case 'bookshelf': {
      px(0, 0, HD, HD, '#5c3820');
      px(2, 3, 28, 11, '#26150b');
      px(2, 17, 28, 11, '#26150b');
      const topBooks = [
        { x: 3, w: 4, c: '#c93838' },
        { x: 7, w: 3, c: '#3c78b8' },
        { x: 10, w: 5, c: '#d99e32' },
        { x: 15, w: 3, c: '#419457' },
        { x: 18, w: 4, c: '#8f47b8' },
        { x: 22, w: 4, c: '#c95c38' },
        { x: 26, w: 3, c: '#2e5c8a' },
      ];
      for (const b of topBooks) {
        px(b.x, 4, b.w, 10, b.c);
        px(b.x, 6, b.w, 1, '#ffe28a');
      }
      const botBooks = [
        { x: 3, w: 5, c: '#2e6b54' },
        { x: 8, w: 4, c: '#b8324b' },
        { x: 12, w: 3, c: '#e0b853' },
        { x: 15, w: 5, c: '#385d96' },
        { x: 20, w: 4, c: '#9e532b' },
        { x: 24, w: 5, c: '#6e325e' },
      ];
      for (const b of botBooks) {
        px(b.x, 18, b.w, 10, b.c);
        px(b.x, 21, b.w, 1, 'rgba(255,255,255,0.35)');
      }
      px(0, 14, HD, 3, '#7a4d2c');
      px(0, 28, HD, 4, '#472a16');
      break;
    }

    case 'stage': {
      // Rich crimson velvet theater stage edge with glowing brass footlights
      px(0, 0, HD, HD, '#7a1f30');
      px(0, 0, HD, 5, '#e0b243');
      px(0, 1, HD, 2, '#fff0ad');
      px(0, 25, HD, 7, '#4a101b');
      // Glowing stage footlight shells
      const lit = f2 === 0 ? '#fff0a6' : '#ffd257';
      px(5, 22, 6, 4, '#d4a135');
      px(6, 23, 4, 2, lit);
      px(21, 22, 6, 4, '#d4a135');
      px(22, 23, 4, 2, lit);
      break;
    }

    case 'counter': {
      px(0, 0, HD, HD, theme === 'darkroom' ? '#2e2228' : '#855535');
      if (theme === 'darkroom') {
        // Darkroom chemical trays
        px(0, 3, HD, 22, '#40343d');
        px(3, 7, 11, 12, '#e6e8ed');
        px(5, 9, 7, 8, '#c93848');
        px(18, 7, 11, 12, '#e6e8ed');
        px(20, 9, 7, 8, '#5ea8d9');
      } else {
        // Chef's marble & oak counter with gleaming cloche / pastry plate!
        px(0, 3, HD, 20, '#ebe5d8');
        px(0, 3, HD, 3, '#ffffff');
        px(0, 23, HD, 9, '#694126');
        // Silver cloche & pastry
        ctx.fillStyle = '#cfd8e8';
        safeEllipse(ctx, 10, 13, 6, 5);
        px(9, 7, 2, 2, '#ffd242');
        px(20, 10, 8, 8, '#ffffff');
        px(22, 12, 4, 4, '#e05368');
      }
      break;
    }

    case 'table': {
      px(0, 0, HD, HD, theme === 'kitchen' || theme === 'darkroom' ? '#d4c9b8' : '#a36e3e');
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      safeEllipse(ctx, 16, 28, 12, 3);
      // Table legs
      px(6, 22, 3, 7, '#5c3b22');
      px(23, 22, 3, 7, '#5c3b22');
      // Cloth & centerpiece
      px(4, 4, 24, 19, '#f7f1e3');
      px(4, 20, 24, 3, '#dfd5c3');
      px(11, 8, 10, 9, theme === 'samba_club' ? '#e88b35' : '#c93848');
      // Glowing candle / floral centerpiece
      px(15, 7, 2, 5, '#fff5d1');
      px(15, 5, 2, 2, f2 === 0 ? '#ffe066' : '#ff9933');
      break;
    }

    case 'equipment': {
      px(0, 0, HD, HD, '#32384a');
      px(3, 3, 26, 24, '#1e2230');
      if (theme === 'darkroom') {
        // Photo enlarger & red indicator LED
        px(7, 6, 18, 12, '#454e66');
        px(10, 8, 12, 8, '#c92638');
        px(12, 10, 8, 4, '#ff7885');
        px(6, 21, 20, 4, '#d9dee8');
      } else if (theme === 'kitchen') {
        // Professional French stove burners
        px(5, 5, 22, 20, '#cfd6e3');
        ctx.fillStyle = '#262b38';
        safeEllipse(ctx, 11, 11, 4, 4);
        safeEllipse(ctx, 21, 11, 4, 4);
        safeEllipse(ctx, 11, 20, 4, 4);
        safeEllipse(ctx, 21, 20, 4, 4);
        px(10, 10, 2, 2, '#ff7b38');
        px(20, 19, 2, 2, '#ff7b38');
      } else {
        // Studio monitor / mixing console / cinema rig
        px(5, 5, 22, 12, '#62b6f2');
        px(7, 7, 9, 5, '#b8e3ff');
        px(6, 20, 5, 4, '#f4c542');
        px(14, 20, 5, 4, '#57d978');
        px(22, 20, 4, 4, '#ff5964');
      }
      break;
    }

    case 'hoop_prop': {
      px(0, 0, HD, HD, '#dfa25d');
      // Arena basketball hoop with glass backboard, red square & orange rim + net
      px(14, 18, 4, 12, '#454e66');
      px(5, 2, 22, 14, '#e6f0ff');
      px(7, 4, 18, 10, '#a3c8eb');
      px(11, 7, 10, 7, '#d93b3b');
      px(12, 8, 8, 5, '#b8d7f5');
      // Orange rim & crisp white net
      px(10, 15, 12, 3, '#eb5b26');
      px(11, 18, 10, 7, '#f2f5fa');
      px(13, 18, 2, 7, '#c2cee3');
      px(17, 18, 2, 7, '#c2cee3');
      break;
    }

    case 'goal_prop': {
      px(0, 0, HD, HD, '#39a34c');
      // Crisp 3D soccer goal with taut white netting
      px(2, 3, 28, 24, '#f2f6fc');
      px(5, 6, 22, 21, '#297a3a');
      for (let x = 7; x < 26; x += 4) {
        px(x, 6, 1, 21, 'rgba(235,245,255,0.75)');
      }
      for (let y = 9; y < 26; y += 4) {
        px(5, y, 22, 1, 'rgba(235,245,255,0.65)');
      }
      break;
    }

    case 'plant': {
      px(0, 0, HD, HD, theme === 'court' ? '#dfa25d' : theme === 'stadium' ? '#39a34c' : '#a36e3e');
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      safeEllipse(ctx, 16, 28, 8, 3);
      // Terracotta pot with rim
      px(10, 19, 12, 10, '#c4603b');
      px(9, 18, 14, 3, '#db744d');
      px(10, 21, 12, 2, '#994324');
      // Lush leafy plant
      ctx.fillStyle = '#256b38';
      safeEllipse(ctx, 16, 12, 10, 7);
      ctx.fillStyle = '#3da353';
      safeEllipse(ctx, 15, 10, 8, 6);
      ctx.fillStyle = '#6ad474';
      safeEllipse(ctx, 13, 7, 5, 4);
      break;
    }

    case 'spotlight': {
      px(0, 0, HD, HD, '#1f2333');
      px(14, 18, 4, 12, '#7c86a1');
      px(10, 27, 12, 3, '#4f5770');
      // Studio lamp housing
      px(7, 4, 18, 14, '#141724');
      px(9, 6, 14, 10, f2 === 0 ? '#ffe778' : '#fff8cf');
      px(11, 8, 6, 4, '#ffffff');
      break;
    }

    default: {
      px(0, 0, HD, HD, '#ff00ff');
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
  const f = animFrame % 4;
  const key = `${theme}:${tile}:${f}`;
  let cached = tileCache.get(key);
  if (!cached) {
    cached = renderTileToCanvas(tile, theme, f);
    tileCache.set(key, cached);
  }
  ctx.drawImage(cached, dx, dy, TILE_SIZE, TILE_SIZE);
}
