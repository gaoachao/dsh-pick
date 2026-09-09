import { connectPicker } from 'dsh-pick/bridge';

const buttons = Object.fromEntries(['open', 'pick', 'validate', 'disconnect'].map(id => [id, document.getElementById(id)]));
const status = document.getElementById('status');
const result = document.getElementById('result');
const locator = document.getElementById('locator');
let connection;
let targetWindow;
let selected;
let generation = 0;
const showError = error => { status.textContent = error.message; };

buttons.open.addEventListener('click', async () => {
  buttons.open.disabled = true;
  const current = ++generation;
  connection?.dispose();
  connection = undefined;
  selected = undefined;
  buttons.pick.disabled = buttons.validate.disabled = buttons.disconnect.disabled = true;
  result.textContent = 'Your selection will appear here.';
  locator.textContent = 'No element selected';
  const target = targetWindow && !targetWindow.closed ? targetWindow
    : window.open('http://127.0.0.1:4174/?demo=private#account', 'dsh-pick-target');
  if (!target) {
    buttons.open.disabled = false;
    status.textContent = 'Allow the target window to open, then try again.';
    return;
  }
  targetWindow = target;
  target.focus();
  status.textContent = 'Connecting to the target…';
  try {
    const next = await connectPicker({ targetWindow: target, targetOrigin: 'http://127.0.0.1:4174' });
    if (current !== generation) { next.dispose(); return; }
    connection = next;
    buttons.pick.disabled = buttons.disconnect.disabled = false;
    status.textContent = 'Connected. Start picking, then switch to the target window.';
  } catch (error) { if (current === generation) showError(error); }
  finally { if (current === generation) buttons.open.disabled = false; }
});

buttons.pick.addEventListener('click', async () => {
  const current = generation;
  const active = connection;
  if (!active) return;
  selected = undefined;
  buttons.pick.disabled = buttons.validate.disabled = true;
  status.textContent = 'Click an element in the target window. Esc cancels.';
  try {
    const pick = await active.pick();
    if (current !== generation) return;
    selected = pick;
    result.textContent = pick ? JSON.stringify(pick.observation, null, 2) : 'Selection cancelled.';
    locator.textContent = pick?.observation.element.selector ?? 'No element selected';
    buttons.validate.disabled = !pick;
    status.textContent = pick ? 'Element captured. Review the context below.' : 'Selection cancelled. Page controls are active again.';
  } catch (error) { if (current === generation) showError(error); }
  finally { if (current === generation) buttons.pick.disabled = false; }
});

buttons.validate.addEventListener('click', async () => {
  const current = generation;
  if (!selected || !connection) return;
  status.textContent = 'Checking the selected element…';
  try {
    const valid = await connection.validate(selected.pickId);
    if (current !== generation) return;
    status.textContent = valid ? 'Selection is still current.' : 'Selection is stale. Pick the element again.';
    if (!valid) buttons.validate.disabled = true;
  } catch (error) { if (current === generation) showError(error); }
});

buttons.disconnect.addEventListener('click', () => {
  generation++;
  connection?.dispose();
  connection = undefined;
  buttons.pick.disabled = buttons.validate.disabled = buttons.disconnect.disabled = true;
  status.textContent = 'Disconnected. Page controls are active again.';
});
