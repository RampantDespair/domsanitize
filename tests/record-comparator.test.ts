import { describe, expect, it } from "vitest";

import { enforceHtml } from "../src/index";

describe("boolean record comparators", () => {
  it.each(["alice", "0", "false"])(
    "accepts nonempty value %s with a false comparator",
    (value) => {
      const input = `<div data-values="name:${value}"></div>`;
      const result = enforceHtml(input, {
        tags: {
          div: {
            attributes: {
              "data-values": {
                entrySeparator: ";",
                keyValueSeparator: ":",
                mode: "record",
                values: { name: false },
              },
            },
          },
        },
      });

      expect(result).toBe(input);
    },
  );

  it("drops unknown keys while retaining a false-comparator pair", () => {
    const result = enforceHtml(
      "<div data-values=\"unknown:bad;name:alice\"></div>",
      {
        errorHandling: { attributeRecordValue: "dropPair" },
        tags: {
          div: {
            attributes: {
              "data-values": {
                entrySeparator: ";",
                keyValueSeparator: ":",
                mode: "record",
                values: { name: false },
              },
            },
          },
        },
      },
    );

    expect(result).toBe("<div data-values=\"name:alice\"></div>");
  });

  it("still throws for a missing comparator", () => {
    expect(() => {
      return enforceHtml("<div data-values=\"unknown:bad\"></div>", {
        tags: {
          div: {
            attributes: {
              "data-values": {
                entrySeparator: ";",
                keyValueSeparator: ":",
                mode: "record",
                values: { name: false },
              },
            },
          },
        },
      });
    }).toThrow("Pair unknown=bad for attribute data-values is not allowed");
  });

  it("applies duplicate handling to valid false-comparator pairs", () => {
    const result = enforceHtml(
      "<div data-values=\"name:alice;name:bob\"></div>",
      {
        errorHandling: { attributeRecordValueDuplicate: "keepLast" },
        tags: {
          div: {
            attributes: {
              "data-values": {
                entrySeparator: ";",
                keyValueSeparator: ":",
                mode: "record",
                values: { name: false },
              },
            },
          },
        },
      },
    );

    expect(result).toBe("<div data-values=\"name:bob\"></div>");
  });

  it("still rejects nonempty values for a true comparator", () => {
    const result = enforceHtml("<div data-values=\"name:alice\"></div>", {
      errorHandling: { attributeRecordValue: "dropPair" },
      tags: {
        div: {
          attributes: {
            "data-values": {
              entrySeparator: ";",
              keyValueSeparator: ":",
              mode: "record",
              values: { name: true },
            },
          },
        },
      },
    });

    expect(result).toBe("<div data-values=\"\"></div>");
  });
});
