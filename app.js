// ---------- Data (from "exams schedule.xlsx") ----------
const COURSES = {
  instruments: { name: 'מכשירים פיננסיים', lecturer: 'אלי פאר / שלמה דאובר', color: '#7c5cff' },
  advAcct:     { name: 'חשבונאות פיננסית מתקדמת ב׳', lecturer: 'אלי פאר / שלמה דאובר', color: '#2f8cff' },
  finReview:   { name: 'פיננסית - חזרות והשלמות', lecturer: 'רונן קליינמן', color: '#14b8a6' },
  itAudit:     { name: 'ביקורת מערכות מידע ממוחשבות בשילוב AI', lecturer: 'אלון כהן', color: '#f5a524' },
  advAudit:    { name: 'ביקורת מתקדמת ב׳', lecturer: 'אלון כהן', color: '#ff5d73' },
  auditBasics: { name: 'יסודות הביקורת - חזרות והשלמות', lecturer: 'אלון כהן', color: '#84cc16' },
};

const EXAMS = [
  { course: 'instruments', moed: 'א', date: '2026-10-25', time: '09:00' },
  { course: 'advAcct',     moed: 'א', date: '2026-11-05', time: '09:00' },
  { course: 'finReview',   moed: 'א', date: '2026-11-16', time: '09:00' },
  { course: 'itAudit',     moed: 'א', date: '2026-11-22', time: '09:00' },
  { course: 'advAudit',    moed: 'א', date: '2026-12-03', time: '09:00' },
  { course: 'auditBasics', moed: 'א', date: '2026-12-13', time: '09:00' },
  { course: 'instruments', moed: 'ב', date: '2026-12-21', time: '09:00' },
  { course: 'advAcct',     moed: 'ב', date: '2026-12-31', time: '09:00' },
  { course: 'finReview',   moed: 'ב', date: '2027-01-10', time: '09:00' },
  { course: 'advAudit',    moed: 'ב', date: '2027-01-19', time: '09:00' },
  { course: 'itAudit',     moed: 'ב', date: '2027-01-25', time: '09:00' },
  { course: 'auditBasics', moed: 'ב', date: '2027-02-04', time: '09:00' },
].map((e, i) => ({ ...e, id: `exam-${i}`, ...COURSES[e.course] }));

const MOEDS = [
  { key: 'a', moed: 'א', title: 'מועדי א׳' },
  { key: 'b', moed: 'ב', title: 'מועדי ב׳' },
];

// ---------- Date helpers (all in Israel time, day granularity) ----------
const DAY = 86400000;
const toUTC = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const israelISO = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(date);
const todayISO = () => israelISO(new Date());
// Days left = today counted, exam day not counted (e.g. exam tomorrow → 1).
const daysUntil = (iso, today) => Math.round((toUTC(iso) - toUTC(today)) / DAY);

const fmt = (opts) => new Intl.DateTimeFormat('he-IL', { timeZone: 'UTC', ...opts });
const fmtLong = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtDate = fmt({ day: 'numeric', month: 'long' });
const fmtShortDate = fmt({ day: 'numeric', month: 'short' });
const fmtWeekday = fmt({ weekday: 'long' });
const fmtShortMonth = fmt({ month: 'short' });

function weeksText(d) {
  if (d < 7) return '';
  const w = Math.floor(d / 7), r = d % 7;
  const wt = w === 1 ? 'שבוע' : w === 2 ? 'שבועיים' : `${w} שבועות`;
  if (!r) return `בדיוק ${wt}`;
  const rt = r === 1 ? 'ויום' : r === 2 ? 'ויומיים' : `ו-${r} ימים`;
  return `${wt} ${rt}`;
}

function status(d) {
  if (d < 0) return { cls: 'past', label: 'הסתיים ✓' };
  if (d === 0) return { cls: 'today', label: 'היום! בהצלחה 🍀' };
  if (d === 1) return { cls: 'soon', label: 'מחר!' };
  if (d <= 7) return { cls: 'soon', label: 'השבוע' };
  return { cls: '', label: '' };
}

const unit = (d) => (d === 1 ? 'יום' : 'ימים');
const moedLabel = (m) => `מועד ${m}׳`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const store = {
  get(k, def) { try { return localStorage.getItem(k) ?? def; } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  getJSON(k, def) { try { const v = JSON.parse(this.get(k, 'null')); return v ?? def; } catch { return def; } },
  setJSON(k, v) { this.set(k, JSON.stringify(v)); },
};

// ---------- Rendering ----------
function countBlock(d) {
  if (d === 0) return `<span class="num word">היום</span>`;
  if (d < 0) return `<span class="num word">עבר</span>`;
  return `<span class="num">${d}</span><span class="unit">${unit(d)}</span>`;
}

function heroHTML(m, exams) {
  const next = exams.find((e) => e.d >= 0);
  if (!next) {
    return `
      <section class="hero done">
        <div class="hero-info">
          <p class="hero-kicker">${m.title}</p>
          <h2>סיימת את כל ${m.title} 🎉</h2>
          <p class="hero-sub">כל הכבוד!</p>
        </div>
      </section>`;
  }
  const st = status(next.d);
  const kicker = next === exams[0] && next.d > 0 ? `המבחן הראשון ב${m.title}` : `המבחן הבא ב${m.title}`;
  return `
    <section class="hero" style="--c:${next.color}">
      <div class="hero-info">
        <p class="hero-kicker">${kicker}</p>
        <h2>${esc(next.name)}</h2>
        <p class="hero-meta">
          <span class="pill">${moedLabel(next.moed)}</span>
          <span>${fmtWeekday.format(toUTC(next.date))}, ${fmtDate.format(toUTC(next.date))}</span>
          <span class="sep">·</span><span>${next.time}</span>
        </p>
        <p class="hero-sub">${st.label || weeksText(next.d)}</p>
      </div>
      <div class="hero-count">${countBlock(next.d)}</div>
    </section>`;
}

function statsHTML(exams) {
  const left = exams.filter((e) => e.d >= 0).length;
  const pct = Math.round(((exams.length - left) / exams.length) * 100);
  const stat = (label, e) => `
    <div class="stat">
      <span class="stat-label">${label}</span>
      <span class="stat-val">${e.d >= 0 ? e.d : '✓'}<small> ${e.d >= 0 ? unit(e.d) : ''}</small></span>
      <span class="stat-foot">${fmtDate.format(toUTC(e.date))}</span>
    </div>`;
  return `
    <section class="stats">
      <div class="stat">
        <span class="stat-label">מבחנים שנותרו</span>
        <span class="stat-val">${left}<small> / ${exams.length}</small></span>
        <span class="progress" style="--p:${pct}%"><i></i></span>
      </div>
      ${stat('עד הראשון', exams[0])}
      ${stat('עד האחרון', exams.at(-1))}
    </section>`;
}

function timelineHTML(m, exams, today) {
  const t = toUTC(today);
  const start = Math.min(t, toUTC(exams[0].date)) - 4 * DAY;
  const end = toUTC(exams.at(-1).date) + 4 * DAY;
  const pct = (x) => ((x - start) / (end - start)) * 100;

  let months = '';
  const s = new Date(start);
  for (let mo = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 1)); mo.getTime() < end; mo.setUTCMonth(mo.getUTCMonth() + 1)) {
    months += `<span class="tick" style="inset-inline-start:${pct(mo.getTime())}%"><b>${fmtShortMonth.format(mo)}</b></span>`;
  }
  const todayMark = t <= end ? `<span class="tl-today" style="inset-inline-start:${pct(t)}%"><b>היום</b></span>` : '';
  const dots = exams.map((e, i) => `
    <button type="button" class="tl-dot ${e.d < 0 ? 'past' : ''} ${i % 2 ? 'down' : 'up'}"
      style="inset-inline-start:${pct(toUTC(e.date))}%; --c:${e.color}"
      data-target="${e.id}" title="${esc(e.name)} · ${fmtDate.format(toUTC(e.date))}"
      aria-label="${esc(e.name)}, ${e.d >= 0 ? `בעוד ${e.d} ${unit(e.d)}` : 'הסתיים'}">
      <span class="tl-label">${e.d > 0 ? e.d : e.d === 0 ? '!' : '✓'}</span>
    </button>`).join('');

  return `
    <section class="panel">
      <div class="panel-head">
        <h2>ציר זמן · ${m.title}</h2>
        <span class="panel-note">${fmtShortDate.format(toUTC(exams[0].date))} – ${fmtShortDate.format(toUTC(exams.at(-1).date))}</span>
      </div>
      <div class="timeline">
        <div class="tl-track"><span class="tl-fill" style="width:${Math.max(0, Math.min(100, pct(t)))}%"></span></div>
        ${months}${todayMark}${dots}
      </div>
    </section>`;
}

function card(e) {
  const st = status(e.d);
  return `
    <article class="card ${st.cls}" id="${e.id}" style="--c:${e.color}">
      <div class="card-top">
        <span class="pill">${moedLabel(e.moed)}</span>
        ${st.label ? `<span class="flag">${st.label}</span>` : ''}
      </div>
      <h3>${esc(e.name)}</h3>
      <div class="count">${countBlock(e.d)}</div>
      <p class="weeks">${e.d > 0 ? weeksText(e.d) || '&nbsp;' : '&nbsp;'}</p>
      <dl class="meta">
        <div><dt>תאריך</dt><dd>${fmtWeekday.format(toUTC(e.date))}, ${fmtDate.format(toUTC(e.date))}</dd></div>
        <div><dt>שעה</dt><dd>${e.time}</dd></div>
        <div><dt>מרצה</dt><dd>${esc(e.lecturer)}</dd></div>
        <div><dt>ימי הפרש מהמבחן הקודם</dt><dd>${e.gap ?? '—'}</dd></div>
      </dl>
      ${e.d >= 0 ? `
      <div class="card-foot">
        <p class="card-study" data-study="${e.id}" hidden></p>
        <button type="button" class="study-btn" data-study-exam="${e.id}" aria-label="התחל ללמוד ל${esc(e.name)} ${moedLabel(e.moed)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z"/></svg>התחל ללמוד
        </button>
      </div>` : ''}
    </article>`;
}

function boardHTML(m, exams, today) {
  const upcoming = exams.filter((e) => e.d >= 0);
  const past = exams.filter((e) => e.d < 0);
  return `
    <section class="board" id="board-${m.key}" role="tabpanel" aria-labelledby="tab-${m.key}">
      ${heroHTML(m, exams)}
      ${statsHTML(exams)}
      ${timelineHTML(m, exams, today)}
      <h2 class="section-title">כל המבחנים · ${m.title}</h2>
      <div class="grid">${upcoming.map(card).join('')}${past.map(card).join('')}</div>
    </section>`;
}

function tabsHTML(byMoed) {
  return MOEDS.map((m) => {
    const ex = byMoed[m.key];
    const left = ex.filter((e) => e.d >= 0).length;
    const range = `${fmtShortDate.format(toUTC(ex[0].date))} – ${fmtShortDate.format(toUTC(ex.at(-1).date))}`;
    return `
      <button type="button" class="board-tab" id="tab-${m.key}" data-tab="${m.key}" role="tab" aria-controls="board-${m.key}">
        <span class="tab-title">${m.title}</span>
        <span class="tab-meta">${range} · ${left ? `נותרו ${left}` : 'הסתיים ✓'}</span>
      </button>`;
  }).join('');
}

// ---------- Board switching (tabs + swipe) ----------
const boardsEl = document.getElementById('boards');
const tabsEl = document.getElementById('tabs');
let active = null;

function markActive(key) {
  active = key;
  tabsEl.dataset.active = key;
  tabsEl.querySelectorAll('[data-tab]').forEach((b) => {
    const on = b.dataset.tab === key;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  // While the timer page is open its own hash (#timer) stays in the address bar
  if (view === 'dashboard' && location.hash !== `#moed-${key}`) history.replaceState(null, '', `#moed-${key}`);
}

function showBoard(key, smooth = true) {
  const i = MOEDS.findIndex((m) => m.key === key);
  if (i < 0) return;
  markActive(key);
  // RTL scroll: 0 at the first (rightmost) board, negative toward the next ones
  const step = boardsEl.clientWidth + (parseFloat(getComputedStyle(boardsEl).columnGap) || 0);
  boardsEl.scrollTo({ left: -i * step, behavior: smooth ? 'smooth' : 'auto' });
  const tabsTop = tabsEl.getBoundingClientRect().top + scrollY - 8;
  if (smooth && scrollY > tabsTop) scrollTo({ top: tabsTop, behavior: 'smooth' });
}

// Keep the tabs in sync when the user swipes between boards
let scrollTimer;
boardsEl.addEventListener('scroll', () => {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    const i = Math.round(Math.abs(boardsEl.scrollLeft) / boardsEl.clientWidth);
    const key = MOEDS[Math.min(i, MOEDS.length - 1)].key;
    if (key !== active) markActive(key);
  }, 80);
}, { passive: true });
// Re-align only on width changes (mobile address-bar show/hide fires height-only resizes)
let lastWidth = innerWidth;
addEventListener('resize', () => {
  if (innerWidth === lastWidth || !active) return;
  lastWidth = innerWidth;
  showBoard(active, false);
});

// ---------- Main render ----------
let lastDay = '';
function render(force = false) {
  const today = todayISO();
  if (!force && today === lastDay) return;
  lastDay = today;

  const exams = EXAMS.map((e, i, all) => ({
    ...e,
    d: daysUntil(e.date, today),
    // Study days between the previous exam and this one (same as "ימי הפרש" in the sheet)
    gap: i ? daysUntil(e.date, all[i - 1].date) - 1 : null,
  }));
  const byMoed = Object.fromEntries(MOEDS.map((m) => [m.key, exams.filter((e) => e.moed === m.moed)]));

  document.getElementById('today').textContent = `היום: ${fmtLong.format(toUTC(today))}`;
  tabsEl.innerHTML = tabsHTML(byMoed);
  boardsEl.innerHTML = MOEDS.map((m) => boardHTML(m, byMoed[m.key], today)).join('');

  if (!active) {
    const fromHash = location.hash.replace('#moed-', '');
    // Default: the first moed that still has exams ahead
    const auto = MOEDS.find((m) => byMoed[m.key].some((e) => e.d >= 0)) ?? MOEDS.at(-1);
    active = MOEDS.some((m) => m.key === fromHash) ? fromHash : auto.key;
  }
  showBoard(active, false);

  // Study time on the cards and the "today" stats on the timer page depend on the date too
  renderStudyBadges();
  renderPomoStats();
}

// =====================================================================
// Study timer ("זמן ללמוד") — its own page (#timer), one state for the whole app.
// The timer keeps running while you browse the exam boards; it is never
// part of the board markup, so board re-renders can't touch it.
// =====================================================================

// ---------- Timer: state ----------
const POMO_KEYS = {
  settings: 'pomodoro-settings', state: 'pomodoro-state',
  sessions: 'pomodoro-sessions', tasks: 'pomodoro-tasks',
};
const POMO_MODES = [
  { key: 'focus', label: 'ריכוז' },
  { key: 'short', label: 'הפסקה קצרה' },
  { key: 'long', label: 'הפסקה ארוכה' },
];
// Accent per mode, taken from the dashboard's palette (focus follows the task's course when it has one)
const MODE_ACCENT = { focus: '#7c5cff', short: '#14b8a6', long: '#2f8cff' };
const POMO_LIMITS = { focusMinutes: [1, 90], shortBreakMinutes: [1, 30], longBreakMinutes: [1, 60], longBreakAfter: [2, 8], alarmMaxMinutes: [1, 10] };
const POMO_FLAGS = ['autoStartBreak', 'autoStartFocus', 'soundEnabled', 'notificationsEnabled'];
const DEFAULT_SETTINGS = {
  focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakAfter: 4, alarmMaxMinutes: 2,
  autoStartBreak: false, autoStartFocus: false, soundEnabled: true, notificationsEnabled: false,
};
const TASK_EST_MAX = 20;
const ALARM_SRC = 'sounds/timer-end.mp3';
const BASE_TITLE = document.title;

const pomo = { settings: { ...DEFAULT_SETTINGS }, state: null, sessions: [], tasks: [] };
let pomoTick = null;   // the only timer interval in the app; it only refreshes the display

const clampInt = (v, [min, max], def) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

function sanitizeSettings(s) {
  const out = { ...DEFAULT_SETTINGS };
  for (const k of Object.keys(POMO_LIMITS)) out[k] = clampInt(s?.[k], POMO_LIMITS[k], DEFAULT_SETTINGS[k]);
  for (const k of POMO_FLAGS) out[k] = typeof s?.[k] === 'boolean' ? s[k] : DEFAULT_SETTINGS[k];
  return out;
}

function modeDuration(mode, settings = pomo.settings) {
  const min = mode === 'short' ? settings.shortBreakMinutes : mode === 'long' ? settings.longBreakMinutes : settings.focusMinutes;
  return min * 60000;
}

const validSession = (x) => x && typeof x.id === 'string' && !Number.isNaN(Date.parse(x.completedAt));
const validTask = (t) => t && typeof t.id === 'string' && typeof t.title === 'string' && t.title.trim();
const cleanTask = (t) => ({
  id: t.id,
  title: t.title.trim().slice(0, 80),
  est: clampInt(t.est, [1, TASK_EST_MAX], 1),
  act: clampInt(t.act, [0, 999], 0),
  done: t.done === true,
  note: typeof t.note === 'string' ? t.note.slice(0, 300) : '',
  examId: EXAMS.some((e) => e.id === t.examId) ? t.examId : null,
});

function loadPomodoroState() {
  pomo.settings = sanitizeSettings(store.getJSON(POMO_KEYS.settings, {}));
  const tasks = store.getJSON(POMO_KEYS.tasks, []);
  pomo.tasks = Array.isArray(tasks) ? tasks.filter(validTask).map(cleanTask) : [];
  const s = store.getJSON(POMO_KEYS.state, {});
  const mode = POMO_MODES.some((m) => m.key === s.mode) ? s.mode : 'focus';
  const durationMs = Number.isFinite(s.durationMs) && s.durationMs > 0 ? s.durationMs : modeDuration(mode);
  const isRunning = s.isRunning === true && Number.isFinite(s.endTime);
  pomo.state = {
    mode,
    activeTaskId: pomo.tasks.some((t) => t.id === s.activeTaskId) ? s.activeTaskId : null,
    isRunning,
    endTime: isRunning ? s.endTime : null,
    remainingMs: Number.isFinite(s.remainingMs) ? Math.min(Math.max(0, s.remainingMs), durationMs) : durationMs,
    durationMs,
    completedInCycle: clampInt(s.completedInCycle, [0, 8], 0),
  };
  const sessions = store.getJSON(POMO_KEYS.sessions, []);
  pomo.sessions = Array.isArray(sessions) ? sessions.filter(validSession) : [];
}
const savePomodoroState = () => store.setJSON(POMO_KEYS.state, pomo.state);
const savePomodoroSettings = () => store.setJSON(POMO_KEYS.settings, pomo.settings);
const savePomodoroSessions = () => store.setJSON(POMO_KEYS.sessions, pomo.sessions);
const saveTasks = () => store.setJSON(POMO_KEYS.tasks, pomo.tasks);

// Remaining time is always derived from endTime, so throttled tabs / sleep / lock screens stay accurate
const remainingNow = () => (pomo.state.isRunning ? Math.max(0, pomo.state.endTime - Date.now()) : pomo.state.remainingMs);
// "Active" = running, or paused part-way through a session
const pomoActive = () => pomo.state.isRunning || pomo.state.remainingMs < pomo.state.durationMs;

const activeTask = () => pomo.tasks.find((t) => t.id === pomo.state.activeTaskId) ?? null;
const taskColor = (t) => EXAMS.find((e) => e.id === t?.examId)?.color ?? null;
const pomoAccent = () => (pomo.state.mode === 'focus' ? taskColor(activeTask()) ?? MODE_ACCENT.focus : MODE_ACCENT[pomo.state.mode]);

function getPomodoroStats(examId) {
  const today = todayISO();
  const weekAgo = Date.now() - 7 * DAY;
  const sum = (list) => ({ count: list.length, minutes: list.reduce((a, x) => a + (Number(x.durationMinutes) || 0), 0) });
  return {
    today: sum(pomo.sessions.filter((x) => israelISO(new Date(x.completedAt)) === today)),
    week: sum(pomo.sessions.filter((x) => Date.parse(x.completedAt) >= weekAgo)),
    exam: sum(examId ? pomo.sessions.filter((x) => x.examId === examId) : []),
  };
}
const fmtStudy = (min) => `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, '0')} שעות`;
const fmtClock = (ms) => {
  const t = Math.ceil(ms / 1000);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
const fmtTimeOfDay = new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' });
const rounds = (n) => (n === 1 ? 'סבב אחד' : `${n} סבבים`);

// ---------- Timer: actions ----------
function setMode(mode, autoStart = false) {
  const s = pomo.state;
  s.mode = mode;
  s.durationMs = modeDuration(mode);
  s.remainingMs = s.durationMs;
  s.isRunning = autoStart;
  s.endTime = autoStart ? Date.now() + s.durationMs : null;
  savePomodoroState();
  autoStart ? startTicking() : stopTicking();
  renderPomodoro();
}

function startPomodoro() {
  const s = pomo.state;
  if (s.isRunning) return;
  if (s.remainingMs <= 0) s.remainingMs = s.durationMs;
  s.isRunning = true;
  s.endTime = Date.now() + s.remainingMs;
  savePomodoroState();
  unlockAudio();
  startTicking();
  renderPomodoro();
}

function pausePomodoro() {
  const s = pomo.state;
  if (!s.isRunning) return;
  s.remainingMs = Math.max(0, s.endTime - Date.now());
  s.isRunning = false;
  s.endTime = null;
  savePomodoroState();
  stopTicking();
  renderPomodoro();
}

// Back to the full length of the current mode; nothing is recorded
const resetPomodoro = () => setMode(pomo.state.mode);

// Move on without recording anything (only a focus round that reaches 00:00 counts)
function skipPomodoro() {
  const s = pomo.state;
  if (s.mode === 'long') s.completedInCycle = 0;
  setMode(s.mode !== 'focus' ? 'focus' : s.completedInCycle >= pomo.settings.longBreakAfter ? 'long' : 'short');
}

function setPomodoroMode(mode) {
  if (mode === pomo.state.mode) return;
  if (pomo.state.isRunning && !confirm('הטיימר פועל. לעבור מצב ולאפס את הזמן?')) return;
  setMode(mode);
}

function recordSession(endTime, durationMs) {
  // The id is derived from endTime, so a refresh or a second tab can never store the same round twice
  const id = `pf-${endTime}`;
  const fresh = store.getJSON(POMO_KEYS.sessions, null);
  if (Array.isArray(fresh)) pomo.sessions = fresh.filter(validSession);
  if (pomo.sessions.some((x) => x.id === id)) return false;
  const task = activeTask();
  const exam = EXAMS.find((e) => e.id === task?.examId);
  pomo.sessions.push({
    id,
    taskId: task?.id ?? null,
    taskTitle: task?.title ?? null,
    examId: exam?.id ?? null,
    course: exam?.course ?? null,
    completedAt: new Date(endTime).toISOString(),
    durationMinutes: Math.round(durationMs / 60000),
  });
  savePomodoroSessions();
  return true;
}

function completePomodoro() {
  const s = pomo.state;
  if (!s.isRunning || Date.now() < s.endTime) return;
  const finished = s.mode;
  const endTime = s.endTime;
  // Finished long ago (page was closed)? Don't ring or auto-start the next step out of the blue
  const late = Date.now() - endTime > 60000;

  let next = 'focus';
  if (finished === 'focus') {
    if (recordSession(endTime, s.durationMs)) {
      const task = activeTask();
      if (task) { task.act += 1; saveTasks(); }
    }
    s.completedInCycle += 1;
    next = s.completedInCycle >= pomo.settings.longBreakAfter ? 'long' : 'short';
  } else if (finished === 'long') {
    s.completedInCycle = 0;
  }
  const auto = !late && (next === 'focus' ? pomo.settings.autoStartFocus : pomo.settings.autoStartBreak);
  setMode(next, auto);   // persists the new state before any side effect

  renderTasks();
  renderStudyBadges();
  if (!late) {
    startRinging(finished);
    notifyPomodoro(finished);
    flashPomodoro();
  }
}

// ---------- Timer: ticking ----------
function startTicking() {
  if (!pomoTick) pomoTick = setInterval(checkPomodoro, 250);
  renderTime();
}
function stopTicking() {
  clearInterval(pomoTick);
  pomoTick = null;
  renderTime();
}
function checkPomodoro() {
  if (!pomo.state.isRunning) return stopTicking();
  if (Date.now() >= pomo.state.endTime) completePomodoro();
  else renderTime();
}

// ---------- Tasks ----------
let taskForm = null;   // null | 'new' | <task id being edited>

function addTask({ title, est = 1, note = '', examId = null }) {
  const task = cleanTask({ id: `t-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, title, est, note, examId });
  pomo.tasks.push(task);
  if (!activeTask()) pomo.state.activeTaskId = task.id;
  saveTasks();
  savePomodoroState();
  return task;
}

function updateTask(id, patch) {
  const i = pomo.tasks.findIndex((t) => t.id === id);
  if (i < 0) return;
  pomo.tasks[i] = cleanTask({ ...pomo.tasks[i], ...patch });
  saveTasks();
}

function deleteTask(id) {
  pomo.tasks = pomo.tasks.filter((t) => t.id !== id);
  if (pomo.state.activeTaskId === id) {
    pomo.state.activeTaskId = pomo.tasks.find((t) => !t.done)?.id ?? null;
    savePomodoroState();
  }
  saveTasks();
}

function setActiveTask(id) {
  if (!pomo.tasks.some((t) => t.id === id)) return;
  pomo.state.activeTaskId = id;
  savePomodoroState();
}

function toggleTaskDone(id) {
  const t = pomo.tasks.find((x) => x.id === id);
  if (!t) return;
  t.done = !t.done;
  // Finishing the active task hands focus to the next open one
  if (t.done && pomo.state.activeTaskId === id) {
    pomo.state.activeTaskId = pomo.tasks.find((x) => !x.done)?.id ?? id;
    savePomodoroState();
  }
  saveTasks();
}

function clearDoneTasks() {
  pomo.tasks = pomo.tasks.filter((t) => !t.done);
  if (!activeTask()) { pomo.state.activeTaskId = pomo.tasks[0]?.id ?? null; savePomodoroState(); }
  saveTasks();
}

// "התחל ללמוד" on an exam card: reuse (or create) a task for that exam and open the timer page
function studyForExam(examId) {
  const exam = EXAMS.find((e) => e.id === examId);
  if (!exam) return;
  const task = pomo.tasks.find((t) => t.examId === examId && !t.done)
    ?? addTask({ title: `${exam.name} · ${moedLabel(exam.moed)}`, examId });
  setActiveTask(task.id);
  // "Start studying" means a focus round: leave an untouched break for it (never interrupts a running round)
  if (!pomoActive() && pomo.state.mode !== 'focus') setMode('focus');
  taskForm = null;
  renderTasks();
  openTimerPage();
}

// Rough finish estimate for the open tasks (focus rounds + the breaks between them)
function tasksEstimate() {
  const open = pomo.tasks.filter((t) => !t.done);
  const left = open.reduce((a, t) => a + Math.max(0, t.est - t.act), 0);
  const act = pomo.tasks.reduce((a, t) => a + t.act, 0);
  const est = pomo.tasks.reduce((a, t) => a + Math.max(t.est, t.act), 0);
  if (!left) return { act, est, left };
  const { focusMinutes, shortBreakMinutes, longBreakMinutes, longBreakAfter } = pomo.settings;
  const breaks = left - 1;
  const longs = Math.floor((pomo.state.completedInCycle + breaks) / longBreakAfter);
  const minutes = left * focusMinutes + (breaks - longs) * shortBreakMinutes + longs * longBreakMinutes;
  return { act, est, left, minutes, finish: fmtTimeOfDay.format(new Date(Date.now() + minutes * 60000)) };
}

// ---------- Sound & notifications ----------
let alarm = null;
let audioUnlocked = false;
function getAlarm() {
  if (!alarm) {
    alarm = new Audio(ALARM_SRC);
    alarm.preload = 'auto';
    // Backup for the auto-stop: timers are throttled in background tabs, a playing audio isn't
    alarm.addEventListener('timeupdate', () => { if (ringing && Date.now() >= ringStopsAt()) stopRinging(); });
  }
  return alarm;
}
// The alarm loops from the end of a round until the user presses "איפוס",
// or stops on its own after `alarmMaxMinutes` (2 by default).
// Not persisted: after a refresh the browser wouldn't let it play anyway.
let ringing = null;   // null | the mode that just finished ('focus' / 'short' / 'long')
let ringStartedAt = 0;
let ringStopTimer = null;
const ringStopsAt = () => ringStartedAt + pomo.settings.alarmMaxMinutes * 60000;

function scheduleRingStop() {
  clearTimeout(ringStopTimer);
  if (!ringing) return;
  const left = ringStopsAt() - Date.now();
  if (left <= 0) return stopRinging();
  ringStopTimer = setTimeout(stopRinging, left);
}

// Called from a user gesture (Start) so mobile browsers allow the alarm to play later
function unlockAudio() {
  if (!pomo.settings.soundEnabled || audioUnlocked || ringing) return;
  try {
    const a = getAlarm();
    a.muted = true;
    a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; audioUnlocked = true; })
      .catch(() => { a.muted = false; });
  } catch { /* no audio support */ }
}
function startRinging(finished) {
  if (!pomo.settings.soundEnabled) return;
  ringing = finished;
  ringStartedAt = Date.now();
  scheduleRingStop();
  try {
    const a = getAlarm();
    a.loop = true;
    a.muted = false;
    a.currentTime = 0;
    a.play().catch(() => {});   // autoplay blocked: stay silent, the visual alert still shows
  } catch { /* no audio support */ }
  renderPomodoro();
}
function stopRinging() {
  if (!ringing) return;
  ringing = null;
  clearTimeout(ringStopTimer);
  try {
    const a = getAlarm();
    a.pause();
    a.loop = false;
    a.currentTime = 0;
  } catch { /* no audio support */ }
  renderPomodoro();
}
// "השמעה" in settings: a single play, never while the alarm is already ringing
function previewAlarm() {
  if (ringing) return;
  try {
    const a = getAlarm();
    a.loop = false;
    a.muted = false;
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch { /* no audio support */ }
}

function notifyPomodoro(finished) {
  if (!pomo.settings.notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
  const [title, body] = finished === 'focus'
    ? ['סבב הריכוז הסתיים', 'הגיע הזמן להפסקה.']
    : ['ההפסקה הסתיימה', 'חוזרים ללמוד.'];
  try { new Notification(title, { body, lang: 'he', dir: 'rtl', tag: 'study-timer' }); } catch { /* e.g. mobile without SW */ }
}

// ---------- Timer page: markup ----------
const timerView = document.getElementById('timerView');
const ICONS = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
  reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4"/></svg>',
  skip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6.5 14 12l-8 5.5zM18 6v12"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.5 4 4 8-9"/></svg>',
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5.5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="18.5" r="1.6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
};

function timerPageHTML() {
  return `
    <a class="back-link" href="#moed-a" data-back>${ICONS.back}<span>חזרה ללוח המבחנים</span></a>

    <section class="panel pomo" data-pomo aria-label="טיימר">
      <div class="pomo-top">
        <div class="pomo-modes" role="tablist" aria-label="מצב טיימר">
          ${POMO_MODES.map((md) => `<button type="button" role="tab" class="pomo-mode" data-pomo-mode="${md.key}">${md.label}</button>`).join('')}
        </div>
        <button type="button" class="icon-btn pomo-gear" data-pomo-action="settings" aria-label="הגדרות הטיימר" aria-haspopup="dialog">${ICONS.settings}</button>
      </div>
      <div class="pomo-time" role="timer" aria-label="זמן שנותר" data-pomo-time>25:00</div>
      <p class="pomo-cycle" data-pomo-cycle aria-live="polite"></p>
      <span class="progress pomo-progress" aria-hidden="true"><i data-pomo-bar></i></span>
      <p class="pomo-now" data-pomo-now></p>
      <p class="pomo-alert" data-pomo-alert role="alert" hidden></p>
      <div class="pomo-controls">
        <button type="button" class="pomo-ghost" data-pomo-action="reset" aria-label="איפוס הטיימר">${ICONS.reset}<span>איפוס</span></button>
        <button type="button" class="pomo-main" data-pomo-action="toggle"></button>
        <button type="button" class="pomo-ghost" data-pomo-action="skip" aria-label="דילוג לשלב הבא">${ICONS.skip}<span>דילוג</span></button>
      </div>
    </section>

    <section class="panel tasks" aria-labelledby="tasksTitle">
      <div class="panel-head">
        <h2 id="tasksTitle">משימות</h2>
        <button type="button" class="text-btn" data-task-action="clear-done" hidden>ניקוי משימות שהושלמו</button>
      </div>
      <ul class="task-list" data-task-list></ul>
      <div data-task-new></div>
      <p class="tasks-foot" data-tasks-foot></p>
    </section>

    <section class="stats pomo-stats" aria-label="זמן לימוד">
      <div class="stat">
        <span class="stat-label">היום</span>
        <span class="stat-val" data-stat-today></span>
        <span class="stat-foot" data-stat-today-foot></span>
      </div>
      <div class="stat">
        <span class="stat-label">7 הימים האחרונים</span>
        <span class="stat-val" data-stat-week></span>
        <span class="stat-foot" data-stat-week-foot></span>
      </div>
    </section>`;
}

function taskFormHTML(task) {
  const editing = !!task;
  return `
    <form class="task-form" data-task-form="${editing ? task.id : 'new'}">
      <input class="task-input" name="title" maxlength="80" required autocomplete="off"
        placeholder="על מה עובדים?" aria-label="שם המשימה" value="${editing ? esc(task.title) : ''}">
      <div class="task-form-row">
        <span class="task-form-label">${editing ? 'בוצעו / הערכה' : 'הערכת סבבים'}</span>
        <div class="task-nums">
          ${editing ? `<input class="task-num" type="number" name="act" min="0" max="999" value="${task.act}" aria-label="סבבים שבוצעו"><span class="task-slash">/</span>` : ''}
          <div class="stepper">
            <input class="task-num" type="number" name="est" min="1" max="${TASK_EST_MAX}" value="${editing ? task.est : 1}" aria-label="הערכת סבבים">
            <button type="button" class="step-btn" data-step="1" aria-label="סבב נוסף">${ICONS.plus}</button>
            <button type="button" class="step-btn" data-step="-1" aria-label="סבב אחד פחות">${ICONS.minus}</button>
          </div>
        </div>
      </div>
      <textarea class="task-note-input" name="note" rows="2" maxlength="300" placeholder="הערה (לא חובה)" aria-label="הערה"
        ${editing && task.note ? '' : 'hidden'}>${editing ? esc(task.note) : ''}</textarea>
      ${editing && task.note ? '' : '<button type="button" class="text-btn" data-task-action="show-note">+ הוספת הערה</button>'}
      <div class="task-form-actions">
        ${editing ? '<button type="button" class="text-btn danger" data-task-action="delete">מחיקה</button>' : ''}
        <button type="button" class="pomo-ghost" data-task-action="cancel">ביטול</button>
        <button type="submit" class="pomo-main sm">שמירה</button>
      </div>
    </form>`;
}

function taskItemHTML(t) {
  const isActive = t.id === pomo.state.activeTaskId;
  const color = taskColor(t);
  return `
    <li class="task${isActive ? ' is-active' : ''}${t.done ? ' is-done' : ''}" data-task-id="${t.id}"${color ? ` style="--tc:${color}"` : ''}>
      <button type="button" class="task-check" data-task-action="toggle" aria-pressed="${t.done}"
        aria-label="${t.done ? 'סימון כלא הושלמה' : 'סימון כהושלמה'}: ${esc(t.title)}">${ICONS.check}</button>
      <button type="button" class="task-main" data-task-action="select" aria-current="${isActive}">
        <span class="task-title">${color ? '<i class="task-dot" aria-hidden="true"></i>' : ''}${esc(t.title)}</span>
        ${t.note ? `<span class="task-note">${esc(t.note)}</span>` : ''}
      </button>
      <span class="task-count" aria-label="${t.act} מתוך ${t.est} סבבים">${t.act}<small>/${t.est}</small></span>
      <button type="button" class="task-more" data-task-action="edit" aria-label="עריכת המשימה ${esc(t.title)}">${ICONS.more}</button>
    </li>`;
}

// ---------- Timer page: rendering ----------
function renderPomodoro() {
  if (!pomo.state) return;
  const s = pomo.state;
  const after = pomo.settings.longBreakAfter;
  const done = Math.min(s.completedInCycle, after);
  const running = s.isRunning;
  const paused = !running && s.remainingMs < s.durationMs;
  const modeIdx = POMO_MODES.findIndex((m) => m.key === s.mode);
  const modeLabel = POMO_MODES[modeIdx].label;
  const main = running ? ['pause', 'השהה'] : paused ? ['play', 'המשך'] : ['play', 'התחל'];
  const accent = pomoAccent();
  const task = activeTask();

  timerView.style.setProperty('--pc', accent);
  timerBtn.style.setProperty('--pc', accent);
  timerBtn.dataset.running = String(running);
  timerBtn.dataset.ringing = String(!!ringing);
  timerBtn.setAttribute('aria-label', ringing ? 'טיימר הלימוד (הזמן נגמר)' : running ? 'טיימר הלימוד (פועל)' : 'טיימר הלימוד');

  const p = timerView.querySelector('[data-pomo]');
  if (!p) return;
  p.dataset.mode = s.mode;
  p.dataset.state = running ? 'running' : paused ? 'paused' : 'idle';
  p.querySelector('.pomo-modes').style.setProperty('--i', modeIdx);
  p.querySelectorAll('[data-pomo-mode]').forEach((b) => {
    const on = b.dataset.pomoMode === s.mode;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  p.dataset.ringing = String(!!ringing);
  const alertEl = p.querySelector('[data-pomo-alert]');
  alertEl.hidden = !ringing;
  alertEl.innerHTML = ringing
    ? `<b>${ringing === 'focus' ? 'סבב הריכוז הסתיים!' : 'ההפסקה הסתיימה!'}</b> לחצו על איפוס כדי לעצור את הצלצול (ייעצר לבד אחרי ${pomo.settings.alarmMaxMinutes === 1 ? 'דקה' : `${pomo.settings.alarmMaxMinutes} דקות`})`
    : '';
  p.querySelector('[data-pomo-action="reset"]').setAttribute('aria-label', ringing ? 'איפוס – עצירת הצלצול' : 'איפוס הטיימר');
  const btn = p.querySelector('[data-pomo-action="toggle"]');
  btn.innerHTML = `${ICONS[main[0]]}<span>${main[1]}</span>`;
  btn.setAttribute('aria-label', `${main[1]} טיימר ${modeLabel}`);

  const dots = Array.from({ length: after }, (_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('');
  const cycleText = s.mode === 'focus'
    ? `סבב ${Math.min(done + 1, after)} מתוך ${after} · זמן להתרכז!`
    : `זמן להפסקה! · הושלמו ${done} מתוך ${after}`;
  p.querySelector('[data-pomo-cycle]').innerHTML = `<span class="pomo-dots" aria-hidden="true">${dots}</span><span>${cycleText}</span>`;
  p.querySelector('[data-pomo-now]').innerHTML = task && !task.done
    ? `${s.mode === 'focus' ? 'עובדים על' : 'אחרי ההפסקה'}: <b>${esc(task.title)}</b>`
    : '<span class="muted">בחרו משימה מהרשימה או הוסיפו משימה חדשה</span>';

  renderTime();
  renderPomoStats();
}

// Cheap per-tick update: clock, progress bar and the browser tab title only
function renderTime() {
  if (!pomo.state) return;
  const s = pomo.state;
  const ms = remainingNow();
  const clock = fmtClock(ms);
  const pct = s.durationMs ? Math.min(100, Math.max(0, (1 - ms / s.durationMs) * 100)) : 0;
  const p = timerView.querySelector('[data-pomo]');
  if (p) {
    const t = p.querySelector('[data-pomo-time]');
    if (t.textContent !== clock) t.textContent = clock;
    p.querySelector('[data-pomo-bar]').style.setProperty('--p', `${pct}%`);
  }
  const label = s.mode === 'focus' ? (activeTask()?.title ?? 'זמן להתרכז') : 'הפסקה';
  document.title = s.isRunning ? `${clock} · ${label}`
    : ringing ? `⏰ ${ringing === 'focus' ? 'סבב הריכוז הסתיים' : 'ההפסקה הסתיימה'}` : BASE_TITLE;
}

function renderTasks() {
  const list = timerView.querySelector('[data-task-list]');
  if (!list) return;
  list.innerHTML = pomo.tasks.map((t) => (taskForm === t.id ? `<li class="task-edit">${taskFormHTML(t)}</li>` : taskItemHTML(t))).join('');
  timerView.querySelector('[data-task-new]').innerHTML = taskForm === 'new'
    ? taskFormHTML(null)
    : `<button type="button" class="add-task" data-task-action="add">${ICONS.plus}<span>הוספת משימה</span></button>`;
  timerView.querySelector('[data-task-action="clear-done"]').hidden = !pomo.tasks.some((t) => t.done);

  const est = tasksEstimate();
  const foot = timerView.querySelector('[data-tasks-foot]');
  foot.hidden = !pomo.tasks.length;
  foot.innerHTML = est.left
    ? `סבבים: <b>${est.act}/${est.est}</b><span class="sep">·</span>סיום משוער: <b>${est.finish}</b> (${(est.minutes / 60).toFixed(1)} שעות)`
    : `סבבים: <b>${est.act}/${est.est}</b><span class="sep">·</span>כל המשימות הושלמו 🎉`;
  renderPomodoro();
}

function renderPomoStats() {
  const { today, week } = getPomodoroStats();
  const set = (sel, html) => { const el = timerView.querySelector(sel); if (el) el.innerHTML = html; };
  set('[data-stat-today]', `${today.count}<small> ${today.count === 1 ? 'סבב' : 'סבבים'}</small>`);
  set('[data-stat-today-foot]', `${fmtStudy(today.minutes)} ריכוז`);
  set('[data-stat-week]', `${week.count}<small> ${week.count === 1 ? 'סבב' : 'סבבים'}</small>`);
  set('[data-stat-week-foot]', `${fmtStudy(week.minutes)} ריכוז`);
}

function renderStudyBadges() {
  document.querySelectorAll('[data-study]').forEach((el) => {
    const { exam } = getPomodoroStats(el.dataset.study);
    el.hidden = !exam.count;
    el.innerHTML = exam.count ? `<span>זמן לימוד</span><b>${fmtStudy(exam.minutes)} · ${rounds(exam.count)}</b>` : '';
  });
}

function flashPomodoro() {
  const p = timerView.querySelector('[data-pomo]');
  if (!p) return;
  p.classList.remove('pomo-done');
  void p.offsetWidth;
  p.classList.add('pomo-done');
}

function focusTaskForm() {
  timerView.querySelector('[data-task-form] .task-input')?.focus();
}

// ---------- Settings dialog ----------
const settingsDialog = document.getElementById('pomoSettings');
let settingsTrigger = null;
let settingsViaKeyboard = false;

function pomodoroSettingsHTML() {
  const num = (key, label, suffix) => {
    const [min, max] = POMO_LIMITS[key];
    return `
      <label class="set-row">
        <span>${label}</span>
        <span class="set-num">
          <input type="number" inputmode="numeric" min="${min}" max="${max}" step="1" data-setting="${key}" aria-label="${label} (${suffix})">
          <small>${suffix}</small>
        </span>
      </label>`;
  };
  const toggle = (key, label, extra = '') => `
      <div class="set-row">
        <label for="set-${key}">${label}</label>
        <span class="set-ctl">${extra}<input type="checkbox" role="switch" class="switch" id="set-${key}" data-setting="${key}"></span>
      </div>`;
  return `
    <form method="dialog" class="modal-inner">
      <div class="panel-head">
        <h2 id="pomoSettingsTitle">הגדרות הטיימר</h2>
        <button type="submit" class="icon-btn modal-x" aria-label="סגירת ההגדרות">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="set-group">
        ${num('focusMinutes', 'זמן ריכוז', 'דקות')}
        ${num('shortBreakMinutes', 'הפסקה קצרה', 'דקות')}
        ${num('longBreakMinutes', 'הפסקה ארוכה', 'דקות')}
        ${num('longBreakAfter', 'הפסקה ארוכה אחרי', 'סבבים')}
      </div>
      <div class="set-group">
        ${toggle('autoStartBreak', 'התחלה אוטומטית של הפסקות')}
        ${toggle('autoStartFocus', 'התחלה אוטומטית של ריכוז')}
        ${toggle('soundEnabled', 'צליל בסיום', '<button type="button" class="text-btn" data-sound-test>השמעה</button>')}
        ${num('alarmMaxMinutes', 'עצירת הצלצול אחרי', 'דקות')}
        ${toggle('notificationsEnabled', 'התראה בסיום טיימר')}
      </div>
      <p class="set-hint" data-notify-hint hidden></p>
      <button type="submit" class="pomo-main modal-done">סגור</button>
    </form>`;
}

function fillSettingsForm() {
  settingsDialog.querySelectorAll('[data-setting]').forEach((inp) => {
    const v = pomo.settings[inp.dataset.setting];
    if (inp.type === 'checkbox') inp.checked = v;
    else inp.value = v;
  });
}

function updatePomodoroSettings(next) {
  pomo.settings = sanitizeSettings(next);
  savePomodoroSettings();
  if (!pomo.settings.soundEnabled) stopRinging();
  else scheduleRingStop();   // a new limit applies to an alarm that is already ringing
  // An untouched timer picks up a new length right away; a round in progress keeps its own
  if (!pomoActive()) {
    pomo.state.durationMs = modeDuration(pomo.state.mode);
    pomo.state.remainingMs = pomo.state.durationMs;
    savePomodoroState();
  }
  renderTasks();
}

function readSettingsForm() {
  const next = { ...pomo.settings };
  settingsDialog.querySelectorAll('[data-setting]').forEach((inp) => {
    next[inp.dataset.setting] = inp.type === 'checkbox' ? inp.checked : inp.value;
  });
  updatePomodoroSettings(next);
  fillSettingsForm();   // show clamped values
}

async function enableNotifications(input) {
  const hint = settingsDialog.querySelector('[data-notify-hint]');
  const fail = (msg) => {
    input.checked = false;
    hint.textContent = msg;
    hint.hidden = false;
    readSettingsForm();
  };
  hint.hidden = true;
  if (!('Notification' in window)) return fail('הדפדפן הזה לא תומך בהתראות.');
  let perm = Notification.permission;
  if (perm === 'default') {
    try { perm = await Notification.requestPermission(); } catch { perm = 'denied'; }
  }
  if (perm !== 'granted') return fail('ההתראות חסומות בדפדפן. אפשר לאפשר אותן בהגדרות האתר.');
  readSettingsForm();
}

function openPomodoroSettings(trigger, viaKeyboard) {
  settingsTrigger = trigger;
  settingsViaKeyboard = viaKeyboard;
  settingsDialog.style.setProperty('--pc', pomoAccent());
  settingsDialog.querySelector('[data-notify-hint]').hidden = true;
  fillSettingsForm();
  settingsDialog.showModal();
}

function initPomodoroSettings() {
  settingsDialog.innerHTML = pomodoroSettingsHTML();
  settingsDialog.addEventListener('change', (ev) => {
    const inp = ev.target.closest('[data-setting]');
    if (!inp) return;
    if (inp.dataset.setting === 'notificationsEnabled' && inp.checked) enableNotifications(inp);
    else readSettingsForm();
  });
  settingsDialog.addEventListener('click', (ev) => {
    if (ev.target === settingsDialog) settingsDialog.close();   // backdrop
    if (ev.target.closest('[data-sound-test]')) previewAlarm();
  });
  settingsDialog.addEventListener('close', () => {
    readSettingsForm();
    // Keyboard users get focus back on the gear; mouse users don't get a stray focus ring
    if (settingsViaKeyboard && settingsTrigger?.isConnected) settingsTrigger.focus();
    else settingsTrigger?.blur();
  });
}

// ---------- Views: exam boards ↔ timer page ----------
const TIMER_HASH = '#timer';
const timerBtn = document.getElementById('timerBtn');
let view = location.hash === TIMER_HASH ? 'timer' : 'dashboard';

function showView(next, boardKey = active) {
  view = next;
  const isTimer = next === 'timer';
  document.querySelector('.board-tabs').hidden = isTimer;
  boardsEl.hidden = isTimer;
  timerView.hidden = !isTimer;
  document.getElementById('pageTitle').textContent = isTimer ? 'זמן ללמוד' : 'לוח המבחנים שלי';
  timerBtn.setAttribute('aria-pressed', String(isTimer));
  timerView.querySelector('[data-back]')?.setAttribute('href', `#moed-${active ?? 'a'}`);
  // The boards had no width while hidden: re-align the one being returned to
  const key = MOEDS.some((m) => m.key === boardKey) ? boardKey : active;
  if (!isTimer && key) showBoard(key, false);
  scrollTo({ top: 0 });
}
const openTimerPage = () => { if (location.hash !== TIMER_HASH) location.hash = TIMER_HASH; else showView('timer'); };

// ---------- Timer: events ----------
timerBtn.addEventListener('click', () => {
  if (view === 'timer') location.hash = `#moed-${active ?? 'a'}`;
  else openTimerPage();
});

timerView.addEventListener('click', (ev) => {
  const action = ev.target.closest('[data-pomo-action]');
  const mode = ev.target.closest('[data-pomo-mode]');
  const taskAct = ev.target.closest('[data-task-action]');
  const step = ev.target.closest('[data-step]');
  if (action) {
    const a = action.dataset.pomoAction;
    if (a === 'toggle') (pomo.state.isRunning ? pausePomodoro : startPomodoro)();
    else if (a === 'reset') ringing ? stopRinging() : resetPomodoro();
    else if (a === 'skip') skipPomodoro();
    else if (a === 'settings') openPomodoroSettings(action, ev.detail === 0);
  }
  if (mode) setPomodoroMode(mode.dataset.pomoMode);
  if (step) {
    const inp = step.closest('.stepper').querySelector('input');
    inp.value = clampInt(Number(inp.value) + Number(step.dataset.step), [1, TASK_EST_MAX], 1);
  }
  if (taskAct) {
    const a = taskAct.dataset.taskAction;
    const id = taskAct.closest('[data-task-id]')?.dataset.taskId;
    const form = taskAct.closest('[data-task-form]');
    if (a === 'add') { taskForm = 'new'; renderTasks(); focusTaskForm(); }
    else if (a === 'cancel') { taskForm = null; renderTasks(); }
    else if (a === 'edit') { taskForm = id; renderTasks(); focusTaskForm(); }
    else if (a === 'select') { setActiveTask(id); renderTasks(); }
    else if (a === 'toggle') { toggleTaskDone(id); renderTasks(); }
    else if (a === 'clear-done') { clearDoneTasks(); renderTasks(); }
    else if (a === 'show-note') {
      form.querySelector('.task-note-input').hidden = false;
      taskAct.remove();
      form.querySelector('.task-note-input').focus();
    } else if (a === 'delete') {
      deleteTask(form.dataset.taskForm);
      taskForm = null;
      renderTasks();
    }
  }
});

timerView.addEventListener('submit', (ev) => {
  const form = ev.target.closest('[data-task-form]');
  if (!form) return;
  ev.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  if (!data.title?.trim()) return form.querySelector('.task-input').focus();
  const target = form.dataset.taskForm;
  if (target === 'new') addTask(data);
  else updateTask(target, data);
  taskForm = null;
  renderTasks();
  // Keep the flow going like Pomofocus: after adding, the "add" button is ready again
  if (target === 'new') timerView.querySelector('[data-task-action="add"]')?.focus();
});

timerView.addEventListener('keydown', (ev) => {
  // Escape closes an open task form
  if (ev.key === 'Escape' && taskForm !== null && ev.target.closest('[data-task-form]')) {
    taskForm = null;
    renderTasks();
    timerView.querySelector('[data-task-action="add"]')?.focus();
    return;
  }
  // Mode tabs: arrow keys move focus (RTL: ArrowLeft = next), Enter/Space activates
  const tab = ev.target.closest('[data-pomo-mode]');
  if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return;
  ev.preventDefault();
  const tabs = [...tab.parentElement.querySelectorAll('[data-pomo-mode]')];
  const i = tabs.indexOf(tab);
  const n = ev.key === 'Home' ? 0 : ev.key === 'End' ? tabs.length - 1
    : (i + (ev.key === 'ArrowLeft' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[n].focus();
});

// "התחל ללמוד" on the exam cards
document.addEventListener('click', (ev) => {
  const study = ev.target.closest('[data-study-exam]');
  if (study) studyForExam(study.dataset.studyExam);
});

// Coming back to the page: settle a round that ended while we were away
document.addEventListener('visibilitychange', () => { if (!document.hidden && pomo.state) checkPomodoro(); });
// Another tab changed the timer: adopt its state
addEventListener('storage', (ev) => {
  if (!Object.values(POMO_KEYS).includes(ev.key)) return;
  loadPomodoroState();
  pomo.state.isRunning ? startTicking() : stopTicking();
  renderTasks();
  renderStudyBadges();
});

function initTimerPage() {
  timerView.innerHTML = timerPageHTML();
  initPomodoroSettings();
  renderTasks();
}

// ---------- Events ----------
document.addEventListener('click', (ev) => {
  const tab = ev.target.closest('[data-tab]');
  const dot = ev.target.closest('.tl-dot');
  if (tab) showBoard(tab.dataset.tab);
  if (dot) {
    const target = document.getElementById(dot.dataset.target);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      target.classList.remove('flash');
      void target.offsetWidth;
      target.classList.add('flash');
    }
  }
});
tabsEl.addEventListener('keydown', (ev) => {
  if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
  const i = MOEDS.findIndex((m) => m.key === active);
  const next = MOEDS[(i + (ev.key === 'ArrowLeft' ? 1 : -1) + MOEDS.length) % MOEDS.length];
  showBoard(next.key);
  document.getElementById(`tab-${next.key}`).focus();
});
addEventListener('hashchange', () => {
  if (location.hash === TIMER_HASH) return showView('timer');
  // Read the target board before anything re-aligns the boards (that rewrites the hash)
  const key = location.hash.replace('#moed-', '');
  if (view === 'timer') showView('dashboard', key);
  else showBoard(key);
});

// Theme toggle: follows system unless the user picked one
const root = document.documentElement;
const savedTheme = store.get('theme', '');
if (savedTheme) root.dataset.theme = savedTheme;
document.getElementById('themeBtn').addEventListener('click', () => {
  const isDark = root.dataset.theme
    ? root.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = isDark ? 'light' : 'dark';
  store.set('theme', root.dataset.theme);
});

loadPomodoroState();
initTimerPage();
render(true);
showView(view);
// Resume a running timer; a round that ended while the page was closed is settled exactly once
if (pomo.state.isRunning) { startTicking(); checkPomodoro(); }
// Re-check every minute so the countdown flips right after midnight
setInterval(render, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
