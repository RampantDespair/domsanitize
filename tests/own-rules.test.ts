import type { TagAttributeValueRule } from "../src/types/rules";
import type { TagRule } from "../src/types/tag";

import { describe, expect, it } from "vitest";

import { enforceHtml } from "../src/index";

describe("enforceHtml schema ownership", () => {
  it("does not allow the inherited constructor as a tag rule", () => {
    expect(
      enforceHtml("<constructor>removed</constructor>", {
        errorHandling: { tag: "discardElement" },
        tags: {},
      }),
    ).toBe("");
  });

  it("does not allow tag rules from a custom prototype", () => {
    const tags: Record<string, TagRule> = {};
    Object.setPrototypeOf(tags, { p: {} });

    expect(
      enforceHtml("<p>removed</p>", {
        errorHandling: { tag: "discardElement" },
        tags,
      }),
    ).toBe("");
  });

  it("allows an explicitly defined constructor tag", () => {
    expect(
      enforceHtml("<constructor>kept</constructor>", {
        tags: { constructor: {} },
      }),
    ).toBe("<constructor>kept</constructor>");
  });

  it.each(["constructor", "__proto__"])(
    "discards an attribute named %s without skipping child validation",
    (name) => {
      expect(
        enforceHtml(`<div ${name}="bad"><unknown>removed</unknown></div>`, {
          errorHandling: {
            attribute: "discardAttribute",
            tag: "discardElement",
          },
          tags: { div: { attributes: {} } },
        }),
      ).toBe("<div></div>");
    },
  );

  it.each(["constructor", "__proto__"])(
    "uses the explicit wildcard rule for an attribute named %s",
    (name) => {
      expect(
        enforceHtml(`<div ${name}="bad"></div>`, {
          errorHandling: { attributeValue: "discardAttribute" },
          tags: {
            div: { attributes: { "*": { mode: "simple", value: "good" } } },
          },
        }),
      ).toBe("<div></div>");
    },
  );

  it.each(["data-extra", "*"])(
    "ignores inherited attribute rule %s",
    (name) => {
      const attributes: Record<string, TagAttributeValueRule> = {};
      Object.setPrototypeOf(attributes, {
        [name]: { mode: "simple", value: "*" },
      });

      expect(
        enforceHtml("<div data-extra=\"removed\"></div>", {
          errorHandling: { attribute: "discardAttribute" },
          tags: { div: { attributes } },
        }),
      ).toBe("<div></div>");
    },
  );

  it.each([
    "constructor",
    "toString",
    "valueOf",
    "hasOwnProperty",
    "__proto__",
  ])("does not use inherited record key %s as a comparator", (key) => {
    expect(
      enforceHtml(`<div data-config="${key}:bad"></div>`, {
        errorHandling: { attributeRecordValue: "dropPair" },
        tags: {
          div: {
            attributes: {
              "data-config": {
                entrySeparator: ";",
                keyValueSeparator: ":",
                mode: "record",
                values: {},
              },
            },
          },
        },
      }),
    ).toBe("<div data-config=\"\"></div>");
  });

  it("honors explicitly defined special attribute and record keys", () => {
    const attributes: Record<string, TagAttributeValueRule> = {
      constructor: { mode: "simple" as const, value: "good" },
      "data-config": {
        entrySeparator: ";",
        keyValueSeparator: ":",
        mode: "record",
        values: { ["__proto__"]: "*", constructor: "*" },
      },
    };
    const input =
      "<div constructor=\"good\" data-config=\"constructor:one;__proto__:two\"></div>";

    expect(enforceHtml(input, { tags: { div: { attributes } } })).toBe(input);
  });

  it("does not mistake an inherited property for a required attribute after discarding another attribute", () => {
    expect(
      enforceHtml("<div bad=\"removed\"></div>", {
        errorHandling: {
          attribute: "discardAttribute",
          attributeValue: "applyDefaultValue",
        },
        tags: {
          div: {
            attributes: {
              constructor: {
                defaultValue: "fallback",
                mode: "simple" as const,
                required: true,
                value: "*",
              },
            },
          },
        },
      }),
    ).toBe("<div constructor=\"fallback\"></div>");
  });

  it("accepts dictionaries with a null prototype", () => {
    const attributes: Record<string, TagAttributeValueRule> = {
      title: { mode: "simple", value: "good" },
    };
    const tags: Record<string, TagRule> = { p: { attributes } };
    Object.setPrototypeOf(attributes, null);
    Object.setPrototypeOf(tags, null);

    expect(enforceHtml("<p title=\"good\"></p>", { tags })).toBe(
      "<p title=\"good\"></p>",
    );
  });
});
