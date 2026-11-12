// Prototype v2, variant A — the draft right in the Vet.AF fields (decision 4.1 A, ux-decisions-v2.md).
// Flow: open visit → record → stop → draft ready → suggestion blocks under each field (accept / not needed),
// goods lines on the goods tab, diagnoses inside the diagnoses table, a narrow summary panel on the right → save.
// Draft data: synthetic reference visit (draft-data.js). Recording bar states 1–3: approved texts (texts-v2.md).
//
// Structure (variant C copies this file — keep the parts separate):
//   1. model      — suggestion units U, one per Vet.AF field / diagnosis / goods line
//   2. Vet.AF     — helpers and the visit as the vet opens it
//   3. bar/panel  — recording bar (approved) and the summary panel shell
//   4. inline     — suggestion layer under the fields: text, numbers, doses, diagnoses
//   5. goods      — suggested lines on the goods tab
//   6. summary    — what remains per tab, removed items, reminders, bulk accept per tab
//   7. flow       — events, save, prototype controls
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
  // drugs prescribed for home (Yuri 2026-11-12): clickable like the goods above, but optional — not counted in «не в счёте».
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
  function remain(tab) {
    const us = U.filter(u => (!tab || u.tab === tab) && isPending(u));
    return {
      fields: us.filter(isField).length,
      diags: us.filter(u => u.kind === 'diag').length,
      goods: us.filter(u => u.kind === 'good' && !u.home).length
    };
  }
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

  // ================================================================ 3. recording bar (approved, screens 1–3) and panel shell
  let bar, panel;
  function buildBar() {
    const el = document.createElement('div');
    el.className = 'scribe-bar';
    el.dataset.state = 'idle';
    el.innerHTML =
      '<div class="scribe-main">' +
        '<span class="scribe-badge" data-show="idle checking recording paused confirm ready saved">' + ICON.mic + '</span>' +
        '<span class="scribe-badge" data-show="mic">' + ICON.micOff + '</span>' +
        '<span class="scribe-badge" data-show="sending drafting"><span class="scribe-spinner"></span></span>' +
        '<span class="scribe-badge" data-show="sent">' + ICON.tick + '</span>' +
        '<div class="scribe-text">' +
          '<span class="scribe-title" data-show="idle">Запись приёма</span>' +
          '<span class="scribe-sub" data-show="idle">Запишет разговор и предложит, что внести в приём</span>' +
          '<span class="scribe-title" data-show="checking">Проверяем микрофон и связь</span>' +
          '<span class="scribe-sub" data-show="checking">Если браузер спросит про микрофон, разрешите доступ</span>' +
          // no microphone access (Yuri 2026-11-12): one state, one action; texts depend on the browser's answer
          '<span class="scribe-title scribe-mic-title" data-show="mic"></span>' +
          '<span class="scribe-sub scribe-mic-sub" data-show="mic"></span>' +
          // delete an accidental recording: from the pause only, confirmed in the bar
          '<span class="scribe-title" data-show="confirm">Удалить запись?</span>' +
          '<span class="scribe-sub" data-show="confirm">Запись удалится безвозвратно, предложений не будет</span>' +
          '<span class="scribe-title" data-show="recording">Идёт запись · ' + PET + ' · <span class="scribe-time">00:00</span></span>' +
          '<span class="scribe-sub" data-show="recording">Нажмите «Завершить запись», когда закончите приём</span>' +
          '<span class="scribe-title" data-show="paused">Пауза — запись не идёт · ' + PET + ' · <span class="scribe-time">00:00</span></span>' +
          '<span class="scribe-sub" data-show="paused">Нажмите «Продолжить запись», чтобы записывать дальше</span>' +
          '<span class="scribe-title" data-show="sending">Запись отправляется</span>' +
          '<span class="scribe-sub" data-show="sending">Осталось около минуты. Не закрывайте вкладку браузера</span>' +
          '<span class="scribe-title" data-show="sent">Запись отправлена</span>' +
          '<span class="scribe-title" data-show="drafting">Готовим предложения</span>' +
          '<span class="scribe-sub" data-show="drafting">Обычно меньше минуты. Работайте дальше — они появятся под полями</span>' +
          '<span class="scribe-title scribe-ready-title" data-show="ready saved"></span>' +
          '<span class="scribe-sub scribe-ready-sub" data-show="ready saved"></span>' +
        '</div>' +
        '<span class="scribe-level" data-show="checking recording"><i></i><i></i><i></i><i></i><i></i><i></i></span>' +
      '</div>' +
      '<div class="scribe-actions">' +
        '<button type="button" class="button green" data-show="idle" data-scribe="start">' + ICON.mic + '<span>Записать приём</span></button>' +
        '<button type="button" class="button" data-show="checking" data-scribe="cancel">Отменить</button>' +
        '<button type="button" class="button green scribe-mic-btn" data-show="mic" data-scribe="mic"></button>' +
        '<button type="button" class="scribe-barlink" data-show="paused" data-scribe="delete-ask">Удалить запись</button>' +
        '<button type="button" class="button" data-show="recording" data-scribe="pause">' + ICON.pause + '<span>Пауза</span></button>' +
        '<button type="button" class="button green" data-show="paused" data-scribe="resume">' + ICON.play + '<span>Продолжить запись</span></button>' +
        '<button type="button" class="button green" data-show="recording" data-scribe="stop">' + ICON.tick + '<span>Завершить запись</span></button>' +
        '<button type="button" class="button" data-show="paused" data-scribe="stop">' + ICON.tick + '<span>Завершить запись</span></button>' +
        '<button type="button" class="button" data-show="confirm" data-scribe="delete-no">Не удалять</button>' +
        '<button type="button" class="button scribe-danger" data-show="confirm" data-scribe="delete-yes">Удалить</button>' +
        '<button type="button" class="button" data-show="drafting ready saved" data-scribe="expand">Показать панель</button>' +
      '</div>';
    return el;
  }

  function buildPanel() {
    const el = document.createElement('aside');
    el.className = 'scribe-panel';
    el.innerHTML =
      '<header>' +
        '<span class="scribe-badge">' + ICON.mic + '</span>' +
        '<span class="scribe-title">Из записи</span>' +
        // a non-modal side panel closes with «×» (Material side sheet, Google Docs, Gmail); it comes back from the bar
        '<button type="button" class="scribe-collapse" data-scribe="collapse" title="Скрыть панель" aria-label="Скрыть панель">' + ICON.x + '</button>' +
      '</header>' +
      '<section class="scribe-processing">' +
        '<ol class="scribe-steps">' +
          '<li data-step="done" data-k="rec"><span class="mark">' + ICON.tick + '</span>Запись получена<span class="meta scribe-dur">00:00</span></li>' +
          '<li data-step="active" data-k="asr"><span class="mark"></span>Распознавание речи</li>' +
          '<li data-k="fill"><span class="mark"></span>Подготовка предложений</li>' +
        '</ol>' +
        // variant A: the draft appears under the fields, not in the panel (the only change to the approved texts)
        '<div class="scribe-note">Предложения появятся под полями и на вкладках. В приём ничего не попадёт без вас.</div>' +
      '</section>' +
      '<section class="scribe-sections sx-summary" hidden></section>';
    return el;
  }

  // ================================================================ 4. inline layer under the fields
  let draftReady = false, saved = false, dirty = false, savedAt = null, completed = false;
  let guardUntil = 0;           // see «double click» guard in the flow
  let bulk = null;            // { tab, step: 'confirm' | 'done', ids }
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
    const back = u.kind === 'number' ? 'Вернуть ' + esc(u.show) : 'Вернуть принятый текст';
    if (ed) return '<div class="sx-receipt' + fresh + '" data-u="' + u.id + '">' + ICON.tick + lbl + '<span>Изменено в поле</span>' +
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
      '<ul class="sx-lines">' + lis + '</ul>' + (has ? '<div class="sx-note sx-note-text">В поле уже есть текст — «Дописать» его сохранит</div>' : '') +
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
      '<span class="sx-nc-qi" title="Как прозвучало" aria-hidden="true">«»</span>' +
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
    pop.innerHTML = '<span class="sx-badge">' + ICON.mic + '</span><div><div class="sx-q sx-q-dose sx-q-diag">' + diagTagHtml(u) + diagQuote(u) + '</div><div class="sx-muted">Тип подставлен из записи — проверьте</div></div>';
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
  const nNotBilled = n => n + ' ' + plural(n, 'позиция', 'позиции', 'позиций') + ' не в счёте';
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
    if (!u) return '<div class="sx-gstat">' + (scope === 'main' ? 'Нажмите название — оно подставится в поиск. Позицию и количество выберите сами' : 'Нажмите название — оно подставится в поиск товара. Количество введите сами') + '</div>';
    const fb = u.lastEmpty ? '<div class="sx-fb">Ничего не найдено — искать: ' + fallbacks(u).map(x =>
      '<button type="button" class="sx-link" data-a="gq" data-u="' + u.id + '" data-q="' + esc(x) + '">' + esc(x) + '</button>').join(' · ') + '</div>' : '';
    // «Внесено под другим названием»: link the line to a table row that no line claims yet; never close a line without a row
    const all = unlinkedRows();
    const free = all.filter(f => scope === 'main' || (f.n && f.rw === modalRow));
    const other = !free.length ? '' : choosingFor === u.id
      ? '<div class="sx-other"><span>Выберите строку счёта:</span>' + free.map(f =>
          '<button type="button" class="sx-link" data-a="glink" data-u="' + u.id + '" data-i="' + all.indexOf(f) + '">' + esc(f.label) + '</button>').join(' · ') +
        ' <button type="button" class="sx-link sx-muted" data-a="glink-cancel">Отменить</button></div>'
      : ' <button type="button" class="sx-link" data-a="gother" data-u="' + u.id + '">Внесено под другим названием</button>';
    return '<div class="sx-gstat is-active"><div class="sx-q">' + quoteHtml(u.quote) + (choosingFor === u.id ? '' : other) + '</div>' +
      (choosingFor === u.id ? other : '') + fb + '</div>';
  }
  // added items (Yuri 2026-11-12: no «Верно» step) — one line each, the billed position in bold, so a near-twin
  // («УЗИ почек» for «УЗИ мочевого пузыря») or another unit is seen by reading, not by an extra click
  function doneHtml(u) {
    const where = u.parent ? 'в «' + esc(u.parent) + '»' : 'в счёте';
    // what was heard vs what is billed: another name, unit or number → amber mark instead of the tick (no extra click)
    const UNIT_EQ = { 'пакет': 'шт', 'упаковка': 'шт', 'флакон': 'шт' };
    const sameName = u.addTitle.toLowerCase().includes(u.name.toLowerCase());
    const sameUnit = !u.recUnit || (UNIT_EQ[u.recUnit] || u.recUnit) === (UNIT_EQ[u.addUnit] || u.addUnit);
    const diff = !u.linked && (!sameName || !sameUnit || (u.recQty != null && u.recQty !== u.addQty));
    const mark = diff ? '<span class="sx-diffmark" aria-hidden="true">!</span>' : ICON.tick;
    const lead = sameName ? (u.parent ? 'В «' + esc(u.parent) + '»' : 'В счёте') : esc(u.name) + ' → ' + where;
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
      head(null, '<span class="sx-gtitle">— ' + (open.length ? nNotBilled(open.length) : 'все рассмотрены') + '</span>') +
      (open.length ? '<div class="sx-tags">' + open.map(u => tagHtml(u, 'main')).join('') + '</div>' : '') +
      (lineUnder === 'main' ? statusLine('main') : '') +
      (home.length ? '<div class="sx-home"><div class="sx-home-h">Назначено на дом — если отпускаете в клинике:</div><div class="sx-tags">' + home.map(u => tagHtml(u, 'main')).join('') + '</div></div>' : '') +
      (lineUnder === 'home' ? statusLine('main') : '') +
      (rej.length ? '<div class="sx-rej">Убрано: ' + rej.map(u => esc(u.name) + ' <button type="button" class="sx-link" data-a="restore" data-u="' + u.id + '">Вернуть</button>').join(' · ') + '</div>' : '') +
    '</div>';
    const hd = host('goods-done', el => form.after(el));
    hd.innerHTML = done.length ? '<div class="sx-goods-done"><div class="sx-from">Добавлено в счёт</div><ul class="sx-donelist">' + done.map(doneHtml).join('') + '</ul></div>' : '';
    renderModalTags();
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
    plate.innerHTML = '<span class="sx-badge">' + ICON.mic + '</span><div class="sx-gpop-b"><div class="sx-from">Из записи — товары</div>' +
      (list.length ? '<div class="sx-tags">' + list.map(u => tagHtml(u, 'modal')).join('') + '</div>' + statusLine('modal') : '') +
      (done.length ? '<ul class="sx-donelist">' + done.map(doneHtml).join('') + '</ul>' : '') +
      (!list.length && !done.length ? '<div class="sx-muted">Товаров из записи нет</div>' : '') + '</div>';
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

  // ================================================================ 6. summary panel: what remains, removed, reminders
  function bulkCandidates(tab) {
    return U.filter(u => u.tab === tab && isPending(u) && (u.kind === 'text' || u.kind === 'input') && (u.kind !== 'text' || liveLines(u).length));
  }
  const bulkMode = u => {
    if (u.kind === 'text') return fieldText(u) ? 'append' : 'set';
    const cur = formInput(u.field).value.trim();
    return !cur ? 'set' : u.value.toLowerCase().startsWith(cur.toLowerCase()) ? 'extend' : 'append';
  };
  function bulkLeftOut(tab) {
    const out = [];
    U.filter(u => u.tab === tab && isPending(u)).forEach(u => {
      if (u.kind === 'number') out.push(u.field === 'weight' ? 'вес' : 'температура');
      else if (u.kind === 'diag') { if (!out.includes('диагнозы')) out.push('диагнозы'); }
    });
    return out;
  }

  // counts with their nouns, one format in the bar and in the summary
  const nDiags = n => n + ' ' + plural(n, 'диагноз', 'диагноза', 'диагнозов');
  const nFields = n => n + ' ' + plural(n, 'поле', 'поля', 'полей');
  const goodsPart = n => nNotBilled(n);
  function remainParts(r, withGoods) {
    const parts = [];
    if (withGoods && r.goods) parts.push(goodsPart(r.goods));
    if (r.diags) parts.push(nDiags(r.diags));
    if (r.fields) parts.push(nFields(r.fields));
    return parts;
  }
  function detail(tab) {
    const r = remain(tab);
    if (tab === 'items') return r.goods ? goodsPart(r.goods) : '';
    return remainParts(r, false).join(' · ');
  }
  const lc = t => t.charAt(0).toLowerCase() + t.slice(1);

  function renderPanel() {
    const box = q('.sx-summary', panel);
    if (!box || !draftReady) return;
    const cur = currentTab();
    let h = '<div class="sx-sec"><div class="sx-h">Осталось</div>';
    TABS.forEach(([id, title]) => {
      const d = detail(id);
      h += '<button type="button" class="sx-tabrow' + (id === cur ? ' is-current' : '') + (d ? '' : ' is-clear') + '" data-a="goto" data-tab="' + id + '">' +
        '<span class="sx-tt">' + title + '</span><span class="sx-td">' + (d || 'всё решено') + '</span>' + ICON.chev + '</button>';
      if (id !== cur) return;
      if (bulk && bulk.tab === id && bulk.step === 'done') {
        const undoable = bulk.ids.map(byId).filter(u => u.status === 'done' && !edited(u));
        h += '<div class="sx-bulk-done">' + ICON.tick + '<span>Принято ' + bulk.ids.length + ' ' + plural(bulk.ids.length, 'поле', 'поля', 'полей') + '</span>' +
          (undoable.length && !(saved && !dirty) ? '<button type="button" class="sx-link" data-a="bulk-undo">Отменить</button>' : '') + '</div>';
        return;
      }
      const c = bulkCandidates(id);
      if (!c.length) return;
      if (bulk && bulk.tab === id && bulk.step === 'confirm') {
        const out = bulkLeftOut(id);
        const doseLines = c.flatMap(u => liveLines(u).filter(l => l.dose).map(l => '<li><span class="sx-t">' + l.html + '</span><div class="sx-q">' + quoteHtml(l.quote) + '</div></li>'));
        h += '<div class="sx-bulk-confirm"><div><b>Войдут:</b> ' + c.map(u => esc(lc(u.label)) + (bulkMode(u) === 'append' ? ' (в конец)' : '')).join(', ') + '</div>' +
          (doseLines.length ? '<div><b>Проверьте дозы:</b></div><ul class="sx-bulk-doses">' + doseLines.join('') + '</ul>' : '') +
          (out.length ? '<div><b>Не войдут:</b> ' + esc(out.join(', ')) + ' — разберите их по одному</div>' : '') +
          '<div class="sx-acts"><button type="button" class="button green sx-btn" data-a="bulk-go">Принять ' + c.length + ' ' + plural(c.length, 'поле', 'поля', 'полей') + '</button>' +
          '<button type="button" class="sx-link" data-a="bulk-cancel">Отменить</button></div></div>';
      } else {
        h += '<button type="button" class="button green-title sx-btn sx-bulk" data-a="bulk">Принять текст · ' + c.length + ' ' + plural(c.length, 'поле', 'поля', 'полей') + '</button>';
      }
    });
    h += '</div>';

    // removed by the vet: «what: which suggestion» + «Вернуть», one template for all kinds
    const tailName = u => u.kind === 'diag' ? 'Диагноз: ' + u.title
      : u.kind === 'good' ? 'Позиция: ' + u.name
      : u.kind === 'number' ? (u.field === 'weight' ? 'Вес: ' : 'Температура: ') + u.show + unitOf(u) + (u.kept ? ', оставлено ' + u.kept + unitOf(u) : '')
      : u.label;
    const rem = [];
    U.filter(u => u.status === 'rejected' && !u.auto).forEach(u => rem.push('<li><span>' + esc(tailName(u)) + '</span><button type="button" class="sx-link" data-a="restore" data-u="' + u.id + '">Вернуть</button></li>'));
    U.filter(u => u.lines).forEach(u => u.lines.forEach((l, i) => { if (l.excluded) rem.push('<li><span>' + esc(u.label) + ', строка: ' + esc(l.text) + '</span><button type="button" class="sx-link" data-a="line-restore" data-u="' + u.id + '" data-l="' + i + '">Вернуть</button></li>'); }));
    if (rem.length) h += '<div class="sx-sec"><div class="sx-h">Убрано</div><ul class="sx-removed">' + rem.join('') + '</ul></div>';
    // «не вошло в поля»: shown only when the model returns such phrases; the reference visit has none

    // one static disclaimer (Yuri 2026-11-12); the visit-specific home-drugs line lives on the goods tab only
    h += '<div class="sx-sec sx-remind"><p>В предложения не попадает то, что не прозвучало: процедуры без слов, отказы владельца, направления, анализы, стационар.</p></div>';
    box.innerHTML = h;
  }

  function updateBarText() {
    if (!draftReady) return;
    const r = remain();
    const left = remainParts(r, true).join(' · ');
    const touched = U.some(u => u.status !== 'new');
    const isSaved = saved && !dirty;
    let t, s;
    if (isSaved) {
      const st = completed ? 'завершён' : 'сохранён';
      t = left ? 'Приём ' + st + ' · осталось: ' + left : 'Все предложения рассмотрены, приём ' + st;
      s = left ? 'Остальное разберите позже — предложения останутся в приёме' : 'Принятое сохранено в приёме';
    } else if (!touched) {
      t = 'Предложения из записи готовы: ' + left;
      s = r.goods ? 'Предложения — под полями; товары и услуги — на вкладке «Товары и услуги»'
        : 'Предложения — под полями. Принимайте поле за полем или вернитесь позже';
    } else if (left) {
      t = 'Осталось: ' + left;
      s = U.some(u => u.status === 'done' && isField(u)) ? 'Принятое уже в полях — сохраните приём, чтобы не потерять'
        : 'Предложения — под полями; товары и услуги — на вкладке «Товары и услуги»';
    } else {
      t = 'Все предложения рассмотрены. Сохраните приём';
      s = 'Принятое уже в полях';
    }
    q('.scribe-ready-title', bar).textContent = t;
    q('.scribe-ready-sub', bar).textContent = s;
    bar.dataset.state = isSaved ? 'saved' : 'ready';
  }

  function renderAll() {
    renderInline(); renderPanel(); updateBarText();
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
  function init() {
    seed();
    const hs = q('header.header-sticky');
    bar = buildBar(); hs.appendChild(bar);
    panel = buildPanel(); document.body.appendChild(panel);

    const $ = s => q(s, bar), $$ = s => qa(s, bar);
    const badge = $('.scribe-badge');
    const lv = $$('.scribe-level i');
    let secs = 0, tick = null, level = null, timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

    function placePanel() {
      const col = hs.getBoundingClientRect(), b = bar.getBoundingClientRect();
      const top = b.bottom + 8;
      panel.style.top = top + 'px';
      panel.style.left = (col.right - panel.offsetWidth) + 'px';
      panel.style.maxHeight = (innerHeight - top - 16) + 'px';
    }
    addEventListener('scroll', placePanel, { passive: true });
    addEventListener('resize', placePanel);
    const openPanel = on => { document.body.classList.toggle('scribe-panel-open', on); requestAnimationFrame(placePanel); };

    function setState(s) {
      bar.dataset.state = s;
      clearInterval(tick); tick = null;
      if (s === 'recording') tick = setInterval(() => { secs++; $$('.scribe-time').forEach(e => e.textContent = fmt(secs)); }, 1000);
      clearInterval(level); level = null; badge.style.boxShadow = '';
      lv.forEach(i => i.style.height = '20%');
      if (s === 'recording' || s === 'checking') level = setInterval(() => {
        // the real microphone level when the stream is open (prototype asks the browser for access), else a demo
        const v = micLevel();
        lv.forEach((i, k) => i.style.height = (v == null ? 15 + Math.random() * 85 : Math.max(12, Math.min(100, v * (70 + k * 9)))) + '%');
        if (s === 'recording') badge.style.boxShadow = '0 0 0 ' + (v == null ? 2 + Math.random() * 7 : 2 + v * 9).toFixed(1) + 'px rgba(0, 150, 136, .2)';
      }, 140);
    }

    // ---- microphone (Yuri 2026-11-12): the prototype opens a real stream to test the permission flow; nothing is recorded
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
    // texts of the error state: the browser either was not asked to remember (prompt closed), or remembers «Block»
    const MIC = {
      prompt: ['Нет доступа к микрофону', 'Разрешите микрофон — без него запись не идёт', 'Разрешить микрофон'],
      blocked: ['Микрофон запрещён в браузере', 'Нажмите значок слева от адреса сайта → «Микрофон» → «Разрешить». Запись начнётся сама', 'Проверить снова'],
      missing: ['Микрофон не найден', 'Подключите микрофон и нажмите «Проверить снова»', 'Проверить снова'],
      busy: ['Микрофон занят другой программой', 'Закройте её и нажмите «Проверить снова»', 'Проверить снова']
    };
    function showMic(kind) {
      const [t, sub, btn] = MIC[kind];
      $('.scribe-mic-title').textContent = t; $('.scribe-mic-sub').textContent = sub; $('.scribe-mic-btn').textContent = btn;
      bar.dataset.mic = kind;
      setState('mic');
      flash($('.scribe-mic-sub'));
    }
    async function permState() {
      try { const p = await navigator.permissions.query({ name: 'microphone' }); return p; } catch (e) { return null; }
    }
    async function startMic() {
      setState('checking');
      secs = 0; $$('.scribe-time').forEach(e => e.textContent = fmt(0));
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('no api'), { name: 'NotFoundError' });
        const st = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (bar.dataset.state !== 'checking') { st.getTracks().forEach(t => t.stop()); return; }   // «Отменить» while the browser was asking
        stream = st;
        actx = new AudioContext();
        analyser = actx.createAnalyser(); analyser.fftSize = 512; buf = new Uint8Array(analyser.fftSize);
        actx.createMediaStreamSource(stream).connect(analyser);
        later(900, () => { if (bar.dataset.state === 'checking') setState('recording'); });
      } catch (err) {
        if (bar.dataset.state !== 'checking') return;
        const n = err && err.name;
        if (n === 'NotFoundError' || n === 'OverconstrainedError') return showMic('missing');
        if (n === 'NotReadableError' || n === 'AbortError') return showMic('busy');
        const p = await permState();
        showMic(p && p.state === 'denied' ? 'blocked' : 'prompt');
        // the vet allows it in the site settings → the bar goes on by itself
        if (p && !permWatch) { permWatch = p; p.onchange = () => { if (p.state === 'granted' && bar.dataset.state === 'mic') startMic(); }; }
      }
    }

    function startDraft() {
      setState('drafting');
      q('.scribe-dur', panel).textContent = (d => d < 60 ? 'меньше минуты' : Math.floor(d / 60) + ' мин')(Math.max(secs, 754));   // the reference visit ~12:34
      openPanel(true);
      const steps = qa('.scribe-steps li', panel);
      later(2000, () => { steps[1].dataset.step = 'done'; steps[1].querySelector('.mark').innerHTML = ICON.tick; steps[2].dataset.step = 'active'; });
      later(4000, ready);
    }

    function ready() {
      draftReady = true;
      document.body.dataset.protoDraft = '1';
      document.body.classList.add('sx-ready');
      q('.scribe-processing', panel).hidden = true;
      q('.sx-summary', panel).hidden = false;
      renderAll();
      openPanel(true);
    }

    // recording bar and panel shell
    function onScribe(e) {
      const b = e.target.closest('[data-scribe]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      const act = b.dataset.scribe;
      if (act === 'start' || act === 'mic') startMic();
      if (act === 'cancel') { timers.forEach(clearTimeout); stopMic(); setState('idle'); }
      if (act === 'pause') setState('paused');
      if (act === 'resume') setState('recording');
      if (act === 'delete-ask') setState('confirm');
      if (act === 'delete-no') setState('paused');
      if (act === 'delete-yes') { timers.forEach(clearTimeout); stopMic(); secs = 0; setState('idle'); }
      if (act === 'stop') { stopMic(); setState('sending'); later(2200, () => setState('sent')); later(3400, startDraft); }
      if (act === 'collapse') openPanel(false);
      if (act === 'expand') openPanel(true);
    }
    bar.addEventListener('click', onScribe, true);
    panel.addEventListener('click', onScribe, true);

    // suggestion layer and summary: one delegated handler
    document.addEventListener('click', e => {
      const a = e.target.closest('.sx-host [data-a], .sx-summary [data-a], .sx-gplate [data-a]');
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
      if (act !== 'bulk' && act !== 'bulk-go' && act !== 'bulk-undo' && act !== 'goto') bulk = null;

      if (act === 'accept' && u) accept(u, a.dataset.mode);
      if (act === 'reject' && u) { u.status = 'rejected'; u.auto = false; if (activeTag && activeTag.id === u.id) activeTag = null; }
      if (act === 'keep' && u) { u.status = 'rejected'; u.kept = fmtNum(formInput(u.field).value.trim()); }
      if (act === 'restore' && u) { u.status = 'new'; u.kept = null; }
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
      if (act === 'bulk') bulk = { tab: currentTab(), step: 'confirm' };
      if (act === 'bulk-cancel') bulk = null;
      if (act === 'bulk-go') {
        const tab = currentTab();
        const c = bulkCandidates(tab);
        c.forEach(x => accept(x, bulkMode(x)));
        bulk = { tab, step: 'done', ids: c.map(x => x.id) };
      }
      if (act === 'bulk-undo' && bulk) { bulk.ids.map(byId).filter(x => x.status === 'done' && !edited(x)).forEach(undo); bulk = null; }
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

    // the summary follows the Vet.AF tab the vet opens
    q('header.header-sticky nav').addEventListener('click', () => { bulk = null; setTimeout(renderPanel, 0); });

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
      saved = true; dirty = false; savedAt = NOW; bulk = null;
      if (s.dataset.postStatus === '1') completed = true;
      renderAll();
    }, true);

    // prototype-only bar
    const pb = document.createElement('div');
    pb.className = 'proto-bar';
    // data tabs: the synthetic visit, local real runs (runs-local.js, never in git), a pasted raw model answer
    const DATA = [['', 'Синтетика']]
      .concat(Object.keys(window.SCRIBE_MODELS || {}).map(k => [k, (window.SCRIBE_MODEL_LABELS || {})[k] || k]))
      .concat([['paste', 'Вставить ответ']]);
    pb.innerHTML = 'Прототип · основной сценарий · <a data-proto="skip">сразу к предложениям</a> · <a data-proto="reset">начать заново</a>' +
      '<div class="proto-data">Данные: ' + DATA.map(([k, l]) => '<a data-data="' + esc(k) + '"' + (RUN === k ? ' aria-current="true"' : '') + '>' + esc(l) + '</a>').join('') +
      (LOAD_ERR ? '<span class="proto-err">Не показано: ' + esc(LOAD_ERR) + '</span>' : '') + '</div>';
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
      const a = e.target.closest('[data-proto]'); if (!a) return;
      e.preventDefault(); e.stopPropagation();
      if (a.dataset.proto === 'reset') { location.hash = ''; location.reload(); }
      if (a.dataset.proto === 'skip' && !draftReady) { timers.forEach(clearTimeout); secs = 754; setState('sent'); startDraft(); }
    }, true);
    document.body.appendChild(pb);
    if (location.hash === '#draft') setTimeout(() => q('[data-proto="skip"]', pb).click(), 0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
