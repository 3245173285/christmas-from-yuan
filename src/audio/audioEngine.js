// Procedural Web Audio API Nordic Christmas Ambient Music & Winter Wind Soundscape
// Zero external asset dependencies — works cleanly offline and locally

const CHORDS = [
  [293.66, 369.99, 440.0, 587.33], // D major (D4 F#4 A4 D5)
  [246.94, 293.66, 369.99, 493.88], // B minor (B3 D4 F#4 B4)
  [196.0, 293.66, 392.0, 493.88],  // G major (G3 D4 G4 B4)
  [220.0, 277.18, 329.63, 440.0]   // A major (A3 C#4 E4 A4)
];

const CELESTA_NOTES = [
  587.33, 659.25, 739.99, 880.0, 987.77, 1174.66, 1318.51, 1479.98
];

export class NordicAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.isPlaying = false;
    this.padTimer = null;
    this.chimeTimer = null;
    this.chordIndex = 0;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.0001;
    this.masterGain.connect(this.ctx.destination);

    // Independent crisp interactive SFX bus (works on click even when BGM is off!)
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.72;
    this.sfxGain.connect(this.ctx.destination);

    // Subtle atmospheric stereo echo/delay for ethereal Scandinavian acoustics
    this.delay = this.ctx.createDelay(1.2);
    this.delay.delayTime.value = 0.36;
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.36;
    this.delayFilter = this.ctx.createBiquadFilter();
    this.delayFilter.type = 'lowpass';
    this.delayFilter.frequency.value = 2100;

    this.delay.connect(this.delayFilter);
    this.delayFilter.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delay);
    this.delayFilter.connect(this.masterGain);

    // Dedicated shimmering delay tap for interactive chimes/harp notes
    this.sfxDelay = this.ctx.createDelay(1.0);
    this.sfxDelay.delayTime.value = 0.28;
    const sfxFb = this.ctx.createGain();
    sfxFb.gain.value = 0.34;
    const sfxFilt = this.ctx.createBiquadFilter();
    sfxFilt.type = 'lowpass';
    sfxFilt.frequency.value = 2600;
    this.sfxDelay.connect(sfxFilt);
    sfxFilt.connect(sfxFb);
    sfxFb.connect(this.sfxDelay);
    sfxFilt.connect(this.sfxGain);

    this.startWinterWind();
  }

  // Play crisp music-box / harp bell note from festive D-major pentatonic scale
  playTone(freq, startOffset = 0, duration = 2.2, volume = 0.14, type = 'sine') {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime + startOffset;

    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    // Crystal celesta 2nd & 3rd overtones
    const ov = this.ctx.createOscillator();
    ov.type = 'sine';
    ov.frequency.setValueAtTime(freq * 2.0, now);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const ovG = this.ctx.createGain();
    ovG.gain.setValueAtTime(0.0001, now);
    ovG.gain.linearRampToValueAtTime(volume * 0.28, now + 0.008);
    ovG.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.42);

    osc.connect(g);
    ov.connect(ovG);
    ovG.connect(g);
    g.connect(this.sfxGain);
    g.connect(this.sfxDelay);

    osc.start(now);
    ov.start(now);
    osc.stop(now + duration + 0.08);
    ov.stop(now + duration * 0.48 + 0.05);
  }

  // Interactive Ornament Tap -> lush pentatonic Christmas music box note
  playOrnamentNote(normalizedHeight = 0.5) {
    // Festive D-major pentatonic scale across 2.5 octaves (every random tap harmonizes!)
    const pentatonic = [
      293.66, 329.63, 369.99, 440.0, 493.88,
      587.33, 659.25, 739.99, 880.0, 987.77,
      1174.66, 1318.51, 1479.98
    ];
    const clamped = Math.max(0, Math.min(0.999, normalizedHeight));
    const baseIdx = Math.floor(clamped * (pentatonic.length - 2));
    const jitter = Math.random() > 0.65 ? 1 : 0;
    const freq = pentatonic[Math.min(pentatonic.length - 1, baseIdx + jitter)];
    this.playTone(freq, 0, 2.1, 0.14, 'triangle');
    // Subtle soft octave sparkle
    this.playTone(freq * 2, 0.015, 1.1, 0.04, 'sine');
  }

  // Interactive Star Topper Click -> dazzling golden harp cascade glissando!
  playStarCascade() {
    const notes = [587.33, 739.99, 880.0, 1174.66, 1479.98, 1760.0, 1479.98, 1174.66, 880.0];
    notes.forEach((f, i) => {
      this.playTone(f, i * 0.068, 2.4, 0.11 - i * 0.005, 'sine');
    });
  }

  // Interactive Gift Box Unbox -> warm enchanting wind-chime chord flourish
  playGiftOpen() {
    const chord = [440.0, 587.33, 739.99, 880.0, 1174.66, 1318.51];
    chord.forEach((f, i) => {
      this.playTone(f, i * 0.055, 2.6, 0.105, i < 2 ? 'triangle' : 'sine');
    });
  }

  // Interactive Sky Click Meteor -> ethereal crystalline wish chime
  playMeteorChime() {
    const pick = [1174.66, 1318.51, 1479.98, 1760.0];
    const f = pick[Math.floor(Math.random() * pick.length)];
    this.playTone(f, 0, 2.3, 0.085, 'sine');
    this.playTone(f * 1.5, 0.09, 1.8, 0.045, 'sine');
  }

  // Interactive Aurora Brush -> whisper-soft glassy harmonic shimmer
  playAuroraShimmer() {
    const notes = [587.33, 880.0, 1174.66];
    const f = notes[Math.floor(Math.random() * notes.length)];
    this.playTone(f, 0, 2.0, 0.038, 'sine');
  }

  startWinterWind() {
    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Soft pink-ish filtered noise
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.015) * 0.45;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 340;
    filter.Q.value = 1.6;

    // Gentle LFO modulating winter wind swell
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.085;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 150;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const windGain = this.ctx.createGain();
    windGain.gain.value = 0.14;

    noise.connect(filter);
    filter.connect(windGain);
    windGain.connect(this.masterGain);
    noise.start();
  }

  triggerWarmPad() {
    if (!this.ctx || !this.isPlaying) return;
    const now = this.ctx.currentTime;
    const chord = CHORDS[this.chordIndex % CHORDS.length];
    this.chordIndex++;

    for (const freq of chord) {
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc.type = 'sine';
      osc2.type = 'triangle';
      osc.frequency.value = freq * 0.5;
      osc2.frequency.value = freq * 0.5018; // lush slow chorus detune

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 620;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.032, now + 2.4);
      gain.gain.linearRampToValueAtTime(0.024, now + 5.8);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 8.6);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      gain.connect(this.delay);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 8.8);
      osc2.stop(now + 8.8);
    }
  }

  triggerCelestaChime() {
    if (!this.ctx || !this.isPlaying) return;
    const now = this.ctx.currentTime;
    const note = CELESTA_NOTES[Math.floor(Math.random() * CELESTA_NOTES.length)];

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = note;

    // Soft bell overtone
    const harmonic = this.ctx.createOscillator();
    harmonic.type = 'sine';
    harmonic.frequency.value = note * 2.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.042, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.9);

    const hGain = this.ctx.createGain();
    hGain.gain.setValueAtTime(0.0001, now);
    hGain.gain.linearRampToValueAtTime(0.012, now + 0.015);
    hGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

    osc.connect(gain);
    harmonic.connect(hGain);
    hGain.connect(gain);
    gain.connect(this.masterGain);
    gain.connect(this.delay);

    osc.start(now);
    harmonic.start(now);
    osc.stop(now + 3.1);
    harmonic.stop(now + 1.3);
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
    return this.isPlaying;
  }

  start() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isPlaying = true;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
    this.masterGain.gain.linearRampToValueAtTime(0.75, now + 1.4);

    this.triggerWarmPad();
    this.triggerCelestaChime();

    this.padTimer = setInterval(() => this.triggerWarmPad(), 7200);
    this.chimeTimer = setInterval(() => {
      if (Math.random() > 0.25) this.triggerCelestaChime();
    }, 1850);
  }

  stop() {
    this.isPlaying = false;
    if (this.padTimer) clearInterval(this.padTimer);
    if (this.chimeTimer) clearInterval(this.chimeTimer);
    this.padTimer = null;
    this.chimeTimer = null;

    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.8);
    }
  }
}
