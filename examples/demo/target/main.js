import { createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';

function Account() {
  const [saved, setSaved] = useState(0);
  return h('main', null,
    h('div', { className: 'brand' }, 'FIELDNOTES / ACCOUNT'),
    h('h1', null, 'Make yourself at home.'),
    h('p', null, 'A small React page for trying element selection.'),
    h('section', { id: 'account-card' },
      h('h2', null, 'Profile settings'),
      h('label', null, 'Display name', h('input', { defaultValue: 'private-display-name', 'aria-label': 'Display name' })),
      h('label', null, 'Password', h('input', { type: 'password', defaultValue: 'private-password', 'aria-label': 'Password' })),
      h('label', null, 'Notes', h('textarea', { defaultValue: 'private-notes', 'aria-label': 'Notes' })),
      h('div', { contentEditable: true, suppressContentEditableWarning: true, 'aria-label': 'Editable note' }, 'private-editable-content'),
      h('p', null, 'Use the picker to inspect this card or its save button.'),
      h('button', { 'data-testid': 'save-button', onClick: () => setSaved(value => value + 1) }, 'Save changes'),
      h('p', { 'data-testid': 'saved-count' }, 'Saved ' + saved + ' times'),
    ),
    h('a', { href: '/?page=next#details', 'data-testid': 'next-link' }, 'Visit another page'),
    h('p', null, h('small', null, 'Input values are deliberately excluded from captured context.')),
  );
}

createRoot(document.getElementById('root')).render(h(Account));
