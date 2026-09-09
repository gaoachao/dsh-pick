import { readFile } from 'node:fs/promises';
import { posix } from 'node:path';
import type { Plugin } from 'vite';
import { exactOrigin } from '../../shared/validation.js';

export interface DshPickOptions {
  /** Exact loopback origin of the controller that opens this page, without a trailing slash. */
  controllerOrigin: string;
}

const publicId = 'virtual:dsh-pick';
const resolvedId = '\0' + publicId;
const modulePrefix = publicId + '/';
const resolvedPrefix = '\0' + modulePrefix;

/** Development-only injection. No scripts, styles, routes or source metadata in production builds. */
export function dshPick(options: DshPickOptions): Plugin {
  const origin = exactOrigin(options.controllerOrigin);
  let base = '/';
  // Resolve only this fixed graph. Browser module IDs contain no filesystem paths.
  const modules = new Map([
    ['picker/runtime.js', new URL('../../picker/runtime.js', import.meta.url)],
    ['picker/picker.js', new URL('../../picker/picker.js', import.meta.url)],
    ['picker/observe.js', new URL('../../picker/observe.js', import.meta.url)],
    ['shared/protocol.js', new URL('../../shared/protocol.js', import.meta.url)],
    ['shared/validation.js', new URL('../../shared/validation.js', import.meta.url)],
  ]);
  return {
    name: 'dsh-pick',
    apply: 'serve',
    configResolved(config) { base = config.base; },
    resolveId(id, importer) {
      if (id === publicId) return resolvedId;
      const key = id.startsWith(modulePrefix) ? id.slice(modulePrefix.length)
        : importer?.startsWith(resolvedPrefix) && id.startsWith('.')
          ? posix.normalize(posix.join(posix.dirname(importer.slice(resolvedPrefix.length)), id)) : undefined;
      if (key && modules.has(key)) return resolvedPrefix + key;
    },
    async load(id) {
      if (id.startsWith(resolvedPrefix)) {
        const file = modules.get(id.slice(resolvedPrefix.length));
        if (file) return readFile(file, 'utf8');
      }
      if (id !== resolvedId) return;
      return [
        'import { installPicker } from ' + JSON.stringify(modulePrefix + 'picker/runtime.js') + ';',
        'const options = { controllerOrigin: ' + JSON.stringify(origin) + ' };',
        'let dispose = installPicker(options);',
        'const reset = () => { dispose(); dispose = installPicker(options); };',
        'if (import.meta.hot) {',
        '  import.meta.hot.on("vite:beforeUpdate", reset);',
        '  import.meta.hot.dispose(() => { import.meta.hot.off("vite:beforeUpdate", reset); dispose(); });',
        '}',
      ].join('\n');
    },
    transformIndexHtml: {
      order: 'pre',
      handler() {
        return [{ tag: 'script', attrs: { type: 'module', src: base + '@id/' + publicId }, injectTo: 'head' }];
      },
    },
  };
}
