import './specimens.css';
import { measuredLayouts, previewDescription, type LayoutSnapshot } from './layout-measurements';

const frame = document.querySelector<HTMLElement>('#card-preview');
const card = frame?.querySelector<HTMLElement>('.lab-adaptive');
const width = document.querySelector<HTMLInputElement>('#preview-width');
const widthOutput = document.querySelector<HTMLOutputElement>('#preview-width-output');

const layout = card && measuredLayouts.get(card);
if (frame && width && widthOutput && layout) {
  const updateWidth = (measurement: LayoutSnapshot) => {
    const description = previewDescription(measurement);
    widthOutput.value = description;
    width.setAttribute('aria-valuetext', description);
  };

  width.closest<HTMLElement>('.lab-width-controls')!.hidden = false;
  width.addEventListener('input', () => {
    frame.style.setProperty('--preview-width', `${width.value}%`);
    layout.update();
  });
  layout.subscribe(updateWidth);
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
