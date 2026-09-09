import { decodeMessage, encodeMessage } from '../shared/protocol.js';
import type { BridgeMessage } from '../shared/protocol.js';
import { exactOrigin, localUrl } from '../shared/validation.js';
import { createPicker } from './picker.js';

/** Installed by the development adapter. Inert until the configured opener explicitly connects. */
export function installPicker(options: { controllerOrigin: string }): () => void {
  const origin = exactOrigin(options.controllerOrigin);
  localUrl(location.href);
  if (window !== window.top || !window.opener) return () => {};
  const controller = window.opener as Window;
  const pageInstanceId = crypto.randomUUID();
  const picker = createPicker();
  let connectionId: string | undefined;
  let received = -1;
  let sent = 0;
  let disposed = false;
  const abort = new AbortController();

  const reply = (request: BridgeMessage, type: BridgeMessage['type'], extra: Partial<BridgeMessage> = {}) => {
    controller.postMessage(encodeMessage({
      channel: 'dsh-pick', protocolVersion: 1, connectionId: request.connectionId,
      requestId: request.requestId, pageInstanceId, sequence: ++sent, type, ...extra,
    }), origin);
  };

  window.addEventListener('message', event => {
    if (event.origin !== origin || event.source !== controller) return;
    const message = decodeMessage(event.data);
    if (!message) return;
    if (message.type === 'connect') {
      if (message.connectionId !== connectionId) {
        picker.cancel();
        connectionId = message.connectionId;
        received = -1;
        sent = 0;
      }
      reply(message, 'ready');
      return;
    }
    if (!['pick:start', 'pick:validate', 'pick:cancel'].includes(message.type) ||
        message.connectionId !== connectionId || message.pageInstanceId !== pageInstanceId ||
        message.sequence <= received) return;
    received = message.sequence;
    if (message.type === 'pick:start') {
      picker.start(
        pick => reply(message, 'pick:result', pick),
        () => reply(message, 'pick:cancelled'),
        error => reply(message, 'pick:error', { error }),
      );
    } else if (message.type === 'pick:validate') {
      reply(message, picker.validate(message.pickId!) ? 'pick:valid' : 'pick:stale', { pickId: message.pickId! });
    } else {
      picker.cancel();
      reply(message, 'pick:cancelled');
    }
  }, { signal: abort.signal });

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    picker.dispose();
    if (connectionId) controller.postMessage(encodeMessage({
      channel: 'dsh-pick', protocolVersion: 1, type: 'disconnected',
      connectionId, pageInstanceId, requestId: crypto.randomUUID(), sequence: ++sent,
    }), origin);
    abort.abort();
  };
  window.addEventListener('pagehide', dispose, { signal: abort.signal, once: true });
  return dispose;
}
