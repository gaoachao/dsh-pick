# Browser preview

[English README](../README.md) · [中文 README](../README.zh-CN.md) · [Design (中文)](design.md)

This is the first implemented part of M1: a Vite adapter, a DOM picker, and a browser-to-browser bridge. The controller demo is separate from DSH. It does not insert drafts, send messages, resolve source locations, or capture screenshots.

## Try it

From a checkout of this repository:

```sh
pnpm install
pnpm demo
```

Open [the local preview](http://127.0.0.1:4173), click **Open target**, then **Pick an element**. Switch to the React sample window and click an element. Review its context in the controller. **Recheck selection** compares the captured fields with the current element; **Disconnect** releases the connection. Escape or the picker’s Cancel button exits selection.

The demo binds only to loopback, using ports 4173 and 4174. Both ports must be available. Opening the target directly leaves its picker inactive because it has no controller opener.

## Add the Vite adapter

The adapter has been tested with Vite **8.2.2** and a React **19.2.8** sample. Install dsh-pick from GitHub or a local tarball; it is not published to npm.

```ts
// vite.config.ts in the target application
import { defineConfig } from 'vite';
import { dshPick } from 'dsh-pick/vite';

export default defineConfig({
  plugins: [
    dshPick({ controllerOrigin: 'http://127.0.0.1:4173' }),
    // Keep your existing React and other application plugins here.
  ],
});
```

The origin must exactly match the controller's scheme, hostname and port, without a path or trailing slash. Only HTTP(S) origins on localhost, 127.0.0.1 or [::1] are accepted. The target must also use a loopback URL. The controller needs to open the target window in the same browser; a directly opened tab cannot connect through this bridge.

The adapter injects a fixed virtual module graph during Vite development. Production builds omit the entry and runtime entirely. A non-root Vite base is supported. Rebuild dsh-pick and restart Vite after changing the adapter or its browser modules.

## Browser bridge API

A custom browser controller can use the experimental bridge independently of DSH:

```ts
import { connectPicker } from 'dsh-pick/bridge';

// Run inside a user click handler so the browser can open the window.
const targetWindow = window.open('http://127.0.0.1:5173/', '_blank');
if (!targetWindow) throw new Error('Allow the target window to open');

const connection = await connectPicker({
  targetWindow,
  targetOrigin: 'http://127.0.0.1:5173',
  timeoutMs: 5_000,
  pickTimeoutMs: 120_000,
});

try {
  const result = await connection.pick(); // null when cancelled
  if (result && await connection.validate(result.pickId)) {
    // Render the observation for review; this does not send it to DSH.
    console.log(result.observation);
  }
} finally {
  connection.dispose();
}
```

The connection provides pick(), validate(pickId), cancel(), and dispose(). One pick can run at a time. Dispose the connection when the controller unmounts or switches sessions; dispose the previous connection before reconnecting. No session or workspace identifier is sent to the target.

A request timeout closes the connection and cancels target interception when possible. Closing the target rejects or cancels in-flight work. Navigation and HMR invalidate the connection; reconnect explicitly. Unload messages are best effort, so detecting a refreshed page can take up to the request timeout. Popup or COOP restrictions that sever the opener prevent this connection mode.

## Captured data

Observations contain the capture time, a URL without query/hash/credentials, CSS viewport dimensions, DPR, a unique locator candidate, element bounds, bounded text and ten selected style properties. They do not include feedback, source paths, screenshots, input values or editable text.

The transport accepts bounded JSON strings, validates origin/window identity, connection/page identity and sequence, and reconstructs an allowlisted observation. Individual messages are limited to 32 KiB, element text and selectors to 2,000 characters, and each style value to 256 characters. The preview displays warnings when text or styles are truncated or a bounded DOM traversal cannot collect all text.

Only ordinary elements in the top-level document are supported. Text inside form/editable or hidden subtrees is excluded, including when their parent is selected. Visible text can still contain application content; inspect it before sharing. Locators describe the current DOM and are not guaranteed to survive rerenders.

Validation checks the current URL, viewport and captured element fields. It does not establish complete application-state equivalence or guarantee that a later model request sees the same state.

## Tests

```sh
pnpm check
pnpm exec playwright install chromium
pnpm test:browser
pnpm pack --pack-destination .artifacts
```

The browser suite uses a real React page in a second origin and covers capture, click interception, CSS coordinates/DPR, redaction, truncation, stale selections, navigation, cancellation, source checks and replay rejection. Node tests cover protocol boundaries and Vite development/production behavior. CI runs both suites on Node.js 24.

For a local browser already installed on the machine, set DSH_PICK_BROWSER_EXECUTABLE_PATH to its executable when running browser tests. Playwright uses an isolated test context; no existing browser profile is loaded.

The DSH host is still validated separately by the Cordis smoke check. M1 remains incomplete until the official DSH client module and non-destructive draft insertion are implemented and verified.
