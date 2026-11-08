const root = document.createElement('div');
root.className = 'rm-card';
document.body.appendChild(root);

const names = ['Inner circle', 'Close', 'Friendly', 'Acquaintances'];

function render(people) {
  root.textContent = '';
  const title = document.createElement('div');
  title.className = 'rm-title';
  title.textContent = 'Relationship Map';
  const count = document.createElement('div');
  count.className = 'rm-count';
  count.textContent = String(people.length);
  const label = document.createElement('div');
  label.className = 'muted';
  label.textContent = people.length === 1 ? 'person mapped' : 'people mapped';
  root.append(title, count, label);

  const inner = people.filter((p) => Number(p.ring) === 1).length;
  if (people.length) {
    const sub = document.createElement('div');
    sub.className = 'muted';
    sub.textContent = inner + ' in ' + names[0].toLowerCase();
    root.appendChild(sub);
  }

  const btn = document.createElement('button');
  btn.className = 'btn ghost';
  btn.textContent = 'Open';
  btn.addEventListener('click', () => window.host.openTool());
  root.appendChild(btn);
}

try {
  // The card counts the people on the board that was opened last.
  const [people, settings, boards] = await Promise.all([
    window.host.store.list('people'),
    window.host.store.list('settings'),
    window.host.store.list('boards'),
  ]);
  const board = boards.find((b) => b.id === settings[0]?.boardId) ?? boards[0];
  const mine = board
    ? people.filter((p) => p.boardId === board.id || (!p.boardId && board.id === boards[0].id))
    : people;
  render(mine);
} catch (e) {
  render([]);
}
