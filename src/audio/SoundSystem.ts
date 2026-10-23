/**
 * Web Audio API procedural sound synthesizer for Counter-Strike 1.6 Web3D.
 * 100% synthesized - zero external audio files.
 */

import { WeaponId } from '../types';

export class SoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.8;
  private isMuted: boolean = false;
  private tinnitusOsc: OscillatorNode | null = null;
  private tinnitusGain: GainNode | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.setVolume(this.volume);
    return this.isMuted;
  }

  private createPanner(x: number, y: number, z: number, px: number, py: number, pz: number): PannerNode | null {
    if (!this.ctx || !this.masterGain) return null;
    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 3;
    panner.maxDistance = 60;
    panner.rolloffFactor = 1.2;

    const dx = x - px;
    const dy = y - py;
    const dz = z - pz;
    panner.positionX.setValueAtTime(dx, this.ctx.currentTime);
    panner.positionY.setValueAtTime(dy, this.ctx.currentTime);
    panner.positionZ.setValueAtTime(dz, this.ctx.currentTime);
    panner.connect(this.masterGain);
    return panner;
  }

  // --- Gunshots ---
  public playGunshot(weaponId: WeaponId, isSilenced = false, pos?: [number, number, number], playerPos?: [number, number, number]) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    let dest: AudioNode = this.masterGain;
    if (pos && playerPos) {
      const panner = this.createPanner(pos[0], pos[1], pos[2], playerPos[0], playerPos[1], playerPos[2]);
      if (panner) dest = panner;
    }

    if (weaponId === 'knife') {
      this.playKnifeSlash();
      return;
    }

    // Heavy sniper (AWP)
    if (weaponId === 'awp') {
      this.playAWPShot(t, dest);
      return;
    }

    // Shotgun (M3, XM1014)
    if (weaponId === 'm3' || weaponId === 'xm1014') {
      this.playShotgunBlast(t, dest);
      return;
    }

    // AK47
    if (weaponId === 'ak47') {
      this.playAK47Shot(t, dest);
      return;
    }

    // M4A1 / USP (silenced vs normal)
    if (isSilenced) {
      this.playSilencedShot(t, dest);
      return;
    }

    // Desert Eagle
    if (weaponId === 'deagle') {
      this.playDeagleShot(t, dest);
      return;
    }

    // SMG
    if (weaponId === 'mp5' || weaponId === 'p90' || weaponId === 'mac10' || weaponId === 'tmp' || weaponId === 'ump45') {
      this.playSMGShot(t, dest);
      return;
    }

    // Standard rifle / pistol
    this.playStandardRifleShot(t, dest);
  }

  private playAK47Shot(t: number, dest: AudioNode) {
    if (!this.ctx) return;
    // Transient snap
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snapOsc.type = 'sawtooth';
    snapOsc.frequency.setValueAtTime(380, t);
    snapOsc.frequency.exponentialRampToValueAtTime(60, t + 0.12);
    snapGain.gain.setValueAtTime(0.7, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    snapOsc.connect(snapGain);
    snapGain.connect(dest);
    snapOsc.start(t);
    snapOsc.stop(t + 0.15);

    // Punchy noise body
    this.playNoiseBurst(t, 0.22, 1200, 180, 0.85, dest);

    // Deep sub thump
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, t);
    subOsc.frequency.exponentialRampToValueAtTime(35, t + 0.2);
    subGain.gain.setValueAtTime(0.9, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    subOsc.connect(subGain);
    subGain.connect(dest);
    subOsc.start(t);
    subOsc.stop(t + 0.23);
  }

  private playAWPShot(t: number, dest: AudioNode) {
    if (!this.ctx) return;
    // Massive crack
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.35);
    gain.gain.setValueAtTime(1.0, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.46);

    // Huge booming noise blast
    this.playNoiseBurst(t, 0.6, 2500, 90, 1.0, dest);

    // Sub rumble
    const sub = this.ctx.createOscillator();
    const subG = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, t);
    sub.frequency.exponentialRampToValueAtTime(25, t + 0.7);
    subG.gain.setValueAtTime(1.0, t);
    subG.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
    sub.connect(subG);
    subG.connect(dest);
    sub.start(t);
    sub.stop(t + 0.76);
  }

  private playSilencedShot(t: number, dest: AudioNode) {
    if (!this.ctx) return;
    // Soft muffled tick
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.09);

    // Suppressed puff of air
    this.playNoiseBurst(t, 0.09, 800, 200, 0.3, dest);
  }

  private playDeagleShot(t: number, dest: AudioNode) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.21);

    this.playNoiseBurst(t, 0.25, 2000, 150, 0.8, dest);
  }

  private playShotgunBlast(t: number, dest: AudioNode) {
    if (!this.ctx) return;
    this.playNoiseBurst(t, 0.35, 1800, 100, 0.95, dest);
    const sub = this.ctx.createOscillator();
    const subG = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(160, t);
    sub.frequency.exponentialRampToValueAtTime(30, t + 0.25);
    subG.gain.setValueAtTime(0.85, t);
    subG.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    sub.connect(subG);
    subG.connect(dest);
    sub.start(t);
    sub.stop(t + 0.27);
  }

  private playSMGShot(t: number, dest: AudioNode) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.09);

    this.playNoiseBurst(t, 0.1, 1500, 250, 0.5, dest);
  }

  private playStandardRifleShot(t: number, dest: AudioNode) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.13);

    this.playNoiseBurst(t, 0.16, 1600, 160, 0.65, dest);
  }

  private playNoiseBurst(t: number, duration: number, highCut: number, lowCut: number, volume: number, dest: AudioNode) {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-4 * (i / bufferSize));
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime((highCut + lowCut) / 2, t);
    filter.Q.setValueAtTime(1.2, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noiseSource.start(t);
  }

  public playKnifeSlash() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.12);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  public playKnifeHit(isFlesh = true) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    this.playNoiseBurst(t, 0.15, isFlesh ? 800 : 2800, 100, 0.6, this.masterGain);
  }

  // --- Reload & Actions ---
  public playReload(duration: number) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    // Mag drop click
    this.playClick(t + 0.2, 500, 0.4);
    // Mag insert
    this.playClick(t + duration * 0.55, 750, 0.6);
    // Bolt slide rack
    this.playSlideRack(t + duration * 0.85);
  }

  public playDryFire() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    this.playClick(this.ctx.currentTime, 1200, 0.4);
  }

  public playClick(t: number = 0, freq: number = 1000, vol: number = 0.4) {
    if (!this.ctx || !this.masterGain) return;
    const time = t === 0 ? this.ctx.currentTime : t;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.04);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  private playSlideRack(t: number) {
    if (!this.ctx || !this.masterGain) return;
    this.playNoiseBurst(t, 0.12, 3200, 400, 0.4, this.masterGain);
    this.playClick(t + 0.06, 850, 0.5);
  }

  // --- Footsteps ---
  public playFootstep(surface: 'concrete' | 'wood' | 'metal' | 'sand' | 'snow' = 'concrete', pos?: [number, number, number], playerPos?: [number, number, number]) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    let dest: AudioNode = this.masterGain;
    if (pos && playerPos) {
      const panner = this.createPanner(pos[0], pos[1], pos[2], playerPos[0], playerPos[1], playerPos[2]);
      if (panner) dest = panner;
    }

    const lowFreq = surface === 'wood' ? 120 : surface === 'metal' ? 380 : surface === 'sand' ? 90 : 150;
    const noiseCut = surface === 'metal' ? 3500 : surface === 'wood' ? 700 : surface === 'sand' ? 600 : 1200;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(lowFreq, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.08);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.09);

    this.playNoiseBurst(t, 0.08, noiseCut, 100, 0.25, dest);
  }

  // --- Hit feedback ---
  public playHitmarker() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.setValueAtTime(1800, t + 0.02);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  public playHeadshotDink() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    // High metallic ping
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2600, t);
    osc.frequency.exponentialRampToValueAtTime(1900, t + 0.35);
    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.42);
  }

  // --- C4 Bomb Audio ---
  public playBombBeep(urgency: number = 0, pos?: [number, number, number], playerPos?: [number, number, number]) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    let dest: AudioNode = this.masterGain;
    if (pos && playerPos) {
      const panner = this.createPanner(pos[0], pos[1], pos[2], playerPos[0], playerPos[1], playerPos[2]);
      if (panner) dest = panner;
    }

    const freq = urgency > 0.8 ? 1400 : urgency > 0.5 ? 1100 : 880;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  public playBombDefusing() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    this.playClick(t, 2200, 0.4);
  }

  public playExplosion(pos?: [number, number, number], playerPos?: [number, number, number]) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    let dest: AudioNode = this.masterGain;
    if (pos && playerPos) {
      const panner = this.createPanner(pos[0], pos[1], pos[2], playerPos[0], playerPos[1], playerPos[2]);
      if (panner) dest = panner;
    }

    // Huge sub boom
    const sub = this.ctx.createOscillator();
    const subG = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(90, t);
    sub.frequency.exponentialRampToValueAtTime(20, t + 1.6);
    subG.gain.setValueAtTime(1.0, t);
    subG.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    sub.connect(subG);
    subG.connect(dest);
    sub.start(t);
    sub.stop(t + 1.9);

    // Roaring debris noise
    this.playNoiseBurst(t, 1.8, 1600, 40, 1.0, dest);
  }

  // --- Flashbang Tinnitus & Blindness ---
  public playFlashbang(intensity: number) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    // Bang
    this.playNoiseBurst(t, 0.2, 4000, 500, 0.9, this.masterGain);

    if (intensity < 0.2) return;

    // Sustained high-pitch ear ringing
    if (this.tinnitusOsc) {
      try {
        this.tinnitusOsc.stop();
        this.tinnitusOsc.disconnect();
      } catch {
        // ignore
      }
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(3400, t);

    const dur = 4.0 * intensity;
    gain.gain.setValueAtTime(0.4 * intensity, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.1);

    this.tinnitusOsc = osc;
    this.tinnitusGain = gain;
  }

  public playSmokeDeploy() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    // Pop
    this.playClick(t, 400, 0.5);
    // Hissing gas
    this.playNoiseBurst(t + 0.05, 1.5, 4500, 1200, 0.55, this.masterGain);
  }

  public playSpray() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    // Can rattle
    this.playClick(t, 1800, 0.3);
    this.playClick(t + 0.08, 1600, 0.3);
    // Spray hiss
    this.playNoiseBurst(t + 0.12, 0.6, 5000, 1800, 0.5, this.masterGain);
  }

  public playFlashlight() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    this.playClick(this.ctx.currentTime, 1600, 0.35);
  }

  public playRadioBeep() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1050, t);
    osc.frequency.setValueAtTime(1250, t + 0.04);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // --- Voice Announcer via Web Speech API ---
  public announce(phrase: string, lang: 'en' | 'uz' | 'ru' = 'en') {
    this.playRadioBeep();
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.volume = this.isMuted ? 0 : this.volume;
      utterance.rate = 1.15;
      utterance.pitch = 0.9;
      if (lang === 'ru') {
        utterance.lang = 'ru-RU';
      } else if (lang === 'uz') {
        utterance.lang = 'uz-UZ';
      } else {
        utterance.lang = 'en-US';
      }
      window.speechSynthesis.speak(utterance);
    } catch {
      // Audio speech fallback
    }
  }
}

export const sound = new SoundSystem();
