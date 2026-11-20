import type { SchemaOptions } from "../src/types/schema";

import { describe, expect, it } from "vitest";

import { enforceHtml } from "../src/index";

const scopes: {
  errorPrefix: string;
  name: string;
  options: SchemaOptions;
  prefix: string;
  suffix: string;
}[] = [
  {
    errorPrefix: "Root",
    name: "root",
    options: { tags: { p: {} }, topLevelLimits: { children: 1 } },
    prefix: "",
    suffix: "",
  },
  {
    errorPrefix: "Tag div",
    name: "element",
    options: { tags: { div: { limits: { children: 1 } }, p: {} } },
    prefix: "<div>",
    suffix: "</div>",
  },
  {
    errorPrefix: "Tag template",
    name: "template",
    options: { tags: { p: {}, template: { limits: { children: 1 } } } },
    prefix: "<template>",
    suffix: "</template>",
  },
];

describe.each(scopes)(
  "child limits after unwrapping: $name",
  ({ errorPrefix, options, prefix, suffix }) => {
    const input = `${prefix}<section><p>one</p><aside><p>two</p><p>three</p></aside></section>${suffix}`;

    it.each([
      { content: "<p>three</p>", mode: "discardFirsts" },
      { content: "<p>one</p>", mode: "discardLasts" },
      { content: "", mode: "discardElement" },
    ] as const)(
      "applies $mode after nested wrappers expand",
      ({ content, mode }) => {
        const schema: SchemaOptions = {
          ...options,
          errorHandling: { tag: "unwrapElement", tagChildren: mode },
        };
        const result = enforceHtml(input, schema);
        const expected =
          mode === "discardElement" ? "" : `${prefix}${content}${suffix}`;

        expect(result).toBe(expected);
        expect(enforceHtml(result, schema)).toBe(result);
      },
    );

    it("throws when unwrapping exceeds the child limit", () => {
      expect(() => {
        return enforceHtml(input, {
          ...options,
          errorHandling: { tag: "unwrapElement", tagChildren: "throwError" },
        });
      }).toThrow(
        `${errorPrefix} has exceeded the maximum allowed number of children of 1`,
      );
    });

    it("enforces the limit after an attribute error unwraps a child", () => {
      const result = enforceHtml(
        `${prefix}<section bad="x"><p>one</p><p>two</p></section>${suffix}`,
        {
          ...options,
          errorHandling: {
            attribute: "unwrapElement",
            tagChildren: "discardLasts",
          },
          tags: { ...options.tags, section: {} },
        },
      );

      expect(result).toBe(`${prefix}<p>one</p>${suffix}`);
    });

    it("still discards initially excessive children before validating them", () => {
      const result = enforceHtml(
        `${prefix}<p>kept</p><unknown>removed</unknown>${suffix}`,
        {
          ...options,
          errorHandling: { tagChildren: "discardLasts" },
        },
      );

      expect(result).toBe(`${prefix}<p>kept</p>${suffix}`);
    });
  },
);
