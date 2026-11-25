/**
 * THE SUNWARD MOTEL (1962) — Procedural Web Audio Engine
 * Zero external files. Synthesizes vinyl crackle, 1962 desert lounge chords
 * that progressively detune and warp with scroll depth, 60Hz neon buzz,
 * desert night wind, sub-bass dread, heartbeat pulse, AM radio tuner,
 * and tactile vintage SFX.
 */

class SunwardAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.enabled = false;
    this.dread = 0; // 0.0 (sunny 1962) -> 1.0 (Room 15 abyss)

    // Continuous ambient nodes
    this.loungeGain = null;
    this.crackleGain = null;
    this.windGain = null;
    this.neonGain = null;
    this.droneGain = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;

    // Radio dedicated nodes
    this.radioActive = false;
    this.radioGain = null;
    this.radioStaticGain = null;
    this.radioToneGain = null;
    this.radioToneOsc = null;
    this.radioFreq = 580;

    // Schedulers
    this.chordTimer = null;
    this.heartbeatTimer = null;
    this.knockTimer = null;
    this.chordIndex = 0;
    this.noiseBuffer = null;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    // Master chain with gentle safety limiter/compressor
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 18;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.25;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.0001;
    this.masterGain.connect(compressor);
    compressor.connect(this.ctx.destination);

    this.noiseBuffer = this._createNoiseBuffer(3.0);
    this._setupAmbientLayers();
    this._setupRadioLayer();
  }

  _createNoiseBuffer(seconds) {
    const length = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  _setupAmbientLayers() {
    const now = this.ctx.currentTime;

    // 1. Lounge chord bus
    this.loungeGain = this.ctx.createGain();
    this.loungeGain.gain.value = 0.22;
    const loungeFilter = this.ctx.createBiquadFilter();
    loungeFilter.type = 'lowpass';
    loungeFilter.frequency.value = 1800;
    this.loungeGain.connect(loungeFilter);
    loungeFilter.connect(this.masterGain);

    // 2. Warm vinyl crackle layer
    const crackleSrc = this.ctx.createBufferSource();
    crackleSrc.buffer = this.noiseBuffer;
    crackleSrc.loop = true;
    const crackleFilter = this.ctx.createBiquadFilter();
    crackleFilter.type = 'highpass';
    crackleFilter.frequency.value = 2600;
    this.crackleGain = this.ctx.createGain();
    this.crackleGain.gain.value = 0.05;
    crackleSrc.connect(crackleFilter);
    crackleFilter.connect(this.crackleGain);
    this.crackleGain.connect(this.masterGain);
    crackleSrc.start(now);

    // 3. Desert night wind (bandpass pink noise with slow LFO sweep)
    const windSrc = this.ctx.createBufferSource();
    windSrc.buffer = this.noiseBuffer;
    windSrc.loop = true;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 320;
    windFilter.Q.value = 3.2;

    const windLfo = this.ctx.createOscillator();
    windLfo.frequency.value = 0.11;
    const windLfoGain = this.ctx.createGain();
    windLfoGain.gain.value = 140;
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);
    windLfo.start(now);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.0001;
    windSrc.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    windSrc.start(now);

    // 4. 60Hz & 120Hz buzzing fluorescent neon tube
    const neonOsc1 = this.ctx.createOscillator();
    neonOsc1.type = 'sawtooth';
    neonOsc1.frequency.value = 60;
    const neonOsc2 = this.ctx.createOscillator();
    neonOsc2.type = 'triangle';
    neonOsc2.frequency.value = 120;
    const neonFilter = this.ctx.createBiquadFilter();
    neonFilter.type = 'bandpass';
    neonFilter.frequency.value = 240;
    neonFilter.Q.value = 2.0;
    this.neonGain = this.ctx.createGain();
    this.neonGain.gain.value = 0.0001;
    neonOsc1.connect(neonFilter);
    neonOsc2.connect(neonFilter);
    neonFilter.connect(this.neonGain);
    this.neonGain.connect(this.masterGain);
    neonOsc1.start(now);
    neonOsc2.start(now);

    // 5. Sub-bass horror drone (41Hz + 42.6Hz unsettling interference)
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sine';
    this.droneOsc1.frequency.value = 41;
    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'triangle';
    this.droneOsc2.frequency.value = 42.6;
    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 110;
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.0001;
    this.droneOsc1.connect(droneFilter);
    this.droneOsc2.connect(droneFilter);
    droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);
    this.droneOsc1.start(now);
    this.droneOsc2.start(now);
  }

  _setupRadioLayer() {
    const now = this.ctx.currentTime;
    this.radioGain = this.ctx.createGain();
    this.radioGain.gain.value = 0.0001;
    this.radioGain.connect(this.masterGain);

    // Radio AM bandpass static
    const staticSrc = this.ctx.createBufferSource();
    staticSrc.buffer = this.noiseBuffer;
    staticSrc.loop = true;
    const staticFilter = this.ctx.createBiquadFilter();
    staticFilter.type = 'bandpass';
    staticFilter.frequency.value = 1400;
    staticFilter.Q.value = 1.4;
    this.radioStaticGain = this.ctx.createGain();
    this.radioStaticGain.gain.value = 0.25;
    staticSrc.connect(staticFilter);
    staticFilter.connect(this.radioStaticGain);
    this.radioStaticGain.connect(this.radioGain);
    staticSrc.start(now);

    // Carrier whistle / eerie station tone
    this.radioToneOsc = this.ctx.createOscillator();
    this.radioToneOsc.type = 'sine';
    this.radioToneOsc.frequency.value = 640;
    this.radioToneGain = this.ctx.createGain();
    this.radioToneGain.gain.value = 0.0001;
    this.radioToneOsc.connect(this.radioToneGain);
    this.radioToneGain.connect(this.radioGain);
    this.radioToneOsc.start(now);
  }

  startByDefault() {
    if (!(window.AudioContext || window.webkitAudioContext)) return false;
    this.init();
    const updatePlayback = () => {
      if (this.enabled && this.ctx.state === 'running') {
        if (this.chordTimer === null) this._startLoops();
      } else {
        this._stopLoops();
      }
    };
    this.ctx.addEventListener('statechange', updatePlayback);

    // Safari and other browsers may hold the context until a trusted gesture.
    // Retry from the gesture handler, never turning a muted switch back on.
    const unlock = () => {
      if (this.enabled && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    };
    for (const event of ['click', 'keydown', 'touchend']) {
      document.addEventListener(event, unlock, {passive: true});
    }
    return this.toggle();
  }

  toggle() {
    if (!(window.AudioContext || window.webkitAudioContext)) return false;
    this.init();
    this.enabled = !this.enabled;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(this.enabled ? 0.55 : 0, now, 0.25);

    if (this.enabled) {
      this.setDread(this.dread);
      if (this.ctx.state === 'running') {
        this._startLoops();
        this.playSfx('switchSnap');
      } else {
        this.ctx.resume().catch(() => {});
      }
    } else {
      this._stopLoops();
    }
    return this.enabled;
  }

  enableIfNeeded() {
    if (!this.enabled) {
      return this.toggle();
    }
    return true;
  }

  _startLoops() {
    this._stopLoops();
    // Lounge chords loop
    const playNextChord = () => {
      if (!this.enabled) return;
      if (this.dread < 0.72) {
        this._playLoungeChord();
      }
      const interval = 3800 + this.dread * 2800;
      this.chordTimer = setTimeout(playNextChord, interval);
    };
    playNextChord();

    // Heartbeat loop (only audible in Acts VI–IX)
    const playNextBeat = () => {
      if (!this.enabled) return;
      if (this.dread > 0.58) {
        this._playHeartbeat(Math.min(1, (this.dread - 0.58) / 0.42));
      }
      const bpmMs = Math.max(680, 1450 - (this.dread - 0.55) * 1400);
      this.heartbeatTimer = setTimeout(playNextBeat, bpmMs);
    };
    this.heartbeatTimer = setTimeout(playNextBeat, 1200);

    // Occasional distant knocking in deep dread
    const scheduleKnock = () => {
      if (!this.enabled) return;
      if (this.dread > 0.75 && Math.random() < 0.45) {
        this.playSfx('doorKnock');
      }
      this.knockTimer = setTimeout(scheduleKnock, 14000 + Math.random() * 14000);
    };
    this.knockTimer = setTimeout(scheduleKnock, 16000);
  }

  _stopLoops() {
    clearTimeout(this.chordTimer);
    clearTimeout(this.heartbeatTimer);
    clearTimeout(this.knockTimer);
    this.chordTimer = null;
  }

  _playLoungeChord() {
    if (!this.ctx || !this.enabled) return;
    // Warm 1962 desert lounge progression: Fmaj7, Dm9, Gm7, C13
    const chords = [
      [174.61, 220.00, 261.63, 329.63],
      [146.83, 220.00, 261.63, 329.63],
      [196.00, 233.08, 293.66, 349.23],
      [130.81, 233.08, 293.66, 329.63],
    ];
    const notes = chords[this.chordIndex % chords.length];
    this.chordIndex++;

    const now = this.ctx.currentTime;
    const warp = Math.max(0, (this.dread - 0.18) / 0.55); // tape decay factor

    notes.forEach((baseFreq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx === 0 ? 'sine' : 'triangle';

      // Progressively detune and droop like a melting magnetic tape
      const detuneFactor = 1 - warp * (0.04 + idx * 0.025);
      const startFreq = baseFreq * detuneFactor;
      osc.frequency.setValueAtTime(startFreq, now);
      if (warp > 0.1) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(55, startFreq * (1 - warp * 0.11)),
          now + 3.4
        );
      }

      const noteGain = this.ctx.createGain();
      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.075 / (idx * 0.25 + 1), now + 0.18 + idx * 0.04);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.6);

      osc.connect(noteGain);
      noteGain.connect(this.loungeGain);
      osc.start(now + idx * 0.035);
      osc.stop(now + 3.8);
    });
  }

  _playHeartbeat(intensity) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const pulse = (offset, peak) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(64, now + offset);
      osc.frequency.exponentialRampToValueAtTime(32, now + offset + 0.18);
      g.gain.setValueAtTime(0.0001, now + offset);
      g.gain.linearRampToValueAtTime(peak * intensity * 0.35, now + offset + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.26);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.28);
    };
    pulse(0, 1.0);
    pulse(0.24, 0.65);
  }

  setDread(level) {
    this.dread = Math.max(0, Math.min(1, level));
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;

    // Crossfade layers smoothly
    const loungeVol = Math.max(0.0001, 0.26 * Math.max(0, 1 - this.dread * 1.45));
    const crackleVol = 0.045 + this.dread * 0.09;
    const windVol = this.dread > 0.25 ? Math.min(0.24, (this.dread - 0.25) * 0.42) : 0.0001;
    const neonVol = this.dread > 0.42 && this.dread < 0.92 ? Math.min(0.055, (this.dread - 0.42) * 0.12) : 0.0001;
    const droneVol = this.dread > 0.48 ? Math.min(0.32, (this.dread - 0.48) * 0.65) : 0.0001;

    this.loungeGain.gain.setTargetAtTime(loungeVol, now, 0.4);
    this.crackleGain.gain.setTargetAtTime(crackleVol, now, 0.4);
    this.windGain.gain.setTargetAtTime(windVol, now, 0.5);
    this.neonGain.gain.setTargetAtTime(neonVol, now, 0.4);
    this.droneGain.gain.setTargetAtTime(droneVol, now, 0.6);

    // Slightly lower drone pitch in deepest abyss
    if (this.droneOsc1) {
      this.droneOsc1.frequency.setTargetAtTime(42 - this.dread * 8, now, 0.8);
      this.droneOsc2.frequency.setTargetAtTime(43.8 - this.dread * 7.2, now, 0.8);
    }
  }

  setRadioState(active, freq, lockedStation) {
    if (!this.ctx) return;
    this.radioActive = active;
    this.radioFreq = freq;
    const now = this.ctx.currentTime;

    if (!active || !this.enabled) {
      this.radioGain.gain.setTargetAtTime(0.0001, now, 0.15);
      return;
    }

    this.radioGain.gain.setTargetAtTime(0.38, now, 0.15);
    if (lockedStation) {
      // Clearer reception on station, eerie carrier tone based on station
      this.radioStaticGain.gain.setTargetAtTime(0.12, now, 0.12);
      const toneMap = { 580: 440, 890: 290, 1120: 195, 1380: 142, 1560: 78 };
      const freqTone = toneMap[lockedStation] || 220;
      this.radioToneOsc.frequency.setTargetAtTime(freqTone, now, 0.1);
      this.radioToneGain.gain.setTargetAtTime(lockedStation === 1560 ? 0.06 : 0.03, now, 0.15);
    } else {
      // Heavy static between frequencies + tuning whistle
      this.radioStaticGain.gain.setTargetAtTime(0.45, now, 0.08);
      this.radioToneOsc.frequency.setTargetAtTime(500 + (freq % 200) * 4, now, 0.05);
      this.radioToneGain.gain.setTargetAtTime(0.025, now, 0.08);
    }
  }

  playSfx(name) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;

    switch (name) {
      case 'switchSnap': {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);
        g.gain.setValueAtTime(0.18, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.045);
        break;
      }

      case 'cardFlip': {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const f = this.ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.setValueAtTime(1200, now);
        f.frequency.exponentialRampToValueAtTime(2800, now + 0.12);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.24, now + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        src.connect(f);
        f.connect(g);
        g.connect(this.masterGain);
        src.start(now);
        src.stop(now + 0.18);
        break;
      }

      case 'keyClink': {
        [2480, 3890, 5120].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq + Math.random() * 90, now + i * 0.02);
          g.gain.setValueAtTime(0.08 / (i + 1), now + i * 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.28 + i * 0.05);
          osc.connect(g);
          g.connect(this.masterGain);
          osc.start(now + i * 0.02);
          osc.stop(now + 0.36);
        });
        break;
      }

      case 'typewriter': {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const f = this.ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 1800;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.28, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
        src.connect(f);
        f.connect(g);
        g.connect(this.masterGain);
        src.start(now);
        src.stop(now + 0.04);
        break;
      }

      case 'peepholeSlide': {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(95, now + 0.16);
        g.gain.setValueAtTime(0.16, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }

      case 'polaroidEject': {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(165, now);
        osc.frequency.linearRampToValueAtTime(128, now + 0.45);
        const f = this.ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 500;
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.12, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        osc.connect(f);
        f.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.52);
        break;
      }

      case 'doorKnock': {
        const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
        if (pan) {
          pan.pan.value = Math.random() > 0.5 ? 0.65 : -0.65;
          pan.connect(this.masterGain);
        }
        const dest = pan || this.masterGain;
        [0, 0.24, 0.51].forEach((offset) => {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(115, now + offset);
          osc.frequency.exponentialRampToValueAtTime(48, now + offset + 0.09);
          g.gain.setValueAtTime(0.32, now + offset);
          g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.12);
          osc.connect(g);
          g.connect(dest);
          osc.start(now + offset);
          osc.stop(now + offset + 0.14);
        });
        break;
      }

      case 'phoneRing': {
        // Authentic dual-bell rotary ringer burst (1.1s)
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc1.frequency.value = 880;
        osc2.frequency.value = 1174;

        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 18;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.14;

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.14, now);
        g.gain.setValueAtTime(0.14, now + 1.05);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);

        lfo.connect(lfoGain);
        lfoGain.connect(g.gain);

        osc1.connect(g);
        osc2.connect(g);
        g.connect(this.masterGain);
        osc1.start(now);
        osc2.start(now);
        lfo.start(now);
        osc1.stop(now + 1.18);
        osc2.stop(now + 1.18);
        lfo.stop(now + 1.18);
        break;
      }

      case 'phonePickup': {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
        g.gain.setValueAtTime(0.22, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      case 'scareSting': {
        // Spine-chilling low cinematic dissonant swell
        [55, 58.27, 110, 155.56, 311.13].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = i < 2 ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.92, now + 2.8);
          const f = this.ctx.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.setValueAtTime(900, now);
          f.frequency.exponentialRampToValueAtTime(160, now + 2.8);
          g.gain.setValueAtTime(0.001, now);
          g.gain.linearRampToValueAtTime(0.14 / (i * 0.4 + 1), now + 0.08);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);
          osc.connect(f);
          f.connect(g);
          g.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 3.1);
        });
        break;
      }
    }
  }

  playJukebox(code) {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.enabled) return;
    const now = this.ctx.currentTime;
    const melodies = {
      A1: { notes: [349.23, 440, 523.25, 659.25, 587.33, 523.25], step: 0.28, warp: 0 },
      A2: { notes: [261.63, 329.63, 392.0, 440.0, 392.0, 523.25], step: 0.22, warp: 0 },
      B1: { notes: [293.66, 349.23, 440.0, 415.3, 349.23, 329.63], step: 0.36, warp: 0.03 },
      B2: { notes: [220.0, 261.63, 311.13, 293.66, 233.08, 220.0], step: 0.42, warp: 0.07 },
      C1: { notes: [329.63, 311.13, 293.66, 277.18, 220.0, 207.65], step: 0.52, warp: 0.14 },
      C2: { notes: [185.0, 174.61, 164.81, 155.56, 110.0, 103.83], step: 0.62, warp: 0.2 },
    };
    const m = melodies[code] || melodies.A1;
    m.notes.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = m.warp > 0.1 ? 'sawtooth' : 'triangle';
      const t = now + idx * m.step;
      osc.frequency.setValueAtTime(f, t);
      if (m.warp > 0) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, f * (1 - m.warp)), t + m.step * 1.4);
      }
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = m.warp > 0.1 ? 680 : 2100;
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + m.step * 1.6);
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + m.step * 1.7);
    });
  }
}

window.SunwardAudio = new SunwardAudioEngine();
