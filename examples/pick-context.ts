import type { PickContext } from '../src/shared/types.js';

/** Hand-authored fixture showing the proposed contract, not a captured browser result. */
export const examplePick = {
  schemaVersion: 1,
  capturedAt: '2026-09-08T04:00:00.000Z',
  feedback: '这个菜单在手机上超出了屏幕，请修复并验证键盘操作。',
  page: {
    url: 'http://localhost:5173/settings',
    viewport: { width: 390, height: 844, devicePixelRatio: 2 },
  },
  element: {
    selector: '[data-testid="account-menu"]',
    tagName: 'div',
    text: 'Account settings',
    bounds: { x: 320, y: 56, width: 240, height: 180 },
    styles: { position: 'absolute', overflow: 'visible' },
  },
  source: {
    file: 'src/components/AccountMenu.tsx',
    line: 24,
    componentName: 'AccountMenu',
    origin: 'instrumentation',
  },
} satisfies PickContext;
