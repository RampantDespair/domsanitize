import type { SchemaOptions } from "../src/types/schema";

import { parseFragment, serialize } from "parse5";
import { describe, expect, it, vi } from "vitest";

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
    options: { topLevelLimits: { children: 1 } },
    prefix: "",
    suffix: "",
  },
  {
    errorPrefix: "Tag section",
    name: "element",
    options: { tags: { section: { limits: { children: 1 } } } },
    prefix: "<section>",
    suffix: "</section>",
  },
  {
    errorPrefix: "Tag template",
    name: "template",
    options: { tags: { template: { limits: { children: 1 } } } },
    prefix: "<template>",
    suffix: "</template>",
  },
];

describe.each(scopes)("limits after serialization: $name", ({ errorPrefix, options, prefix, suffix }) => {
  const input = `${prefix}<p>before<template bad="x"><div>middle</div></template></p>${suffix}`;

  it.each([
    { content: "<p></p>", mode: "discardFirsts" },
    { content: "<p>before</p>", mode: "discardLasts" },
    { content: "", mode: "discardElement" },
  ] as const)("applies $mode to reparsed children", ({ content, mode }) => {
    const schema: SchemaOptions = {
      ...options,
      errorHandling: { attribute: "unwrapElement", tagChildren: mode },
      tags: { div: {}, p: {}, template: {}, ...options.tags },
    };
    const result = enforceHtml(input, schema);

    expect(result).toBe(mode === "discardElement" ? "" : `${prefix}${content}${suffix}`);
    expect(serialize(parseFragment(result))).toBe(result);
    expect(enforceHtml(result, schema)).toBe(result);
  });

  it("throws for children introduced by reparsing", () => {
    expect(() => {
      return enforceHtml(input, {
        ...options,
        errorHandling: { attribute: "unwrapElement", tagChildren: "throwError" },
        tags: { div: {}, p: {}, template: {}, ...options.tags },
      });
    }).toThrow(`${errorPrefix} has exceeded the maximum allowed number of children of 1`);
  });
});

it("enforces the root limit after unwrapping a disallowed template", () => {
  const result = enforceHtml("<p><template><div>text</div></template></p>", {
    errorHandling: { tag: "unwrapElement", tagChildren: "discardLasts" },
    tags: { div: {}, p: {} },
    topLevelLimits: { children: 1 },
  });

  expect(result).toBe("<p></p>");
  expect(parseFragment(result).childNodes).toHaveLength(1);
});

it("returns stable markup when no limits are configured", () => {
  const result = enforceHtml("<p>before<template><div>middle</div></template></p>", {
    errorHandling: { tag: "unwrapElement" },
    tags: { div: {}, p: {} },
  });

  expect(result).toBe("<p>before</p><div>middle</div><p></p>");
  expect(serialize(parseFragment(result))).toBe(result);
});

it("validates implicit elements introduced by reparsing", () => {
  const result = enforceHtml("<table><template bad=\"x\"><tr><td>cell</td></tr></template></table>", {
    errorHandling: { attribute: "unwrapElement", tag: "discardElement" },
    tags: { table: {}, td: {}, template: {}, tr: {} },
  });

  expect(result).toBe("<table></table>");
});

it("does not rerun comparators for stable output", () => {
  const validate = vi.fn(() => {
    return true;
  });
  const input = "<p title=\"once\">text</p>";

  expect(enforceHtml(input, {
    tags: { p: { attributes: { title: { mode: "simple", value: validate } } } },
  })).toBe(input);
  expect(validate).toHaveBeenCalledExactlyOnceWith("once");
});

it("preserves recovery defaults without revalidating stable output", () => {
  expect(enforceHtml("<p title=\"invalid\">text</p>", {
    errorHandling: { attributeValue: "applyDefaultValue" },
    tags: {
      p: { attributes: { title: { defaultValue: "fallback", mode: "simple", value: "allowed" } } },
    },
  })).toBe("<p title=\"fallback\">text</p>");
});

it("stops when the schema repeatedly unwraps an implicit table body", () => {
  expect(() => {
    return enforceHtml("<table><tr><td>cell</td></tr></table>", {
      errorHandling: { tag: "unwrapElement" },
      tags: { table: {}, td: {}, tr: {} },
    });
  }).toThrow("HTML schema enforcement did not stabilize after 10 passes");
});
