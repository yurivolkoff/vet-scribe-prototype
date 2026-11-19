// Prototype L (2026-11-18) = variant A (proto-main-A.js, 2026-11-12) with the recording block moved to the LEFT column.
// The suggestion layer under the fields (sections 1, 2, 4, 5) is A's code unchanged. The top bar and the right summary
// panel of A are gone: everything they did lives in one card — Peter's live markup (section.ai-protocol-block,
// 2026-11-18) placed as the FIRST card of aside.left-section. Spec: 2026-11-peter-ui-fit/out/ux-proposals-v1.md, §1–4, 7.
// Draft data: synthetic reference visit (draft-model.js, the model output as is).
//
// Structure:
//   1. model      — suggestion units U, one per Vet.AF field / diagnosis / goods line (A)
//   2. Vet.AF     — helpers and the visit as the vet opens it (A)
//   3. card       — the recording card in the left column: Peter's markup + our states (L)
//   4. inline     — suggestion layer under the fields: text, numbers, doses, diagnoses (A)
//   5. goods      — suggested lines on the goods tab (A)
//   6. summary    — progress and the tab map in the card (a row → the first open field of the tab), browser tab title (L)
//   7. flow       — card states, microphone, reminder, events, save, prototype controls (L, events from A)
// The layer is never inside CKEditor content and its inputs have no form owner: unaccepted text is never saved.
(function () {
  const BASE = window.SCRIBE_BASE || '';
  const PET = 'Барсик';
  const NOW = '10:52';
  const EMPTY_P = '<p><br data-cke-filler="true"></p>';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const ICON = {
    mic: '<svg viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="12.5" y="5.5" width="7" height="13" rx="3.5"/><path d="M9 15.5c0 3.9 3.1 7 7 7s7-3.1 7-7"/><path d="M16 22.5v4"/><path d="M12.5 26.5h7"/></g></svg>',
    pause: '<svg viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12.5 10v12"/><path d="M19.5 10v12"/></g></svg>',
    play: '<svg viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"><path d="M12 9.5v13l10.5-6.5z"/></g></svg>',
    chev: '<svg class="chev" viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M13 10l6 6l-6 6"/></g></svg>',
    search: '<svg viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"><circle cx="14.5" cy="14.5" r="6.5"/><path d="M19.5 19.5l5 5"/></g></svg>',
    x: '<svg viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M11 11l10 10"/><path d="M21 11l-10 10"/></g></svg>',
    check: '<svg viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 16.5l4.5 4.5L23 11.5"/></g></svg>',
    micOff: '<svg viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 14V9a3.5 3.5 0 0 0-6.6-1.6"/><path d="M12.5 12.5v3a3.5 3.5 0 0 0 5.6 2.8"/><path d="M9 15.5c0 3.9 3.1 7 7 7 1.6 0 3-.5 4.2-1.4"/><path d="M23 15.5c0 .9-.2 1.8-.5 2.6"/><path d="M16 22.5v4"/><path d="M12.5 26.5h7"/><path d="M7 7l18 18"/></g></svg>',
    tick: '<svg viewBox="0 0 32 32"><use href="' + BASE + 'vetaf/i/frontend/employee/svg/icons.svg#tick"></use></svg>'
  };

  // ================================================================ 1. model
  // Clinic price list (fictitious). Vet.AF search = continuous substring of the title, case-insensitive
  // (test visit on vetaf.ru, 2026-11-11): «локсиком» finds nothing when the clinic sells Мелоксивет.
  // container: price = base 2 ₽ + nested goods (fixedPrice = 0); template: consumables arrive with the service.
  const CATALOG = [
    ['УЗИ мочевого пузыря', 'услуга', 1800, 'прд'], ['УЗИ органов брюшной полости', 'услуга', 3200, 'прд'],
    ['УЗИ почек', 'услуга', 1800, 'прд'], ['УЗИ сердца (эхокардиография)', 'услуга', 3500, 'прд'],
    ['Цистоцентез (забор мочи)', 'услуга', 900, 'прд', { template: [['-КР', 88, 'шт', 2]] }],
    ['Катетеризация мочевого пузыря', 'услуга', 1500, 'прд'],
    ['Общий анализ мочи', 'услуга', 850, 'прд'], ['Анализ мочи на соотношение белок/креатинин', 'услуга', 1200, 'прд'],
    ['Бакпосев мочи с антибиотикограммой', 'услуга', 2400, 'прд'], ['Бакпосев мочи без антибиотикограммы', 'услуга', 1600, 'прд'],
    ['Применение лекарственных препаратов в клинике', 'услуга', 2, 'прд', { container: true }],
    ['Подкожная/внутримышечная инъекция', 'услуга', 600, 'прд'],
    ['Мелоксивет 2%, р-р для инъекций', 'товар', 38, 'мл'], ['Мелоксивет 0,15%, суспензия 10 мл', 'товар', 520, 'шт'],
    ['Мелоксидил 0,5 мг/мл, суспензия 15 мл', 'товар', 690, 'шт'], ['Стоп-цистит био, таблетки №30', 'товар', 410, 'шт'],
    ['Royal Canin Urinary S/O, пауч 85 г', 'товар', 145, 'шт'], ['Royal Canin Urinary S/O, сухой 400 г', 'товар', 1150, 'шт'],
    ['Шприц 2 мл', 'товар', 12, 'шт'], ['Перчатки нестерильные', 'товар', 43, 'пр'], ['-КР', 'товар', 88, 'шт']
  ].map(([title, type, price, unit, x]) => Object.assign({ title, type, price, unit }, x || {}));
  const searchCatalog = (text, goodsOnly) => {
    const t = text.trim().toLowerCase();
    return t ? CATALOG.filter(c => (!goodsOnly || c.type === 'товар') && c.title.toLowerCase().includes(t)) : [];
  };
  // short fallback stems added by the prototype to the model's `queries` (brand of the clinic is unknown to the model)
  const EXTRA_Q = { 'Локсиком': ['мелокс', 'локсик'] };
  // Yuri 2026-11-12: no confirmation state for doses — drug names and doses come in bold from the model (**…**),
  // and a line with a dose always shows its quote.
  const TABS = [['inspections', 'Лист осмотра'], ['recommendations', 'Рекомендации'], ['items', 'Товары и услуги']];

  // ---- the model output as is (prompt v12a, fit check 2026-11-12): window.SCRIBE_MODEL — parsed JSON or the raw text.
  // ?run=<name> picks window.SCRIBE_MODELS[name] when a local file provides several answers (real runs stay out of git).
  function parseModel(m) {
    if (typeof m !== 'string') return m;
    const body = m.slice(m.indexOf('{'), m.lastIndexOf('}') + 1);
    for (const fix of ['', '}', '}}']) { try { return JSON.parse(body + fix); } catch (e) { /* the model sometimes drops the last brace */ } }
    throw new Error('ответ модели не разобран как JSON');
  }
  // data source (prototype-only): ?run=<key> — a local real run, ?run=paste — the raw answer pasted in the bottom bar
  const RUN = new URLSearchParams(location.search).get('run') || '';
  const PASTE_KEY = 'scribe-paste';
  const pasted = () => { try { return sessionStorage.getItem(PASTE_KEY) || ''; } catch (e) { return ''; } };
  let LOAD_ERR = '';
  let M = {};
  try {
    const src = RUN === 'paste' ? pasted() : (RUN && window.SCRIBE_MODELS && window.SCRIBE_MODELS[RUN]) || window.SCRIBE_MODEL;
    const parsed = parseModel(src);
    if (parsed && typeof parsed === 'object') M = parsed; else LOAD_ERR = 'ответ модели — не объект JSON';
  } catch (e) { LOAD_ERR = e.message; }
  const fmtNum = n => String(n).replace('.', ',');
  const U = [];
  const unit = u => (U.push(Object.assign({ status: 'new' }, u)), u);
  const plain = s => String(s || '').replace(/\*\*/g, '');
  const md = s => esc(s || '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const bolds = s => [...String(s || '').matchAll(/\*\*(.+?)\*\*/g)].map(m => m[1]);
  // a dose line: a bold fragment with a digit, only where doses belong (a target weight in care advice is not a dose)
  const DOSE_FIELDS = ['manipulations', 'treatment'];
  // the block name starts the line where the line is unclear without it (field-template-v3, rule 3 «Тема: факты»)
  const PREFIX_FIELDS = ['anamnesis', 'examination', 'recommendations'];
  function lineText(name, t, prefix) {
    t = String(t || '').trim();
    if (!prefix || plain(t).toLowerCase().startsWith(name.toLowerCase())) return t;
    const w = (t.match(/^\S+/) || [''])[0];
    const low = /^[А-ЯЁ]/.test(w) && !/[А-ЯЁA-Z]/.test(w.slice(1)) ? t[0].toLowerCase() + t.slice(1) : t;   // keep «УЗИ», «ЭхоКГ», «**Синулокс**»
    return name + ': ' + low;
  }
  const mkLine = (field, t, q, extra) => Object.assign({ text: plain(t), src: t, quote: q || '', html: md(t),
    dose: DOSE_FIELDS.includes(field) && bolds(t).some(b => /\d/.test(b)), excluded: false }, extra);
  // a field of blocks {name: {q, t}}; a study of several organs {study: {organ: {q, t}}} → a header line and a line per organ
  function lines(field) {
    const out = [];
    Object.entries(M[field] || {}).forEach(([name, b], gi) => {
      if (!b || typeof b !== 'object') return;
      if (!('t' in b)) {
        const organs = Object.entries(b).filter(([, ob]) => ob && plain(ob.t).trim());
        if (!organs.length) return;
        out.push({ header: true, group: 'g' + gi, text: name + ':', quote: '', html: esc(name) + ':', dose: false, excluded: false });
        organs.forEach(([organ, ob]) => out.push(mkLine(field, lineText(organ, ob.t, true), ob.q, { group: 'g' + gi })));
      } else if (plain(b.t).trim()) out.push(mkLine(field, lineText(name, b.t, PREFIX_FIELDS.includes(field)), b.q));
    });
    return out;
  }
  const filled = f => M[f] && plain(M[f].t).trim() ? M[f] : null;
  const number = f => M[f] && M[f].v != null && M[f].v !== '' ? M[f] : null;
  const textUnit = (id, tab, field, label, key) => { const ls = lines(key); if (ls.length) unit({ id, tab, kind: 'text', field, label, lines: ls }); };

  // order = Vet.AF tab order, then field order inside the tab; nothing heard → no suggestion
  if (filled('title')) unit({ id: 'title', tab: 'inspections', kind: 'input', field: 'title', label: 'Цель визита', value: plain(M.title.t), quote: M.title.q || '' });
  textUnit('anamnesis', 'inspections', 'anamnesis', 'Анамнез', 'anamnesis');
  textUnit('examination', 'inspections', 'examination', 'Осмотр', 'examination');
  if (filled('symptoms')) unit({ id: 'symptom', tab: 'inspections', kind: 'input', field: 'symptom', label: 'Ведущие симптомы', value: plain(M.symptoms.t), quote: M.symptoms.q || '', group: 'triple' });
  if (number('weight')) unit({ id: 'weight', tab: 'inspections', kind: 'number', field: 'weight', label: 'Вес, кг', value: String(M.weight.v), show: fmtNum(M.weight.v), quote: M.weight.q || '', group: 'triple' });
  if (number('temperature')) unit({ id: 'temperature', tab: 'inspections', kind: 'number', field: 'temperature', label: 'Температура, °C', value: String(M.temperature.v), show: fmtNum(M.temperature.v), quote: M.temperature.q || '', group: 'triple' });
  (M.diagnoses || []).filter(d => d && d.title).forEach((d, i) => unit({ id: 'dg' + i, tab: 'inspections', kind: 'diag', label: 'Диагноз', title: d.title, quote: d.q || '', dkind: d.kind }));
  textUnit('manipulation', 'inspections', 'manipulation', 'Манипуляции', 'manipulations');
  textUnit('treatment', 'recommendations', 'treatment', 'План лечения', 'treatment');
  textUnit('recommendation', 'recommendations', 'recommendation', 'Рекомендация по уходу', 'recommendations');
  // goods and services: search tags, the vet picks the position in Vet.AF (approved 2026-11-11)
  const stems = name => { const w = name.split(' ')[0].toLowerCase(); return [...new Set([w, w.length > 7 ? w.slice(0, 6) : w, name.toLowerCase()])]; };
  (M.items || []).filter(it => it && it.name).forEach((it, i) => unit({ id: 'it' + i, tab: 'items', kind: 'good', label: it.name, name: it.name, quote: it.q || '',
    type: it.type, recQty: it.quantity, recUnit: it.unit || '',
    qs: [...new Set(((it.queries || []).length ? it.queries : stems(it.name)).concat(EXTRA_Q[it.name] || []))] }));
  // drugs prescribed for home (Yuri 2026-11-12): clickable like the goods above, but optional — not counted in «N позиций не добавлено».
  // Taken from the dose lines of «План лечения»: the drug is the first bold fragment, queries are its first word and stem.
  // The model's own list (prompt v12e, «home_drugs» with queries) wins; v12a has none, so the rule below stays as the fallback.
  if (Array.isArray(M.home_drugs) && M.home_drugs.length) M.home_drugs.filter(h => h && h.name).forEach((h, i) => unit({ id: 'hm' + i, tab: 'items', kind: 'good', home: true,
    label: h.name, name: h.name, quote: h.q || '', type: 'good', recQty: null, recUnit: '', qs: [...new Set(((h.queries || []).length ? h.queries : stems(h.name)))] }));
  else (U.find(u => u.id === 'treatment')?.lines || []).filter(l => l.dose).forEach((l, i) => {
    const name = bolds(l.src).find(b => !/\d/.test(b));
    if (!name) return;
    unit({ id: 'hm' + i, tab: 'items', kind: 'good', home: true, label: name, name, quote: l.quote, type: 'good', recQty: null, recUnit: '',
      qs: [...new Set(stems(name).concat(EXTRA_Q[name.split(' ')[0]] || []))] });
  });

  // state helpers
  const byId = id => U.find(u => u.id === id);
  const isPending = u => u.status === 'new';
  // a study header lives while at least one of its organ lines does
  const liveLines = u => { const ls = (u.lines || []).filter(l => !l.excluded); return ls.filter(l => !l.header || ls.some(x => !x.header && x.group === l.group)); };
  const isField = u => u.kind === 'input' || u.kind === 'text' || u.kind === 'number';
  // L (spec §3.8): doses count in the remainder — the vet checks them. A field with dose lines counts as its doses
  // (one per dose line still in the block), not as a field; once the block is accepted or removed they are gone.
  const dosesOf = u => u.kind === 'text' ? liveLines(u).filter(l => l.dose).length : 0;
  function remain(tab) {
    const us = U.filter(u => (!tab || u.tab === tab) && isPending(u));
    return {
      doses: us.reduce((s, u) => s + dosesOf(u), 0),
      fields: us.filter(u => isField(u) && !dosesOf(u)).length,
      diags: us.filter(u => u.kind === 'diag').length,
      goods: us.filter(u => u.kind === 'good' && !u.home).length
    };
  }
  const sumR = r => r.doses + r.fields + r.diags + r.goods;
  // round 8: the tally behind «Из записи — 18 предложений» / «Вы проверили 3 из 9» — every suggestion the vet decides counts: a field, a diagnosis, weight / temperature,
  // a goods item; a field with doses counts as its dose lines (as in the remainder before). Decided = accepted, removed
  // or otherwise closed. Drugs for home are optional and not counted.
  const weightOf = u => u.kind === 'text' ? Math.max(1, (u.lines || []).filter(l => l.dose).length) : 1;
  function tally(tab) {
    const us = U.filter(u => (!tab || u.tab === tab) && !(u.kind === 'good' && u.home));
    const total = us.reduce((n, u) => n + weightOf(u), 0), done = us.filter(u => !isPending(u)).reduce((n, u) => n + weightOf(u), 0);
    return { total, done, left: total - done };
  }
  const leftAll = () => tally().left;
  function plural(n, a, b, c) { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; }

  // numbers in a quote: digits and Russian number words, so the read-back is visible without reading the whole line
  const NUM_RE = new RegExp('(?<!\\p{L})(ноль|нол[яюе]|один|одн(?:а|у|ой|ого|ому|ом|и|их)|два|две|двух|двум|три|тр[её]х|четыре|четыр[её]х|пять|пяти|шесть|шести|семь|семи|восемь|восьми|девять|девяти|десять|десяти|\\p{L}*надцат\\p{L}*|двадцат\\p{L}*|тридцат\\p{L}*|сорок\\p{L}*|пятьдесят|шестьдесят|семьдесят|восемьдесят|девяност\\p{L}*|сто|двести|триста|четыреста|пятьсот|шестьсот|семьсот|восемьсот|девятьсот|тысяч\\p{L}*|полтор[аы]|половин\\p{L}*)(?!\\p{L})|\\d+(?:[.,]\\d+)?', 'giu');
  const quoteHtml = q => '<span class="sx-ql">Прозвучало:</span> «' + esc(q).replace(NUM_RE, m => '<b>' + m + '</b>') + '»';

  // ================================================================ 2. Vet.AF helpers
  const q = (s, r) => (r || document).querySelector(s);
  const qa = (s, r) => [...(r || document).querySelectorAll(s)];
  const editor = id => document.getElementById(id)?.closest('label')?.querySelector('.ck-editor__editable');
  const formInput = name => q('#visit-form [name="' + name + '"]');
  const fieldLabel = f => document.getElementById(f)?.closest('label');
  const showTab = id => q('header.header-sticky nav a[data-id="' + id + '"]')?.click();
  const currentTab = () => q('header.header-sticky nav a[data-status="active"]')?.dataset.id;
  const isEmptyEditor = e => !e.textContent.trim();
  let ROW_TPL = null, ROW_PARENT = null, NESTED_TPL = null;

  function seed() {
    ROW_TPL = q('[data-item]')?.outerHTML || null;
    ROW_PARENT = q('[data-item]')?.parentNode || null;
    NESTED_TPL = q('[data-item] > section .list > section > [data-id]:not([data-id="last"])')?.outerHTML || null;
    ['anamnesis', 'examination', 'manipulation', 'treatment', 'recommendation'].forEach(id => { const e = editor(id); if (e) e.innerHTML = EMPTY_P; });
    // clinic template in «Осмотр» — demo data for «field already has text» (scenario 7ж)
    editor('examination').innerHTML = '<p>Общее состояние: удовлетворительное</p><p>Лимфоузлы: не увеличены</p>';
    const v = (n, val) => { const i = formInput(n); if (i) { i.value = val; i.setAttribute('value', val); } };
    v('title', 'Первичный прием');        // admin booked the visit
    v('symptom', '');
    v('weight', '6.00');                  // admin weighed at reception
    v('temperature', '');
    const d = q('.visit-block .date span:last-child'); if (d) d.textContent = '10:30, 5 ноября 2026';
    qa('[data-item]').forEach(e => e.remove());
    qa('a[data-url="/animals/documents/view"]').forEach(e => e.remove());
    const ab = q('.animal-block');
    if (ab) {
      const nm = q(':scope > header span > span', ab); if (nm) nm.textContent = PET;
      const det = qa('.details > header', ab);
      const setv = (h, val) => { const x = det.find(e => e.textContent.trim() === h); if (x && x.nextElementSibling) x.nextElementSibling.textContent = val; };
      setv('Вид', 'Кошка'); setv('Порода', 'Метис'); setv('Пол', 'Самец'); setv('Возраст', '6 лет'); setv('Вес', '6,1 кг'); setv('Стерилизация', 'Да');
    }
    document.title = 'Пациенты   ➤   ' + PET + '   ➤   Приём';
    updateTotals();
  }

  function money(n) { return (Math.round(n * 100) / 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 }).replace(/\s/g, ' ') + ' ₽'; }
  let total = 0;
  function updateTotals() {
    qa('.sum-total').forEach(e => e.textContent = money(total));
    const pay = q('.payment-block');
    if (pay) {
      const sum = q(':scope > div > span', pay); if (sum) sum.textContent = money(total);
      const bar = q('.progress > div', pay); if (bar) bar.style.width = '0%';
      const t = q('.title', pay); if (t) t.textContent = total ? '0 ₽ из ' + money(total) : (t.dataset.titleEmpty || 'Нет товаров и услуг');
    }
  }

  // ================================================================ 3. the recording card in the left column (L)
  // Peter's live markup (2026-11-18, message.txt + live changes): section.ai-protocol-block.collapse-block, a header
  // with one title per state, section > .badge / .status / .control, div.result; an element shows when its data-show
  // lists the current state and gets .visible (as his SDK does). Class names and data-bar values are his; additions:
  // state «remind», «decline» / «retry» buttons, time and sound level in the header, the remainder map in .result.
  const VA = BASE + 'vetaf/i/frontend/employee/svg/icons.svg#';   // Vet.AF sprite (our copy)
  const LI = BASE + 'scribe-L-icons.svg#';                       // live Vet.AF icons missing from our copy, redrawn
  const svgUse = (href, cls) => '<svg' + (cls ? ' class="' + cls + '"' : '') + ' aria-hidden="true"><use href="' + href + '"></use></svg>';
  const TIME = '<span class="time">00:00</span>';
  // titles that carry the recorded time and the sound level (also used by the pinned header)
  const HEAD = {
    idle: 'Запись приёма',
    remind: 'Запись не включена',
    unsent: 'Запись не отправлена',
    checking: 'Проверка микрофона',   // round 4 (Yuri): no sound-level meter in the header
    recording: '<span>Идёт запись</span>' + TIME,   // round 7: no «●» — the pulsing badge and the tab title carry it
    paused: '<span>Запись на паузе</span>' + TIME,
    interrupted: '<span>Запись прервана</span>' + TIME,
    confirm: '<span>Удалить запись?</span>' + TIME,
    sending: 'Отправка записи',
    drafting: 'Подготовка предложений',
    nodraft: 'Сбой подготовки',
    mic: '<span class="ai-mic-title"></span>',
    ready: 'Предложения готовы',
    saved: '<span class="ai-done-mark">✓&nbsp;</span>Из записи: всё проверено'   // round 10 text (Yuri): «проверить» instead of «разобрать»; the ✓ is a character of the text
  };
  let card = null, pin = null;
  function buildCard() {
    const el = document.createElement('section');
    el.className = 'ai-protocol-block collapse-block opened';
    el.dataset.state = 'idle';
    const show = (s, html, tag, cls) => '<' + (tag || 'span') + ' data-show="' + s + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + html + '</' + (tag || 'span') + '>';
    const btn = (s, bar, cls, icon, text, label) => '<button type="button" class="button' + (cls ? ' ' + cls : '') + (icon ? ' with-icon' : '') +
      '" data-show="' + s + '" data-bar="' + bar + '" title="' + (label || text) + '" aria-label="' + (label || text) + '">' + (icon || '') + (text ? '<span>' + text + '</span>' : '') + '</button>';
    el.innerHTML =
      '<header><span><span>' + Object.entries(HEAD).map(([s, h]) => show(s, h)).join('') + '</span>' + svgUse(VA + 'arrow', 'arrow') + '</span></header>' +
      '<section>' +
        '<div class="badge">' +
          show('idle remind unsent checking recording paused', '', 'svg').replace('></svg>', '><use href="' + LI + 'mic"></use></svg>') +
          show('mic interrupted', '', 'svg').replace('></svg>', '><use href="' + LI + 'mic-off"></use></svg>') +
          show('confirm', '', 'svg').replace('></svg>', '><use href="' + VA + 'delete"></use></svg>') +
          // round 9 (Yuri): after the recording the badge is Peter's tick in the green circle — the microphone stays only in
          // the recording states; the yellow «!» of the empty bill stays (round 2 / 8)
          show('ready-left ready-clear saved', '', 'svg').replace('></svg>', '><use href="' + VA + 'tick"></use></svg>') +
          show('nodraft ready-guard', '', 'svg').replace('></svg>', '><use href="' + VA + 'warning"></use></svg>') +
          '<div data-show="sending drafting" data-loader="circle"><div class="circle-loader"></div></div>' +
        '</div>' +
        '<div class="status" aria-live="polite">' +
          // round 2: texts of the copy lens (lens-copy-r1.md) with the coordinator's choices; nothing claims the recording is saved
          show('idle', 'Запишем разговор и предложим, чем заполнить приём') +
          show('remind', 'Включите — запишем с этого места') +
          show('checking', 'Если браузер спросит, нажмите «Разрешить»') +
          show('recording', 'Приём закончен — нажмите «Завершить»') +
          show('paused', 'Разговор сейчас не записывается') +
          show('interrupted', 'Пропал доступ к микрофону. Нажмите «Продолжить»') +
          show('confirm', 'Запись и предложения удалятся навсегда') +
          // round 5: the 8 s after «Завершить» are in the recording group — the countdown is the status (2 lines)
          show('sending', 'Не закрывайте вкладку браузера') +
          show('drafting', 'Обычно меньше минуты. Работайте дальше') +
          show('nodraft', 'Заполните приём вручную или нажмите «Повторить»') +
          show('unsent', 'Отправьте запись сейчас') +
          show('mic', '', 'span', 'ai-mic-sub') +
          show('ready', '', 'span', 'ai-left') +
          show('saved', 'Принятое сохранено в приёме') +
        '</div>' +
        // DOM order = Peter's; the two-row layout and which button is primary per state are set in scribe-L.css
        '<div class="control">' +
          btn('idle remind', 'start', 'green', svgUse(LI + 'player-record'), 'Начать запись') +
          '<button type="button" class="ai-link" data-show="remind" data-bar="decline">Не записывать этот приём</button>' +
          btn('unsent', 'send-unsent', 'green', '', 'Отправить запись') +
          btn('unsent', 'skip-unsent', '', '', 'Не сейчас', 'Не отправлять сейчас') +
          btn('checking', 'cancel', '', '', 'Отменить') +
          '<button type="button" class="button green with-icon ai-mic-btn" data-show="mic" data-bar="start"></button>' +
          btn('recording', 'pause', '', svgUse(LI + 'player-pause'), 'Пауза') +
          btn('paused', 'resume', 'green', svgUse(LI + 'player-play'), 'Продолжить', 'Продолжить запись') +
          btn('interrupted', 'restart', 'green', svgUse(LI + 'player-play'), 'Продолжить', 'Продолжить запись') +
          btn('recording paused interrupted', 'stop', 'green', svgUse(VA + 'tick'), 'Завершить', 'Завершить запись') +
          btn('paused', 'delete-ask', '', svgUse(VA + 'delete'), '', 'Удалить запись') +
          btn('confirm', 'delete-no', 'green', svgUse(LI + 'player-close'), 'Не удалять') +
          btn('confirm', 'delete-yes', 'ai-danger', svgUse(VA + 'delete'), 'Удалить') +
          btn('nodraft', 'retry', '', svgUse(VA + 'refresh'), 'Повторить', 'Повторить подготовку') +
        '</div>' +
      '</section>' +
      '<div class="result"></div>';
    return el;
  }
  // the pinned header (spec §2, «Липкость»): the column scrolls by itself, a sticky header inside the card would leave
  // with the card — so a sticky bar above the card shows a copy of the header (and the main action) once the card's
  // header is scrolled away. It has its real height; a negative bottom margin keeps the column from moving.
  function buildPin() {
    const el = document.createElement('div');
    el.className = 'ai-protocol-pin';
    el.hidden = true;
    return el;
  }

  // ================================================================ 4. inline layer under the fields
  let draftReady = false, saved = false, dirty = false, savedAt = null, completed = false;
  let guardUntil = 0;           // see «double click» guard in the flow
  const undoStore = {};
  const hosts = {};

  // a host = our element next to a Vet.AF field; never inside the field or the editor content
  function host(key, place) {
    if (hosts[key] && hosts[key].isConnected) return hosts[key];
    const el = document.createElement('div');
    el.className = 'sx-host';
    el.dataset.host = key;
    place(el);
    hosts[key] = el;
    return el;
  }
  const after = ref => el => ref.after(el);

  const fieldNow = u => u.kind === 'text' ? editor(u.field).innerHTML : formInput(u.field).value;
  const fieldText = u => u.kind === 'text' ? editor(u.field).textContent.trim() : formInput(u.field).value.trim();
  const edited = u => u.applied != null && fieldNow(u) !== u.applied;

  function head(u, extra) {
    return '<div class="sx-head"><span class="sx-badge">' + ICON.mic + '</span><span class="sx-from">Из записи</span>' + (extra || '') + '</div>';
  }

  // one dictionary (Yuri 2026-11-12): the button is a verb, the state is the same verb in the past tense;
  // the source is clear from the block label «Из записи», so states do not repeat it
  const unitOf = u => u.field === 'weight' ? ' кг' : ' °C';
  function receipt(u, inCell) {
    const lbl = u.group && !inCell ? '<span class="sx-rl">' + esc(u.label) + '</span>' : '';
    const fresh = u.fresh ? ' sx-appear' : '';
    if (u.status === 'rejected') {
      const what = u.kind === 'number' && u.kept ? 'Оставлено: <span class="sx-nowrap">' + esc(u.kept) + unitOf(u) + '</span>' : 'Убрано';
      return '<div class="sx-receipt is-rejected' + fresh + '" data-u="' + u.id + '">' + lbl +
        '<span>' + what + '</span><button type="button" class="sx-link" data-a="restore">Вернуть</button></div>';
    }
    const nb = x => '<span class="sx-nowrap">' + esc(x) + unitOf(u) + '</span>';
    const how = u.kind === 'number' ? (u.was ? 'Заменено: ' + nb(u.show) + ', было ' + nb(u.was) : 'Принято: ' + nb(u.show))
      : u.mode === 'append' ? 'Дописано' : u.mode === 'replace' ? 'Заменено' : 'Принято';
    const ed = edited(u);
    // edited after acceptance (Yuri 2026-11-12): one click returns the field to how it was right after acceptance;
    // «Отменить» then brings back the vet's edited version — nothing is lost for good
    const back = u.kind === 'number' ? 'Вернуть ' + esc(u.show) : 'Вернуть текст из записи';   // round 5 glossary
    if (ed) return '<div class="sx-receipt' + fresh + '" data-u="' + u.id + '">' + ICON.tick + lbl + '<span>' + (u.kind === 'number' ? 'Значение изменено' : 'Текст изменён') + '</span>' +
      '<button type="button" class="sx-link" data-a="reapply">' + back + '</button></div>';
    if (u.reapplied) return '<div class="sx-receipt' + fresh + '" data-u="' + u.id + '">' + ICON.tick + lbl +
      '<span>' + (u.kind === 'number' ? 'Возвращено: ' + nb(u.show) : 'Текст возвращён') + '</span><button type="button" class="sx-link" data-a="undo">Отменить</button></div>';
    const tail = saved && !dirty ? '<span class="sx-muted">· сохранено</span>'
      : '<button type="button" class="sx-link" data-a="undo">Отменить</button>';
    return '<div class="sx-receipt' + fresh + '" data-u="' + u.id + '">' + ICON.tick + lbl +
      '<span>' + how + '</span>' + tail + '</div>';
  }

  // a line: names and doses in bold; a line with a dose always shows its quote (no confirmation step, Yuri 2026-11-12)
  function lineHtml(u, l, i) {
    if (l.excluded) return '';
    if (l.header) return liveLines(u).includes(l) ? '<li class="sx-line sx-hd" data-l="' + i + '"><span class="sx-t">' + l.html + '</span></li>' : '';
    return '<li class="sx-line' + (l.dose ? ' has-dose' : '') + '" data-l="' + i + '"><span class="sx-t">' + l.html + '</span>' +
      '<button type="button" class="sx-x" data-a="drop" title="Убрать строку" aria-label="Убрать строку">' + ICON.x + '</button>' +
      '<div class="sx-q">' + quoteHtml(l.quote) + '</div></li>';
  }

  // round 8 (Yuri): lines removed with «×» come back at their own block — the card has no «Убрано» list any more
  function droppedHtml(u) {
    const n = (u.lines || []).filter(l => l.excluded && !l.header).length;
    return n ? '<div class="sx-note sx-dropped">Убрано строк: ' + n + ' · <button type="button" class="sx-link" data-a="lines-restore">Вернуть</button></div>' : '';
  }
  function textBlock(u) {
    if (u.status !== 'new') return receipt(u);
    const has = !!fieldText(u);
    const lis = u.lines.map((l, i) => lineHtml(u, l, i)).join('');
    const main = has
      ? '<button type="button" class="button green sx-btn" data-a="accept" data-mode="append">Дописать</button>' +
        '<button type="button" class="button sx-btn" data-a="accept" data-mode="replace">Заменить</button>'
      : '<button type="button" class="button green sx-btn" data-a="accept" data-mode="set">Принять</button>';
    const anyQuoteHidden = liveLines(u).some(l => !l.dose && !l.header);
    return '<div class="sx-block' + (u.showQuotes ? ' show-quotes' : '') + '" data-u="' + u.id + '">' +
      head(u,
        (anyQuoteHidden ? '<button type="button" class="sx-link sx-qtoggle" data-a="quotes">' + (u.showQuotes ? 'Скрыть цитаты' : 'Показать цитаты') + '</button>' : '')) +
      '<ul class="sx-lines">' + lis + '</ul>' + droppedHtml(u) + (has ? '<div class="sx-note sx-note-text">В поле уже есть текст. «Дописать» добавит новый после него</div>' : '') +
      '<div class="sx-acts">' + main + '<button type="button" class="sx-link" data-a="reject">Убрать</button></div></div>';
  }

  function inputItem(u) {
    if (u.status !== 'new') return receipt(u);
    const cur = formInput(u.field).value.trim();
    const extend = cur && u.value.toLowerCase().startsWith(cur.toLowerCase());
    let val, acts, note = '';
    if (!cur) {
      val = '<div class="sx-val">' + esc(u.value) + '</div>';
      acts = '<button type="button" class="button green sx-btn" data-a="accept" data-mode="set">Принять</button>';
    } else if (extend) {
      val = '<div class="sx-val"><span class="sx-vl">Станет:</span> ' + esc(u.value.slice(0, cur.length)) + '<ins>' + esc(u.value.slice(cur.length)) + '</ins></div>';
      acts = '<button type="button" class="button green sx-btn" data-a="accept" data-mode="extend">Принять</button>';
    } else {
      val = '<div class="sx-val">' + esc(u.value) + '</div>';
      note = '<div class="sx-note">В поле уже есть текст: «' + esc(cur) + '»</div>';   // under the quote (Yuri 2026-11-12)
      acts = '<button type="button" class="button green sx-btn" data-a="accept" data-mode="append">Дописать</button>' +
        '<button type="button" class="button sx-btn" data-a="accept" data-mode="replace">Заменить</button>';
    }
    return '<div class="sx-item" data-u="' + u.id + '">' + (u.group ? '<div class="sx-il">' + esc(u.label) + '</div>' : '') + val +
      '<div class="sx-q">' + quoteHtml(u.quote) + '</div>' + note +
      '<div class="sx-acts">' + acts + '<button type="button" class="sx-link" data-a="reject">Убрать</button></div></div>';
  }

  function numberItem(u) {
    if (u.status !== 'new') return receipt(u);
    const raw = formInput(u.field).value.trim();
    const cur = u.field === 'weight' ? fmtNum(raw) : raw;
    const unitTxt = u.field === 'weight' ? ' кг' : ' °C';
    const differs = raw && parseFloat(raw) !== parseFloat(u.value);
    let val, acts;
    if (differs) {   // strict: the field already holds another value (decision 4.2 A)
      val = '<div class="sx-val sx-cmp"><span><span class="sx-vl">В поле</span> ' + esc(cur) + unitTxt + '</span><span class="sx-arrow">→</span>' +
        '<span class="sx-new"><span class="sx-vl">Из записи</span> <b>' + esc(u.show) + '</b>' + unitTxt + '</span></div>';
      acts = '<button type="button" class="button green sx-btn" data-a="accept" data-mode="replace">Заменить на ' + esc(u.show) + '</button>' +
        '<button type="button" class="button sx-btn" data-a="keep">Оставить ' + esc(cur) + '</button>';
    } else {
      val = '<div class="sx-val"><b>' + esc(u.show) + '</b>' + unitTxt + '</div>';
      acts = '<button type="button" class="button green sx-btn" data-a="accept" data-mode="set">Принять ' + esc(u.show) + '</button>' +
        '<button type="button" class="sx-link" data-a="reject">Убрать</button>';
    }
    return '<div class="sx-item sx-num-item" data-u="' + u.id + '"><div class="sx-il">' + esc(u.label) + '</div>' + val +
      '<div class="sx-q sx-q-dose">' + quoteHtml(u.quote) + '</div><div class="sx-acts">' + acts + '</div></div>';
  }

  // a compact card under a narrow number field: the value, the current one if different, ✓ / ✕ (their meaning in the tooltip)
  function numCard(u) {
    const raw = formInput(u.field).value.trim();
    const cur = u.field === 'weight' ? fmtNum(raw) : raw;
    const differs = raw && parseFloat(raw) !== parseFloat(u.value);
    const ok = differs ? 'Заменить на ' + u.show : 'Принять ' + u.show, no = differs ? 'Оставить ' + cur : 'Убрать';
    // the quote opens on hover / focus right under its own card, names its field and points at the card with a caret
    const qid = 'sx-q-' + u.id;
    return '<div class="sx-block sx-numcard' + (u.field === 'temperature' ? ' is-last' : '') + '" data-u="' + u.id + '">' +
      '<span class="sx-nc-qi" title="Что прозвучало" aria-hidden="true">«»</span>' +
      '<div class="sx-nc-v"><span class="sx-nowrap"><b>' + esc(u.show) + '</b>' + unitOf(u) + '</span></div>' +
      (differs ? '<div class="sx-nc-was">в поле ' + esc(cur) + '</div>' : '') +
      '<div class="sx-q sx-nc-q" id="' + qid + '"><span class="sx-nc-ql">' + esc(u.label.replace(/,.*$/, '')) + '.</span> ' + quoteHtml(u.quote) + '</div>' +
      // Yuri 2026-11-12: two full-text buttons one under the other, not icons
      '<div class="sx-nc-acts"><button type="button" class="button green sx-btn" data-a="accept" data-mode="' + (differs ? 'replace' : 'set') + '" aria-describedby="' + qid + '">' + esc(ok) + '</button>' +
      '<button type="button" class="button sx-btn" data-a="' + (differs ? 'keep' : 'reject') + '" aria-describedby="' + qid + '">' + esc(no) + '</button></div></div>';
  }

  // how the vet said it: «надо исключить» is not a diagnosis set; the type is still the vet's choice (not preselected)
  const DIAG_MARK = /(надо исключить|исключить|скорее всего|на мой взгляд|подозрева\p{L}*|возможно)/giu;
  // Yuri 2026-11-12: the model returns the type of every diagnosis (Vet.AF ids) — it is prefilled in the dialog and shown
  // on the suggestion in Vet.AF words; the markers in the quote stay highlighted, so the vet sees why this type
  const KINDS = { differential: 'Дифференциальный', final: 'Окончательный', clinical: 'Клинический', preliminary: 'Предварительный' };
  const diagTag = u => KINDS[u.dkind] || '';
  const diagQuote = u => quoteHtml(u.quote).replace(DIAG_MARK, m => '<mark>' + m + '</mark>');
  const diagTagHtml = u => diagTag(u) ? '<span class="sx-tag" title="Тип диагноза из записи">' + diagTag(u) + '</span>' : '';

  function diagRow(u) {
    if (u.status === 'done') return '';
    if (u.status === 'rejected') return '<div class="sx-receipt is-rejected sx-drow" data-u="' + u.id + '"><span>Убрано: диагноз «' + esc(u.title) + '»</span><button type="button" class="sx-link" data-a="restore">Вернуть</button></div>';
    return '<div class="sx-diag" data-u="' + u.id + '">' +
      '<div class="sx-dmain">' + head(u) + '<div class="sx-val sx-dt">' + esc(u.title) + diagTagHtml(u) + '</div><div class="sx-q sx-q-diag">' + diagQuote(u) + '</div></div>' +
      '<div class="sx-acts"><button type="button" class="button green sx-btn" data-a="diag">Добавить диагноз</button><button type="button" class="sx-link" data-a="reject">Убрать</button></div></div>';
  }

  function renderInline() {
    if (!draftReady) return;
    U.filter(u => u.kind === 'input' && !u.group).forEach(u => {
      host(u.id, after(q('#visit-form label.visit-target'))).innerHTML = u.status === 'new' ? '<div class="sx-block sx-single">' + head(u) + inputItem(u) + '</div>' : receipt(u);
    });
    U.filter(u => u.kind === 'text').forEach(u => { host(u.id, after(fieldLabel(u.field))).innerHTML = textBlock(u); });
    // symptoms · weight · temperature (Yuri 2026-11-12, lab variant 3): each suggestion right under its own field,
    // in a grid that copies the columns of the Vet.AF row; numbers are compact cards, the quote opens on hover / focus
    const row = q('#visit-form .triple-row');
    const th = host('triple', after(row));
    th.classList.add('sx-cells');
    // each card sits exactly under its own input: columns are measured from the inputs (widths and gaps), and a field
    // without a suggestion keeps an empty cell, so «Температура» never slides under «Вес» (fit check 2026-11-12)
    const TRIPLE = ['symptom', 'weight', 'temperature'];
    const rs = TRIPLE.map(f => formInput(f).getBoundingClientRect());
    th.style.columnGap = '0';
    th.style.gridTemplateColumns = rs.map((r, i) => (i ? (r.left - rs[i - 1].right) + 'px ' : '') + r.width + 'px').join(' ');
    th.style.marginLeft = (rs[0].left - row.getBoundingClientRect().left) + 'px';
    th.innerHTML = TRIPLE.map((f, i) => {
      const u = U.find(x => x.group === 'triple' && x.field === f);
      return '<div class="sx-cell" style="grid-column:' + (2 * i + 1) + '">' + (!u ? '' : !isPending(u) ? receipt(u, true)
        : u.kind === 'number' ? numCard(u) : '<div class="sx-block sx-triple" data-u="' + u.id + '">' + head(null) + inputItem(u) + '</div>') + '</div>';
    }).join('');
    const dl = q('#list-diagnoses .list');
    host('diag', el => dl.insertBefore(el, q('.empty-list', dl))).innerHTML = U.filter(u => u.kind === 'diag').map(diagRow).join('');
    renderTags();
  }

  // actions on the Vet.AF fields
  function accept(u, mode) {
    if (u.kind === 'text') {
      const e = editor(u.field);
      undoStore[u.id] = e.innerHTML;
      const html = '<p>' + liveLines(u).map(l => l.html).join('<br>') + '</p>';   // bold from the model goes into the card
      if (isEmptyEditor(e) || mode === 'replace' || mode === 'set') e.innerHTML = html; else e.innerHTML += html;
    } else {
      const i = formInput(u.field);
      undoStore[u.id] = i.value;
      const cur = i.value.trim();
      u.was = u.kind === 'number' && cur ? (u.field === 'weight' ? fmtNum(cur) : cur) : null;
      let val = u.value;
      if (u.kind === 'input' && cur && mode === 'append') val = cur + '. ' + u.value;
      i.value = val; i.setAttribute('value', val);
    }
    u.status = 'done'; u.mode = mode; dirty = true;
    u.applied = fieldNow(u);
    flash(u.kind === 'diag' ? null : fieldLabel(u.field));
  }

  function setField(u, v) {
    if (u.kind === 'text') editor(u.field).innerHTML = v;
    else { const i = formInput(u.field); i.value = v; i.setAttribute('value', v); }
  }
  function undo(u) {
    setField(u, undoStore[u.id]);
    u.status = 'new'; u.applied = null; u.mode = null; u.reapplied = false;
  }
  // «Вернуть текст из записи»: the field as right after acceptance; the vet's version is kept for «Отменить»
  function reapply(u) { u.edits = fieldNow(u); setField(u, u.applied); u.reapplied = true; dirty = true; flash(fieldLabel(u.field)); }
  function unreapply(u) { setField(u, u.edits); u.reapplied = false; dirty = true; }

  // fold an element to zero height, then call fn (height, padding and opacity transition; 200 ms)
  function collapse(el, fn) {
    let done = false;
    const go = () => { if (done) return; done = true; fn(); };
    el.style.height = el.offsetHeight + 'px'; el.style.overflow = 'hidden'; void el.offsetHeight;
    el.classList.add('sx-closing');
    el.style.height = '0px';
    el.addEventListener('transitionend', ev => { if (ev.propertyName === 'height') go(); });
    setTimeout(go, 320);
  }

  function flash(el) {
    if (!el) return;
    el.classList.remove('scribe-flash'); void el.offsetWidth; el.classList.add('scribe-flash');
  }

  // diagnoses: the Vet.AF «Добавить диагноз» dialog with the text; the type is the vet's choice
  let diagFor = null, pop = null;
  function openDiag(u) {
    diagFor = u;
    const dlg = q('#proto-diag-dialog');
    q('input[name="title"]', dlg).value = u.title;
    const cs = q('.custom-select', dlg);
    // the type from the recording is set like a choice in the Vet.AF list; the list stays closed — the vet changes it if needed
    const k = KINDS[u.dkind] ? u.dkind : '';
    q('input[type="hidden"][name="kind"]', cs).value = k;
    q('input[readonly]', cs).value = KINDS[k] || '';
    qa('[data-view="list"] > span[data-id]', cs).forEach(o => o.classList.toggle('selected', o.dataset.id === k));
    cs.classList.toggle('bottom', !k);
    q('.scribe-diag-need', dlg)?.remove();
    dlg.showModal();
    // the quote stays visible above the dialog: our popover in the top layer, not part of the dialog
    if (!pop) { pop = document.createElement('div'); pop.className = 'sx-pop'; pop.setAttribute('popover', 'manual'); document.body.appendChild(pop); }
    pop.innerHTML = '<span class="sx-badge">' + ICON.mic + '</span><div><div class="sx-q sx-q-dose sx-q-diag">' + diagTagHtml(u) + diagQuote(u) + '</div><div class="sx-muted">Тип выбран по записи — проверьте</div></div>';
    if (!pop.matches(':popover-open')) pop.showPopover();
    const r = q(':scope > section', dlg).getBoundingClientRect();
    pop.style.width = r.width + 'px';
    pop.style.left = r.left + 'px';
    const h = pop.offsetHeight;
    pop.style.top = (r.top - h - 8 > 8 ? r.top - h - 8 : r.bottom + 8) + 'px';
  }
  const closePop = () => { if (pop && pop.matches(':popover-open')) pop.hidePopover(); };

  function saveDiag() {
    const dlg = q('#proto-diag-dialog');
    const cs = q('.custom-select', dlg);
    const kind = q('input[readonly]', cs).value;
    if (!kind) {
      if (!q('.scribe-diag-need', dlg)) {
        const n = document.createElement('div');
        n.className = 'scribe-diag-need';
        n.style.cssText = 'color: var(--red-color); font-size: .875rem; margin-top: .375rem';
        n.textContent = 'Выберите тип диагноза';
        cs.closest('label').appendChild(n);
      }
      cs.classList.remove('bottom');
      return;
    }
    const title = q('input[name="title"]', dlg).value;
    const list = q('#list-diagnoses .list');
    const row = document.createElement('div');
    row.className = 'scribe-row';
    row.innerHTML = '<span>' + esc(title) + '</span><span>' + esc(kind) + '</span><span>05.11.2026</span><span>—</span><span></span>';
    q(':scope > section', list).appendChild(row);
    q('.empty-list', list)?.classList.remove('visible');
    closePop();
    dlg.close();
    if (diagFor) { diagFor.status = 'done'; diagFor.result = kind; dirty = true; diagFor = null; }
    flash(row);
    renderAll();
  }

  // ================================================================ 5. goods: search tags (approved 2026-11-11)
  // The service does not choose a position: a tag puts its query into the Vet.AF search that is open now —
  // the main row or the modal «Добавить товар в услугу» — and the vet picks and presses «Добавить».
  // Quantity is never prefilled: the tag shows what was heard. Template consumables get no tags.
  const goods = () => U.filter(u => u.kind === 'good');
  // round 5 glossary: «6 позиций не добавлено» (the vet adds positions to the visit)
  const nNotBilled = n => n + ' ' + plural(n, 'позиция не добавлена', 'позиции не добавлены', 'позиций не добавлено');
  let activeTag = null;          // { id, scope: 'main' | 'modal' } — the item whose query is in the search now
  let modalRow = null;           // Vet.AF row whose «+ Добавить товар» modal is open
  let pickedMain = null, pickedModal = null;
  const rows = [];               // Vet.AF goods rows of this visit (prototype model)
  let rowSeq = 1;

  const heardQty = u => u.recQty != null ? fmtNum(u.recQty) + (u.recUnit ? ' ' + u.recUnit : '') : '';
  // fallback queries: short stems first (they are the ones that usually find the clinic's brand)
  const fallbacks = u => u.qs.filter(x => x !== u.lastQ).sort((a, b) => a.length - b.length).slice(0, 3);

  // pending item: the name puts its query into the open search; «×» removes it (with «Вернуть»)
  function tagHtml(u, scope) {
    const active = activeTag && activeTag.id === u.id && activeTag.scope === scope;
    const x = u.home ? '' : '<button type="button" class="sx-tx" data-a="reject" title="Убрать" aria-label="Убрать: ' + esc(u.name) + '">' + ICON.x + '</button>';
    return '<span class="sx-tg' + (active ? ' is-active' : '') + '" data-u="' + u.id + '">' +
      '<button type="button" class="sx-tb" data-a="gtag" aria-describedby="tip-' + scope + '-' + u.id + '">' + ICON.search +
        '<span class="sx-tn">' + esc(u.name) + '</span>' + (heardQty(u) ? '<span class="sx-th">прозвучало ' + esc(heardQty(u)) + '</span>' : '') + '</button>' +
      x +
      '<span class="sx-tip" role="tooltip" id="tip-' + scope + '-' + u.id + '">' + quoteHtml(u.quote) + '</span></span>';
  }
  // one reserved line under the names: the hint, or the active item's quote, empty result and «Уже внесено»
  function statusLine(scope) {
    const u = activeTag && activeTag.scope === scope ? byId(activeTag.id) : null;
    if (!u) return '<div class="sx-gstat">' + 'Нажмите на название, чтобы найти товар. Количество введите сами' + '</div>';
    const fb = '';   // round 5: «искать иначе» moved to the strip under the search field (altStrip)
    // «Внесено под другим названием»: link the line to a table row that no line claims yet; never close a line without a row
    const all = unlinkedRows();
    const free = all.filter(f => scope === 'main' || (f.n && f.rw === modalRow));
    const other = !free.length ? '' : choosingFor === u.id
      ? '<div class="sx-other"><span>Выберите позицию:</span>' + free.map(f =>
          '<button type="button" class="sx-link" data-a="glink" data-u="' + u.id + '" data-i="' + all.indexOf(f) + '">' + esc(f.label) + '</button>').join(' · ') +
        ' <button type="button" class="sx-link sx-muted" data-a="glink-cancel">Отменить</button></div>'
      : ' <button type="button" class="sx-link" data-a="gother" data-u="' + u.id + '">Добавлено под другим названием</button>';
    return '<div class="sx-gstat is-active"><div class="sx-q">' + quoteHtml(u.quote) + (choosingFor === u.id ? '' : other) + '</div>' +
      (choosingFor === u.id ? other : '') + fb + '</div>';
  }
  // added items (Yuri 2026-11-12: no «Верно» step) — one line each, the billed position in bold, so a near-twin
  // («УЗИ почек» for «УЗИ мочевого пузыря») or another unit is seen by reading, not by an extra click
  function doneHtml(u) {
    const where = u.parent ? 'в «' + esc(u.parent) + '»' : 'в приёме';
    // what was heard vs what is billed: another name, unit or number → amber mark instead of the tick (no extra click)
    const UNIT_EQ = { 'пакет': 'шт', 'упаковка': 'шт', 'флакон': 'шт' };
    const sameName = u.addTitle.toLowerCase().includes(u.name.toLowerCase());
    const sameUnit = !u.recUnit || (UNIT_EQ[u.recUnit] || u.recUnit) === (UNIT_EQ[u.addUnit] || u.addUnit);
    const diff = !u.linked && (!sameName || !sameUnit || (u.recQty != null && u.recQty !== u.addQty));
    const mark = diff ? '<span class="sx-diffmark" aria-hidden="true">!</span>' : ICON.tick;
    const lead = sameName ? (u.parent ? 'В «' + esc(u.parent) + '»' : 'В приёме') : esc(u.name) + ' → ' + where;
    return '<li class="sx-done' + (diff ? ' is-diff' : '') + '" data-u="' + u.id + '">' + mark + '<div class="sx-dl1">' + lead + ': <b>' +
      esc(u.addTitle) + ' × ' + esc(fmtNum(u.addQty) + ' ' + u.addUnit) + '</b>' +
      (u.recQty != null ? ' <span class="sx-muted">· прозвучало ' + esc(heardQty(u)) + '</span>' : '') +
      (diff ? ' <span class="sx-diffnote">· не совпадает с прозвучавшим</span>' : '') +
      (u.linked ? ' <span class="sx-muted">· связано вручную</span> <button type="button" class="sx-link" data-a="gunlink">Отменить</button>' : '') + '</div></li>';
  }
  // rows of the Vet.AF table (and goods inside services) that no line of the draft is linked to
  let choosingFor = null;
  function unlinkedRows() {
    const out = [];
    rows.forEach(rw => {
      if (!goods().some(t => t.status === 'done' && t.rowId === rw.id && !t.nestedTitle)) out.push({ label: rw.title, rw, n: null });
      rw.nested.filter(n => !n.template).forEach(n => {
        if (!goods().some(t => t.status === 'done' && t.rowId === rw.id && t.nestedTitle === n.title)) out.push({ label: n.title + ' в «' + rw.title + '»', rw, n });
      });
    });
    return out;
  }


  // block above the search row of the goods tab; the added items go under the search row, so the row itself does not move down
  function renderTags() {
    const box = q('#list-items-in-sale');
    const form = q(':scope > form', box);
    const h = host('goods', el => box.insertBefore(el, form));
    const open = goods().filter(u => isPending(u) && !u.home), rej = goods().filter(u => u.status === 'rejected');
    const home = goods().filter(u => isPending(u) && u.home);
    const done = goods().filter(u => u.status === 'done');
    // one status line (hint / quote / «искать: …»), under the group whose name is in the search now
    const act = activeTag && activeTag.scope === 'main' ? byId(activeTag.id) : null;
    const lineUnder = open.length ? 'main' : home.length ? 'home' : null;   // one fixed place: the group does not jump on a click
    h.innerHTML = '<div class="sx-goods">' +
      head(null, '<span class="sx-gtitle">— ' + (open.length ? nNotBilled(open.length) : 'всё проверено') + '</span>') +
      (open.length ? '<div class="sx-tags">' + open.map(u => tagHtml(u, 'main')).join('') + '</div>' : '') +
      (lineUnder === 'main' ? statusLine('main') : '') +
      (home.length ? '<div class="sx-home"><div class="sx-home-h">Назначено на дом. Добавьте, если отпускаете в клинике</div><div class="sx-tags">' + home.map(u => tagHtml(u, 'main')).join('') + '</div></div>' : '') +
      (lineUnder === 'home' ? statusLine('main') : '') +
      (rej.length ? '<div class="sx-rej">Убрано: ' + rej.map(u => esc(u.name) + ' <button type="button" class="sx-link" data-a="restore" data-u="' + u.id + '">Вернуть</button>').join(' · ') + '</div>' : '') +
    '</div>';
    const hd = host('goods-done', el => form.after(el));
    hd.innerHTML = done.length ? '<div class="sx-goods-done"><div class="sx-from">Добавлено в приём</div><ul class="sx-donelist">' + done.map(doneHtml).join('') + '</ul></div>' : '';
    renderModalTags();
    renderAltStrips();
  }

  // round 5 (spec §5): «Искать иначе: мелокс · локсик · мелоксикам» right under the Vet.AF search field, as soon as a
  // recorded name is in the search; a click puts the query in and refreshes the results; with no results the lead reads
  // «Искать так:» (round 6: the Vet.AF list itself says «Ничего не найдено»). The line is reserved while the tab has recorded names, so the results never jump.
  function altHtml(scope) {
    const u = activeTag && activeTag.scope === scope ? byId(activeTag.id) : null;
    const alts = u ? fallbacks(u) : [];
    if (!alts.length) return '';
    return '<span class="sx-alt-lead">' + (u.lastEmpty ? 'Искать так:' : 'Искать иначе:') + '</span> ' + alts.map(x =>
      '<button type="button" class="sx-link" data-a="gq" data-u="' + u.id + '" data-q="' + esc(x) + '">' + esc(x) + '</button>').join(' · ');
  }
  function renderAltStrips() {
    const row = q('#list-items-in-sale > form > div');
    if (row) {
      let st = q(':scope > .sx-alt', row);
      if (!st) { st = document.createElement('div'); st.className = 'sx-alt'; row.appendChild(st); }
      row.classList.toggle('sx-alt-on', draftReady && goods().length > 0);
      st.innerHTML = altHtml('main');
    }
    const w = q('#proto-good-dialog .sx-mwrap');
    if (w) {
      let st = q(':scope > .sx-alt', w);
      if (!st) { st = document.createElement('div'); st.className = 'sx-alt'; q('.sx-mq', w).after(st); }
      st.innerHTML = altHtml('modal');
    }
  }

  // in the modal «Добавить товар в услугу» (goods only): our plate INSIDE the Vet.AF dialog, above its card —
  // a modal dialog makes the rest of the page inert, so a plate outside it could not be clicked
  function renderModalTags() {
    const dlg = q('#proto-good-dialog');
    if (!dlg) return;
    let plate = q(':scope > .sx-gplate', dlg);
    if (!plate) { plate = document.createElement('div'); plate.className = 'sx-gplate'; dlg.insertBefore(plate, dlg.firstChild); }
    const list = goods().filter(u => u.type === 'good' && !u.home && isPending(u));
    const done = goods().filter(u => u.type === 'good' && !u.home && u.status === 'done');
    plate.innerHTML = '<span class="sx-badge">' + ICON.mic + '</span><div class="sx-gpop-b"><div class="sx-from">Из записи — товары и услуги</div>' +
      (list.length ? '<div class="sx-tags">' + list.map(u => tagHtml(u, 'modal')).join('') + '</div>' + statusLine('modal') : '') +
      (done.length ? '<ul class="sx-donelist">' + done.map(doneHtml).join('') + '</ul>' : '') +
      (!list.length && !done.length ? '<div class="sx-muted">Из записи ничего нет</div>' : '') + '</div>';
  }

  // Vet.AF search dropdowns (main row and modal): continuous substring, «Ничего не найдено» when empty
  const mainInput = () => q('#itemTitle');
  const mainList = () => q('#list-items-in-sale .ui-holder ul');
  function showResults(ul, text, goodsOnly) {
    const res = searchCatalog(text, goodsOnly);
    ul.innerHTML = !text.trim() ? '' : res.length
      ? res.map(c => '<li class="ui-menu-item"><a class="ui-menu-item-wrapper" data-opt="' + CATALOG.indexOf(c) + '" title="' + c.type + '"><span>' + esc(c.title) + '</span><span>' + money(c.price) + '/' + c.unit + '</span></a></li>').join('')
      : '<li class="ui-menu-item sx-none">Ничего не найдено</li>';
    ul.style.display = text.trim() ? 'flex' : 'none';
    return res;
  }
  function runTag(u, query) {
    const scope = q('#proto-good-dialog')?.open ? 'modal' : 'main';
    if (scope === 'modal' && u.type !== 'good') return;
    activeTag = { id: u.id, scope };
    u.lastQ = query;
    if (scope === 'main') {
      showTab('items');
      const inp = mainInput(); inp.value = query; inp.focus();
      pickedMain = null;
      u.lastEmpty = !showResults(mainList(), query, false).length;
    } else {
      const inp = q('#proto-good-dialog .sx-mq'); inp.value = query; inp.focus();
      pickedModal = null;
      u.lastEmpty = !showResults(q('#proto-good-dialog .sx-mres'), query, true).length;
    }
  }
  // which item an added row closes: the one whose query is in the search now; otherwise (the vet searched
  // by hand) the first open item whose query or fallback is part of the position title — what its search would find
  // Shared rule for A and B: only a row added right after clicking a line closes that line (and is then checked
  // against what was heard). A row added without clicking a line closes nothing — it stays an unlinked bill row
  // that a line can claim with «Внесено под другим названием».
  function tagAdded(scope, c, qty, row, parent) {
    const u = activeTag && activeTag.scope === scope ? byId(activeTag.id) : null;
    if (!u || !isPending(u)) return;
    Object.assign(u, { status: 'done', addTitle: c.title, addQty: qty, addUnit: c.unit, parent: parent ? parent.title : null,
      rowId: (parent || row).id, nestedTitle: parent ? c.title : null, linked: false, lastEmpty: false });
    activeTag = null;
  }

  // ---- Vet.AF goods rows (prototype model of the real behaviour, test visit 2026-11-11)
  const rowPrice = r => r.container ? r.price + r.nested.filter(n => !n.template).reduce((s, n) => s + n.price * n.qty, 0) : r.price;
  const OWNER_DISCOUNT = 5;      // the owner's discount on services, filled by Vet.AF (test visit: 5 %)
  const rowSum = r => Math.round(rowPrice(r) * r.qty * (1 - r.sale / 100) * 100) / 100;
  function addRow(c, qty, sale) {
    const r = { id: rowSeq++, title: c.title, type: c.type, price: c.price, unit: c.unit, qty, sale: sale || 0, container: !!c.container, opened: false,
      nested: (c.template || []).map(([title, price, unit, n]) => ({ title, price, unit, qty: n, template: true })) };
    rows.unshift(r);          // a new row goes to the top of the table, as in Vet.AF
    return r;
  }
  function renderRows() {
    if (!ROW_TPL || !ROW_PARENT) return;
    qa(':scope > [data-item]', ROW_PARENT).forEach(e => e.remove());
    rows.forEach(r => {
      const tmp = document.createElement('div'); tmp.innerHTML = ROW_TPL; const el = tmp.firstElementChild;
      el.dataset.id = 'r' + r.id; el.dataset.row = r.id; el.classList.toggle('opened', r.opened);
      const hs = qa(':scope > header > span', el);
      const nm = q('span[title]', hs[0]); if (nm) { nm.textContent = r.title; nm.title = r.title; }
      hs[1].innerHTML = '<span>' + r.type + (r.nested.length ? ' <span class="total">' + r.nested.length + '</span>' : '') + '</span>';
      q('[data-type="quantity"]', el).textContent = fmtNum(r.qty) + ' ' + r.unit;
      q('[data-type="price"]', el).textContent = money(rowPrice(r));
      q('[data-type="sale"]', el).textContent = fmtNum(r.sale) + ' %';
      hs[5].textContent = money(rowSum(r));
      q(':scope > header [title="Удалить"]', el)?.setAttribute('data-del', r.id);
      const det = q(':scope > section', el);
      if (r.type === 'товар') { det.remove(); q('svg.arrow', el)?.remove(); }
      else {
        const list = q('.list', det), sec = q(':scope > section', list), last = q('[data-id="last"]', sec);
        qa(':scope > [data-id]:not([data-id="last"])', sec).forEach(e => e.remove());
        r.nested.forEach((n, i) => {
          const t2 = document.createElement('div'); t2.innerHTML = NESTED_TPL; const ne = t2.firstElementChild;
          ne.dataset.id = 'n' + r.id + '-' + i;
          const sp = qa(':scope > span', ne);
          sp[0].textContent = n.title;
          q('[data-type="quantity"]', sp[1]).textContent = fmtNum(n.qty) + ' ' + n.unit;
          sp[2].textContent = money(n.price); sp[3].textContent = money(n.price * n.qty);
          q('[title="Удалить"]', ne)?.setAttribute('data-del-nested', r.id + ':' + i);
          sec.insertBefore(ne, last);
        });
        q('.total-in-service', sec).textContent = String(Math.round(r.nested.reduce((s, n) => s + n.price * n.qty, 0) * 100) / 100).replace('.', ',');
        list.style.display = r.nested.length ? '' : 'none';
        q('.sale-item-details button', det)?.setAttribute('data-add-good', r.id);
      }
      ROW_PARENT.appendChild(el);
    });
    total = rows.reduce((s, r) => s + rowSum(r), 0);
    updateTotals();
  }

  // the Vet.AF modal «Добавить товар в услугу» (imitation of the dialog seen on vetaf.ru): goods-only search,
  // «Количество» (3 characters), «Добавить»; stays open after «Добавить» for the next drug
  function buildGoodDialog() {
    const d = document.createElement('dialog');
    d.id = 'proto-good-dialog';
    d.innerHTML = '<section><header><div>Добавить товар в услугу</div><svg data-action="dialog-close" aria-hidden="true"><use href="' + BASE + 'vetaf/i/frontend/svg/icons.svg#close"></use></svg></header>' +
      '<section><form action="#" class="sx-gform">' +
        '<div class="sx-gsvc"></div>' +
        '<label><span>Товар</span><span class="sx-mwrap"><input type="text" class="sx-mq" form="sx-detached" placeholder="Введите название товара" autocomplete="off"><ul class="ui-menu ui-widget ui-widget-content ui-autocomplete ui-front sx-mres" style="display:none"></ul></span></label>' +
        '<label><span>Количество <span class="help tooltip" title="Если текущая услуга имеет количество больше одного, то данное количество товара будет добавлено в каждую услугу."><svg><use href="' + BASE + 'vetaf/i/frontend/employee/svg/icons.svg#help"></use></svg></span></span>' +
          '<input type="text" class="sx-mqty" form="sx-detached" autocomplete="off"><span class="sx-mqty-err" role="alert"></span></label>' +
        '<button type="button" class="button green sx-madd">Добавить</button>' +
      '</form></section></section>';
    document.body.appendChild(d);
    return d;
  }
  function openGoodDialog(row) {
    const d = q('#proto-good-dialog') || buildGoodDialog();
    modalRow = row; pickedModal = null;
    if (activeTag && activeTag.scope === 'modal') activeTag = null;
    q('.sx-gsvc', d).textContent = 'Услуга: ' + row.title;
    q('.sx-mq', d).value = ''; q('.sx-mqty', d).value = ''; q('.sx-mqty-err', d).textContent = ''; q('.sx-mres', d).style.display = 'none';
    d.showModal();
    renderTags();
  }

  // ================================================================ 6. summary in the card: what remains, next suggestion, removed (L)
  // counts with their nouns, one format in the bar and in the summary
  const nDiags = n => n + ' ' + plural(n, 'диагноз', 'диагноза', 'диагнозов');
  const nFields = n => n + ' ' + plural(n, 'поле', 'поля', 'полей');
  const nDoses = n => n + ' ' + plural(n, 'доза', 'дозы', 'доз');
  const goodsPart = n => nNotBilled(n);
  function remainParts(r, withGoods) {
    const parts = [];
    if (withGoods && r.goods) parts.push(goodsPart(r.goods));
    if (r.doses) parts.push(nDoses(r.doses));
    if (r.diags) parts.push(nDiags(r.diags));
    if (r.fields) parts.push(nFields(r.fields));
    return parts;
  }
  function detail(tab) {
    const r = remain(tab);
    if (tab === 'items') return r.goods ? goodsPart(r.goods) : '';
    return remainParts(r, false).join(' · ');
  }
  // the map row: doses first, plain text like the rest (round 4, Yuri: no special highlight)
  const detailHtml = tab => esc(detail(tab));
  // empty-bill guard (round 2, vet lens 2): goods were heard, nothing from them is in the bill and the vet removed them
  // all — «всё рассмотрено» must not look like success until he adds one of them or says «Верно»
  let billOk = false;
  function billGuard() {
    const g = goods().filter(u => !u.home);
    return !billOk && g.length > 0 && !g.some(u => u.status === 'done') && !g.some(isPending);
  }
  const lc = t => t.charAt(0).toLowerCase() + t.slice(1);

  // ---- the remainder map in the card (spec §3.8): what A had in the top bar and in the right panel
  // round 8 (Yuri, «вариант 1 — карта вкладок с прогрессом»), texts of round 11: «Из записи — 18 предложений» (the total,
  // static), a thin progress bar, «Вы проверили:» and one row per Vet.AF tab that has suggestions («3 из 9»; a finished
  // tab — grey «✓ 8 из 8»), the current tab marked with a bar,
  // one hint. A row opens its tab at the first open block.
  const HINT = 'Проверьте дозы и названия препаратов перед сохранением';
  function renderCard() {
    if (!draftReady || !card) return;
    const T = tally(), left = T.left;
    const isSaved = saved && !dirty;
    const goodsEmpty = billGuard();
    const guardAll = !left && goodsEmpty;
    // everything checked and saved → the card folds into one line «✓ Из записи: всё проверено» (can be opened again)
    const next = !left && isSaved && !guardAll ? 'saved' : 'ready';
    if (next !== state) { if (next === 'saved') card.classList.remove('opened'); else card.classList.add('opened'); }
    card.classList.toggle('is-guard', guardAll);
    setView(next);
    // round 11 (Yuri): the line under the header is the total — «Из записи — 18 предложений»; saved: «Приём сохранён» (the rows
    // keep the progress); empty bill: «Товары из записи не добавлены» — no «всё проверено» until «Оставить так» or an item
    q('.ai-left', card).textContent = guardAll ? 'Товары из записи не добавлены' : !left ? 'Всё проверено. Сохраните приём'
      : isSaved ? 'Приём сохранён'
      : 'Из записи — ' + T.total + ' ' + plural(T.total, 'предложение', 'предложения', 'предложений');
    q('.ai-left', card).classList.toggle('is-count', !!left && !isSaved);
    const note = !left ? ''
      : isSaved ? 'Остальное проверьте позже — предложения останутся в приёме'
      : U.some(u => u.status === 'done' && isField(u)) ? 'Принятое уже в полях — сохраните приём' : '';
    let h = '<div class="ai-progress ai-done-bar" role="progressbar" aria-label="Проверено предложений" aria-valuemin="0" aria-valuemax="' + T.total + '" aria-valuenow="' + T.done + '">' +
      '<i style="width:' + (T.total ? Math.round(T.done / T.total * 1000) / 10 : 100) + '%"></i></div>';
    if (note) h += '<p class="ai-note">' + note + '</p>';
    // the goods row came out empty: nothing from the recording was added to the visit
    if (goodsEmpty) h += '<p class="ai-guard"><button type="button" class="sx-link" data-a="goto" data-tab="items">Проверить</button> · ' +   // round 12: the text is the header line now
      '<button type="button" class="sx-link" data-a="bill-ok">Оставить так</button></p>';
    const cur = currentTab();
    h += '<p class="ai-map-cap">Вы проверили:</p><div class="ai-map">' + TABS.filter(([id]) => tally(id).total).map(([id, title]) => {
      const t = tally(id), warn = id === 'items' && goodsEmpty;   // round 12: an empty bill is not «✓»
      return '<button type="button" class="ai-tabrow' + (id === cur ? ' is-current' : '') + (warn ? ' is-warn' : t.left ? '' : ' is-clear') + '" data-a="goto-tab" data-tab="' + id + '">' +
        '<span class="ai-tt">' + title + '</span><span class="ai-tn">' + (t.left || warn ? '' : '✓ ') + t.done + ' из ' + t.total + '</span></button>';
    }).join('') + '</div>';
    if (left && !isSaved) h += '<p class="ai-muted ai-hint">' + HINT + '</p>';   // round 12: not after saving
    q(':scope > .result', card).innerHTML = h;
    updateTitle();
    renderPin();
  }

  // round 9 (Yuri): a tab row (and the link in the pinned bar) opens the tab at the FIRST field — the top-most on screen —
  // that still has an open suggestion, every time; no cycling. The field label stays visible under the sticky Vet.AF
  // header. Nothing is accepted.
  const firstTab = () => (TABS.find(([id]) => tally(id).left) || [])[0];
  function gotoFirst(tab) {
    if (!tab) return;
    showTab(tab);
    renderAll();
    const open = U.filter(u => u.tab === tab && isPending(u) && !(u.kind === 'good' && u.home))
      .map(u => [u, q('.sx-host [data-u="' + u.id + '"]')]).filter(([, el]) => el && el.getClientRects().length);
    if (!open.length) return;
    open.sort(([, a], [, b]) => { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return ra.top - rb.top || ra.left - rb.left; });
    const u = open[0][0];
    // the label of the field: Vet.AF label, the symptoms · weight · temperature row, the diagnoses table, the goods block
    const anchor = (u.group && q('#visit-form .triple-row')) || (u.field && fieldLabel(u.field)) || (u.kind === 'diag' && q('#list-diagnoses'))
      || (u.kind === 'good' && q('.sx-host[data-host="goods"]')) || open[0][1];
    const top = anchor.getBoundingClientRect().top + scrollY - q('header.header-sticky').getBoundingClientRect().bottom - 16;
    scrollTo({ top: Math.max(0, top), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    // a tab switch resizes the Vet.AF row and A's ResizeObserver re-renders the blocks — focus after that, on the new node
    setTimeout(() => {
      const b = q('.sx-host [data-u="' + u.id + '"]'); if (!b) return;
      (q('[data-a="accept"], [data-a="diag"], [data-a="gtag"]', b) || b).focus({ preventScroll: true });
      flash(b.closest('.sx-block, .sx-diag, .sx-tg') || b);
    }, 160);
  }

  // the browser tab title (spec §4, designer 2026-11-18): status first, the pet's name, no word «Запись»
  let baseTitle = '';
  const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  function updateTitle() {
    const tm = fmt(secs);
    const T = {
      recording: '● ' + tm + ' ' + PET,
      paused: '❚❚ ' + tm + ' ' + PET, confirm: '❚❚ ' + tm + ' ' + PET,
      interrupted: '⚠ прервано · ' + PET, mic: '⚠ микрофон · ' + PET, unsent: '⚠ не отправлено · ' + PET, nodraft: '⚠ сбой · ' + PET,
      sending: '… ' + PET, drafting: '… ' + PET
    };
    let t = T[state];
    if (state === 'ready') { const n = leftAll(); t = n ? PET + ' · ' + n : billGuard() ? '⚠ нет позиций · ' + PET : '✓ ' + PET; }   // round 10: «Барсик · 13», «✓ Барсик»
    document.title = t || baseTitle;
  }

  function renderAll() {
    renderInline(); renderCard();
    U.forEach(u => { u.fresh = false; if (u.field) fieldLabel(u.field)?.classList.toggle('sx-has', draftReady && u.status === 'new'); });
  }

  // go to the first open suggestion of a tab and show it
  function gotoTab(tab) {
    showTab(tab);
    const u = U.find(x => x.tab === tab && isPending(x));
    renderAll();
    const el = u && (q('.sx-host [data-u="' + u.id + '"]') || (u.kind === 'good' && hosts.goods));
    if (!el) return;
    // start from the field label above the suggestion, below the sticky Vet.AF header
    const anchor = (u.group && q('#visit-form .triple-row')) || (u.field && fieldLabel(u.field)) || (u.kind === 'diag' && q('#list-diagnoses')) || el;
    requestAnimationFrame(() => {
      const top = anchor.getBoundingClientRect().top + scrollY - q('header.header-sticky').getBoundingClientRect().bottom - 24;
      scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      flash(el);
    });
  }

  // ================================================================ 7. flow
  // ---- card states. One state at a time, Peter's names + «remind». The card cannot be folded while a recording is
  // at stake (designer 2026-11-18): recording, pause, delete confirmation, interrupted, no microphone, unsent.
  const LOCKED = ['recording', 'paused', 'confirm', 'interrupted', 'mic', 'unsent'];
  // the header stays at the top of the column (round 2: also reminder, interrupted, unsent, no microphone)
  const PINNED = ['recording', 'paused', 'confirm', 'ready', 'remind', 'interrupted', 'unsent', 'mic', 'nodraft'];   // + sending while it can be taken back
  let state = 'idle', secs = 0, tickT = null, levelT = null, stopT = null, lockStop = false;
  let recStarted = false, declined = false, remindDone = false;   // reminder «запись не включена»: once per visit
  // «once per visit» survives a reload: sessionStorage keyed by the visit id (a server flag in the product)
  const RKEY = () => 'scribe-remind-' + (q('#visit-form [name="id"]')?.value || 'visit');
  const remindStored = () => { try { return sessionStorage.getItem(RKEY()); } catch (e) { return null; } };
  const storeRemind = v => { try { if (v) sessionStorage.setItem(RKEY(), v); else sessionStorage.removeItem(RKEY()); } catch (e) { /* private mode: once per page */ } };
  const timers = [];
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clearLater = () => { timers.forEach(clearTimeout); timers.length = 0; };
  const showTime = () => qa('.ai-protocol-block .time, .ai-protocol-pin .time').forEach(e => e.textContent = fmt(secs));

  // what is visible: elements whose data-show lists the state get .visible (Peter's SDK convention);
  // in «ready» the badge also depends on the remainder (microphone while something is left, tick when nothing is)
  function setView(s) {
    state = s;
    card.dataset.state = s;
    const tokens = [s];
    if (s === 'ready' || s === 'saved') tokens.push(draftReady && leftAll() ? 'ready-left' : card.classList.contains('is-guard') ? 'ready-guard' : 'ready-clear');
    qa('[data-show]', card).forEach(e => e.classList.toggle('visible', e.dataset.show.split(' ').some(t => tokens.includes(t))));
    const locked = LOCKED.includes(s);
    card.classList.toggle('is-locked', locked);
    if (locked) card.classList.add('opened');
  }

  function setState(s) {
    clearInterval(tickT); tickT = null;
    clearInterval(levelT); levelT = null;
    setView(s);
    if (s === 'recording') tickT = setInterval(() => { secs++; showTime(); updateTitle(); }, 1000);
    // «Завершить» does not work for the first 2 s after the FIRST start of the recording (round 7, Yuri: not after
    // «Продолжить» from the pause or after an interruption) — a second click on «Начать запись» cannot end the visit
    const stopB = q('[data-bar="stop"]', card);
    clearTimeout(stopT);
    stopB.disabled = s === 'recording' && lockStop;
    if (s === 'recording' && lockStop) { lockStop = false; stopT = setTimeout(() => { stopB.disabled = false; }, 2000); }
    // round 4 (Yuri): Peter's pulsing badge is back in recording (CSS), the equalizer is gone. [решение дизайнера] A calm
    // ring around the badge follows the real microphone level (0–5 px, smoothed), so the badge still answers «слышит ли».
    // No stream (demo) or «Уменьшить движение» → no ring.
    const badge = q('.badge', card);
    badge.style.outlineWidth = '0px';
    let ring = 0;
    if (s === 'recording' && !matchMedia('(prefers-reduced-motion: reduce)').matches) levelT = setInterval(() => {
      const v = micLevel();
      ring = ring * .7 + (v == null ? 0 : Math.min(1, v)) * .3;
      badge.style.outlineWidth = (ring * 5).toFixed(1) + 'px';
    }, 140);
    showTime(); renderResult(); updateTitle(); renderPin();
  }

  // .result outside «ready». Sending: the recorded time and the progress (round 7: no 8 s undo any more);
  // drafting: what was received, who fills the visit, what to add by hand.
  function renderResult() {
    const res = q(':scope > .result', card);
    if (state === 'sending') {
      res.innerHTML = '<div class="ai-res-top"><p class="ai-muted">Записано ' + fmt(secs) + '</p>' +
        '<div class="ai-progress" role="progressbar" aria-label="Отправка записи"><i></i></div></div>';
      requestAnimationFrame(() => requestAnimationFrame(() => q('.ai-progress i', res)?.classList.add('is-going')));
    } else if (state === 'drafting') {
      res.innerHTML = '<p class="ai-muted">Записано ' + fmt(secs) + '</p><p class="ai-safe">Приём заполните вы — мы только предлагаем</p>' +
        '<p class="ai-muted">Процедуры без слов, отказы и направления добавьте сами</p>';   // round 6, copy r3
    } else if (state !== 'ready' && state !== 'saved') res.innerHTML = '';
  }

  // the main action travels with the pinned bar (rounds 2–3, coordinator): recording «Пауза», pause «Продолжить»,
  // reminder «Начать», interrupted «Продолжить», unsent «Отправить», no microphone — its own button, no suggestions
  // «Повторить», the 8 s after «Завершить» — «Вернуться к записи». The rest of the bar scrolls the column back to the card.
  const PIN_ACT = {
    recording: ['pause', '', LI + 'player-pause', 'Пауза', 'Пауза'],
    paused: ['resume', 'green', LI + 'player-play', 'Продолжить', 'Продолжить запись'],
    remind: ['start', 'green', LI + 'player-record', 'Начать', 'Начать запись'],
    interrupted: ['restart', 'green', LI + 'player-play', 'Продолжить', 'Продолжить запись'],
    unsent: ['send-unsent', 'green', LI + 'player-send', 'Отправить', 'Отправить запись'],
    nodraft: ['retry', '', VA + 'refresh', 'Повторить', 'Повторить подготовку'],
    ready: ['next', 'ai-pin-link', '', 'К непроверенному →', 'К первому непроверенному на этой вкладке']   // round 9: no «следующее»
  };
  const pinAct = k => k !== 'mic' ? PIN_ACT[k] : (b => ['start', 'green', card.dataset.mic === 'prompt' ? LI + 'mic' : VA + 'refresh', b, b])(MIC[card.dataset.mic || 'prompt'][2]);
  // the bar is as wide as the card but also holds a button: shorter titles than the card's header (no sound level)
  const PIN_HEAD = Object.assign({}, HEAD, {
    recording: '<span>Идёт запись</span>' + TIME,
    paused: '<span>На паузе</span>' + TIME,
    checking: 'Проверка микрофона'
  });
  const headKey = () => state;
  function renderPin() {
    if (!pin || !card) return;
    const aside = card.parentElement;
    // round 4: as soon as the header's top is cut by the column edge (not only when it is gone completely)
    const out = q(':scope > header', card).getBoundingClientRect().top < aside.getBoundingClientRect().top - 1;
    const on = PINNED.includes(state) && out;
    pin.hidden = !on;
    if (!on) { pin.dataset.state = ''; pin.dataset.key = ''; return; }
    const T = tally(), n = state === 'ready' ? T.left : 0;
    const hk = headKey();
    if (hk === 'ready' && !n) { pin.hidden = true; pin.dataset.key = ''; return; }   // nothing left: no link
    const key = hk + '|' + T.done + '|' + (card.dataset.mic || '');
    if (pin.dataset.key !== key) {
      pin.dataset.key = key; pin.dataset.state = state;
      const a = pinAct(hk);
      pin.classList.remove('is-wrap');
      pin.innerHTML = '<button type="button" class="ai-pin-t" data-pin="top" title="Показать карточку записи"><span class="ai-pin-tt">' + (hk === 'ready' ? 'Вы проверили ' + T.done + ' из ' + T.total : PIN_HEAD[hk]) + '</span></button>' +
        (a ? '<button type="button" class="button' + (a[2] ? ' with-icon' : '') + ' ai-pin-act' + (a[1] ? ' ' + a[1] : '') + '" data-bar="' + a[0] + '" aria-label="' + a[4] + '" title="' + a[4] + '">' + (a[2] ? svgUse(a[2]) : '') + '<span>' + a[3] + '</span></button>' : '') +
        '<button type="button" class="ai-pin-up" data-pin="top" title="Показать карточку записи" aria-label="Показать карточку записи">' + svgUse(VA + 'arrow', 'arrow') + '</button>';
      const mt = q('.ai-mic-title', pin); if (mt) mt.textContent = q('.ai-mic-title', card).textContent;
      showTime();
      // title and button do not fit in one line → the button takes a second line of the bar, full width
      const tt = q('.ai-pin-tt', pin);
      if (tt.scrollWidth > tt.clientWidth + 1) pin.classList.add('is-wrap');
    }
    // round 12 (final lens #5, seen at 1728): no thin strip of the card under the bar. The bar is at least as tall as the
    // card's header zone, and when only a sliver of the card (< 2.5rem) would remain visible under it, the bar grows
    // down to the card's bottom and hides that sliver
    pin.style.minHeight = '';
    const at = aside.getBoundingClientRect().top, cr = card.getBoundingClientRect(), natural = pin.getBoundingClientRect().height;   // fractional: no 1 px rounding gaps
    const sliver = cr.bottom - at - natural, rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const cover = Math.ceil(Math.max(q(':scope > header', card).getBoundingClientRect().bottom - cr.top, sliver > 0 && sliver < 2.5 * rem ? cr.bottom - at : 0));
    if (cover > natural) pin.style.minHeight = cover + 'px';
    // a real height on screen, no room taken in the column (the card does not move when the bar appears)
    pin.style.marginBottom = -(pin.getBoundingClientRect().height + (parseFloat(getComputedStyle(aside).rowGap) || 0)) + 'px';   // the card does not move by a fraction of a px
  }

  // ---- microphone (A, 2026-11-12): the prototype opens a real stream to test the permission flow; nothing is recorded
  let stream = null, actx = null, analyser = null, buf = null, permWatch = null;
  function micLevel() {
    if (!analyser) return null;
    analyser.getByteTimeDomainData(buf);
    let sum = 0; for (let k = 0; k < buf.length; k++) { const x = (buf[k] - 128) / 128; sum += x * x; }
    return Math.min(1, Math.sqrt(sum / buf.length) * 6);
  }
  function stopMic() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (actx) actx.close();
    stream = actx = analyser = buf = null;
  }
  // texts of A, headers ≤ 24 characters (round 2, copy lens); the browser either was not asked to remember (prompt closed), or remembers «Block»
  const MIC = {
    prompt: ['Нет доступа к микрофону', 'Разрешите микрофон — без него запись не идёт', 'Разрешить микрофон'],
    blocked: ['Микрофон заблокирован', 'Нажмите значок слева от адреса → «Микрофон» → «Разрешить». Запись начнётся сама', 'Проверить снова'],
    missing: ['Микрофон не найден', 'Подключите микрофон и нажмите «Проверить снова»', 'Проверить снова'],
    busy: ['Микрофон занят', 'Закройте другую программу с микрофоном и нажмите «Проверить снова»', 'Проверить снова']
  };
  function showMic(kind) {
    const [t, sub, b] = MIC[kind];
    qa('.ai-mic-title').forEach(e => e.textContent = t);
    q('.ai-mic-sub', card).textContent = sub;
    const mb = q('.ai-mic-btn', card);
    mb.innerHTML = svgUse(kind === 'prompt' ? LI + 'mic' : VA + 'refresh') + '<span>' + b + '</span>';
    mb.title = b; mb.setAttribute('aria-label', b);
    card.dataset.mic = kind;
    setState('mic');   // A flashed the text here; in a 244 px card the red state itself is the signal
  }
  async function permState() {
    try { const p = await navigator.permissions.query({ name: 'microphone' }); return p; } catch (e) { return null; }
  }
  async function startMic() {
    recStarted = true;
    setState('checking');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('no api'), { name: 'NotFoundError' });
      const st = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (state !== 'checking') { st.getTracks().forEach(t => t.stop()); return; }   // «Отменить» while the browser was asking
      stream = st;
      // the microphone is gone mid-visit (unplugged, taken over) → «Запись прервана» with the recorded time
      stream.getAudioTracks().forEach(t => t.addEventListener('ended', () => { if (state === 'recording' || state === 'paused') { stopMic(); setState('interrupted'); } }));
      actx = new AudioContext();
      analyser = actx.createAnalyser(); analyser.fftSize = 512; buf = new Uint8Array(analyser.fftSize);
      actx.createMediaStreamSource(stream).connect(analyser);
      later(900, () => { if (state === 'checking') setState('recording'); });
    } catch (err) {
      if (state !== 'checking') return;
      const n = err && err.name;
      if (n === 'NotFoundError' || n === 'OverconstrainedError') return showMic('missing');
      if (n === 'NotReadableError' || n === 'AbortError') return showMic('busy');
      const p = await permState();
      showMic(p && p.state === 'denied' ? 'blocked' : 'prompt');
      // the vet allows it in the site settings → recording goes on by itself
      if (p && !permWatch) { permWatch = p; p.onchange = () => { if (p.state === 'granted' && state === 'mic') startMic(); }; }
    }
  }

  // «Завершить» → 8 s with «Отменить» (back to the pause, time kept, the microphone still open), then the real sending
  // «Завершить» → straight to sending with the loader (round 7, Yuri: the 8 s undo is gone)
  function stop() { stopMic(); send(); }
  function send() { setState('sending'); later(2200, startDraft); }
  function startDraft() { setState('drafting'); later(4000, ready); }
  function ready() {
    draftReady = true;
    document.body.dataset.protoDraft = '1';
    document.body.classList.add('sx-ready');
    card.classList.add('opened');
    setState('ready');
    renderAll();
    flash(card);        // one highlight on arrival, then the card is calm (spec §1)
  }

  // reminder «запись не включена» (spec §7): today's open visit, nothing recorded or declined, the vet starts typing
  // in «Цель визита», «Анамнез» or «Осмотр» → the card turns yellow once; «Этот приём без записи» switches it off
  function remind() {
    remindDone = true; storeRemind('shown');
    card.classList.add('opened');
    setState('remind');
    const b = q('[data-bar="start"]', card);
    b.classList.remove('ai-pulse'); void b.offsetWidth; b.classList.add('ai-pulse');
  }

  // the reminder fires only where it can be seen (round 2, UX lens 2): this browser tab is in front and the column is on
  // screen — the card itself or, when the column is scrolled, its pinned bar; otherwise it waits for the next keystroke
  function canSeeCard() {
    const a = card.parentElement, r = a.getBoundingClientRect();
    return document.visibilityState === 'visible' && r.width > 0 && r.height > 0 && getComputedStyle(a).visibility !== 'hidden';
  }

  // one handler for the buttons of the card and of its pinned bar
  let actGuard = 0;
  function doBar(act) {
    if (Date.now() < actGuard) return;   // the second click of a double click must not press the next state's button
    actGuard = Date.now() + 600;
    if (act === 'start') { if (state === 'idle' || state === 'remind') { secs = 0; lockStop = true; } startMic(); }
    if (act === 'decline') { declined = true; storeRemind('declined'); setState('idle'); }
    if (act === 'cancel') { clearLater(); stopMic(); setState('idle'); }
    if (act === 'pause') setState('paused');
    if (act === 'resume') setState('recording');
    if (act === 'restart') startMic();
    if (act === 'delete-ask') setState('confirm');
    if (act === 'delete-no') setState('paused');
    if (act === 'delete-yes') { clearLater(); stopMic(); secs = 0; setState('idle'); }
    if (act === 'stop') stop();
    if (act === 'send-unsent') send();
    if (act === 'skip-unsent') setState('idle');
    if (act === 'retry') startDraft();
    if (act === 'next') { const c = currentTab(); gotoFirst(tally(c).left ? c : firstTab()); }   // pinned bar: this tab, else the first with something open
  }

  function init() {
    seed();
    if (remindStored()) remindDone = true;
    baseTitle = document.title;
    const aside = q('aside.left-section');
    card = buildCard(); pin = buildPin();
    // round 4 (Yuri): back under the visit header «К приёмам» — the second card of the column; the pinned bar stays
    q(':scope > section.visit-block', aside).after(card);
    aside.insertBefore(pin, card);
    setState('idle');
    aside.addEventListener('scroll', renderPin, { passive: true });
    addEventListener('resize', renderPin);
    pin.addEventListener('click', e => {
      const b = e.target.closest('[data-bar], [data-pin]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      if (b.dataset.bar) doBar(b.dataset.bar);
      else aside.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }, true);

    // fold / unfold by the header, as the other cards of the column — not while a recording is at stake
    q(':scope > header', card).addEventListener('click', () => {
      if (card.classList.contains('is-locked')) return;
      card.classList.toggle('opened');
      renderPin();
    });

    card.addEventListener('click', e => {
      const b = e.target.closest('[data-bar]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      doBar(b.dataset.bar);
    }, true);

    q('#visit-form').addEventListener('input', e => {
      if (draftReady || completed || recStarted || declined || remindDone || remindStored() || state !== 'idle') return;
      const lab = e.target.closest('label');
      if (!(e.target.matches('[name="title"]') || (lab && (lab === fieldLabel('anamnesis') || lab === fieldLabel('examination'))))) return;
      if (canSeeCard()) remind();
    });

    // suggestion layer and summary: one delegated handler
    document.addEventListener('click', e => {
      const a = e.target.closest('.sx-host [data-a], .ai-protocol-block .result [data-a], .sx-alt [data-a], .sx-gplate [data-a]');
      if (!a || !draftReady) return;
      if (a.matches('input')) return;   // radios and checkboxes: handled on change
      e.preventDefault(); e.stopPropagation();
      if (a.disabled) return;
      const act = a.dataset.a;
      const item = a.closest('[data-u]');
      const u = byId(a.dataset.u || item?.dataset.u);
      const li = a.closest('[data-l]');
      const l = u && li && u.lines ? u.lines[+li.dataset.l] : null;
      // the decided block folds away instead of vanishing (Yuri 2026-11-12: «чтобы анимации не так скакали»)
      const blk = (act === 'accept' || act === 'reject' || act === 'keep') && u && u.kind !== 'good' ? a.closest('.sx-block, .sx-diag') : null;
      if (blk && !blk.dataset.closing && !matchMedia('(prefers-reduced-motion: reduce)').matches) { blk.dataset.closing = '1'; collapse(blk, () => a.click()); return; }
      if ((act === 'undo' || act === 'restore') && u && Date.now() - (u.decidedAt || 0) < 600) return;   // second click of a double click
      if (act === 'accept' || act === 'reject' || act === 'keep' || act === 'reapply' || act === 'undo') guardUntil = Date.now() + 600;
      if (u && (act === 'accept' || act === 'reject' || act === 'keep' || act === 'reapply')) u.decidedAt = Date.now();
      if (u && (act === 'accept' || act === 'reject' || act === 'keep' || act === 'undo' || act === 'restore' || act === 'reapply')) u.fresh = true;

      if (act === 'accept' && u) accept(u, a.dataset.mode);
      if (act === 'reject' && u) { u.status = 'rejected'; u.auto = false; if (activeTag && activeTag.id === u.id) activeTag = null; }
      if (act === 'keep' && u) { u.status = 'rejected'; u.kept = fmtNum(formInput(u.field).value.trim()); }
      if (act === 'restore' && u) { if (u.auto && u.lines) u.lines.forEach(x => { x.excluded = false; }); u.status = 'new'; u.kept = null; u.auto = false; }
      if (act === 'undo' && u && !edited(u)) { if (u.reapplied) unreapply(u); else undo(u); }
      if (act === 'reapply' && u && u.status === 'done') reapply(u);
      if (act === 'quotes' && u) u.showQuotes = !u.showQuotes;
      if (act === 'drop' && l) {
        l.excluded = true;
        if (!liveLines(u).length) { u.status = 'rejected'; u.auto = true; }
      }
      if (act === 'line-restore' && u) {
        u.lines[+a.dataset.l].excluded = false;
        if (u.status === 'rejected' && u.auto) { u.status = 'new'; u.auto = false; }
      }
      if (act === 'diag' && u) { openDiag(u); return; }
      if (act === 'gtag' && u && isPending(u)) { choosingFor = null; runTag(u, u.qs[0]); }
      if (act === 'gq' && u) runTag(u, a.dataset.q);
      if (act === 'gother' && u) choosingFor = u.id;
      if (act === 'glink-cancel') choosingFor = null;
      if (act === 'glink' && u) {
        const f = unlinkedRows()[+a.dataset.i];
        const it = f.n || f.rw;
        Object.assign(u, { status: 'done', linked: true, addTitle: it.title, addQty: it.qty, addUnit: it.unit,
          parent: f.n ? f.rw.title : null, rowId: f.rw.id, nestedTitle: f.n ? f.n.title : null });
        choosingFor = null; if (activeTag && activeTag.id === u.id) activeTag = null;
      }
      if (act === 'gunlink' && u) { Object.assign(u, { status: 'new', linked: false, rowId: null, nestedTitle: null }); }
      if (act === 'goto') { gotoTab(a.dataset.tab); return; }
      if (act === 'goto-tab') { gotoFirst(a.dataset.tab); return; }
      if (act === 'lines-restore' && u) { u.lines.forEach(x => { x.excluded = false; }); }
      if (act === 'bill-ok') billOk = true;
      renderAll();
      // keyboard: after a decision the focus stays at the same place — on «Отменить» / «Вернуть» of that suggestion,
      // so the next Tab goes on to the next suggestion instead of jumping to the top of the page
      if (u && (act === 'accept' || act === 'reject' || act === 'keep' || act === 'reapply' || (act === 'undo' && u.status === 'done'))) q('.sx-host .sx-receipt[data-u="' + u.id + '"] .sx-link')?.focus({ preventScroll: true });
      if (u && (act === 'undo' || act === 'restore')) q('.sx-host [data-u="' + u.id + '"] [data-a="accept"], .sx-host [data-u="' + u.id + '"] [data-a="diag"]')?.focus({ preventScroll: true });
    }, true);

    // Vet.AF searches: typing filters the price list (main row: all; modal: goods only)
    document.addEventListener('input', e => {
      if (e.target === mainInput()) { pickedMain = null; showResults(mainList(), e.target.value, false); }
      if (e.target.matches('#proto-good-dialog .sx-mq')) { pickedModal = null; showResults(q('#proto-good-dialog .sx-mres'), e.target.value, true); }
      if (e.target.matches('#quantity, #proto-good-dialog .sx-mqty')) { e.target.classList.remove('input-error'); const er = q('#proto-good-dialog .sx-mqty-err'); if (er) er.textContent = ''; }
    }, true);

    // paired highlight (Yuri 2026-11-12, lab variant 1): hover or focus on a suggestion or on its Vet.AF field
    // lights up both, so the eye finds the pair without reading labels
    // the zone of the current pair: caption + field + its suggestion, the gap between them included (Yuri 2026-11-12:
    // leaving the field towards its suggestion must not switch the highlight off and on)
    let pairU = null;
    function inPairZone(e) {
      if (!pairU || e.clientX == null) return false;
      const rs = [fieldLabel(pairU.field), ...qa('.sx-host [data-u="' + pairU.id + '"]').map(x => x.closest('.sx-block') || x)]
        .filter(Boolean).map(x => x.getBoundingClientRect()).filter(r => r.width);
      if (!rs.length) return false;
      const l = Math.min(...rs.map(r => r.left)), r = Math.max(...rs.map(r => r.right));
      const t = Math.min(...rs.map(r => r.top)), b = Math.max(...rs.map(r => r.bottom));
      return e.clientX >= l && e.clientX <= r && e.clientY >= t && e.clientY <= b;
    }
    function pair(e) {
      if (!draftReady) return;
      let u = null;
      const it = e.target.closest('.sx-host [data-u]');
      if (it) u = byId(it.dataset.u);
      else { const lab = e.target.closest('#visit-form label'); if (lab) u = U.find(x => x.field && x.status === 'new' && fieldLabel(x.field) === lab); }
      if (!u && inPairZone(e)) return;
      if (u && u === pairU && qa('.sx-pair').length) return;
      qa('.scribe-target').forEach(x => x.classList.remove('scribe-target'));
      qa('.sx-pair').forEach(x => x.classList.remove('sx-pair'));
      pairU = null;
      if (!u || !u.field || u.status !== 'new') return;
      pairU = u;
      fieldLabel(u.field)?.classList.add('scribe-target');
      qa('.sx-host [data-u="' + u.id + '"]').forEach(x => x.closest('.sx-block')?.classList.add('sx-pair'));
    }
    // after a decision the layout changes; for 0,6 s the second click of a double click is swallowed anywhere in the form,
    // so it cannot select or overwrite a word in a field that has just grown under the cursor
    ['mousedown', 'click', 'dblclick'].forEach(t => document.addEventListener(t, e => {
      if (e.detail >= 2 && Date.now() < guardUntil && e.target.closest('#visit-form')) { e.preventDefault(); e.stopPropagation(); }
    }, true));
    document.addEventListener('mouseover', pair);
    document.addEventListener('focusin', pair);
    addEventListener('resize', () => { if (draftReady) renderInline(); });
    // the number cards follow their inputs whenever the Vet.AF row itself changes size (window, side panel, fonts)
    if (window.ResizeObserver) new ResizeObserver(() => { if (draftReady) renderInline(); }).observe(q('#visit-form .triple-row'));

    // the map in the card follows the Vet.AF tab the vet opens
    q('header.header-sticky nav').addEventListener('click', () => { setTimeout(renderCard, 0); });

    // Vet.AF diagnosis dialog: custom select + save; our quote popover closes with it
    const dlg = q('#proto-diag-dialog');
    q('.custom-select .select', dlg)?.removeAttribute('style');
    dlg.addEventListener('close', () => { closePop(); diagFor = null; });
    dlg.addEventListener('click', e => {
      const opt = e.target.closest('.custom-select [data-view="list"] > span[data-id]');
      const cs = q('.custom-select', dlg);
      if (opt) {
        e.preventDefault(); e.stopPropagation();
        q('input[type="hidden"][name="kind"]', cs).value = opt.dataset.id;
        qa('[data-view="list"] > span[data-id]', cs).forEach(o => o.classList.toggle('selected', o === opt));
        q('input[readonly]', cs).value = opt.textContent.trim();
        cs.classList.remove('bottom');
        q('.scribe-diag-need', dlg)?.remove();
        return;
      }
      if (e.target.closest('.custom-select .data')) { e.preventDefault(); cs.classList.toggle('bottom'); return; }
      const sv = e.target.closest('button');
      if (sv && /Сохранить/.test(sv.textContent)) { e.preventDefault(); e.stopPropagation(); saveDiag(); }
    }, true);

    // the vet edits a field: receipts lose «Отменить»; ignore our own inputs
    let rt = null;
    q('#visit-form').addEventListener('input', e => {
      if (!draftReady || e.target.closest('.sx-host')) return;
      dirty = true; clearTimeout(rt); rt = setTimeout(renderAll, 400);
    });

    // Vet.AF goods tab (rows are written at once, without «Сохранить» — vetaf.ru): pick in the dropdown, «Добавить» (quantity is the vet's), expand a service row,
    // «+ Добавить товар» → modal, delete a row (a tag that added it becomes open again)
    document.addEventListener('click', e => {
      if (!draftReady) return;
      const o = e.target.closest('#list-items-in-sale .ui-holder [data-opt], #proto-good-dialog .sx-mres [data-opt]');
      if (o) {
        e.preventDefault(); e.stopPropagation();
        const c = CATALOG[+o.dataset.opt];
        if (o.closest('#proto-good-dialog')) { pickedModal = c; q('#proto-good-dialog .sx-mq').value = c.title; q('#proto-good-dialog .sx-mres').style.display = 'none'; q('#proto-good-dialog .sx-mqty').focus(); }
        else {
          // Vet.AF itself (not our service) fills «Количество» = 1 and the owner's discount for a service (test visit 2026-11-11)
          pickedMain = c; mainInput().value = c.title; mainList().style.display = 'none';
          q('#quantity').value = c.type === 'услуга' ? '1' : ''; q('#discount').value = c.type === 'услуга' ? String(OWNER_DISCOUNT) : '';
          q('#quantity').focus();
        }
        return;
      }
      const qtyOf = inp => { const v = parseFloat(String(inp.value).replace(',', '.')); if (!(v > 0)) { inp.classList.add('input-error'); inp.focus(); return null; } return v; };
      if (e.target.closest('#list-items-in-sale > form button[type="submit"]')) {
        e.preventDefault(); e.stopPropagation();
        if (!pickedMain) { mainInput().classList.add('input-error'); return; }
        const n = qtyOf(q('#quantity')); if (n == null) return;
        const row = addRow(pickedMain, n, parseFloat(q('#discount').value.replace(',', '.')) || 0);
        tagAdded('main', pickedMain, n, row, null);
        pickedMain = null; mainInput().value = ''; q('#quantity').value = ''; q('#discount').value = ''; mainInput().classList.remove('input-error');
        renderRows(); flash(q('[data-row="' + row.id + '"]')); renderAll();
        return;
      }
      if (e.target.closest('#proto-good-dialog .sx-madd')) {
        e.preventDefault(); e.stopPropagation();
        const d = q('#proto-good-dialog');
        if (!pickedModal) { q('.sx-mq', d).classList.add('input-error'); return; }
        const qi = q('.sx-mqty', d);
        if (qi.value.trim().length > 3) {   // Vet.AF message seen on the test visit for «0.35»; «Добавить» is blocked
          qi.classList.add('input-error'); q('.sx-mqty-err', d).textContent = 'Длина поля не может превышать 3 символов'; qi.focus(); return;
        }
        const n = qtyOf(qi); if (n == null) return;
        modalRow.nested.unshift({ title: pickedModal.title, price: pickedModal.price, unit: pickedModal.unit, qty: n });
        tagAdded('modal', pickedModal, n, null, modalRow);
        pickedModal = null; q('.sx-mq', d).value = ''; qi.value = ''; q('.sx-mq', d).focus();
        renderRows(); renderAll();
        return;
      }
      if (e.target.closest('#proto-good-dialog [data-action="dialog-close"]')) { e.preventDefault(); q('#proto-good-dialog').close(); return; }
      const add = e.target.closest('[data-add-good]');
      if (add) { e.preventDefault(); e.stopPropagation(); openGoodDialog(rows.find(r => r.id === +add.dataset.addGood)); return; }
      const del = e.target.closest('[data-del], [data-del-nested]');
      if (del) {
        e.preventDefault(); e.stopPropagation();
        if (del.dataset.del) {
          const id = +del.dataset.del;
          rows.splice(rows.findIndex(r => r.id === id), 1);
          goods().filter(t => t.status === 'done' && t.rowId === id).forEach(t => { t.status = 'new'; t.rowId = null; t.linked = false; });
        } else {
          const [rid, i] = del.dataset.delNested.split(':').map(Number);
          const r = rows.find(x => x.id === rid), n = r.nested[i];
          r.nested.splice(i, 1);
          goods().filter(t => t.status === 'done' && t.rowId === rid && t.nestedTitle === n.title).forEach(t => { t.status = 'new'; t.rowId = null; t.linked = false; });
        }
        renderRows(); renderAll();
        return;
      }
      const hdr = e.target.closest('#list-items-in-sale [data-row] > header');
      if (hdr && !e.target.closest('.control')) {
        const r = rows.find(x => x.id === +hdr.parentNode.dataset.row);
        if (r && r.type === 'услуга') { r.opened = !r.opened; renderRows(); }
      }
    }, true);
    document.addEventListener('close', e => { if (e.target.id === 'proto-good-dialog') { modalRow = null; if (activeTag && activeTag.scope === 'modal') activeTag = null; renderTags(); } }, true);

    // Vet.AF «Сохранить» / «В работе» / «Завершить». «Завершить» does not lock «Товары и услуги»
    // (a completed visit on vetaf.ru accepts new rows; the real locking rule — question for Petya)
    document.addEventListener('click', e => {
      const s = e.target.closest('header.header-sticky .dropdown-button > .button, header.header-sticky .dropdown-button a[data-url="/animals/history/submit"]');
      if (!s || !draftReady) return;
      e.preventDefault();
      saved = true; dirty = false; savedAt = NOW;
      if (s.dataset.postStatus === '1') completed = true;
      renderAll();
    }, true);

    // prototype-only bar (A) + L: jumps to the states that are hard to reach by hand
    const DEV = {
      remind: ['напоминание', () => { storeRemind(null); remindDone = false; recStarted = false; declined = false; remind(); }],
      'mic-prompt': ['микрофон: запрос', () => devMic('prompt')],
      'mic-blocked': ['запрещён', () => devMic('blocked')],
      'mic-missing': ['не найден', () => devMic('missing')],
      'mic-busy': ['занят', () => devMic('busy')],
      interrupted: ['прервана', () => devRec('interrupted')],
      unsent: ['не отправлена', () => devRec('unsent')],
      nodraft: ['не готово', () => devRec('nodraft')]
    };
    function devMic(k) { clearLater(); stopMic(); recStarted = true; showMic(k); }
    function devRec(s) { clearLater(); stopMic(); recStarted = true; if (!secs) secs = 754; setState(s); }
    function dev(k) {
      if (!DEV[k]) return;
      if (draftReady) { location.hash = 'state=' + k; location.reload(); return; }   // the visit after the draft: start over
      DEV[k][1]();
    }
    const pb = document.createElement('div');
    pb.className = 'proto-bar';
    // data tabs: the synthetic visit, local real runs (runs-local.js, never in git), a pasted raw model answer
    const DATA = [['', 'Синтетика']]
      .concat(Object.keys(window.SCRIBE_MODELS || {}).map(k => [k, (window.SCRIBE_MODEL_LABELS || {})[k] || k]))
      .concat([['paste', 'Вставить ответ']]);
    pb.innerHTML = '<div>Прототип L · <a data-proto="skip">сразу к предложениям</a> · <a data-proto="reset">начать заново</a></div>' +
      '<div class="proto-data">Данные: ' + DATA.map(([k, l]) => '<a data-data="' + esc(k) + '"' + (RUN === k ? ' aria-current="true"' : '') + '>' + esc(l) + '</a>').join('') +
      (LOAD_ERR ? '<span class="proto-err">Не показано: ' + esc(LOAD_ERR) + '</span>' : '') + '</div>' +
      '<div class="proto-data proto-states">Состояния: ' + Object.entries(DEV).map(([k, [l]]) => '<a data-dev="' + k + '">' + l + '</a>').join('') + '</div>' +
      '<div class="proto-note">Приём прототипа считается сегодняшним и незавершённым: напоминание срабатывает один раз за приём ' +
      '(флаг в sessionStorage) при вводе в «Цель визита», «Анамнез», «Осмотр». «Начать заново» сбрасывает флаг.</div>';
    const box = document.createElement('div');
    box.className = 'proto-paste'; box.hidden = true;
    box.innerHTML = '<div class="proto-paste-in"><b>Сырой ответ модели</b> <span>(raw_text: JSON целиком, можно с обёрткой ```json)</span>' +
      '<textarea spellcheck="false" placeholder="{&quot;title&quot;: {&quot;q&quot;: &quot;…&quot;, &quot;t&quot;: &quot;…&quot;}, …}"></textarea>' +
      '<div class="proto-err" hidden></div><div><button type="button" class="button green" data-paste="go">Показать</button> ' +
      '<button type="button" class="button" data-paste="cancel">Отмена</button></div></div>';
    document.body.appendChild(box);
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-paste]'); if (!b) return;
      if (b.dataset.paste === 'cancel') { box.hidden = true; return; }
      const text = q('textarea', box).value, err = q('.proto-err', box);
      try { parseModel(text); } catch (x) { err.hidden = false; err.textContent = 'Не разобрано: ' + x.message; return; }
      try { sessionStorage.setItem(PASTE_KEY, text); } catch (x) { err.hidden = false; err.textContent = 'Браузер не дал сохранить ответ (sessionStorage)'; return; }
      if (RUN === 'paste') { location.hash = 'draft'; location.reload(); } else location.href = location.pathname + '?run=paste#draft';
    });
    pb.addEventListener('click', e => {
      const d = e.target.closest('[data-data]');
      if (d) {
        e.preventDefault(); e.stopPropagation();
        const k = d.dataset.data;
        if (k === 'paste') { box.hidden = false; const t = q('textarea', box); t.value = pasted(); t.focus(); return; }
        location.href = location.pathname + (k ? '?run=' + encodeURIComponent(k) : '') + '#draft';
        return;
      }
      const dv = e.target.closest('[data-dev]');
      if (dv) { e.preventDefault(); e.stopPropagation(); dev(dv.dataset.dev); return; }
      const a = e.target.closest('[data-proto]'); if (!a) return;
      e.preventDefault(); e.stopPropagation();
      if (a.dataset.proto === 'reset') { storeRemind(null); location.hash = ''; location.reload(); }
      if (a.dataset.proto === 'skip' && !draftReady) { clearLater(); stopMic(); recStarted = true; secs = 754; startDraft(); }
    }, true);
    document.body.appendChild(pb);
    // shortcuts: #draft — straight to the suggestions (A); #state=<key> — one of the states above
    if (location.hash === '#draft') setTimeout(() => q('[data-proto="skip"]', pb).click(), 0);
    else if (location.hash.startsWith('#state=')) setTimeout(() => dev(location.hash.slice(7)), 0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
