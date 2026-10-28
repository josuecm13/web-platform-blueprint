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
  let transform = [1, 0, 0, 1, 0, 0];
  const context = {
    setTransform(...args) { transform = args; },
    clearRect() {},
    // Model the API's default raster size as CSS size × DPR. This reproduces
    // the previous double-scaling bug if destination dimensions are omitted.
    drawElementImage(element, x, y, width = element.offsetWidth * dpr,
      height = element.scrollHeight * dpr) {
      destination = { x, y, width, height, transform: [...transform] };
    },
  };
  class Element {
    style = {};
    childNodes = [];
    listeners = {};
    content = '';
    offsetWidth = 321;
    scrollHeight = 123;
    value = '0'; // Coordinate tests do not need to allocate pixel buffers.
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
  }
  if (!supported) delete Element.prototype.requestPaint;
  const body = new Element();
  const link = new Element();
  body.append(link);
  const window = { devicePixelRatio: dpr, addEventListener() {} };
  vm.runInNewContext(script, {
    document: { body, documentElement: { clientWidth: 321 }, createElement: () => new Element() },
    window,
    getComputedStyle: () => ({ backgroundColor: '#fff' }),
    ResizeObserver: class {
      disconnected = false;
      constructor(callback) { this.callback = callback; observer = this; }
      observe() {}
      disconnect() { this.disconnected = true; }
    },
  });
  return { body, link, window, observer, get destination() { return destination; } };
}

for (const dpr of [1, 1.25, 2, 3]) {
  test(`rendered bounds and click coordinates stay aligned at DPR ${dpr}`, () => {
    const app = setup(dpr);
    const [surface] = app.body.childNodes;
    surface.listeners.paint();
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

test('unsupported browsers leave page nodes in the ordinary DOM', () => {
  const app = setup(2, false);
  assert.equal(app.body.childNodes[0], app.link);
  const controls = app.body.childNodes[1];
  assert.equal(controls.querySelector('input').disabled, true);
});
