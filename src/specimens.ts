import './specimens.css';

const frame = document.querySelector<HTMLElement>('#card-preview');
const card = frame?.querySelector<HTMLElement>('.lab-adaptive');
const width = document.querySelector<HTMLInputElement>('#preview-width');
const widthOutput = document.querySelector<HTMLOutputElement>('#preview-width-output');

if (frame && card && width && widthOutput && typeof ResizeObserver === 'function') {
  width.closest<HTMLElement>('.lab-width-controls')!.hidden = false;
  width.addEventListener('input', () => {
    frame.style.setProperty('--preview-width', `${width.value}%`);
  });
  new ResizeObserver(([entry]) => {
    const pixels = Math.round(entry.contentRect.width);
    const columns = getComputedStyle(card).gridTemplateColumns.split(' ').length;
    const description = `${pixels} px · ${columns === 2 ? 'Two columns' : 'Stacked'}`;
    widthOutput.value = description;
    width.setAttribute('aria-valuetext', description);
  }).observe(frame);
}

const dialog = document.querySelector<HTMLDialogElement>('#demo-dialog');
const dialogTrigger = document.querySelector<HTMLButtonElement>('#dialog-open');
if (dialog && dialogTrigger && typeof dialog.showModal === 'function') {
  // Keep top-layer UI outside the experimental HTML-in-Canvas surface.
  document.body.append(dialog);
  document.querySelector<HTMLElement>('#dialog-fallback')!.hidden = true;
  dialogTrigger.hidden = false;
  dialogTrigger.addEventListener('click', () => dialog.showModal());
  dialog.addEventListener('close', () => dialogTrigger.focus({ preventScroll: true }));
}
