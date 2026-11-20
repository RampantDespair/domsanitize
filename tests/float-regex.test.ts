import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { enforceHtml } from "../src/index";
import {
  defaultFloatAttribute,
  defaultNegativeFloatAttribute,
  defaultPositiveFloatAttribute,
} from "../src/lib/default/primitives";
import {
  floatRegex,
  negativeFloatRegex,
  positiveFloatRegex,
} from "../src/lib/default/regexes";

const cases = [
  { name: "float", prefix: "-", regex: floatRegex, rule: defaultFloatAttribute },
  {
    name: "negative float",
    prefix: "-",
    regex: negativeFloatRegex,
    rule: defaultNegativeFloatAttribute,
  },
  {
    name: "positive float",
    prefix: "",
    regex: positiveFloatRegex,
    rule: defaultPositiveFloatAttribute,
  },
];

describe.each(cases)("$name fractional validation", ({ prefix, regex, rule }) => {
  it("accepts nonzero fractions with leading and trailing zeros", () => {
    for (const fraction of ["1", "01", "0001000", "1234500", `${"0".repeat(10000)}1`]) {
      expect(regex.test(`${prefix}0.${fraction}`)).toBe(true);
    }
  });

  it("rejects all-zero fractions", () => {
    for (const fraction of ["0", "0000", "0".repeat(10000)]) {
      expect(regex.test(`${prefix}0.${fraction}`)).toBe(false);
    }
  });

  it("rejects malformed fractions", () => {
    for (const fraction of ["1x", "0001000x", "1.2", "1\n"]) {
      expect(regex.test(`${prefix}0.${fraction}`)).toBe(false);
    }
  });

  it("rejects a long malformed attribute through enforceHtml", () => {
    const input = `<p data-number="${prefix}0.${"1".repeat(40000)}x">text</p>`;

    expect(enforceHtml(input, {
      errorHandling: { attributeValue: "discardAttribute" },
      tags: { p: { attributes: { "data-number": rule } } },
    })).toBe("<p>text</p>");
  });
});

it("rejects adversarial float values within a bounded time", () => {
  // A subprocess deadline can interrupt a regex that blocks the event loop.
  const script = `
    const assert = require("node:assert/strict");
    for (const { prefix, source } of JSON.parse(process.argv[1])) {
      const regex = new RegExp(source);
      for (const digit of ["1", "0"]) {
        assert.equal(regex.test(prefix + "0." + digit.repeat(200000) + "x"), false);
      }
    }
  `;
  const patterns = cases.map(({ prefix, regex }) => {
    return { prefix, source: regex.source };
  });

  expect(execFileSync(process.execPath, ["-e", script, JSON.stringify(patterns)], {
    encoding: "utf8",
    timeout: 5000,
  })).toBe("");
}, 10000);
