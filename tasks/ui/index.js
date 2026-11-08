const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'styles.css';
document.head.appendChild(link);

const COLS = [['todo', 'To do'], ['doing', 'In progress'], ['done', 'Done']];
const DOT = { todo: 'var(--blue)', doing: 'var(--orange)', done: 'var(--green)' };
const LABEL_COLORS = ['var(--blue)', 'var(--pink)', 'var(--green)', 'var(--purple)', 'var(--orange)', 'var(--yellow)'];
const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
};
const svgIcon = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;

let boards = [];
let tasks = [];
let activeBoardId = null;
let settings = null;
let labelFilter = new Set();
let dragId = null;
let overviewOpen = false;

// mk(tag, className, parent): creates an element and appends it to its parent.
const mk = (tag, cls, parent) => {
  const n = el(tag, cls ?? {});
  parent.append(n);
  return n;
};
// el(tag, className | props, ...children): a string is the class name; a Node child is appended.
const el = (tag, props = {}, ...kids) => {
  const n = document.createElement(tag);
  if (typeof props === 'string') n.className = props;
  else if (props) Object.assign(n, props);
  kids.forEach(k => { if (k) n.append(k); });
  return n;
};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const labelsOf = t => (t.labels || '').split(',').map(s => s.trim()).filter(Boolean);
const normalizeLabels = text => [...new Set(text.split(',').map(s => s.trim()).filter(Boolean))].join(',');
const labelColor = name => LABEL_COLORS[[...name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % LABEL_COLORS.length];
const labelChip = name => el('span', { className: 'lbl', textContent: name, style: `background:${labelColor(name)}` });
const activeBoard = () => boards.find(b => b.id === activeBoardId) ?? null;
const openCount = list => list.filter(t => t.status !== 'done').length;
const dueTodayCount = list => list.filter(t => t.due === today() && t.status !== 'done').length;

// Title bar, same as the Whiteboard: board switcher and board actions.
document.body.classList.add('board-app');
const title = mk('div', 'panel', document.body);
title.id = 'title';
title.innerHTML = '<i></i>';
const boardSel = mk('button', 'bsel', title);
boardSel.setAttribute('aria-label', 'Current board, show all boards');
boardSel.title = 'Switch board';
const boardName = mk('input', 'bname', title);
boardName.hidden = true;
boardName.maxLength = 40;
boardName.setAttribute('aria-label', 'Board name');
const mkIBtn = (icon, label) => {
  const b = mk('button', 'ibtn small', title);
  b.innerHTML = svgIcon(icon);
  b.title = label;
  b.setAttribute('aria-label', label);
  return b;
};
const addBoardBtn = mkIBtn('plus', 'New board');
const renBoardBtn = mkIBtn('edit', 'Rename board');
const badge = mk('span', 'badge', title);
badge.hidden = true;

// Vertical tool bar on the left, same as the Whiteboard.
const toolbar = mk('div', 'panel', document.body);
toolbar.id = 'toolbar';
toolbar.setAttribute('role', 'toolbar');
toolbar.setAttribute('aria-label', 'Tools');
const newTaskBtn = mk('button', 'ibtn', toolbar);
newTaskBtn.innerHTML = svgIcon('plus');
newTaskBtn.title = 'New task (N)';
newTaskBtn.setAttribute('aria-label', 'New task');
mk('div', 'sep', toolbar);
const blurBtn = mk('button', 'ibtn', toolbar);
blurBtn.innerHTML = svgIcon('eye');
blurBtn.title = 'Blur titles, labels and dates';
blurBtn.setAttribute('aria-label', 'Blur titles, labels and dates');
blurBtn.setAttribute('aria-pressed', 'false');
mk('div', 'sep', toolbar);
const overviewBtn = mk('button', 'ibtn', toolbar);
overviewBtn.innerHTML = svgIcon('grid');
overviewBtn.title = 'All boards';
overviewBtn.setAttribute('aria-label', 'All boards overview');

// Board area: label filter above the three columns.
const main = mk('div', null, document.body);
main.id = 'main';
const filters = mk('div', 'filters', main);
const board = mk('div', 'board', main);
// Column headers get a shadow while the board is scrolled, so they read as sitting above the tasks.
board.addEventListener('scroll', () => board.classList.toggle('scrolled', board.scrollTop > 0));

function applyBlur(on) {
  document.body.classList.toggle('blurred', on);
  blurBtn.setAttribute('aria-pressed', String(on));
}
blurBtn.onclick = () => {
  const on = !document.body.classList.contains('blurred');
  applyBlur(on);
  saveSettings({ blur: on });
};

async function saveSettings(patch) {
  try {
    if (settings) {
      await window.host.store.update('settings', settings.id, patch);
      Object.assign(settings, patch);
    } else {
      settings = await window.host.store.insert('settings', { key: 'ui', blur: false, boardId: activeBoardId ?? '', ...patch });
    }
  } catch (e) { /* keep in-memory state */ }
}

// Task dialog.
const dlg = el('dialog');
const form = el('form');
const fTitle = el('input', { className: 'field', id: 'f-title', placeholder: 'What needs to be done?', required: true, maxLength: 120 });
const fDesc = el('textarea', { className: 'field', id: 'f-desc', placeholder: 'Add a description...', rows: 4 });
const fDue = el('input', { className: 'field', id: 'f-due', type: 'date' });
const fLabels = el('input', { className: 'field', id: 'f-labels', placeholder: 'bug, urgent, home', maxLength: 200 });
const labelPreview = el('div', { className: 'lblprev' });
const renderLabelPreview = () => {
  labelPreview.replaceChildren(...normalizeLabels(fLabels.value).split(',').filter(Boolean).map(labelChip));
  labelPreview.hidden = labelPreview.childElementCount === 0;
};
fLabels.oninput = renderLabelPreview;
const cancel = el('button', { type: 'button', className: 'btn ghost', textContent: 'Cancel' });
const save = el('button', { type: 'submit', className: 'btn primary', textContent: 'Create' });
const dlgTitle = el('h3', { textContent: 'Create task' });
const dlgIcon = el('span', { className: 'dicon' });
dlgIcon.innerHTML = svgIcon('plus');
const closeX = el('button', { type: 'button', className: 'close', ariaLabel: 'Close' });
closeX.innerHTML = svgIcon('x');
closeX.onclick = () => dlg.close();
const group = (label, input, req) => {
  const l = el('label', { htmlFor: input.id, textContent: label });
  if (req) l.append(el('span', { className: 'req', textContent: ' *' }));
  return el('div', { className: 'group' }, l, input);
};
form.append(
  el('div', { className: 'dhead' }, el('div', { className: 'dtitle' }, dlgTitle)),
  el('div', { className: 'dbody' },
    group('Summary', fTitle, true), group('Description', fDesc), group('Due date', fDue),
    el('div', { className: 'group' }, el('label', { htmlFor: 'f-labels', textContent: 'Labels' }), fLabels, labelPreview)),
  el('div', { className: 'dfoot' }, cancel, save));
dlg.append(form);
document.body.append(dlg);
let editing = null;

function openDlg(t) {
  editing = t;
  dlgTitle.textContent = t ? 'Edit task' : 'Create task';
  save.textContent = t ? 'Save' : 'Create';
  fTitle.value = t ? t.title : '';
  fDesc.value = t ? t.description || '' : '';
  fDue.value = t ? t.due || '' : '';
  fLabels.value = t ? labelsOf(t).join(', ') : '';
  renderLabelPreview();
  dlgIcon.innerHTML = svgIcon(t ? 'edit' : 'plus');
  dlg.showModal();
  fTitle.focus();
}
newTaskBtn.onclick = () => openDlg(null);
cancel.onclick = () => dlg.close();
form.onsubmit = async e => {
  e.preventDefault();
  const data = { title: fTitle.value.trim(), description: fDesc.value, due: fDue.value, labels: normalizeLabels(fLabels.value) };
  if (!data.title) return;
  if (editing) {
    Object.assign(editing, await window.host.store.update('tasks', editing.id, data));
  } else {
    tasks.push(await window.host.store.insert('tasks', { ...data, status: 'todo', boardId: activeBoardId }));
  }
  dlg.close();
  render();
};

// Board switcher menu, same as the Whiteboard.
const bmenu = mk('div', 'panel', document.body);
bmenu.id = 'bmenu';
bmenu.hidden = true;
bmenu.setAttribute('role', 'menu');
bmenu.setAttribute('aria-label', 'Boards');
function closeMenu(refocus) {
  if (bmenu.hidden) return;
  bmenu.hidden = true;
  boardSel.setAttribute('aria-expanded', 'false');
  if (refocus) boardSel.focus();
}
function openMenu() {
  bmenu.innerHTML = '';
  const menuItem = (cls, icon, label, fn, checked) => {
    const b = mk('button', 'mi ' + cls, bmenu);
    b.setAttribute('role', checked === undefined ? 'menuitem' : 'menuitemradio');
    if (checked !== undefined) b.setAttribute('aria-checked', String(checked));
    b.innerHTML = '<span class="mi-ic">' + (icon ? svgIcon(icon) : '') + '</span><span class="mi-t"></span>';
    b.querySelector('.mi-t').textContent = label;
    b.onclick = () => { closeMenu(); fn(); };
    return b;
  };
  boards.forEach(b => menuItem('', b.id === activeBoardId ? 'check' : '', b.name || 'Untitled', () => switchBoard(b.id), b.id === activeBoardId));
  mk('div', 'msep', bmenu);
  menuItem('act', 'plus', 'New board', () => addBoard());
  menuItem('act', 'grid', 'All boards overview', () => showOverview());
  const r = boardSel.getBoundingClientRect();
  bmenu.style.left = r.left + 'px';
  bmenu.style.top = r.bottom + 8 + 'px';
  bmenu.hidden = false;
  boardSel.setAttribute('aria-expanded', 'true');
  (bmenu.querySelector('[aria-checked=true]') || bmenu.firstChild).focus();
}
boardSel.onclick = () => (bmenu.hidden ? openMenu() : closeMenu());
document.addEventListener('pointerdown', e => {
  if (!bmenu.hidden && !bmenu.contains(e.target) && !boardSel.contains(e.target)) closeMenu();
});

function refreshBoards() {
  const cur = activeBoard();
  boardSel.innerHTML = svgIcon('grid') + '<span class="bsel-name"></span>' + svgIcon('chevron');
  boardSel.querySelector('.bsel-name').textContent = (cur && cur.name) || 'Untitled';
  boardSel.setAttribute('aria-haspopup', 'menu');
  boardSel.setAttribute('aria-expanded', String(!bmenu.hidden));
}

function switchBoard(id) {
  activeBoardId = id;
  labelFilter.clear();
  saveSettings({ boardId: id });
  closeMenu();
  hideOverview();
  render();
}

async function addBoard() {
  const rec = await window.host.store.insert('boards', { name: `Board ${boards.length + 1}` });
  boards.push(rec);
  switchBoard(rec.id);
}

function startRename() {
  const b = activeBoard();
  if (!b) return;
  boardName.value = b.name;
  boardSel.hidden = true;
  boardName.hidden = false;
  boardName.focus();
  boardName.select();
}
function finishRename(commit) {
  if (boardName.hidden) return;
  boardName.hidden = true;
  boardSel.hidden = false;
  const b = activeBoard();
  const v = boardName.value.trim();
  if (commit && b && v && v !== b.name) {
    b.name = v;
    window.host.store.update('boards', b.id, { name: v }).catch(() => {});
  }
  refreshBoards();
  renBoardBtn.focus();
}
boardName.onkeydown = e => {
  if (e.key === 'Enter') finishRename(true);
  else if (e.key === 'Escape') finishRename(false);
};
boardName.onblur = () => finishRename(true);
renBoardBtn.onclick = startRename;

addBoardBtn.onclick = () => addBoard();

// Delete confirmation, the same pop-up as the Whiteboard.
function confirmDeleteBoard(id) {
  const b = boards.find(x => x.id === id);
  if (!b || boards.length <= 1) return;
  const prev = document.activeElement;
  const back = mk('div', 'dlg-back', document.body);
  const box = mk('div', 'dlg', back);
  box.setAttribute('role', 'alertdialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'dlg-t');
  box.setAttribute('aria-describedby', 'dlg-d');
  const h = el('h2', { id: 'dlg-t', textContent: 'Delete board?' });
  const p = el('p', { id: 'dlg-d', textContent: `Are you sure you want to delete "${b.name || 'Untitled'}" and all its tasks? This cannot be undone.` });
  const row = mk('div', 'row', box);
  box.prepend(h, p);
  const cancel = el('button', { type: 'button', textContent: 'Cancel' });
  const ok = el('button', { type: 'button', className: 'danger', textContent: 'Delete' });
  row.append(cancel, ok);
  const close = () => { back.remove(); if (prev && prev.isConnected) prev.focus(); };
  cancel.onclick = close;
  ok.onclick = async () => { close(); await deleteBoard(id); };
  back.addEventListener('pointerdown', e => { if (e.target === back) close(); });
  back.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === cancel ? ok : cancel).focus(); }
  });
  cancel.focus();
}

async function deleteBoard(id) {
  if (boards.length <= 1) return;
  for (const t of tasks.filter(x => x.boardId === id)) await window.host.store.remove('tasks', t.id);
  await window.host.store.remove('boards', id);
  tasks = tasks.filter(x => x.boardId !== id);
  boards = boards.filter(x => x.id !== id);
  if (activeBoardId === id) {
    activeBoardId = boards[0].id;
    labelFilter.clear();
    saveSettings({ boardId: activeBoardId });
  }
  render();
}

// All boards overview, same layout as the Whiteboard's.
const overview = mk('div', null, document.body);
overview.id = 'overview';
overview.hidden = true;
function showOverview() {
  overviewOpen = true;
  closeMenu();
  renderOverview();
  overview.hidden = false;
}
function hideOverview() {
  overviewOpen = false;
  overview.hidden = true;
}
overviewBtn.onclick = () => (overviewOpen ? hideOverview() : showOverview());
overview.addEventListener('keydown', e => { if (e.key === 'Escape') hideOverview(); });

// A small picture of the board: three columns, each with a count and a few task tiles.
function previewEl(list) {
  if (!list.length) {
    const empty = el('div', 'bcard-pv empty');
    empty.textContent = 'Empty board';
    return empty;
  }
  const frame = el('div', 'bcard-pv');
  const pv = el('div', 'bprev');
  frame.append(pv);
  COLS.forEach(([key, label]) => {
    const items = list.filter(t => (t.status || 'todo') === key);
    const col = el('div', 'bprev-col');
    const head = el('div', 'bprev-h');
    const dot = el('span', { className: 'bprev-dot', title: label });
    dot.style.background = DOT[key];
    head.append(dot, el('span', { className: 'bprev-n', textContent: String(items.length) }));
    col.append(head);
    items.slice(0, 3).forEach((t, i) => {
      const tile = el('div', 'bprev-card');
      tile.style.borderLeftColor = DOT[key];
      const d = today();
      if (t.due && key !== 'done' && t.due <= d) tile.classList.add(t.due === d ? 'today' : 'late');
      tile.append(el('span', { className: 'bprev-line' }));
      tile.firstChild.style.width = `${45 + ([...t.title].length * 13 + i * 17) % 40}%`;
      col.append(tile);
    });
    if (items.length > 3) col.append(el('div', { className: 'bprev-more', textContent: `+${items.length - 3} more` }));
    pv.append(col);
  });
  return frame;
}

function renderOverview() {
  overview.replaceChildren();
  const head = el('div', 'ov-head');
  head.append(el('h1', { textContent: 'Boards' }), el('span', { className: 'ov-count', textContent: boards.length + (boards.length === 1 ? ' board' : ' boards') }));
  const close = el('button', 'ov-close', null);
  close.textContent = 'Back to board';
  close.onclick = () => hideOverview();
  head.append(close);
  overview.append(head);

  const grid = el('div', 'bgrid');
  boards.forEach(b => {
    const list = tasks.filter(t => t.boardId === b.id);
    const wrap = mk('div', 'bcardwrap', grid);
    const card = mk('button', 'bcard' + (b.id === activeBoardId ? ' current' : ''), wrap);
    card.append(previewEl(list));
    const meta = mk('div', 'bcard-meta', card);
    meta.append(el('div', { className: 'bcard-name', textContent: b.name || 'Untitled' }));
    meta.append(el('div', { className: 'bcard-sub', textContent: `${openCount(list)} open · ${dueTodayCount(list)} due today` }));
    card.onclick = () => switchBoard(b.id);
    const del = mk('button', 'bcard-del', wrap);
    del.innerHTML = svgIcon('trash');
    del.title = 'Delete board';
    del.setAttribute('aria-label', 'Delete board ' + (b.name || 'Untitled'));
    del.onclick = e => {
      e.stopPropagation();
      confirmDeleteBoard(b.id);
    };
  });
  const add = mk('button', 'bcard add', grid);
  add.innerHTML = svgIcon('plus') + '<span>New board</span>';
  add.onclick = () => addBoard();
  overview.append(grid);
}

// Task cards and columns.
// The task menu is fixed to the viewport, so the column list cannot clip it. It opens above its button unless there is no room.
function placeMenu(menu, anchor) {
  const r = anchor.getBoundingClientRect();
  const h = menu.offsetHeight || 96;
  const above = r.top - h - 8 > 8;
  menu.style.left = `${Math.max(8, r.right - 120)}px`;
  menu.style.top = `${above ? r.top - h - 4 : r.bottom + 4}px`;
}
function closeMenus() {
  document.querySelectorAll('.menu').forEach(m => { m.hidden = true; });
}
document.addEventListener('click', closeMenus);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeMenus(); closeMenu(true); hideOverview(); }
  if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !dlg.open && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) openDlg(null);
});

async function move(id, status) {
  const t = tasks.find(x => x.id === id);
  if (!t || t.status === status) return;
  t.status = status;
  render();
  await window.host.store.update('tasks', id, { status });
}

function card(t) {
  const d = today();
  const dueCls = t.due && t.status !== 'done' ? (t.due === d ? ' today' : t.due < d ? ' late' : '') : '';
  const c = el('div', { className: 'card task', draggable: true });
  c.ondragstart = e => { dragId = t.id; e.dataTransfer.setData('text/plain', t.id); c.classList.add('dragging'); };
  c.ondragend = () => { c.classList.remove('dragging'); dragId = null; };
  const edit = el('button', { className: 'btn ghost', textContent: 'Edit', role: 'menuitem' });
  edit.onclick = () => { closeMenus(); openDlg(t); };
  const del = el('button', { className: 'btn ghost danger', textContent: 'Delete', role: 'menuitem' });
  del.onclick = async () => {
    await window.host.store.remove('tasks', t.id);
    tasks = tasks.filter(x => x.id !== t.id);
    render();
  };
  const menu = el('div', { className: 'menu panel', role: 'menu', hidden: true }, edit, del);
  const menuBtn = el('button', { className: 'btn ghost dots', textContent: '⋯', ariaLabel: 'Task actions', title: 'Actions' });
  menuBtn.setAttribute('aria-haspopup', 'menu');
  menuBtn.onclick = e => {
    e.stopPropagation();
    const open = menu.hidden;
    closeMenus();
    menu.hidden = !open;
    if (open) placeMenu(menu, menuBtn);
  };
  c.append(el('b', { textContent: t.title }));
  if (t.description) c.append(el('p', { textContent: t.description }));
  if (labelsOf(t).length) c.append(el('div', { className: 'labels' }, ...labelsOf(t).map(labelChip)));
  c.append(el('div', { className: 'meta' },
    el('span', { className: 'due' + dueCls, textContent: t.due ? (dueCls === ' today' ? 'Due today' : 'Due ' + t.due) : 'No due date' }),
    el('div', { className: 'acts' }, menuBtn, menu)));
  return c;
}

// The filter bar has a fixed height and is always shown, so selecting a label never resizes the columns.
function renderFilters(list) {
  const names = [...new Set(list.flatMap(labelsOf))].sort();
  filters.replaceChildren();
  if (names.length === 0) {
    filters.append(el('span', { className: 'muted', textContent: 'No labels on this board yet. Add labels when you create or edit a task.' }));
    return;
  }
  filters.append(el('span', { className: 'muted', textContent: 'Labels' }));
  names.forEach(name => {
    const on = labelFilter.has(name);
    const chip = el('button', { className: 'lchip' + (on ? ' on' : ''), textContent: name, style: `background:${labelColor(name)}` });
    chip.setAttribute('aria-pressed', String(on));
    chip.onclick = () => {
      if (on) labelFilter.delete(name);
      else labelFilter.add(name);
      render();
    };
    filters.append(chip);
  });
  const clear = el('button', { className: 'btn ghost', textContent: 'Clear' });
  clear.hidden = labelFilter.size === 0;
  clear.onclick = () => { labelFilter.clear(); render(); };
  filters.append(clear);
}

function render() {
  refreshBoards();
  const mine = tasks.filter(t => t.boardId === activeBoardId);
  renderFilters(mine);
  const visible = mine.filter(t => labelFilter.size === 0 || labelsOf(t).some(l => labelFilter.has(l)));

  board.replaceChildren();
  COLS.forEach(([key, label]) => {
    const items = visible.filter(t => (t.status || 'todo') === key);
    const list = el('div', { className: 'list' }, ...items.map(card));
    const rename = el('button', { className: 'btn ghost', textContent: '✎', ariaLabel: 'Rename column ' + label, title: 'Rename column' });
    const nameEl = el('span', { textContent: label, title: 'Double-click to rename' });
    const startEdit = () => {
      const inp = el('input', { className: 'field', value: label, maxLength: 40, ariaLabel: 'Column name' });
      let done = false;
      const finish = async ok => {
        if (done) return;
        done = true;
        const v = inp.value.trim();
        if (ok && v && v !== label) await setLabel(key, v);
        render();
      };
      inp.onkeydown = e => { if (e.key === 'Enter') finish(true); else if (e.key === 'Escape') finish(false); };
      inp.onblur = () => finish(true);
      nameEl.replaceWith(inp);
      rename.hidden = true;
      inp.focus();
      inp.select();
    };
    rename.onclick = startEdit;
    nameEl.ondblclick = startEdit;
    const col = el('section', { className: 'panel col' },
      el('h2', {}, el('span', { style: 'display:flex;align-items:center;gap:4px;flex:1;min-width:0' }, nameEl, rename), el('span', { textContent: String(items.length) })), list);
    col.ondragover = e => { e.preventDefault(); col.classList.add('over'); };
    col.ondragleave = e => { if (!col.contains(e.relatedTarget)) col.classList.remove('over'); };
    col.ondrop = e => {
      e.preventDefault();
      col.classList.remove('over');
      move(dragId || e.dataTransfer.getData('text/plain'), key);
    };
    board.append(col);
  });

  const n = dueTodayCount(mine);
  badge.hidden = n === 0;
  badge.textContent = `${n} due today`;
  try {
    if (window.host && typeof window.host.setBadge === 'function') window.host.setBadge(n);
  } catch (e) { /* host has no badge support */ }
  if (overviewOpen) renderOverview();
}

const colRecords = {};
async function setLabel(key, label) {
  const c = COLS.find(x => x[0] === key);
  c[1] = label;
  if (colRecords[key]) await window.host.store.update('columns', colRecords[key], { label });
  else colRecords[key] = (await window.host.store.insert('columns', { key, label })).id;
}

(async () => {
  try {
    settings = (await window.host.store.list('settings'))[0] ?? null;
    if (settings) applyBlur(!!settings.blur);
  } catch (e) { /* default: off */ }

  boards = await window.host.store.list('boards');
  if (boards.length === 0) boards.push(await window.host.store.insert('boards', { name: 'Board 1' }));

  tasks = await window.host.store.list('tasks');
  // Tasks saved before boards existed belong to the first board.
  const first = boards[0];
  for (const t of tasks.filter(x => !x.boardId)) {
    t.boardId = first.id;
    await window.host.store.update('tasks', t.id, { boardId: first.id });
  }
  const saved = settings?.boardId;
  activeBoardId = boards.some(b => b.id === saved) ? saved : first.id;

  (await window.host.store.list('columns')).forEach(r => {
    const c = COLS.find(x => x[0] === r.key);
    if (c) { c[1] = r.label; colRecords[r.key] = r.id; }
  });
  render();
})();
