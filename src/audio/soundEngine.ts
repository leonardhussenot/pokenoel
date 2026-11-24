export type BgmTrackId =
  | 'title'
  | 'world_pm'
  | 'world_df'
  | 'world_jp'
  | 'world_aj'
  | 'world_sd'
  | 'battle'
  | 'boss'
  | 'victory';

interface TrackDef {
  stepMs: number;
  leadWave: OscillatorType;
  bassWave: OscillatorType;
  arpWave: OscillatorType;
  lead: (number | null)[];
  bass: (number | null)[];
  arp: (number | null)[];
  perc: (0 | 1 | 2 | 3)[]; // 0=none, 1=hat/shaker, 2=snare, 3=kick
}

// Helper: MIDI note to frequency
function m(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Note constants for crisp, readable chiptune compositions
const R = null;
const C3 = m(48), D3 = m(50), E3 = m(52), F3 = m(53), Fs3 = m(54), G3 = m(55), A3 = m(57), Bb3 = m(58), B3 = m(59);
const C4 = m(60), Cs4 = m(61), D4 = m(62), E4 = m(64), F4 = m(65), Fs4 = m(66), G4 = m(67), Ab4 = m(68), A4 = m(69), Bb4 = m(70), B4 = m(71);
const C5 = m(72), Cs5 = m(73), D5 = m(74), Eb5 = m(75), E5 = m(76), F5 = m(77), Fs5 = m(78), G5 = m(79), Ab5 = m(80), A5 = m(81), Bb5 = m(82), B5 = m(83);
const C6 = m(84);

const TRACKS: Record<BgmTrackId, TrackDef> = {
  // Bright festive GBA adventure theme
  title: {
    stepMs: 145,
    leadWave: 'square',
    bassWave: 'triangle',
    arpWave: 'triangle',
    lead: [
      G4, C5, E5, G5, E5, R, G5, A5,
      G5, F5, E5, D5, E5, R, C5, R,
      D5, G5, B5, G5, F5, E5, D5, B4,
      C5, E5, G5, C6, G5, R, R, R,
    ],
    bass: [
      C3, R, G3, R, C3, R, G3, R,
      F3, R, C4, R, G3, R, C3, R,
      G3, R, D3, R, G3, R, G3, R,
      C3, R, E3, R, C3, R, R, R,
    ],
    arp: [
      E4, G4, C5, G4, E4, G4, C5, G4,
      F4, A4, C5, A4, G4, B4, D5, B4,
      G4, B4, D5, B4, G4, B4, D5, F4,
      E4, G4, C5, E5, C5, G4, E4, R,
    ],
    perc: [
      3, 0, 1, 0, 2, 0, 1, 1,
      3, 0, 1, 0, 2, 0, 1, 0,
      3, 0, 1, 0, 2, 0, 1, 1,
      3, 1, 2, 1, 3, 0, 0, 0,
    ],
  },

  // Mode PM: Baroque harpsichord / classical theater elegance (D minor -> F major)
  world_pm: {
    stepMs: 165,
    leadWave: 'square',
    bassWave: 'triangle',
    arpWave: 'square',
    lead: [
      D5, R, A4, D5, F5, E5, D5, Cs5,
      D5, E5, F5, G5, A5, R, F5, R,
      G5, F5, E5, D5, C5, Bb4, A4, G4,
      A4, D5, Cs5, E5, D5, R, R, R,
    ],
    bass: [
      D3, R, A3, R, D3, R, A3, R,
      Bb3, R, F3, R, F3, R, C4, R,
      G3, R, C3, R, F3, R, Bb3, R,
      A3, R, A3, R, D3, R, R, R,
    ],
    arp: [
      F4, A4, D5, A4, F4, A4, E4, A4,
      D4, F4, Bb4, F4, C4, F4, A4, F4,
      D4, G4, Bb4, G4, C4, E4, G4, E4,
      E4, A4, Cs5, A4, D4, F4, A4, R,
    ],
    perc: [
      1, 0, 0, 1, 0, 0, 1, 0,
      1, 0, 0, 1, 0, 0, 1, 0,
      1, 0, 0, 1, 0, 0, 1, 0,
      1, 0, 1, 0, 1, 0, 0, 0,
    ],
  },

  // Mode DF: Syncopated Bossa Nova & Rio-Hollywood Jazz
  world_df: {
    stepMs: 140,
    leadWave: 'triangle',
    bassWave: 'triangle',
    arpWave: 'square',
    lead: [
      E5, R, D5, E5, R, G5, R, E5,
      D5, R, C5, D5, R, E5, R, R,
      F5, R, E5, D5, R, B4, C5, D5,
      E5, R, G5, R, E5, D5, C5, R,
    ],
    bass: [
      C3, R, R, G3, C3, R, R, G3,
      A3, R, R, E3, A3, R, R, E3,
      D3, R, R, A3, G3, R, R, D3,
      C3, R, R, G3, C3, R, G3, R,
    ],
    arp: [
      B4, E4, G4, R, B4, E4, R, G4,
      G4, C4, E4, R, G4, C4, R, E4,
      C5, F4, A4, R, B4, F4, G4, R,
      B4, E4, G4, R, B4, G4, E4, R,
    ],
    // Classic bossa clave + shaker feel
    perc: [
      3, 1, 1, 2, 1, 1, 2, 1,
      3, 1, 2, 1, 1, 2, 1, 1,
      3, 1, 1, 2, 1, 1, 2, 1,
      3, 1, 2, 1, 3, 1, 2, 0,
    ],
  },

  // Mode JP: French Café Musette Waltz (3/4 feel over 24 steps)
  world_jp: {
    stepMs: 160,
    leadWave: 'square',
    bassWave: 'triangle',
    arpWave: 'triangle',
    lead: [
      G4, C5, E5, G5, E5, C5,
      F5, D5, B4, G4, R, R,
      A4, C5, E5, A5, G5, F5,
      E5, D5, C5, D5, R, R,
    ],
    bass: [
      C3, R, R, C3, R, R,
      G3, R, R, G3, R, R,
      F3, R, R, D3, R, R,
      G3, R, R, G3, R, R,
    ],
    arp: [
      R, E4, G4, R, E4, G4,
      R, D4, B4, R, D4, B4,
      R, F4, A4, R, F4, A4,
      R, E4, G4, R, D4, B4,
    ],
    perc: [
      3, 1, 1, 3, 1, 1,
      3, 1, 1, 3, 1, 1,
      3, 1, 1, 3, 1, 1,
      3, 1, 1, 3, 2, 0,
    ],
  },

  // Mode AJ: Energetic 140 BPM Stadium Synth
  world_aj: {
    stepMs: 108,
    leadWave: 'square',
    bassWave: 'sawtooth',
    arpWave: 'square',
    lead: [
      E5, R, E5, G5, A5, R, G5, E5,
      D5, R, D5, E5, G5, R, E5, D5,
      C5, R, C5, D5, E5, G5, A5, B5,
      C6, R, B5, A5, G5, R, E5, R,
    ],
    bass: [
      A3, A3, R, A3, A3, R, G3, A3,
      G3, G3, R, G3, G3, R, E3, G3,
      F3, F3, R, F3, F3, R, G3, G3,
      A3, A3, R, G3, E3, R, A3, R,
    ],
    arp: [
      C4, E4, A4, E4, C4, E4, A4, E4,
      B3, D4, G4, D4, B3, D4, G4, D4,
      A3, C4, F4, C4, B3, D4, G4, D4,
      C4, E4, A4, G4, E4, B3, E4, R,
    ],
    perc: [
      3, 1, 2, 1, 3, 1, 2, 1,
      3, 1, 2, 1, 3, 1, 2, 1,
      3, 1, 2, 1, 3, 1, 2, 2,
      3, 1, 2, 1, 3, 3, 2, 1,
    ],
  },

  // Mode SD: Stylish Synth-Noir & Cyberpunk Manga Detective groove (A minor / C major)
  world_sd: {
    stepMs: 128,
    leadWave: 'triangle',
    bassWave: 'sawtooth',
    arpWave: 'square',
    lead: [
      E5, R, Eb5, E5, G5, R, E5, R,
      D5, R, C5, B4, A4, R, E5, R,
      F5, R, E5, D5, C5, R, B4, C5,
      E5, R, D5, B4, A4, R, R, R,
    ],
    bass: [
      A3, R, A3, R, G3, R, E3, R,
      F3, R, F3, R, E3, R, E3, R,
      D3, R, D3, R, C3, R, B3, R,
      E3, R, E3, G3, A3, R, E3, R,
    ],
    arp: [
      C4, E4, A4, E4, B3, E4, G4, E4,
      A3, C4, F4, C4, B3, E4, G4, E4,
      A3, D4, F4, D4, G3, C4, E4, C4,
      B3, E4, Ab4, E4, C4, E4, A4, R,
    ],
    perc: [
      3, 1, 0, 1, 2, 1, 1, 0,
      3, 1, 0, 1, 2, 0, 1, 1,
      3, 1, 0, 1, 2, 1, 1, 0,
      3, 1, 2, 1, 3, 0, 2, 1,
    ],
  },

  // Battle: Fast driving GBA Gym Leader confrontation
  battle: {
    stepMs: 105,
    leadWave: 'square',
    bassWave: 'sawtooth',
    arpWave: 'square',
    lead: [
      E5, Eb5, E5, G5, E5, D5, C5, B4,
      E5, Eb5, E5, A5, G5, Fs5, G5, R,
      C5, B4, C5, E5, D5, C5, B4, A4,
      B4, D5, Fs5, A5, G5, Fs5, E5, R,
    ],
    bass: [
      E3, E4, E3, E4, E3, E4, E3, E4,
      E3, E4, E3, E4, D3, D4, G3, G4,
      C3, C4, C3, C4, A3, A4, A3, A4,
      B3, B4, B3, B4, E3, E4, E3, R,
    ],
    arp: [
      G4, B4, E5, B4, G4, B4, E5, B4,
      G4, B4, E5, B4, Fs4, A4, D5, A4,
      E4, G4, C5, G4, E4, A4, C5, A4,
      Fs4, B4, Eb5, B4, G4, B4, E5, R,
    ],
    perc: [
      3, 1, 2, 1, 3, 3, 2, 1,
      3, 1, 2, 1, 3, 1, 2, 2,
      3, 1, 2, 1, 3, 3, 2, 1,
      3, 2, 2, 1, 3, 1, 2, 2,
    ],
  },

  // Boss: Dramatic Champion finale tempo
  boss: {
    stepMs: 92,
    leadWave: 'sawtooth',
    bassWave: 'square',
    arpWave: 'square',
    lead: [
      D5, R, D5, F5, A5, R, Ab5, G5,
      F5, E5, D5, F5, E5, R, Cs5, A4,
      Bb4, R, D5, F5, G5, R, Bb5, A5,
      G5, F5, E5, D5, Cs5, E5, A5, R,
    ],
    bass: [
      D3, D3, D4, D3, D3, D4, C3, C4,
      Bb3, Bb3, Bb3, Bb3, A3, A3, A3, A3,
      G3, G3, G4, G3, E3, E3, E4, E3,
      A3, A3, A4, A3, A3, Cs4, A3, R,
    ],
    arp: [
      F4, A4, D5, A4, F4, A4, E4, G4,
      D4, F4, Bb4, F4, E4, A4, Cs5, A4,
      D4, G4, Bb4, G4, C4, E4, G4, E4,
      E4, A4, Cs5, A4, E4, A4, Cs5, A4,
    ],
    perc: [
      3, 1, 2, 3, 3, 1, 2, 1,
      3, 1, 2, 3, 3, 2, 2, 2,
      3, 1, 2, 3, 3, 1, 2, 1,
      3, 2, 2, 3, 2, 2, 2, 1,
    ],
  },

  // Victory: Hall of Fame + subtle Christmas chime motif ("We Wish You / Jingle")
  victory: {
    stepMs: 155,
    leadWave: 'square',
    bassWave: 'triangle',
    arpWave: 'triangle',
    lead: [
      D5, G5, G5, A5, G5, Fs5, E5, E5,
      E5, A5, A5, B5, A5, G5, Fs5, D5,
      D5, B5, B5, C6, B5, A5, G5, E5,
      D5, D5, E5, A5, Fs5, G5, R, R,
    ],
    bass: [
      G3, R, D3, R, G3, R, B3, R,
      C3, R, A3, R, D3, R, Fs3, R,
      G3, R, E3, R, C3, R, A3, R,
      D3, R, D3, R, G3, R, D3, R,
    ],
    arp: [
      B4, D5, G5, D5, B4, D5, G5, D5,
      C5, E5, A5, E5, D5, Fs5, A5, Fs5,
      B4, D5, G5, D5, C5, E5, G5, E5,
      A4, D5, Fs5, D5, B4, D5, G5, R,
    ],
    perc: [
      3, 0, 1, 0, 2, 0, 1, 0,
      3, 0, 1, 0, 2, 0, 1, 0,
      3, 0, 1, 0, 2, 0, 1, 1,
      3, 1, 2, 1, 3, 0, 1, 0,
    ],
  },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private currentTrack: BgmTrackId | null = null;
  private stepIndex = 0;
  private timerId: number | null = null;
  private unlocked = false;

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.24, this.ctx.currentTime, 0.02);
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  unlock(): void {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 0.24;
        this.masterGain.connect(this.ctx.destination);
        this.noiseBuffer = this.buildNoiseBuffer(this.ctx);
      } catch {
        return;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.unlocked = true;
    if (this.currentTrack && this.timerId === null) {
      this.startLoop(this.currentTrack);
    }
  }

  private buildNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 0.25);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  playBgm(track: BgmTrackId): void {
    if (this.currentTrack === track && this.timerId !== null) return;
    this.currentTrack = track;
    this.stepIndex = 0;
    this.stopLoop();
    if (this.unlocked || (this.ctx && this.ctx.state === 'running')) {
      this.startLoop(track);
    }
  }

  stopBgm(): void {
    this.currentTrack = null;
    this.stopLoop();
  }

  private stopLoop(): void {
    if (this.timerId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private startLoop(trackId: BgmTrackId): void {
    if (typeof window === 'undefined') return;
    const track = TRACKS[trackId];
    this.stopLoop();
    this.tickTrack(track);
    this.timerId = window.setInterval(() => {
      if (this.currentTrack === trackId) {
        this.tickTrack(track);
      }
    }, track.stepMs);
  }

  private tickTrack(track: TrackDef): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') {
      this.stepIndex = (this.stepIndex + 1) % track.lead.length;
      return;
    }
    const i = this.stepIndex % track.lead.length;
    const dur = (track.stepMs / 1000) * 0.85;

    const leadFreq = track.lead[i];
    if (leadFreq) {
      this.triggerOsc(leadFreq, dur, track.leadWave, 0.14);
    }
    const bassFreq = track.bass[i];
    if (bassFreq) {
      this.triggerOsc(bassFreq, dur * 1.05, track.bassWave, 0.15);
    }
    const arpFreq = track.arp[i];
    if (arpFreq) {
      this.triggerOsc(arpFreq, dur * 0.65, track.arpWave, 0.06);
    }
    const perc = track.perc[i];
    if (perc === 1) {
      this.triggerNoise(0.035, 0.04, 4200);
    } else if (perc === 2) {
      this.triggerNoise(0.08, 0.08, 1600);
    } else if (perc === 3) {
      this.triggerKick();
    }

    this.stepIndex = (this.stepIndex + 1) % track.lead.length;
  }

  private triggerOsc(freq: number, dur: number, type: OscillatorType, gainVal: number, startOffset = 0): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime + startOffset;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + Math.max(0.025, dur));
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + Math.max(0.03, dur + 0.01));
  }

  private triggerKick(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.08);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private triggerNoise(dur: number, gainVal: number, highpassHz: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpassHz;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + dur + 0.01);
  }

  // ---- SFX API ----

  playNote(freq: number, dur = 0.16, wave: OscillatorType = 'square'): void {
    this.unlock();
    this.triggerOsc(freq, dur, wave, 0.22);
  }

  playStep(): void {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    this.triggerNoise(0.025, 0.03, 900);
  }

  playBump(): void {
    this.unlock();
    this.triggerOsc(110, 0.08, 'triangle', 0.2);
  }

  playBlip(pitch = 520): void {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    this.triggerOsc(pitch, 0.035, 'square', 0.09);
  }

  playSelect(): void {
    this.unlock();
    this.triggerOsc(660, 0.045, 'square', 0.12);
  }

  playConfirm(): void {
    this.unlock();
    this.triggerOsc(587.3, 0.06, 'square', 0.16, 0);
    this.triggerOsc(880, 0.1, 'square', 0.16, 0.055);
  }

  playCancel(): void {
    this.unlock();
    this.triggerOsc(392, 0.06, 'triangle', 0.16, 0);
    this.triggerOsc(261.6, 0.09, 'triangle', 0.16, 0.05);
  }

  playDoor(): void {
    this.unlock();
    this.triggerOsc(330, 0.05, 'triangle', 0.16, 0);
    this.triggerOsc(494, 0.07, 'triangle', 0.16, 0.05);
    this.triggerOsc(659, 0.09, 'triangle', 0.14, 0.1);
  }

  playSwap(): void {
    this.unlock();
    this.triggerOsc(523.25, 0.05, 'square', 0.15, 0);
    this.triggerOsc(783.99, 0.08, 'square', 0.15, 0.045);
  }

  playGateOpen(): void {
    this.unlock();
    [392, 493.9, 587.3, 784].forEach((f, idx) => {
      this.triggerOsc(f, 0.12, 'square', 0.18, idx * 0.08);
    });
  }

  playHitGood(): void {
    this.unlock();
    this.triggerOsc(659.25, 0.08, 'square', 0.18, 0);
    this.triggerOsc(880, 0.11, 'square', 0.16, 0.04);
  }

  playHitPerfect(): void {
    this.unlock();
    this.triggerOsc(783.99, 0.07, 'square', 0.2, 0);
    this.triggerOsc(1046.5, 0.12, 'square', 0.2, 0.045);
  }

  playHitMiss(): void {
    this.unlock();
    this.triggerOsc(196, 0.1, 'sawtooth', 0.18, 0);
    this.triggerOsc(146.8, 0.14, 'sawtooth', 0.16, 0.07);
  }

  playCountdown(finalGo = false): void {
    this.unlock();
    this.triggerOsc(finalGo ? 987.8 : 493.9, finalGo ? 0.18 : 0.09, 'square', 0.18);
  }

  playBossHit(): void {
    this.unlock();
    this.triggerOsc(523.25, 0.07, 'sawtooth', 0.22, 0);
    this.triggerOsc(783.99, 0.08, 'square', 0.2, 0.06);
    this.triggerOsc(1046.5, 0.18, 'square', 0.22, 0.12);
  }

  playBadgeFanfare(): void {
    this.unlock();
    const notes = [523.25, 659.25, 783.99, 1046.5, 987.77, 1046.5, 1318.5];
    const times = [0, 0.11, 0.22, 0.34, 0.5, 0.62, 0.76];
    notes.forEach((f, idx) => {
      this.triggerOsc(f, idx === notes.length - 1 ? 0.36 : 0.11, 'square', 0.22, times[idx]);
      this.triggerOsc(f * 0.5, idx === notes.length - 1 ? 0.36 : 0.11, 'triangle', 0.18, times[idx]);
    });
  }

  playDefeat(): void {
    this.unlock();
    [392, 349.2, 311.1, 261.6].forEach((f, idx) => {
      this.triggerOsc(f, 0.16, 'sawtooth', 0.16, idx * 0.12);
    });
  }
}

export const soundEngine = new SoundEngine();
