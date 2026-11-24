import { soundEngine } from './audio/soundEngine';
import { WORLDS } from './data';
import {
  FAMILY_MEMBERS,
  FAMILY_PAIRS,
  GAME_MASTER_LEO,
  MODE_ORDER,
  pickWelcomeMessage,
} from './data/familyAvatars';
import { randomizeGuestsInWorld } from './data/guests';
import { InputManager } from './engine/input';
import { OverworldEngine, RENDER_SCALE, SCREEN_H, SCREEN_W } from './engine/overworld';
import { preloadPortraitUrls } from './engine/pixelRenderer';
import {
  decodeSaveCode,
  encodeSaveCode,
  loadGlobalSave,
  saveGlobalSave,
} from './engine/saveSystem';
import {
  buildSecondaryDialogue,
  formatLoseHelperLine,
  resolveClosestSecondaryForChallenger,
} from './engine/secondaryHints';
import {
  DialogueController,
  DialogueMessage,
  getBadgeSlotRects,
  getModeCardRects,
  getNotebookRowRects,
  getPauseBackButtonRect,
  getPauseMenuPanelRect,
  getPauseOptionRects,
  PAUSE_OPTIONS,
  PauseSubView,
  renderEndingCeremony,
  renderModeSelectScreen,
  renderPauseMenu,
  renderWelcomeScreen,
} from './engine/uiRenderer';
import { ChallengeRunner } from './minigames/challengeRunner';
import {
  ChallengeMistake,
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
  private scene: GameScene = 'WELCOME';
  private welcomeMessage = pickWelcomeMessage();
  private timer = 0;

  private modeCursor = 0;
  private lastHoverCard = -1;
  private activeModeId: ModeId = 'pm';
  private activeWorld: WorldDefinition = WORLDS.pm;
  private overworld: OverworldEngine | null = null;
  private dialogue = new DialogueController();
  private challengeRunner: ChallengeRunner | null = null;

  private pauseCursor = 0;
  private pauseSubView: PauseSubView = 'menu';
  private pauseSubCursor = 0;
  private endingTimer = 0;
  private hintCycleByBadge = new Map<string, number>();

  private lastTimestamp = 0;
  private soundBtnEl: HTMLButtonElement | null = null;
  private shellEl: HTMLElement | null = null;
  private currentShellTheme = '';

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = SCREEN_W * RENDER_SCALE;
    canvas.height = SCREEN_H * RENDER_SCALE;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Impossible d’initialiser le contexte 2D du canvas.');
    }
    context.imageSmoothingEnabled = false;
    this.ctx = context;

    this.save = loadGlobalSave();
    soundEngine.setMuted(this.save.muted);
    preloadPortraitUrls([
      GAME_MASTER_LEO.customPortraitUrl,
      ...Object.values(FAMILY_MEMBERS).map((m) => m.customPortraitUrl),
    ]);

    this.input.attach(canvas, () => soundEngine.unlock());
    this.wireShellControls();
    soundEngine.playBgm('title');
  }

  private wireShellControls(): void {
    if (typeof document === 'undefined') return;

    this.soundBtnEl = document.querySelector<HTMLButtonElement>('#btn-setting-sound');
    const padBtn = document.querySelector<HTMLButtonElement>('#btn-setting-pad');
    const settingSaveBtn = document.querySelector<HTMLButtonElement>('#btn-setting-save');
    const infoBtn = document.querySelector<HTMLButtonElement>('#btn-info');
    const settingsBtn = document.querySelector<HTMLButtonElement>('#btn-settings');
    const infoDialog = document.querySelector<HTMLDialogElement>('#info-dialog');
    const settingsDialog = document.querySelector<HTMLDialogElement>('#settings-dialog');
    const shell = document.querySelector<HTMLElement>('#gba-shell');
    this.shellEl = shell;
    this.syncShellTheme();

    const isTouchDevice = () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    const isPadVisible = () =>
      isTouchDevice()
        ? !shell?.classList.contains('hide-pad')
        : Boolean(shell?.classList.contains('show-pad'));

    const updateSoundLabel = () => {
      if (this.soundBtnEl) {
        this.soundBtnEl.textContent = soundEngine.isMuted() ? 'Coupé (M)' : 'Activé (M)';
      }
    };
    const updatePadLabel = () => {
      if (padBtn) {
        padBtn.textContent = isPadVisible() ? 'Affichée' : 'Masquée';
      }
    };
    updateSoundLabel();
    updatePadLabel();

    infoBtn?.addEventListener('click', () => {
      soundEngine.unlock();
      this.input.clearHeld();
      if (infoDialog && !infoDialog.open) infoDialog.showModal();
    });

    settingsBtn?.addEventListener('click', () => {
      soundEngine.unlock();
      this.input.clearHeld();
      updateSoundLabel();
      updatePadLabel();
      if (settingsDialog && !settingsDialog.open) settingsDialog.showModal();
    });

    this.soundBtnEl?.addEventListener('click', () => {
      soundEngine.unlock();
      this.toggleMute();
      updateSoundLabel();
    });

    padBtn?.addEventListener('click', () => {
      if (isTouchDevice()) {
        shell?.classList.toggle('hide-pad');
      } else {
        shell?.classList.toggle('show-pad');
      }
      updatePadLabel();
    });

    settingSaveBtn?.addEventListener('click', () => {
      settingsDialog?.close();
      this.openSaveDialog();
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
      this.hintCycleByBadge.clear();
      saveGlobalSave(this.save);
      soundEngine.setMuted(this.save.muted);
      updateSoundLabel();
      soundEngine.playBadgeFanfare();
      feedback.textContent = 'Sauvegarde chargée avec succès !';
      feedback.classList.remove('error');
      if (this.scene !== 'MODE_SELECT' && this.scene !== 'WELCOME') {
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
    this.input.clearHeld();
    textarea.value = encodeSaveCode(this.save);
    if (feedback) {
      feedback.textContent = '';
      feedback.classList.remove('error');
    }
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  private syncShellTheme(): void {
    const nextTheme =
      this.scene === 'MODE_SELECT' || this.scene === 'WELCOME' ? 'title' : this.activeModeId;
    if (nextTheme === this.currentShellTheme) return;
    this.currentShellTheme = nextTheme;
    if (this.shellEl) {
      this.shellEl.dataset.theme = nextTheme;
    }
    if (typeof document !== 'undefined' && document.body) {
      document.body.dataset.theme = nextTheme;
    }
  }

  private toggleMute(): void {
    const next = !soundEngine.isMuted();
    soundEngine.setMuted(next);
    this.save.muted = next;
    saveGlobalSave(this.save);
    if (this.soundBtnEl) {
      this.soundBtnEl.textContent = next ? 'Coupé (M)' : 'Activé (M)';
    }
  }

  start(): void {
    this.lastTimestamp = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTimestamp) / 1000));
      this.lastTimestamp = now;
      try {
        this.update(dt);
        this.render();
        this.input.endFrame();
      } catch (err) {
        console.error('Erreur dans la boucle de jeu Noël 2026 :', err);
      } finally {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  private getActiveModeSave(): ModeSaveData {
    return this.save.modes[this.activeModeId];
  }

  private startMode(modeId: ModeId): void {
    this.challengeRunner = null;
    this.activeChallengeNpc = null;
    this.dialogue.start([]);
    this.activeModeId = modeId;
    this.activeWorld = WORLDS[modeId];
    randomizeGuestsInWorld(this.activeWorld);
    preloadPortraitUrls(this.activeWorld.npcs.map((n) => n.customPortraitUrl));
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
    this.syncShellTheme();
    soundEngine.playBgm(this.activeWorld.bgmId);

    // Welcome toast on fresh start
    if (modeSave.badges.length === 0 && modeSave.metNpcs.length === 0) {
      const companions =
        pair.members.length >= 3
          ? `${pair.members[1].name} et ${pair.members[2].name}`
          : pair.members[1].name;
      this.dialogue.start([
        {
          speaker: pair.members[0].name,
          text: `Bienvenue à ${this.activeWorld.worldName}, ${companions} ! Collectons les 12 badges pour défier le Boss Final !`,
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
        customPortraitUrl: gk?.customPortraitUrl,
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

    if (npc.role === 'guest') {
      const lines = (npc.fixedLines ?? ['Bonjour !']).map((text) => ({
        speaker: npc.name,
        text,
        appearance: npc.appearance,
        portrait: npc.portrait,
        customPortraitUrl: npc.customPortraitUrl,
        voicePitch: npc.voicePitch,
      }));
      this.dialogue.start(lines);
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
              customPortraitUrl: npc.customPortraitUrl,
              voicePitch: npc.voicePitch,
            },
          ]);
          this.scene = 'DIALOGUE';
        } else {
          this.handleLockedGate(gate);
        }
      } else {
        this.dialogue.start([
          {
            speaker: npc.name,
            text: 'Poursuivez votre route vers le nord pour relever les prochains défis !',
            appearance: npc.appearance,
            portrait: npc.portrait,
            customPortraitUrl: npc.customPortraitUrl,
            voicePitch: npc.voicePitch,
          },
        ]);
        this.scene = 'DIALOGUE';
      }
      return;
    }

    if (npc.role === 'secondary') {
      const probe = buildSecondaryDialogue(npc, this.activeWorld, modeSave, 0);
      const cycleKey = probe.targetBadgeId ? `${this.activeModeId}:${probe.targetBadgeId}` : '';
      const cycleIdx = cycleKey ? (this.hintCycleByBadge.get(cycleKey) ?? 0) : 0;
      const result = buildSecondaryDialogue(npc, this.activeWorld, modeSave, cycleIdx);
      if (result.isMistakeHint && cycleKey) {
        this.hintCycleByBadge.set(cycleKey, cycleIdx + 1);
      }
      this.dialogue.start(
        result.messages.map((text) => ({
          speaker: npc.name,
          text,
          appearance: npc.appearance,
          portrait: npc.portrait,
          customPortraitUrl: npc.customPortraitUrl,
          voicePitch: npc.voicePitch,
        }))
      );
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
            customPortraitUrl: npc.customPortraitUrl,
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
        customPortraitUrl: npc.customPortraitUrl,
        voicePitch: npc.voicePitch,
      }));
      this.dialogue.start(introMsgs, () => {
        this.launchChallenge(npc);
      });
      this.scene = 'DIALOGUE';
    }
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

    const helperSec = resolveClosestSecondaryForChallenger(npc, this.activeWorld);
    const loseHelperTip = helperSec
      ? { helperName: helperSec.name, speechLine: formatLoseHelperLine(helperSec) }
      : undefined;

    this.challengeRunner = new ChallengeRunner(
      npc,
      badge,
      pair.members,
      0,
      npc.challenge,
      () => {
        modeSave.attempts++;
        saveGlobalSave(this.save);
      },
      (mistakes: ChallengeMistake[]) => {
        if (npc.role === 'main' && npc.badgeId && mistakes.length > 0) {
          if (!modeSave.failedMistakes) {
            modeSave.failedMistakes = {};
          }
          modeSave.failedMistakes[npc.badgeId] = mistakes.slice(0, 5);
          this.hintCycleByBadge.delete(`${this.activeModeId}:${npc.badgeId}`);
          saveGlobalSave(this.save);
        }
      },
      loseHelperTip
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
      case 'WELCOME': {
        const tap = this.input.consumeTap();
        if (
          this.input.justPressed('a') ||
          this.input.justPressed('b') ||
          this.input.justPressed('menu') ||
          tap
        ) {
          soundEngine.playConfirm();
          this.scene = 'MODE_SELECT';
        }
        break;
      }

      case 'MODE_SELECT': {
        const hover = this.input.getCanvasHover();
        if (hover) {
          const rects = getModeCardRects();
          const hIdx = rects.findIndex(
            (r) => hover.x >= r.x && hover.x <= r.x + r.w && hover.y >= r.y && hover.y <= r.y + r.h
          );
          if (hIdx !== -1 && hIdx !== this.lastHoverCard) {
            this.lastHoverCard = hIdx;
            if (this.modeCursor !== hIdx) {
              this.modeCursor = hIdx;
              soundEngine.playSelect();
            }
          } else if (hIdx === -1) {
            this.lastHoverCard = -1;
          }
        }
        if (this.input.justPressed('left')) {
          const leftMap = [1, 0, 4, 2, 3];
          this.modeCursor = leftMap[this.modeCursor] ?? 0;
          soundEngine.playSelect();
        } else if (this.input.justPressed('right')) {
          const rightMap = [1, 0, 3, 4, 2];
          this.modeCursor = rightMap[this.modeCursor] ?? 0;
          soundEngine.playSelect();
        } else if (this.input.justPressed('up') || this.input.justPressed('down')) {
          const vertMap = [2, 4, 0, 0, 1];
          this.modeCursor = vertMap[this.modeCursor] ?? 0;
          soundEngine.playSelect();
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
    if (npc.badgeId && modeSave.failedMistakes?.[npc.badgeId]) {
      delete modeSave.failedMistakes[npc.badgeId];
      if (Object.keys(modeSave.failedMistakes).length === 0) {
        delete modeSave.failedMistakes;
      }
      this.hintCycleByBadge.delete(`${this.activeModeId}:${npc.badgeId}`);
    }
    saveGlobalSave(this.save);
    soundEngine.playBgm(this.activeWorld.bgmId);

    // Trigger duo reaction (attributing speaker & portrait accurately) + gate unlock reminder!
    const pair = FAMILY_PAIRS[this.activeModeId];
    const [mA, mB] = pair.members;
    const msgs: DialogueMessage[] = [];
    if (npc.duoWinReaction) {
      let speakerName = mB.name;
      let speakerMember = mB;
      let text = npc.duoWinReaction.trim();
      const stripOuterQuotes = (s: string) =>
        s.startsWith('«') && s.endsWith('»') ? s.slice(1, -1).trim() : s;

      const legacyDuoPrefix = `${mA.name} & ${mB.name} :`;
      if (text.startsWith(`${pair.label} :`)) {
        speakerName = pair.label;
        speakerMember = mA;
        text = stripOuterQuotes(text.slice(`${pair.label} :`.length).trim());
      } else if (text.startsWith(legacyDuoPrefix)) {
        speakerName = pair.label;
        speakerMember = mA;
        text = stripOuterQuotes(text.slice(legacyDuoPrefix.length).trim());
      } else if (text.startsWith(`${mA.name} :`)) {
        speakerName = mA.name;
        speakerMember = mA;
        text = stripOuterQuotes(text.slice(`${mA.name} :`.length).trim());
      } else if (text.startsWith(`${mB.name} :`)) {
        speakerName = mB.name;
        speakerMember = mB;
        text = stripOuterQuotes(text.slice(`${mB.name} :`.length).trim());
      } else if (pair.members[2] && text.startsWith(`${pair.members[2].name} :`)) {
        speakerName = pair.members[2].name;
        speakerMember = pair.members[2];
        text = stripOuterQuotes(text.slice(`${pair.members[2].name} :`.length).trim());
      }

      msgs.push({
        speaker: speakerName,
        text,
        appearance: speakerMember.appearance,
        portrait: speakerMember.portrait,
        customPortraitUrl: speakerMember.customPortraitUrl,
        voicePitch: speakerMember.voicePitch,
      });
    }
    if (modeSave.badges.length === 4 || modeSave.badges.length === 8 || modeSave.badges.length === 12) {
      soundEngine.playGateOpen();
      const targetMsg =
        modeSave.badges.length === 12
          ? 'Tous les 12 badges sont réunis ! La porte du Boss Final au tout nord est désormais ouverte !'
          : `Super ! Avec ${modeSave.badges.length} badges, le prochain quartier au nord est débloqué !`;
      msgs.push({
        speaker: mA.name,
        text: targetMsg,
        appearance: mA.appearance,
        portrait: mA.portrait,
        customPortraitUrl: mA.customPortraitUrl,
        voicePitch: mA.voicePitch,
      });
    }

    if (msgs.length > 0) {
      this.dialogue.start(msgs);
      this.scene = 'DIALOGUE';
    } else {
      this.scene = 'OVERWORLD';
    }
  }

  private activatePauseOption(idx: number): void {
    soundEngine.playConfirm();
    switch (idx) {
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
        this.openSaveDialog();
        break;
      case 4:
        saveGlobalSave(this.save);
        soundEngine.playBgm('title');
        this.scene = 'MODE_SELECT';
        break;
    }
  }

  private getWorldMapPlayerPos(): { x: number; y: number } {
    const pos = this.overworld?.getPosition();
    if (!pos) return { x: this.activeWorld.spawnX, y: this.activeWorld.spawnY };
    if (pos.mapId !== this.activeWorld.overworldId) {
      const b = this.activeWorld.buildings.find((bld) => bld.interiorMapId === pos.mapId);
      if (b) return { x: b.doorX, y: b.doorY };
    }
    return { x: pos.x, y: pos.y };
  }

  private updatePauseMenu(): void {
    const hitRect = (pt: { x: number; y: number }, r: { x: number; y: number; w: number; h: number }) =>
      pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h;

    if (this.pauseSubView === 'menu') {
      const optRects = getPauseOptionRects();
      const hover = this.input.getCanvasHover();
      if (hover) {
        const hIdx = optRects.findIndex((r) => hitRect(hover, r));
        if (hIdx !== -1 && hIdx !== this.pauseCursor) {
          this.pauseCursor = hIdx;
          soundEngine.playSelect();
        }
      }

      if (this.input.justPressed('up')) {
        this.pauseCursor = (this.pauseCursor + PAUSE_OPTIONS.length - 1) % PAUSE_OPTIONS.length;
        soundEngine.playSelect();
      } else if (this.input.justPressed('down')) {
        this.pauseCursor = (this.pauseCursor + 1) % PAUSE_OPTIONS.length;
        soundEngine.playSelect();
      } else if (this.input.justPressed('b') || this.input.justPressed('menu')) {
        soundEngine.playCancel();
        this.scene = 'OVERWORLD';
      } else if (this.input.justPressed('a')) {
        this.activatePauseOption(this.pauseCursor);
      } else {
        const tap = this.input.consumeTap();
        if (tap) {
          const hitIdx = optRects.findIndex((r) => hitRect(tap, r));
          if (hitIdx !== -1) {
            this.pauseCursor = hitIdx;
            this.activatePauseOption(hitIdx);
          } else if (!hitRect(tap, getPauseMenuPanelRect())) {
            soundEngine.playCancel();
            this.scene = 'OVERWORLD';
          }
        }
      }
      return;
    }

    if (this.input.justPressed('b') || this.input.justPressed('menu')) {
      soundEngine.playCancel();
      this.pauseSubView = 'menu';
      return;
    }

    const backRect = getPauseBackButtonRect();
    const tap = this.input.consumeTap();

    if (this.pauseSubView === 'badges') {
      const total = this.activeWorld.badges.length + 1;
      const slots = getBadgeSlotRects(total);
      if (tap) {
        if (hitRect(tap, backRect)) {
          soundEngine.playCancel();
          this.pauseSubView = 'menu';
          return;
        }
        const hitSlot = slots.findIndex((r) => hitRect(tap, r));
        if (hitSlot !== -1) {
          if (this.pauseSubCursor !== hitSlot) {
            this.pauseSubCursor = hitSlot;
            soundEngine.playSelect();
          }
          return;
        }
      }
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
      if (tap) {
        if (hitRect(tap, backRect)) {
          soundEngine.playCancel();
          this.pauseSubView = 'menu';
          return;
        }
        const rows = getNotebookRowRects(entries.length, this.pauseSubCursor);
        const hitRow = rows.find((r) => hitRect(tap, r));
        if (hitRow) {
          if (this.pauseSubCursor !== hitRow.index) {
            this.pauseSubCursor = hitRow.index;
            soundEngine.playSelect();
          }
          return;
        }
      }
      if (this.input.justPressed('down') || this.input.justPressed('right')) {
        this.pauseSubCursor = (this.pauseSubCursor + 1) % entries.length;
        soundEngine.playSelect();
      } else if (this.input.justPressed('up') || this.input.justPressed('left')) {
        this.pauseSubCursor = (this.pauseSubCursor + entries.length - 1) % entries.length;
        soundEngine.playSelect();
      }
    } else if (this.pauseSubView === 'map') {
      if (tap) {
        soundEngine.playCancel();
        this.pauseSubView = 'menu';
      }
    }
  }

  private render(): void {
    this.syncShellTheme();
    const ctx = this.ctx;
    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);

    switch (this.scene) {
      case 'WELCOME':
        renderWelcomeScreen(ctx, this.welcomeMessage, this.timer);
        break;
      case 'MODE_SELECT':
        renderModeSelectScreen(ctx, this.save, this.modeCursor, this.timer);
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
          this.getWorldMapPlayerPos()
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
