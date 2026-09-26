/**
 * ChronoSync: Main Application Orchestrator
 * Coordinates UI state, navigation, modals, biometrics & PWA registration
 */

const App = (() => {
  let activeTab = 'dashboard';

  function init() {
    // 1. Initialize core engines
    CircadianEngine.applyTheme();
    TaskHabitEngine.init();
    LifeHub.init();

    // 2. Setup Dial & Visualizers
    Chronometer.initDial('chronoDialSvg', 'chronoTimeText', 'chronoPhaseName', 'chronoSubtext');
    Chronometer.initCognitiveCurve('cognitiveCurveCanvas');
    FocusStudio.initVisualizer('focusWaveCanvas');

    // 3. Render Initial Data
    TaskHabitEngine.renderTasks();
    TaskHabitEngine.renderOverview();
    TaskHabitEngine.renderHabits();
    TaskHabitEngine.renderAccessLimitUI();
    LifeHub.renderEmailInbox();
    LifeHub.renderCalendarEvents();

    // 4. Setup Event Listeners
    setupNavigation();
    setupModals();
    setupTelemetrySimulator();
    setupPhaseListener();
    registerServiceWorker();
    loadRetrospective();
  }

  function setupNavigation() {
    // Desktop Nav Buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
      });
    });

    // Mobile Bottom Nav Buttons
    document.querySelectorAll('.mobile-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
      });
    });
  }

  function switchTab(tabId) {
    activeTab = tabId;

    // Update Desktop Nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update Mobile Nav
    document.querySelectorAll('.mobile-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Toggle Tab Views
    document.querySelectorAll('.tab-view-content').forEach(view => {
      view.style.display = view.id === `tabView-${tabId}` ? 'block' : 'none';
    });

    // Re-render components if needed
    if (tabId === 'dashboard') {
      TaskHabitEngine.renderOverview();
    } else if (tabId === 'tasks') {
      TaskHabitEngine.renderTasks();
    } else if (tabId === 'habits') {
      TaskHabitEngine.renderHabits();
      TaskHabitEngine.renderAccessLimitUI();
    } else if (tabId === 'lifehub') {
      LifeHub.renderEmailInbox();
      LifeHub.renderCalendarEvents();
    }
  }

  function setupModals() {
    // Add Task Modal
    const modalTask = document.getElementById('modalAddTask');
    const btnOpenTask = document.getElementById('btnOpenAddTaskModal');
    const formTask = document.getElementById('formAddTask');

    if (btnOpenTask && modalTask) {
      btnOpenTask.addEventListener('click', () => openModal('modalAddTask'));
    }

    if (formTask) {
      formTask.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('inputTaskTitle').value;
        const phase = document.getElementById('selectTaskPhase').value;
        const strain = document.getElementById('selectTaskStrain').value;
        const duration = document.getElementById('inputTaskDuration').value || '30m';

        if (title.trim()) {
          TaskHabitEngine.addTask(title, phase, strain, duration);
          closeModal('modalAddTask');
          formTask.reset();
          showNotification(`Task scheduled for ${phase.toUpperCase()} phase!`);
        }
      });
    }

    // Access Limit Modal (Lifetime / Day Limits)
    const modalLimit = document.getElementById('modalAccessLimit');
    const btnOpenLimit = document.getElementById('btnOpenAccessModal');
    const formLimit = document.getElementById('formAccessLimit');

    if (btnOpenLimit && modalLimit) {
      btnOpenLimit.addEventListener('click', () => openModal('modalAccessLimit'));
    }

    if (formLimit) {
      formLimit.addEventListener('submit', (e) => {
        e.preventDefault();
        const mode = document.getElementById('selectAccessMode').value;
        const customDays = document.getElementById('inputCustomDays').value;
        TaskHabitEngine.setAccessMode(mode, customDays);
        closeModal('modalAccessLimit');
        showNotification(`Plan updated: ${mode === 'lifetime' ? 'Lifetime Access Enabled' : mode}`);
      });
    }

    // Close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('open');
        }
      });
    });
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  }

  function setupPhaseListener() {
    // Manual phase switcher dropdown
    const select = document.getElementById('phaseOverrideSelect');
    if (select) {
      select.value = CircadianEngine.getOverride();
      select.addEventListener('change', (e) => {
        CircadianEngine.setOverride(e.target.value);
        showNotification(`Circadian Theme shifted to: ${e.target.selectedOptions[0].text}`);
      });
    }

    CircadianEngine.onPhaseChange((phase) => {
      const badge = document.getElementById('headerPhaseBadge');
      if (badge) {
        badge.textContent = phase.name.toUpperCase();
        badge.style.color = phase.color;
      }
    });
  }

  function setupTelemetrySimulator() {
    // Subtle real-time fluctuations to vitals to simulate live biometric tracker (Whoop / Oura)
    setInterval(() => {
      const hrEl = document.getElementById('vitalHeartRate');
      const hrvEl = document.getElementById('vitalHRV');
      if (hrEl) {
        const baseHR = 62;
        const currentHR = baseHR + Math.floor(Math.sin(Date.now() / 4000) * 3);
        hrEl.textContent = `${currentHR} bpm`;
      }
      if (hrvEl) {
        const baseHRV = 76;
        const currentHRV = baseHRV + Math.floor(Math.cos(Date.now() / 6000) * 4);
        hrvEl.textContent = `${currentHRV} ms`;
      }
    }, 3000);
  }

  function saveRetrospective() {
    const textarea = document.getElementById('retrospectiveInput');
    if (textarea) {
      localStorage.setItem('chronosync_retrospective', textarea.value);
      showNotification('Retrospective entry synced to biological archive.');
    }
  }

  function loadRetrospective() {
    const textarea = document.getElementById('retrospectiveInput');
    if (textarea) {
      textarea.value = localStorage.getItem('chronosync_retrospective') || 
        'Peak focus window was well guarded from meeting noise. Managed 90-min deep architecture sprint with zero contextual fatigue.';
    }
  }

  function showNotification(msg) {
    let toast = document.getElementById('appToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appToast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: var(--bg-tertiary);
        color: var(--text-main);
        border: 1px solid var(--accent-secondary);
        box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        padding: 12px 20px;
        border-radius: 9999px;
        font-size: 13px;
        font-weight: 600;
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
      `;
      document.body.appendChild(toast);
    }
    toast.innerHTML = `✨ <span>${msg}</span>`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
    }, 3500);
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(
          (reg) => console.log('ChronoSync PWA registered successfully: ', reg.scope),
          (err) => console.warn('Service worker registration failed: ', err)
        );
      });
    }
  }

  return {
    init,
    switchTab,
    openModal,
    closeModal,
    showNotification,
    saveRetrospective
  };
})();

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.App = App;
