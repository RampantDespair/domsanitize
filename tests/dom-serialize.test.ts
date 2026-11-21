import { JSDOM } from "jsdom";
import { afterAll, expect, it } from "vitest";

import { serializeWithLiteralNoscript } from "../src/lib/dom/serialize";

// A template in jsdom's main document reproduces Firefox's native mismatch.
const { window } = new JSDOM("");
afterAll(() => {
  window.close();
});

it("corrects literal noscript text without changing original nodes", () => {
  const template = window.document.createElement("template");
  template.innerHTML = "<div title=\"&quot;&amp;\"><noscript><p>a &amp; b</p></noscript><!--after--><br></div>";
  const originalNodes = Array.from(template.content.querySelectorAll("*"));
  const native = template.innerHTML;
  expect(native).toContain("&lt;p&gt;a &amp;amp; b&lt;/p&gt;");

  const expected = "<div title=\"&quot;&amp;\"><noscript><p>a &amp; b</p></noscript><!--after--><br></div>";
  expect(serializeWithLiteralNoscript(template)).toBe(expected);
  expect(serializeWithLiteralNoscript(template)).toBe(expected);
  expect(template.innerHTML).toBe(native);
  expect(Array.from(template.content.querySelectorAll("*"))).toEqual(originalNodes);
});

it("preserves namespace-qualified attributes and native escaping outside noscript", () => {
  const template = window.document.createElement("template");
  template.innerHTML = "<svg><foreignObject><noscript><p>fallback</p></noscript></foreignObject><a href=\"#plain\" xlink:href=\"#qualified\">&lt;&amp;</a><noscript>&lt;b&gt;&amp;</noscript></svg>";
  expect(serializeWithLiteralNoscript(template)).toBe("<svg><foreignObject><noscript><p>fallback</p></noscript></foreignObject><a href=\"#plain\" xlink:href=\"#qualified\">&lt;&amp;</a><noscript>&lt;b&gt;&amp;</noscript></svg>");
});

it("preserves edited text and attributes within nested templates", () => {
  const template = window.document.createElement("template");
  template.innerHTML = "<template><noscript title=\"old\"><p>old</p></noscript></template>";
  const nested = template.content.querySelector("template");
  const noscript = nested?.content.querySelector("noscript");
  expect(noscript).not.toBeNull();
  noscript?.setAttribute("title", "\"&");
  if (noscript) {
    noscript.textContent = "<p>new &amp;</p>";
  }
  expect(serializeWithLiteralNoscript(template)).toBe("<template><noscript title=\"&quot;&amp;\"><p>new &amp;</p></noscript></template>");
});

it("uses native serialization when no HTML noscript text needs correction", () => {
  const template = window.document.createElement("template");
  template.innerHTML = "<div><!--comment--><br>&lt;&amp;<style>p::before { content: \"<>&\"; }</style><script>const x = \"<>&\";</script></div>";
  expect(serializeWithLiteralNoscript(template)).toBe(template.innerHTML);
});
