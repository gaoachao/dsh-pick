import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { build, createServer } from 'vite';
import { dshPick } from '../lib/adapters/vite/index.js';

const root = fileURLToPath(new URL('../examples/demo/target', import.meta.url));

test('Vite development injection serves a fixed module graph with a non-root base', async () => {
  const server = await createServer({
    configFile: false, root, base: '/sample/', logLevel: 'silent',
    plugins: [dshPick({ controllerOrigin: 'http://127.0.0.1:4173' })],
    server: { host: '127.0.0.1', port: 0, strictPort: true },
  });
  try {
    await server.listen();
    const origin = 'http://127.0.0.1:' + server.httpServer.address().port;
    const html = await (await fetch(origin + '/sample/')).text();
    assert.match(html, /\/sample\/@id\/virtual:dsh-pick/);
    const entryResponse = await fetch(origin + '/sample/@id/virtual:dsh-pick');
    assert.equal(entryResponse.status, 200);
    const entry = await entryResponse.text();
    assert.match(entry, /installPicker/);
    assert.match(entry, /\/sample\/@id\/__x00__virtual:dsh-pick\/picker\/runtime\.js/);
    const runtime = await fetch(origin + '/sample/@id/__x00__virtual:dsh-pick/picker/runtime.js');
    assert.equal(runtime.status, 200);
    assert.match(runtime.headers.get('content-type'), /javascript/);
    assert.match(await runtime.text(), /function installPicker/);
  } finally { await server.close(); }
});

test('production builds contain no picker injection or runtime', async () => {
  const result = await build({
    configFile: false, root, logLevel: 'silent',
    plugins: [dshPick({ controllerOrigin: 'http://127.0.0.1:4173' })],
    build: { write: false, minify: false },
  });
  const output = Array.isArray(result) ? result.flatMap(item => item.output) : result.output;
  assert.ok(output.some(file => file.fileName === 'index.html'));
  for (const file of output) {
    assert.doesNotMatch(String(file.code ?? file.source), /__dsh_pick|virtual:dsh-pick|data-dsh-pick-overlay|installPicker/);
  }
});
