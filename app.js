'use strict';

const STORAGE_KEY = 'lernplan-daten-v1';

// ---------- Daten ----------

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return { sessions: data.sessions || [], exams: data.exams || [] };
    }
  } catch (e) {
    console.warn('Daten konnten nicht geladen werden', e);
  }
  return { sessions: [], exams: [] };
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    alert('Daten konnten nicht gespeichert werden.');
  }
}

const state = loadData();

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- Hilfsfunktionen ----------

function todayISO() {
  const d = new Date();
  return toISO(d);
}

function toISO(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysUntil(iso) {
  const ms = parseISO(iso) - parseISO(todayISO());
  return Math.round(ms / 86400000);
}

function formatDate(iso, withWeekday = true) {
  return parseISO(iso).toLocaleDateString('de-DE', {
    weekday: withWeekday ? 'long' : undefined,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatHours(h) {
  const rounded = Math.round(h * 100) / 100;
  return rounded.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' h';
}

function countdownText(days) {
  if (days === 0) return 'Heute';
  if (days === 1) return 'Morgen';
  if (days === -1) return 'Gestern';
  if (days < 0) return `vor ${-days} Tagen`;
  return `in ${days} Tagen`;
}

function startOfWeekISO() {
  const d = parseISO(todayISO());
  const weekday = (d.getDay() + 6) % 7; // Montag = 0
  d.setDate(d.getDate() - weekday);
  return toISO(d);
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (value === true) node.setAttribute(key, '');
    else if (value !== false && value != null) node.setAttribute(key, value);
  }
  for (const child of children) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(child));
  }
  return node;
}

function sortedExams() {
  return [...state.exams].sort((a, b) => a.date.localeCompare(b.date));
}

function upcomingExams() {
  return sortedExams().filter((e) => daysUntil(e.date) >= 0);
}

function examProgress(exam) {
  const total = exam.topics.length;
  const done = exam.topics.filter((t) => t.done).length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function chipFor(days) {
  const cls = days < 0 ? 'chip past' : days <= 3 ? 'chip soon' : 'chip';
  return el('span', { class: cls }, countdownText(days));
}

// ---------- Rendern ----------

function render() {
  renderSubjectList();
  renderOverview();
  renderSessions();
  renderExams();
}

function renderSubjectList() {
  const subjects = new Set([
    ...state.sessions.map((s) => s.subject),
    ...state.exams.map((e) => e.subject),
  ]);
  const list = document.getElementById('subject-list');
  list.replaceChildren(...[...subjects].sort().map((s) => el('option', { value: s })));
}

function renderOverview() {
  // Nächste Arbeit
  const box = document.getElementById('next-exam');
  const next = upcomingExams()[0];
  if (next) {
    const days = daysUntil(next.date);
    const p = examProgress(next);
    box.replaceChildren(el('div', {},
      el('div', { class: 'label' }, 'Nächste Arbeit'),
      el('div', { class: 'countdown' }, countdownText(days)),
      el('div', { class: 'title' }, next.subject + (next.title ? ` – ${next.title}` : '')),
      el('div', { class: 'label' }, formatDate(next.date)),
      p.total
        ? el('div', { class: 'progress' },
            el('div', { class: 'bar' }, el('span', { style: `width:${p.pct}%` })),
            el('div', { class: 'progress-text' }, `${p.done} von ${p.total} Themen gelernt (${p.pct} %)`))
        : null,
    ));
  } else {
    box.replaceChildren(
      el('div', { class: 'label' }, 'Nächste Arbeit'),
      el('p', { class: 'empty' }, 'Keine anstehenden Arbeiten eingetragen.'),
    );
  }

  // Statistiken
  const today = todayISO();
  const weekStart = startOfWeekISO();
  const sum = (list) => list.reduce((acc, s) => acc + s.hours, 0);
  document.getElementById('stat-today').textContent = formatHours(sum(state.sessions.filter((s) => s.date === today)));
  document.getElementById('stat-week').textContent = formatHours(sum(state.sessions.filter((s) => s.date >= weekStart && s.date <= today)));
  document.getElementById('stat-total').textContent = formatHours(sum(state.sessions));

  // Stunden pro Fach
  const bySubject = {};
  for (const s of state.sessions) bySubject[s.subject] = (bySubject[s.subject] || 0) + s.hours;
  const entries = Object.entries(bySubject).sort((a, b) => b[1] - a[1]);
  const max = entries.length ? entries[0][1] : 0;
  const bars = document.getElementById('subject-bars');
  bars.replaceChildren(
    ...(entries.length
      ? entries.map(([subject, hours]) =>
          el('div', { class: 'bar-row' },
            el('div', { class: 'bar-head' }, el('span', {}, subject), el('span', {}, formatHours(hours))),
            el('div', { class: 'bar' }, el('span', { style: `width:${(hours / max) * 100}%` }))))
      : [el('p', { class: 'empty' }, 'Noch keine Lernzeit eingetragen.')]),
  );

  // Anstehende Arbeiten
  const upcoming = upcomingExams();
  const list = document.getElementById('upcoming-list');
  list.replaceChildren(
    ...(upcoming.length
      ? upcoming.map((e) => {
          const p = examProgress(e);
          return el('li', {},
            el('span', {},
              el('strong', {}, e.subject), e.title ? ` – ${e.title}` : '',
              el('br'),
              el('small', { class: 'empty' }, formatDate(e.date, false) + (p.total ? ` · ${p.done}/${p.total} Themen` : ''))),
            chipFor(daysUntil(e.date)));
        })
      : [el('li', {}, el('span', { class: 'empty' }, 'Keine anstehenden Arbeiten.'))]),
  );
}

function renderSessions() {
  const container = document.getElementById('session-days');
  if (!state.sessions.length) {
    container.replaceChildren(el('p', { class: 'empty' }, 'Noch keine Lerneinheiten eingetragen.'));
    return;
  }

  const byDay = {};
  for (const s of state.sessions) (byDay[s.date] ||= []).push(s);
  const days = Object.keys(byDay).sort().reverse();

  container.replaceChildren(
    ...days.map((day) => {
      const items = byDay[day];
      const total = items.reduce((acc, s) => acc + s.hours, 0);
      return el('div', { class: 'day' },
        el('div', { class: 'day-head' },
          el('span', {}, day === todayISO() ? `Heute, ${formatDate(day, false)}` : formatDate(day)),
          el('span', { class: 'sum' }, formatHours(total))),
        ...items.map((s) =>
          el('div', { class: 'entry' },
            el('div', {},
              el('div', { class: 'subject' }, s.subject),
              s.note ? el('div', { class: 'note' }, s.note) : null),
            el('span', { class: 'hours' }, formatHours(s.hours)),
            el('button', {
              class: 'icon-btn',
              title: 'Löschen',
              'aria-label': 'Lerneinheit löschen',
              onclick: () => deleteSession(s.id),
            }, '✕'))));
    }),
  );
}

function renderExams() {
  const container = document.getElementById('exam-list');
  const exams = sortedExams();
  if (!exams.length) {
    container.replaceChildren(el('p', { class: 'empty card' }, 'Noch keine Arbeiten eingetragen.'));
    return;
  }

  const upcoming = exams.filter((e) => daysUntil(e.date) >= 0);
  const past = exams.filter((e) => daysUntil(e.date) < 0).reverse();

  container.replaceChildren(...upcoming.map(examCard));
  if (past.length) {
    container.append(el('div', { class: 'section-title' }, 'Vergangene Arbeiten'), ...past.map(examCard));
  }
}

function examCard(exam) {
  const days = daysUntil(exam.date);
  const p = examProgress(exam);
  const input = el('input', { type: 'text', placeholder: 'Neues Themengebiet' });

  const addTopic = (ev) => {
    ev.preventDefault();
    const name = input.value.trim();
    if (!name) return;
    exam.topics.push({ id: uid(), name, done: false });
    commit();
  };

  return el('div', { class: 'card exam' + (days < 0 ? ' past' : '') },
    el('div', { class: 'exam-head' },
      el('div', { class: 'info' },
        el('h2', {}, exam.subject + (exam.title ? ` – ${exam.title}` : '')),
        el('div', { class: 'meta' }, formatDate(exam.date))),
      p.total && p.done === p.total ? el('span', { class: 'chip done' }, 'Alles gelernt') : null,
      chipFor(days),
      el('button', {
        class: 'icon-btn',
        title: 'Arbeit löschen',
        'aria-label': 'Arbeit löschen',
        onclick: () => deleteExam(exam.id),
      }, '✕')),
    p.total
      ? el('div', { class: 'progress' },
          el('div', { class: 'bar' }, el('span', { style: `width:${p.pct}%` })),
          el('div', { class: 'progress-text' }, `${p.done} von ${p.total} Themen gelernt (${p.pct} %)`))
      : null,
    el('ul', { class: 'topics' },
      ...exam.topics.map((t) => {
        const id = `topic-${t.id}`;
        return el('li', { class: 'topic' + (t.done ? ' done' : '') },
          el('input', {
            type: 'checkbox',
            id,
            checked: t.done,
            onchange: (ev) => { t.done = ev.target.checked; commit(); },
          }),
          el('label', { for: id }, t.name),
          el('button', {
            class: 'icon-btn',
            title: 'Thema löschen',
            'aria-label': 'Thema löschen',
            onclick: () => { exam.topics = exam.topics.filter((x) => x.id !== t.id); commit(); },
          }, '✕'));
      })),
    el('form', { class: 'add-topic', onsubmit: addTopic },
      input,
      el('button', { type: 'submit', class: 'btn small' }, '+ Thema')),
  );
}

// ---------- Aktionen ----------

function commit() {
  saveData();
  render();
}

function deleteSession(id) {
  state.sessions = state.sessions.filter((s) => s.id !== id);
  commit();
}

function deleteExam(id) {
  const exam = state.exams.find((e) => e.id === id);
  if (!exam || !confirm(`Arbeit „${exam.subject}“ wirklich löschen?`)) return;
  state.exams = state.exams.filter((e) => e.id !== id);
  commit();
}

document.getElementById('session-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const subject = document.getElementById('session-subject').value.trim();
  const date = document.getElementById('session-date').value;
  const hours = parseFloat(document.getElementById('session-hours').value);
  const note = document.getElementById('session-note').value.trim();
  if (!subject || !date || !(hours > 0)) return;

  state.sessions.push({ id: uid(), subject, date, hours, note });
  commit();
  document.getElementById('session-hours').value = '';
  document.getElementById('session-note').value = '';
});

document.getElementById('exam-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const subject = document.getElementById('exam-subject').value.trim();
  const date = document.getElementById('exam-date').value;
  const title = document.getElementById('exam-title').value.trim();
  const topics = document.getElementById('exam-topics').value
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((name) => ({ id: uid(), name, done: false }));
  if (!subject || !date) return;

  state.exams.push({ id: uid(), subject, date, title, topics });
  commit();
  ev.target.reset();
});

// Tabs
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === tab.dataset.tab));
  });
});

// Export / Import
document.getElementById('export-btn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `lernplan-${todayISO()}.json` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

document.getElementById('import-input').addEventListener('change', async (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.sessions) || !Array.isArray(data.exams)) throw new Error('Ungültiges Format');
    if (!confirm('Aktuelle Daten durch die importierten ersetzen?')) return;
    state.sessions = data.sessions;
    state.exams = data.exams;
    commit();
  } catch (e) {
    alert('Import fehlgeschlagen: ' + e.message);
  } finally {
    ev.target.value = '';
  }
});

// Start
document.getElementById('session-date').value = todayISO();
render();
