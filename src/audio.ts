import { config } from './config';

/**
 * All sound is synthesized with the Web Audio API - no audio files to host
 * or license, which matters on a monetized channel. Muted unless
 * `?sound=1` is set, since OBS' "Control audio via OBS" checkbox is how a
 * streamer should actually manage levels.
 *
 * Everything routes through one master gain so a stream can be ducked or
 * faded from a single place.
 */
class SfxEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private ambientGain: GainNode | null = null;
  private ambientTarget = 0;

  private ensureContext(): AudioContext | null {
    if (!config.sound) return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.noiseBuffer = this.buildNoiseBuffer(this.ctx);

      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(this.ctx.destination);

      this.startAmbience();

      // Browsers suspend audio until a gesture. In OBS there is never one,
      // so also retry on a timer - the source usually starts unmuted there.
      const resume = () => void this.ctx?.resume();
      window.addEventListener('pointerdown', resume, { once: true });
      window.addEventListener('keydown', resume, { once: true });
      window.setInterval(resume, 5000);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private buildNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /** Low, continuous rumble under everything - the distant-battlefield bed
   * that keeps silence from feeling like the stream has frozen. */
  private startAmbience(): void {
    const ctx = this.ctx!;
    if (!this.noiseBuffer || !this.master) return;

    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 190;

    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0.05;

    source.connect(lowpass).connect(this.ambientGain).connect(this.master);
    source.start();
  }

  /** 0..1 - how heavy the fighting is right now. Swells the ambient bed so
   * a busy market audibly sounds busier. */
  setIntensity(value: number): void {
    this.ambientTarget = Math.min(1, Math.max(0, value));
    if (!this.ctx || !this.ambientGain) return;
    this.ambientGain.gain.setTargetAtTime(
      0.035 + this.ambientTarget * 0.075,
      this.ctx.currentTime,
      1.5,
    );
  }

  /** Per-voice gain routed into the master bus. */
  private bus(ctx: AudioContext, level: number): GainNode {
    const gain = ctx.createGain();
    gain.gain.value = level;
    gain.connect(this.master ?? ctx.destination);
    return gain;
  }

  /** Deep boom plus a noise crack, scaled by liquidation magnitude (0..1+). */
  explosion(magnitude: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const m = Math.min(1.4, Math.max(0.2, magnitude));
    const now = ctx.currentTime;
    const out = this.bus(ctx, 0.22 * m);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120 * m + 40, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.35);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(1, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(oscGain).connect(out);
    osc.start(now);
    osc.stop(now + 0.55);

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 1800;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    noise.connect(noiseFilter).connect(noiseGain).connect(out);
    noise.start(now);
    noise.stop(now + 0.3);
  }

  /** Short bright chime for milestones. */
  milestone(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.bus(ctx, 0.12);
    [880, 1320, 1760].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = now + i * 0.07;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.5, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
      osc.connect(gain).connect(out);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  }

  /** Rising sweep that lands on a hit - the sting under a banner. */
  sting(intensity: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const m = Math.min(1, Math.max(0.3, intensity));
    const now = ctx.currentTime;
    const out = this.bus(ctx, 0.2 + m * 0.16);

    // Riser: filtered noise sweeping upward for ~0.4s.
    const riser = ctx.createBufferSource();
    riser.buffer = this.noiseBuffer;
    const sweep = ctx.createBiquadFilter();
    sweep.type = 'bandpass';
    sweep.Q.value = 4;
    sweep.frequency.setValueAtTime(320, now);
    sweep.frequency.exponentialRampToValueAtTime(3600, now + 0.42);
    const riserGain = ctx.createGain();
    riserGain.gain.setValueAtTime(0.001, now);
    riserGain.gain.exponentialRampToValueAtTime(0.5, now + 0.4);
    riserGain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
    riser.connect(sweep).connect(riserGain).connect(out);
    riser.start(now);
    riser.stop(now + 0.65);

    // Impact on the downbeat.
    const hit = now + 0.42;
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(150, hit);
    sub.frequency.exponentialRampToValueAtTime(38, hit + 0.5);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(1, hit);
    subGain.gain.exponentialRampToValueAtTime(0.001, hit + 0.75);
    sub.connect(subGain).connect(out);
    sub.start(hit);
    sub.stop(hit + 0.8);
  }

  /** Two-tone klaxon for the very biggest events. */
  alarm(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.bus(ctx, 0.13);
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.34;
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.linearRampToValueAtTime(360, t + 0.3);
      gain.gain.linearRampToValueAtTime(0.42, t + 0.04);
      gain.gain.linearRampToValueAtTime(0.02, t + 0.31);
    }
    const shaper = ctx.createBiquadFilter();
    shaper.type = 'lowpass';
    shaper.frequency.value = 1400;
    osc.connect(gain).connect(shaper).connect(out);
    osc.start(now);
    osc.stop(now + 0.72);
  }

  /** Soft blip for routine feed lines - whale prints, wall shifts. */
  blip(up: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = this.bus(ctx, 0.05);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(up ? 620 : 460, now);
    osc.frequency.exponentialRampToValueAtTime(up ? 940 : 300, now + 0.1);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain).connect(out);
    osc.start(now);
    osc.stop(now + 0.18);
  }
}

export const sfx = new SfxEngine();
