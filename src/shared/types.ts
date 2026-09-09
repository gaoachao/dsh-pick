/** Draft conversation contract. Only the M1 page observation subset has runtime validation today. */
export interface PickContext {
  schemaVersion: 1;
  /** ISO 8601 timestamp of the observation. */
  capturedAt: string;
  /** User-authored request, kept separate from observed page content. */
  feedback: string;
  page: {
    /** URL without credentials, search parameters, or a fragment. */
    url: string;
    viewport: {
      width: number;
      height: number;
      devicePixelRatio: number;
    };
  };
  element: {
    /** A locator candidate, not a promise of stability across page changes. */
    selector: string;
    tagName: string;
    /** Optional bounded visible text; never an input value or full outerHTML. */
    text?: string;
    /** Viewport-relative CSS pixels, as returned by getBoundingClientRect(). */
    bounds: { x: number; y: number; width: number; height: number };
    /** Only explicitly selected computed-style properties. */
    styles?: Partial<Record<PickStyleProperty, string>>;
  };
  /** Omit when a development adapter cannot establish a source location. */
  source?: {
    /** Workspace-relative path. */
    file: string;
    /** One-based source coordinates. */
    line: number;
    column?: number;
    componentName?: string;
    origin: 'instrumentation' | 'source-map';
  };
  /** Optional artifact reference, never base64 image bytes in the text context. */
  screenshot?: { path: string };
}

export type PickStyleProperty =
  | 'display'
  | 'position'
  | 'overflow'
  | 'z-index'
  | 'color'
  | 'background-color'
  | 'font-size'
  | 'line-height'
  | 'margin'
  | 'padding';
