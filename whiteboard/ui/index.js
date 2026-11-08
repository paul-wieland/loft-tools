const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = new URL('./styles.css', import.meta.url).href;
document.head.appendChild(link);

const COLORS = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange', 'white', 'dark'];
const SHAPE_PTS = {
  diamond: '50,0 100,50 50,100 0,50',
  triangle: '50,0 100,100 0,100',
  hexagon: '25,0 75,0 100,50 75,100 25,100 0,50',
  star: '50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35',
};
const POLY = Object.keys(SHAPE_PTS);
const BORDERED = ['rect', 'ellipse', ...POLY];
const FILLED = ['sticky', 'rect', 'ellipse', ...POLY];
const FONTS = {
  sans: 'Inter,-apple-system,"Segoe UI",system-ui,sans-serif',
  serif: 'Georgia,"Times New Roman",serif',
  mono: 'ui-monospace,Menlo,Consolas,monospace',
  hand: '"Marker Felt","Comic Sans MS","Bradley Hand",cursive',
};
const SIZES = {
  sticky: [180, 180], rect: [200, 120], ellipse: [160, 160], diamond: [180, 180], triangle: [180, 160],
  hexagon: [190, 165], star: [180, 170], text: [220, 50], arrow: [0, 0],
};
const FILL_DEF = { sticky: 'yellow', rect: 'white', ellipse: 'blue', diamond: 'green', triangle: 'orange', hexagon: 'pink', star: 'yellow', text: 'none', arrow: 'dark' };
const FIELDS = ['boardId', 'kind', 'x', 'y', 'w', 'h', 'x2', 'y2', 'text', 'color', 'fs', 'ff', 'bold', 'italic', 'underline', 'strike', 'ha', 'va', 'tc', 'stroke', 'sw', 'dash', 'opacity', 'rot', 'z', 'locked', 'head', 'curve', 'from', 'to', 'fromPort', 'toPort'];
const defaults = (k) => ({
  color: FILL_DEF[k] || 'white', fs: k === 'text' ? 26 : 17, ff: 'sans', bold: k === 'text', italic: false, underline: false, strike: false,
  ha: k === 'sticky' ? 'left' : 'center', va: k === 'sticky' ? 'top' : 'middle', tc: '',
  stroke: k === 'arrow' ? '#2b2f45' : '#1d2033', sw: k === 'arrow' ? 3 : BORDERED.includes(k) ? 2.5 : 0, dash: 'solid',
  opacity: 1, rot: 0, z: 0, locked: false, head: 'end', curve: false,
});
function normalize(it) {
  const d = defaults(it.kind);
  Object.keys(d).forEach((k) => { if (it[k] === undefined || it[k] === null) it[k] = d[k]; });
  if (it.kind === 'text') it.color = 'none';
  return it;
}
const toStore = (it) => { const o = {}; FIELDS.forEach((k) => { if (it[k] !== undefined) o[k] = it[k]; }); return o; };

const ICONS = {
  select: '<path d="M5 3l14 8-6 2-2 6z"/>',
  sticky: '<path d="M4 4h16v10l-6 6H4z"/><path d="M14 20v-6h6"/>',
  rect: '<rect x="4" y="5" width="16" height="14" rx="3"/>',
  ellipse: '<circle cx="12" cy="12" r="8"/>',
  diamond: '<path d="M12 3l9 9-9 9-9-9z"/>',
  triangle: '<path d="M12 4l9 16H3z"/>',
  hexagon: '<path d="M7 4h10l5 8-5 8H7l-5-8z"/>',
  star: '<path d="M12 3l2.7 5.9 6.3.7-4.7 4.3 1.3 6.3L12 17l-5.6 3.2 1.3-6.3L3 9.6l6.3-.7z"/>',
  text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
  arrow: '<path d="M5 19L19 5M10 5h9v9"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/>',
  hl: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
  hc: '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
  hr: '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
  vt: '<path d="M4 4h16M12 20V8M8 12l4-4 4 4"/>',
  vm: '<path d="M4 12h16M12 4v5M12 20v-5M9 7l3 3 3-3M9 17l3-3 3 3"/>',
  vb: '<path d="M4 20h16M12 4v12M8 12l4 4 4-4"/>',
  front: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 012-2h10"/>',
  back: '<rect x="4" y="4" width="12" height="12" rx="2"/><path d="M20 8v10a2 2 0 01-2 2H8"/>',
  dup: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  unlock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 017.5-2"/>',
  curve: '<path d="M4 19C4 8 20 16 20 5"/>',
  snap: '<path d="M4 4v16M12 4v16M20 4v16M4 4h16M4 12h16M4 20h16"/>',
};
const svgIcon = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;
const el = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; };

const items = new Map();
const nodes = new Map();
let tool = 'select', selected = null, view = { x: 0, y: 0, z: 1 }, editing = null, snap = false;
let hist = [], redoStack = [], clip = null, pasteN = 0;
const alias = new Map();
const resolve = (id) => { while (alias.has(id)) id = alias.get(id); return id; };

const stage = el('div', null, document.body); stage.id = 'stage';
const world = el('div', null, stage); world.id = 'world';
const NS = 'http://www.w3.org/2000/svg';
const links = document.createElementNS(NS, 'svg'); links.id = 'links'; world.appendChild(links);

const title = el('div', 'panel', document.body); title.id = 'title';
title.innerHTML = '<i></i>';
const boardSel = el('button', 'bsel', title); boardSel.setAttribute('aria-label', 'Current board, show all boards'); boardSel.title = 'All boards';
const boardName = el('input', 'bname', title); boardName.hidden = true; boardName.setAttribute('aria-label', 'Board name'); boardName.maxLength = 60;
const mkTBtn = (icon, label) => { const b = el('button', 'btn small', title); b.innerHTML = svgIcon(icon); b.title = label; b.setAttribute('aria-label', label); return b; };
const addBoardBtn = mkTBtn('plus', 'New board');
const renBoardBtn = mkTBtn('edit', 'Rename board');

const toolbar = el('div', 'panel', document.body); toolbar.id = 'toolbar';
toolbar.setAttribute('role', 'toolbar'); toolbar.setAttribute('aria-label', 'Tools');
const toolBtns = {};
[['select', 'Select (V)'], ['sticky', 'Sticky note (N)'], ['rect', 'Rectangle (R)'], ['ellipse', 'Ellipse (O)'], ['diamond', 'Diamond (D)'], ['triangle', 'Triangle (G)'], ['hexagon', 'Hexagon (H)'], ['star', 'Star (S)'], ['text', 'Text (T)'], ['arrow', 'Line / arrow (L)']].forEach(([k, label], i) => {
  if (i === 1 || i === 8) el('div', 'sep', toolbar);
  const b = el('button', 'btn', toolbar); b.innerHTML = svgIcon(k); b.title = label; b.setAttribute('aria-label', label);
  b.onclick = () => setTool(k); toolBtns[k] = b;
});
el('div', 'sep', toolbar);
const undoBtn = el('button', 'btn', toolbar); undoBtn.innerHTML = svgIcon('undo'); undoBtn.title = 'Undo (Ctrl/Cmd+Z)'; undoBtn.setAttribute('aria-label', 'Undo');
const redoBtn = el('button', 'btn', toolbar); redoBtn.innerHTML = svgIcon('redo'); redoBtn.title = 'Redo (Ctrl/Cmd+Shift+Z)'; redoBtn.setAttribute('aria-label', 'Redo');
undoBtn.onclick = () => undo(); redoBtn.onclick = () => redo();

// ---------- format bar ----------
const bar = el('div', 'panel', document.body); bar.id = 'colors'; bar.hidden = true;
bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Format selected item');
bar.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
const groups = [];
const grp = (kinds, label) => { const g = el('div', 'grp', bar); g.dataset.k = kinds; g.setAttribute('role', 'group'); g.setAttribute('aria-label', label); groups.push(g); return g; };
const tb = (parent, label, html, fn, cls) => { const b = el('button', 'btn tb' + (cls ? ' ' + cls : ''), parent); b.innerHTML = html; b.title = label; b.setAttribute('aria-label', label); b.onclick = fn; return b; };
const lab = (parent, text) => { const s = el('span', 'lbl', parent); s.textContent = text; return s; };
const numIn = (parent, label, min, max, step, fn) => {
  const i = el('input', 'num', parent); i.type = 'number'; i.min = min; i.max = max; i.step = step; i.title = label; i.setAttribute('aria-label', label);
  i.onchange = () => { const v = parseFloat(i.value); if (!isNaN(v) && selected) fn(Math.min(max, Math.max(min, v))); else syncBar(); };
  return i;
};
const selIn = (parent, label, opts, fn) => {
  const s = el('select', 'sel', parent); s.title = label; s.setAttribute('aria-label', label);
  opts.forEach(([v, t]) => { const o = el('option', null, s); o.value = v; o.textContent = t; });
  s.onchange = () => { if (selected) fn(s.value); }; return s;
};
const clrIn = (parent, label, fn) => {
  const i = el('input', 'clr', parent); i.type = 'color'; i.title = label; i.setAttribute('aria-label', label);
  i.oninput = () => { if (selected) fn(i.value); }; return i;
};
const sel1 = () => items.get(selected);

const gFill = grp(FILLED.join(' '), 'Fill color');
const swBtns = {};
COLORS.forEach((c) => {
  const b = el('button', 'sw', gFill); b.style.background = `var(--${c})`; b.title = c; b.setAttribute('aria-label', 'Fill ' + c);
  b.onclick = () => selected && change(selected, { color: c }); swBtns[c] = b;
});
const swNone = el('button', 'sw none', gFill); swNone.title = 'No fill'; swNone.setAttribute('aria-label', 'No fill');
swNone.onclick = () => selected && change(selected, { color: 'none' });
const fillClr = clrIn(gFill, 'Custom fill color', (v) => change(selected, { color: v }));

const gStroke = grp('sticky text ' + BORDERED.join(' '), 'Border');
lab(gStroke, 'Border');
const strokeClr = clrIn(gStroke, 'Border color', (v) => change(selected, { stroke: v }));
const swSel = selIn(gStroke, 'Border width', [['0', 'None'], ['1', '1 px'], ['2.5', '2.5 px'], ['4', '4 px'], ['6', '6 px'], ['10', '10 px']], (v) => change(selected, { sw: parseFloat(v) }));
const dashSel = selIn(gStroke, 'Border style', [['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted']], (v) => change(selected, { dash: v }));

const gArrow = grp('arrow', 'Line');
const aClr = clrIn(gArrow, 'Line color', (v) => change(selected, { stroke: v }));
const aW = selIn(gArrow, 'Line thickness', [['1.5', 'Thin'], ['3', 'Normal'], ['5', 'Thick'], ['8', 'Heavy']], (v) => change(selected, { sw: parseFloat(v) }));
const aDash = selIn(gArrow, 'Line style', [['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted']], (v) => change(selected, { dash: v }));
const aHead = selIn(gArrow, 'Arrowheads', [['none', 'No heads'], ['end', 'Arrow at end'], ['start', 'Arrow at start'], ['both', 'Both ends']], (v) => change(selected, { head: v }));
const aCurve = tb(gArrow, 'Curved line', svgIcon('curve'), () => { const it = sel1(); if (it) change(selected, { curve: !it.curve }); });

const gText = grp('sticky text ' + BORDERED.join(' '), 'Text formatting');
const ffSel = selIn(gText, 'Font', [['sans', 'Sans'], ['serif', 'Serif'], ['mono', 'Mono'], ['hand', 'Handwriting']], (v) => change(selected, { ff: v }));
const fsIn = numIn(gText, 'Font size', 8, 200, 1, (v) => change(selected, { fs: v }));
const fsM = tb(gText, 'Smaller text', svgIcon('minus'), () => { const it = sel1(); if (it) change(selected, { fs: Math.max(8, it.fs - 2) }); }, 'xs');
const fsP = tb(gText, 'Larger text', svgIcon('plus'), () => { const it = sel1(); if (it) change(selected, { fs: Math.min(200, it.fs + 2) }); }, 'xs');
const fmt = {};
[['bold', 'Bold (Ctrl/Cmd+B)', '<b>B</b>'], ['italic', 'Italic (Ctrl/Cmd+I)', '<i>I</i>'], ['underline', 'Underline (Ctrl/Cmd+U)', '<u>U</u>'], ['strike', 'Strikethrough', '<s>S</s>']].forEach(([k, l, h]) => {
  fmt[k] = tb(gText, l, h, () => { const it = sel1(); if (it) change(selected, { [k]: !it[k] }); }, 'txt');
});
const tcClr = clrIn(gText, 'Text color', (v) => change(selected, { tc: v }));
const tcAuto = tb(gText, 'Automatic text color', '<span class="a">A</span>', () => selected && change(selected, { tc: '' }), 'xs');
const haB = {}, vaB = {};
[['left', 'hl', 'Align text left'], ['center', 'hc', 'Align text center'], ['right', 'hr', 'Align text right']].forEach(([v, i, l]) => { haB[v] = tb(gText, l, svgIcon(i), () => selected && change(selected, { ha: v }), 'xs'); });
[['top', 'vt', 'Align text to top'], ['middle', 'vm', 'Center text vertically'], ['bottom', 'vb', 'Align text to bottom']].forEach(([v, i, l]) => { vaB[v] = tb(gText, l, svgIcon(i), () => selected && change(selected, { va: v }), 'xs'); });

const gSize = grp(['sticky', 'rect', 'ellipse', 'text', ...POLY].join(' '), 'Size and rotation');
lab(gSize, 'W'); const wIn = numIn(gSize, 'Width', 24, 5000, 1, (v) => change(selected, { w: Math.round(v) }));
lab(gSize, 'H'); const hIn = numIn(gSize, 'Height', 24, 5000, 1, (v) => change(selected, { h: Math.round(v) }));
lab(gSize, '°'); const rotIn = numIn(gSize, 'Rotation in degrees', -360, 360, 1, (v) => change(selected, { rot: ((Math.round(v) % 360) + 360) % 360 }));

const gOp = grp('all', 'Opacity');
lab(gOp, 'Opacity');
const opIn = el('input', 'rng', gOp); opIn.type = 'range'; opIn.min = 0.1; opIn.max = 1; opIn.step = 0.05; opIn.title = 'Opacity'; opIn.setAttribute('aria-label', 'Opacity');
opIn.oninput = () => selected && change(selected, { opacity: parseFloat(opIn.value) });

const gAct = grp('all', 'Arrange');
const editBtn = tb(gAct, 'Edit text (Enter)', svgIcon('edit'), () => selected && startEdit(selected));
tb(gAct, 'Bring to front (Ctrl/Cmd+])', svgIcon('front'), () => zOrder(1));
tb(gAct, 'Send to back (Ctrl/Cmd+[)', svgIcon('back'), () => zOrder(-1));
tb(gAct, 'Duplicate (Ctrl/Cmd+D)', svgIcon('dup'), () => duplicate());
const lockBtn = tb(gAct, 'Lock', svgIcon('lock'), () => { const it = sel1(); if (it) change(selected, { locked: !it.locked }); });
const delBtn = tb(gAct, 'Delete (Del)', svgIcon('trash'), () => removeItem(selected), 'danger');

function syncBar() {
  const it = sel1();
  bar.hidden = !it;
  if (!it) return;
  groups.forEach((g) => { g.hidden = !(g.dataset.k === 'all' || g.dataset.k.split(' ').includes(it.kind)); });
  COLORS.forEach((c) => swBtns[c].setAttribute('aria-pressed', String(it.color === c)));
  swNone.setAttribute('aria-pressed', String(it.color === 'none'));
  if (/^#/.test(it.color)) fillClr.value = it.color;
  strokeClr.value = aClr.value = /^#/.test(it.stroke) ? it.stroke : '#1d2033';
  swSel.value = String(it.sw); if (swSel.value !== String(it.sw)) { const o = el('option', null, swSel); o.value = String(it.sw); o.textContent = it.sw + ' px'; swSel.value = o.value; }
  dashSel.value = aDash.value = it.dash;
  aW.value = String(it.sw); if (aW.value !== String(it.sw)) aW.selectedIndex = 1;
  aHead.value = it.head; aCurve.setAttribute('aria-pressed', String(!!it.curve));
  ffSel.value = it.ff; fsIn.value = it.fs;
  Object.keys(fmt).forEach((k) => fmt[k].setAttribute('aria-pressed', String(!!it[k])));
  tcClr.value = it.tc || (it.color === 'dark' ? '#ffffff' : '#1d2033');
  Object.keys(haB).forEach((k) => haB[k].setAttribute('aria-pressed', String(it.ha === k)));
  Object.keys(vaB).forEach((k) => vaB[k].setAttribute('aria-pressed', String(it.va === k)));
  wIn.value = Math.round(it.w); hIn.value = Math.round(it.h); rotIn.value = Math.round(it.rot);
  opIn.value = it.opacity;
  lockBtn.innerHTML = svgIcon(it.locked ? 'unlock' : 'lock');
  lockBtn.title = lockBtn.ariaLabel = it.locked ? 'Unlock' : 'Lock';
  lockBtn.setAttribute('aria-label', lockBtn.title); lockBtn.setAttribute('aria-pressed', String(!!it.locked));
  editBtn.hidden = it.kind === 'arrow';
}

const zoomP = el('div', 'panel', document.body); zoomP.id = 'zoom';
const snapB = el('button', 'btn', zoomP); snapB.innerHTML = svgIcon('snap'); snapB.title = 'Snap to grid'; snapB.setAttribute('aria-label', 'Snap to grid'); snapB.setAttribute('aria-pressed', 'false');
snapB.onclick = () => { snap = !snap; snapB.setAttribute('aria-pressed', String(snap)); };
const zm = el('button', 'btn', zoomP); zm.innerHTML = svgIcon('minus'); zm.setAttribute('aria-label', 'Zoom out');
const zl = el('button', null, zoomP); zl.title = 'Reset zoom';
const zp = el('button', 'btn', zoomP); zp.innerHTML = svgIcon('plus'); zp.setAttribute('aria-label', 'Zoom in');
const zf = el('button', 'btn', zoomP); zf.innerHTML = svgIcon('fit'); zf.title = 'Fit content (F)'; zf.setAttribute('aria-label', 'Zoom to fit content');
zf.onclick = () => fitView();
function bounds(list) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  list.forEach((r) => {
    const xs = r.kind === 'arrow' ? [r.x, r.x2] : [r.x, r.x + r.w], ys = r.kind === 'arrow' ? [r.y, r.y2] : [r.y, r.y + r.h];
    x0 = Math.min(x0, ...xs); x1 = Math.max(x1, ...xs); y0 = Math.min(y0, ...ys); y1 = Math.max(y1, ...ys);
  });
  return { x0, y0, x1, y1 };
}
function fitView() {
  const list = [...items.values()];
  if (!list.length) { view = { x: innerWidth / 2, y: innerHeight / 2, z: 1 }; applyView(); return; }
  const { x0, y0, x1, y1 } = bounds(list);
  const pad = 120, w = Math.max(x1 - x0, 1), h = Math.max(y1 - y0, 1);
  const z = Math.min(1.5, Math.max(0.2, Math.min((innerWidth - pad * 2) / w, (innerHeight - pad * 2) / h)));
  view = { z, x: innerWidth / 2 - ((x0 + x1) / 2) * z, y: innerHeight / 2 - ((y0 + y1) / 2) * z };
  applyView();
}
zm.onclick = () => zoomAt(innerWidth / 2, innerHeight / 2, 1 / 1.2);
zp.onclick = () => zoomAt(innerWidth / 2, innerHeight / 2, 1.2);
zl.onclick = () => { view.z = 1; applyView(); };

const hint = el('div', null, document.body); hint.id = 'hint';
hint.innerHTML = '<b>Your board is empty</b>Pick a tool on the left and click the canvas.<br>Drag to pan · scroll to zoom · double-click to edit text<br>Select an item to change fill, border, font, alignment, size and more';

function setTool(t) {
  tool = t;
  Object.entries(toolBtns).forEach(([k, b]) => b.setAttribute('aria-pressed', String(k === t)));
  stage.className = t === 'select' ? '' : 'create';
}
function applyView() {
  world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.z})`;
  stage.style.backgroundSize = `${24 * view.z}px ${24 * view.z}px`;
  stage.style.backgroundPosition = `${view.x}px ${view.y}px`;
  zl.textContent = Math.round(view.z * 100) + '%';
}
function zoomAt(cx, cy, f) {
  const z = Math.min(3, Math.max(0.2, view.z * f)); f = z / view.z;
  view.x = cx - (cx - view.x) * f; view.y = cy - (cy - view.y) * f; view.z = z; applyView();
}
const toWorld = (e) => ({ x: (e.clientX - view.x) / view.z, y: (e.clientY - view.y) / view.z });

// ---------- rendering ----------
const fillCss = (it) => (it.color === 'none' ? 'transparent' : COLORS.includes(it.color) ? `var(--${it.color})` : it.color || 'transparent');
const dashArr = (dash, w) => (dash === 'dashed' ? `${w * 3},${w * 2.5}` : dash === 'dotted' ? `0.1,${w * 2.2}` : '');
const MIN = 24;

// Connection points on a box: the four corners and the middle of each side.
const PORTS = { n: [0.5, 0], ne: [1, 0], e: [1, 0.5], se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5], nw: [0, 0] };
function portPos(box, port) {
  const [fx, fy] = PORTS[port];
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2, r = ((box.rot || 0) * Math.PI) / 180;
  const dx = box.x + box.w * fx - cx, dy = box.y + box.h * fy - cy;
  return { x: cx + dx * Math.cos(r) - dy * Math.sin(r), y: cy + dx * Math.sin(r) + dy * Math.cos(r) };
}
function nearestPort(box, x, y) {
  let best = 'e', bestD = Infinity;
  for (const port of Object.keys(PORTS)) {
    const p = portPos(box, port), d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) { best = port; bestD = d; }
  }
  return best;
}
// The top-most non-arrow item under a world point, allowing a margin in world units.
function boxAt(x, y, margin) {
  let hit = null;
  for (const [id, box] of items) {
    if (box.kind === 'arrow') continue;
    if (x < box.x - margin || x > box.x + box.w + margin || y < box.y - margin || y > box.y + box.h + margin) continue;
    if (!hit || (box.z || 0) >= (hit.box.z || 0)) hit = { id, box };
  }
  return hit;
}
// Attach one end ('from' or 'to') of an arrow to the connection point nearest the drop point.
function attachAt(it, e, end) {
  const p = toWorld(e), hit = boxAt(p.x, p.y, 12 / view.z);
  it[end] = hit ? hit.id : '';
  it[end + 'Port'] = hit ? nearestPort(hit.box, p.x, p.y) : '';
}
function resolveArrow(it) {
  const r = { x: it.x, y: it.y, x2: it.x2, y2: it.y2 };
  const fromBox = it.from && items.get(it.from), toBox = it.to && items.get(it.to);
  if (fromBox) { const p = portPos(fromBox, it.fromPort || 'e'); r.x = p.x; r.y = p.y; }
  if (toBox) { const p = portPos(toBox, it.toPort || 'w'); r.x2 = p.x; r.y2 = p.y; }
  return r;
}
function renderAttached(id) {
  for (const [aid, a] of items) if (a.kind === 'arrow' && (a.from === id || a.to === id)) render(aid);
}
// Connection dots shown on the box under the pointer while drawing or hovering with the arrow tool.
let portDots = null;
function showPorts(box, active) {
  if (!portDots) {
    portDots = Object.keys(PORTS).map(() => {
      const c = document.createElementNS(NS, 'circle');
      c.style.pointerEvents = 'none'; c.style.display = 'none';
      links.appendChild(c);
      return c;
    });
  }
  Object.keys(PORTS).forEach((port, i) => {
    const c = portDots[i];
    if (!box) { c.style.display = 'none'; return; }
    const p = portPos(box, port);
    c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', 6 / view.z);
    c.style.display = '';
    c.style.fill = port === active ? 'var(--accent)' : 'var(--ui)';
    c.style.stroke = 'var(--accent)'; c.style.strokeWidth = 2 / view.z;
  });
}
function hoverPorts(e) {
  const p = toWorld(e), hit = boxAt(p.x, p.y, 12 / view.z);
  showPorts(hit && hit.box, hit && nearestPort(hit.box, p.x, p.y));
}
function arrowGeom(it) {
  const { x, y, x2, y2 } = resolveArrow(it); const dx = x2 - x, dy = y2 - y, len = Math.hypot(dx, dy) || 1;
  let cx = (x + x2) / 2, cy = (y + y2) / 2;
  if (it.curve) { cx += (-dy / len) * len * 0.3; cy += (dx / len) * len * 0.3; }
  const d = it.curve ? `M${x} ${y}Q${cx} ${cy} ${x2} ${y2}` : `M${x} ${y}L${x2} ${y2}`;
  const aEnd = it.curve ? Math.atan2(y2 - cy, x2 - cx) : Math.atan2(dy, dx);
  const aStart = it.curve ? Math.atan2(y - cy, x - cx) : Math.atan2(-dy, -dx);
  return { d, aEnd, aStart };
}
const head = (px, py, a, s) => {
  const p = (da) => `${px - s * Math.cos(a + da)},${py - s * Math.sin(a + da)}`;
  return `${px},${py} ${p(0.45)} ${p(-0.45)}`;
};
function renderArrow(id, it, n) {
  if (!n) {
    n = document.createElementNS(NS, 'g'); n.dataset.id = id;
    n.innerHTML = '<path class="hit" fill="none"/><path class="vis" fill="none"/><polygon class="h1"/><polygon class="h2"/><circle class="ep" data-ep="1" r="8"/><circle class="ep" data-ep="2" r="8"/>';
    links.appendChild(n); nodes.set(id, n);
  }
  const g = arrowGeom(it); const ends = resolveArrow(it); const [hit, vis, h1, h2, e1, e2] = n.children;
  hit.setAttribute('d', g.d); vis.setAttribute('d', g.d);
  const isSel = id === selected;
  vis.setAttribute('class', 'vis' + (isSel ? ' sel' : ''));
  vis.style.stroke = isSel ? '' : it.stroke; vis.style.strokeWidth = it.sw;
  vis.style.strokeDasharray = dashArr(it.dash, it.sw);
  vis.style.pointerEvents = 'none'; hit.style.pointerEvents = 'stroke';
  const hs = 8 + it.sw * 3;
  [[h1, it.head === 'start' || it.head === 'both', ends.x, ends.y, g.aStart], [h2, it.head === 'end' || it.head === 'both', ends.x2, ends.y2, g.aEnd]].forEach(([h, on, px, py, a]) => {
    h.style.display = on ? '' : 'none';
    if (on) h.setAttribute('points', head(px, py, a, hs));
    h.style.fill = isSel ? 'var(--accent)' : it.stroke; h.style.pointerEvents = 'none';
  });
  [[e1, ends.x, ends.y], [e2, ends.x2, ends.y2]].forEach(([c, px, py]) => {
    c.setAttribute('cx', px); c.setAttribute('cy', py);
    c.style.display = isSel && !it.locked ? '' : 'none'; c.style.pointerEvents = isSel ? 'all' : 'none';
  });
  n.style.opacity = it.opacity;
}
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
function render(id) {
  const it = items.get(id);
  let n = nodes.get(id);
  if (!it) { if (n) { n.remove(); nodes.delete(id); } return; }
  if (it.kind === 'arrow') { renderArrow(id, it, n); return; }
  if (!n) {
    n = el('div', 'item', world); n.dataset.id = id;
    if (POLY.includes(it.kind)) {
      const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'shape'); s.setAttribute('viewBox', '0 0 100 100'); s.setAttribute('preserveAspectRatio', 'none');
      s.innerHTML = `<polygon points="${SHAPE_PTS[it.kind]}" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`;
      n.appendChild(s);
    }
    const cl = el('div', 'clip', n); el('div', 't', cl);
    HANDLES.forEach((h) => { const e = el('div', 'handle', n); e.dataset.h = h; });
    el('div', 'handle', n).dataset.h = 'rot';
    nodes.set(id, n);
  }
  n.className = `item ${it.kind}${id === selected ? ' sel' : ''}${it.locked ? ' locked' : ''}${editing === id ? ' editing' : ''}`;
  let css = `left:${it.x}px;top:${it.y}px;width:${it.w}px;height:${it.h}px;opacity:${it.opacity};z-index:${it.z};transform:rotate(${it.rot}deg);`;
  const sw = it.sw;
  if (POLY.includes(it.kind)) {
    const p = n.querySelector('polygon');
    p.style.fill = fillCss(it); p.style.stroke = sw > 0 ? it.stroke : 'none'; p.style.strokeWidth = sw; p.style.strokeDasharray = dashArr(it.dash, sw);
  } else {
    if (it.kind !== 'text') css += `background:${fillCss(it)};`;
    css += sw > 0 ? `border:${sw}px ${it.dash} ${it.stroke};` : 'border:0;';
  }
  n.style.cssText = css;
  const c = n.querySelector('.clip'); c.style.alignItems = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }[it.va];
  const t = n.querySelector('.t');
  const dark = it.color === 'dark';
  t.style.cssText = `font-size:${it.fs}px;font-family:${FONTS[it.ff] || FONTS.sans};font-weight:${it.bold ? 700 : it.kind === 'sticky' ? 500 : 400};font-style:${it.italic ? 'italic' : 'normal'};`
    + `text-decoration:${[it.underline && 'underline', it.strike && 'line-through'].filter(Boolean).join(' ') || 'none'};text-align:${it.ha};color:${it.tc || (dark ? '#fff' : '#1d2033')};`;
  if (editing !== id && t.textContent !== it.text) t.textContent = it.text;
}
function renderAll() {
  nodes.forEach((_, id) => render(id)); items.forEach((_, id) => render(id));
  world.appendChild(links); // keep arrows and their end handles above the boxes
  hint.hidden = items.size > 0;
  syncBar();
  undoBtn.disabled = !hist.length; redoBtn.disabled = !redoStack.length;
}
function select(id) { const old = selected; selected = id; if (old) render(old); if (id) render(id); renderAll(); }

// ---------- data + history ----------
async function save(id) {
  const it = items.get(id); if (!it || it.temp) return;
  const d = toStore(it); delete d.boardId;
  try { await window.host.store.update('items', id, d); } catch (e) { /* ignore */ }
}
function pushH(e) {
  const last = hist[hist.length - 1], now = Date.now();
  if (e.type === 'upd' && last && last.type === 'upd' && last.id === e.id && now - last.t < 700
    && Object.keys(e.after).every((k) => k in last.after) && Object.keys(last.after).every((k) => k in e.after)) {
    Object.assign(last.after, e.after); last.t = now;
  } else hist.push({ ...e, t: now });
  if (hist.length > 200) hist.shift();
  redoStack.length = 0;
}
function change(id, p) {
  const it = items.get(id); if (!it) return;
  const before = {}; Object.keys(p).forEach((k) => { before[k] = it[k]; });
  pushH({ type: 'upd', id, before, after: { ...p } });
  Object.assign(it, p); render(id); renderAll(); save(id);
}
function recordGeom(id, o) {
  const it = items.get(id); if (!it || !o) return;
  const before = {}, after = {};
  ['x', 'y', 'w', 'h', 'x2', 'y2', 'rot'].forEach((k) => { if (o[k] !== undefined && o[k] !== it[k]) { before[k] = o[k]; after[k] = it[k]; } });
  if (Object.keys(after).length) pushH({ type: 'upd', id, before, after });
}
async function removeItem(id, noHist) {
  if (!id) return;
  const it = items.get(id);
  if (it && !noHist) pushH({ type: 'del', id, rec: toStore(it) });
  items.delete(id); if (selected === id) selected = null; render(id); renderAll();
  try { await window.host.store.remove('items', id); } catch (e) { /* ignore */ }
}
async function createRec(data) {
  const rec = await window.host.store.insert('items', toStore(data));
  const it = normalize({ ...data, ...rec });
  items.set(rec.id, it);
  render(rec.id);
  return rec.id;
}
const maxZ = () => [...items.values()].reduce((m, r) => Math.max(m, r.z || 0), 0);
const minZ = () => [...items.values()].reduce((m, r) => Math.min(m, r.z || 0), 0);
async function create(kind, x, y, noHist) {
  const [w, h] = SIZES[kind];
  const data = { boardId, kind, x: x - w / 2, y: y - h / 2, x2: x, y2: y, text: '', w, h, ...defaults(kind), z: maxZ() + 1 };
  if (kind === 'arrow') { data.x = x; data.y = y; }
  const id = await createRec(data);
  if (!noHist) pushH({ type: 'add', id, rec: toStore(items.get(id)) });
  select(id);
  return id;
}
function zOrder(dir) {
  const it = sel1(); if (!it) return;
  change(selected, { z: dir > 0 ? maxZ() + 1 : minZ() - 1 });
}
async function duplicate(src, off) {
  const it = src || sel1(); if (!it) return;
  const o = off || 30;
  const data = { ...toStore(it), boardId, x: it.x + o, y: it.y + o, x2: it.x2 + o, y2: it.y2 + o, z: maxZ() + 1, locked: false };
  const id = await createRec(data);
  pushH({ type: 'add', id, rec: toStore(items.get(id)) });
  select(id);
}
async function recreate(entry) {
  const old = entry.id;
  const id = await createRec({ ...entry.rec, boardId });
  entry.id = id; alias.set(old, id);
  return id;
}
async function applyH(entry, dir) {
  const id = resolve(entry.id);
  if (entry.type === 'upd') {
    const it = items.get(id); if (!it) return;
    Object.assign(it, dir === 'undo' ? entry.before : entry.after); render(id); renderAll(); save(id);
  } else if ((entry.type === 'add') === (dir === 'undo')) await removeItem(id, true);
  else select(await recreate(entry));
}
async function undo() {
  if (editing) return;
  const e = hist.pop(); if (!e) return;
  redoStack.push(e); await applyH(e, 'undo'); renderAll();
}
async function redo() {
  if (editing) return;
  const e = redoStack.pop(); if (!e) return;
  hist.push(e); await applyH(e, 'redo'); renderAll();
}

// ---------- editing ----------
function startEdit(id) {
  const it = items.get(id); if (!it || it.kind === 'arrow') return;
  editing = id; select(id); render(id);
  const t = nodes.get(id).querySelector('.t');
  t.textContent = it.text; t.contentEditable = 'plaintext-only';
  if (t.contentEditable !== 'plaintext-only') t.contentEditable = 'true';
  t.focus();
  const r = document.createRange(); r.selectNodeContents(t); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  const done = () => {
    t.removeEventListener('blur', done); t.contentEditable = 'false'; editing = null;
    const txt = t.innerText.replace(/\n$/, '');
    if (items.get(id) && txt !== items.get(id).text) change(id, { text: txt });
    render(id); renderAll();
  };
  t.addEventListener('blur', done);
  t.onkeydown = (e) => { if (e.key === 'Escape') t.blur(); e.stopPropagation(); };
}

// ---------- pointer ----------
let drag = null;
const DIRS = { nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0] };
const sn = (v) => (snap ? Math.round(v / 12) * 12 : v);
stage.addEventListener('pointerdown', async (e) => {
  if (editing) { if (e.target.closest('.t') && e.target.closest('.item')?.dataset.id === editing) return; document.activeElement.blur(); }
  const p = toWorld(e);
  const g = e.target.closest('#links g'), itemEl = e.target.closest('.item');
  const id = g ? g.dataset.id : itemEl ? itemEl.dataset.id : null;
  stage.setPointerCapture(e.pointerId);

  if (tool !== 'select' && !(e.button === 1)) {
    if (tool === 'arrow') {
      const d = { type: 'arrowEnd', id: null, pending: true }; drag = d;
      const hit = boxAt(p.x, p.y, 12 / view.z), fromPort = hit && nearestPort(hit.box, p.x, p.y);
      const start = hit ? portPos(hit.box, fromPort) : p;
      const nid = await create('arrow', sn(start.x), sn(start.y), true);
      if (hit && items.get(nid)) Object.assign(items.get(nid), { from: hit.id, fromPort });
      showPorts(null);
      d.id = nid; d.pending = false;
      if (drag !== d) { // pointer was released while creating
        if (items.get(nid)) removeItem(nid, true);
        setTool('select');
      }
      return;
    }
    const kind = tool;
    setTool('select');
    const nid = await create(kind, sn(p.x), sn(p.y));
    startEdit(nid); return;
  }
  if (id && e.button === 0) {
    const wasSel = selected === id;
    select(id);
    const it = items.get(id);
    const o = { x: it.x, y: it.y, w: it.w, h: it.h, x2: it.x2, y2: it.y2, rot: it.rot };
    const hnd = e.target.dataset && e.target.dataset.h, ep = e.target.dataset && e.target.dataset.ep;
    if (it.locked && !hnd && !ep) drag = { type: 'locked', id, wasSel, moved: false };
    else if (ep && !it.locked) drag = { type: 'ep', id, which: ep, o };
    else if (hnd === 'rot') drag = { type: 'rotate', id, o };
    else if (hnd) drag = { type: 'resize', id, h: hnd, sx: p.x, sy: p.y, o };
    else drag = { type: 'move', id, sx: p.x, sy: p.y, o, moved: false, wasSel };
  } else {
    select(null);
    drag = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
    stage.classList.add('pan');
  }
});
stage.addEventListener('pointermove', (e) => {
  if (!drag) { if (tool === 'arrow') hoverPorts(e); return; }
  if (drag.type === 'pan') { view.x = drag.vx + e.clientX - drag.sx; view.y = drag.vy + e.clientY - drag.sy; applyView(); return; }
  if (!drag.id) return;
  const p = toWorld(e); const it = items.get(drag.id); if (!it) return;
  if (drag.type === 'locked') { drag.moved = true; return; }
  if (drag.type === 'move') {
    const dx = p.x - drag.sx, dy = p.y - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) * view.z < 3) return;
    drag.moved = true;
    let nx = sn(drag.o.x + dx), ny = sn(drag.o.y + dy);
    const u = { x: nx, y: ny };
    if (it.kind === 'arrow') { u.x2 = drag.o.x2 + (nx - drag.o.x); u.y2 = drag.o.y2 + (ny - drag.o.y); u.from = ''; u.to = ''; }
    Object.assign(it, u); render(drag.id);
  } else if (drag.type === 'resize') {
    const o = drag.o, [hx, hy] = DIRS[drag.h], r = (o.rot * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r);
    const dx = p.x - drag.sx, dy = p.y - drag.sy;
    const lx = dx * cos + dy * sin, ly = -dx * sin + dy * cos;
    let w = hx ? Math.max(MIN, o.w + hx * lx) : o.w, h = hy ? Math.max(MIN, o.h + hy * ly) : o.h;
    if (hx && hy && e.shiftKey) { const s = Math.max(w / o.w, h / o.h); w = Math.max(MIN, o.w * s); h = Math.max(MIN, o.h * s); }
    const dw = w - o.w, dh = h - o.h;
    const sx = (hx * dw) / 2, sy = (hy * dh) / 2;
    const cx = o.x + o.w / 2 + sx * cos - sy * sin, cy = o.y + o.h / 2 + sx * sin + sy * cos;
    Object.assign(it, { w, h, x: cx - w / 2, y: cy - h / 2 });
    render(drag.id);
  } else if (drag.type === 'rotate') {
    const cx = drag.o.x + drag.o.w / 2, cy = drag.o.y + drag.o.h / 2;
    let a = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90;
    if (e.shiftKey) a = Math.round(a / 15) * 15;
    it.rot = ((Math.round(a) % 360) + 360) % 360; render(drag.id);
  } else if (drag.type === 'arrowEnd') { it.x2 = sn(p.x); it.y2 = sn(p.y); render(drag.id); hoverPorts(e); }
  else if (drag.type === 'ep') {
    if (drag.which === '1') { it.x = sn(p.x); it.y = sn(p.y); it.from = ''; } else { it.x2 = sn(p.x); it.y2 = sn(p.y); it.to = ''; }
    render(drag.id); hoverPorts(e);
  }
  if (it.kind !== 'arrow') renderAttached(drag.id);
});
const end = (e) => {
  if (!drag) return;
  const d = drag; drag = null; stage.classList.remove('pan');
  if (d.type === 'arrowEnd') {
    showPorts(null);
    if (!d.id) return;
    const it = items.get(d.id);
    if (it) attachAt(it, e, 'to');
    setTool('select');
    if (it && Math.hypot(it.x2 - it.x, it.y2 - it.y) < 8) { removeItem(d.id, true); return; }
    if (it) pushH({ type: 'add', id: d.id, rec: toStore(it) });
    save(d.id); renderAll(); return;
  }
  if (d.type === 'ep') { showPorts(null); if (items.get(d.id)) attachAt(items.get(d.id), e, d.which === '1' ? 'from' : 'to'); }
  if (d.id && d.type !== 'pan' && d.type !== 'locked') { recordGeom(d.id, d.o); save(d.id); renderAll(); }
  if ((d.type === 'move' || d.type === 'locked') && d.wasSel && !d.moved && items.get(d.id)?.kind !== 'arrow') startEdit(d.id);
};
stage.addEventListener('pointerup', end);
stage.addEventListener('pointercancel', end);
stage.addEventListener('dblclick', (e) => {
  // pointer capture retargets events to the stage, so hit-test by position
  const hit = document.elementFromPoint(e.clientX, e.clientY);
  const itemEl = (hit && hit.closest('.item')) || e.target.closest('.item');
  if (itemEl) startEdit(itemEl.dataset.id);
  else if (!(hit && hit.closest('#links g'))) { const p = toWorld(e); create('text', p.x, p.y).then(startEdit); }
});
stage.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
  else { view.x -= e.deltaX; view.y -= e.deltaY; applyView(); }
}, { passive: false });

document.addEventListener('keydown', (e) => {
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
  if (editing || e.altKey) return;
  const k = e.key.toLowerCase();
  if (e.metaKey || e.ctrlKey) {
    const it = sel1();
    if (k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (k === 'y') { e.preventDefault(); redo(); }
    else if (k === 'd' && it) { e.preventDefault(); duplicate(); }
    else if (k === 'c' && it) { e.preventDefault(); clip = toStore(it); pasteN = 0; }
    else if (k === 'v' && clip) { e.preventDefault(); pasteN++; duplicate(clip, 30 * pasteN); }
    else if (k === ']' && it) { e.preventDefault(); zOrder(1); }
    else if (k === '[' && it) { e.preventDefault(); zOrder(-1); }
    else if (it && it.kind !== 'arrow' && ['b', 'i', 'u'].includes(k)) {
      e.preventDefault(); const f = { b: 'bold', i: 'italic', u: 'underline' }[k]; change(selected, { [f]: !it[f] });
    }
    return;
  }
  const map = { v: 'select', n: 'sticky', r: 'rect', o: 'ellipse', d: 'diamond', g: 'triangle', h: 'hexagon', s: 'star', t: 'text', l: 'arrow' };
  if (map[k]) setTool(map[k]);
  else if ((k === 'delete' || k === 'backspace') && selected) { e.preventDefault(); removeItem(selected); }
  else if (k === 'enter' && selected) { e.preventDefault(); startEdit(selected); }
  else if (k === 'escape') { select(null); setTool('select'); }
  else if (k === 'f') fitView();
  else if (k === '0') { view.z = 1; applyView(); }
  else if (k.startsWith('arrow')) {
    e.preventDefault(); const it = sel1();
    if (it && !it.locked) {
      const s = e.shiftKey ? 10 : 1, dx = k === 'arrowleft' ? -s : k === 'arrowright' ? s : 0, dy = k === 'arrowup' ? -s : k === 'arrowdown' ? s : 0;
      const o = { x: it.x, y: it.y, x2: it.x2, y2: it.y2 };
      Object.assign(it, { x: it.x + dx, y: it.y + dy, x2: it.x2 + dx, y2: it.y2 + dy });
      render(selected); recordGeom(selected, o); save(selected); syncBar();
    } else if (!it) {
      const s = e.shiftKey ? 240 : 80;
      if (k === 'arrowleft') view.x += s; else if (k === 'arrowright') view.x -= s;
      else if (k === 'arrowup') view.y += s; else view.y -= s;
      applyView();
    }
  }
  else if (k === '+' || k === '=') zoomAt(innerWidth / 2, innerHeight / 2, 1.2);
  else if (k === '-') zoomAt(innerWidth / 2, innerHeight / 2, 1 / 1.2);
});

// ---------- init ----------
const store = window.host.store;
let boards = [], boardId = null;
const views = new Map();

function refreshBoards() {
  const cur = boards.find((b) => b.id === boardId);
  boardSel.innerHTML = svgIcon('grid') + '<span class="bsel-name"></span>' + svgIcon('chevron');
  boardSel.querySelector('.bsel-name').textContent = (cur && cur.name) || 'Untitled';
  boardSel.setAttribute('aria-haspopup', 'menu'); boardSel.setAttribute('aria-expanded', String(!bmenu.hidden));
  boardSel.title = 'Switch board';
}
async function loadBoard(id) {
  if (boardId) views.set(boardId, { ...view });
  boardId = id; selected = null; editing = null; overview.hidden = true; closeMenu();
  hist = []; redoStack = []; alias.clear();
  nodes.forEach((n) => n.remove()); nodes.clear(); items.clear();
  view = views.get(id) || { x: innerWidth / 2, y: innerHeight / 2, z: 1 };
  applyView(); refreshBoards(); renderAll();
  try {
    const all = await store.list('items');
    if (boardId !== id) return;
    all.filter((r) => r.boardId === id).forEach((r) => items.set(r.id, normalize(r)));
    items.forEach((_, i) => render(i));
  } catch (e) { /* start empty */ }
  renderAll();
}
async function addBoard() {
  const rec = await store.insert('boards', { name: 'Board ' + (boards.length + 1) });
  boards.push(rec); await loadBoard(rec.id);
}
function finishRename(commit) {
  if (boardName.hidden) return;
  boardName.hidden = true; boardSel.hidden = false;
  const b = boards.find((x) => x.id === boardId); const v = boardName.value.trim();
  if (commit && b && v && v !== b.name) { b.name = v; store.update('boards', b.id, { name: v }).catch(() => {}); }
  refreshBoards(); renBoardBtn.focus();
}
const overview = el('div', null, document.body); overview.id = 'overview'; overview.hidden = true;
function previewSvg(list) {
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'thumb'); svg.setAttribute('aria-hidden', 'true');
  if (!list.length) return null;
  const { x0, y0, x1, y1 } = bounds(list);
  const pad = 40; const w = Math.max(x1 - x0, 1) + pad * 2, h = Math.max(y1 - y0, 1) + pad * 2;
  svg.setAttribute('viewBox', `${x0 - pad} ${y0 - pad} ${w} ${h}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  [...list].sort((a, b) => (a.z || 0) - (b.z || 0)).forEach((r) => {
    let s;
    const col = r.color === 'none' ? 'transparent' : COLORS.includes(r.color) ? `var(--${r.color || 'yellow'})` : r.color || '#fff';
    if (r.kind === 'arrow') {
      s = document.createElementNS(NS, 'line');
      s.setAttribute('x1', r.x); s.setAttribute('y1', r.y); s.setAttribute('x2', r.x2); s.setAttribute('y2', r.y2);
      s.setAttribute('stroke', r.stroke || '#2b2f45'); s.setAttribute('stroke-width', 5); s.setAttribute('stroke-linecap', 'round');
    } else if (r.kind === 'text') {
      s = document.createElementNS(NS, 'rect');
      s.setAttribute('x', r.x); s.setAttribute('y', r.y + r.h / 2 - 5); s.setAttribute('width', r.w * 0.8); s.setAttribute('height', 10);
      s.setAttribute('rx', 5); s.setAttribute('fill', '#9aa0b8');
    } else if (POLY.includes(r.kind)) {
      s = document.createElementNS(NS, 'polygon');
      s.setAttribute('points', SHAPE_PTS[r.kind].split(' ').map((q) => { const [a, b] = q.split(','); return `${r.x + (a * r.w) / 100},${r.y + (b * r.h) / 100}`; }).join(' '));
      s.style.fill = col; s.setAttribute('stroke', r.stroke || '#2b2f45'); s.setAttribute('stroke-width', 4);
    } else {
      s = document.createElementNS(NS, r.kind === 'ellipse' ? 'ellipse' : 'rect');
      if (r.kind === 'ellipse') { s.setAttribute('cx', r.x + r.w / 2); s.setAttribute('cy', r.y + r.h / 2); s.setAttribute('rx', r.w / 2); s.setAttribute('ry', r.h / 2); }
      else { s.setAttribute('x', r.x); s.setAttribute('y', r.y); s.setAttribute('width', r.w); s.setAttribute('height', r.h); s.setAttribute('rx', r.kind === 'rect' ? 14 : 6); }
      s.style.fill = col;
      if (r.kind !== 'sticky') { s.setAttribute('stroke', r.stroke || '#2b2f45'); s.setAttribute('stroke-width', 4); }
    }
    if (r.rot && r.kind !== 'arrow') s.setAttribute('transform', `rotate(${r.rot} ${r.x + r.w / 2} ${r.y + r.h / 2})`);
    svg.appendChild(s);
  });
  return svg;
}
async function showOverview() {
  if (editing) document.activeElement.blur();
  select(null);
  overview.hidden = false;
  let all = [];
  try { all = await store.list('items'); } catch (e) { /* ignore */ }
  const byBoard = new Map();
  all.forEach((r) => { if (!byBoard.has(r.boardId)) byBoard.set(r.boardId, []); byBoard.get(r.boardId).push(r); });
  if (boardId) byBoard.set(boardId, [...items.values()]);
  overview.innerHTML = '';
  const headEl = el('div', 'ov-head', overview);
  const h = el('h1', null, headEl); h.textContent = 'Boards';
  const cnt = el('span', 'ov-count', headEl); cnt.textContent = boards.length + (boards.length === 1 ? ' board' : ' boards');
  const grid = el('div', 'ov-grid', overview);
  boards.forEach((b) => {
    const list = byBoard.get(b.id) || [];
    const wrap = el('div', 'cardwrap', grid);
    const card = el('button', 'card' + (b.id === boardId ? ' current' : ''), wrap);
    const xb = el('button', 'card-del', wrap); xb.innerHTML = svgIcon('trash');
    xb.title = 'Delete board'; xb.setAttribute('aria-label', 'Delete board ' + (b.name || 'Untitled'));
    xb.onclick = () => confirmDeleteBoard(b.id);
    const pv = el('div', 'card-pv', card);
    const svg = previewSvg(list);
    if (svg) pv.appendChild(svg); else { pv.classList.add('empty'); pv.textContent = 'Empty board'; }
    const meta = el('div', 'card-meta', card);
    const nm = el('div', 'card-name', meta); nm.textContent = b.name || 'Untitled';
    const sub = el('div', 'card-sub', meta);
    const d = b.updatedAt || b.createdAt;
    sub.textContent = list.length + (list.length === 1 ? ' item' : ' items') + (d ? ' · ' + new Date(d).toLocaleDateString() : '');
    card.onclick = () => loadBoard(b.id);
  });
  const add = el('button', 'card add', grid);
  add.innerHTML = svgIcon('plus') + '<span>New board</span>';
  add.onclick = () => addBoard();
  (grid.querySelector('.current') || grid.querySelector('.card')).focus();
}
overview.addEventListener('keydown', (e) => { if (e.key === 'Escape') overview.hidden = true; });
const bmenu = el('div', 'panel', document.body); bmenu.id = 'bmenu'; bmenu.hidden = true; bmenu.setAttribute('role', 'menu'); bmenu.setAttribute('aria-label', 'Boards');
function closeMenu(refocus) {
  if (bmenu.hidden) return;
  bmenu.hidden = true; boardSel.setAttribute('aria-expanded', 'false'); if (refocus) boardSel.focus();
}
function openMenu() {
  bmenu.innerHTML = '';
  const mk = (cls, icon, label, fn, checked) => {
    const b = el('button', 'mi ' + cls, bmenu); b.setAttribute('role', checked === undefined ? 'menuitem' : 'menuitemradio');
    if (checked !== undefined) b.setAttribute('aria-checked', String(checked));
    b.innerHTML = '<span class="mi-ic">' + (icon ? svgIcon(icon) : '') + '</span><span class="mi-t"></span>';
    b.querySelector('.mi-t').textContent = label; b.onclick = () => { closeMenu(); fn(); }; return b;
  };
  boards.forEach((b) => mk('', b.id === boardId ? 'check' : '', b.name || 'Untitled', () => { if (b.id !== boardId) loadBoard(b.id); }, b.id === boardId));
  el('div', 'msep', bmenu);
  mk('act', 'plus', 'New board', () => addBoard());
  mk('act', 'grid', 'All boards overview', () => showOverview());
  const r = boardSel.getBoundingClientRect();
  bmenu.style.left = r.left + 'px'; bmenu.style.top = r.bottom + 8 + 'px';
  bmenu.hidden = false; boardSel.setAttribute('aria-expanded', 'true');
  (bmenu.querySelector('[aria-checked=true]') || bmenu.firstChild).focus();
}
boardSel.onclick = () => (bmenu.hidden ? openMenu() : closeMenu());
bmenu.addEventListener('keydown', (e) => {
  const bs = [...bmenu.querySelectorAll('.mi')], i = bs.indexOf(document.activeElement);
  if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); bs[(i + 1) % bs.length].focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length].focus(); }
  else if (e.key === 'Tab') closeMenu();
});
document.addEventListener('pointerdown', (e) => { if (!bmenu.hidden && !bmenu.contains(e.target) && !boardSel.contains(e.target)) closeMenu(); });
addBoardBtn.onclick = () => addBoard();
renBoardBtn.onclick = () => {
  const b = boards.find((x) => x.id === boardId); if (!b) return;
  boardName.value = b.name; boardSel.hidden = true; boardName.hidden = false; boardName.focus(); boardName.select();
};
boardName.onkeydown = (e) => { if (e.key === 'Enter') finishRename(true); else if (e.key === 'Escape') finishRename(false); };
boardName.onblur = () => finishRename(true);
async function deleteBoard(gone) {
  const idx = boards.findIndex((b) => b.id === gone); if (idx < 0) return;
  boards.splice(idx, 1); views.delete(gone);
  const all = await store.list('items').catch(() => []);
  await Promise.all(all.filter((r) => r.boardId === gone).map((r) => store.remove('items', r.id).catch(() => {})));
  await store.remove('boards', gone).catch(() => {});
  if (!boards.length) boards.push(await store.insert('boards', { name: 'Board 1' }).catch(() => ({ id: 'local' + Date.now(), name: 'Board 1' })));
  if (gone === boardId) { boardId = null; await loadBoard(boards[Math.min(idx, boards.length - 1)].id); }
  else { refreshBoards(); if (!overview.hidden) await showOverview(); }
}
const dlgStyle = document.createElement('style');
dlgStyle.textContent = '.dlg-back{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:10000}'
  + '.dlg{background:var(--ui);color:var(--ink);border-radius:12px;padding:20px;max-width:360px;width:calc(100% - 32px);box-shadow:0 10px 40px rgba(0,0,0,.3);font:14px system-ui,sans-serif}'
  + '.dlg h2{margin:0 0 8px;font-size:16px}.dlg p{margin:0 0 16px;line-height:1.4}.dlg .row{display:flex;justify-content:flex-end;gap:8px}'
  + '.dlg button{padding:7px 14px;border-radius:8px;border:1px solid var(--line);background:var(--accent-soft);color:var(--ink);cursor:pointer;font:inherit}'
  + '.dlg button.danger{background:#d93025;border-color:#d93025;color:#fff}';
document.head.appendChild(dlgStyle);
function confirmDeleteBoard(id) {
  const b = boards.find((x) => x.id === id); if (!b) return;
  const prev = document.activeElement;
  const back = el('div', 'dlg-back', document.body);
  const dlg = el('div', 'dlg', back); dlg.setAttribute('role', 'alertdialog'); dlg.setAttribute('aria-modal', 'true');
  dlg.setAttribute('aria-labelledby', 'dlg-t'); dlg.setAttribute('aria-describedby', 'dlg-d');
  const h = el('h2', '', dlg); h.id = 'dlg-t'; h.textContent = 'Delete board?';
  const p = el('p', '', dlg); p.id = 'dlg-d';
  p.textContent = 'Are you sure you want to delete "' + (b.name || 'Untitled') + '" and all its items? This cannot be undone.';
  const row = el('div', 'row', dlg);
  const cancel = el('button', '', row); cancel.textContent = 'Cancel';
  const ok = el('button', 'danger', row); ok.textContent = 'Delete';
  const close = () => { back.remove(); if (prev && prev.isConnected) prev.focus(); };
  cancel.onclick = close;
  ok.onclick = async () => { close(); await deleteBoard(id); };
  back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
  back.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === cancel ? ok : cancel).focus(); }
  });
  cancel.focus();
}

setTool('select'); applyView();
try {
  boards = await store.list('boards');
  const all = await store.list('items');
  const orphans = all.filter((r) => !r.boardId || !boards.some((b) => b.id === r.boardId));
  if (!boards.length) boards.push(await store.insert('boards', { name: 'Board 1' }));
  if (orphans.length) await Promise.all(orphans.map((r) => store.update('items', r.id, { boardId: boards[0].id }).catch(() => {})));
} catch (e) { /* start empty */ }
if (!boards.length) boards.push({ id: 'local', name: 'Board 1' });
await loadBoard(boards[0].id);
