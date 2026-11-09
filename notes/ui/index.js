const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'styles.css';
document.head.appendChild(link);

const store = window.host.store;

// Only these elements survive when a page is loaded. Anything else is unwrapped or removed.
const ALLOWED = new Set(['DIV', 'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'H2', 'H3', 'UL', 'OL', 'LI', 'SPAN', 'INPUT']);

const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  chevronRight: '<path d="M9 6l6 6-6 6"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
};
const icon = name => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICONS[name];
  return svg;
};

// h(tag, props, ...children): small helper for building the interface.
const h = (tag, props = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  for (const kid of kids) if (kid) node.append(kid);
  return node;
};

let notebooks = [];
let pages = [];
let notebookId = null;
let pageId = null;
let query = '';
let pending = false;
let saveTimer = null;
let privacy = false;
let settingsRecord = null;
let privacyButton = null;
const closedNotebooks = new Set();

// Keeps the formatting the editor produces and drops everything else.
function clean(html) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const walk = node => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType !== Node.ELEMENT_NODE) {
        if (child.nodeType !== Node.TEXT_NODE) child.remove();
        continue;
      }
      walk(child);
      if (!ALLOWED.has(child.tagName)) {
        child.replaceWith(...child.childNodes);
        continue;
      }
      for (const attr of [...child.attributes]) {
        const keep =
          (attr.name === 'class' && (child.tagName === 'DIV' || child.tagName === 'SPAN')) ||
          (attr.name === 'checked' && child.tagName === 'INPUT');
        if (!keep) child.removeAttribute(attr.name);
      }
      if (child.tagName === 'INPUT') child.setAttribute('type', 'checkbox');
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

function textOf(html) {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body.textContent ?? '';
}

function pagesIn(id) {
  return pages
    .filter(p => p.notebookId === id)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

function currentPage() {
  return pages.find(p => p.id === pageId) ?? null;
}

// ---- Layout

const side = h('aside', { class: 'side' });
const search = h('input', {
  class: 'search',
  type: 'search',
  placeholder: 'Search all notes',
  'aria-label': 'Search all notes',
  oninput: event => {
    query = event.target.value;
    renderSide();
  },
});
const listBox = h('div', { class: 'list' });
side.append(
  h(
    'div',
    { class: 'side-head' },
    h('strong', { text: 'Notebooks' }),
    h('button', { class: 'btn-add', type: 'button', onclick: createNotebook }, icon('plus'), h('span', { text: 'New notebook' })),
  ),
  search,
  listBox,
);

const titleInput = h('input', {
  class: 'title',
  type: 'text',
  placeholder: 'Untitled',
  'aria-label': 'Page title',
  oninput: () => changed(),
});
const editor = h('div', {
  class: 'editor',
  contenteditable: 'true',
  role: 'textbox',
  'aria-multiline': 'true',
  'data-placeholder': 'Start writing…',
  oninput: () => changed(),
  onkeydown: onEditorKeydown,
  onchange: event => {
    if (event.target.matches('input[type="checkbox"]')) {
      if (event.target.checked) event.target.setAttribute('checked', '');
      else event.target.removeAttribute('checked');
      changed();
    }
  },
  onblur: () => save(),
});
const status = h('span', { class: 'status', role: 'status' });

const toolButton = (label, title, action) =>
  h('button', { class: 'tool', type: 'button', title, 'aria-label': title, text: label, onmousedown: e => e.preventDefault(), onclick: action });
const format = (command, value) => {
  editor.focus();
  document.execCommand(command, false, value);
  changed();
};
// A checklist item is a checkbox and an editable line. The caret moves into the new line, so typing goes there.
const insertCheckItem = () => {
  editor.focus();
  document.execCommand(
    'insertHTML',
    false,
    '<div class="todo"><input type="checkbox"><span contenteditable="true" data-new="">&#8203;</span></div>',
  );
  const fresh = editor.querySelector('.todo span[data-new]');
  if (fresh) {
    fresh.removeAttribute('data-new');
    const range = document.createRange();
    range.selectNodeContents(fresh);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
  changed();
};

const toolbar = h(
  'div',
  { class: 'toolbar' },
  toolButton('H1', 'Heading', () => format('formatBlock', 'H2')),
  toolButton('H2', 'Subheading', () => format('formatBlock', 'H3')),
  toolButton('Text', 'Normal text', () => format('formatBlock', 'P')),
  h('span', { class: 'sep' }),
  toolButton('B', 'Bold', () => format('bold')),
  toolButton('I', 'Italic', () => format('italic')),
  toolButton('U', 'Underline', () => format('underline')),
  toolButton('S', 'Strikethrough', () => format('strikeThrough')),
  h('span', { class: 'sep' }),
  toolButton('• List', 'Bullet list', () => format('insertUnorderedList')),
  toolButton('1. List', 'Numbered list', () => format('insertOrderedList')),
  toolButton('☐ To-do', 'Checklist item', insertCheckItem),
  h('span', { class: 'sep' }),
  toolButton('Clear', 'Clear formatting', () => format('removeFormat')),
);

privacyButton = h(
  'button',
  { class: 'ibtn', type: 'button', 'aria-pressed': 'false', title: 'Privacy mode', 'aria-label': 'Privacy mode', onclick: togglePrivacy },
  icon('eye'),
);

const main = h(
  'main',
  { class: 'main' },
  h(
    'div',
    { class: 'bar' },
    status,
    h(
      'span',
      { class: 'bar-actions' },
      privacyButton,
    ),
  ),
  titleInput,
  toolbar,
  editor,
);

const root = h('div', { class: 'app' }, side, main);
document.body.append(root);

// Enter inside a checklist item starts a new checkbox on the next line.
// Enter on an empty checklist item ends the checklist.
function onEditorKeydown(event) {
  if (event.key !== 'Enter' || event.shiftKey) return;
  const selection = window.getSelection();
  const anchor = selection?.anchorNode;
  const span = anchor?.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor;
  const item = span?.closest?.('.todo');
  if (!item || !editor.contains(item)) return;

  event.preventDefault();
  const empty = !span.textContent.replace(/\u200b/g, '').trim();
  if (empty) {
    const line = document.createElement('div');
    line.append(document.createElement('br'));
    item.replaceWith(line);
    placeCaret(line, true);
  } else {
    const next = makeCheckItem();
    item.after(next);
    placeCaret(next.querySelector('span'), false);
  }
  changed();
}

function makeCheckItem() {
  const item = document.createElement('div');
  item.className = 'todo';
  const box = document.createElement('input');
  box.type = 'checkbox';
  const text = document.createElement('span');
  text.setAttribute('contenteditable', 'true');
  text.textContent = '\u200b';
  item.append(box, text);
  return item;
}

function placeCaret(node, atStart) {
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(atStart);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

// ---- Privacy

// Blurs the note text. It is clear again while the pointer is over a note or while you type in it.
function setPrivacy(on) {
  privacy = on;
  root.classList.toggle('privacy', on);
  privacyButton.setAttribute('aria-pressed', String(on));
}

async function togglePrivacy() {
  setPrivacy(!privacy);
  const data = { key: 'ui', privacy };
  if (settingsRecord) {
    settingsRecord = (await store.update('settings', settingsRecord.id, data)) ?? settingsRecord;
  } else {
    settingsRecord = await store.insert('settings', data);
  }
}

// ---- Saving

function setStatus(text) {
  status.textContent = text;
}

function changed() {
  if (!currentPage()) return;
  pending = true;
  setStatus('Saving…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 400);
}

async function save() {
  clearTimeout(saveTimer);
  const page = currentPage();
  if (!page || !pending) return;
  pending = false;
  const updated = await store.update('pages', page.id, {
    title: titleInput.value.trim() || 'Untitled',
    body: clean(editor.innerHTML),
  });
  if (updated) Object.assign(page, updated);
  setStatus('Saved');
  renderSide();
}

function showPage() {
  const page = currentPage();
  titleInput.disabled = !page;
  editor.contentEditable = page ? 'true' : 'false';
  titleInput.value = page ? page.title : '';
  editor.innerHTML = page ? clean(page.body) : '';
  editor.querySelectorAll('.todo span').forEach(span => span.setAttribute('contenteditable', 'true'));
  pending = false;
  setStatus('Saved');
}

// ---- Navigation and actions

// A small text dialog in the same style as the pop-ups. Electron does not support window.prompt, so this replaces it.
// Resolves with the typed text, or null when cancelled.
function promptDialog(title, value, okLabel) {
  return new Promise(resolve => {
    const prev = document.activeElement;
    const back = h('div', { class: 'dlg-back' });
    const box = h('div', { class: 'dlg', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dlg-t' });
    const field = h('input', { class: 'dlg-field', type: 'text', value: value ?? '', 'aria-label': title });
    const cancel = h('button', { type: 'button', text: 'Cancel' });
    const ok = h('button', { type: 'button', class: 'primary', text: okLabel });
    box.append(h('h2', { id: 'dlg-t', text: title }), field, h('div', { class: 'row' }, cancel, ok));
    back.append(box);
    document.body.append(back);
    const close = answer => {
      back.remove();
      if (prev && prev.isConnected) prev.focus();
      resolve(answer);
    };
    const submit = () => {
      const text = field.value.trim();
      close(text || null);
    };
    cancel.onclick = () => close(null);
    ok.onclick = submit;
    back.addEventListener('pointerdown', event => {
      if (event.target === back) close(null);
    });
    back.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        close(null);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        submit();
      }
    });
    // The cursor goes to the end instead of selecting the text, so no highlight covers the name.
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  });
}

// The same delete pop-up as the Tasks board: a small card over a dimmed page. Resolves true only when the user confirms.
function confirmDialog(title, text, okLabel) {
  return new Promise(resolve => {
    const prev = document.activeElement;
    const back = h('div', { class: 'dlg-back' });
    const box = h('div', {
      class: 'dlg',
      role: 'alertdialog',
      'aria-modal': 'true',
      'aria-labelledby': 'dlg-t',
      'aria-describedby': 'dlg-d',
    });
    const cancel = h('button', { type: 'button', text: 'Cancel' });
    const ok = h('button', { type: 'button', class: 'danger', text: okLabel });
    box.append(h('h2', { id: 'dlg-t', text: title }), h('p', { id: 'dlg-d', text }), h('div', { class: 'row' }, cancel, ok));
    back.append(box);
    document.body.append(back);
    const close = answer => {
      back.remove();
      if (prev && prev.isConnected) prev.focus();
      resolve(answer);
    };
    cancel.onclick = () => close(false);
    ok.onclick = () => close(true);
    back.addEventListener('pointerdown', event => {
      if (event.target === back) close(false);
    });
    back.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        close(false);
      } else if (event.key === 'Tab') {
        event.preventDefault();
        (document.activeElement === cancel ? ok : cancel).focus();
      }
    });
    cancel.focus();
  });
}

// Delete a page. If it is the open page, another page of the notebook (or a new one) opens.
async function removePage(page) {
  if (!(await confirmDialog('Delete page?', `Are you sure you want to delete "${page.title}"? This cannot be undone.`, 'Delete'))) return;
  const wasOpen = page.id === pageId;
  if (wasOpen) {
    clearTimeout(saveTimer);
    pending = false;
  }
  await store.remove('pages', page.id);
  pages = pages.filter(p => p.id !== page.id);
  if (!wasOpen) {
    renderSide();
    return;
  }
  pageId = null;
  const next = pagesIn(notebookId)[0];
  if (next) await selectPage(next.id);
  else await createPage();
}

async function renamePage(page) {
  const title = await promptDialog('Rename page', page.title, 'Save');
  if (!title) return;
  const updated = await store.update('pages', page.id, { title });
  if (updated) Object.assign(page, updated);
  if (page.id === pageId) titleInput.value = page.title;
  renderSide();
}

async function createNotebook() {
  await save();
  const name = await promptDialog('New notebook', '', 'Create');
  if (!name) return;
  const notebook = await store.insert('notebooks', { name });
  notebooks.push(notebook);
  await selectNotebook(notebook.id);
}

async function renameNotebook(notebook) {
  const name = await promptDialog('Rename notebook', notebook.name, 'Save');
  if (!name) return;
  const updated = await store.update('notebooks', notebook.id, { name });
  if (updated) Object.assign(notebook, updated);
  renderSide();
}

async function removeNotebook(notebook) {
  if (!(await confirmDialog('Delete notebook?', `Are you sure you want to delete "${notebook.name}" and all its pages? This cannot be undone.`, 'Delete'))) return;
  clearTimeout(saveTimer);
  pending = false;
  for (const page of pagesIn(notebook.id)) await store.remove('pages', page.id);
  await store.remove('notebooks', notebook.id);
  pages = pages.filter(p => p.notebookId !== notebook.id);
  notebooks = notebooks.filter(n => n.id !== notebook.id);
  closedNotebooks.delete(notebook.id);
  if (notebooks.length === 0) notebooks.push(await store.insert('notebooks', { name: 'My notes' }));
  await selectNotebook(notebooks[0].id);
}

// ---- Menus

// The three-dot menu next to a notebook or page. It closes on a click elsewhere or on Escape.
let openMenuEl = null;
function closeMenu() {
  if (openMenuEl) openMenuEl.remove();
  openMenuEl = null;
}

function openMenu(anchor, items) {
  closeMenu();
  const rect = anchor.getBoundingClientRect();
  const menu = h(
    'div',
    { class: 'menu', role: 'menu', style: `top:${rect.bottom + 4}px;left:${Math.max(8, rect.right - 150)}px` },
    ...items.map(item =>
      h('button', {
        class: 'menu-item' + (item.danger ? ' danger' : ''),
        type: 'button',
        role: 'menuitem',
        text: item.label,
        onclick: () => {
          closeMenu();
          item.action();
        },
      }),
    ),
  );
  document.body.append(menu);
  openMenuEl = menu;
  menu.querySelector('button')?.focus();
}

document.addEventListener('pointerdown', event => {
  if (openMenuEl && !openMenuEl.contains(event.target)) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMenu();
});

function moreButton(items) {
  return h(
    'button',
    {
      class: 'ibtn small more',
      type: 'button',
      title: 'More',
      'aria-label': 'More',
      'aria-haspopup': 'menu',
      onclick: event => {
        event.stopPropagation();
        openMenu(event.currentTarget, items);
      },
    },
    icon('more'),
  );
}

// ---- Navigation tree

function pageRow(page) {
  const active = page.id === pageId;
  return h(
    'div',
    { class: 'page-row' + (active ? ' active' : '') },
    h(
      'button',
      { class: 'row page', type: 'button', onclick: () => selectPage(page.id) },
      h('span', { class: 'truncate', text: page.title || 'Untitled' }),
    ),
    moreButton([
      { label: 'Rename', action: () => renamePage(page) },
      { label: 'Delete', danger: true, action: () => removePage(page) },
    ]),
  );
}

function notebookRow(notebook) {
  const open = !closedNotebooks.has(notebook.id);
  const active = notebook.id === notebookId;
  return h(
    'div',
    { class: 'nb-row' + (active ? ' active' : '') },
    h('button', {
      class: 'ibtn small chevron',
      type: 'button',
      title: open ? 'Close notebook' : 'Open notebook',
      'aria-label': open ? 'Close notebook' : 'Open notebook',
      'aria-expanded': String(open),
      onclick: () => {
        if (open) closedNotebooks.add(notebook.id);
        else closedNotebooks.delete(notebook.id);
        renderSide();
      },
    }, icon(open ? 'chevronDown' : 'chevronRight')),
    h(
      'button',
      { class: 'row nb-name', type: 'button', onclick: () => selectNotebook(notebook.id) },
      h('span', { class: 'truncate', text: notebook.name }),
    ),
    h('button', {
      class: 'ibtn small add-page',
      type: 'button',
      title: 'New page',
      'aria-label': 'New page in ' + notebook.name,
      onclick: () => newPageIn(notebook.id),
    }, icon('plus')),
    moreButton([
      { label: 'Rename', action: () => renameNotebook(notebook) },
      { label: 'Delete', danger: true, action: () => removeNotebook(notebook) },
    ]),
  );
}

function renderSide() {
  const children = [];
  const q = query.trim().toLowerCase();

  if (q) {
    const hits = pages.filter(p => `${p.title} ${textOf(p.body)}`.toLowerCase().includes(q));
    children.push(h('div', { class: 'group', text: 'Results' }));
    hits.forEach(page => {
      const notebook = notebooks.find(n => n.id === page.notebookId);
      children.push(
        h(
          'button',
          { class: 'row page', type: 'button', onclick: () => selectPage(page.id) },
          h('span', { class: 'truncate', text: page.title || 'Untitled' }),
          notebook ? h('small', { text: notebook.name }) : null,
        ),
      );
    });
    if (hits.length === 0) children.push(h('p', { class: 'empty', text: 'No notes match.' }));
  } else {
    for (const notebook of notebooks) {
      children.push(notebookRow(notebook));
      if (!closedNotebooks.has(notebook.id)) {
        pagesIn(notebook.id).forEach(page => children.push(pageRow(page)));
      }
    }
  }

  listBox.replaceChildren(...children);
}

// ---- Actions

async function selectPage(id) {
  await save();
  const page = pages.find(p => p.id === id);
  if (!page) return;
  pageId = id;
  notebookId = page.notebookId;
  showPage();
  renderSide();
}

async function selectNotebook(id) {
  await save();
  notebookId = id;
  closedNotebooks.delete(id);
  const first = pagesIn(id)[0];
  if (first) await selectPage(first.id);
  else await createPage();
}

async function newPageIn(id) {
  await save();
  notebookId = id;
  closedNotebooks.delete(id);
  await createPage();
}

async function createPage() {
  await save();
  const page = await store.insert('pages', { notebookId, title: 'Untitled', body: '' });
  pages.push(page);
  pageId = page.id;
  showPage();
  renderSide();
  titleInput.focus({ preventScroll: true });
}

// ---- Start

async function start() {
  notebooks = await store.list('notebooks');
  if (notebooks.length === 0) notebooks = [await store.insert('notebooks', { name: 'My notes' })];
  pages = await store.list('pages');
  const settings = await store.list('settings');
  settingsRecord = settings.find(s => s.key === 'ui') ?? null;
  setPrivacy(settingsRecord?.privacy === true);
  notebookId = notebooks[0].id;
  const first = pagesIn(notebookId)[0];
  if (first) {
    pageId = first.id;
    showPage();
    renderSide();
  } else {
    await createPage();
  }
}

start().catch(error => {
  setStatus(`Could not load your notes: ${error.message ?? error}`);
});
