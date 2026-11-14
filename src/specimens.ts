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

type FallbackControl = {
  toggle: () => void;
  describe: () => { simulated: boolean; active: boolean; reason: string };
};

export const specimenFallbacks = new Map<HTMLElement, FallbackControl>();

function configureFallback(
  section: HTMLElement,
  supported: boolean,
  unavailable: string,
  apply: (active: boolean) => void,
  preferences: () => string[] = () => [],
) {
  let simulated = false;

  function describe() {
    const reasons = [
      ...(supported ? [] : [unavailable]),
      ...preferences(),
      ...(simulated ? ['Fallback simulation is on.'] : []),
    ];
    return {
      simulated,
      active: reasons.length > 0,
      reason: reasons.join(' '),
    };
  }

  function update() {
    const { active } = describe();
    apply(active);
    section.dispatchEvent(new Event('specimen-fallback-change', { bubbles: true }));
  }

  specimenFallbacks.set(section, {
    describe,
    toggle() {
      simulated = !simulated;
      update();
    },
  });
  update();
  return update;
}

const cardSection = card?.closest<HTMLElement>('[data-specimen-id]');
if (cardSection) {
  configureFallback(
    cardSection,
    CSS.supports('container-type', 'inline-size') && typeof CSSContainerRule === 'function',
    'This browser does not support size container queries.',
    active => {
      cardSection.toggleAttribute('data-fallback-active', active);
      layout?.update();
    },
  );
}

const dialog = document.querySelector<HTMLDialogElement>('#demo-dialog');
const dialogTrigger = document.querySelector<HTMLButtonElement>('#dialog-open');
const disclosure = document.querySelector<HTMLDetailsElement>('#dialog-fallback');
const dialogSection = dialogTrigger?.closest<HTMLElement>('[data-specimen-id]');
if (dialog && dialogTrigger && dialogSection && disclosure) {
  const supported = typeof dialog.showModal === 'function' && typeof dialog.close === 'function';
  const summary = disclosure.querySelector('summary')!;

  if (supported) {
    // Keep top-layer UI outside the experimental HTML-in-Canvas surface.
    document.body.append(dialog);
    dialogTrigger.addEventListener('click', () => dialog.showModal());
    dialog.addEventListener('close', () => {
      if (!dialogTrigger.hidden) dialogTrigger.focus({ preventScroll: true });
    });
  }

  configureFallback(dialogSection, supported, 'This browser does not support native modal dialogs.', active => {
    const focused = document.activeElement;
    disclosure.hidden = !active;
    dialogTrigger.hidden = active;
    if (active && dialog.open) dialog.close();
    if (active && (focused === dialogTrigger || dialog.contains(focused))) {
      summary.focus({ preventScroll: true });
    } else if (!active && disclosure.contains(focused)) {
      dialogTrigger.focus({ preventScroll: true });
    }
  });
}

const motion = document.querySelector<HTMLElement>('#layer-shift');
if (motion) {
  const root = document.documentElement;
  const systemReduced = matchMedia('(prefers-reduced-motion: reduce)');
  const update = configureFallback(
    motion,
    CSS.supports('translate', '1px 0') && CSS.supports('transition', 'translate 1s'),
    'This browser does not support CSS translation and transitions.',
    active => motion.toggleAttribute('data-fallback-active', active),
    () => [
      ...(systemReduced.matches ? ['System preference requests reduced motion.'] : []),
      ...(root.dataset.motion === 'reduce' ? ['Blueprint preference requests reduced motion.'] : []),
    ],
  );
  systemReduced.addEventListener('change', update);
  new MutationObserver(update).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
}
