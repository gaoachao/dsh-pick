import { limits, localUrl, parseObservation, styleProperties } from '../shared/validation.js';
import type { PickObservation, PickWarning } from '../shared/validation.js';

export const overlayAttribute = 'data-dsh-pick-overlay';

export function selectable(element: Element): boolean {
  return element.isConnected && element.ownerDocument === document &&
    element.getRootNode() === document && !element.closest('[' + overlayAttribute + ']') &&
    !element.matches('iframe, frame, html, head, script, style, link, meta');
}

function unique(selector: string, element: Element): boolean {
  try {
    const matches = document.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === element;
  } catch {
    return false;
  }
}

export function selectorFor(element: Element): string {
  if (!selectable(element)) throw new Error('This element cannot be selected');
  for (const attribute of ['data-testid', 'id']) {
    const value = element.getAttribute(attribute);
    if (!value || value.length > 256) continue;
    const candidate = attribute === 'id' ? '#' + CSS.escape(value)
      : '[data-testid=' + CSS.escape(value) + ']';
    if (unique(candidate, element)) return candidate;
  }
  const parts: string[] = [];
  let node: Element | null = element;
  for (let depth = 0; node && depth < 32; depth++, node = node.parentElement) {
    let position = 1;
    for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
      if (sibling.localName === node.localName) position++;
    }
    parts.unshift(CSS.escape(node.localName) + ':nth-of-type(' + position + ')');
    const selector = parts.join(' > ');
    if (selector.length > limits.selector) break;
    if (unique(selector, element)) return selector;
  }
  throw new Error('Could not create a unique locator; select a smaller element');
}

/** Bounded traversal excludes editable subtrees even when an ancestor is selected. */
function visibleText(element: Element, warnings: Set<PickWarning>): string {
  const skip = 'input, textarea, select, option, script, style, noscript, [contenteditable], [' + overlayAttribute + ']';
  if (element.closest(skip)) return '';
  const stack: Node[] = [element];
  let text = '';
  let visited = 0;
  while (stack.length && text.length <= limits.text) {
    if (++visited > 2_000) { warnings.add('text-incomplete'); break; }
    const node = stack.pop()!;
    if (node.nodeType === Node.TEXT_NODE) {
      const raw = node.textContent ?? '';
      if (raw.length > limits.text + 1) warnings.add('text-truncated');
      text += raw.slice(0, limits.text + 1).replace(/\s+/g, ' ') + ' ';
    } else if (node instanceof Element) {
      if (node.matches(skip)) continue;
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility !== 'visible' ||
          style.contentVisibility === 'hidden' || style.opacity === '0') continue;
      // Bound the worklist as well as the number of visited nodes.
      const available = Math.max(0, 2_000 - visited - stack.length);
      const count = Math.min(node.childNodes.length, available);
      if (count < node.childNodes.length) warnings.add('text-incomplete');
      for (let index = count - 1; index >= 0; index--) stack.push(node.childNodes[index]!);
    }
  }
  text = text.trim();
  if (text.length > limits.text || stack.length) warnings.add('text-truncated');
  return text.slice(0, limits.text);
}

export function observe(element: Element): PickObservation {
  const selector = selectorFor(element);
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) throw new Error('The element has no visible bounds');
  const warnings = new Set<PickWarning>();
  const styles: Record<string, string> = {};
  const computed = getComputedStyle(element);
  for (const property of styleProperties) {
    const value = computed.getPropertyValue(property);
    if (value.length > limits.style) warnings.add('styles-truncated');
    styles[property] = value.slice(0, limits.style);
  }
  const url = localUrl(location.href);
  url.search = '';
  url.hash = '';
  return parseObservation({
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    page: {
      url: url.href,
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
    },
    element: {
      selector, tagName: element.localName,
      text: visibleText(element, warnings),
      bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      styles,
    },
    warnings: [...warnings],
  });
}

export function sameObservation(a: PickObservation, b: PickObservation): boolean {
  return JSON.stringify({ ...a, capturedAt: '' }) === JSON.stringify({ ...b, capturedAt: '' });
}
