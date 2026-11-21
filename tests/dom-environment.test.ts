import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createBrowserDomEnvironment } from "../src/lib/dom/browser";
import { createDomEnvironment } from "../src/lib/dom/environment";
import { createNodeDomEnvironment } from "../src/lib/dom/node";

const windows: JSDOM["window"][] = [];

function createWindow() {
  const { window } = new JSDOM("<p id=\"host\">host</p>");
  windows.push(window);
  return window;
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const window of windows.splice(0)) {
    window.close();
  }
});

describe("injected DOM environment", () => {
  it("creates standard DOM nodes in the supplied window's realm", () => {
    const window = createWindow();
    const fragment = createDomEnvironment(window).parse("<p>text</p>");

    expect(fragment.root).toBeInstanceOf(window.DocumentFragment);
    expect(fragment.root.firstChild).toBeInstanceOf(window.HTMLElement);
    expect(fragment.root.ownerDocument).not.toBe(window.document);
    expect(fragment.root.ownerDocument.defaultView).toBeNull();
    expect(window.document.body.innerHTML).toBe("<p id=\"host\">host</p>");
  });

  it.each([
    "",
    " \ntext\t ",
    "<td>cell</td>",
    "<tr><td>cell</td></tr>",
    "<title>Title</title><p>text</p>",
    "<!--comment--><p>text</p>",
    "<template><template><p>text</p></template></template>",
    "<svg><a href=\"#plain\" xlink:href=\"#qualified\">link</a></svg>",
    "<math><mi>x</mi></math>",
  ])("preserves fragment content: %s", (html) => {
    const fragment = createDomEnvironment(createWindow()).parse(html);

    expect(fragment.serialize()).toBe(html);
  });

  it("serializes edits without detaching or cloning the original nodes", () => {
    const fragment = createDomEnvironment(createWindow()).parse("<p>one</p><p>two</p>");
    const [first, second] = Array.from(fragment.root.childNodes);
    fragment.root.removeChild(first);
    second.textContent = "changed";

    expect(fragment.serialize()).toBe("<p>changed</p>");
    expect(fragment.root.firstChild).toBe(second);
    expect(second.parentNode).toBe(fragment.root);
    expect(fragment.serialize()).toBe("<p>changed</p>");
  });

  it("keeps parse calls independent when an environment is reused", () => {
    const environment = createDomEnvironment(createWindow());
    const first = environment.parse("<p>first</p>");
    const second = environment.parse("<p>second</p>");
    first.root.firstChild?.remove();

    expect(first.serialize()).toBe("");
    expect(second.serialize()).toBe("<p>second</p>");
  });

  it("uses HTML template contents and preserves an ordinary SVG template", () => {
    const fragment = createDomEnvironment(createWindow()).parse(
      "<template><p>inside</p></template><svg><template><g></g></template></svg>",
    );
    const template = fragment.root.querySelector<HTMLTemplateElement>("template");
    const foreignTemplate = fragment.root.querySelector("svg template");

    expect(template?.childNodes).toHaveLength(0);
    expect(template?.content.firstChild?.textContent).toBe("inside");
    expect(foreignTemplate?.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(foreignTemplate?.firstChild?.nodeName).toBe("g");
  });

  it("supports namespace-aware mutation without changing plain attributes", () => {
    const fragment = createDomEnvironment(createWindow()).parse(
      "<svg><a href=\"#plain\" xlink:href=\"#qualified\">link</a></svg>",
    );
    const anchor = fragment.root.querySelector("a");
    anchor?.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#changed");

    expect(anchor?.getAttribute("href")).toBe("#plain");
    expect(fragment.serialize()).toBe("<svg><a href=\"#plain\" xlink:href=\"#changed\">link</a></svg>");
  });

  it("accepts nodes adopted from another window", () => {
    const fragment = createDomEnvironment(createWindow()).parse("");
    const element = createWindow().document.createElement("p");
    element.textContent = "adopted";
    fragment.root.appendChild(element);

    expect(element.ownerDocument).toBe(fragment.root.ownerDocument);
    expect(fragment.serialize()).toBe("<p>adopted</p>");
  });

  it("preserves literal noscript text using the detached document", () => {
    const fragment = createDomEnvironment(createWindow()).parse(
      "<noscript><p>literal</p></noscript>",
    );

    expect(fragment.root.firstChild?.firstChild?.nodeType).toBe(3);
    expect(fragment.serialize()).toBe("<noscript><p>literal</p></noscript>");
  });
});

describe("runtime environment factories", () => {
  it("creates a usable Node environment without installing browser globals", () => {
    const environment = createNodeDomEnvironment();

    expect(environment.parse("<p>node</p>").serialize()).toBe("<p>node</p>");
    expect(typeof globalThis.window).toBe("undefined");
  });

  it("keeps script elements inert while preserving their text", () => {
    const environment = createNodeDomEnvironment();
    const input = "<script>throw new Error('must not execute')</script>";

    expect(environment.parse(input).serialize()).toBe(input);
  });

  it("can import browser support in Node and reports a missing window on use", () => {
    expect(() => {
      return createBrowserDomEnvironment();
    }).toThrow("The browser DOM environment requires a window");
  });

  it("uses the browser window when explicitly available", () => {
    const window = createWindow();
    vi.stubGlobal("window", window);
    const fragment = createBrowserDomEnvironment().parse("<p>browser</p>");

    expect(fragment.root).toBeInstanceOf(window.DocumentFragment);
    expect(fragment.serialize()).toBe("<p>browser</p>");
  });
});
