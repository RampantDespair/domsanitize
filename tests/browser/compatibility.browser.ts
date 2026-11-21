import { describe, expect, it } from "vitest";
import { server } from "vitest/browser";

import { createEnforcer, enforceHtml } from "../../src/browser";
import { htmlErrorFixtures, htmlOutputFixtures } from "../fixtures/html-compatibility";

for (const [name, enforce] of [
  ["browser entrypoint", enforceHtml],
  ["injected browser window", createEnforcer(window)],
] as const) {
  describe(name, () => {
    it.each(htmlOutputFixtures)("$name", ({ browserErrors, expected, input, options }) => {
      const browserError = browserErrors?.[server.browser];
      if (browserError) {
        expect(() => {
          return enforce(input, options);
        }).toThrow(browserError);
      } else {
        expect(enforce(input, options)).toBe(expected);
      }
    });

    it("can unwrap a wrapper retained inside select by the native parser", () => {
      expect(enforce("<select><div>text</div><option value=\"a\">A</option></select>", {
        errorHandling: { tag: "unwrapElement" },
        tags: {
          option: { attributes: { value: { mode: "simple", value: "*" } } },
          select: {},
        },
      })).toBe("<select>text<option value=\"a\">A</option></select>");
    });

    it("handles allowed noscript contents or rejects non-stabilizing serialization", () => {
      const run = () => {
        return enforce("<noscript><p title=\"literal\">fallback</p></noscript>", {
          errorHandling: { attribute: "discardAttribute" },
          tags: { noscript: {}, p: {} },
        });
      };
      if (server.browser === "firefox") {
        // Firefox escapes the text again on every serialization. The bounded
        // normalization loop must reject it instead of returning unstable HTML.
        expect(run).toThrow("HTML schema enforcement did not stabilize after 10 passes");
      } else {
        expect(run()).toBe("<noscript><p>fallback</p></noscript>");
      }
    });

    it.each(htmlErrorFixtures)("$name", ({ error, input, options }) => {
      expect(() => {
        return enforce(input, options);
      }).toThrow(error);
    });
  });
}

it("does not run scripts or upgrade custom elements in the caller's document", () => {
  let upgrades = 0;
  class Probe extends HTMLElement {
    constructor() {
      super();
      upgrades++;
    }
  }
  customElements.define("domsanitize-probe", Probe);
  const marker = document.createElement("div");
  marker.id = "domsanitize-marker";
  document.body.append(marker);
  try {
    const html = "<domsanitize-probe></domsanitize-probe><script>document.getElementById(\"domsanitize-marker\").remove()</script>";
    expect(enforceHtml(html, { tags: { "domsanitize-probe": {}, script: {} } })).toBe(html);
    expect(upgrades).toBe(0);
    expect(marker.isConnected).toBe(true);
  } finally {
    marker.remove();
  }
});
