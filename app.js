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
      ${pomodoroHTML(m)}
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
  const prev = active;
  active = key;
  if (prev && prev !== key) onBoardChangePomodoro(key);
  tabsEl.dataset.active = key;
  tabsEl.querySelectorAll('[data-tab]').forEach((b) => {
    const on = b.dataset.tab === key;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  if (location.hash !== `#moed-${key}`) history.replaceState(null, '', `#moed-${key}`);
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

  // Pomodoro lives outside the board markup: re-attach it to the freshly built panels
  ensurePomodoroExam();
  renderPomodoro(true);
  renderStudyBadges();
}

// =====================================================================
// Pomodoro ("זמן ללמוד")
// One state object for the whole app. Both boards render a view of it,
// so rebuilding the boards (e.g. at midnight) never touches the timer.
// =====================================================================

// ---------- Pomodoro: state ----------
const POMO_KEYS = { settings: 'pomodoro-settings', state: 'pomodoro-state', sessions: 'pomodoro-sessions' };
const POMO_MODES = [
  { key: 'focus', label: 'ריכוז' },
  { key: 'short', label: 'הפסקה קצרה' },
  { key: 'long', label: 'הפסקה ארוכה' },
];
const POMO_LIMITS = { focusMinutes: [1, 90], shortBreakMinutes: [1, 30], longBreakMinutes: [1, 60], longBreakAfter: [2, 8] };
const POMO_FLAGS = ['autoStartBreak', 'autoStartFocus', 'soundEnabled', 'notificationsEnabled'];
const DEFAULT_SETTINGS = {
  focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakAfter: 4,
  autoStartBreak: false, autoStartFocus: false, soundEnabled: true, notificationsEnabled: false,
};
const POMO_ACCENT = '#7c5cff';
const BASE_TITLE = document.title;

const pomo = { settings: { ...DEFAULT_SETTINGS }, state: null, sessions: [] };
let pomoTick = null;   // the only timer interval in the app; it only refreshes the display
let audioCtx = null;

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

function loadPomodoroState() {
  pomo.settings = sanitizeSettings(store.getJSON(POMO_KEYS.settings, {}));
  const s = store.getJSON(POMO_KEYS.state, {});
  const mode = POMO_MODES.some((m) => m.key === s.mode) ? s.mode : 'focus';
  const durationMs = Number.isFinite(s.durationMs) && s.durationMs > 0 ? s.durationMs : modeDuration(mode);
  const isRunning = s.isRunning === true && Number.isFinite(s.endTime);
  pomo.state = {
    mode,
    selectedExamId: EXAMS.some((e) => e.id === s.selectedExamId) ? s.selectedExamId : null,
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

// Remaining time is always derived from endTime, so throttled tabs / sleep / lock screens stay accurate
const remainingNow = () => (pomo.state.isRunning ? Math.max(0, pomo.state.endTime - Date.now()) : pomo.state.remainingMs);
// "Active" = running, or paused part-way through a session
const pomoActive = () => pomo.state.isRunning || pomo.state.remainingMs < pomo.state.durationMs;

function upcomingExams() {
  const today = todayISO();
  return EXAMS.map((e) => ({ ...e, d: daysUntil(e.date, today) })).filter((e) => e.d >= 0);
}
function defaultExamFor(boardKey) {
  const up = upcomingExams();
  const moed = MOEDS.find((m) => m.key === boardKey)?.moed;
  return (up.find((e) => e.moed === moed) ?? up[0])?.id ?? null;
}
const selectedExam = () => EXAMS.find((e) => e.id === pomo.state.selectedExamId) ?? null;

// Keep the selection valid: a missing or finished exam falls back to the nearest exam on the current board,
// but never while a session is in progress.
function ensurePomodoroExam() {
  const sel = pomo.state.selectedExamId;
  if (sel && (pomoActive() || upcomingExams().some((e) => e.id === sel))) return;
  const next = defaultExamFor(active);
  if (next !== sel) { pomo.state.selectedExamId = next; savePomodoroState(); }
}

function getPomodoroStats(examId) {
  const today = todayISO();
  const sum = (list) => ({ count: list.length, minutes: list.reduce((a, x) => a + (Number(x.durationMinutes) || 0), 0) });
  return {
    today: sum(pomo.sessions.filter((x) => israelISO(new Date(x.completedAt)) === today)),
    exam: sum(examId ? pomo.sessions.filter((x) => x.examId === examId) : []),
  };
}
const fmtStudy = (min) => `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, '0')} שעות`;
const fmtClock = (ms) => {
  const t = Math.ceil(ms / 1000);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

// ---------- Pomodoro: actions ----------
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

// Move on without recording anything (only a Focus that reaches 00:00 counts)
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

function selectPomodoroExam(id) {
  if (!EXAMS.some((e) => e.id === id)) return;
  pomo.state.selectedExamId = id;
  savePomodoroState();
  renderPomodoro();
}

function recordSession(endTime, durationMs) {
  // The id is derived from endTime, so a refresh or a second tab can never store the same Focus twice
  const id = `pf-${endTime}`;
  const fresh = store.getJSON(POMO_KEYS.sessions, null);
  if (Array.isArray(fresh)) pomo.sessions = fresh.filter(validSession);
  if (pomo.sessions.some((x) => x.id === id)) return;
  const exam = selectedExam();
  pomo.sessions.push({
    id,
    examId: exam?.id ?? null,
    course: exam?.course ?? null,
    completedAt: new Date(endTime).toISOString(),
    durationMinutes: Math.round(durationMs / 60000),
  });
  savePomodoroSessions();
}

function completePomodoro() {
  const s = pomo.state;
  if (!s.isRunning || Date.now() < s.endTime) return;
  const finished = s.mode;
  const endTime = s.endTime;
  // Finished long ago (page was closed)? Don't chime or auto-start the next step out of the blue
  const late = Date.now() - endTime > 60000;

  let next = 'focus';
  if (finished === 'focus') {
    recordSession(endTime, s.durationMs);
    s.completedInCycle += 1;
    next = s.completedInCycle >= pomo.settings.longBreakAfter ? 'long' : 'short';
  } else if (finished === 'long') {
    s.completedInCycle = 0;
  }
  const auto = !late && (next === 'focus' ? pomo.settings.autoStartFocus : pomo.settings.autoStartBreak);
  setMode(next, auto);   // persists the new state before any side effect

  renderStudyBadges();
  if (!late) {
    playChime();
    notifyPomodoro(finished);
    flashPomodoro();
  }
}

// ---------- Pomodoro: ticking ----------
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

// ---------- Pomodoro: sound & notifications ----------
function unlockAudio() {
  if (!pomo.settings.soundEnabled) return;
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  } catch { audioCtx = null; }
}

function playChime() {
  if (!pomo.settings.soundEnabled) return;
  try {
    unlockAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    [[784, 0], [1175, 0.18]].forEach(([freq, at]) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.16, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.6);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.65);
    });
  } catch { /* audio blocked: stay silent */ }
}

function notifyPomodoro(finished) {
  if (!pomo.settings.notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
  const [title, body] = finished === 'focus'
    ? ['הפומודורו הסתיים', 'הגיע הזמן להפסקה.']
    : ['ההפסקה הסתיימה', 'חוזרים ללמוד.'];
  try { new Notification(title, { body, lang: 'he', dir: 'rtl', tag: 'pomodoro' }); } catch { /* e.g. mobile without SW */ }
}

// ---------- Pomodoro: rendering ----------
const pomoPanels = () => document.querySelectorAll('[data-pomo]');
const ICONS = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
  reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4"/></svg>',
  skip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6.5 14 12l-8 5.5zM18 6v12"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>',
};

function pomodoroHTML(m) {
  const k = m.key;
  return `
    <section class="panel pomo" id="pomo-${k}" data-pomo aria-labelledby="pomo-title-${k}">
      <div class="panel-head">
        <div class="pomo-heading">
          <h2 id="pomo-title-${k}">זמן ללמוד</h2>
          <span class="panel-note">פומודורו</span>
        </div>
        <button type="button" class="icon-btn pomo-gear" data-pomo-action="settings" aria-label="הגדרות פומודורו" aria-haspopup="dialog">${ICONS.settings}</button>
      </div>
      <div class="pomo-body">
        <div class="pomo-side">
          <div class="pomo-modes" role="tablist" aria-label="מצב טיימר">
            ${POMO_MODES.map((md) => `<button type="button" role="tab" class="pomo-mode" data-pomo-mode="${md.key}">${md.label}</button>`).join('')}
          </div>
          <label class="pomo-field" for="pomo-exam-${k}">
            <span class="stat-label">לומד עכשיו ל...</span>
            <span class="pomo-select">
              <span class="pomo-swatch" aria-hidden="true"></span>
              <select id="pomo-exam-${k}" data-pomo-exam></select>
              <span class="pomo-chevron">${ICONS.chevron}</span>
            </span>
          </label>
          <div class="pomo-controls">
            <button type="button" class="pomo-main" data-pomo-action="toggle"></button>
            <button type="button" class="pomo-ghost" data-pomo-action="reset" aria-label="איפוס הטיימר">${ICONS.reset}<span>איפוס</span></button>
            <button type="button" class="pomo-ghost" data-pomo-action="skip" aria-label="דילוג לשלב הבא">${ICONS.skip}<span>דילוג</span></button>
          </div>
        </div>
        <div class="pomo-clock">
          <div class="pomo-time" role="timer" aria-label="זמן שנותר" data-pomo-time>25:00</div>
          <p class="pomo-cycle" data-pomo-cycle aria-live="polite"></p>
          <span class="progress pomo-progress" aria-hidden="true"><i data-pomo-bar></i></span>
        </div>
      </div>
      <div class="pomo-summary">
        <div class="stat">
          <span class="stat-label">היום</span>
          <span class="stat-val" data-pomo-today></span>
          <span class="stat-foot" data-pomo-today-foot></span>
        </div>
        <div class="stat">
          <span class="stat-label pomo-exam-name" data-pomo-exam-name></span>
          <span class="stat-val" data-pomo-exam-count></span>
          <span class="stat-foot" data-pomo-exam-foot></span>
        </div>
      </div>
    </section>`;
}

function examOptionsHTML() {
  const today = todayISO();
  const up = upcomingExams();
  const sel = selectedExam();
  // A finished exam stays listed only while its session is still in progress
  const list = sel && !up.some((e) => e.id === sel.id) ? [{ ...sel, d: daysUntil(sel.date, today) }, ...up] : up;
  if (!list.length) return '<option value="">אין מבחנים עתידיים</option>';
  const when = (d) => (d > 1 ? `עוד ${d} ימים` : d === 1 ? 'מחר' : d === 0 ? 'היום' : 'הסתיים');
  return list.map((e) => `<option value="${e.id}">${esc(e.name)} · ${moedLabel(e.moed)} · ${when(e.d)}</option>`).join('');
}

function renderPomodoro(full = false) {
  if (!pomo.state) return;
  const s = pomo.state;
  const exam = selectedExam();
  const after = pomo.settings.longBreakAfter;
  const done = Math.min(s.completedInCycle, after);
  const running = s.isRunning;
  const paused = !running && s.remainingMs < s.durationMs;
  const modeIdx = POMO_MODES.findIndex((m) => m.key === s.mode);
  const modeLabel = POMO_MODES[modeIdx].label;
  const main = running ? ['pause', 'השהה'] : paused ? ['play', 'המשך'] : ['play', 'התחל'];
  const dots = Array.from({ length: after }, (_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('');
  const cycleText = s.mode === 'focus'
    ? `פומודורו ${Math.min(done + 1, after)} מתוך ${after}`
    : `${modeLabel} · הושלמו ${done} מתוך ${after}`;
  const stats = getPomodoroStats(exam?.id);
  const options = full ? examOptionsHTML() : null;

  pomoPanels().forEach((p) => {
    p.style.setProperty('--pc', exam?.color ?? POMO_ACCENT);
    p.dataset.mode = s.mode;
    p.dataset.state = running ? 'running' : paused ? 'paused' : 'idle';
    p.querySelector('.pomo-modes').style.setProperty('--i', modeIdx);
    p.querySelectorAll('[data-pomo-mode]').forEach((b) => {
      const on = b.dataset.pomoMode === s.mode;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });

    const select = p.querySelector('[data-pomo-exam]');
    if (options !== null) select.innerHTML = options;
    select.value = exam?.id ?? '';
    select.disabled = !select.options.length || !select.options[0].value;

    const btn = p.querySelector('[data-pomo-action="toggle"]');
    btn.innerHTML = `${ICONS[main[0]]}<span>${main[1]}</span>`;
    btn.setAttribute('aria-label', `${main[1]} טיימר ${modeLabel}`);

    p.querySelector('[data-pomo-cycle]').innerHTML = `<span class="pomo-dots" aria-hidden="true">${dots}</span><span>${cycleText}</span>`;
    p.querySelector('[data-pomo-today]').innerHTML = `${stats.today.count}<small> פומודורו</small>`;
    p.querySelector('[data-pomo-today-foot]').textContent = `${fmtStudy(stats.today.minutes)} ריכוז`;
    p.querySelector('[data-pomo-exam-name]').textContent = exam?.name ?? 'לא נבחר מבחן';
    p.querySelector('[data-pomo-exam-count]').innerHTML = `${stats.exam.count}<small> פומודורו</small>`;
    p.querySelector('[data-pomo-exam-foot]').textContent = `${fmtStudy(stats.exam.minutes)} לימוד`;
  });
  renderTime();
}

// Cheap per-tick update: clock, progress bar and the browser tab title only
function renderTime() {
  if (!pomo.state) return;
  const s = pomo.state;
  const ms = remainingNow();
  const clock = fmtClock(ms);
  const pct = s.durationMs ? Math.min(100, Math.max(0, (1 - ms / s.durationMs) * 100)) : 0;
  pomoPanels().forEach((p) => {
    const t = p.querySelector('[data-pomo-time]');
    if (t.textContent !== clock) t.textContent = clock;
    p.querySelector('[data-pomo-bar]').style.setProperty('--p', `${pct}%`);
  });
  const label = s.mode === 'focus' ? (selectedExam()?.name ?? 'ריכוז') : 'הפסקה';
  document.title = s.isRunning ? `${clock} · ${label}` : BASE_TITLE;
}

function renderStudyBadges() {
  document.querySelectorAll('[data-study]').forEach((el) => {
    const { exam } = getPomodoroStats(el.dataset.study);
    el.hidden = !exam.count;
    el.innerHTML = exam.count ? `<span>זמן לימוד</span><b>${fmtStudy(exam.minutes)} · ${exam.count} פומודורו</b>` : '';
  });
}

function flashPomodoro() {
  pomoPanels().forEach((p) => {
    p.classList.remove('pomo-done');
    void p.offsetWidth;
    p.classList.add('pomo-done');
  });
}

// When the board changes and nothing is in progress, follow the board's nearest exam
function onBoardChangePomodoro(key) {
  if (!pomo.state || pomoActive()) return;
  const id = defaultExamFor(key);
  if (id && id !== pomo.state.selectedExamId) selectPomodoroExam(id);
}

// ---------- Pomodoro: settings dialog ----------
const settingsDialog = document.getElementById('pomoSettings');
let settingsTrigger = null;

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
  const toggle = (key, label) => `
      <label class="set-row">
        <span>${label}</span>
        <input type="checkbox" role="switch" class="switch" data-setting="${key}">
      </label>`;
  return `
    <form method="dialog" class="modal-inner">
      <div class="panel-head">
        <h2 id="pomoSettingsTitle">הגדרות פומודורו</h2>
        <button type="submit" class="icon-btn modal-x" aria-label="סגירת ההגדרות">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="set-group">
        ${num('focusMinutes', 'זמן ריכוז', 'דקות')}
        ${num('shortBreakMinutes', 'הפסקה קצרה', 'דקות')}
        ${num('longBreakMinutes', 'הפסקה ארוכה', 'דקות')}
        ${num('longBreakAfter', 'הפסקה ארוכה אחרי', 'פומודורו')}
      </div>
      <div class="set-group">
        ${toggle('autoStartBreak', 'התחלה אוטומטית של הפסקות')}
        ${toggle('autoStartFocus', 'התחלה אוטומטית של ריכוז')}
        ${toggle('soundEnabled', 'צליל בסיום')}
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
  // An untouched timer picks up a new length right away; a session in progress keeps its own
  if (!pomoActive()) {
    pomo.state.durationMs = modeDuration(pomo.state.mode);
    pomo.state.remainingMs = pomo.state.durationMs;
    savePomodoroState();
  }
  renderPomodoro();
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

function openPomodoroSettings(trigger) {
  settingsTrigger = trigger;
  settingsDialog.style.setProperty('--pc', selectedExam()?.color ?? POMO_ACCENT);
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
  settingsDialog.addEventListener('close', () => {
    readSettingsForm();
    if (settingsTrigger?.isConnected) settingsTrigger.focus();
  });
  // Clicking the backdrop closes the dialog
  settingsDialog.addEventListener('click', (ev) => { if (ev.target === settingsDialog) settingsDialog.close(); });
}

// ---------- Pomodoro: events ----------
document.addEventListener('click', (ev) => {
  const action = ev.target.closest('[data-pomo-action]');
  const mode = ev.target.closest('[data-pomo-mode]');
  const study = ev.target.closest('[data-study-exam]');
  if (action) {
    const a = action.dataset.pomoAction;
    if (a === 'toggle') (pomo.state.isRunning ? pausePomodoro : startPomodoro)();
    else if (a === 'reset') resetPomodoro();
    else if (a === 'skip') skipPomodoro();
    else if (a === 'settings') openPomodoroSettings(action);
  }
  if (mode) setPomodoroMode(mode.dataset.pomoMode);
  if (study) {
    // Pick the exam and bring the timer into view; the user still presses "התחל"
    selectPomodoroExam(study.dataset.studyExam);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(`pomo-${active}`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
});
document.addEventListener('change', (ev) => {
  if (ev.target.matches('[data-pomo-exam]')) selectPomodoroExam(ev.target.value);
});
// Mode tabs: arrow keys move focus (RTL: ArrowLeft = next), Enter/Space activates
document.addEventListener('keydown', (ev) => {
  const tab = ev.target.closest?.('[data-pomo-mode]');
  if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return;
  ev.preventDefault();
  const tabs = [...tab.parentElement.querySelectorAll('[data-pomo-mode]')];
  const i = tabs.indexOf(tab);
  const n = ev.key === 'Home' ? 0 : ev.key === 'End' ? tabs.length - 1
    : (i + (ev.key === 'ArrowLeft' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[n].focus();
});
// Coming back to the page: settle a session that ended while we were away
document.addEventListener('visibilitychange', () => { if (!document.hidden && pomo.state) checkPomodoro(); });
// Another tab changed the timer: adopt its state
addEventListener('storage', (ev) => {
  if (!Object.values(POMO_KEYS).includes(ev.key)) return;
  loadPomodoroState();
  pomo.state.isRunning ? startTicking() : stopTicking();
  renderPomodoro(true);
  renderStudyBadges();
});

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
addEventListener('hashchange', () => showBoard(location.hash.replace('#moed-', '')));

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
initPomodoroSettings();
render(true);
// Resume a running Pomodoro; one that ended while the page was closed is settled exactly once
if (pomo.state.isRunning) { startTicking(); checkPomodoro(); }
// Re-check every minute so the countdown flips right after midnight
setInterval(render, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
