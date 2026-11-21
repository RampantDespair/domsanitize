import type { createEnforcer } from "../../src/core";
import type { DOMPurify } from "dompurify";

import { describe, expect, it } from "vitest";

import { dompurifyFixtures } from "../fixtures/dompurify-compatibility";

export function testDomPurifyInterop(enforce: ReturnType<typeof createEnforcer>, purify: DOMPurify): void {
  describe("shared-window DOMPurify interoperability", () => {
    it.each(dompurifyFixtures)("purify then enforce: $name", ({ expected, input, options }) => {
      expect(enforce(purify.sanitize(input), options)).toBe(expected);
    });

    it.each(dompurifyFixtures)("enforce then purify: $name", ({ expected, input, options }) => {
      expect(purify.sanitize(enforce(input, options))).toBe(expected);
    });

    it("purifies unsafe defaults added after an initial purification pass", () => {
      const clean = purify.sanitize("<a href=\"javascript:alert(1)\">link</a>");
      expect(clean).toBe("<a>link</a>");
      const enforced = enforce(clean, {
        errorHandling: { attributeValue: "applyDefaultValue" },
        tags: {
          a: {
            attributes: {
              // Deliberately unsafe default verifies that final purification removes it.
              // eslint-disable-next-line no-script-url
              href: { defaultValue: "javascript:alert(1)", mode: "simple", required: true, value: "*" },
            },
          },
        },
      });
      expect(enforced).toBe("<a href=\"javascript:alert(1)\">link</a>");
      // Final purification may remove required attributes. Do not reapply the
      // schema afterwards and assume its defaults are covered by purification.
      expect(purify.sanitize(enforced)).toBe("<a>link</a>");
    });
  });
}
