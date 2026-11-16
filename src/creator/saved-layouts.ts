import { isProject, type Project } from './model';

type SavedLayout = { id: string; name: string; layoutCount: number; savedAt: string };
const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(new URL(url, location.href), { ...init, headers: { Accept: 'application/json', ...init?.headers } });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Database request failed');
  return response.json();
}

export function bindSavedLayouts(
  dialog: HTMLDialogElement,
  trigger: HTMLButtonElement,
  currentProject: () => Project,
  restoreProject: (project: Project) => void,
) {
  const form = dialog.querySelector<HTMLFormElement>('#save-project')!;
  const name = dialog.querySelector<HTMLInputElement>('input[name="name"]')!;
  const list = dialog.querySelector<HTMLUListElement>('#saved-projects')!;
  const status = dialog.querySelector<HTMLElement>('#database-status')!;
  const save = form.querySelector<HTMLButtonElement>('button')!;
  let busy = false;

  function setBusy(value: boolean) {
    busy = value;
    save.disabled = value;
    list.querySelectorAll('button').forEach(button => { button.disabled = value; });
  }

  async function refresh(success?: string) {
    setBusy(true);
    status.textContent = 'Loading saved projects…';
    try {
      const { layouts } = await request<{ layouts: SavedLayout[] }>('../api/layouts');
      list.replaceChildren(...layouts.map(entry => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = entry.name;
        button.dataset.savedId = entry.id;
        const meta = document.createElement('small');
        meta.textContent = `${entry.layoutCount} ${entry.layoutCount === 1 ? 'layout' : 'layouts'} · ${date.format(new Date(entry.savedAt))}`;
        li.append(button, meta);
        return li;
      }));
      status.textContent = success ?? (layouts.length ? 'Choose a project to reopen it.' : 'No projects saved to the database yet.');
    } catch {
      list.replaceChildren();
      status.textContent = 'Database unavailable. Your browser can still save this workspace locally.';
    } finally {
      setBusy(false);
    }
  }

  trigger.addEventListener('click', () => {
    const project = currentProject();
    name.value = project.sheets.find(item => item.id === project.active)?.name ?? '';
    dialog.showModal();
    if (!busy) void refresh();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !name.value.trim()) return;
    setBusy(true);
    status.textContent = 'Saving to the database…';
    try {
      await request<SavedLayout>('../api/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.value.trim(), project: currentProject() }),
      });
      await refresh('Saved a database copy of the workspace.');
    } catch {
      status.textContent = 'Could not save to the database. Local edits are still in the workspace.';
    } finally {
      setBusy(false);
    }
  });

  list.addEventListener('click', async event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-saved-id]');
    if (busy || !button?.dataset.savedId) return;
    setBusy(true);
    status.textContent = 'Opening the saved project…';
    try {
      const { project } = await request<{ project: unknown }>(`../api/layouts/${encodeURIComponent(button.dataset.savedId)}`);
      if (!isProject(project)) throw new Error('Invalid saved project');
      if (!dialog.open) return;
      dialog.close();
      restoreProject(project);
    } catch {
      status.textContent = 'Could not reopen the saved project.';
    } finally {
      setBusy(false);
    }
  });
}
