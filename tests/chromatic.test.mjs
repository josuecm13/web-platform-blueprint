import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Run the actual entry point with a DOM/canvas model, without opening a browser.
// This checks coordinate conversion, not the browser's native hit-test engine.
const script = ts.transpileModule(
  readFileSync(new URL('../src/chromatic.ts', import.meta.url), 'utf8')
    .replace("import './chromatic.css';", ''),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } },
).outputText;

function setup(dpr, supported = true) {
  let observer;
  let destination;
  let geometry;
  let processed;
  let readback;
  const operations = [];
  let transform = [1, 0, 0, 1, 0, 0];
  const context = {
    setTransform(...args) { transform = args; },
    clearRect() {},
    // Model the API's default raster size as CSS size × DPR. This reproduces
    // the previous double-scaling bug if destination dimensions are omitted.
    drawElementImage(element, x, y, width = element.offsetWidth * dpr,
      height = element.offsetHeight * dpr, options) {
      destination = { x, y, width, height, transform: [...transform] };
      assert.equal(options.preserveElementGeometry, true);
      operations.push('draw');
    },
    getImageData(x, y, width, height) {
      readback = { x, y, width, height };
      const data = new Uint8ClampedArray(width * height * 4);
      for (let n = 0; n < width * height; n++) {
        data[n * 4] = (n % width) % 256;
        data[n * 4 + 1] = 60;
        data[n * 4 + 2] = ((n % width) + 80) % 256;
        data[n * 4 + 3] = 255;
      }
      return { width, height, data };
    },
    putImageData(image) { processed = image; operations.push('pixels'); },
  };
  class Element {
    _width = 300;
    _height = 150;
    dimensionWrites = [];
    get width() { return this._width; }
    set width(value) { this._width = value; this.dimensionWrites.push(['width', value]); }
    get height() { return this._height; }
    set height(value) { this._height = value; this.dimensionWrites.push(['height', value]); }
    style = {};
    childNodes = [];
    listeners = {};
    content = '';
    offsetWidth = 321;
    scrollHeight = 123;
    offsetHeight = 123;
    value = '2';
    fields = {};
    setAttribute(name, value) { this[name] = value; }
    getContext() { return context; }
    append(...nodes) {
      for (const node of nodes) {
        node.remove();
        this.childNodes.push(node);
        node.parentNode = this;
      }
    }
    insertBefore(node, reference) {
      node.remove();
      this.childNodes.splice(this.childNodes.indexOf(reference), 0, node);
      node.parentNode = this;
    }
    remove() {
      if (this.parentNode) {
        this.parentNode.childNodes.splice(this.parentNode.childNodes.indexOf(this), 1);
        this.parentNode = null;
      }
    }
    querySelector(selector) { return this.fields[selector] ??= new Element(); }
    addEventListener(name, listener) { this.listeners[name] = listener; }
    requestPaint() {} // Paint is asynchronous, explicitly dispatched by tests.
    updateElementGeometry(element, options) {
      geometry = { element, matrix: options.canvasTransform };
      operations.push('geometry');
    }
    getBoundingClientRect() { return { top: 0, height: 123 }; }
  }
  if (!supported) delete Element.prototype.requestPaint;
  const body = new Element();
  const link = new Element();
  body.append(link);
  const window = { devicePixelRatio: dpr, innerHeight: 900, listeners: {},
    addEventListener(name, callback) { this.listeners[name] = callback; } };
  vm.runInNewContext(script, {
    document: { body, documentElement: { clientWidth: 321 }, createElement: () => new Element() },
    window,
    getComputedStyle: () => ({ backgroundColor: '#fff' }),
    DOMMatrix: class { a = 1; b = 0; c = 0; d = 1; e = 0; f = 0; },
    ResizeObserver: class {
      disconnected = false;
      constructor(callback) { this.callback = callback; observer = this; }
      observe() {}
      disconnect() { this.disconnected = true; }
    },
  });
  return { body, link, window, observer, operations,
    get destination() { return destination; }, get geometry() { return geometry; },
    get processed() { return processed; }, get readback() { return readback; } };
}

for (const dpr of [1, 1.25, 2, 3]) {
  test(`active effect keeps CSS bounds and explicit input geometry at DPR ${dpr}`, () => {
    const app = setup(dpr);
    const [surface] = app.body.childNodes;
    surface.listeners.paint();
    assert.deepEqual(app.operations, ['draw', 'pixels', 'geometry']);
    assert.equal(app.geometry.element, surface.childNodes[0]);
    const matrix = app.geometry.matrix;
    assert.deepEqual([matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f], [1, 0, 0, 1, 0, 0]);
    const { width, height, transform } = app.destination;
    const cssWidth = parseFloat(surface.style.width);
    const cssHeight = parseFloat(surface.style.height);
    // A full-width HTML page must fill exactly the original CSS layout box.
    assert.equal(width * transform[0] * cssWidth / surface.width, 321);
    assert.equal(height * transform[3] * cssHeight / surface.height, 123);
    // A target inside the source must map back to its original CSS position.
    const target = { x: 153, y: 71 };
    assert.ok(Math.abs(target.x / 321 * width * transform[0] * cssWidth / surface.width - target.x) < 1e-10);
    assert.ok(Math.abs(target.y / 123 * height * transform[3] * cssHeight / surface.height - target.y) < 1e-10);
    // A later display-density change uses the new backing dimensions once.
    app.window.devicePixelRatio = 2.5;
    app.observer.callback();
    surface.listeners.paint();
    assert.equal(app.destination.width * app.destination.transform[0] * cssWidth / surface.width, 321);
  });
}

test('normal HTML recovery preserves the original interactive nodes', () => {
  const app = setup(2);
  const [surface, controls] = app.body.childNodes;
  controls.querySelector('button').listeners.click();
  assert.equal(app.body.childNodes.includes(surface), false);
  assert.equal(app.body.childNodes[0].childNodes[0], app.link);
  assert.equal(app.observer.disconnected, true);
  assert.equal(controls.querySelector('input').disabled, true);
});

test('active split changes pixels while preserving green, alpha and input geometry', () => {
  const app = setup(2);
  const [surface] = app.body.childNodes;
  surface.listeners.paint();
  const { data, width } = app.processed;
  // The 2 CSS px setting is a 4 bitmap-pixel split at DPR 2.
  assert.equal(data[10 * 4], 6);
  assert.equal(data[10 * 4 + 2], 94);
  assert.equal(data[10 * 4 + 1], 60);
  assert.equal(data[10 * 4 + 3], 255);
  assert.equal(data[0], 0);
  assert.equal(data[(width - 1) * 4 + 2], (width - 1 + 80) % 256);
  assert.equal(app.geometry.element.childNodes[0], app.link);
});

test('zero split still registers the live subtree for native interaction', () => {
  const app = setup(2);
  const [surface, controls] = app.body.childNodes;
  controls.querySelector('input').value = '0';
  surface.listeners.paint();
  assert.deepEqual(app.operations, ['draw', 'geometry']);
  assert.equal(app.geometry.element.childNodes[0], app.link);
});

test('a long page processes only visible rows and requests repaint when scrolled', () => {
  const app = setup(2);
  const [surface] = app.body.childNodes;
  surface.childNodes[0].offsetHeight = 10000;
  app.observer.callback();
  surface.getBoundingClientRect = () => ({ top: -2000, height: 10000 });
  surface.listeners.paint();
  assert.equal(app.readback.y, 4000);
  assert.equal(app.readback.height, 1800);
  assert.equal(app.operations.at(-1), 'geometry');
  let requested = false;
  surface.requestPaint = () => { requested = true; };
  app.window.listeners.scroll();
  assert.equal(requested, true);
});

test('unsupported browsers leave page nodes in the ordinary DOM', () => {
  const app = setup(2, false);
  assert.equal(app.body.childNodes[0], app.link);
  const controls = app.body.childNodes[1];
  assert.equal(controls.querySelector('input').disabled, true);
});

test('responsive layout changes keep the previous bitmap until a fresh paint', () => {
  const app = setup(2);
  const [surface] = app.body.childNodes;
  surface.listeners.paint();
  const oldHeight = surface.height;
  surface.dimensionWrites.length = 0;
  const source = surface.childNodes[0];
  // Multiple container reflows before paint must not clear the displayed bitmap.
  source.offsetHeight = 240;
  app.observer.callback();
  source.offsetHeight = 300;
  app.observer.callback();
  assert.equal(surface.height, oldHeight);
  assert.deepEqual(surface.dimensionWrites, []);
  // A fresh snapshot is available: resize only the changed axis and draw now.
  surface.listeners.paint();
  assert.deepEqual(surface.dimensionWrites, [['height', 600]]);
  assert.equal(app.destination.height, 600);
  assert.equal(app.operations.at(-1), 'geometry');
  // Repeated notifications and ordinary hover/scroll paints must not reset it.
  surface.dimensionWrites.length = 0;
  app.observer.callback();
  surface.listeners.paint();
  surface.listeners.paint();
  assert.deepEqual(surface.dimensionWrites, []);
});
