import { describe, expect, it } from "vitest";

import { enforceHtml } from "../src/index";
import { buildAllowedUrlRegex } from "../src/lib/utils/url";

describe("relative URL host restrictions", () => {
  const base = "https://example.com/page";
  const allowed = buildAllowedUrlRegex(["https"], ["example.com"], true);

  it.each([
    "//other.example/path",
    "///other.example/path",
    "////other.example/path",
    String.raw`/\other.example/path`,
    String.raw`/\\other.example/path`,
    String.raw`/\/other.example/path`,
    "//example.com@other.example/path",
  ])("rejects authority-changing URL %s", (value) => {
    expect(new URL(value, base).origin).toBe("https://other.example");
    expect(allowed.test(value)).toBe(false);
  });

  it.each([
    "/",
    "/path/to/page?x=1#section",
    "/path//segment",
    String.raw`/path\segment`,
    "/?next=//other.example/path",
    "/#//other.example/path",
    "/%2Fother.example/path",
    "/%5Cother.example/path",
  ])("continues allowing same-origin root-relative path %s", (value) => {
    expect(new URL(value, base).origin).toBe("https://example.com");
    expect(allowed.test(value)).toBe(true);
  });

  it.each([
    "&#47;&#47;other.example/path",
    "&#47;&#92;other.example/path",
  ])("rejects decoded external href %s through enforceHtml", (href) => {
    const result = enforceHtml(`<a href="${href}">link</a>`, {
      errorHandling: { attributeValue: "discardAttribute" },
      tags: { a: { attributes: { href: { mode: "simple", value: allowed } } } },
    });

    expect(result).toBe("<a>link</a>");
  });
});
