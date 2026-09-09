import { test, expect } from '@playwright/test';

test.use({ deviceScaleFactor: 2 });

async function connect(page) {
  await page.goto('/');
  const opened = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open target' }).click();
  const target = await opened;
  await expect(page.getByRole('status')).toContainText('Connected.');
  await expect(target.getByTestId('save-button')).toBeVisible();
  return target;
}

async function pick(page, target, selector) {
  await page.getByRole('button', { name: 'Pick an element' }).click();
  await expect(target.locator('[data-dsh-pick-overlay]')).toHaveCount(1);
  await target.locator(selector).click();
  await expect(page.getByRole('status')).toHaveText('Element captured. Review the context below.');
  return JSON.parse(await page.locator('#result').textContent());
}

test('captures an actual React element, intercepts its click and checks staleness', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const target = await connect(page);
  target.on('pageerror', error => errors.push(error.message));
  await target.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Pick an element' }).click();
  await target.getByTestId('save-button').hover();
  const box = target.locator('[data-dsh-pick-overlay] .box');
  await expect(box).toBeVisible();
  const selectedBounds = await target.getByTestId('save-button').boundingBox();
  const highlightBounds = await box.boundingBox();
  expect(highlightBounds).toEqual(selectedBounds);
  await target.getByTestId('save-button').click();
  await expect(page.getByRole('status')).toContainText('Element captured.');
  const data = JSON.parse(await page.locator('#result').textContent());
  expect(data.page).toEqual({ url: 'http://127.0.0.1:4174/', viewport: { width: 390, height: 844, devicePixelRatio: 2 } });
  expect(data.element.selector).toBe('[data-testid=save-button]');
  expect(data.element.bounds).toEqual(selectedBounds);
  expect(data.element.text).toBe('Save changes');
  await expect(target.getByTestId('saved-count')).toHaveText('Saved 0 times');
  await page.getByRole('button', { name: 'Recheck selection' }).click();
  await expect(page.getByRole('status')).toHaveText('Selection is still current.');
  await target.getByTestId('save-button').evaluate(element => { element.textContent = 'Updated button'; });
  await page.getByRole('button', { name: 'Recheck selection' }).click();
  await expect(page.getByRole('status')).toContainText('Selection is stale.');
  await expect(target.locator('[data-dsh-pick-overlay]')).toHaveCount(0);
  await target.getByTestId('save-button').click();
  await expect(target.getByTestId('saved-count')).toHaveText('Saved 1 times');
  expect(errors).toEqual([]);
});

test('ancestor text excludes form values, editable content and hidden subtrees', async ({ page }) => {
  const target = await connect(page);
  await target.locator('#account-card').evaluate(element => {
    const hidden = document.createElement('div');
    hidden.style.display = 'none';
    hidden.textContent = 'private-hidden-content';
    element.append(hidden);
  });
  const data = await pick(page, target, '#account-card h2');
  expect(data.element.text).toBe('Profile settings');
  await page.getByRole('button', { name: 'Pick an element' }).click();
  await expect(target.locator('[data-dsh-pick-overlay]')).toHaveCount(1);
  // The card's padding is outside its child controls.
  await target.locator('#account-card').click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole('status')).toContainText('Element captured.');
  const captured = await page.locator('#result').textContent();
  expect(captured).toContain('Profile settings');
  expect(captured).not.toContain('private-');
  expect(captured).not.toContain('demo=private');
});

test('Escape and disconnection both restore normal page controls', async ({ page }) => {
  const target = await connect(page);
  await page.getByRole('button', { name: 'Pick an element' }).click();
  await expect(target.locator('[data-dsh-pick-overlay]')).toHaveCount(1);
  await target.keyboard.press('Escape');
  await expect(page.getByRole('status')).toContainText('Selection cancelled.');
  await target.getByTestId('save-button').click();
  await expect(target.getByTestId('saved-count')).toHaveText('Saved 1 times');
  await page.getByRole('button', { name: 'Pick an element' }).click();
  await expect(target.locator('[data-dsh-pick-overlay]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
  await expect(target.locator('[data-dsh-pick-overlay]')).toHaveCount(0);
  await target.getByTestId('save-button').click();
  await expect(target.getByTestId('saved-count')).toHaveText('Saved 2 times');
});

test('picking a link suppresses navigation; a refreshed page invalidates the old connection', async ({ page }) => {
  const target = await connect(page);
  await pick(page, target, '[data-testid=next-link]');
  expect(target.url()).toContain('demo=private');
  await target.getByTestId('next-link').click();
  await expect(target).toHaveURL(/page=next/);
  await page.getByRole('button', { name: 'Recheck selection' }).click();
  await expect(page.getByRole('status')).toContainText('reconnect the page', { timeout: 8_000 });
  await page.getByRole('button', { name: 'Open target' }).click();
  await expect(page.getByRole('status')).toContainText('Connected.');
  await pick(page, target, '[data-testid=save-button]');
});

test('viewport changes and removed elements invalidate observations', async ({ page }) => {
  const target = await connect(page);
  await pick(page, target, '[data-testid=save-button]');
  await target.setViewportSize({ width: 600, height: 700 });
  await page.getByRole('button', { name: 'Recheck selection' }).click();
  await expect(page.getByRole('status')).toContainText('Selection is stale.');
  await pick(page, target, '[data-testid=save-button]');
  await target.getByTestId('save-button').evaluate(element => element.remove());
  await page.getByRole('button', { name: 'Recheck selection' }).click();
  await expect(page.getByRole('status')).toContainText('Selection is stale.');
});

test('truncates large visible text and makes the truncation explicit', async ({ page }) => {
  const target = await connect(page);
  await target.locator('main').evaluate(element => {
    const paragraph = document.createElement('p');
    paragraph.id = 'long-text';
    paragraph.textContent = 'a'.repeat(5_000);
    element.prepend(paragraph);
  });
  const data = await pick(page, target, '#long-text');
  expect(data.element.text).toHaveLength(2_000);
  expect(data.warnings).toContain('text-truncated');
});

test('ignores wrong origins, windows, page identities and replayed requests', async ({ page, context }) => {
  await context.addInitScript(() => {
    window.__pickerMessages = [];
    window.addEventListener('message', event => {
      try {
        const message = JSON.parse(event.data);
        if (message.channel === 'dsh-pick') window.__pickerMessages.push(message);
      } catch {}
    });
  });
  const target = await connect(page);
  const hello = await target.evaluate(() => window.__pickerMessages.find(message => message.type === 'connect'));
  const ready = await page.evaluate(() => window.__pickerMessages.find(message => message.type === 'ready'));
  const command = { ...hello, type: 'pick:start', pageInstanceId: ready.pageInstanceId, sequence: 9_999, requestId: 'forged' };
  await target.evaluate(command => {
    for (const [origin, source, data] of [
      ['http://localhost:4173', window.opener, command],
      ['http://127.0.0.1:4173', window, command],
      ['http://127.0.0.1:4173', window.opener, { ...command, pageInstanceId: 'old-page' }],
      ['http://127.0.0.1:4173', window.opener, { ...command, protocolVersion: 2 }],
    ]) window.dispatchEvent(new MessageEvent('message', { origin, source, data: JSON.stringify(data) }));
  }, command);
  await expect(target.locator('[data-dsh-pick-overlay]')).toHaveCount(0);
  await pick(page, target, '[data-testid=save-button]');
  await target.evaluate(() => {
    const command = window.__pickerMessages.find(message => message.type === 'pick:start' && message.sequence < 9_999);
    window.dispatchEvent(new MessageEvent('message', {
      origin: 'http://127.0.0.1:4173', source: window.opener, data: JSON.stringify(command),
    }));
  });
  await expect(target.locator('[data-dsh-pick-overlay]')).toHaveCount(0);
  await pick(page, target, '[data-testid=save-button]');
});

test('closing the target settles an in-flight pick', async ({ page }) => {
  const target = await connect(page);
  await page.getByRole('button', { name: 'Pick an element' }).click();
  await expect(target.locator('[data-dsh-pick-overlay]')).toHaveCount(1);
  await target.close();
  await expect(page.getByRole('status')).toContainText(/closed|cancelled/);
});

test('the development runtime stays inert without an opener', async ({ page }) => {
  await page.goto('http://127.0.0.1:4174/');
  await expect(page.locator('[data-dsh-pick-overlay]')).toHaveCount(0);
  await page.getByTestId('save-button').click();
  await expect(page.getByTestId('saved-count')).toHaveText('Saved 1 times');
});
