import { describe, expect, it } from "vitest";

import { enforceHtml } from "../src/index";
import { htmlErrorFixtures, htmlOutputFixtures } from "./fixtures/html-compatibility";

describe("HTML compatibility baseline", () => {
  it.each(htmlOutputFixtures)("$name", ({ expected, input, options }) => {
    expect(enforceHtml(input, options)).toBe(expected);
  });

  it.each(htmlErrorFixtures)("$name", ({ error, input, options }) => {
    expect(() => {
      return enforceHtml(input, options);
    }).toThrow(error);
  });
});
