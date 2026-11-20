import type { TagAttributeValueRule } from "../src/types/rules";
import type { ErrorHandling } from "../src/types/schema";

import { describe, expect, it } from "vitest";

import { enforceHtml } from "../src/index";

describe("empty-string attribute defaults", () => {
  it.each(["<input>", "<input disabled=\"invalid\">"])(
    "preserves a required boolean attribute for %s",
    (input) => {
      const result = enforceHtml(input, {
        errorHandling: { attributeValue: "applyDefaultValue" },
        tags: {
          input: {
            attributes: {
              disabled: {
                defaultValue: "",
                mode: "simple",
                required: true,
                value: true,
              },
            },
          },
        },
      });

      expect(result).toBe("<input disabled=\"\">");
    },
  );

  const cases: {
    errorHandling: ErrorHandling;
    input: string;
    name: string;
    rule: TagAttributeValueRule;
  }[] = [
    {
      errorHandling: { attributeValue: "applyDefaultValue" },
      input: "invalid",
      name: "invalid simple value",
      rule: { mode: "simple", value: "" },
    },
    {
      errorHandling: { attributeValueTooLong: "applyDefaultValue" },
      input: "too long",
      name: "excess length",
      rule: { maxLength: 1, mode: "simple", value: "*" },
    },
    {
      errorHandling: { attributeSetValue: "applyDefaultValue" },
      input: "good bad",
      name: "invalid set token",
      rule: { delimiter: " ", mode: "set", values: ["good"] },
    },
    {
      errorHandling: { attributeRecordValue: "applyDefaultValue" },
      input: "good:yes;bad:no",
      name: "invalid record pair",
      rule: {
        entrySeparator: ";",
        keyValueSeparator: ":",
        mode: "record",
        values: { good: "*" },
      },
    },
    {
      errorHandling: { attributeRecordValueDuplicate: "applyDefaultValue" },
      input: "good:one;good:two",
      name: "duplicate record key",
      rule: {
        entrySeparator: ";",
        keyValueSeparator: ":",
        mode: "record",
        values: { good: "*" },
      },
    },
  ];

  it.each(cases)(
    "preserves an empty default after $name",
    ({ errorHandling, input, rule }) => {
      const result = enforceHtml(`<div data-value="${input}"></div>`, {
        errorHandling,
        tags: {
          div: { attributes: { "data-value": { ...rule, defaultValue: "" } } },
        },
      });

      expect(result).toBe("<div data-value=\"\"></div>");
    },
  );

  it.each([{}, { defaultValue: undefined }])(
    "still removes invalid attributes when no default is provided: %j",
    (defaults) => {
      const result = enforceHtml("<div title=\"invalid\"></div>", {
        errorHandling: { attributeValue: "applyDefaultValue" },
        tags: {
          div: {
            attributes: {
              title: { ...defaults, mode: "simple", value: "valid" },
            },
          },
        },
      });

      expect(result).toBe("<div></div>");
    },
  );
});
