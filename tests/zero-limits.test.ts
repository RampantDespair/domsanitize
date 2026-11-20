import type { TagAttributeCollectionValueRule } from "../src/types/rules";

import { describe, expect, it } from "vitest";

import { enforceHtml } from "../src/index";

describe("zero-valued limits", () => {
  it.each(["discardFirsts", "discardLasts", "discardElement"] as const)(
    "enforces zero root children with %s",
    (mode) => {
      expect(
        enforceHtml("<p>one</p><p>two</p>", {
          errorHandling: { tagChildren: mode },
          tags: { p: {} },
          topLevelLimits: { children: 0 },
        }),
      ).toBe("");
    },
  );

  it("throws for nonempty input when the root child limit is zero", () => {
    expect(() => {
      return enforceHtml("<p>one</p>", {
        tags: { p: {} },
        topLevelLimits: { children: 0 },
      });
    }).toThrow("Root has exceeded the maximum allowed number of children of 0");
  });

  it.each(["div", "template"])("enforces zero children inside %s", (tag) => {
    const result = enforceHtml(`<${tag}>text<p>removed</p></${tag}>`, {
      errorHandling: { tagChildren: "discardLasts" },
      tags: { p: {}, [tag]: { limits: { children: 0 } } },
    });

    expect(result).toBe(`<${tag}></${tag}>`);
  });

  it("allows top-level elements but no nested elements at root nesting zero", () => {
    const result = enforceHtml(
      "<p>kept<span>removed</span></p><p>also kept</p>",
      {
        errorHandling: { tagNesting: "discardElement" },
        tags: { p: {}, span: {} },
        topLevelLimits: { nesting: 0 },
      },
    );

    expect(result).toBe("<p>kept</p><p>also kept</p>");
  });

  it("enforces zero tag nesting without affecting sibling elements", () => {
    const result = enforceHtml(
      "<div>kept<p>removed</p></div><p>also kept</p>",
      {
        errorHandling: { tagNesting: "discardElement" },
        tags: { div: { limits: { nesting: 0 } }, p: {} },
      },
    );

    expect(result).toBe("<div>kept</div><p>also kept</p>");
  });

  it("trims a nonempty attribute to zero length", () => {
    expect(
      enforceHtml("<p title=\"removed\"></p>", {
        errorHandling: { attributeValueTooLong: "trimExcess" },
        tags: {
          p: {
            attributes: { title: { maxLength: 0, mode: "simple", value: "*" } },
          },
        },
      }),
    ).toBe("<p title=\"\"></p>");
  });

  it("still validates the empty value produced by trimming", () => {
    expect(
      enforceHtml("<p title=\"removed\"></p>", {
        errorHandling: {
          attributeValue: "discardAttribute",
          attributeValueTooLong: "trimExcess",
        },
        tags: {
          p: {
            attributes: {
              title: { maxLength: 0, mode: "simple", value: false },
            },
          },
        },
      }),
    ).toBe("<p></p>");
  });

  it("throws for nonempty values when maxLength is zero", () => {
    expect(() => {
      return enforceHtml("<p title=\"removed\"></p>", {
        tags: {
          p: {
            attributes: { title: { maxLength: 0, mode: "simple", value: "*" } },
          },
        },
      });
    }).toThrow("is too long");
  });

  const collections: {
    input: string;
    rule: TagAttributeCollectionValueRule;
  }[] = [
    {
      input: "one two",
      rule: { delimiter: " ", maxEntries: 0, mode: "set", values: "*" },
    },
    {
      input: "one:1;two:2",
      rule: {
        entrySeparator: ";",
        keyValueSeparator: ":",
        maxEntries: 0,
        mode: "record",
        values: { one: "*", two: "*" },
      },
    },
  ];

  describe.each(collections)(
    "zero entries for $rule.mode",
    ({ input, rule }) => {
      it("drops every entry", () => {
        expect(
          enforceHtml(`<div data-values="${input}"></div>`, {
            errorHandling: { attributeCollectionValueTooMany: "dropExtra" },
            tags: { div: { attributes: { "data-values": rule } } },
          }),
        ).toBe("<div data-values=\"\"></div>");
      });

      it("throws for a nonempty collection by default", () => {
        expect(() => {
          return enforceHtml(`<div data-values="${input}"></div>`, {
            tags: { div: { attributes: { "data-values": rule } } },
          });
        }).toThrow("has too many tokens");
      });

      it("accepts an already empty collection", () => {
        expect(
          enforceHtml("<div data-values=\"\"></div>", {
            tags: { div: { attributes: { "data-values": rule } } },
          }),
        ).toBe("<div data-values=\"\"></div>");
      });
    },
  );

  it("accepts empty attributes and elements at zero limits", () => {
    const input = "<div title=\"\"></div>";
    expect(
      enforceHtml(input, {
        tags: {
          div: {
            attributes: {
              title: { maxLength: 0, mode: "simple", value: true },
            },
            limits: { children: 0, nesting: 0 },
          },
        },
        topLevelLimits: { nesting: 0 },
      }),
    ).toBe(input);
  });

  it("keeps omitted limits unrestricted", () => {
    const input = "<div title=\"kept\"><p>kept</p><p>also kept</p></div>";
    expect(
      enforceHtml(input, {
        tags: {
          div: {
            attributes: { title: { mode: "simple", value: "*" } },
            limits: {},
          },
          p: {},
        },
        topLevelLimits: {},
      }),
    ).toBe(input);
  });
});
