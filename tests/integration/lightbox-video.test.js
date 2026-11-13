import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../../src/public/js/lightbox.js', import.meta.url), 'utf8');

function openVideoLightbox(reduce) {
  let clickHandler;
  let video;
  const element = (tag) => ({
    tag,
    attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    appendChild() {},
    addEventListener() {},
    focus() {},
  });
  const document = {
    addEventListener(name, fn) { if (name === 'click') clickHandler = fn; },
    createElement(tag) {
      const el = element(tag);
      if (tag === 'video') video = el;
      return el;
    },
    body: { appendChild() {} },
  };
  const window = { matchMedia: () => ({ matches: reduce }) };
  vm.runInNewContext(source, { document, window });

  const link = {
    dataset: { video: '1', alt: 'Clip' },
    getAttribute: () => '/images/7',
  };
  clickHandler({ button: 0, target: { closest: () => link }, preventDefault() {} });
  return video;
}

test('the lightbox video autoplays normally and never autoplays under reduced motion', () => {
  const normal = openVideoLightbox(false);
  assert.equal(normal.src, '/media/7/full');
  assert.equal(normal.autoplay, true);
  assert.equal(normal.controls, true);

  const reduced = openVideoLightbox(true);
  assert.equal(reduced.autoplay, false);
  assert.equal(reduced.controls, true);
});
