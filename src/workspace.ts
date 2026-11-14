type Activity = {
  name: string;
  area: string;
  status: string;
  updated: string;
};

const form = document.querySelector<HTMLFormElement>('#workspace-controls')!;
const dataset = form.elements.namedItem('dataset') as HTMLSelectElement;
const search = form.elements.namedItem('search') as HTMLInputElement;
const sort = form.elements.namedItem('sort') as HTMLSelectElement;
const tableRegion = document.querySelector<HTMLElement>('.workspace-table-region')!;
const rows = tableRegion.querySelector('tbody')!;
const columns = [...tableRegion.querySelectorAll('th')];
const results = document.querySelector<HTMLElement>('#workspace-results')!;
const empty = document.querySelector<HTMLElement>('#workspace-empty')!;
const emptyMessage = empty.querySelector('p')!;
const reset = empty.querySelector('button')!;

const typical: Activity[] = [...rows.rows].map(row => ({
  name: row.cells[0].textContent!,
  area: row.cells[1].textContent!,
  status: row.cells[2].textContent!,
  updated: row.querySelector('time')!.dateTime,
}));

const stressCases = [
  ['Intrinsic sizing in a responsive dashboard with long unbroken specimen names', 'Layout'],
  ['InternationalizationAndOverflowInANarrowScrollableWorkspace', 'Layout'],
  ['Focus return from a modal with multiple native controls', 'HTML'],
  ['Reduced motion preferences during a scroll-driven transition', 'Motion'],
  ['Pointer tracking on a high-density drawing surface', 'Canvas'],
  ['Sticky headers with a horizontally scrollable activity history', 'Layout'],
];
const statuses = ['Ready to explore', 'In review', 'Needs fallback'];
const crowded = [...typical, ...Array.from({ length: 33 }, (_, index) => {
  const [title, area] = stressCases[index % stressCases.length];
  return {
    name: `${title} · ${index + 1}`,
    area,
    status: statuses[index % statuses.length],
    updated: new Date(Date.UTC(2026, 10, 11 - index)).toISOString().slice(0, 10),
  };
})];

const datasets = { empty: [], typical, crowded };
const sortColumns = ['name', 'area', 'status', 'recent'];
const collator = new Intl.Collator('en', { numeric: true });
const dateFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

function createRow(activity: Activity) {
  const row = document.createElement('tr');
  row.insertCell().textContent = activity.name;
  row.insertCell().textContent = activity.area;
  row.insertCell().textContent = activity.status;
  const time = document.createElement('time');
  time.dateTime = activity.updated;
  time.textContent = dateFormat.format(new Date(activity.updated));
  row.insertCell().append(time);
  return row;
}

function render() {
  const entries = datasets[dataset.value as keyof typeof datasets] ?? typical;
  const query = search.value.trim().toLowerCase();
  const key = sort.value;
  const visible = entries
    .filter(({ name, area, status }) => [name, area, status].some(value => value.toLowerCase().includes(query)))
    .sort((first, second) => {
      const newest = second.updated.localeCompare(first.updated);
      if (key === 'name' || key === 'area' || key === 'status') {
        return collator.compare(first[key], second[key]) || newest;
      }
      return newest;
    });

  rows.replaceChildren(...visible.map(createRow));
  tableRegion.scrollTop = 0;
  columns.forEach((column, index) => {
    if (sortColumns[index] === key) column.setAttribute('aria-sort', key === 'recent' ? 'descending' : 'ascending');
    else column.removeAttribute('aria-sort');
  });
  results.textContent = `${visible.length} of ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
  tableRegion.hidden = visible.length === 0;
  empty.hidden = visible.length > 0;
  emptyMessage.textContent = entries.length
    ? 'No entries match your search.'
    : 'This dataset has no activity. Choose Typical or Crowded to see sample entries.';
  reset.hidden = entries.length === 0;
  const metrics = {
    entries: entries.length,
    areas: new Set(entries.map(entry => entry.area)).size,
    ready: entries.filter(entry => entry.status === 'Ready to explore').length,
  };
  for (const [metric, value] of Object.entries(metrics)) {
    document.querySelector<HTMLElement>(`[data-workspace-metric="${metric}"]`)!.textContent = String(value);
  }
}

form.addEventListener('submit', event => event.preventDefault());
search.addEventListener('input', render);
sort.addEventListener('change', render);
dataset.addEventListener('change', () => {
  search.value = '';
  render();
});
reset.addEventListener('click', () => {
  search.value = '';
  search.focus();
  render();
});
form.hidden = false;
results.hidden = false;
render();
