import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const scriptUrl = new URL('../../src/public/js/enhance.js', import.meta.url);
const source = await readFile(scriptUrl, 'utf8');

function runEnhancement({ tags = [], genders = [], apply = { hidden: false } } = {}) {
  const listeners = new Map();
  [...genders, ...tags].forEach((control, index) => {
    control.addEventListener = (name, callback) => listeners.set(`${index}:${name}`, callback);
  });
  const form = {
    submitCount: 0,
    submit() { this.submitCount += 1; },
    querySelectorAll(selector) {
      if (selector === 'input[type="checkbox"][name="tag"]') return tags;
      if (selector === 'input[type="radio"][name="gender"]') return genders;
      return [];
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

test('changing gender or a tag submits the existing filter form and hides its apply button', () => {
  const tag = {};
  const gender = {};
  const { apply, form, listeners } = runEnhancement({ tags: [tag], genders: [gender] });

  assert.equal(apply.hidden, true, 'the redundant button is hidden only after enhancement initializes');
  assert.equal(listeners.size, 2, 'listeners are attached to gender and tag controls');
  listeners.get('0:change')();
  listeners.get('1:change')();
  assert.equal(form.submitCount, 2, 'each selection immediately submits the current GET form');
});

test('the filter apply button remains available when no gender or tag controls are enhanced', () => {
  const apply = { hidden: false };
  const { form, listeners } = runEnhancement({ tags: [], genders: [], apply });

  assert.equal(apply.hidden, false);
  assert.equal(listeners.size, 0);
  assert.equal(form.submitCount, 0);
});
