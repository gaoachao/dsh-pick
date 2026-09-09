import { boundedString, limits, parseObservation, record } from './validation.js';
import type { PickObservation } from './validation.js';

export type MessageType = 'connect' | 'ready' | 'disconnected' | 'pick:start' | 'pick:cancel' | 'pick:validate'
  | 'pick:result' | 'pick:cancelled' | 'pick:valid' | 'pick:stale' | 'pick:error';

/** Experimental browser protocol; it never contains a DSH session or workspace identifier. */
export interface BridgeMessage {
  channel: 'dsh-pick';
  protocolVersion: 1;
  type: MessageType;
  connectionId: string;
  requestId: string;
  sequence: number;
  pageInstanceId?: string;
  pickId?: string;
  observation?: PickObservation;
  error?: string;
}

const types: readonly MessageType[] = [
  'connect', 'ready', 'disconnected', 'pick:start', 'pick:cancel', 'pick:validate',
  'pick:result', 'pick:cancelled', 'pick:valid', 'pick:stale', 'pick:error',
];
const identifier = (input: unknown): string => {
  const value = boundedString(input, 64);
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(value)) throw new Error('Invalid identifier');
  return value;
};

/** Only bounded JSON strings are accepted; never stringify arbitrary incoming objects. */
export function decodeMessage(input: unknown): BridgeMessage | undefined {
  try {
    if (typeof input !== 'string' || input.length > limits.messageBytes ||
        new TextEncoder().encode(input).byteLength > limits.messageBytes) return undefined;
    const data = record(JSON.parse(input));
    if (data.channel !== 'dsh-pick' || data.protocolVersion !== 1 ||
        !types.includes(data.type as MessageType) ||
        !Number.isSafeInteger(data.sequence) || (data.sequence as number) < 0) return undefined;
    const type = data.type as MessageType;
    const message: BridgeMessage = {
      channel: 'dsh-pick', protocolVersion: 1, type,
      connectionId: identifier(data.connectionId),
      requestId: identifier(data.requestId),
      sequence: data.sequence as number,
    };
    if (type !== 'connect') message.pageInstanceId = identifier(data.pageInstanceId);
    if (['pick:validate', 'pick:result', 'pick:valid', 'pick:stale'].includes(type)) {
      message.pickId = identifier(data.pickId);
    }
    if (type === 'pick:result') message.observation = parseObservation(data.observation);
    if (type === 'pick:error') message.error = boundedString(data.error, 256);
    return message;
  } catch {
    return undefined;
  }
}

export function encodeMessage(message: BridgeMessage): string {
  const value = JSON.stringify(message);
  if (!decodeMessage(value)) throw new Error('Invalid or oversized picker message');
  return value;
}
