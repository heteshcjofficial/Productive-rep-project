/**
 * ChronoSync: Deep Work Studio & Ambient Soundscape
 * Procedural Web Audio API Binaural Beat Synthesizer & 60 FPS Particle Canvas
 */

const FocusStudio = (() => {
  let audioCtx = null;
  let oscLeft = null;
  let oscRight = null;
  let gainNode = null;
  let isAudioPlaying = false;
  let activePreset = 'gamma'; // gamma, alpha, theta

  // Timer state
  let timerDurationSeconds = 90 * 60; // 90 min default Ultradian sprint
  let timeRemainingSeconds = 90 * 60;
  let timerInterval = null;
  let isTimerRunning = false;

  // Canvas visualizer
  let canvas = null;
  let ctx = null;
  let animFrameId = null;
  let particles = [];

  const BINAURAL_PRESETS = {
    gamma: {
      name: 'Gamma (40 Hz)',
      desc: 'Peak Problem Solving & High-Order Synthesis',
      baseFreq: 220,
      binauralDiff: 40
    },
    alpha: {
      name: 'Alpha (10 Hz)',
      desc: 'Relaxed Contemplation & Fluid Ideation',
      baseFreq: 200,
      binauralDiff: 10
    },
    theta: {
      name: 'Theta (6 Hz)',
      desc: 'Deep Subconscious Flow & Intuitive Architecture',
      baseFreq: 180,
      binauralDiff: 6
    }
  };

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
  }

  function startBinauralSound(preset = activePreset) {
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    stopBinauralSound();

    activePreset = preset;
    const config = BINAURAL_PRESETS[preset] || BINAURAL_PRESETS.gamma;

    // Create Stereo Panner or Channel Splitter/Merger
    const merger = audioCtx.createChannelMerger(2);
    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime); // gentle, non-fatiguing volume

    // Left channel oscillator
    oscLeft = audioCtx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(config.baseFreq, audioCtx.currentTime);

    // Right channel oscillator with binaural offset
    oscRight = audioCtx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(config.baseFreq + config.binauralDiff, audioCtx.currentTime);

    oscLeft.connect(merger, 0, 0);
    oscRight.connect(merger, 0, 1);
    merger.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscLeft.start();
    oscRight.start();
    isAudioPlaying = true;

    updateAudioUI();
  }

  function stopBinauralSound() {
    if (oscLeft) {
      try { oscLeft.stop(); oscLeft.disconnect(); } catch (e) {}
      oscLeft = null;
    }
    if (oscRight) {
      try { oscRight.stop(); oscRight.disconnect(); } catch (e) {}
      oscRight = null;
    }
    isAudioPlaying = false;
    updateAudioUI();
  }

  function toggleAudio() {
    if (isAudioPlaying) {
      stopBinauralSound();
    } else {
      startBinauralSound(activePreset);
    }
  }

  function setPreset(presetName) {
    activePreset = presetName;
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.preset === presetName);
    });
    if (isAudioPlaying) {
      startBinauralSound(presetName);
    }
  }

  function updateAudioUI() {
    const headerBtn = document.getElementById('headerAudioBtn');
    const studioBtn = document.getElementById('studioAudioBtn');

    [headerBtn, studioBtn].forEach(btn => {
      if (btn) {
        btn.classList.toggle('playing', isAudioPlaying);
        btn.innerHTML = isAudioPlaying 
          ? `🔊 Soundscape Active (${BINAURAL_PRESETS[activePreset].name})` 
          : `🔇 Ambient Soundscape Off`;
      }
    });
  }

  // Timer Functions
  function setTimerMode(minutes) {
    pauseTimer();
    timerDurationSeconds = minutes * 60;
    timeRemainingSeconds = timerDurationSeconds;
    updateTimerDisplay();
  }

  function startTimer() {
    if (isTimerRunning) return;
    isTimerRunning = true;
    updateTimerControls();

    timerInterval = setInterval(() => {
      if (timeRemainingSeconds > 0) {
        timeRemainingSeconds--;
        updateTimerDisplay();
      } else {
        pauseTimer();
        alert('Sprint Complete! Time for biological recovery.');
        // Increment telemetry focus score
        const focusEl = document.getElementById('focusIndexValue');
        if (focusEl) focusEl.textContent = '94%';
      }
    }, 1000);
  }

  function pauseTimer() {
    isTimerRunning = false;
    if (timerInterval) clearInterval(timerInterval);
    updateTimerControls();
  }

  function toggleTimer() {
    if (isTimerRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  function resetTimer() {
    pauseTimer();
    timeRemainingSeconds = timerDurationSeconds;
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const digitsEl = document.getElementById('studioTimerDigits');
    if (!digitsEl) return;
    const mins = Math.floor(timeRemainingSeconds / 60);
    const secs = timeRemainingSeconds % 60;
    digitsEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function updateTimerControls() {
    const btn = document.getElementById('btnStudioTimerToggle');
    if (btn) {
      btn.innerHTML = isTimerRunning ? '⏸ Pause Sprint' : '▶ Start Deep Sprint';
    }
  }

  // 60 FPS Generative Mindscape Canvas
  function initVisualizer(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height || 260;
      initParticles();
    }
    window.addEventListener('resize', resize);
    resize();

    function initParticles() {
      particles = [];
      const count = 45;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          radius: Math.random() * 2 + 1,
          hue: Math.random() * 40 + 190
        });
      }
    }

    let time = 0;

    function renderCanvas() {
      if (!ctx || !canvas) return;
      time += 0.02;

      ctx.fillStyle = 'rgba(6, 9, 17, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw flowing sine resonance wave
      ctx.beginPath();
      const waveFreq = isAudioPlaying ? 0.03 : 0.015;
      const waveAmp = isAudioPlaying ? 35 : 18;
      for (let x = 0; x <= canvas.width; x += 6) {
        const y = canvas.height / 2 + Math.sin(x * waveFreq + time * 2) * waveAmp * Math.cos(time * 0.5);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = isAudioPlaying ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = isAudioPlaying ? 3 : 1.5;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = isAudioPlaying ? 15 : 4;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw particle network
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = isAudioPlaying ? '#f59e0b' : 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
      });

      // Connect nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 75) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.35 * (1 - dist / 75)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animFrameId = requestAnimationFrame(renderCanvas);
    }

    renderCanvas();
  }

  return {
    initAudio,
    toggleAudio,
    startBinauralSound,
    stopBinauralSound,
    setPreset,
    setTimerMode,
    toggleTimer,
    resetTimer,
    initVisualizer,
    isAudioPlaying: () => isAudioPlaying
  };
})();

window.FocusStudio = FocusStudio;
