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
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
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

render(true);
// Re-check every minute so the countdown flips right after midnight
setInterval(render, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
