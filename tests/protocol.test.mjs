import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeMessage, encodeMessage } from '../lib/shared/protocol.js';
import { exactOrigin, limits, parseObservation } from '../lib/shared/validation.js';

const observation = () => ({
  schemaVersion: 1, capturedAt: '2026-09-09T01:02:03.000Z',
  page: { url: 'http://127.0.0.1:4174/settings', viewport: { width: 390, height: 844, devicePixelRatio: 2 } },
  element: { selector: '#save', tagName: 'button', text: 'Save', bounds: { x: -10, y: 20, width: 100, height: 40 }, styles: { color: 'red' } },
  warnings: [],
});
const message = () => ({
  channel: 'dsh-pick', protocolVersion: 1, type: 'pick:result',
  connectionId: 'connection-1', pageInstanceId: 'page-1', requestId: 'request-1',
  sequence: 1, pickId: 'pick-1', observation: observation(),
});

test('observation roundtrip keeps viewport coordinates and only whitelisted fields', () => {
  const input = message();
  input.observation.feedback = 'page-authored instructions';
  input.observation.source = { file: '/etc/passwd' };
  input.observation.element.value = 'private-password';
  input.observation.element.styles['background-image'] = 'url(private)';
  const parsed = decodeMessage(JSON.stringify(input));
  assert.deepEqual(parsed.observation, observation());
  assert.deepEqual(JSON.parse(encodeMessage(parsed)), message());
});

test('rejects malformed, incompatible, oversized and non-string transport', () => {
  for (const input of [
    {}, null, '{broken', JSON.stringify({ ...message(), protocolVersion: 2 }),
    JSON.stringify({ ...message(), sequence: -1 }),
    JSON.stringify({ ...message(), sequence: Number.MAX_SAFE_INTEGER + 1 }),
    JSON.stringify({ ...message(), pageInstanceId: '../other' }),
    JSON.stringify({ ...message(), observation: { ...observation(), capturedAt: '2026-02-31T01:02:03.000Z' } }),
    ' '.repeat(limits.messageBytes + 1),
    JSON.stringify({ ...message(), extra: '界'.repeat(12_000) }),
  ]) assert.equal(decodeMessage(input), undefined);
});

test('validates observation limits, privacy boundaries and finite numbers', () => {
  const input = observation();
  for (const patch of [
    { schemaVersion: 2 },
    { warnings: ['unknown'] },
    { page: { ...input.page, url: 'https://example.com/' } },
    { page: { ...input.page, url: 'http://user:secret@localhost/' } },
    { page: { ...input.page, url: 'http://localhost/?token=secret#private' } },
    { page: { ...input.page, viewport: { width: 0, height: 844, devicePixelRatio: 2 } } },
    { element: { ...input.element, text: 'x'.repeat(limits.text + 1) } },
    { element: { ...input.element, bounds: { ...input.element.bounds, width: NaN } } },
    { element: { ...input.element, styles: { color: 'x'.repeat(limits.style + 1) } } },
  ]) assert.throws(() => parseObservation({ ...input, ...patch }));
});

test('configuration requires an explicit loopback origin', () => {
  assert.equal(exactOrigin('http://localhost:5173'), 'http://localhost:5173');
  assert.equal(exactOrigin('http://[::1]:5173'), 'http://[::1]:5173');
  for (const url of ['*', 'null', 'file:///tmp/app', 'https://example.com', 'http://localhost:5173/', 'http://localhost/path', 'http://localhost?token=secret']) {
    assert.throws(() => exactOrigin(url));
  }
});
