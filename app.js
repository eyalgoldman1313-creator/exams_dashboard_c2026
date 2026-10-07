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

// ---------- Date helpers (all in Israel time, day granularity) ----------
const DAY = 86400000;
const toUTC = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
// Days left = today counted, exam day not counted (e.g. exam tomorrow → 1).
const daysUntil = (iso, today) => Math.round((toUTC(iso) - toUTC(today)) / DAY);

const fmt = (opts) => new Intl.DateTimeFormat('he-IL', { timeZone: 'UTC', ...opts });
const fmtLong = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtDate = fmt({ day: 'numeric', month: 'long' });
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

// ---------- State ----------
const store = {
  get(k, def) { try { return localStorage.getItem(k) ?? def; } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const state = {
  view: store.get('view', 'chrono'),
  moed: store.get('moed', 'all'),
};

// ---------- Rendering ----------
function countBlock(d) {
  if (d === 0) return `<span class="num word">היום</span>`;
  if (d < 0) return `<span class="num word">עבר</span>`;
  return `<span class="num">${d}</span><span class="unit">${unit(d)}</span>`;
}

function renderHero(exams, today) {
  const hero = document.getElementById('hero');
  const next = exams.find((e) => e.d >= 0);
  if (!next) {
    hero.style.removeProperty('--c');
    hero.innerHTML = `<div class="hero-info"><p class="hero-kicker">סיימת את כל המבחנים</p><h2>🎉 כל הכבוד! 🎉</h2></div>`;
    return;
  }
  const st = status(next.d);
  hero.style.setProperty('--c', next.color);
  hero.innerHTML = `
    <div class="hero-info">
      <p class="hero-kicker">המבחן הבא</p>
      <h2>${esc(next.name)}</h2>
      <p class="hero-meta">
        <span class="pill">${moedLabel(next.moed)}</span>
        <span>${fmtWeekday.format(toUTC(next.date))}, ${fmtDate.format(toUTC(next.date))}</span>
        <span class="sep">·</span><span>${next.time}</span>
      </p>
      <p class="hero-sub">${st.label || weeksText(next.d)}</p>
    </div>
    <div class="hero-count">${countBlock(next.d)}</div>`;
}

function renderStats(exams, today) {
  const left = exams.filter((e) => e.d >= 0);
  const lastA = exams.filter((e) => e.moed === 'א').at(-1);
  const lastAll = exams.at(-1);
  const dA = daysUntil(lastA.date, today);
  const dAll = daysUntil(lastAll.date, today);
  const done = exams.length - left.length;
  const pct = Math.round((done / exams.length) * 100);
  document.getElementById('stats').innerHTML = `
    <div class="stat">
      <span class="stat-label">מבחנים שנותרו</span>
      <span class="stat-val">${left.length}<small> / ${exams.length}</small></span>
      <span class="progress" style="--p:${pct}%"><i></i></span>
    </div>
    <div class="stat">
      <span class="stat-label">עד סוף מועדי א׳</span>
      <span class="stat-val">${dA >= 0 ? dA : '✓'}<small> ${dA >= 0 ? unit(dA) : ''}</small></span>
      <span class="stat-foot">${fmtDate.format(toUTC(lastA.date))}</span>
    </div>
    <div class="stat">
      <span class="stat-label">עד סוף התקופה</span>
      <span class="stat-val">${dAll >= 0 ? dAll : '✓'}<small> ${dAll >= 0 ? unit(dAll) : ''}</small></span>
      <span class="stat-foot">${fmtDate.format(toUTC(lastAll.date))}</span>
    </div>`;
}

function renderTimeline(exams, today) {
  const el = document.getElementById('timeline');
  const first = Math.min(toUTC(today), toUTC(exams[0].date));
  const start = first - 4 * DAY;
  const end = toUTC(exams.at(-1).date) + 4 * DAY;
  const pct = (t) => ((t - start) / (end - start)) * 100;

  let months = '';
  const s = new Date(start);
  for (let m = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 1)); m.getTime() < end; m.setUTCMonth(m.getUTCMonth() + 1)) {
    months += `<span class="tick" style="inset-inline-start:${pct(m.getTime())}%"><b>${fmtShortMonth.format(m)}</b></span>`;
  }

  const t = toUTC(today);
  const progress = Math.max(0, Math.min(100, pct(t)));
  const visible = exams.filter((e) => state.moed === 'all' || e.moed === state.moed);
  const dots = visible.map((e, i) => `
    <button type="button" class="tl-dot ${e.moed === 'ב' ? 'hollow' : ''} ${e.d < 0 ? 'past' : ''} ${i % 2 ? 'down' : 'up'}"
      style="inset-inline-start:${pct(toUTC(e.date))}%; --c:${e.color}"
      data-target="${e.id}" title="${esc(e.name)} · ${moedLabel(e.moed)} · ${fmtDate.format(toUTC(e.date))}"
      aria-label="${esc(e.name)}, ${moedLabel(e.moed)}, ${e.d >= 0 ? `בעוד ${e.d} ${unit(e.d)}` : 'הסתיים'}">
      <span class="tl-label">${e.d > 0 ? e.d : e.d === 0 ? '!' : '✓'}</span>
    </button>`).join('');

  el.innerHTML = `
    <div class="tl-track"><span class="tl-fill" style="width:${progress}%"></span></div>
    ${months}
    <span class="tl-today" style="inset-inline-start:${pct(t)}%"><b>היום</b></span>
    ${dots}`;
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
      </dl>
    </article>`;
}

function mini(e) {
  const st = status(e.d);
  return `
    <div class="mini ${st.cls}" id="${e.id}">
      <span class="pill">${moedLabel(e.moed)}</span>
      <div class="count">${countBlock(e.d)}</div>
      <p class="mini-date">${fmtWeekday.format(toUTC(e.date))}, ${fmtDate.format(toUTC(e.date))}<br>בשעה ${e.time}</p>
      ${st.label ? `<span class="flag">${st.label}</span>` : ''}
    </div>`;
}

function renderList(exams) {
  const list = document.getElementById('list');
  const visible = exams.filter((e) => state.moed === 'all' || e.moed === state.moed);

  if (state.view === 'course') {
    list.className = 'list by-course';
    list.innerHTML = Object.entries(COURSES).map(([key, c]) => {
      const items = visible.filter((e) => e.course === key);
      if (!items.length) return '';
      return `
        <article class="course" style="--c:${c.color}">
          <header class="course-head">
            <span class="swatch"></span>
            <div><h3>${esc(c.name)}</h3><p>${esc(c.lecturer)}</p></div>
          </header>
          <div class="minis">${items.map(mini).join('')}</div>
        </article>`;
    }).join('');
    return;
  }

  // Chronological: upcoming first, finished exams at the end
  const upcoming = visible.filter((e) => e.d >= 0);
  const past = visible.filter((e) => e.d < 0);
  list.className = 'list grid';
  list.innerHTML = upcoming.map(card).join('') + past.map(card).join('');
}

function syncControls() {
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === state.view)));
  document.querySelectorAll('[data-moed]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.moed === state.moed)));
}

let lastDay = '';
function render(force = false) {
  const today = todayISO();
  if (!force && today === lastDay) return;
  lastDay = today;
  const exams = EXAMS.map((e) => ({ ...e, d: daysUntil(e.date, today) }));
  document.getElementById('today').textContent = `היום: ${fmtLong.format(toUTC(today))}`;
  renderHero(exams, today);
  renderStats(exams, today);
  renderTimeline(exams, today);
  renderList(exams);
  syncControls();
}

// ---------- Events ----------
document.addEventListener('click', (ev) => {
  const v = ev.target.closest('[data-view]');
  const m = ev.target.closest('[data-moed]');
  const dot = ev.target.closest('.tl-dot');
  if (v) { state.view = v.dataset.view; store.set('view', state.view); render(true); }
  if (m) { state.moed = m.dataset.moed; store.set('moed', state.moed); render(true); }
  if (dot) {
    const target = document.getElementById(dot.dataset.target);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.remove('flash');
      void target.offsetWidth;
      target.classList.add('flash');
    }
  }
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

render(true);
// Re-check every minute so the countdown flips right after midnight
setInterval(render, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
