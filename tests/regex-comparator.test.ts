import { describe, expect, it } from "vitest";

import { enforceHtml } from "../src/index";
import { matchComparator } from "../src/lib/helpers";

describe.each(["g", "y", "gy"])(
  "stateful regex comparator with %s",
  (flags) => {
    it("validates each value independently", () => {
      const comparator = new RegExp("^ok$", flags);
      const results = ["ok", "ok", "bad", "ok"].map((value) => {
        return matchComparator(comparator, value);
      });

      expect(results).toEqual([true, true, false, true]);
      expect(comparator.lastIndex).toBe(0);
    });

    it("ignores and preserves the caller's existing lastIndex", () => {
      const comparator = new RegExp("^ok$", flags);
      comparator.lastIndex = 1;

      expect(matchComparator(comparator, "ok")).toBe(true);
      expect(comparator.lastIndex).toBe(1);
      expect(matchComparator(comparator, "bad")).toBe(false);
      expect(comparator.lastIndex).toBe(1);
    });

    it("accepts a frozen regex without mutating it", () => {
      const comparator = Object.freeze(new RegExp("^ok$", flags));

      expect(matchComparator(comparator, "ok")).toBe(true);
      expect(matchComparator(comparator, "ok")).toBe(true);
      expect(comparator.lastIndex).toBe(0);
    });

    it("reuses a rule across attributes, elements, and enforcement calls", () => {
      const rule = {
        mode: "simple" as const,
        value: new RegExp("^ok$", flags),
      };
      const options = {
        errorHandling: { attributeValue: "discardAttribute" as const },
        tags: { p: { attributes: { id: rule, title: rule } } },
      };
      const input = "<p title=\"ok\" id=\"ok\"></p><p title=\"ok\"></p>";

      expect(enforceHtml(input, options)).toBe(input);
      expect(enforceHtml(input, options)).toBe(input);
    });

    it("validates every set token with the same regex", () => {
      const input = "<div class=\"ok1 ok2\"></div>";
      const result = enforceHtml(input, {
        errorHandling: { attributeSetValue: "dropValue" },
        tags: {
          div: {
            attributes: {
              class: {
                delimiter: " ",
                mode: "set",
                values: new RegExp("^ok[12]$", flags),
              },
            },
          },
        },
      });

      expect(result).toBe(input);
    });

    it("reuses a regex across record fields", () => {
      const comparator = new RegExp("^ok$", flags);
      const input = "<div data-values=\"a:ok;b:ok\"></div>";
      const result = enforceHtml(input, {
        errorHandling: { attributeRecordValue: "dropPair" },
        tags: {
          div: {
            attributes: {
              "data-values": {
                entrySeparator: ";",
                keyValueSeparator: ":",
                mode: "record",
                values: { a: comparator, b: comparator },
              },
            },
          },
        },
      });

      expect(result).toBe(input);
    });
  },
);

describe("regex comparator matching semantics", () => {
  it("preserves case-insensitive, global-search, and sticky behavior", () => {
    expect(matchComparator(/ok/gi, "xOK")).toBe(true);
    expect(matchComparator(/ok/iy, "xOK")).toBe(false);
    expect(matchComparator(/ok/iy, "OK")).toBe(true);
  });

  it("preserves Unicode matching flags", () => {
    expect(matchComparator(/^\p{L}+$/gu, "café")).toBe(true);
    expect(matchComparator(/^\p{L}+$/gu, "123")).toBe(false);
  });
});
