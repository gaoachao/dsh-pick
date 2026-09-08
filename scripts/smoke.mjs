import assert from 'node:assert/strict';
import { Context } from '@deepseek-ai/cordis';
import * as plugin from 'dsh-pick';

// Import through the public export, then mount in a real Cordis runtime.
const ctx = new Context();
try {
  const fiber = ctx.plugin(plugin);
  await fiber.await();
  assert.equal(fiber.name, 'dsh-pick');
  assert.notEqual(fiber.uid, null);
  await fiber.dispose();
  assert.equal(fiber.uid, null);
  console.info('PASS: package export, Cordis activation and disposal.');
} finally {
  await ctx.fiber.dispose();
}
