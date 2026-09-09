import { observe, overlayAttribute, sameObservation, selectable } from './observe.js';
import type { PickObservation } from '../shared/validation.js';

export interface SelectedPick { pickId: string; observation: PickObservation }
interface Selection extends SelectedPick { element: Element; location: string }

export function createPicker() {
  let selection: Selection | undefined;
  let stop: (() => void) | undefined;

  function cancel() {
    stop?.();
    selection = undefined;
  }

  function start(onPick: (pick: SelectedPick) => void, onCancel: () => void, onError: (error: string) => void) {
    cancel();
    const host = document.createElement('div');
    host.setAttribute(overlayAttribute, '');
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none';
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = [
      ':host{color-scheme:light}',
      '*{box-sizing:border-box}',
      '.box{position:fixed;border:2px solid #4355db;background:#4355db12;pointer-events:none}',
      '.label{position:absolute;left:-2px;bottom:100%;padding:4px 7px;background:#4355db;color:white;font:12px/1.4 ui-monospace,monospace;white-space:nowrap}',
      '.hint{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:14px;align-items:center;max-width:calc(100vw - 24px);padding:10px 12px 10px 16px;background:#fbfbff;color:#25254a;border:1px solid #dddff0;border-radius:8px;box-shadow:0 4px 24px #25254a20;font:13px/1.4 system-ui,sans-serif;pointer-events:auto}',
      'button{border:1px solid #dddff0;border-radius:4px;padding:5px 9px;background:white;color:#25254a;font:inherit;cursor:pointer}',
      'button:focus-visible{outline:2px solid #4355db;outline-offset:2px}',
    ].join('');
    const box = document.createElement('div');
    box.className = 'box';
    box.hidden = true;
    const label = document.createElement('span');
    label.className = 'label';
    box.append(label);
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.setAttribute('role', 'status');
    const text = document.createElement('span');
    text.textContent = 'Pick an element · Esc to exit';
    const button = document.createElement('button');
    button.textContent = 'Cancel';
    button.type = 'button';
    hint.append(text, button);
    shadow.append(style, box, hint);
    document.documentElement.append(host);
    const abort = new AbortController();
    let active = true;
    let hovered: Element | undefined;
    let frame = 0;
    let pointer: { x: number; y: number } | undefined;
    const previousFocus = document.activeElement;

    const cleanup = () => {
      if (!active) return;
      active = false;
      cancelAnimationFrame(frame);
      abort.abort();
      host.remove();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected &&
          (document.activeElement === document.body || document.activeElement === host)) {
        previousFocus.focus({ preventScroll: true });
      }
      stop = undefined;
    };
    stop = () => { cleanup(); onCancel(); };
    const options = { signal: abort.signal, capture: true };

    const update = () => {
      frame = 0;
      const candidate = pointer ? document.elementFromPoint(pointer.x, pointer.y) : hovered;
      hovered = candidate && selectable(candidate) ? candidate : undefined;
      if (!hovered) { box.hidden = true; return; }
      const rect = hovered.getBoundingClientRect();
      box.hidden = false;
      box.style.left = rect.x + 'px';
      box.style.top = rect.y + 'px';
      box.style.width = rect.width + 'px';
      box.style.height = rect.height + 'px';
      label.textContent = hovered.localName + ' · ' + Math.round(rect.width) + ' × ' + Math.round(rect.height);
      label.style.bottom = rect.top < 28 ? 'auto' : '100%';
      label.style.top = rect.top < 28 ? '100%' : 'auto';
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    document.addEventListener('pointermove', event => {
      if (event.composedPath().includes(host)) return;
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    }, options);
    window.addEventListener('scroll', schedule, options);
    window.addEventListener('resize', schedule, options);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); cancel(); }
    }, options);
    const intercept = (event: Event) => {
      if (event.composedPath().includes(host)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    document.addEventListener('pointerdown', intercept, options);
    document.addEventListener('mousedown', intercept, options);
    document.addEventListener('pointerup', intercept, options);
    document.addEventListener('mouseup', intercept, options);
    document.addEventListener('click', event => {
      if (event.composedPath().includes(host)) return;
      intercept(event);
      const candidate = event.composedPath()[0];
      if (!(candidate instanceof Element) || !selectable(candidate)) {
        text.textContent = 'Select an element in the main page · Esc to exit';
        return;
      }
      try {
        const observation = observe(candidate);
        selection = { element: candidate, observation, pickId: crypto.randomUUID(), location: location.href };
        cleanup();
        onPick({ pickId: selection.pickId, observation });
      } catch (error) {
        text.textContent = error instanceof Error ? error.message : 'Select another element';
        onError(text.textContent);
        cleanup();
      }
    }, options);
    button.addEventListener('click', cancel, { signal: abort.signal });
  }

  function validate(pickId: string): boolean {
    if (!selection || selection.pickId !== pickId || selection.location !== location.href) return false;
    try {
      return sameObservation(selection.observation, observe(selection.element));
    } catch {
      return false;
    }
  }

  return { start, cancel, validate, dispose: cancel };
}
