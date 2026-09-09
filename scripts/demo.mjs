import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { dshPick } from '../lib/adapters/vite/index.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const servers = [];
try {
  for (const [name, port, plugins] of [
    ['controller', 4173, []],
    ['target', 4174, [dshPick({ controllerOrigin: 'http://127.0.0.1:4173' })]],
  ]) {
    const server = await createServer({
      configFile: false,
      root: root + 'examples/demo/' + name,
      plugins,
      server: { host: '127.0.0.1', port, strictPort: true, fs: { allow: [root] } },
    });
    servers.push(server);
    await server.listen();
  }
  console.log('dsh-pick browser preview: http://127.0.0.1:4173');
  console.log('Open the target from the preview to connect the two windows.');
} catch (error) {
  await Promise.all(servers.map(server => server.close()));
  throw error;
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await Promise.all(servers.map(server => server.close()));
    process.exit(0);
  });
}
