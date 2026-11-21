import {
  BuildingMeta,
  Direction,
  DistrictGate,
  DistrictMeta,
  InteriorTheme,
  MapData,
  ModeId,
  NpcEntity,
  SignPost,
  TileType,
  Warp,
  WorldTheme,
} from '../types';

export interface LandmarkInput {
  id: string;
  name: string;
  district: 1 | 2 | 3 | 4;
  slotIndex: 0 | 1 | 2 | 3 | 'boss';
  interiorTheme: InteriorTheme;
  character: NpcEntity;
  signSubtitle?: string;
}

const SLOT_COORDS: Record<1 | 2 | 3, { x: number; y: number }[]> = {
  1: [
    { x: 6, y: 34 },
    { x: 17, y: 34 },
    { x: 38, y: 34 },
    { x: 49, y: 34 },
  ],
  2: [
    { x: 6, y: 23 },
    { x: 17, y: 23 },
    { x: 38, y: 23 },
    { x: 49, y: 23 },
  ],
  3: [
    { x: 6, y: 12 },
    { x: 17, y: 12 },
    { x: 38, y: 12 },
    { x: 49, y: 12 },
  ],
};

export const SECONDARY_COORDS: Record<1 | 2 | 3, { x: number; y: number }[]> = {
  1: [
    { x: 12, y: 40 },
    { x: 23, y: 40 },
    { x: 37, y: 40 },
    { x: 46, y: 40 },
  ],
  2: [
    { x: 12, y: 29 },
    { x: 23, y: 29 },
    { x: 37, y: 29 },
    { x: 46, y: 29 },
  ],
  3: [
    { x: 12, y: 18 },
    { x: 23, y: 18 },
    { x: 37, y: 18 },
    { x: 46, y: 18 },
  ],
};

export const CAMEO_COORDS: Record<1 | 2 | 3, { x: number; y: number }> = {
  1: { x: 33, y: 36 },
  2: { x: 24, y: 25 },
  3: { x: 33, y: 14 },
};

export class WorldMapBuilder {
  readonly width = 60;
  readonly height = 44;
  readonly overworldId: string;
  readonly tiles: TileType[][];
  readonly warps: Warp[] = [];
  readonly signs: SignPost[] = [];
  readonly maps: Record<string, MapData> = {};
  readonly buildings: BuildingMeta[] = [];
  readonly npcs: NpcEntity[] = [];
  readonly gates: DistrictGate[] = [];

  constructor(
    readonly modeId: ModeId,
    readonly worldName: string,
    readonly theme: WorldTheme,
    readonly districts: DistrictMeta[]
  ) {
    this.overworldId = `${modeId}_overworld`;
    this.tiles = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, (): TileType => 'grass')
    );
    this.paintBaseLayout();
  }

  private setTile(x: number, y: number, tile: TileType): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.tiles[y][x] = tile;
    }
  }

  private fillRect(x: number, y: number, w: number, h: number, tile: TileType): void {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        this.setTile(xx, yy, tile);
      }
    }
  }

  private paintBaseLayout(): void {
    // 1. Base ground variations per theme
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const hash = (x * 7 + y * 13) % 9;
        if (this.theme === 'df' && y >= 11 && (x <= 5 || x >= 54)) {
          this.setTile(x, y, 'sand');
        } else if (hash === 0 || (this.theme === 'jp' && hash === 4)) {
          this.setTile(x, y, 'grass_flower');
        } else {
          this.setTile(x, y, 'grass');
        }
      }
    }

    // 2. Outer perimeter borders
    this.fillRect(0, 0, this.width, 2, 'tree');
    this.fillRect(0, this.height - 2, this.width, 2, 'tree');
    this.fillRect(0, 0, 2, this.height, 'tree');
    this.fillRect(this.width - 2, 0, 2, this.height, 'tree');

    // 3. Thematic West & East Scenic Flanks (x=2..4 and x=55..57, strictly outside building/NPC lanes!)
    this.paintThematicFlanks();

    // 4. Central North-South Grand Avenue (x=29..30)
    this.fillRect(29, 8, 2, 33, this.theme === 'df' ? 'plaza' : 'path');

    // 5. Horizontal Promenades in each district
    // District 1 promenade y=38..39
    this.fillRect(5, 38, 50, 2, this.theme === 'df' ? 'plaza' : 'path');
    // District 2 promenade y=27..28
    this.fillRect(
      5,
      27,
      50,
      2,
      this.theme === 'df' ? 'star_tile' : this.theme === 'aj' ? 'plaza' : 'path'
    );
    // District 3 promenade y=16..17
    this.fillRect(5, 16, 50, 2, 'plaza');

    // 6. Scenic starting plaza & welcome carpet
    this.fillRect(26, 37, 8, 4, 'plaza');
    this.fillRect(28, 38, 4, 3, 'carpet');
    this.setTile(26, 37, 'lamp');
    this.setTile(33, 37, 'lamp');

    // 7. Central District Feature Plazas (avoiding cameo coords: D1 (33,36), D2 (24,25), D3 (33,14))
    this.fillRect(23, 35, 5, 3, 'plaza');
    this.setTile(25, 36, 'fountain');
    this.setTile(23, 35, 'grass_flower');
    this.setTile(27, 35, 'grass_flower');

    this.fillRect(32, 24, 5, 3, this.theme === 'df' ? 'star_tile' : 'plaza');
    this.setTile(34, 25, 'statue');
    this.setTile(32, 24, 'lamp');
    this.setTile(36, 24, 'lamp');

    this.fillRect(23, 13, 5, 3, 'plaza');
    this.setTile(25, 14, 'fountain');
    this.setTile(23, 13, 'lamp');
    this.setTile(27, 13, 'lamp');

    // 8. Lush Mini-Landmark Courtyards between building pairs (x=12..15 & x=44..47 in each district)
    this.paintCourtyards();

    // 9. Southern border strip (y=41) & North-of-river park strips (y=31, y=20) — never blocking y=40, 29, 18 or x=27..32!
    this.paintParkStrips();

    // 10. Decorative streetlamps / floodlights along the Grand Avenue
    for (const ly of [39, 34, 28, 23, 17, 12]) {
      this.setTile(28, ly, 'lamp');
      this.setTile(31, ly, 'lamp');
    }

    // 11. District 4 Monumental Sanctuary Plaza & Flanking Reflecting Gardens (y = 2..9)
    this.paintSanctuary();

    // 12. District Divider Rows (y = 32, y = 21, y = 10) painted LAST so barriers stay 100% airtight
    if (this.theme === 'df') {
      this.paintDividerRow(32, 'water', 'tree');
      this.paintDividerRow(21, 'water', 'tree');
      this.paintDividerRow(10, 'wall_b', 'pillar');
    } else if (this.theme === 'aj') {
      this.paintDividerRow(32, 'water', 'fence');
      this.paintDividerRow(21, 'water', 'lamp');
      this.paintDividerRow(10, 'wall_b', 'pillar');
    } else {
      this.paintDividerRow(32, 'water', 'fence');
      this.paintDividerRow(21, 'water', 'tree');
      this.paintDividerRow(10, 'wall_b', 'pillar');
    }
  }

  private paintThematicFlanks(): void {
    for (let y = 11; y <= 41; y++) {
      if (y === 21 || y === 32) continue;

      if (this.theme === 'df') {
        // Sparkling turquoise Atlantic surf on outer edge + golden Copacabana beach with palms
        this.setTile(2, y, 'water');
        this.setTile(57, y, 'water');
        if (y % 5 === 0) {
          this.setTile(4, y, 'tree');
          this.setTile(55, y, 'tree');
        } else if (y % 5 === 2) {
          this.setTile(3, y, 'grass_flower');
          this.setTile(56, y, 'grass_flower');
        }
      } else if (this.theme === 'pm') {
        // Seine riverside canals + cobbled quays + Parisian lamps & autumn trees
        this.setTile(2, y, 'water');
        this.setTile(57, y, 'water');
        this.setTile(3, y, 'path');
        this.setTile(56, y, 'path');
        if (y % 6 === 0) {
          this.setTile(4, y, 'lamp');
          this.setTile(55, y, 'lamp');
        } else if (y % 6 === 3) {
          this.setTile(4, y, 'tree');
          this.setTile(55, y, 'tree');
        }
      } else if (this.theme === 'jp') {
        // Provençal herb/lavender gardens + cozy stone alcoves & olive trees
        this.setTile(2, y, y % 3 === 0 ? 'tree' : 'grass_flower');
        this.setTile(57, y, y % 3 === 0 ? 'tree' : 'grass_flower');
        this.setTile(3, y, y % 4 === 0 ? 'lamp' : 'plaza');
        this.setTile(56, y, y % 4 === 0 ? 'lamp' : 'plaza');
      } else {
        // AJ: Olympic park turf + painted streetball plazas + towering stadium floodlights
        this.setTile(2, y, y % 5 === 0 ? 'lamp' : 'fence');
        this.setTile(57, y, y % 5 === 0 ? 'lamp' : 'fence');
        this.setTile(3, y, 'plaza');
        this.setTile(56, y, 'plaza');
        if (y % 6 === 2) {
          this.setTile(4, y, 'tree');
          this.setTile(55, y, 'tree');
        }
      }
    }
  }

  private paintCourtyards(): void {
    const districts: { by: number; district: 1 | 2 | 3 }[] = [
      { by: 34, district: 1 },
      { by: 23, district: 2 },
      { by: 12, district: 3 },
    ];

    for (const { by, district } of districts) {
      for (const cx of [12, 44]) {
        const floorTile: TileType =
          this.theme === 'df' && district === 1
            ? 'sand'
            : this.theme === 'df' && district === 2
              ? 'star_tile'
              : 'plaza';

        this.fillRect(cx, by, 4, 4, floorTile);

        // Centerpiece landmark in courtyard (leaving south row by+3 & outer edges walkable)
        const isLeft = cx === 12;
        if (this.theme === 'df' && district === 1) {
          this.setTile(cx + 1, by + 1, 'tree'); // Palm oasis
          this.setTile(cx + 2, by + 1, 'fountain');
        } else if (this.theme === 'aj') {
          this.setTile(cx + 1, by + 1, isLeft ? 'statue' : 'fountain');
          this.setTile(cx + 2, by, 'lamp');
        } else {
          this.setTile(cx + 1, by + 1, (district + (isLeft ? 0 : 1)) % 2 === 0 ? 'fountain' : 'statue');
          this.setTile(cx + 2, by, 'lamp');
        }

        this.setTile(cx, by, 'grass_flower');
        this.setTile(cx + 3, by, 'grass_flower');
      }
    }
  }

  private paintParkStrips(): void {
    // Southern decorative border strip at y=41 (strictly south of y=40 where secondaries & follower stand)
    for (let x = 5; x <= 54; x++) {
      if (x >= 27 && x <= 32) {
        this.setTile(x, 41, 'grass_flower');
        continue;
      }
      if (this.theme === 'df') {
        this.setTile(x, 41, x % 6 === 0 ? 'tree' : x % 2 === 0 ? 'sand' : 'grass_flower');
      } else if (x % 7 === 0) {
        this.setTile(x, 41, 'lamp');
      } else if (x % 7 === 3) {
        this.setTile(x, 41, 'fence');
      } else if (x % 2 === 0) {
        this.setTile(x, 41, 'grass_flower');
      }
    }

    // Lush riverbank strips north of dividers at y=31 and y=20 (leaving central avenue x=27..32 clear)
    for (const py of [31, 20]) {
      for (let x = 5; x <= 54; x++) {
        if (x >= 27 && x <= 32) continue;
        if (x % 8 === 0) {
          this.setTile(x, py, 'lamp');
        } else if (x % 8 === 4) {
          this.setTile(x, py, this.theme === 'aj' ? 'fence' : 'tree');
        } else if (x % 2 === 0) {
          this.setTile(x, py, 'grass_flower');
        }
      }
    }
  }

  private paintSanctuary(): void {
    // Grand central Sanctuary Plaza (x=21..38, y=3..9)
    this.fillRect(21, 3, 18, 7, 'plaza');
    this.fillRect(29, 8, 2, 2, 'carpet');
    this.setTile(23, 5, 'pillar');
    this.setTile(23, 8, 'pillar');
    this.setTile(36, 5, 'pillar');
    this.setTile(36, 8, 'pillar');
    this.setTile(25, 8, 'statue');
    this.setTile(34, 8, 'statue');
    this.setTile(21, 3, 'lamp');
    this.setTile(38, 3, 'lamp');
    this.setTile(21, 9, 'lamp');
    this.setTile(38, 9, 'lamp');

    // Symmetrical Sanctuary Reflecting Gardens on West (x=4..19) & East (x=40..55)
    const wings = [
      { x0: 4, poolX: 7, bridgeX: 11 },
      { x0: 40, poolX: 43, bridgeX: 47 },
    ];
    for (const w of wings) {
      this.fillRect(w.x0, 3, 16, 6, 'plaza');
      this.fillRect(w.poolX, 4, 10, 4, 'water');
      // Scenic bridge crossing the reflecting pool
      this.fillRect(w.bridgeX, 4, 2, 4, 'bridge');
      // Corner lanterns, pillars & flowers
      this.setTile(w.x0 + 1, 3, 'lamp');
      this.setTile(w.x0 + 14, 3, 'lamp');
      this.setTile(w.x0 + 1, 8, 'statue');
      this.setTile(w.x0 + 14, 8, 'pillar');
      this.setTile(w.x0, 5, 'grass_flower');
      this.setTile(w.x0, 6, 'grass_flower');
      this.setTile(w.x0 + 15, 5, 'grass_flower');
      this.setTile(w.x0 + 15, 6, 'grass_flower');
    }
  }

  private paintDividerRow(y: number, mainBarrier: TileType, accentBarrier: TileType): void {
    for (let x = 2; x < this.width - 2; x++) {
      if (x === 29 || x === 30) {
        this.setTile(x, y, 'gate_closed');
      } else if (x === 28 || x === 31) {
        this.setTile(x, y, accentBarrier);
      } else {
        this.setTile(x, y, x % 5 === 0 ? accentBarrier : mainBarrier);
      }
    }
  }

  addGate(
    id: string,
    districtLabel: string,
    requiredBadges: number,
    gateY: number,
    gatekeeper: NpcEntity
  ): void {
    this.gates.push({
      id,
      districtLabel,
      requiredBadges,
      tiles: [
        { x: 29, y: gateY },
        { x: 30, y: gateY },
      ],
      gatekeeperNpcId: gatekeeper.id,
    });
    this.npcs.push(gatekeeper);
  }

  placeLandmark(input: LandmarkInput): void {
    const isBoss = input.slotIndex === 'boss';
    const w = isBoss ? 7 : 5;
    const h = isBoss ? 5 : 4;
    const pos = isBoss
      ? { x: 27, y: 3 }
      : SLOT_COORDS[input.district as 1 | 2 | 3][input.slotIndex as 0 | 1 | 2 | 3];

    const bx = pos.x;
    const by = pos.y;
    const roofTile: TileType = isBoss || input.slotIndex === 1 || input.slotIndex === 3 ? 'roof_b' : 'roof_a';
    const wallTile: TileType = isBoss || input.slotIndex === 2 ? 'wall_b' : 'wall_a';

    // Draw building facade
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        if (yy < (isBoss ? 2 : 1)) {
          this.setTile(bx + xx, by + yy, roofTile);
        } else if (yy === h - 1 && xx === Math.floor(w / 2)) {
          this.setTile(bx + xx, by + yy, 'door');
        } else if (yy === h - 2 && (xx === 1 || xx === w - 2)) {
          this.setTile(bx + xx, by + yy, 'window');
        } else {
          this.setTile(bx + xx, by + yy, wallTile);
        }
      }
    }

    const doorX = bx + Math.floor(w / 2);
    const doorY = by + h - 1;

    // Ensure clean inviting welcome strip directly south of door connecting to promenade
    this.setTile(doorX, doorY + 1, isBoss || this.theme === 'aj' ? 'carpet' : 'path');
    if (!isBoss) {
      // Place signpost beside building front left corner (on promenade row, leaving door & row below clear!)
      this.setTile(bx, doorY + 1, 'sign');
      this.signs.push({
        x: bx,
        y: doorY + 1,
        title: input.name,
        subtitle: input.signSubtitle ?? `Défi : ${input.character.name}`,
      });
    } else {
      this.setTile(bx - 1, doorY + 1, 'sign');
      this.signs.push({
        x: bx - 1,
        y: doorY + 1,
        title: input.name,
        subtitle: `Boss Final : ${input.character.name}`,
      });
    }

    // Create interior map (15x12)
    const interiorId = `${this.modeId}_in_${input.id}`;
    const interior = this.buildInteriorMap(
      interiorId,
      input.name,
      input.interiorTheme,
      doorX,
      doorY
    );
    this.maps[interiorId] = interior;

    // Door warp -> interior (7, 9) facing up
    this.warps.push({
      x: doorX,
      y: doorY,
      targetMapId: interiorId,
      targetX: 7,
      targetY: 9,
      targetDir: 'up',
    });

    // Place character inside interior at (7, 4) facing down
    const charNpc: NpcEntity = {
      ...input.character,
      mapId: interiorId,
      x: 7,
      y: 4,
      dir: 'down',
    };
    this.npcs.push(charNpc);

    this.buildings.push({
      id: input.id,
      name: input.name,
      district: input.district,
      doorX,
      doorY,
      interiorMapId: interiorId,
      characterId: charNpc.id,
      badgeId: charNpc.badgeId ?? '',
      isBoss,
    });
  }

  private buildInteriorMap(
    id: string,
    name: string,
    theme: InteriorTheme,
    exitX: number,
    exitY: number
  ): MapData {
    const w = 15;
    const h = 12;
    const floorTile: TileType =
      theme === 'court'
        ? 'floor_court'
        : theme === 'stadium'
          ? 'floor_turf'
          : theme === 'darkroom' || theme === 'kitchen'
            ? 'floor_tile'
            : 'floor_wood';

    const tiles: TileType[][] = Array.from({ length: h }, (_, y) =>
      Array.from({ length: w }, (__, x): TileType => {
        if (y === 0 || y === 1 || x === 0 || x === w - 1 || y === h - 1) {
          return 'in_wall';
        }
        return floorTile;
      })
    );

    // Plush ceremonial runner toward challenger
    for (let y = 4; y <= 9; y++) {
      tiles[y][7] = 'rug';
    }
    tiles[10][7] = 'exit_mat';

    // Rich theme-specific interior props along back & side aisles (strictly keeping x=6..8, y=4..10 clear!)
    if (theme === 'salon' || theme === 'theater') {
      tiles[2][1] = 'bookshelf';
      tiles[2][2] = 'bookshelf';
      tiles[2][3] = 'bookshelf';
      tiles[2][11] = 'bookshelf';
      tiles[2][12] = 'bookshelf';
      tiles[2][13] = 'bookshelf';
      tiles[2][5] = 'spotlight';
      tiles[2][9] = 'spotlight';
      tiles[5][1] = 'plant';
      tiles[5][13] = 'plant';
      tiles[8][2] = 'table';
      tiles[8][12] = 'table';
      tiles[10][2] = 'plant';
      tiles[10][12] = 'plant';
      if (theme === 'theater') {
        tiles[3][5] = 'stage';
        tiles[3][6] = 'stage';
        tiles[3][7] = 'stage';
        tiles[3][8] = 'stage';
        tiles[3][9] = 'stage';
        tiles[4][4] = 'spotlight';
        tiles[4][10] = 'spotlight';
      } else {
        tiles[3][6] = 'rug';
        tiles[3][7] = 'rug';
        tiles[3][8] = 'rug';
        tiles[5][3] = 'table';
        tiles[5][11] = 'table';
      }
    } else if (theme === 'samba_club' || theme === 'cinema_set') {
      tiles[2][2] = 'spotlight';
      tiles[2][12] = 'spotlight';
      tiles[2][4] = 'equipment';
      tiles[2][5] = 'equipment';
      tiles[2][9] = 'equipment';
      tiles[2][10] = 'equipment';
      tiles[5][2] = 'table';
      tiles[5][12] = 'table';
      tiles[7][2] = 'table';
      tiles[7][12] = 'table';
      tiles[9][1] = 'plant';
      tiles[9][13] = 'plant';
      tiles[3][1] = 'plant';
      tiles[3][13] = 'plant';
    } else if (theme === 'kitchen' || theme === 'darkroom') {
      tiles[2][1] = 'counter';
      tiles[2][2] = 'counter';
      tiles[2][3] = 'counter';
      tiles[2][11] = 'counter';
      tiles[2][12] = 'counter';
      tiles[2][13] = 'counter';
      tiles[2][5] = 'equipment';
      tiles[2][9] = 'equipment';
      tiles[5][2] = 'counter';
      tiles[5][12] = 'counter';
      tiles[7][2] = 'table';
      tiles[7][12] = 'table';
      tiles[9][1] = 'plant';
      tiles[9][13] = 'plant';
    } else if (theme === 'court') {
      tiles[2][6] = 'hoop_prop';
      tiles[2][8] = 'hoop_prop';
      tiles[2][2] = 'spotlight';
      tiles[2][12] = 'spotlight';
      tiles[2][4] = 'equipment';
      tiles[2][10] = 'equipment';
      tiles[5][1] = 'pillar';
      tiles[5][13] = 'pillar';
      tiles[8][2] = 'plant';
      tiles[8][12] = 'plant';
    } else if (theme === 'stadium') {
      tiles[2][6] = 'goal_prop';
      tiles[2][7] = 'goal_prop';
      tiles[2][8] = 'goal_prop';
      tiles[2][2] = 'spotlight';
      tiles[2][12] = 'spotlight';
      tiles[2][4] = 'pillar';
      tiles[2][10] = 'pillar';
      tiles[6][1] = 'spotlight';
      tiles[6][13] = 'spotlight';
      tiles[9][2] = 'statue';
      tiles[9][12] = 'statue';
    } else if (theme === 'boss_hall') {
      tiles[2][2] = 'pillar';
      tiles[2][12] = 'pillar';
      tiles[2][4] = 'spotlight';
      tiles[2][10] = 'spotlight';
      tiles[2][6] = 'statue';
      tiles[2][8] = 'statue';
      tiles[5][2] = 'pillar';
      tiles[5][12] = 'pillar';
      tiles[7][2] = 'pillar';
      tiles[7][12] = 'pillar';
      tiles[9][3] = 'statue';
      tiles[9][11] = 'statue';
      tiles[4][6] = 'rug';
      tiles[4][8] = 'rug';
      tiles[5][6] = 'rug';
      tiles[5][8] = 'rug';
    }

    return {
      id,
      name,
      isInterior: true,
      theme,
      width: w,
      height: h,
      tiles,
      warps: [
        {
          x: 7,
          y: 10,
          targetMapId: this.overworldId,
          targetX: exitX,
          targetY: exitY + 1,
          targetDir: 'down' as Direction,
        },
      ],
      signs: [],
    };
  }

  addNpc(npc: NpcEntity): void {
    this.npcs.push(npc);
  }

  buildOverworldMap(): MapData {
    const overworld: MapData = {
      id: this.overworldId,
      name: this.worldName,
      isInterior: false,
      theme: this.theme,
      width: this.width,
      height: this.height,
      tiles: this.tiles,
      warps: this.warps,
      signs: this.signs,
    };
    this.maps[this.overworldId] = overworld;
    return overworld;
  }
}
