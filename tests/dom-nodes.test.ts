import { assert, describe, expect, it } from "vitest";

import { setAttributeValue } from "../src/lib/dom/nodes";
import { createElement, parseFragment } from "./support/dom";

describe("DOM attribute updates", () => {
  it.each([
    { name: "xlink:href", namespace: "http://www.w3.org/1999/xlink", simple: "href" },
    { name: "xml:lang", namespace: "http://www.w3.org/XML/1998/namespace", simple: "lang" },
    { name: "xmlns:xlink", namespace: "http://www.w3.org/2000/xmlns/", simple: "xlink" },
    { name: "xmlns", namespace: "http://www.w3.org/2000/xmlns/", simple: "xmlns" },
  ])("creates missing $name with namespace metadata", ({ name, namespace, simple }) => {
    const element = createElement("a");
    setAttributeValue(element, name, "value");

    expect(element.getAttributeNS(namespace, simple)).toBe("value");
    expect(element.getAttributeNode(name)?.namespaceURI).toBe(namespace);
  });

  it("updates an existing Attr without replacing its namespace or identity", () => {
    const element = parseFragment("<svg><a href=\"plain\" xlink:href=\"old\"></a></svg>").querySelector("a");
    assert(element);
    const attribute = element.getAttributeNode("xlink:href");
    setAttributeValue(element, "xlink:href", "new");

    expect(element.getAttributeNode("xlink:href")).toBe(attribute);
    expect(element.getAttributeNS("http://www.w3.org/1999/xlink", "href")).toBe("new");
    expect(element.getAttribute("href")).toBe("plain");
  });

  it("can recover parsed attribute names that setAttribute would reject", () => {
    const element = parseFragment("<p odd@name=\"old\"></p>").firstElementChild;
    assert(element);
    setAttributeValue(element, "odd@name", "new");

    expect(element.getAttribute("odd@name")).toBe("new");
  });

  it.each(["__proto__", "constructor", "title"])("creates ordinary attribute %s", (name) => {
    const element = createElement("p");
    setAttributeValue(element, name, "");

    expect(element.hasAttribute(name)).toBe(true);
    expect(element.getAttribute(name)).toBe("");
    expect(element.getAttributeNode(name)?.namespaceURI).toBeNull();
  });
});
