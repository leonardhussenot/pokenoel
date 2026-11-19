import { FAMILY_PAIRS, MODE_ORDER } from '../data/familyAvatars';
import { drawBadgeIcon, drawOverworldSprite, drawPortrait } from './pixelRenderer';
import { drawPanelBox, drawWrappedText, MG_H, MG_W } from '../minigames/common';
import {
  BadgeDef,
  GlobalSaveData,
  ModeId,
  ModeSaveData,
  PortraitSpec,
  SpriteAppearance,
  WorldDefinition,
} from '../types';

export interface DialogueMessage {
  speaker: string;
  text: string;
  appearance?: SpriteAppearance;
  portrait?: PortraitSpec;
  customPortraitUrl?: string;
  voicePitch?: number;
}

export class DialogueController {
  private queue: DialogueMessage[] = [];
  private index = 0;
  private charCount = 0;
  private blipTick = 0;
  private onComplete: (() => void) | null = null;

  start(messages: DialogueMessage[], onComplete?: () => void): void {
    this.queue = messages;
    this.index = 0;
    this.charCount = 0;
    this.blipTick = 0;
    this.onComplete = onComplete ?? null;
  }

  isActive(): boolean {
    return this.queue.length > 0 && this.index < this.queue.length;
  }

  update(
    dt: number,
    advancePressed: boolean,
    playBlip: (pitch: number) => void
  ): boolean {
    if (!this.isActive()) return false;
    const msg = this.queue[this.index];

    if (this.charCount < msg.text.length) {
      this.charCount = Math.min(msg.text.length, this.charCount + dt * 48);
      this.blipTick += dt;
      if (this.blipTick >= 0.055) {
        this.blipTick = 0;
        playBlip(msg.voicePitch ?? 500);
      }
      if (advancePressed) {
        this.charCount = msg.text.length;
      }
      return true;
    }

    if (advancePressed) {
      this.index++;
      this.charCount = 0;
      if (this.index >= this.queue.length) {
        const cb = this.onComplete;
        this.queue = [];
        this.onComplete = null;
        cb?.();
        return false;
      }
    }
    return true;
  }

  render(ctx: CanvasRenderingContext2D, animTimer: number): void {
    if (!this.isActive()) return;
    const msg = this.queue[this.index];
    const boxY = MG_H - 74;
    const boxH = 68;

    drawPanelBox(ctx, 6, boxY, MG_W - 12, boxH, '#f8f5ec', '#28365e');

    let textX = 16;
    let textW = MG_W - 32;
    if (msg.appearance && msg.portrait) {
      ctx.fillStyle = '#1b2238';
      ctx.fillRect(14, boxY + 10, 48, 48);
      drawPortrait(
        ctx,
        msg.appearance,
        msg.portrait,
        14,
        boxY + 10,
        48,
        msg.customPortraitUrl
      );
      ctx.strokeStyle = '#d6ae53';
      ctx.strokeRect(13.5, boxY + 9.5, 49, 49);
      textX = 70;
      textW = MG_W - 86;
    }

    // Speaker nameplate
    ctx.fillStyle = '#28365e';
    ctx.font = 'bold 9px sans-serif';
    const nameW = Math.min(180, ctx.measureText(msg.speaker).width + 14);
    ctx.fillRect(textX, boxY - 9, nameW, 14);
    ctx.strokeStyle = '#f4c542';
    ctx.strokeRect(textX + 0.5, boxY - 8.5, nameW - 1, 13);
    ctx.fillStyle = '#ffe680';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg.speaker, textX + 6, boxY - 2);

    // Wrapped typewriter text
    ctx.fillStyle = '#1b2033';
    ctx.font = 'bold 9px sans-serif';
    ctx.textBaseline = 'top';
    const shown = msg.text.slice(0, Math.floor(this.charCount));
    drawWrappedText(ctx, shown, textX, boxY + 11, textW, 13);

    if (this.charCount >= msg.text.length && Math.floor(animTimer * 3) % 2 === 0) {
      ctx.fillStyle = '#c93838';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('▼', MG_W - 16, boxY + boxH - 16);
    }
  }
}

export function renderTitleScreen(ctx: CanvasRenderingContext2D, timer: number): void {
  // Deep winter Pokémon night sky
  const grad = ctx.createLinearGradient(0, 0, 0, MG_H);
  grad.addColorStop(0, '#121b3d');
  grad.addColorStop(0.65, '#1d3269');
  grad.addColorStop(1, '#261c36');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, MG_W, MG_H);

  // Twinkling stars & gentle snowfall
  for (let i = 0; i < 36; i++) {
    const sx = (i * 47 + Math.sin(timer + i) * 6 + MG_W) % MG_W;
    const sy = ((i * 29 + timer * (10 + (i % 5) * 3)) % (MG_H - 36));
    ctx.fillStyle = i % 4 === 0 ? '#ffe680' : 'rgba(255,255,255,0.75)';
    ctx.fillRect(Math.round(sx), Math.round(sy), i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
  }

  // Festive silhouettes & Pokéball-ornament crest
  const cx = MG_W / 2;
  ctx.fillStyle = '#182447';
  ctx.fillRect(0, 198, MG_W, 42);

  // Ornamental PokéNoël Emblem
  ctx.fillStyle = '#0d101c';
  ctx.beginPath();
  ctx.arc(cx, 54, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d93848';
  ctx.beginPath();
  ctx.arc(cx, 54, 21, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#f5f2eb';
  ctx.beginPath();
  ctx.arc(cx, 54, 21, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#181c2b';
  ctx.fillRect(cx - 21, 52, 42, 4);
  ctx.fillStyle = '#f4c542';
  ctx.beginPath();
  ctx.arc(cx, 54, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff5cc';
  ctx.beginPath();
  ctx.arc(cx, 54, 4, 0, Math.PI * 2);
  ctx.fill();

  // Cartridge Logo: PokéNoël
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = '#142154';
  ctx.fillText('PokéNoël', cx + 3, 103);
  ctx.strokeStyle = '#1e4ea8';
  ctx.lineWidth = 4;
  ctx.strokeText('PokéNoël', cx, 100);
  ctx.fillStyle = '#ffd542';
  ctx.fillText('PokéNoël', cx, 100);

  // Subtitle ribbon
  ctx.fillStyle = '#b8283c';
  ctx.fillRect(cx - 98, 124, 196, 22);
  ctx.strokeStyle = '#ffd542';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - 98, 124, 196, 22);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('ATTRAPEZ-LES TOUS !', cx, 135);

  ctx.fillStyle = '#bfd1ff';
  ctx.font = '9px sans-serif';
  ctx.fillText('Édition Spéciale Famille • 4 Mondes • 52 Défis', cx, 162);

  // Blinking Start prompt
  if (Math.floor(timer * 2.2) % 2 === 0) {
    ctx.fillStyle = '#79f59d';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('Appuyez sur [Espace / Entrée / A] pour jouer', cx, 194);
  }

  ctx.fillStyle = '#8b9ac9';
  ctx.font = '8px sans-serif';
  ctx.fillText('Flèches / ZQSD : Bouger   •   C : Échanger de meneur   •   M : Son', cx, 226);
}

export function getModeCardRects() {
  return [
    { x: 12, y: 34, w: 174, h: 88 },
    { x: 198, y: 34, w: 174, h: 88 },
    { x: 12, y: 128, w: 174, h: 88 },
    { x: 198, y: 128, w: 174, h: 88 },
  ];
}

export function renderModeSelectScreen(
  ctx: CanvasRenderingContext2D,
  save: GlobalSaveData,
  selectedIndex: number
): void {
  ctx.fillStyle = '#14192c';
  ctx.fillRect(0, 0, MG_W, MG_H);

  // Header
  ctx.fillStyle = '#0f1322';
  ctx.fillRect(0, 0, MG_W, 28);
  ctx.fillStyle = '#f4c542';
  ctx.fillRect(0, 27, MG_W, 1);

  const clearedCount = MODE_ORDER.filter((m) => save.modes[m].bossDefeated).length;
  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Choisissez votre binôme :', 12, 14);

  ctx.textAlign = 'right';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillStyle = clearedCount === 4 ? '#79f59d' : '#b4c2eb';
  ctx.fillText(
    clearedCount === 4
      ? '★ 4/4 MONDES COMPLÉTÉS ! JOYEUX NOËL !'
      : `Mondes terminés : ${clearedCount}/4`,
    MG_W - 10,
    14
  );

  const rects = getModeCardRects();
  MODE_ORDER.forEach((modeId, idx) => {
    const pair = FAMILY_PAIRS[modeId];
    const modeSave = save.modes[modeId];
    const r = rects[idx];
    const selected = idx === selectedIndex;

    drawPanelBox(
      ctx,
      r.x,
      r.y,
      r.w,
      r.h,
      selected ? '#273459' : '#1b2238',
      selected ? '#f4c542' : '#414c70'
    );

    // Pair color accent header strip
    ctx.fillStyle = pair.primaryColor;
    ctx.fillRect(r.x + 3, r.y + 3, r.w - 6, 16);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${selected ? '▶ ' : ''}${pair.label}`,
      r.x + 7,
      r.y + 11
    );

    if (modeSave.bossDefeated) {
      ctx.fillStyle = '#ffe27a';
      ctx.textAlign = 'right';
      ctx.fillText('★ ROI', r.x + r.w - 7, r.y + 11);
    }

    // Two mini portraits
    const [mA, mB] = pair.members;
    drawPortrait(ctx, mA.appearance, mA.portrait, r.x + 8, r.y + 24, 34, mA.customPortraitUrl);
    drawPortrait(ctx, mB.appearance, mB.portrait, r.x + 44, r.y + 24, 34, mB.customPortraitUrl);

    // Theme & World Info
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffe680';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText(pair.worldName, r.x + 83, r.y + 24);

    ctx.fillStyle = '#cbd5f5';
    ctx.font = '8px sans-serif';
    drawWrappedText(ctx, pair.themeLabel, r.x + 83, r.y + 36, r.w - 89, 10);

    // Progress bar at bottom of card
    const count = modeSave.badges.length;
    ctx.fillStyle = '#121626';
    ctx.fillRect(r.x + 8, r.y + 66, r.w - 16, 14);
    ctx.fillStyle = modeSave.bossDefeated ? '#f4c542' : '#45c46b';
    ctx.fillRect(r.x + 8, r.y + 66, Math.round(((r.w - 16) * count) / 12), 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      modeSave.bossDefeated ? '12/12 + BOSS VAINCU !' : `Badges : ${count}/12`,
      r.x + r.w / 2,
      r.y + 73
    );
  });

  // Footer
  ctx.fillStyle = '#9aa8d4';
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    '[A / Clic] Jouer   •   [Échap / B] Retour   •   [C] Importer/Exporter Code de Sauvegarde',
    MG_W / 2,
    229
  );
}

export type PauseSubView = 'menu' | 'badges' | 'notebook' | 'map';

export const PAUSE_OPTIONS = [
  'Boîte à Badges',
  'Carnet de Rencontres',
  'Carte du Monde',
  'Échanger le meneur',
  'Sauvegarde & Code',
  'Changer de binôme',
] as const;

export function renderPauseMenu(
  ctx: CanvasRenderingContext2D,
  world: WorldDefinition,
  save: ModeSaveData,
  cursor: number,
  subView: PauseSubView,
  subCursor: number,
  playerPos: { x: number; y: number }
): void {
  ctx.fillStyle = 'rgba(10, 14, 26, 0.72)';
  ctx.fillRect(0, 0, MG_W, MG_H);

  if (subView === 'menu') {
    drawPanelBox(ctx, 188, 18, 184, 160, '#f8f5ec', '#28365e');
    ctx.fillStyle = '#1b2033';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('MENU DU VOYAGE', 202, 28);

    PAUSE_OPTIONS.forEach((opt, i) => {
      const y = 48 + i * 20;
      const sel = i === cursor;
      if (sel) {
        ctx.fillStyle = '#28365e';
        ctx.fillRect(196, y - 2, 168, 16);
      }
      ctx.fillStyle = sel ? '#ffe680' : '#262d42';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`${sel ? '▶ ' : '  '}${opt}`, 200, y + 1);
    });

    // Quick pair summary card on left
    const pair = FAMILY_PAIRS[world.modeId];
    drawPanelBox(ctx, 12, 18, 166, 98, '#1b2238', '#f4c542');
    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(pair.label, 22, 28);
    ctx.fillStyle = '#cbd5f5';
    ctx.font = '8px sans-serif';
    ctx.fillText(world.worldName, 22, 42);
    ctx.fillText(`Badges : ${save.badges.length} / 12`, 22, 58);
    ctx.fillText(
      `Boss Final : ${save.bossDefeated ? 'Vaincu ★' : 'À défier'}`,
      22,
      72
    );
    ctx.fillText(`Rencontres : ${save.metNpcs.length}`, 22, 86);
    const mins = Math.floor(save.playTimeSeconds / 60);
    const secs = save.playTimeSeconds % 60;
    ctx.fillText(`Temps : ${mins}m ${String(secs).padStart(2, '0')}s`, 22, 100);
    return;
  }

  if (subView === 'badges') {
    const allBadges: BadgeDef[] = [...world.badges, world.bossBadge];
    drawPanelBox(ctx, 12, 12, MG_W - 24, MG_H - 24, '#182038', '#f4c542');

    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Boîte à Badges — ${world.worldName}`, 24, 22);

    // Grid of 13 badges (6 + 7 or 5 + 5 + 3)
    const cols = 7;
    allBadges.forEach((badge, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const bx = 32 + col * 48;
      const by = 46 + row * 48;
      const unlocked =
        badge.district === 4
          ? save.bossDefeated
          : save.badges.includes(badge.id);

      if (idx === subCursor) {
        ctx.fillStyle = '#33467a';
        ctx.fillRect(bx - 4, by - 4, 40, 40);
        ctx.strokeStyle = '#f4c542';
        ctx.strokeRect(bx - 4.5, by - 4.5, 41, 41);
      }
      drawBadgeIcon(ctx, badge, unlocked, bx, by, 1.6);
    });

    // Selected badge details
    const chosen = allBadges[subCursor] ?? allBadges[0];
    const unlocked =
      chosen.district === 4
        ? save.bossDefeated
        : save.badges.includes(chosen.id);
    drawPanelBox(ctx, 22, 152, MG_W - 44, 64, '#101526', '#4a5a8a');
    ctx.fillStyle = unlocked ? '#ffe27a' : '#8a94b8';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(
      unlocked
        ? `${chosen.name} (${chosen.characterName} • ${chosen.category})`
        : `??? — Quartier ${chosen.district} (${chosen.category})`,
      32,
      160
    );
    ctx.fillStyle = '#d4ddf7';
    ctx.font = '8px sans-serif';
    drawWrappedText(
      ctx,
      unlocked
        ? chosen.description
        : `Parlez aux personnages du quartier ${chosen.district} pour trouver ${chosen.characterName}.`,
      32,
      176,
      MG_W - 64,
      11
    );
    return;
  }

  if (subView === 'notebook') {
    const entries = world.npcs.filter((n) => n.role === 'main' || n.role === 'boss');
    drawPanelBox(ctx, 12, 12, MG_W - 24, MG_H - 24, '#f8f5ec', '#28365e');
    ctx.fillStyle = '#1b2033';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Carnet de Rencontres (↑/↓ pour parcourir, Échap retour)', 22, 20);

    const chosen = entries[subCursor % entries.length];
    const met = save.metNpcs.includes(chosen.id);
    const won = chosen.badgeId ? save.badges.includes(chosen.badgeId) : save.bossDefeated;

    // Left scrollable list
    const start = Math.max(0, Math.min(entries.length - 8, subCursor - 3));
    for (let i = 0; i < 8 && start + i < entries.length; i++) {
      const idx = start + i;
      const e = entries[idx];
      const y = 40 + i * 21;
      const sel = idx === subCursor;
      if (sel) {
        ctx.fillStyle = '#28365e';
        ctx.fillRect(20, y - 2, 148, 18);
      }
      const isMet = save.metNpcs.includes(e.id);
      ctx.fillStyle = sel ? '#ffe680' : '#242b40';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText(
        `${sel ? '▶ ' : ''}${isMet ? e.name : '??? (À rencontrer)'}`,
        24,
        y + 3
      );
    }

    // Right detail card
    drawPanelBox(ctx, 178, 38, 182, 178, '#1b2238', '#d6ae53');
    if (met) {
      drawPortrait(ctx, chosen.appearance, chosen.portrait, 190, 48, 48);
      ctx.fillStyle = '#ffe27a';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(chosen.name, 246, 50);
      ctx.fillStyle = '#9cc0ff';
      ctx.font = '8px sans-serif';
      drawWrappedText(ctx, chosen.title, 246, 64, 106, 10);
      ctx.fillStyle = won ? '#66f28d' : '#ff9494';
      ctx.fillText(won ? 'Badge obtenu ✓' : 'À défier !', 246, 86);
      ctx.fillStyle = '#e6ebff';
      drawWrappedText(ctx, chosen.notebookBio ?? '', 190, 108, 158, 11);
    } else {
      ctx.fillStyle = '#8b98c4';
      ctx.font = 'bold 9px sans-serif';
      drawWrappedText(
        ctx,
        `Personnage du Quartier ${chosen.district}. Explorez les bâtiments et parlez aux habitants pour des indices !`,
        190,
        74,
        158,
        12
      );
    }
    return;
  }

  if (subView === 'map') {
    drawPanelBox(ctx, 18, 14, MG_W - 36, MG_H - 28, '#141a2b', '#f4c542');
    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Carte — ${world.worldName}`, 30, 22);

    // Minimap scaled 3x (60*3 = 180 x 44*3 = 132)
    const mx = 34;
    const my = 44;
    const scale = 3;
    const ow = world.maps[world.overworldId];
    for (let y = 0; y < ow.height; y++) {
      for (let x = 0; x < ow.width; x++) {
        const t = ow.tiles[y][x];
        let c = '#3b7a47';
        if (t === 'water') c = '#3474b5';
        else if (t === 'path' || t === 'plaza' || t === 'star_tile') c = '#c7b898';
        else if (t === 'carpet') c = '#b83242';
        else if (t === 'tree') c = '#1f4729';
        else if (t === 'wall_a' || t === 'wall_b' || t === 'roof_a' || t === 'roof_b') c = '#6e768f';
        else if (t === 'gate_closed') c = '#f4c542';
        ctx.fillStyle = c;
        ctx.fillRect(mx + x * scale, my + y * scale, scale, scale);
      }
    }

    // Building status dots
    for (const b of world.buildings) {
      const won = b.isBoss ? save.bossDefeated : save.badges.includes(b.badgeId);
      ctx.fillStyle = won ? '#57d978' : b.isBoss ? '#ffd045' : '#ff4d5e';
      ctx.fillRect(mx + b.doorX * scale - 1, my + b.doorY * scale - 1, 5, 5);
    }

    // Player marker
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mx + playerPos.x * scale - 2, my + playerPos.y * scale - 2, 6, 6);
    ctx.fillStyle = '#3fb8ff';
    ctx.fillRect(mx + playerPos.x * scale - 1, my + playerPos.y * scale - 1, 4, 4);

    // Legend on right
    const lx = 228;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('Légende :', lx, 44);
    const items: [string, string][] = [
      ['■ Vous êtes ici', '#3fb8ff'],
      ['■ Défi à relever (!)', '#ff4d5e'],
      ['■ Badge obtenu (✓)', '#57d978'],
      ['■ Boss Final (★)', '#ffd045'],
    ];
    items.forEach(([txt, col], i) => {
      ctx.fillStyle = col;
      ctx.font = '8px sans-serif';
      ctx.fillText(txt, lx, 64 + i * 16);
    });

    ctx.fillStyle = '#ffd978';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('Quartiers :', lx, 134);
    world.districts.forEach((d, i) => {
      ctx.fillStyle = '#cbd5f5';
      ctx.font = '8px sans-serif';
      ctx.fillText(`${d.id}. ${d.name}`, lx, 148 + i * 14);
    });
  }
}

export function renderEndingCeremony(
  ctx: CanvasRenderingContext2D,
  modeId: ModeId,
  world: WorldDefinition,
  save: ModeSaveData,
  timer: number
): void {
  const pair = FAMILY_PAIRS[modeId];
  const [mA, mB] = pair.members;

  // Festive gradient sky
  const grad = ctx.createLinearGradient(0, 0, 0, MG_H);
  grad.addColorStop(0, '#190f2e');
  grad.addColorStop(0.5, '#3b1533');
  grad.addColorStop(1, '#12262e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, MG_W, MG_H);

  // Fireworks bursts
  const fwColors = ['#ffd452', '#ff6b8b', '#66f28d', '#6ec6ff'];
  for (let b = 0; b < 4; b++) {
    const phase = (timer * 0.9 + b * 0.45) % 1.8;
    if (phase < 1.0) {
      const fx = 54 + b * 92;
      const fy = 36 + (b % 2) * 18;
      ctx.fillStyle = fwColors[b];
      for (let p = 0; p < 8; p++) {
        const ang = (p / 8) * Math.PI * 2;
        const r = phase * 22;
        ctx.fillRect(Math.round(fx + Math.cos(ang) * r), Math.round(fy + Math.sin(ang) * r), 2, 2);
      }
    }
  }

  // Gentle snowfall
  for (let i = 0; i < 40; i++) {
    const sx = (i * 53 + Math.sin(timer * 1.4 + i) * 8 + MG_W) % MG_W;
    const sy = (i * 31 + timer * 22) % MG_H;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
  }

  // Panthéon header + Big "JOYEUX NOËL" banner!
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#9ff5b6';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText(`PANTHÉON DES CHAMPIONS — ${world.worldName.toUpperCase()}`, MG_W / 2, 10);

  ctx.fillStyle = '#c92a42';
  ctx.fillRect(24, 24, MG_W - 48, 28);
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, MG_W - 48, 28);

  ctx.fillStyle = '#ffe97d';
  ctx.font = 'bold 14px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(`★ JOYEUX NOËL, ${mA.name.toUpperCase()} & ${mB.name.toUpperCase()} ! ★`, MG_W / 2, 38);

  // Duo Portraits & Hopping Sprites
  drawPortrait(ctx, mA.appearance, mA.portrait, 34, 62, 48, mA.customPortraitUrl);
  drawPortrait(ctx, mB.appearance, mB.portrait, MG_W - 82, 62, 48, mB.customPortraitUrl);

  const hopA = Math.abs(Math.round(Math.sin(timer * 5) * 4));
  const hopB = Math.abs(Math.round(Math.cos(timer * 5) * 4));
  drawOverworldSprite(ctx, mA.appearance, 'down', Math.floor(timer * 4) % 3, 92, 84 - hopA, mA.customSpriteSheetUrl);
  drawOverworldSprite(ctx, mB.appearance, 'down', Math.floor(timer * 4 + 1) % 3, MG_W - 108, 84 - hopB, mB.customSpriteSheetUrl);

  // Supreme Boss Badge in center
  drawBadgeIcon(ctx, world.bossBadge, true, MG_W / 2 - 16, 62, 1.6);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText(world.bossBadge.name, MG_W / 2, 100);

  // All 12 Badges row
  const startX = Math.floor((MG_W - 12 * 26) / 2);
  world.badges.forEach((badge, i) => {
    drawBadgeIcon(ctx, badge, true, startX + i * 26, 120, 1.15);
  });

  // Gift Dedication Box
  drawPanelBox(ctx, 26, 150, MG_W - 52, 58, '#161b30', '#ffd452');
  ctx.fillStyle = '#fff5d6';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(
    `Félicitations ! Vous avez triomphé de ${world.bossBadge.characterName} !`,
    MG_W / 2,
    158
  );
  ctx.fillStyle = '#cbd8ff';
  ctx.font = '8px sans-serif';
  const mins = Math.floor(save.playTimeSeconds / 60);
  const secs = save.playTimeSeconds % 60;
  ctx.fillText(
    `Badges : 12/12 + Boss  •  Rencontres : ${save.metNpcs.length}  •  Temps : ${mins}m ${secs}s`,
    MG_W / 2,
    174
  );
  ctx.fillStyle = '#79f59d';
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText(
    'Avec tout notre amour, très Joyeux Noël à toute la famille ! ♥',
    MG_W / 2,
    190
  );

  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('[Espace / A] Revenir au menu des mondes', MG_W / 2, 220);
}
