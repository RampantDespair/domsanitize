import { describe, expect, it } from "vitest";

import { enforceHtml } from "../src/index";

const allow = { mode: "simple" as const, value: "*" };

describe("namespace-qualified attributes", () => {
  it.each([
    { key: "xlink:href", localName: "href", value: "#target" },
    { key: "xml:lang", localName: "lang", value: "en" },
    { key: "xml:space", localName: "space", value: "preserve" },
    { key: "xmlns:xlink", localName: "xlink", value: "http://www.w3.org/1999/xlink" },
  ])("uses the qualified rule for $key", ({ key, localName, value }) => {
    const input = `<svg><a ${key}="${value}">link</a></svg>`;

    expect(enforceHtml(input, {
      errorHandling: { attribute: "discardAttribute" },
      tags: { a: { attributes: { [key]: allow } }, svg: {} },
    })).toBe(input);

    expect(enforceHtml(input, {
      errorHandling: { attribute: "discardAttribute" },
      tags: { a: { attributes: { [localName]: allow } }, svg: {} },
    })).toBe("<svg><a>link</a></svg>");
  });

  it.each([
    "href=\"#plain\" xlink:href=\"#qualified\"",
    "xlink:href=\"#qualified\" href=\"#plain\"",
  ])("preserves both attributes in order: %s", (attributes) => {
    const input = `<svg><a ${attributes}>link</a></svg>`;

    expect(enforceHtml(input, {
      tags: { a: { attributes: { "*": allow } }, svg: {} },
    })).toBe(input);
  });

  it("validates colliding local names independently", () => {
    const input = "<svg><a href=\"#plain\" xlink:href=\"#wrong\">link</a></svg>";

    expect(enforceHtml(input, {
      errorHandling: { attributeValue: "discardAttribute" },
      tags: {
        a: {
          attributes: {
            href: { mode: "simple", value: "#plain" },
            "xlink:href": { mode: "simple", value: "#qualified" },
          },
        },
        svg: {},
      },
    })).toBe("<svg><a href=\"#plain\">link</a></svg>");
  });

  it.each([
    { missing: "href", present: "xlink:href" },
    { missing: "xlink:href", present: "href" },
  ])("adds a required $missing independently of $present", ({ missing, present }) => {
    const input = `<svg><a ${present}="#present">link</a></svg>`;

    expect(enforceHtml(input, {
      errorHandling: { attribute: "discardAttribute", attributeValue: "applyDefaultValue" },
      tags: {
        a: {
          attributes: {
            [missing]: { ...allow, defaultValue: "#fallback", required: true },
            [present]: allow,
          },
        },
        svg: {},
      },
    })).toBe(`<svg><a ${present}="#present" ${missing}="#fallback">link</a></svg>`);
  });

  it("applies a default to the qualified attribute", () => {
    expect(enforceHtml("<svg><a xlink:href=\"#wrong\">link</a></svg>", {
      errorHandling: { attributeValue: "applyDefaultValue" },
      tags: {
        a: {
          attributes: {
            "xlink:href": { defaultValue: "#fallback", mode: "simple", value: "#allowed" },
          },
        },
        svg: {},
      },
    })).toBe("<svg><a xlink:href=\"#fallback\">link</a></svg>");
  });

  it("preserves namespace declarations without duplicating their prefixes", () => {
    const input = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\"></svg>";

    expect(enforceHtml(input, {
      tags: { svg: { attributes: { "*": allow } } },
    })).toBe(input);
  });

  it("preserves qualified attributes in MathML", () => {
    const input = "<math><mi xlink:href=\"#target\" href=\"#plain\">x</mi></math>";

    expect(enforceHtml(input, {
      tags: { math: {}, mi: { attributes: { href: allow, "xlink:href": allow } } },
    })).toBe(input);
  });

  it("preserves colon-containing attributes in HTML", () => {
    const input = "<p xml:lang=\"en\" lang=\"fr\">text</p>";

    expect(enforceHtml(input, {
      tags: { p: { attributes: { lang: allow, "xml:lang": allow } } },
    })).toBe(input);
  });
});
