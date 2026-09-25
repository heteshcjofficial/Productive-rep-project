/**
 * ChronoSync: Unified Life Hub
 * Multi-Calendar Orchestration & Zero-Inbox Biometric Email Triage
 */

const LifeHub = (() => {
  const EMAILS_KEY = 'chronosync_emails_v1';
  const EVENTS_KEY = 'chronosync_events_v1';

  const DEFAULT_EMAILS = [
    {
      id: 'em-1',
      sender: 'Dr. Evelyn Vance (Chief AI Architect)',
      avatar: 'EV',
      email: 'evelyn.vance@neuralforge.io',
      time: '14:22',
      urgency: 'high',
      isCompleted: false,
      subject: 'Critical: Pre-Merge Review of Circadian WebGL Shader Pipeline',
      snippet: 'We benchmarked the particle wave canvas at 60 FPS on mobile. Please verify the Web Audio binaural frequency harmonics before push to production.',
      recommendedPhase: 'peak',
      suggestedReply: 'Reviewed the WebGL pipeline. Frame timings remain solid at 16.6ms with zero memory drift. Approved for deploy.'
    },
    {
      id: 'em-2',
      sender: 'Venture Board Syndicate',
      avatar: 'VB',
      email: 'partners@apexventures.capital',
      time: '11:05',
      urgency: 'medium',
      isCompleted: false,
      subject: 'Q3 Product Telemetry & Lifetime User Retention Metrics',
      snippet: 'Excited by the biological circadian adherence graphs. Could you send the aggregated focus index data ahead of Thursday sync?',
      recommendedPhase: 'twilight',
      suggestedReply: 'Telemetry summary prepared and attached. Our deep focus compliance rate is tracking above 84%.'
    },
    {
      id: 'em-3',
      sender: 'GitHub Security Advisories',
      avatar: 'GH',
      email: 'notifications@github.com',
      time: '09:12',
      urgency: 'low',
      isCompleted: true,
      subject: '[Resolved] Dependency audit passed for biometric healthkit bridge',
      snippet: 'All 0 vulnerability alerts addressed. Automated test suite reported 100% pass across iOS HealthKit and Android Health Connect modules.',
      recommendedPhase: 'dawn',
      suggestedReply: 'Acknowledged and archived.'
    }
  ];

  const DEFAULT_EVENTS = [
    {
      id: 'ev-1',
      provider: 'google',
      providerName: 'Google Calendar',
      title: 'Protected Deep Work Sprint (Neuro-Architecture)',
      time: '08:30 – 11:30',
      isProtected: true,
      cost: 'high',
      attendees: 1
    },
    {
      id: 'ev-2',
      provider: 'outlook',
      providerName: 'Microsoft Outlook',
      title: 'Executive Product Alignment & Architecture Review',
      time: '11:45 – 12:30',
      isProtected: false,
      cost: 'med',
      attendees: 4
    },
    {
      id: 'ev-3',
      provider: 'google',
      providerName: 'Google Calendar',
      title: 'Protected Deep Work Sprint (Core Algorithms)',
      time: '13:30 – 15:30',
      isProtected: true,
      cost: 'high',
      attendees: 1
    },
    {
      id: 'ev-4',
      provider: 'apple',
      providerName: 'Apple CalDAV',
      title: 'Circadian Twilight Team Sync & Loom Handoff',
      time: '17:00 – 17:30',
      isProtected: false,
      cost: 'low',
      attendees: 5
    }
  ];

  let emails = [];
  let events = [];
  let activeCalendarFilter = 'all';

  function init() {
    try {
      const storedEmails = localStorage.getItem(EMAILS_KEY);
      emails = storedEmails ? JSON.parse(storedEmails) : DEFAULT_EMAILS;

      const storedEvents = localStorage.getItem(EVENTS_KEY);
      events = storedEvents ? JSON.parse(storedEvents) : DEFAULT_EVENTS;
    } catch (e) {
      emails = DEFAULT_EMAILS;
      events = DEFAULT_EVENTS;
    }
  }

  function saveEmails() {
    localStorage.setItem(EMAILS_KEY, JSON.stringify(emails));
    renderEmailInbox();
  }

  function saveEvents() {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    renderCalendarEvents();
  }

  function convertEmailToTask(emailId) {
    const email = emails.find(e => e.id === emailId);
    if (!email) return;

    // Add to task engine
    TaskHabitEngine.addTask(
      `[Email Action] ${email.subject}`,
      email.recommendedPhase || 'peak',
      email.urgency === 'high' ? 'high' : 'med',
      '30m',
      'Gmail Triage'
    );

    email.isCompleted = true;
    saveEmails();

    if (window.App) {
      window.App.showNotification(`Task generated: "${email.subject.substring(0, 30)}..." in ${email.recommendedPhase.toUpperCase()} phase!`);
    }
  }

  function slotEmailTomorrowDawn(emailId) {
    const email = emails.find(e => e.id === emailId);
    if (!email) return;

    TaskHabitEngine.addTask(
      `[Dawn Priority] ${email.subject}`,
      'dawn',
      'low',
      '15m',
      'Deferred Email'
    );

    email.isCompleted = true;
    saveEmails();

    if (window.App) {
      window.App.showNotification(`Slotted into Tomorrow's Dawn Intention block!`);
    }
  }

  function quickReplyEmail(emailId) {
    const email = emails.find(e => e.id === emailId);
    if (!email) return;

    const reply = prompt(`Reply to ${email.sender}:\nSuggested Response:`, email.suggestedReply);
    if (reply !== null) {
      email.isCompleted = true;
      saveEmails();
      if (window.App) {
        window.App.showNotification(`Smart reply transmitted to ${email.sender}!`);
      }
    }
  }

  function toggleEmailComplete(emailId) {
    const email = emails.find(e => e.id === emailId);
    if (email) {
      email.isCompleted = !email.isCompleted;
      saveEmails();
    }
  }

  function addCalendarEvent(title, time, provider = 'google', cost = 'med', isProtected = false) {
    const newEvent = {
      id: 'ev-' + Date.now(),
      provider,
      providerName: provider === 'google' ? 'Google Calendar' : provider === 'outlook' ? 'Microsoft Outlook' : 'Apple CalDAV',
      title: title.trim(),
      time,
      isProtected,
      cost,
      attendees: 1
    };
    events.push(newEvent);
    saveEvents();
    return newEvent;
  }

  function setCalendarFilter(provider) {
    activeCalendarFilter = provider;
    // Update pills active state
    document.querySelectorAll('.cal-toggle-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.provider === provider);
    });
    renderCalendarEvents();
  }

  // Renderers
  function renderEmailInbox() {
    const container = document.getElementById('emailTriageContainer');
    const badgeEl = document.getElementById('emailInboxCountBadge');
    if (!container) return;

    const uncompletedCount = emails.filter(e => !e.isCompleted).length;
    if (badgeEl) badgeEl.textContent = `${uncompletedCount} Actionable`;

    if (emails.length === 0) {
      container.innerHTML = `<div style="color:var(--text-dim);text-align:center;padding:24px 0;">Zero-Inbox reached. Pristine circadian peace.</div>`;
      return;
    }

    container.innerHTML = emails.map(e => `
      <div class="email-card ${e.isCompleted ? 'completed' : ''}" style="${e.isCompleted ? 'opacity:0.5;' : ''}">
        <div class="email-card-header">
          <div class="email-sender">
            <span style="display:inline-block;width:24px;height:24px;border-radius:6px;background:var(--badge-bg);color:var(--accent-secondary);font-size:10px;text-align:center;line-height:24px;font-weight:700;">${e.avatar}</span>
            <span>${escapeHTML(e.sender)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="badge ${e.urgency === 'high' ? 'badge-danger' : e.urgency === 'medium' ? 'badge-warning' : 'badge-success'}">${e.urgency.toUpperCase()} PRIORITY</span>
            <span class="email-time">${e.time}</span>
          </div>
        </div>

        <div class="email-subject">${escapeHTML(e.subject)}</div>
        <div class="email-snippet">${escapeHTML(e.snippet)}</div>

        <div class="email-actions-bar">
          ${!e.isCompleted ? `
            <button class="email-action-btn" onclick="LifeHub.convertEmailToTask('${e.id}')">
              ⚡ Convert to ${e.recommendedPhase.toUpperCase()} Task
            </button>
            <button class="email-action-btn" onclick="LifeHub.slotEmailTomorrowDawn('${e.id}')">
              🌅 Slot in Tomorrow Dawn
            </button>
            <button class="email-action-btn" onclick="LifeHub.quickReplyEmail('${e.id}')">
              💬 Smart Quick Reply
            </button>
          ` : `
            <span class="badge badge-success">✓ Processed & Completed</span>
          `}
          <button class="email-action-btn" style="margin-left:auto;" onclick="LifeHub.toggleEmailComplete('${e.id}')">
            ${e.isCompleted ? 'Mark Pending' : 'Mark Done'}
          </button>
        </div>
      </div>
    `).join('');
  }

  function renderCalendarEvents() {
    const container = document.getElementById('calendarEventsContainer');
    if (!container) return;

    const filtered = activeCalendarFilter === 'all' 
      ? events 
      : events.filter(e => e.provider === activeCalendarFilter);

    if (filtered.length === 0) {
      container.innerHTML = `<div style="color:var(--text-dim);text-align:center;padding:24px 0;">No scheduled events for selected calendar.</div>`;
      return;
    }

    container.innerHTML = filtered.map(e => `
      <div class="cal-event-card ${e.isProtected ? 'deep-slot-protected' : ''}">
        <div>
          <div class="cal-event-time">${e.time} • <strong style="color:var(--accent-secondary);">${e.providerName}</strong></div>
          <div class="cal-event-name" style="margin-top:2px;">
            ${e.isProtected ? '🛡️ [PROTECTED DEEP SLOT] ' : ''}${escapeHTML(e.title)}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="badge ${e.cost === 'high' ? 'badge-danger' : e.cost === 'med' ? 'badge-warning' : 'badge-success'}">
            ${e.cost.toUpperCase()} ENERGY TAX
          </span>
          ${e.isProtected ? '<span class="badge badge-indigo">DEEP WORK LOCKED</span>' : ''}
        </div>
      </div>
    `).join('');
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init,
    convertEmailToTask,
    slotEmailTomorrowDawn,
    quickReplyEmail,
    toggleEmailComplete,
    addCalendarEvent,
    setCalendarFilter,
    renderEmailInbox,
    renderCalendarEvents
  };
})();

window.LifeHub = LifeHub;
