import { decodeMessage, encodeMessage } from '../shared/protocol.js';
import type { BridgeMessage, MessageType } from '../shared/protocol.js';
import { exactOrigin } from '../shared/validation.js';
import type { PickObservation } from '../shared/validation.js';
export type { PickObservation, PickWarning } from '../shared/validation.js';

export interface PickerResult { pickId: string; observation: PickObservation }
export interface PickerConnection {
  pick(): Promise<PickerResult | null>;
  validate(pickId: string): Promise<boolean>;
  cancel(): Promise<void>;
  dispose(): void;
}

interface Pending {
  accept: readonly MessageType[];
  resolve: (value: BridgeMessage) => void;
  reject: (reason: Error) => void;
  timer: number;
}

/** Browser-only bridge for a future DSH UI or the local demo; never submits a conversation. */
export async function connectPicker(options: {
  targetWindow: Window;
  targetOrigin: string;
  timeoutMs?: number;
  pickTimeoutMs?: number;
}): Promise<PickerConnection> {
  const origin = exactOrigin(options.targetOrigin);
  const target = options.targetWindow;
  if (target === window) throw new Error('Open the target in a separate window');
  const timeout = options.timeoutMs ?? 5_000;
  const pickTimeout = options.pickTimeoutMs ?? 120_000;
  if (![timeout, pickTimeout].every(value => Number.isFinite(value) && value >= 50 && value <= 600_000)) {
    throw new Error('Invalid picker timeout');
  }
  const connectionId = crypto.randomUUID();
  const pending = new Map<string, Pending>();
  let pageInstanceId: string | undefined;
  let sequence = 0;
  let received = -1;
  let disposed = false;
  let closedReason = new Error('Picker connection is closed');
  let picking = false;
  let retry = 0;

  const post = (message: BridgeMessage) => target.postMessage(encodeMessage(message), origin);
  const make = (type: MessageType, extra: Partial<BridgeMessage> = {}): BridgeMessage => ({
    channel: 'dsh-pick', protocolVersion: 1, connectionId,
    requestId: crypto.randomUUID(), sequence: ++sequence, type,
    ...(pageInstanceId ? { pageInstanceId } : {}), ...extra,
  });
  const fail = (reason: Error) => {
    if (disposed) return;
    closedReason = reason;
    disposed = true;
    clearInterval(retry);
    clearInterval(watch);
    window.removeEventListener('message', onMessage);
    window.removeEventListener('pagehide', onPageHide);
    for (const request of pending.values()) { clearTimeout(request.timer); request.reject(reason); }
    pending.clear();
  };
  const waitFor = (message: BridgeMessage, accept: readonly MessageType[], ms = timeout) =>
    new Promise<BridgeMessage>((resolve, reject) => {
      if (disposed) { reject(closedReason); return; }
      pending.set(message.requestId, {
        accept, resolve, reject,
        timer: window.setTimeout(() => {
          // A timed-out pick must also release interception in the target page.
          if (pageInstanceId) post(make('pick:cancel'));
          fail(new Error('Picker request timed out; reconnect the page'));
        }, ms),
      });
      try { post(message); } catch { fail(new Error('Could not contact the target page')); }
    });
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== origin || event.source !== target) return;
    const message = decodeMessage(event.data);
    if (!message || message.connectionId !== connectionId || message.sequence <= received) return;
    if (message.type === 'disconnected' && message.pageInstanceId === pageInstanceId) {
      fail(new Error('Target page changed or closed; reconnect the page'));
      return;
    }
    const request = pending.get(message.requestId);
    if (!request || (!request.accept.includes(message.type) && message.type !== 'pick:error')) return;
    if (pageInstanceId && message.pageInstanceId !== pageInstanceId) return;
    received = message.sequence;
    if (message.type === 'ready') pageInstanceId = message.pageInstanceId;
    pending.delete(message.requestId);
    clearTimeout(request.timer);
    if (message.type === 'pick:error') request.reject(new Error(message.error));
    else request.resolve(message);
  };
  const onPageHide = () => dispose();
  const watch = window.setInterval(() => {
    if (target.closed) fail(new Error('The target page was closed'));
  }, 250);
  window.addEventListener('message', onMessage);
  window.addEventListener('pagehide', onPageHide);
  const hello = make('connect');
  retry = window.setInterval(() => { if (!disposed) post(hello); }, 150);
  try { await waitFor(hello, ['ready']); }
  catch (error) { fail(error instanceof Error ? error : new Error('Connection failed')); throw error; }
  finally { clearInterval(retry); }

  function dispose() {
    if (!disposed && pageInstanceId) post(make('pick:cancel'));
    fail(new Error('Picker connection disposed'));
  }

  return {
    async pick() {
      if (picking) throw new Error('An element pick is already in progress');
      picking = true;
      try {
        const result = await waitFor(make('pick:start'), ['pick:result', 'pick:cancelled'], pickTimeout);
        return result.type === 'pick:cancelled' ? null
          : { pickId: result.pickId!, observation: result.observation! };
      } finally { picking = false; }
    },
    async validate(pickId) {
      const result = await waitFor(make('pick:validate', { pickId }), ['pick:valid', 'pick:stale']);
      return result.pickId === pickId && result.type === 'pick:valid';
    },
    async cancel() { await waitFor(make('pick:cancel'), ['pick:cancelled']); },
    dispose,
  };
}
