import { JSDOM } from "jsdom";
import { afterAll, describe, expect, it } from "vitest";

import { createEnforcer } from "../src/core";
import { htmlErrorFixtures, htmlOutputFixtures } from "./fixtures/html-compatibility";

const { window } = new JSDOM("<p id=\"host\">host</p>");
const enforce = createEnforcer(window);

afterAll(() => {
  window.close();
});

describe("injected-window enforcement compatibility", () => {
  it.each(htmlOutputFixtures)("$name", ({ expected, input, options }) => {
    expect(enforce(input, options)).toBe(expected);
  });

  it.each(htmlErrorFixtures)("$name", ({ error, input, options }) => {
    expect(() => {
      return enforce(input, options);
    }).toThrow(error);
  });

  it("leaves the supplied page untouched across repeated calls", () => {
    expect(enforce("<p>first</p>", { tags: { p: {} } })).toBe("<p>first</p>");
    expect(enforce("<p>second</p>", { tags: { p: {} } })).toBe("<p>second</p>");
    expect(window.document.body.innerHTML).toBe("<p id=\"host\">host</p>");
  });

  it("supports independent windows without relying on global DOM constructors", () => {
    const second = new JSDOM("");
    try {
      const otherEnforce = createEnforcer(second.window);
      const input = "<template><p>text</p></template>";
      const options = { tags: { p: {}, template: {} } };

      expect(otherEnforce(input, options)).toBe(input);
      expect(enforce(input, options)).toBe(input);
      expect(typeof globalThis.window).toBe("undefined");
    } finally {
      second.window.close();
    }
  });
});
