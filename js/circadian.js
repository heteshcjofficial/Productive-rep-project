/**
 * ChronoSync: Circadian Engine
 * Manages 4-Phase Chrono-Atmosphere transitions, solar timing & biological alignment
 */

const CircadianEngine = (() => {
  const PHASES = {
    DAWN: {
      id: 'dawn',
      name: 'Dawn Awakening',
      timeRange: '05:00 – 08:30',
      description: 'Cortisol awakening response & cognitive priming',
      color: '#f59e0b',
      themeClass: 'theme-dawn',
      startHour: 5,
      endHour: 8.5
    },
    PEAK: {
      id: 'peak',
      name: 'Peak Focus',
      timeRange: '08:30 – 16:30',
      description: 'Optimal prefrontal cortex acuity & high-demand deep work',
      color: '#0ea5e9',
      themeClass: 'theme-peak',
      startHour: 8.5,
      endHour: 16.5
    },
    TWILIGHT: {
      id: 'twilight',
      name: 'Twilight Admin',
      timeRange: '16:30 – 21:00',
      description: 'Communication triage, retrospective & lower cognitive strain',
      color: '#c084fc',
      themeClass: 'theme-twilight',
      startHour: 16.5,
      endHour: 21
    },
    NOCTURNE: {
      id: 'nocturne',
      name: 'Nocturne Wind-Down',
      timeRange: '21:00 – 05:00',
      description: 'Melatonin protection, minimal blue light & physiological recovery',
      color: '#fb7185',
      themeClass: 'theme-nocturne',
      startHour: 21,
      endHour: 5
    }
  };

  let manualOverride = localStorage.getItem('chronosync_phase_override') || 'auto';
  let currentPhase = null;
  const listeners = [];

  function getAutoPhase(date = new Date()) {
    const hours = date.getHours() + date.getMinutes() / 60;
    if (hours >= 5 && hours < 8.5) return PHASES.DAWN;
    if (hours >= 8.5 && hours < 16.5) return PHASES.PEAK;
    if (hours >= 16.5 && hours < 21) return PHASES.TWILIGHT;
    return PHASES.NOCTURNE;
  }

  function getEffectivePhase() {
    if (manualOverride && manualOverride !== 'auto') {
      const match = Object.values(PHASES).find(p => p.id === manualOverride);
      if (match) return match;
    }
    return getAutoPhase();
  }

  function applyTheme() {
    const phase = getEffectivePhase();
    const body = document.body;
    
    // Remove all previous theme classes
    Object.values(PHASES).forEach(p => body.classList.remove(p.themeClass));
    // Apply current
    body.classList.add(phase.themeClass);

    currentPhase = phase;
    listeners.forEach(cb => cb(phase, manualOverride));
  }

  function setOverride(phaseId) {
    manualOverride = phaseId;
    if (phaseId === 'auto') {
      localStorage.removeItem('chronosync_phase_override');
    } else {
      localStorage.setItem('chronosync_phase_override', phaseId);
    }
    applyTheme();
  }

  function onPhaseChange(callback) {
    listeners.push(callback);
    if (currentPhase) callback(currentPhase, manualOverride);
  }

  function getNextGateInfo(date = new Date()) {
    const nowHours = date.getHours() + date.getMinutes() / 60;
    let nextGate = '08:30 (Peak Focus)';
    let minutesRemaining = 0;

    if (nowHours < 5) {
      minutesRemaining = Math.round((5 - nowHours) * 60);
      nextGate = '05:00 (Dawn Awakening)';
    } else if (nowHours < 8.5) {
      minutesRemaining = Math.round((8.5 - nowHours) * 60);
      nextGate = '08:30 (Peak Focus)';
    } else if (nowHours < 16.5) {
      minutesRemaining = Math.round((16.5 - nowHours) * 60);
      nextGate = '16:30 (Twilight Admin)';
    } else if (nowHours < 21) {
      minutesRemaining = Math.round((21 - nowHours) * 60);
      nextGate = '21:00 (Melatonin Gate)';
    } else {
      minutesRemaining = Math.round((29 - nowHours) * 60);
      nextGate = '05:00 (Dawn Awakening)';
    }

    return { nextGate, minutesRemaining };
  }

  // Periodic tick (every 10 seconds)
  setInterval(() => {
    const newPhase = getEffectivePhase();
    if (!currentPhase || newPhase.id !== currentPhase.id) {
      applyTheme();
    }
  }, 10000);

  return {
    PHASES,
    getEffectivePhase,
    setOverride,
    getOverride: () => manualOverride,
    applyTheme,
    onPhaseChange,
    getNextGateInfo
  };
})();

window.CircadianEngine = CircadianEngine;
