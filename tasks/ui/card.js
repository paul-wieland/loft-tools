// Home card for Tasks: open tasks on the board you are working on, and what is due. Clicking it opens the board.
const root = document.createElement('div');
root.className = 'card';
root.addEventListener('click', () => window.host.openTool());
document.body.appendChild(root);

const DOT = { todo: 'var(--blue)', doing: 'var(--orange)', done: 'var(--green)' };

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function today() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function shortDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

async function refresh() {
  try {
    const [allTasks, settings, boards] = await Promise.all([
      window.host.store.list('tasks'),
      window.host.store.list('settings'),
      window.host.store.list('boards'),
    ]);
    // The board's blur setting also hides titles and dates on the card.
    root.classList.toggle('blurred', Boolean(settings[0]?.blur));

    // Show the board last opened in the app. Tasks saved before boards belong to the first board.
    const board = boards.find((b) => b.id === settings[0]?.boardId) ?? boards[0];
    const tasks = board
      ? allTasks.filter((t) => t.boardId === board.id || (!t.boardId && board.id === boards[0].id))
      : allTasks;

    const open = tasks.filter((task) => task.status !== 'done');
    const dueToday = open.filter((task) => task.due === today()).length;
    const upcoming = open
      .filter((task) => task.due)
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 3);

    const head = el('div', 'head');
    head.append(el('span', 'num', String(open.length)), el('span', 'label', open.length === 1 ? 'open task' : 'open tasks'));
    if (dueToday) head.append(el('span', 'chip', `${dueToday} due today`));
    const parts = [];
    if (board) parts.push(el('div', 'bname', board.name));
    parts.push(head);
    root.replaceChildren(...parts);

    if (upcoming.length === 0) {
      root.append(el('div', 'empty', 'No due dates set'));
      return;
    }
    const list = el('div', 'list');
    for (const task of upcoming) {
      const row = el('div', 'item');
      const dot = el('span', 'dot');
      dot.style.background = DOT[task.status] ?? 'var(--muted)';
      row.append(dot, el('span', 't', task.title), el('span', 'd', shortDate(task.due)));
      list.append(row);
    }
    root.append(list);
  } catch {
    root.replaceChildren(el('div', 'empty', 'Could not load tasks'));
  }
}

refresh();
