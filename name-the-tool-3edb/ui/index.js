const store = window.host.store;
const COLORS = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange'];
const RINGS = [
  { n: 1, name: 'Inner circle', r: 80 },
  { n: 2, name: 'Close', r: 140 },
  { n: 3, name: 'Familiar', r: 200 },
  { n: 4, name: 'Acquaintances', r: 260 },
];
const C = 300;
const NS = 'http://www.w3.org/2000/svg';

let sections = [];   // sections of the open board
let people = [];     // people of the open board
let allSections = [];
let allPeople = [];
let boards = [];
let activeBoardId = null;
let settings = null;
let overviewOpen = false;
let boardMenuOpen = false;
let boardDialogOpen = false;
let boardEditing = null;
let confirmBoardDelete = null;
let selected = null;
let adding = false;
let confirmDel = false;

const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = new URL('./styles.css', import.meta.url).href;
document.head.appendChild(link);

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  kids.forEach((k) => e.append(k));
  return e;
}
function sv(tag, attrs = {}, ...kids) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  kids.forEach((k) => e.append(k));
  return e;
}

const DEFAULT_SECTIONS = [['Family', 'pink'], ['Friends', 'yellow'], ['Work', 'blue'], ['Community', 'green']];

async function seedSections(boardId) {
  for (const [name, color] of DEFAULT_SECTIONS) await store.insert('sections', { name, color, boardId });
}

async function load() {
  const [allSec, allPpl, boardList, settingList] = await Promise.all([
    store.list('sections'), store.list('people'), store.list('boards'), store.list('settings'),
  ]);
  boards = boardList;
  settings = settingList[0] ?? null;
  if (!boards.length) {
    boards.push(await store.insert('boards', { name: 'Board 1' }));
    if (!allSec.length) await seedSections(boards[0].id);
  }
  // Records saved before boards existed belong to the first board.
  const first = boards[0];
  for (const x of allSec.filter((r) => !r.boardId)) await store.update('sections', x.id, { boardId: first.id });
  for (const x of allPpl.filter((r) => !r.boardId)) await store.update('people', x.id, { boardId: first.id });
  allSections = await store.list('sections');
  allPeople = await store.list('people');
  activeBoardId = boards.some((b) => b.id === settings?.boardId) ? settings.boardId : first.id;
  applyBoard();
  render();
}

function applyBoard() {
  sections = allSections.filter((s) => s.boardId === activeBoardId);
  people = allPeople.filter((p) => p.boardId === activeBoardId);
}

async function saveActiveBoard() {
  try {
    if (settings) await store.update('settings', settings.id, { boardId: activeBoardId });
    else settings = await store.insert('settings', { key: 'ui', boardId: activeBoardId });
  } catch (_) { /* keep the in-memory choice */ }
}

async function switchBoard(id) {
  activeBoardId = id;
  overviewOpen = false;
  selected = null;
  adding = false;
  confirmDel = false;
  await saveActiveBoard();
  applyBoard();
  render();
}

function colorOf(sectionId) {
  const i = sections.findIndex((s) => s.id === sectionId);
  return i < 0 ? 'var(--muted)' : `var(--${sections[i].color})`;
}

function polar(r, a) {
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function svgPoint(svg, e) {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  const m = svg.getScreenCTM();
  return m ? pt.matrixTransform(m.inverse()) : { x: C, y: C };
}

function startDrag(e, p, svg) {
  if (e.button !== undefined && e.button !== 0) return;
  const g = e.currentTarget;
  const origin = svgPoint(svg, e);
  let moved = false;
  try { g.setPointerCapture(e.pointerId); } catch (_) {}
  const move = (ev) => {
    const pt = svgPoint(svg, ev);
    const dx = pt.x - origin.x, dy = pt.y - origin.y;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true;
    g.classList.add('dragging');
    g.setAttribute('transform', `translate(${dx} ${dy})`);
  };
  const up = async (ev) => {
    g.removeEventListener('pointermove', move);
    g.removeEventListener('pointerup', up);
    g.removeEventListener('pointercancel', cancel);
    if (!moved) { selected = p.id; render(); return; }
    const pt = svgPoint(svg, ev);
    const dx = pt.x - C, dy = pt.y - C;
    const dist = Math.hypot(dx, dy);
    const ring = (RINGS.find((r) => dist < r.r) || RINGS[RINGS.length - 1]).n;
    let sectionId = p.sectionId;
    if (sections.length) {
      let frac = (Math.atan2(dy, dx) + Math.PI / 2) / (Math.PI * 2);
      frac = ((frac % 1) + 1) % 1;
      sectionId = sections[Math.min(sections.length - 1, Math.floor(frac * sections.length))].id;
    }
    if (ring !== Number(p.ring) || sectionId !== p.sectionId) {
      await store.update('people', p.id, { ring, sectionId });
      await load();
    } else render();
  };
  const cancel = () => {
    g.removeEventListener('pointermove', move);
    g.removeEventListener('pointerup', up);
    g.removeEventListener('pointercancel', cancel);
    render();
  };
  g.addEventListener('pointermove', move);
  g.addEventListener('pointerup', up);
  g.addEventListener('pointercancel', cancel);
}

function buildMap() {
  const svg = sv('svg', { viewBox: '0 0 600 600', role: 'img', 'aria-label': 'Relationship map' });
  [...RINGS].reverse().forEach((ring, i) => {
    svg.append(sv('circle', { cx: C, cy: C, r: ring.r, fill: 'var(--ui)', stroke: 'var(--line)', 'stroke-width': 1.5 }));
  });
  RINGS.forEach((ring, i) => {
    const t = sv('text', { x: C, y: C - ring.r + 14, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--muted)' });
    t.textContent = ring.name;
    svg.append(t);
  });
  const n = sections.length;
  const span = n ? (Math.PI * 2) / n : 0;
  const start = -Math.PI / 2;
  sections.forEach((s, i) => {
    const a0 = start + i * span;
    if (n > 1) {
      const [x, y] = polar(260, a0);
      svg.append(sv('line', { x1: C, y1: C, x2: x, y2: y, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    }
    const [lx, ly] = polar(278, a0 + span / 2);
    const lab = sv('text', {
      x: lx, y: ly, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': 12, 'font-weight': 600, fill: 'var(--ink)',
    });
    lab.textContent = s.name.length > 14 ? s.name.slice(0, 13) + '…' : s.name;
    svg.append(lab);

    RINGS.forEach((ring) => {
      const cell = people.filter((p) => p.sectionId === s.id && Number(p.ring) === ring.n);
      const inner = ring.n === 1 ? 0 : RINGS[ring.n - 2].r;
      const mid = ring.n === 1 ? ring.r * 0.62 : (inner + ring.r) / 2 + 4;
      cell.forEach((p, k) => {
        const f = (k + 1) / (cell.length + 1);
        const a = a0 + f * span;
        const rr = mid + (k % 2 ? 10 : -10) * (ring.n === 1 ? 0.6 : 1);
        const [x, y] = polar(rr, a);
        const g = sv('g', {
          class: 'rm-person' + (selected === p.id ? ' sel' : ''), tabindex: 0, role: 'button',
          'aria-label': `${p.name}, ${s.name}, ${ring.name}`,
          onpointerdown: (e) => startDrag(e, p, svg),
          onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selected = p.id; render(); } },
        });
        g.append(sv('circle', { cx: x, cy: y, r: 11, style: `fill:${colorOf(s.id)}`, stroke: 'var(--ui)', 'stroke-width': 2 }));
        const ini = sv('text', { x, y: y + 0.5, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': 10, 'font-weight': 700, fill: '#1d2033' });
        ini.textContent = (p.name.trim()[0] || '?').toUpperCase();
        const nm = sv('text', { x, y: y + 22, 'text-anchor': 'middle', 'font-size': 9.5, fill: 'var(--ink)' });
        nm.textContent = p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name;
        g.append(ini, nm);
        svg.append(g);
      });
    });
  });
  if (!n) {
    const t = sv('text', { x: C, y: C, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--muted)' });
    t.textContent = 'Add a section to begin';
    svg.append(t);
  }
  return svg;
}

function choiceGroup(label, items, initial, onPick) {
  let value = initial;
  const wrap = el('div', { class: 'pd-chips', role: 'radiogroup', 'aria-label': label });
  const paint = () => [...wrap.children].forEach((b) => {
    const on = b.dataset.v === String(value);
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  items.forEach((it) => {
    const b = el('button', {
      type: 'button', role: 'radio', class: 'chip pd-chip', 'data-v': String(it.value),
      onclick: () => { value = it.value; paint(); onPick && onPick(value); },
    }, ...(it.color ? [el('span', { class: 'rm-dot', style: `background:var(--${it.color})` })] : []), it.label);
    wrap.append(b);
  });
  paint();
  return { node: wrap, get: () => value };
}

function closeDialog() { selected = null; adding = false; confirmDel = false; render(); }

function personDialog() {
  const p = people.find((x) => x.id === selected);
  if (!p && !adding) return null;
  const field = (label, input) => el('label', { class: 'pd-field' }, el('span', {}, label), input);
  const name = el('input', { class: 'field', placeholder: 'e.g. Alex Rivera', maxlength: 80 });
  const note = el('textarea', { class: 'field', rows: 3, placeholder: 'How you know them, things to remember…' });
  const err = el('div', { class: 'pd-err', role: 'alert' });
  if (p) { name.value = p.name; note.value = p.note || ''; }
  const sec = choiceGroup('Section', sections.map((s) => ({ value: s.id, label: s.name, color: s.color })),
    p ? p.sectionId : sections[0]?.id);
  const ring = choiceGroup('Circle', RINGS.map((r) => ({ value: r.n, label: r.name })), p ? Number(p.ring) : 2);
  const save = async () => {
    const d = { name: name.value.trim(), note: note.value.trim(), sectionId: sec.get(), ring: Number(ring.get()) };
    if (!d.name) { err.textContent = 'Please enter a name.'; name.focus(); return; }
    if (!d.sectionId) { err.textContent = 'Create a section first.'; return; }
    if (p) await store.update('people', p.id, d);
    else await store.insert('people', { ...d, boardId: activeBoardId });
    selected = null; adding = false;
    await load();
  };
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
  const foot = el('div', { class: 'pd-foot' });
  if (p) {
    foot.append(confirmDel
      ? el('button', { class: 'btn danger', onclick: async () => { await store.remove('people', p.id); confirmDel = false; selected = null; await load(); } }, 'Confirm delete')
      : el('button', { class: 'btn ghost', onclick: () => { confirmDel = true; render(); } }, 'Delete'));
  }
  foot.append(el('span', { class: 'grow' }),
    el('button', { class: 'btn ghost', onclick: closeDialog }, 'Cancel'),
    el('button', { class: 'btn primary', onclick: save }, p ? 'Save changes' : 'Add person'));
  const box = el('div', { class: 'panel pd-box', role: 'dialog', 'aria-modal': 'true', 'aria-label': p ? 'Edit person' : 'Add person' },
    el('h2', {}, p ? 'Edit person' : 'Add person'),
    field('Name', name),
    el('div', { class: 'pd-field' }, el('span', {}, 'Section'), sec.node),
    el('div', { class: 'pd-field' }, el('span', {}, 'Circle'), ring.node),
    field('Note (optional)', note),
    err, foot);
  const overlay = el('div', { class: 'pd-overlay', onmousedown: (e) => { if (e.target === overlay) closeDialog(); } }, box);
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDialog(); });
  setTimeout(() => (p ? box.querySelector('.btn.primary') : name).focus(), 0);
  return overlay;
}

function sectionPanel() {
  const name = el('input', { class: 'field', placeholder: 'New section, e.g. Neighbours', 'aria-label': 'Section name' });
  const add = async () => {
    const v = name.value.trim();
    if (!v) return;
    await store.insert('sections', { name: v, color: COLORS[sections.length % COLORS.length], boardId: activeBoardId });
    await load();
  };
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  const list = el('div', { class: 'rm-list' });
  sections.forEach((s) => {
    const count = people.filter((p) => p.sectionId === s.id).length;
    list.append(el('div', { class: 'rm-item', style: 'cursor:default' },
      el('span', { class: 'rm-dot', style: `background:var(--${s.color})` }),
      el('span', { class: 'grow' }, s.name),
      el('span', { class: 'muted' }, String(count)),
      el('button', {
        class: 'btn ghost', 'aria-label': `Delete section ${s.name}`,
        title: count ? 'Move or remove the people in this section first' : 'Delete section',
        ...(count > 0 ? { disabled: '' } : {}),
        onclick: async () => {
          if (people.some((p) => p.sectionId === s.id)) return;
          await store.remove('sections', s.id);
          await load();
        },
      }, '✕')));
  });
  return el('div', { class: 'panel' }, el('h2', {}, 'Sections'),
    el('div', { class: 'row' }, name, el('button', { class: 'btn primary', onclick: add }, 'Add')), list);
}

function peoplePanel() {
  const list = el('div', { class: 'rm-list' });
  if (!people.length) list.append(el('span', { class: 'muted' }, 'No people yet.'));
  [...people].sort((a, b) => a.ring - b.ring || a.name.localeCompare(b.name)).forEach((p) => {
    list.append(el('button', { class: 'rm-item' + (selected === p.id ? ' sel' : ''), onclick: () => { selected = p.id; render(); } },
      el('span', { class: 'rm-dot', style: `background:${colorOf(p.sectionId)}` }),
      el('span', { class: 'grow' }, p.name),
      el('span', { class: 'muted' }, RINGS[p.ring - 1]?.name || '')));
  });
  return el('div', { class: 'panel' },
    el('div', { class: 'row' }, el('h2', { class: 'grow', style: 'margin:0' }, `People (${people.length})`),
      el('button', { class: 'btn primary', onclick: () => { adding = true; selected = null; render(); } }, '+ Add person')),
    list);
}

const ICON = {
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
};
function icon(name) {
  const s = el('span', { class: 'mi-ic' });
  if (ICON[name]) s.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;
  return s;
}

// Title bar, the same as the Tasks board: board switcher with its menu, and icon buttons for new board and rename.
function titleBar() {
  const cur = boards.find((b) => b.id === activeBoardId);
  const bsel = el('button', {
    class: 'bsel', 'aria-haspopup': 'menu', 'aria-expanded': String(boardMenuOpen), title: 'Switch board',
    onclick: (e) => { e.stopPropagation(); boardMenuOpen = !boardMenuOpen; render(); },
  }, icon('grid'), el('span', { class: 'bsel-name' }, cur ? cur.name : 'Board'), icon('chevron'));
  return el('div', { class: 'panel rm-title' },
    el('i', { class: 'rm-logo' }),
    el('div', { class: 'rm-bsel-wrap' }, bsel, ...(boardMenuOpen ? [boardMenu()] : [])),
    el('button', { class: 'ibtn', title: 'New board', 'aria-label': 'New board', onclick: () => openBoardDialog(null) }, icon('plus')),
    el('button', { class: 'ibtn', title: 'Rename board', 'aria-label': 'Rename board', onclick: () => openBoardDialog(cur) }, icon('edit')));
}

function boardMenu() {
  const item = (cls, iconName, label, fn, checked) => el('button', {
    class: 'mi ' + cls, role: checked === undefined ? 'menuitem' : 'menuitemradio',
    ...(checked !== undefined ? { 'aria-checked': String(checked) } : {}),
    onclick: (e) => { e.stopPropagation(); boardMenuOpen = false; fn(); },
  }, icon(iconName), el('span', { class: 'mi-t' }, label));
  return el('div', { class: 'panel rm-bmenu', role: 'menu' },
    ...boards.map((b) => item('', b.id === activeBoardId ? 'check' : '', b.name, () => switchBoard(b.id), b.id === activeBoardId)),
    el('div', { class: 'msep' }),
    item('act', 'plus', 'New board', () => openBoardDialog(null)),
    item('act', 'grid', 'All boards overview', () => { overviewOpen = true; selected = null; adding = false; render(); }));
}

function openBoardDialog(board) {
  boardEditing = board;
  boardDialogOpen = true;
  render();
}

function boardDialog() {
  if (!boardDialogOpen) return null;
  const name = el('input', { class: 'field', maxlength: 40, placeholder: 'e.g. Family, Work, Club', 'aria-label': 'Board name' });
  name.value = boardEditing ? boardEditing.name : '';
  const err = el('div', { class: 'pd-err', role: 'alert' });
  const close = () => { boardDialogOpen = false; boardEditing = null; render(); };
  const save = async () => {
    const v = name.value.trim();
    if (!v) { err.textContent = 'Please enter a name.'; name.focus(); return; }
    if (boardEditing) {
      await store.update('boards', boardEditing.id, { name: v });
      boardEditing.name = v;
      close();
      return;
    }
    const rec = await store.insert('boards', { name: v });
    await seedSections(rec.id);
    boards.push(rec);
    allSections = await store.list('sections');
    boardDialogOpen = false;
    boardEditing = null;
    await switchBoard(rec.id);
  };
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
  const box = el('div', { class: 'panel pd-box', role: 'dialog', 'aria-modal': 'true', 'aria-label': boardEditing ? 'Rename board' : 'New board' },
    el('h2', {}, boardEditing ? 'Rename board' : 'New board'),
    el('div', { class: 'pd-field' }, el('span', {}, 'Name'), name),
    err,
    el('div', { class: 'pd-foot' }, el('span', { class: 'grow' }),
      el('button', { class: 'btn ghost', onclick: close }, 'Cancel'),
      el('button', { class: 'btn primary', onclick: save }, boardEditing ? 'Save' : 'Create board')));
  const overlay = el('div', { class: 'pd-overlay', onmousedown: (e) => { if (e.target === overlay) close(); } }, box);
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  setTimeout(() => name.focus(), 0);
  return overlay;
}

async function deleteBoard(id) {
  if (boards.length <= 1) return;
  for (const p of allPeople.filter((x) => x.boardId === id)) await store.remove('people', p.id);
  for (const s of allSections.filter((x) => x.boardId === id)) await store.remove('sections', s.id);
  await store.remove('boards', id);
  boards = boards.filter((b) => b.id !== id);
  allPeople = allPeople.filter((x) => x.boardId !== id);
  allSections = allSections.filter((x) => x.boardId !== id);
  confirmBoardDelete = null;
  if (activeBoardId === id) await switchBoard(boards[0].id);
  else render();
}

function boardDeleteDialog() {
  const b = boards.find((x) => x.id === confirmBoardDelete);
  if (!b) return null;
  const cancel = () => { confirmBoardDelete = null; render(); };
  const box = el('div', { class: 'panel pd-box', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': 'Delete board' },
    el('h2', {}, 'Delete board?'),
    el('p', { class: 'pd-text' }, `Are you sure you want to delete "${b.name}" and all its people and sections? This cannot be undone.`),
    el('div', { class: 'pd-foot' }, el('span', { class: 'grow' }),
      el('button', { class: 'btn ghost', onclick: cancel }, 'Cancel'),
      el('button', { class: 'btn danger', onclick: () => deleteBoard(b.id) }, 'Delete')));
  const overlay = el('div', { class: 'pd-overlay', onmousedown: (e) => { if (e.target === overlay) cancel(); } }, box);
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') cancel(); });
  return overlay;
}

function overviewPage() {
  const cards = boards.map((b) => {
    const ppl = allPeople.filter((p) => p.boardId === b.id).length;
    const secs = allSections.filter((s) => s.boardId === b.id).length;
    const open = el('button', { class: 'bcard' + (b.id === activeBoardId ? ' current' : ''), onclick: () => switchBoard(b.id) },
      el('div', { class: 'bcard-name' }, b.name),
      el('div', { class: 'bcard-sub' }, `${ppl} ${ppl === 1 ? 'person' : 'people'} · ${secs} ${secs === 1 ? 'section' : 'sections'}`));
    const trash = sv('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
      sv('path', { d: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3' }));
    const del = el('button', { class: 'bcard-del', title: 'Delete board', 'aria-label': `Delete board ${b.name}`,
      onclick: (e) => { e.stopPropagation(); confirmBoardDelete = b.id; render(); } }, trash);
    return el('div', { class: 'bcardwrap' }, open, del);
  });
  return el('div', { class: 'overview' },
    el('div', { class: 'ov-head' },
      el('h1', {}, 'Boards'),
      el('span', { class: 'muted ov-count' }, `${boards.length} ${boards.length === 1 ? 'board' : 'boards'}`)),
    el('div', { class: 'bgrid' }, ...cards,
      el('button', { class: 'bcard add', onclick: () => openBoardDialog(null) }, '+ New board')));
}

function render() {
  const dlg = personDialog();
  const body = overviewOpen
    ? overviewPage()
    : el('div', { class: 'rm' },
        el('div', { class: 'rm-map panel' }, buildMap()),
        el('div', { class: 'rm-side' }, peoplePanel(), sectionPanel()));
  // The title bar is only shown on a board; the overview has its own heading.
  document.body.replaceChildren(el('div', { class: 'rm-page' }, ...(overviewOpen ? [] : [titleBar()]), body),
    ...[dlg, boardDialog(), boardDeleteDialog()].filter(Boolean));
}

document.addEventListener('pointerdown', (e) => {
  if (boardMenuOpen && !e.target.closest?.('.rm-bsel-wrap')) { boardMenuOpen = false; render(); }
});

load();
