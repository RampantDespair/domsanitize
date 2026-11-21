import { JSDOM } from "jsdom";
import { afterAll, describe, expect, it, vi } from "vitest";

import { createEnforcer, enforceHtml } from "../src/browser";
import { htmlErrorFixtures, htmlOutputFixtures } from "./fixtures/html-compatibility";

const { window } = new JSDOM("");

afterAll(() => {
  vi.unstubAllGlobals();
  window.close();
});

it("imports without browser globals and initializes only when needed", () => {
  expect(enforceHtml("", {})).toBe("");
  expect(() => {
    return enforceHtml("<p>text</p>", { tags: { p: {} } });
  }).toThrow("The browser DOM environment requires a window");
  expect(createEnforcer(window)("<p>text</p>", { tags: { p: {} } })).toBe("<p>text</p>");
  vi.stubGlobal("window", window);
});

describe("browser entrypoint with a supplied global window", () => {
  it.each(htmlOutputFixtures)("$name", ({ expected, input, options }) => {
    expect(enforceHtml(input, options)).toBe(expected);
  });

  it.each(htmlErrorFixtures)("$name", ({ error, input, options }) => {
    expect(() => {
      return enforceHtml(input, options);
    }).toThrow(error);
  });
});
