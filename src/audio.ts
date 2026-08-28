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
  private analyser: AnalyserNode | null = null;
  private meterBuffer: Float32Array<ArrayBuffer> | null = null;
  private gunTimer: number | null = null;

  /**
   * Diagnostics for the one thing that cannot be seen on screen. Returns
   * whether audio is enabled, whether the context is actually running (a
   * suspended context is the usual reason for silence), and the current
   * peak output level.
   */
  get status(): { enabled: boolean; state: string; peak: number } {
    if (!config.sound) return { enabled: false, state: 'disabled', peak: 0 };
    if (!this.ctx) return { enabled: true, state: 'not-started', peak: 0 };
    let peak = 0;
    if (this.analyser && this.meterBuffer) {
      this.analyser.getFloatTimeDomainData(this.meterBuffer);
      for (let i = 0; i < this.meterBuffer.length; i++) {
        const v = Math.abs(this.meterBuffer[i]);
        if (v > peak) peak = v;
      }
    }
    return { enabled: true, state: this.ctx.state, peak };
  }

  /** Force the context awake. Safe to call repeatedly. */
  resume(): void {
    this.ensureContext();
  }

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

      // Everything passes through an analyser on its way out, purely so the
      // output level can be read back. Browsers give no way to confirm that
      // sound actually reached the speakers, but a non-zero peak here proves
      // the graph is producing samples - which is the part that can silently
      // fail (a suspended context, a muted OBS source).
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.meterBuffer = new Float32Array(this.analyser.fftSize);
      this.master.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.startAmbience();
      this.scheduleGunfire();

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

  /** Per-voice gain routed into the master bus, optionally panned. Spread
   * matters a lot here: a firefight panned across the stereo field reads as
   * a battlefield, while the same shots dead-centre read as one gun. */
  private bus(ctx: AudioContext, level: number, pan = 0): GainNode {
    const gain = ctx.createGain();
    gain.gain.value = level;
    if (pan !== 0 && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      gain.connect(panner);
      panner.connect(this.master ?? ctx.destination);
    } else {
      gain.connect(this.master ?? ctx.destination);
    }
    return gain;
  }

  /**
   * One rifle crack. Small-arms fire is far too dense to play per bullet -
   * well over a hundred shooters are firing at once - so these are
   * scheduled at a rate derived from how many units are engaged, with the
   * pitch, distance and stereo position randomised per shot. That reads as
   * a firefight; one sample per trigger pull would read as a jackhammer.
   */
  private gunshot(): void {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    // Most shots are "further away": quieter, duller, longer tail.
    const near = Math.random();
    const level = 0.018 + near * 0.05;
    const out = this.bus(ctx, level, (Math.random() - 0.5) * 1.6);

    const crack = ctx.createBufferSource();
    crack.buffer = this.noiseBuffer;
    crack.playbackRate.value = 0.8 + Math.random() * 0.6;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 900 + near * 2200 + Math.random() * 600;
    band.Q.value = 0.9;
    const crackGain = ctx.createGain();
    const decay = 0.045 + (1 - near) * 0.09;
    crackGain.gain.setValueAtTime(1, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + decay);
    crack.connect(band).connect(crackGain).connect(out);
    crack.start(now);
    crack.stop(now + decay + 0.02);

    // A little body under the crack so it doesn't sound like static.
    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(150 + Math.random() * 70, now);
    thump.frequency.exponentialRampToValueAtTime(60, now + 0.07);
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.5, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    thump.connect(thumpGain).connect(out);
    thump.start(now);
    thump.stop(now + 0.1);
  }

  /** Keeps small-arms fire going at a density that tracks the battle. */
  private scheduleGunfire(): void {
    if (!this.ctx) return;
    // Roughly 2 shots/sec on a quiet field up to ~18 when both armies are
    // at full strength. Intervals are jittered hard so the fire never
    // falls into an audible rhythm.
    const rate = 2 + this.ambientTarget * 16;
    const delay = (1 / rate) * (0.35 + Math.random() * 1.5);
    if (this.gunTimer !== null) window.clearTimeout(this.gunTimer);
    this.gunTimer = window.setTimeout(() => {
      this.gunshot();
      // Bursts: a shooter usually squeezes off two or three.
      if (Math.random() < 0.45) {
        window.setTimeout(() => this.gunshot(), 70 + Math.random() * 90);
        if (Math.random() < 0.5) window.setTimeout(() => this.gunshot(), 160 + Math.random() * 120);
      }
      this.scheduleGunfire();
    }, delay * 1000);
  }

  /**
   * Muffled thud for artillery and bombs landing across the field. Much
   * softer and duller than `explosion`, which is reserved for liquidations -
   * background shelling should not compete with the events that matter.
   */
  distantBoom(magnitude = 0.6): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const m = Math.min(1, Math.max(0.3, magnitude));
    const now = ctx.currentTime;
    const out = this.bus(ctx, 0.075 * m, (Math.random() - 0.5) * 1.4);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(85 * m + 30, now);
    sub.frequency.exponentialRampToValueAtTime(32, now + 0.3);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(1, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    sub.connect(subGain).connect(out);
    sub.start(now);
    sub.stop(now + 0.5);

    const rumble = ctx.createBufferSource();
    rumble.buffer = this.noiseBuffer;
    rumble.playbackRate.value = 0.5;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.6, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    rumble.connect(lp).connect(rumbleGain).connect(out);
    rumble.start(now);
    rumble.stop(now + 0.45);
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
