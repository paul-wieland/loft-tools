// Home card for Whiteboard: how many boards there are and the one edited most recently.
// Clicking it opens the whiteboard.
const root = document.createElement('div');
root.className = 'card';
root.addEventListener('click', () => window.host.openTool());
document.body.appendChild(root);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function refresh() {
  try {
    const boards = await window.host.store.list('boards');
    const latest = boards
      .slice()
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];

    const head = el('div', 'head');
    head.append(
      el('span', 'num', String(boards.length)),
      el('span', 'label', boards.length === 1 ? 'board' : 'boards'),
    );
    if (latest) head.append(el('span', 'chip', 'last edited'));
    root.replaceChildren(head);

    if (latest) {
      const row = el('div', 'item');
      row.append(el('span', 'dot'), el('span', 't', latest.name || 'Untitled board'));
      root.append(row);
    } else {
      root.append(el('div', 'empty', 'No boards yet'));
    }
  } catch {
    root.replaceChildren(el('div', 'empty', 'Could not load boards'));
  }
}

refresh();
