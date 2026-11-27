// Apple Liquid Glass UI Controller with Interactive Specular Sheen, Snow Size Slider & Pure View Mode

const SPEEDS = [0.5, 1, 2, 4];

const PRESETS = [
  { id: 'dawn', label: '清晨', hour: 6.45 },
  { id: 'noon', label: '正午', hour: 13.0 },
  { id: 'dusk', label: '黄昏', hour: 18.25 },
  { id: 'aurora', label: '极光', hour: 21.3 }
];

function formatHours(h) {
  const wrapped = ((h % 24) + 24) % 24;
  const hrs = Math.floor(wrapped);
  const mins = Math.floor((wrapped - hrs) * 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export class ControlsUI {
  constructor({ dayNight, cameraRig, envDetails, audioEngine }) {
    this.dayNight = dayNight;
    this.cameraRig = cameraRig;
    this.envDetails = envDetails;
    this.audioEngine = audioEngine;

    this.uiHidden = false;
    this.isScrubbing = false;
    this.speedIndex = 1;
    this.idleTimer = null;

    this.root = document.getElementById('hud-root');
    this.dock = document.querySelector('.liquid-dock');
    this.restoreBtn = document.getElementById('restore-ui-btn');
    this.clockEl = document.getElementById('virtual-clock');
    this.phaseEl = document.getElementById('phase-label');
    this.sliderEl = document.getElementById('time-slider');
    this.snowSliderEl = document.getElementById('snow-size-slider');
    this.playBtn = document.getElementById('btn-play');
    this.speedBtn = document.getElementById('btn-speed');
    this.orbitBtn = document.getElementById('btn-orbit');
    this.snowBtn = document.getElementById('btn-snow');
    this.audioBtn = document.getElementById('btn-audio');
    this.fsBtn = document.getElementById('btn-fullscreen');
    this.hideBtn = document.getElementById('btn-hide-ui');
    this.presetBtns = Array.from(document.querySelectorAll('[data-preset]'));

    this.bindEvents();
    this.syncToggleStates();
    this.resetIdleFade();
  }

  bindEvents() {
    // Apple Liquid Glass dynamic cursor-tracking specular refraction light
    if (this.dock) {
      this.dock.addEventListener('pointermove', (e) => {
        const rect = this.dock.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        this.dock.style.setProperty('--mx', `${x.toFixed(1)}%`);
        this.dock.style.setProperty('--my', `${y.toFixed(1)}%`);
      });
    }

    // 24h Time Slider
    this.sliderEl.addEventListener('pointerdown', () => {
      this.isScrubbing = true;
      this.resetIdleFade();
    });
    window.addEventListener('pointerup', () => {
      this.isScrubbing = false;
    });
    this.sliderEl.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.dayNight.setTime(val);
      this.updateTimeDisplay(this.dayNight.state);
      this.resetIdleFade();
    });

    // Adjustable Snowfall Intensity Slider (light flurry -> medium snow -> heavy Nordic snowfall!)
    if (this.snowSliderEl) {
      this.snowSliderEl.addEventListener('pointerdown', () => {
        this.isScrubbing = true;
        this.resetIdleFade();
      });
      this.snowSliderEl.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!this.envDetails.snowEnabled && val > 0.05) {
          this.envDetails.setSnowEnabled(true);
          this.syncToggleStates();
        }
        this.envDetails.setSnowIntensity(val);
        this.resetIdleFade();
      });
    }

    // Play / Pause
    this.playBtn.addEventListener('click', () => {
      this.dayNight.paused = !this.dayNight.paused;
      this.syncToggleStates();
      this.resetIdleFade();
    });

    // Speed Multiplier
    this.speedBtn.addEventListener('click', () => {
      this.speedIndex = (this.speedIndex + 1) % SPEEDS.length;
      this.dayNight.speedMultiplier = SPEEDS[this.speedIndex];
      this.speedBtn.textContent = `${SPEEDS[this.speedIndex]}×`;
      this.resetIdleFade();
    });

    // 4 One-Click Time Presets
    this.presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = PRESETS.find((p) => p.id === btn.dataset.preset);
        if (preset) {
          this.dayNight.transitionToTime(preset.hour);
        }
        this.resetIdleFade();
      });
    });

    // Auto-Orbit toggle
    this.orbitBtn.addEventListener('click', () => {
      this.cameraRig.setAutoOrbit(!this.cameraRig.autoOrbit);
      this.syncToggleStates();
      this.resetIdleFade();
    });

    // Snowfall toggle
    this.snowBtn.addEventListener('click', () => {
      this.envDetails.setSnowEnabled(!this.envDetails.snowEnabled);
      this.syncToggleStates();
      this.resetIdleFade();
    });

    // Ambient Audio toggle
    this.audioBtn.addEventListener('click', () => {
      this.audioEngine.toggle();
      this.syncToggleStates();
      this.resetIdleFade();
    });

    // Fullscreen toggle
    this.fsBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
      this.resetIdleFade();
    });
    document.addEventListener('fullscreenchange', () => this.syncToggleStates());

    // Pure观赏模式 (Hide all UI)
    this.hideBtn.addEventListener('click', () => this.setUiHidden(true));
    this.restoreBtn.addEventListener('click', () => this.setUiHidden(false));

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.dayNight.paused = !this.dayNight.paused;
        this.syncToggleStates();
      } else if (e.key === 'h' || e.key === 'H' || (e.key === 'Escape' && this.uiHidden)) {
        this.setUiHidden(!this.uiHidden);
      }
      this.resetIdleFade();
    });

    const wakeEvents = ['pointermove', 'pointerdown', 'wheel', 'touchstart'];
    wakeEvents.forEach((evt) => {
      window.addEventListener(evt, () => this.resetIdleFade(), { passive: true });
    });
  }

  setUiHidden(hidden) {
    this.uiHidden = hidden;
    this.root.classList.toggle('is-hidden', hidden);
    this.restoreBtn.classList.toggle('is-visible', hidden);
    if (!hidden) this.resetIdleFade();
  }

  resetIdleFade() {
    this.root.classList.remove('is-idle');
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (!this.isScrubbing && !this.uiHidden) {
        this.root.classList.add('is-idle');
      }
    }, 6800);
  }

  syncToggleStates() {
    this.playBtn.classList.toggle('is-active', !this.dayNight.paused);
    this.playBtn.setAttribute('aria-label', this.dayNight.paused ? '播放时间' : '暂停时间');
    this.playBtn.innerHTML = this.dayNight.paused
      ? `<svg viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20" fill="currentColor" stroke="none"/></svg>`
      : `<svg viewBox="0 0 24 24"><line x1="8" y1="5" x2="8" y2="19"/><line x1="16" y1="5" x2="16" y2="19"/></svg>`;

    this.orbitBtn.classList.toggle('is-active', this.cameraRig.autoOrbit);
    this.snowBtn.classList.toggle('is-active', this.envDetails.snowEnabled);
    if (this.snowSliderEl) {
      this.snowSliderEl.style.opacity = this.envDetails.snowEnabled ? '1' : '0.35';
    }
    this.audioBtn.classList.toggle('is-active', this.audioEngine.isPlaying);
    this.fsBtn.classList.toggle('is-active', Boolean(document.fullscreenElement));
  }

  updateTimeDisplay(dayState) {
    const h = dayState.hour;
    this.clockEl.textContent = formatHours(h);
    this.phaseEl.textContent = dayState.phaseZh;

    if (!this.isScrubbing) {
      this.sliderEl.value = h.toFixed(2);
    }

    let activePreset = 'aurora';
    if (h >= 5.0 && h < 9.5) activePreset = 'dawn';
    else if (h >= 9.5 && h < 16.0) activePreset = 'noon';
    else if (h >= 16.0 && h < 20.0) activePreset = 'dusk';

    this.presetBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.preset === activePreset);
    });
  }
}
