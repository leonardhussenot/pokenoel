import { soundEngine } from './audio/soundEngine';
import { WORLDS } from './data';
import { FAMILY_PAIRS, MODE_ORDER } from './data/familyAvatars';
import { InputManager } from './engine/input';
import { OverworldEngine, SCREEN_H, SCREEN_W } from './engine/overworld';
import {
  decodeSaveCode,
  encodeSaveCode,
  loadGlobalSave,
  saveGlobalSave,
} from './engine/saveSystem';
import {
  DialogueController,
  DialogueMessage,
  getModeCardRects,
  PAUSE_OPTIONS,
  PauseSubView,
  renderEndingCeremony,
  renderModeSelectScreen,
  renderPauseMenu,
  renderTitleScreen,
} from './engine/uiRenderer';
import { ChallengeRunner } from './minigames/challengeRunner';
import {
  DistrictGate,
  GameScene,
  GlobalSaveData,
  ModeId,
  ModeSaveData,
  NpcEntity,
  SignPost,
  WorldDefinition,
} from './types';

export class PokeNoelGame {
  private ctx: CanvasRenderingContext2D;
  private input = new InputManager();
  private save: GlobalSaveData;
  private scene: GameScene = 'TITLE';
  private timer = 0;

  private modeCursor = 0;
  private activeModeId: ModeId = 'pm';
  private activeWorld: WorldDefinition = WORLDS.pm;
  private overworld: OverworldEngine | null = null;
  private dialogue = new DialogueController();
  private challengeRunner: ChallengeRunner | null = null;

  private pauseCursor = 0;
  private pauseSubView: PauseSubView = 'menu';
  private pauseSubCursor = 0;
  private endingTimer = 0;

  private lastTimestamp = 0;
  private soundBtnEl: HTMLButtonElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Impossible d’initialiser le contexte 2D du canvas.');
    }
    context.imageSmoothingEnabled = false;
    this.ctx = context;

    this.save = loadGlobalSave();
    soundEngine.setMuted(this.save.muted);

    this.input.attach(canvas, () => soundEngine.unlock());
    this.wireShellControls();
    soundEngine.playBgm('title');
  }

  private wireShellControls(): void {
    if (typeof document === 'undefined') return;

    this.soundBtnEl = document.querySelector<HTMLButtonElement>('#btn-sound');
    const padBtn = document.querySelector<HTMLButtonElement>('#btn-toggle-pad');
    const shell = document.querySelector<HTMLElement>('#gba-shell');

    const updateSoundLabel = () => {
      if (this.soundBtnEl) {
        this.soundBtnEl.textContent = soundEngine.isMuted() ? 'Son : OFF' : 'Son : ON';
      }
    };
    updateSoundLabel();

    this.soundBtnEl?.addEventListener('click', () => {
      soundEngine.unlock();
      this.toggleMute();
      updateSoundLabel();
    });

    padBtn?.addEventListener('click', () => {
      shell?.classList.toggle('show-pad');
    });

    // Save Code Modal
    const dialog = document.querySelector<HTMLDialogElement>('#save-code-dialog');
    const textarea = document.querySelector<HTMLTextAreaElement>('#save-code-textarea');
    const feedback = document.querySelector<HTMLElement>('#save-code-feedback');
    const copyBtn = document.querySelector<HTMLButtonElement>('#btn-copy-save');
    const importBtn = document.querySelector<HTMLButtonElement>('#btn-import-save');

    copyBtn?.addEventListener('click', async () => {
      if (!textarea || !feedback) return;
      try {
        await navigator.clipboard.writeText(textarea.value);
        feedback.textContent = 'Code copié dans le presse-papiers !';
        feedback.classList.remove('error');
      } catch {
        textarea.select();
        feedback.textContent = 'Sélectionnez et copiez le code ci-dessus.';
        feedback.classList.remove('error');
      }
    });

    importBtn?.addEventListener('click', () => {
      if (!textarea || !feedback) return;
      const decoded = decodeSaveCode(textarea.value);
      if (!decoded) {
        feedback.textContent = 'Code invalide ou corrompu. Vérifiez le texte collé.';
        feedback.classList.add('error');
        soundEngine.playHitMiss();
        return;
      }
      this.save = decoded;
      saveGlobalSave(this.save);
      soundEngine.setMuted(this.save.muted);
      updateSoundLabel();
      soundEngine.playBadgeFanfare();
      feedback.textContent = 'Sauvegarde chargée avec succès !';
      feedback.classList.remove('error');
      if (this.scene !== 'TITLE' && this.scene !== 'MODE_SELECT') {
        this.startMode(this.activeModeId);
      }
      setTimeout(() => dialog?.close(), 650);
    });
  }

  private openSaveDialog(): void {
    const dialog = document.querySelector<HTMLDialogElement>('#save-code-dialog');
    const textarea = document.querySelector<HTMLTextAreaElement>('#save-code-textarea');
    const feedback = document.querySelector<HTMLElement>('#save-code-feedback');
    if (!dialog || !textarea) return;
    textarea.value = encodeSaveCode(this.save);
    if (feedback) {
      feedback.textContent = '';
      feedback.classList.remove('error');
    }
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  private toggleMute(): void {
    const next = !soundEngine.isMuted();
    soundEngine.setMuted(next);
    this.save.muted = next;
    saveGlobalSave(this.save);
    if (this.soundBtnEl) {
      this.soundBtnEl.textContent = next ? 'Son : OFF' : 'Son : ON';
    }
  }

  start(): void {
    this.lastTimestamp = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTimestamp) / 1000));
      this.lastTimestamp = now;
      this.update(dt);
      this.render();
      this.input.endFrame();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private getActiveModeSave(): ModeSaveData {
    return this.save.modes[this.activeModeId];
  }

  private startMode(modeId: ModeId): void {
    this.activeModeId = modeId;
    this.activeWorld = WORLDS[modeId];
    const modeSave = this.getActiveModeSave();
    const pair = FAMILY_PAIRS[modeId];

    this.overworld = new OverworldEngine(
      this.activeWorld,
      pair.members,
      modeSave,
      {
        onInteractNpc: (npc) => this.handleNpcInteraction(npc),
        onInspectSign: (sign) => this.handleSignInspection(sign),
        onLockedGateBump: (gate) => this.handleLockedGate(gate),
        onOpenPauseMenu: () => {
          this.pauseCursor = 0;
          this.pauseSubView = 'menu';
          this.pauseSubCursor = 0;
          this.scene = 'PAUSE_MENU';
        },
      }
    );

    this.scene = 'OVERWORLD';
    soundEngine.playBgm(this.activeWorld.bgmId);

    // Welcome toast on fresh start
    if (modeSave.badges.length === 0 && modeSave.metNpcs.length === 0) {
      this.dialogue.start([
        {
          speaker: pair.members[0].name,
          text: `Bienvenue à ${this.activeWorld.worldName}, ${pair.members[1].name} ! Collectons les 12 badges pour défier le Boss Final !`,
          appearance: pair.members[0].appearance,
          portrait: pair.members[0].portrait,
          customPortraitUrl: pair.members[0].customPortraitUrl,
          voicePitch: pair.members[0].voicePitch,
        },
        {
          speaker: pair.members[1].name,
          text: 'Les habitants dans la rue nous donnent des indices, et chaque bâtiment abrite un grand personnage ! C’est parti !',
          appearance: pair.members[1].appearance,
          portrait: pair.members[1].portrait,
          customPortraitUrl: pair.members[1].customPortraitUrl,
          voicePitch: pair.members[1].voicePitch,
        },
      ]);
      this.scene = 'DIALOGUE';
    }
  }

  private handleSignInspection(sign: SignPost): void {
    this.dialogue.start([
      {
        speaker: 'Panneau',
        text: sign.subtitle ? `${sign.title} — ${sign.subtitle}` : sign.title,
      },
    ]);
    this.scene = 'DIALOGUE';
  }

  private handleLockedGate(gate: DistrictGate): void {
    const modeSave = this.getActiveModeSave();
    const missing = Math.max(0, gate.requiredBadges - modeSave.badges.length);
    const gk = this.activeWorld.npcs.find((n) => n.id === gate.gatekeeperNpcId);
    this.dialogue.start([
      {
        speaker: gk?.name ?? 'Gardien',
        text: `Halte ! L’accès à « ${gate.districtLabel} » requiert ${gate.requiredBadges} badges. Il vous en manque encore ${missing} !`,
        appearance: gk?.appearance,
        portrait: gk?.portrait,
        voicePitch: gk?.voicePitch,
      },
    ]);
    this.scene = 'DIALOGUE';
  }

  private handleNpcInteraction(npc: NpcEntity): void {
    const modeSave = this.getActiveModeSave();
    if (!modeSave.metNpcs.includes(npc.id)) {
      modeSave.metNpcs.push(npc.id);
      saveGlobalSave(this.save);
    }

    if (npc.role === 'cameo') {
      const pair = FAMILY_PAIRS[npc.cameoPairCode ?? 'pm'];
      const [mA, mB] = pair.members;
      const msgs: DialogueMessage[] = (npc.cameoLines ?? []).map((line) => ({
        speaker: line.speaker,
        text: line.text,
        appearance: line.portraitOwner === 'a' ? mA.appearance : mB.appearance,
        portrait: line.portraitOwner === 'a' ? mA.portrait : mB.portrait,
        customPortraitUrl:
          line.portraitOwner === 'a' ? mA.customPortraitUrl : mB.customPortraitUrl,
        voicePitch: line.portraitOwner === 'a' ? mA.voicePitch : mB.voicePitch,
      }));
      this.dialogue.start(msgs);
      this.scene = 'DIALOGUE';
      return;
    }

    if (npc.role === 'gatekeeper') {
      const gate = this.activeWorld.gates.find((g) => g.id === npc.gateId);
      if (gate) {
        if (modeSave.badges.length >= gate.requiredBadges) {
          soundEngine.playGateOpen();
          this.dialogue.start([
            {
              speaker: npc.name,
              text: `Vous avez ${modeSave.badges.length} badges ! La voie vers « ${gate.districtLabel} » est grande ouverte ! Bonne chance !`,
              appearance: npc.appearance,
              portrait: npc.portrait,
              voicePitch: npc.voicePitch,
            },
          ]);
        } else {
          this.handleLockedGate(gate);
          return;
        }
      }
      this.scene = 'DIALOGUE';
      return;
    }

    if (npc.role === 'secondary') {
      const hintText = this.buildDynamicHintText(npc, modeSave);
      this.dialogue.start([
        {
          speaker: `${npc.name} (${npc.title})`,
          text: hintText,
          appearance: npc.appearance,
          portrait: npc.portrait,
          voicePitch: npc.voicePitch,
        },
      ]);
      this.scene = 'DIALOGUE';
      return;
    }

    // Main Character or Final Boss!
    if (npc.role === 'main' || npc.role === 'boss') {
      const alreadyWon =
        npc.role === 'boss'
          ? modeSave.bossDefeated
          : npc.badgeId
            ? modeSave.badges.includes(npc.badgeId)
            : false;

      if (alreadyWon) {
        const lines = (npc.alreadyWonLines ?? ['Vous avez déjà triomphé ici !']).map(
          (text) => ({
            speaker: npc.name,
            text,
            appearance: npc.appearance,
            portrait: npc.portrait,
            voicePitch: npc.voicePitch,
          })
        );
        this.dialogue.start(lines);
        this.scene = 'DIALOGUE';
        return;
      }

      const introMsgs: DialogueMessage[] = (npc.introLines ?? []).map((text) => ({
        speaker: npc.name,
        text,
        appearance: npc.appearance,
        portrait: npc.portrait,
        voicePitch: npc.voicePitch,
      }));
      this.dialogue.start(introMsgs, () => {
        this.launchChallenge(npc);
      });
      this.scene = 'DIALOGUE';
    }
  }

  private buildDynamicHintText(npc: NpcEntity, save: ModeSaveData): string {
    const districtBuildings = this.activeWorld.buildings.filter(
      (b) => b.district === npc.district && !save.badges.includes(b.badgeId)
    );

    if (districtBuildings.length === 0) {
      return `Vous avez déjà réuni tous les badges de ce quartier ! Montez vers la porte au nord pour poursuivre votre aventure !`;
    }

    // Prefer npc.hintTargetBadgeIds if still uncollected, otherwise first uncollected in district
    let targetBuilding = districtBuildings[0];
    if (npc.hintTargetBadgeIds) {
      for (const id of npc.hintTargetBadgeIds) {
        const match = districtBuildings.find((b) => b.badgeId === id);
        if (match) {
          targetBuilding = match;
          break;
        }
      }
    }

    const targetNpc = this.activeWorld.npcs.find((n) => n.id === targetBuilding.characterId);
    const dx = targetBuilding.doorX - npc.x;
    const dy = targetBuilding.doorY - npc.y;
    const horiz = dx < -4 ? 'à l’ouest' : dx > 4 ? 'à l’est' : 'tout près';
    const vert = dy < -2 ? 'au nord' : dy > 2 ? 'au sud' : '';
    const dirPhrase = vert && horiz !== 'tout près' ? `${vert} et ${horiz}` : vert || horiz;

    const intro =
      npc.hintLines?.[0] ?? 'Mon petit doigt me dit qu’un défi passionnant vous attend chez';
    return `${intro} ${targetNpc?.name ?? 'un grand maître'} ! Rendez-vous dans « ${targetBuilding.name} », ${dirPhrase} !`;
  }

  private launchChallenge(npc: NpcEntity): void {
    if (!npc.challenge) return;
    const modeSave = this.getActiveModeSave();
    const pair = FAMILY_PAIRS[this.activeModeId];
    const badge =
      npc.role === 'boss'
        ? this.activeWorld.bossBadge
        : this.activeWorld.badges.find((b) => b.id === npc.badgeId) ??
          this.activeWorld.bossBadge;

    this.challengeRunner = new ChallengeRunner(
      npc,
      badge,
      pair.members,
      modeSave.leaderIndex,
      npc.challenge,
      () => {
        modeSave.attempts++;
        saveGlobalSave(this.save);
      }
    );
    this.scene = 'CHALLENGE';

    // Store active npc on runner lookup via closure handler in update
    this.activeChallengeNpc = npc;
  }

  private activeChallengeNpc: NpcEntity | null = null;

  private update(dt: number): void {
    this.timer += dt;

    if (this.input.justPressed('mute')) {
      this.toggleMute();
    }

    // Track playtime while inside a world
    if (
      this.scene === 'OVERWORLD' ||
      this.scene === 'DIALOGUE' ||
      this.scene === 'CHALLENGE'
    ) {
      const save = this.getActiveModeSave();
      const prevFloor = Math.floor(this.timer - dt);
      const currFloor = Math.floor(this.timer);
      if (currFloor > prevFloor) {
        save.playTimeSeconds++;
        if (save.playTimeSeconds % 10 === 0) {
          saveGlobalSave(this.save);
        }
      }
    }

    switch (this.scene) {
      case 'TITLE': {
        const tap = this.input.consumeTap();
        if (this.input.justPressed('a') || tap) {
          soundEngine.playConfirm();
          this.scene = 'MODE_SELECT';
        }
        break;
      }

      case 'MODE_SELECT': {
        if (this.input.justPressed('left') || this.input.justPressed('right')) {
          this.modeCursor ^= 1;
          soundEngine.playSelect();
        } else if (this.input.justPressed('up') || this.input.justPressed('down')) {
          this.modeCursor ^= 2;
          soundEngine.playSelect();
        }
        if (this.input.justPressed('swap')) {
          soundEngine.playSelect();
          this.openSaveDialog();
          break;
        }
        if (this.input.justPressed('b')) {
          soundEngine.playCancel();
          this.scene = 'TITLE';
          break;
        }
        const tap = this.input.consumeTap();
        if (tap) {
          const rects = getModeCardRects();
          const hit = rects.findIndex(
            (r) => tap.x >= r.x && tap.x <= r.x + r.w && tap.y >= r.y && tap.y <= r.y + r.h
          );
          if (hit !== -1) {
            this.modeCursor = hit;
            soundEngine.playConfirm();
            this.startMode(MODE_ORDER[this.modeCursor]);
            break;
          }
        }
        if (this.input.justPressed('a')) {
          soundEngine.playConfirm();
          this.startMode(MODE_ORDER[this.modeCursor]);
        }
        break;
      }

      case 'OVERWORLD': {
        this.overworld?.update(dt, this.input);
        break;
      }

      case 'DIALOGUE': {
        const tap = this.input.consumeTap();
        const adv = this.input.justPressed('a') || this.input.justPressed('b') || Boolean(tap);
        const stillOpen = this.dialogue.update(dt, adv, (p) => soundEngine.playBlip(p));
        if (!stillOpen && this.scene === 'DIALOGUE') {
          this.scene = 'OVERWORLD';
        }
        break;
      }

      case 'PAUSE_MENU': {
        this.updatePauseMenu();
        break;
      }

      case 'CHALLENGE': {
        if (!this.challengeRunner) {
          this.scene = 'OVERWORLD';
          break;
        }
        this.challengeRunner.update(dt, this.input);
        const status = this.challengeRunner.getStatus();
        if (status === 'won') {
          this.onChallengeWon();
        } else if (status === 'aborted') {
          this.challengeRunner = null;
          this.activeChallengeNpc = null;
          soundEngine.playBgm(this.activeWorld.bgmId);
          this.scene = 'OVERWORLD';
        }
        break;
      }

      case 'ENDING': {
        this.endingTimer += dt;
        const tap = this.input.consumeTap();
        if (
          this.endingTimer > 1.2 &&
          (this.input.justPressed('a') || this.input.justPressed('b') || tap)
        ) {
          soundEngine.playConfirm();
          soundEngine.playBgm('title');
          this.scene = 'MODE_SELECT';
        }
        break;
      }
    }
  }

  private onChallengeWon(): void {
    const npc = this.activeChallengeNpc;
    const modeSave = this.getActiveModeSave();
    this.challengeRunner = null;
    this.activeChallengeNpc = null;

    if (!npc) {
      soundEngine.playBgm(this.activeWorld.bgmId);
      this.scene = 'OVERWORLD';
      return;
    }

    if (npc.role === 'boss') {
      modeSave.bossDefeated = true;
      saveGlobalSave(this.save);
      this.endingTimer = 0;
      soundEngine.playBgm('victory');
      this.scene = 'ENDING';
      return;
    }

    if (npc.badgeId && !modeSave.badges.includes(npc.badgeId)) {
      modeSave.badges.push(npc.badgeId);
    }
    saveGlobalSave(this.save);
    soundEngine.playBgm(this.activeWorld.bgmId);

    // Trigger partner reaction + gate unlock reminder if milestone reached!
    const pair = FAMILY_PAIRS[this.activeModeId];
    const partner = pair.members[modeSave.leaderIndex === 0 ? 1 : 0];
    const msgs: DialogueMessage[] = [];
    if (npc.duoWinReaction) {
      msgs.push({
        speaker: partner.name,
        text: npc.duoWinReaction,
        appearance: partner.appearance,
        portrait: partner.portrait,
        customPortraitUrl: partner.customPortraitUrl,
        voicePitch: partner.voicePitch,
      });
    }
    if (modeSave.badges.length === 4 || modeSave.badges.length === 8 || modeSave.badges.length === 12) {
      soundEngine.playGateOpen();
      const targetMsg =
        modeSave.badges.length === 12
          ? 'Tous les 12 badges sont réunis ! La porte du Boss Final au tout nord est désormais ouverte !'
          : `Super ! Avec ${modeSave.badges.length} badges, le prochain quartier au nord est débloqué !`;
      msgs.push({
        speaker: pair.members[modeSave.leaderIndex].name,
        text: targetMsg,
        appearance: pair.members[modeSave.leaderIndex].appearance,
        portrait: pair.members[modeSave.leaderIndex].portrait,
        customPortraitUrl: pair.members[modeSave.leaderIndex].customPortraitUrl,
        voicePitch: pair.members[modeSave.leaderIndex].voicePitch,
      });
    }

    if (msgs.length > 0) {
      this.dialogue.start(msgs);
      this.scene = 'DIALOGUE';
    } else {
      this.scene = 'OVERWORLD';
    }
  }

  private updatePauseMenu(): void {
    const modeSave = this.getActiveModeSave();

    if (this.pauseSubView === 'menu') {
      if (this.input.justPressed('up')) {
        this.pauseCursor = (this.pauseCursor + PAUSE_OPTIONS.length - 1) % PAUSE_OPTIONS.length;
        soundEngine.playSelect();
      } else if (this.input.justPressed('down')) {
        this.pauseCursor = (this.pauseCursor + 1) % PAUSE_OPTIONS.length;
        soundEngine.playSelect();
      } else if (this.input.justPressed('b') || this.input.justPressed('menu')) {
        soundEngine.playCancel();
        this.scene = 'OVERWORLD';
      } else if (this.input.justPressed('a') || this.input.consumeTap()) {
        soundEngine.playConfirm();
        switch (this.pauseCursor) {
          case 0:
            this.pauseSubView = 'badges';
            this.pauseSubCursor = 0;
            break;
          case 1:
            this.pauseSubView = 'notebook';
            this.pauseSubCursor = 0;
            break;
          case 2:
            this.pauseSubView = 'map';
            break;
          case 3:
            this.overworld?.swapLeader();
            saveGlobalSave(this.save);
            this.scene = 'OVERWORLD';
            break;
          case 4:
            this.openSaveDialog();
            break;
          case 5:
            saveGlobalSave(this.save);
            soundEngine.playBgm('title');
            this.scene = 'MODE_SELECT';
            break;
        }
      }
      return;
    }

    if (this.input.justPressed('b') || this.input.justPressed('menu') || this.input.consumeTap()) {
      soundEngine.playCancel();
      this.pauseSubView = 'menu';
      return;
    }

    if (this.pauseSubView === 'badges') {
      const total = this.activeWorld.badges.length + 1;
      if (this.input.justPressed('right')) {
        this.pauseSubCursor = (this.pauseSubCursor + 1) % total;
        soundEngine.playSelect();
      } else if (this.input.justPressed('left')) {
        this.pauseSubCursor = (this.pauseSubCursor + total - 1) % total;
        soundEngine.playSelect();
      } else if (this.input.justPressed('down')) {
        this.pauseSubCursor = (this.pauseSubCursor + 7) % total;
        soundEngine.playSelect();
      } else if (this.input.justPressed('up')) {
        this.pauseSubCursor = (this.pauseSubCursor + total - 7) % total;
        soundEngine.playSelect();
      }
    } else if (this.pauseSubView === 'notebook') {
      const entries = this.activeWorld.npcs.filter(
        (n) => n.role === 'main' || n.role === 'boss'
      );
      if (this.input.justPressed('down') || this.input.justPressed('right')) {
        this.pauseSubCursor = (this.pauseSubCursor + 1) % entries.length;
        soundEngine.playSelect();
      } else if (this.input.justPressed('up') || this.input.justPressed('left')) {
        this.pauseSubCursor = (this.pauseSubCursor + entries.length - 1) % entries.length;
        soundEngine.playSelect();
      }
    }
    void modeSave;
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);

    switch (this.scene) {
      case 'TITLE':
        renderTitleScreen(ctx, this.timer);
        break;
      case 'MODE_SELECT':
        renderModeSelectScreen(ctx, this.save, this.modeCursor);
        break;
      case 'OVERWORLD':
        this.overworld?.render(ctx);
        break;
      case 'DIALOGUE':
        this.overworld?.render(ctx);
        this.dialogue.render(ctx, this.timer);
        break;
      case 'PAUSE_MENU':
        this.overworld?.render(ctx);
        renderPauseMenu(
          ctx,
          this.activeWorld,
          this.getActiveModeSave(),
          this.pauseCursor,
          this.pauseSubView,
          this.pauseSubCursor,
          this.overworld?.getPosition() ?? { x: 30, y: 39 }
        );
        break;
      case 'CHALLENGE':
        this.challengeRunner?.render(ctx);
        break;
      case 'ENDING':
        renderEndingCeremony(
          ctx,
          this.activeModeId,
          this.activeWorld,
          this.getActiveModeSave(),
          this.endingTimer
        );
        break;
    }
  }
}
