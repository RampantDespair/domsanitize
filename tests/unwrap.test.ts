import { describe, expect, it, vi } from "vitest";

import { enforceHtml } from "../src/index";

describe("enforceHtml with unwrapElement", () => {
  it.each([
    { prefix: "", scope: "at the root", suffix: "" },
    { prefix: "<div>", scope: "inside an allowed parent", suffix: "</div>" },
  ])("validates promoted descendants $scope", ({ prefix, suffix }) => {
    const html = `${prefix}<p>before</p><section><p bad="x">one</p><aside><p bad="y">two</p></aside><!-- removed --><p>three</p></section><p>after</p>${suffix}`;
    const result = enforceHtml(html, {
      errorHandling: { attribute: "discardAttribute", tag: "unwrapElement" },
      tags: { div: {}, p: {} },
    });

    expect(result).toBe(
      `${prefix}<p>before</p><p>one</p><p>two</p><p>three</p><p>after</p>${suffix}`,
    );
  });

  it("validates descendants after an attribute error unwraps the parent", () => {
    const result = enforceHtml(
      "<section bad=\"x\"><unknown>removed</unknown><p>kept</p></section>",
      {
        errorHandling: { attribute: "unwrapElement", tag: "discardElement" },
        tags: { p: {}, section: {} },
      },
    );

    expect(result).toBe("<p>kept</p>");
  });

  it("validates descendants after an attribute value error unwraps the parent", () => {
    const result = enforceHtml(
      "<section title=\"bad\"><unknown>removed</unknown><p>kept</p></section>",
      {
        errorHandling: { attributeValue: "unwrapElement", tag: "discardElement" },
        tags: {
          p: {},
          section: { attributes: { title: { mode: "simple", value: "good" } } },
        },
      },
    );

    expect(result).toBe("<p>kept</p>");
  });

  it.each([false, true])(
    "honors preserveComments=%s after unwrapping",
    (preserveComments) => {
      const result = enforceHtml("<section><!-- comment -->text</section>", {
        errorHandling: { tag: "unwrapElement" },
        preserveComments,
        tags: {},
      });

      expect(result).toBe(preserveComments ? "<!-- comment -->text" : "text");
    },
  );

  it("validates promoted nodes and following siblings exactly once", () => {
    const validate = vi.fn(() => {
      return true;
    });
    const result = enforceHtml(
      "<section><p title=\"one\"></p><aside><p title=\"two\"></p></aside></section><p title=\"three\"></p>",
      {
        errorHandling: { tag: "unwrapElement" },
        tags: { p: { attributes: { title: { mode: "simple", value: validate } } } },
      },
    );

    expect(result).toBe(
      "<p title=\"one\"></p><p title=\"two\"></p><p title=\"three\"></p>",
    );
    expect(validate.mock.calls).toEqual([["one"], ["two"], ["three"]]);
  });

  it("does not validate descendants of discarded elements", () => {
    const validate = vi.fn(() => {
      return true;
    });
    const result = enforceHtml("<section><p title=\"removed\"></p></section>", {
      errorHandling: { tag: "discardElement" },
      tags: { p: { attributes: { title: { mode: "simple", value: validate } } } },
    });

    expect(result).toBe("");
    expect(validate).not.toHaveBeenCalled();
  });

  it("uses the promoted depth when validating descendants", () => {
    const result = enforceHtml("<section><p><span>kept</span></p></section>", {
      errorHandling: { tag: "unwrapElement", tagNesting: "discardElement" },
      tags: { p: {}, span: {} },
      topLevelLimits: { nesting: 1 },
    });

    expect(result).toBe("<p><span>kept</span></p>");
  });

  it("retains ancestor nesting limits for promoted descendants", () => {
    const result = enforceHtml(
      "<div><section><p><span>too deep</span></p></section></div>",
      {
        errorHandling: { tag: "unwrapElement", tagNesting: "discardElement" },
        tags: { div: { limits: { nesting: 1 } }, p: {}, span: {} },
      },
    );

    expect(result).toBe("<div><p></p></div>");
  });
});
