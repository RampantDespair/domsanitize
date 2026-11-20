import { describe, expect, it } from "vitest";

import { enforceHtml } from "../src/index";

describe("enforceHtml with template elements", () => {
  it("validates tags and attributes inside template contents", () => {
    const result = enforceHtml(
      "<template><unknown>removed</unknown><p bad=\"x\">kept</p></template>",
      {
        errorHandling: { attribute: "discardAttribute", tag: "discardElement" },
        tags: { p: {}, template: {} },
      },
    );

    expect(result).toBe("<template><p>kept</p></template>");
  });

  it("validates nested template contents", () => {
    const result = enforceHtml(
      "<template><template><p bad=\"x\">kept</p></template></template>",
      {
        errorHandling: { attribute: "discardAttribute" },
        tags: { p: {}, template: {} },
      },
    );

    expect(result).toBe("<template><template><p>kept</p></template></template>");
  });

  it.each([false, true])("honors preserveComments=%s", (preserveComments) => {
    const result = enforceHtml("<template><!-- comment -->text</template>", {
      preserveComments,
      tags: { template: {} },
    });

    expect(result).toBe(
      preserveComments
        ? "<template><!-- comment -->text</template>"
        : "<template>text</template>",
    );
  });

  it.each([
    { expected: "<template><p>two</p></template>", mode: "discardFirsts" },
    { expected: "<template><p>one</p></template>", mode: "discardLasts" },
    { expected: "", mode: "discardElement" },
  ] as const)("applies $mode to excess template children", ({ expected, mode }) => {
    const result = enforceHtml("<template><p>one</p><p>two</p></template>", {
      errorHandling: { tagChildren: mode },
      tags: { p: {}, template: { limits: { children: 1 } } },
    });

    expect(result).toBe(expected);
  });

  it("reports the template tag when its child limit is exceeded", () => {
    expect(() => {
      return enforceHtml("<template><p>one</p><p>two</p></template>", {
        tags: { p: {}, template: { limits: { children: 1 } } },
      });
    }).toThrow("Tag template has exceeded the maximum allowed number of children of 1");
  });

  it("does not count the content fragment as an extra nesting level", () => {
    const result = enforceHtml(
      "<template><p><span>too deep</span></p></template>",
      {
        errorHandling: { tagNesting: "discardElement" },
        tags: { p: {}, span: {}, template: {} },
        topLevelLimits: { nesting: 1 },
      },
    );

    expect(result).toBe("<template><p></p></template>");
  });

  it("enforces tag nesting limits within template contents", () => {
    const result = enforceHtml(
      "<template><p><span>too deep</span></p></template>",
      {
        errorHandling: { tagNesting: "discardElement" },
        tags: { p: {}, span: {}, template: { limits: { nesting: 1 } } },
      },
    );

    expect(result).toBe("<template><p></p></template>");
  });

  it("unwraps and validates disallowed templates without losing their contents", () => {
    const result = enforceHtml(
      "<template><p bad=\"x\">one</p><template><p>two</p></template></template><p>after</p>",
      {
        errorHandling: { attribute: "discardAttribute", tag: "unwrapElement" },
        tags: { p: {} },
      },
    );

    expect(result).toBe("<p>one</p><p>two</p><p>after</p>");
  });

  it("validates contents after an attribute error unwraps a template", () => {
    const result = enforceHtml(
      "<template bad=\"x\"><unknown>removed</unknown><p>kept</p></template>",
      {
        errorHandling: { attribute: "unwrapElement", tag: "discardElement" },
        tags: { p: {}, template: {} },
      },
    );

    expect(result).toBe("<p>kept</p>");
  });

  it("does not treat a template tag in SVG as an HTML template", () => {
    const result = enforceHtml("<svg><template><g bad=\"x\"></g></template></svg>", {
      errorHandling: { attribute: "discardAttribute" },
      tags: { g: {}, svg: {}, template: {} },
    });

    expect(result).toBe("<svg><template><g></g></template></svg>");
  });

  it("keeps empty templates valid", () => {
    expect(enforceHtml("<template></template>", { tags: { template: {} } })).toBe(
      "<template></template>",
    );
  });
});
