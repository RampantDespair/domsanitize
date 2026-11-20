import { describe, expect, it } from "vitest";

import { defaultConfig } from "../src/defaults";
import { enforceHtml } from "../src/index";

describe("defaultConfig", () => {
  it.each([
    "<p id=\"hello\" class=\"notice\">text</p>",
    "<a href=\"https://example.com\" target=\"_blank\">link</a>",
    "<section id=\"main\"><h2 title=\"heading\">text</h2><span class=\"label\">label</span></section>",
    "<table class=\"data\"><tbody><tr><td colspan=\"2\">cell</td></tr></tbody></table>",
  ])("preserves declared attributes in %s", (input) => {
    expect(enforceHtml(input, defaultConfig)).toBe(input);
  });

  it("removes undeclared attributes while preserving declared ones", () => {
    const input = "<p unknown=\"removed\" constructor=\"removed\" __proto__=\"removed\" id=\"hello\">text</p>";

    expect(enforceHtml(input, defaultConfig)).toBe("<p id=\"hello\">text</p>");
  });

  it("applies the declared nonempty value rules", () => {
    const input = "<p id=\"\" class=\"notice\">text</p><a href=\"\" title=\"link\">link</a>";

    expect(enforceHtml(input, defaultConfig)).toBe(
      "<p class=\"notice\">text</p><a title=\"link\">link</a>",
    );
  });

  it("continues to discard tags outside the default allowlist", () => {
    const input = "<p id=\"hello\">text</p><script>removed</script><custom-tag>removed</custom-tag><img src=\"/image.png\">";

    expect(enforceHtml(input, defaultConfig)).toBe("<p id=\"hello\">text</p>");
  });

  it("keeps explicit per-tag attribute overrides isolated", () => {
    const options = {
      ...defaultConfig,
      tags: {
        ...defaultConfig.tags,
        p: {
          ...defaultConfig.tags?.p,
          attributes: {
            ...defaultConfig.tags?.p.attributes,
            id: { mode: "simple" as const, value: "allowed" },
          },
        },
      },
    };
    const input = "<p id=\"other\">text</p><span id=\"other\">label</span>";

    expect(enforceHtml(input, options)).toBe("<p>text</p><span id=\"other\">label</span>");
    expect(enforceHtml(input, defaultConfig)).toBe(input);
  });
});
