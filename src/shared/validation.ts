import type { PickContext, PickStyleProperty } from './types.js';

export const limits = { messageBytes: 32_768, text: 2_000, selector: 2_000, style: 256 } as const;
export const styleProperties: readonly PickStyleProperty[] = [
  'display', 'position', 'overflow', 'z-index', 'color',
  'background-color', 'font-size', 'line-height', 'margin', 'padding',
];
export type PickWarning = 'text-truncated' | 'text-incomplete' | 'styles-truncated';
export type PickObservation = Pick<PickContext, 'schemaVersion' | 'capturedAt' | 'page' | 'element'> & {
  warnings: PickWarning[];
};

export function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object');
  return value as Record<string, unknown>;
}

export function boundedString(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length > max) throw new Error('Invalid string');
  return value;
}

function number(value: unknown, min = -1_000_000, max = 1_000_000): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error('Invalid coordinate');
  }
  return value;
}

export function localUrl(value: string): URL {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.username || url.password) throw new Error('Expected a loopback HTTP(S) URL without credentials');
  return url;
}

export function exactOrigin(value: string): string {
  const url = localUrl(value);
  if (value !== url.origin) throw new Error('Use an exact origin, without a path or trailing slash');
  return url.origin;
}

/** Rebuild the allowed page fields. Source paths, feedback and arbitrary keys never cross this boundary. */
export function parseObservation(input: unknown): PickObservation {
  const data = record(input);
  if (data.schemaVersion !== 1) throw new Error('Unsupported observation version');
  const capturedAt = boundedString(data.capturedAt, 32);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(capturedAt) ||
      !Number.isFinite(Date.parse(capturedAt)) || new Date(capturedAt).toISOString() !== capturedAt) {
    throw new Error('Invalid capture time');
  }
  const page = record(data.page);
  const url = localUrl(boundedString(page.url, 4_096));
  if (url.search || url.hash) throw new Error('Page URL must exclude query and fragment');
  const viewport = record(page.viewport);
  const element = record(data.element);
  const selector = boundedString(element.selector, limits.selector);
  const tagName = boundedString(element.tagName, 128);
  if (!selector || !/^[a-z][a-z0-9-]*$/.test(tagName)) throw new Error('Invalid element locator');
  const bounds = record(element.bounds);
  const styles: Partial<Record<PickStyleProperty, string>> = {};
  if (element.styles !== undefined) {
    const raw = record(element.styles);
    for (const key of styleProperties) {
      if (raw[key] !== undefined) styles[key] = boundedString(raw[key], limits.style);
    }
  }
  if (!Array.isArray(data.warnings) || data.warnings.length > 3 ||
      data.warnings.some(warning => !['text-truncated', 'text-incomplete', 'styles-truncated'].includes(warning))) {
    throw new Error('Invalid observation warnings');
  }
  return {
    schemaVersion: 1, capturedAt,
    page: {
      url: url.href,
      viewport: {
        width: number(viewport.width, 1, 100_000),
        height: number(viewport.height, 1, 100_000),
        devicePixelRatio: number(viewport.devicePixelRatio, 0.01, 100),
      },
    },
    element: {
      selector, tagName,
      ...(element.text === undefined ? {} : { text: boundedString(element.text, limits.text) }),
      bounds: {
        x: number(bounds.x), y: number(bounds.y),
        width: number(bounds.width, 0), height: number(bounds.height, 0),
      },
      styles,
    },
    warnings: [...new Set(data.warnings)] as PickWarning[],
  };
}
