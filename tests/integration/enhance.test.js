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

function runWithMotionPreference(reduce, videos) {
  const document = {
    querySelector() { return null; },
    querySelectorAll(selector) { return selector === 'video[autoplay]' ? videos : []; },
  };
  const window = { matchMedia: () => ({ matches: reduce }) };
  vm.runInNewContext(source, { document, window });
}

function fakeVideo() {
  return {
    paused: false,
    controls: false,
    removed: [],
    removeAttribute(name) { this.removed.push(name); },
    pause() { this.paused = true; },
  };
}

test('reduced motion stops autoplaying videos and gives them controls', () => {
  const video = fakeVideo();
  runWithMotionPreference(true, [video]);
  assert.deepEqual(video.removed, ['autoplay']);
  assert.equal(video.paused, true);
  assert.equal(video.controls, true);
});

test('videos keep autoplaying when reduced motion is not requested', () => {
  const video = fakeVideo();
  runWithMotionPreference(false, [video]);
  assert.equal(video.paused, false);
  assert.equal(video.controls, false);
});

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

test('image-artist fields are hidden while "same artist as the designer" is ticked', () => {
  const sameBox = { checked: true, handler: null, addEventListener(n, cb) { this.handler = cb; } };
  const fields = { hidden: false };
  const document = {
    querySelector(selector) { return selector.includes('image_artist_same_as_designer') ? sameBox : null; },
    getElementById(id) { return id === 'image-artist-fields' ? fields : null; },
    querySelectorAll() { return []; },
  };
  vm.runInNewContext(source, { document });
  assert.equal(fields.hidden, true, 'hidden on load when pre-ticked');
  sameBox.checked = false;
  sameBox.handler();
  assert.equal(fields.hidden, false);
});
