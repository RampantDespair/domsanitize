import type { TagAttributeValueRule } from "../src/types/rules";
import type { ErrorHandling } from "../src/types/schema";

import { describe, expect, it } from "vitest";

import { enforceHtml } from "../src/index";

const cases: {
  attributes: Record<string, TagAttributeValueRule>;
  errorHandling: ErrorHandling;
  name: string;
}[] = [
  {
    attributes: {},
    errorHandling: {
      attribute: "discardAttribute",
      attributeValue: "applyDefaultValue",
    },
    name: "discarding an unknown attribute",
  },
  {
    attributes: { bad: { mode: "simple", value: "valid" } },
    errorHandling: { attributeValue: "applyDefaultValue" },
    name: "removing an invalid attribute without a default",
  },
];

describe.each(cases)(
  "attribute dictionaries after $name",
  ({ attributes, errorHandling }) => {
    it.each(["fallback", ""])(
      "adds an explicit __proto__ default %j",
      (defaultValue) => {
        const result = enforceHtml("<div bad=\"invalid\"></div>", {
          errorHandling,
          tags: {
            div: {
              attributes: {
                ...attributes,
                ["__proto__"]: {
                  defaultValue,
                  mode: "simple",
                  required: true,
                  value: "*",
                },
              },
            },
          },
        });

        expect(result).toBe(`<div __proto__="${defaultValue}"></div>`);
      },
    );

    it("preserves existing special-name and ordinary attributes", () => {
      const result = enforceHtml(
        "<div bad=\"invalid\" __proto__=\"kept\" title=\"also kept\"></div>",
        {
          errorHandling,
          tags: {
            div: {
              attributes: {
                ...attributes,
                ["__proto__"]: { mode: "simple", value: "*" },
                title: { mode: "simple", value: "*" },
              },
            },
          },
        },
      );

      expect(result).toBe("<div __proto__=\"kept\" title=\"also kept\"></div>");
    });
  },
);

describe("special attribute removal", () => {
  it("discards a disallowed __proto__ attribute without affecting other attributes", () => {
    const result = enforceHtml("<div __proto__=\"removed\" title=\"kept\"></div>", {
      errorHandling: { attribute: "discardAttribute" },
      tags: { div: { attributes: { title: { mode: "simple", value: "*" } } } },
    });

    expect(result).toBe("<div title=\"kept\"></div>");
  });

  it("preserves special-name defaults after multiple attribute removals", () => {
    const result = enforceHtml(
      "<div bad=\"removed\" title=\"kept\" extra=\"removed\"></div>",
      {
        errorHandling: {
          attribute: "discardAttribute",
          attributeValue: "applyDefaultValue",
        },
        tags: {
          div: {
            attributes: {
              ["__proto__"]: {
                defaultValue: "fallback",
                mode: "simple",
                required: true,
                value: "*",
              },
              title: { mode: "simple", value: "*" },
            },
          },
        },
      },
    );

    expect(result).toBe("<div title=\"kept\" __proto__=\"fallback\"></div>");
  });
});
