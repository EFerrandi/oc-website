import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const scriptUrl = new URL('../../src/public/js/enhance.js', import.meta.url);
const source = await readFile(scriptUrl, 'utf8');

function runEnhancement({ tags = [], apply = { hidden: false } } = {}) {
  const listeners = new Map();
  tags.forEach((tag, index) => {
    tag.addEventListener = (name, callback) => listeners.set(`${index}:${name}`, callback);
  });
  const form = {
    submitCount: 0,
    submit() { this.submitCount += 1; },
    querySelectorAll(selector) {
      return selector === 'input[type="checkbox"][name="tag"]' ? tags : [];
    },
    querySelector(selector) {
      return selector === '.filter-apply' ? apply : null;
    },
  };
  const document = {
    querySelector() { return null; },
    querySelectorAll(selector) {
      return selector === '.filter-bar' ? [form] : [];
    },
  };
  const context = { document };
  vm.runInNewContext(source, context);
  return { apply, form, listeners };
}

test('changing a tag submits the existing filter form and hides its apply button', () => {
  const tag = {};
  const { apply, form, listeners } = runEnhancement({ tags: [tag] });

  assert.equal(apply.hidden, true, 'the redundant button is hidden only after enhancement initializes');
  assert.equal(listeners.size, 1, 'a listener is attached to the tag control');
  listeners.get('0:change')();
  assert.equal(form.submitCount, 1, 'the GET form is submitted immediately');
});

test('the filter apply button remains available when the form has no tag controls', () => {
  const apply = { hidden: false };
  const { form, listeners } = runEnhancement({ tags: [], apply });

  assert.equal(apply.hidden, false);
  assert.equal(listeners.size, 0);
  assert.equal(form.submitCount, 0);
});
