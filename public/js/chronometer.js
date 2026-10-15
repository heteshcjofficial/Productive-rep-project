/**
 * ChronoSync: Chronometer & Cognitive Energy Visualizer
 * Renders the 24-Hour Circular Chrono-Ring & Canvas Dual-Line Curve
 */

const Chronometer = (() => {
  let energyCanvas = null;
  let energyCtx = null;
  let animId = null;

  function initDial(svgElementId, timeTextId, phaseTextId, subtextId) {
    const svg = document.getElementById(svgElementId);
    const timeEl = document.getElementById(timeTextId);
    const phaseEl = document.getElementById(phaseTextId);
    const subtextEl = document.getElementById(subtextId);

    if (!svg) return;

    function renderDial() {
      const now = new Date();
      const hours = now.getHours();
      const mins = now.getMinutes();
      const secs = now.getSeconds();
      const totalMinutes = hours * 60 + mins;
      const dayRatio = (totalMinutes + secs / 60) / 1440; // 0 to 1

      // Format time string
      const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      if (timeEl) timeEl.textContent = timeStr;

      const phase = CircadianEngine.getEffectivePhase();
      if (phaseEl) phaseEl.textContent = phase.name;

      const gateInfo = CircadianEngine.getNextGateInfo(now);
      if (subtextEl) {
        const hrsLeft = Math.floor(gateInfo.minutesRemaining / 60);
        const minsLeft = gateInfo.minutesRemaining % 60;
        subtextEl.textContent = `Next Gate: ${gateInfo.nextGate} (${hrsLeft}h ${minsLeft}m)`;
      }

      // Draw SVG Dial
      const cx = 190, cy = 190, r = 150;
      const angle = dayRatio * 360 - 90; // Top is 00:00
      const rad = (angle * Math.PI) / 180;
      const orbX = cx + r * Math.cos(rad);
      const orbY = cy + r * Math.sin(rad);

      // SVG Elements
      let content = `
        <defs>
          <linearGradient id="chronoTrackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.8"/>
            <stop offset="35%" stop-color="#f59e0b" stop-opacity="0.8"/>
            <stop offset="70%" stop-color="#c084fc" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="#fb7185" stop-opacity="0.8"/>
          </linearGradient>
          <filter id="orbGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6"/>
          </filter>
        </defs>

        <!-- Base Ambient Ring -->
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255, 255, 255, 0.05)" stroke-width="14"/>

        <!-- Phase Arc Highlights -->
        <!-- Dawn (05:00 - 08:30) = 75 deg to 127.5 deg (from top: -90 + 75 = -15) -->
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f59e0b" stroke-width="6" stroke-dasharray="88 855" stroke-dashoffset="-132" stroke-opacity="0.45"/>
        <!-- Peak Focus (08:30 - 16:30) -->
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#0ea5e9" stroke-width="6" stroke-dasharray="209 734" stroke-dashoffset="-220" stroke-opacity="0.6"/>
        <!-- Twilight (16:30 - 21:00) -->
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#c084fc" stroke-width="6" stroke-dasharray="118 825" stroke-dashoffset="-430" stroke-opacity="0.45"/>
        <!-- Nocturne (21:00 - 05:00) -->
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fb7185" stroke-width="6" stroke-dasharray="210 733" stroke-dashoffset="-548" stroke-opacity="0.45"/>

        <!-- Progress Elapsed Arc -->
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#chronoTrackGrad)" stroke-width="12" stroke-dasharray="${942.5 * dayRatio} 942.5" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>

        <!-- Hour Ticks -->
        ${Array.from({ length: 24 }).map((_, i) => {
          const tickAngle = (i / 24) * 360 - 90;
          const tickRad = (tickAngle * Math.PI) / 180;
          const isMajor = i % 6 === 0;
          const rInner = isMajor ? r - 24 : r - 16;
          const rOuter = r - 8;
          const x1 = cx + rInner * Math.cos(tickRad);
          const y1 = cy + rInner * Math.sin(tickRad);
          const x2 = cx + rOuter * Math.cos(tickRad);
          const y2 = cy + rOuter * Math.sin(tickRad);
          const labelX = cx + (r - 36) * Math.cos(tickRad);
          const labelY = cy + (r - 36) * Math.sin(tickRad) + 4;
          return `
            <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${isMajor ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}" stroke-width="${isMajor ? 2.5 : 1}"/>
            ${isMajor ? `<text x="${labelX}" y="${labelY}" fill="rgba(255,255,255,0.5)" font-size="10" font-family="'JetBrains Mono', monospace" text-anchor="middle">${String(i).padStart(2,'0')}:00</text>` : ''}
          `;
        }).join('')}

        <!-- Active Sun/Moon Celestial Pointer Orb -->
        <circle cx="${orbX}" cy="${orbY}" r="12" fill="${phase.color}" filter="url(#orbGlow)" opacity="0.6"/>
        <circle cx="${orbX}" cy="${orbY}" r="7" fill="#ffffff" stroke="${phase.color}" stroke-width="3"/>
      `;

      svg.innerHTML = content;
      requestAnimationFrame(renderDial);
    }

    renderDial();
  }

  function initCognitiveCurve(canvasId) {
    energyCanvas = document.getElementById(canvasId);
    if (!energyCanvas) return;
    energyCtx = energyCanvas.getContext('2d');

    function resize() {
      const rect = energyCanvas.parentElement.getBoundingClientRect();
      energyCanvas.width = rect.width;
      energyCanvas.height = 200;
    }
    window.addEventListener('resize', resize);
    resize();

    let offset = 0;

    function render() {
      if (!energyCtx) return;
      const w = energyCanvas.width;
      const h = energyCanvas.height;
      energyCtx.clearRect(0, 0, w, h);

      offset += 0.02;

      // Draw Grid Lines
      energyCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      energyCtx.lineWidth = 1;
      for (let y = 30; y < h; y += 40) {
        energyCtx.beginPath();
        energyCtx.moveTo(0, y);
        energyCtx.lineTo(w, y);
        energyCtx.stroke();
      }

      // 1. Predicted Biological Energy Curve (Baseline Circadian Rhythm)
      energyCtx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const t = (x / w) * Math.PI * 2;
        // Natural dual-peak curve (morning boost + afternoon dip + evening surge)
        const yBase = h / 2 - Math.sin(t - 1.2) * 55 + Math.cos(t * 2) * 15;
        if (x === 0) energyCtx.moveTo(x, yBase);
        else energyCtx.lineTo(x, yBase);
      }
      energyCtx.strokeStyle = '#38bdf8';
      energyCtx.lineWidth = 3;
      energyCtx.shadowColor = 'rgba(56, 189, 248, 0.5)';
      energyCtx.shadowBlur = 10;
      energyCtx.stroke();
      energyCtx.shadowBlur = 0;

      // 2. Actual Focus Expenditure Curve (Real-time dynamic flow)
      energyCtx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const t = (x / w) * Math.PI * 2 + offset * 0.5;
        const yActual = h / 2 - Math.sin(t - 1.0) * 45 + Math.sin(t * 3) * 12 + Math.cos(x * 0.05 + offset) * 8;
        if (x === 0) energyCtx.moveTo(x, yActual);
        else energyCtx.lineTo(x, yActual);
      }
      energyCtx.strokeStyle = '#f59e0b';
      energyCtx.lineWidth = 2;
      energyCtx.setLineDash([4, 4]);
      energyCtx.stroke();
      energyCtx.setLineDash([]);

      // Legend overlay inside canvas
      energyCtx.fillStyle = '#38bdf8';
      energyCtx.fillRect(14, 16, 10, 4);
      energyCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      energyCtx.font = '11px Plus Jakarta Sans';
      energyCtx.fillText('Predicted Biological Baseline', 30, 20);

      energyCtx.fillStyle = '#f59e0b';
      energyCtx.fillRect(200, 16, 10, 4);
      energyCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      energyCtx.fillText('Actual Focus Telemetry', 216, 20);

      animId = requestAnimationFrame(render);
    }

    render();
  }

  return {
    initDial,
    initCognitiveCurve
  };
})();

window.Chronometer = Chronometer;
