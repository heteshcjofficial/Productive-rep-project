/**
 * ChronoSync: Phase-Gated Task & Daily Habit Engine
 * Includes Lifetime Access / Custom Day Limit Manager
 */

const TaskHabitEngine = (() => {
  const TASKS_KEY = 'chronosync_tasks_v1';
  const HABITS_KEY = 'chronosync_habits_v1';
  const ACCESS_LIMIT_KEY = 'chronosync_access_limit_v1';

  // Default Initial Tasks partitioned by biological phase
  const DEFAULT_TASKS = [
    {
      id: 't-1',
      phase: 'dawn',
      title: 'Review System Metrics & Hydrate (1L Electrolytes)',
      strain: 'low',
      duration: '15m',
      completed: true,
      source: 'Routine'
    },
    {
      id: 't-2',
      phase: 'dawn',
      title: 'Strategic Intention Setting & Priority Triad',
      strain: 'med',
      duration: '20m',
      completed: true,
      source: 'Routine'
    },
    {
      id: 't-3',
      phase: 'peak',
      title: 'Refactor Authentication Rotation & Session Engine',
      strain: 'high',
      duration: '90m',
      completed: false,
      source: 'Direct'
    },
    {
      id: 't-4',
      phase: 'peak',
      title: 'Q3 Product Architecture Deck & API Schemas',
      strain: 'high',
      duration: '75m',
      completed: false,
      source: 'Direct'
    },
    {
      id: 't-5',
      phase: 'twilight',
      title: 'Zero-Inbox Triage & Asynchronous Loom Reviews',
      strain: 'med',
      duration: '45m',
      completed: false,
      source: 'Email Sync'
    },
    {
      id: 't-6',
      phase: 'twilight',
      title: 'Sync with Team on Sprint Velocity & Unblockers',
      strain: 'low',
      duration: '30m',
      completed: false,
      source: 'Calendar'
    },
    {
      id: 't-7',
      phase: 'nocturne',
      title: 'Nocturne Melatonin Wind-Down & Retrospective Log',
      strain: 'low',
      duration: '20m',
      completed: false,
      source: 'Routine'
    }
  ];

  // Default Daily Habits with day-to-day completion
  const DEFAULT_HABITS = [
    {
      id: 'h-1',
      title: 'Circadian Sunlight Morning Exposure',
      category: 'Biological',
      icon: '☀️',
      streak: 18,
      days: [true, true, true, true, true, true, true] // Last 7 days
    },
    {
      id: 'h-2',
      title: '90-min Deep Focus Block (No Multitasking)',
      category: 'Cognitive',
      icon: '⚡',
      streak: 12,
      days: [true, true, true, true, false, true, true]
    },
    {
      id: 'h-3',
      title: 'Zero-Inbox Twilight Communication Triage',
      category: 'Productivity',
      icon: '📥',
      streak: 7,
      days: [true, true, true, true, true, false, true]
    },
    {
      id: 'h-4',
      title: 'Blue-Light Shield Active by 21:00',
      category: 'Recovery',
      icon: '🌙',
      streak: 21,
      days: [true, true, true, true, true, true, false]
    }
  ];

  // Access limits state
  let accessLimitState = {
    mode: 'lifetime', // 'lifetime', '30days', '90days', '365days', 'custom'
    daysLimit: 99999,
    startDate: new Date().toISOString(),
    unlockedFeatures: ['all', 'multi-calendar', 'email-triage', 'focus-studio', 'analytics']
  };

  let tasks = [];
  let habits = [];

  function init() {
    try {
      const storedTasks = localStorage.getItem(TASKS_KEY);
      tasks = storedTasks ? JSON.parse(storedTasks) : DEFAULT_TASKS;

      const storedHabits = localStorage.getItem(HABITS_KEY);
      habits = storedHabits ? JSON.parse(storedHabits) : DEFAULT_HABITS;

      const storedLimit = localStorage.getItem(ACCESS_LIMIT_KEY);
      if (storedLimit) {
        accessLimitState = JSON.parse(storedLimit);
      }
    } catch (e) {
      console.error('Storage parse error, resetting defaults:', e);
      tasks = DEFAULT_TASKS;
      habits = DEFAULT_HABITS;
    }
  }

  function saveTasks() {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    renderTasks();
    renderOverview();
  }

  function saveHabits() {
    localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
    renderHabits();
  }

  function saveAccessLimit() {
    localStorage.setItem(ACCESS_LIMIT_KEY, JSON.stringify(accessLimitState));
    renderAccessLimitUI();
  }

  function addTask(title, phase, strain = 'med', duration = '30m', source = 'User') {
    const newTask = {
      id: 't-' + Date.now(),
      phase: phase || CircadianEngine.getEffectivePhase().id,
      title: title.trim(),
      strain,
      duration,
      completed: false,
      source
    };
    tasks.push(newTask);
    saveTasks();
    return newTask;
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      saveTasks();
    }
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
  }

  function toggleHabitDay(habitId, dayIndex) {
    const habit = habits.find(h => h.id === habitId);
    if (habit && habit.days[dayIndex] !== undefined) {
      habit.days[dayIndex] = !habit.days[dayIndex];
      // Recalculate streak
      let currentStreak = 0;
      for (let i = habit.days.length - 1; i >= 0; i--) {
        if (habit.days[i]) currentStreak++;
        else break;
      }
      habit.streak = Math.max(habit.streak, currentStreak);
      saveHabits();
    }
  }

  function addHabit(title, icon = '🎯', category = 'General') {
    const newHabit = {
      id: 'h-' + Date.now(),
      title: title.trim(),
      icon,
      category,
      streak: 1,
      days: [false, false, false, false, false, false, true]
    };
    habits.push(newHabit);
    saveHabits();
  }

  function setAccessMode(mode, customDays = 30) {
    accessLimitState.mode = mode;
    if (mode === 'lifetime') {
      accessLimitState.daysLimit = 99999;
    } else if (mode === '30days') {
      accessLimitState.daysLimit = 30;
    } else if (mode === '90days') {
      accessLimitState.daysLimit = 90;
    } else if (mode === '365days') {
      accessLimitState.daysLimit = 365;
    } else {
      accessLimitState.daysLimit = parseInt(customDays, 10) || 30;
    }
    saveAccessLimit();
  }

  function getDaysRemaining() {
    if (accessLimitState.mode === 'lifetime') return '∞ (Lifetime Access)';
    const start = new Date(accessLimitState.startDate).getTime();
    const now = Date.now();
    const daysElapsed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    const remaining = accessLimitState.daysLimit - daysElapsed;
    return remaining > 0 ? `${remaining} Days Remaining` : 'Expired (Renew Anytime)';
  }

  // Renderers
  function renderTasks() {
    const phases = ['dawn', 'peak', 'twilight', 'nocturne'];
    phases.forEach(p => {
      const container = document.getElementById(`tasks-list-${p}`);
      if (!container) return;

      const filtered = tasks.filter(t => t.phase === p);
      if (filtered.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dim);font-size:12px;text-align:center;padding:24px 0;">No active tasks in this phase</div>`;
        return;
      }

      container.innerHTML = filtered.map(t => `
        <div class="task-card ${t.completed ? 'completed' : ''}" onclick="TaskHabitEngine.toggleTask('${t.id}')">
          <div class="task-card-top">
            <div class="task-checkbox-wrap">
              <div class="custom-checkbox ${t.completed ? 'checked' : ''}"></div>
              <span class="task-title">${escapeHTML(t.title)}</span>
            </div>
            <button onclick="event.stopPropagation(); TaskHabitEngine.deleteTask('${t.id}')" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:14px;">×</button>
          </div>
          <div class="task-tags-row">
            <span class="task-strain-tag strain-${t.strain}">${t.strain} strain</span>
            <span class="task-duration-tag">⏱ ${t.duration}</span>
            <span style="color:var(--text-dim);font-size:10px;">• ${t.source}</span>
          </div>
        </div>
      `).join('');
    });

    // Update telemetry sprint completion rate
    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    const rate = total > 0 ? Math.round((done / total) * 100) : 100;
    const rateEl = document.getElementById('sprintRateValue');
    if (rateEl) rateEl.textContent = `${rate}%`;
  }

  function renderOverview() {
    const container = document.getElementById('dashboardFlowList');
    if (!container) return;
    const currentPhase = CircadianEngine.getEffectivePhase().id;
    const activeTasks = tasks.filter(t => t.phase === currentPhase && !t.completed).slice(0, 3);
    
    if (activeTasks.length === 0) {
      container.innerHTML = `<div style="color:var(--text-dim);font-size:12px;padding:8px 0;">All current phase goals completed. Stellar flow!</div>`;
      return;
    }

    container.innerHTML = activeTasks.map(t => `
      <div class="flow-item" onclick="TaskHabitEngine.toggleTask('${t.id}')">
        <div class="flow-item-left">
          <div class="custom-checkbox ${t.completed ? 'checked' : ''}"></div>
          <div>
            <div class="flow-item-title">${escapeHTML(t.title)}</div>
            <div class="flow-item-meta">${t.strain.toUpperCase()} STRAIN • ⏱ ${t.duration}</div>
          </div>
        </div>
        <span class="badge ${t.completed ? 'badge-success' : 'badge-warning'}">${t.completed ? 'DONE' : 'IN FLOW'}</span>
      </div>
    `).join('');
  }

  function renderHabits() {
    const container = document.getElementById('habitsListContainer');
    if (!container) return;

    const daysLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    container.innerHTML = habits.map(h => `
      <div class="habit-row-card">
        <div class="habit-main-info">
          <div class="habit-icon-pill">${h.icon}</div>
          <div class="habit-details">
            <h4>${escapeHTML(h.title)}</h4>
            <p>${h.category} • Current Streak: <strong style="color:var(--accent-secondary);">${h.streak} Days</strong></p>
          </div>
        </div>

        <div class="week-day-trackers">
          ${h.days.map((isDone, idx) => `
            <div class="day-box">
              <span class="day-box-label">${daysLabels[idx]}</span>
              <button class="day-check-btn ${isDone ? 'done' : ''}" onclick="TaskHabitEngine.toggleHabitDay('${h.id}', ${idx})">
                ✓
              </button>
            </div>
          `).join('')}
        </div>

        <div class="habit-streak-badge">
          🔥 ${h.streak}d Streak
        </div>
      </div>
    `).join('');
  }

  function renderAccessLimitUI() {
    const badgeEl = document.getElementById('lifetimeBadgeText');
    const remainingEl = document.getElementById('accessRemainingText');
    if (badgeEl) badgeEl.textContent = accessLimitState.mode === 'lifetime' ? 'LIFETIME ACCESS ACTIVATED' : `${accessLimitState.mode.toUpperCase()} PLAN`;
    if (remainingEl) remainingEl.textContent = getDaysRemaining();
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init,
    getTasks: () => tasks,
    getHabits: () => habits,
    addTask,
    toggleTask,
    deleteTask,
    toggleHabitDay,
    addHabit,
    setAccessMode,
    getAccessState: () => accessLimitState,
    renderTasks,
    renderOverview,
    renderHabits,
    renderAccessLimitUI
  };
})();

window.TaskHabitEngine = TaskHabitEngine;
