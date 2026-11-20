import type { TagAttributeCollectionValueRule } from "../src/types/rules";
import type { ErrorHandling } from "../src/types/schema";

import { describe, expect, it, vi } from "vitest";

import { enforceHtml } from "../src/index";

const cases: {
  errorKey: keyof ErrorHandling;
  input: string;
  name: string;
  rule: TagAttributeCollectionValueRule;
}[] = [
  {
    errorKey: "attributeSetValue",
    input: "ok bad later",
    name: "invalid set value",
    rule: { delimiter: " ", mode: "set", values: ["ok", "later", "fallback"] },
  },
  {
    errorKey: "attributeRecordValue",
    input: "ok:yes;bad:no;later:yes",
    name: "invalid record pair",
    rule: {
      entrySeparator: ";",
      keyValueSeparator: ":",
      mode: "record",
      values: { fallback: "*", later: "*", ok: "*" },
    },
  },
  {
    errorKey: "attributeRecordValueDuplicate",
    input: "ok:one;ok:two;later:yes",
    name: "duplicate record key",
    rule: {
      entrySeparator: ";",
      keyValueSeparator: ":",
      mode: "record",
      values: { fallback: "*", later: "*", ok: "*" },
    },
  },
  {
    errorKey: "attributeCollectionValueTooMany",
    input: "one two",
    name: "excess set entries",
    rule: { delimiter: " ", maxEntries: 1, mode: "set", values: "*" },
  },
  {
    errorKey: "attributeCollectionValueTooMany",
    input: "one:1;two:2",
    name: "excess record entries",
    rule: {
      entrySeparator: ";",
      keyValueSeparator: ":",
      maxEntries: 1,
      mode: "record",
      values: { fallback: "*", one: "*", two: "*" },
    },
  },
];

describe.each(cases)(
  "collection recovery: $name",
  ({ errorKey, input, rule }) => {
    it.each(["discardAttribute", "applyDefaultValue"] as const)(
      "preserves %s and continues validating other attributes and children",
      (mode) => {
        const defaultValue = rule.mode === "set" ? "fallback" : "fallback:yes";
        const result = enforceHtml(
          `<div data-values="${input}" bad="removed"><p bad="removed">kept</p></div>`,
          {
            errorHandling: { attribute: "discardAttribute", [errorKey]: mode },
            tags: {
              div: { attributes: { "data-values": { ...rule, defaultValue } } },
              p: {},
            },
          },
        );

        expect(result).toBe(
          mode === "discardAttribute"
            ? "<div><p>kept</p></div>"
            : `<div data-values="${defaultValue}"><p>kept</p></div>`,
        );
      },
    );

    it("keeps the attribute removed when no default is configured", () => {
      const result = enforceHtml(`<div data-values="${input}"></div>`, {
        errorHandling: { [errorKey]: "applyDefaultValue" },
        tags: { div: { attributes: { "data-values": rule } } },
      });

      expect(result).toBe("<div></div>");
    });
  },
);

describe("collection recovery continuation", () => {
  it.each(["discardAttribute", "applyDefaultValue"] as const)(
    "does not validate later tokens after %s resolves a set error",
    (mode) => {
      const validate = vi.fn((value: string) => {
        return value !== "bad";
      });
      const result = enforceHtml("<div class=\"ok bad later\"></div>", {
        errorHandling: { attributeSetValue: mode },
        tags: {
          div: {
            attributes: {
              class: {
                defaultValue: "fallback",
                delimiter: " ",
                mode: "set",
                values: validate,
              },
            },
          },
        },
      });

      expect(result).toBe(
        mode === "discardAttribute"
          ? "<div></div>"
          : "<div class=\"fallback\"></div>",
      );
      expect(validate.mock.calls).toEqual([["ok"], ["bad"]]);
    },
  );

  it("continues validating after dropExtra and dropValue", () => {
    const result = enforceHtml("<div class=\"bad ok ignored\"></div>", {
      errorHandling: {
        attributeCollectionValueTooMany: "dropExtra",
        attributeSetValue: "dropValue",
      },
      tags: {
        div: {
          attributes: {
            class: {
              delimiter: " ",
              maxEntries: 2,
              mode: "set",
              values: ["ok"],
            },
          },
        },
      },
    });

    expect(result).toBe("<div class=\"ok\"></div>");
  });

  it.each([
    { expected: "later:yes", mode: "dropDuplicates" },
    { expected: "ok:one;ok:two;later:yes", mode: "keepDuplicates" },
    { expected: "ok:one;later:yes", mode: "keepFirst" },
    { expected: "ok:two;later:yes", mode: "keepLast" },
  ] as const)(
    "continues validating after $mode and dropPair",
    ({ expected, mode }) => {
      const result = enforceHtml(
        "<div data-values=\"ok:one;ok:two;bad:no;later:yes\"></div>",
        {
          errorHandling: {
            attributeRecordValue: "dropPair",
            attributeRecordValueDuplicate: mode,
          },
          tags: {
            div: {
              attributes: {
                "data-values": {
                  entrySeparator: ";",
                  keyValueSeparator: ":",
                  mode: "record",
                  values: { later: "*", ok: "*" },
                },
              },
            },
          },
        },
      );

      expect(result).toBe(`<div data-values="${expected}"></div>`);
    },
  );
});
