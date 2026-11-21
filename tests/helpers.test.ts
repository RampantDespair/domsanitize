import { describe, expect, it } from "vitest";

import {
  matchComparator,
  parseRecord,
  parseSet,
  unwrapInParent,
} from "../src/lib/helpers";
import { createElement } from "./support/dom";

describe("matchComparator", () => {
  it("matches '*' wildcard", () => {
    expect(matchComparator("*", "anything")).toBe(true);
  });

  it("matches function comparator", () => {
    const fn = (v: string) => {
      return v.startsWith("ok-");
    };
    expect(matchComparator(fn, "ok-good")).toBe(true);
    expect(matchComparator(fn, "bad")).toBe(false);
  });

  it("matches RegExp comparator", () => {
    expect(matchComparator(/^a.+z$/, "abcz")).toBe(true);
    expect(matchComparator(/^a.+z$/, "nope")).toBe(false);
  });

  it("matches exact string", () => {
    expect(matchComparator("yes", "yes")).toBe(true);
    expect(matchComparator("yes", "no")).toBe(false);
  });

  it("matches one-of array", () => {
    expect(matchComparator(["a", "b", "c"], "b")).toBe(true);
    expect(matchComparator(["a", "b", "c"], "z")).toBe(false);
  });

  it("matches boolean comparator (true means empty string)", () => {
    expect(matchComparator(true, "")).toBe(true);
    expect(matchComparator(true, "non-empty")).toBe(false);
  });

  it("falls back to false for unsupported comparator shapes", () => {
    // @ts-expect-error - deliberately pass an unsupported runtime value to hit the fallback
    expect(matchComparator(0, "anything")).toBe(false);
  });
});

describe("parseRecord", () => {
  it("returns empty array for blank input", () => {
    expect(parseRecord("", ";", ":")).toEqual([]);
    expect(parseRecord("   ", ";", ":")).toEqual([]);
  });

  it("parses single key:value", () => {
    expect(parseRecord("k:v", ";", ":")).toEqual([{ key: "k", val: "v" }]);
  });

  it("parses multiple pairs with trimming", () => {
    const input = " a:1 ;  b : 2; c: 3  ";
    expect(parseRecord(input, ";", ":")).toEqual([
      { key: "a", val: "1" },
      { key: "b", val: "2" },
      { key: "c", val: "3" },
    ]);
  });

  it("skips entries without exactly one pair separator", () => {
    // "x" -> no pairSep; "y::z" -> two pairSep; both skipped
    const input = "a:1; x ; y::z ; b:2";
    expect(parseRecord(input, ";", ":")).toEqual([
      { key: "a", val: "1" },
      { key: "b", val: "2" },
    ]);
  });

  it("skips entries with empty key or val after trimming", () => {
    const input = " :1 ; a: ; : ; b:2 ";
    expect(parseRecord(input, ";", ":")).toEqual([{ key: "b", val: "2" }]);
  });
});

describe("parseSet", () => {
  it("returns empty array for blank input", () => {
    expect(parseSet("", ",")).toEqual([]);
    expect(parseSet("   ", ",")).toEqual([]);
  });

  it("splits, trims, filters blanks, and deduplicates (preserving first occurrence order)", () => {
    const input = "  a ,  b , a ,  , c , b ,  c , d  ";
    expect(parseSet(input, ",")).toEqual(["a", "b", "c", "d"]);
  });

  it("works with custom delimiters", () => {
    const input = "x| y |x||z|  ";
    expect(parseSet(input, "|")).toEqual(["x", "y", "z"]);
  });
});

describe("unwrapInParent", () => {
  it("detaches element with no children", () => {
    const parent = createElement("parent", []);
    const empty = createElement("empty", []);
    parent.appendChild(empty);

    expect(parent.childNodes).toHaveLength(1);
    unwrapInParent(empty);
    expect(parent.childNodes).toHaveLength(0);
  });

  it("detaches element that has children but no parent", () => {
    const lone = createElement("lone", []);
    const childA = createElement("a", []);
    lone.appendChild(childA);

    // No parent set. Should simply detach 'lone' (noop for the rest of the tree).
    unwrapInParent(lone);

    // 'lone' should have been detached; children remain attached to 'lone' in memory,
    // but there is no parent to insert into — the function exits via the 'no parent' branch.
    expect(lone.parentNode).toBeNull();
    // And it should still have its children (we didn't delete them here).
    expect(lone.childNodes).toHaveLength(1);
    expect(lone.childNodes[0]).toBe(childA);
  });

  it("moves children before the next sibling if nextSibling exists", () => {
    const parent = createElement("parent", []);
    const before = createElement("before", []);
    const target = createElement("target", []);
    const child1 = createElement("c1", []);
    const child2 = createElement("c2", []);
    const after = createElement("after", []);

    parent.appendChild(before);
    parent.appendChild(target);
    parent.appendChild(after);
    target.appendChild(child1);
    target.appendChild(child2);

    // Initial order: [before, target(child1, child2), after]
    expect(
      Array.from(parent.childNodes).map(
        (c) => {
          return (c as Element).localName;
        },
      ),
    ).toEqual(["before", "target", "after"]);

    unwrapInParent(target);

    // After unwrapping: children inserted before 'after'
    expect(
      Array.from(parent.childNodes).map(
        (c) => {
          return (c as Element).localName;
        },
      ),
    ).toEqual(["before", "c1", "c2", "after"]);
    expect(target.parentNode).toBeNull();
  });

  it("appends children to parent when there is no nextSibling", () => {
    const parent = createElement("parent", []);
    const before = createElement("before", []);
    const target = createElement("target", []);
    const child1 = createElement("c1", []);
    const child2 = createElement("c2", []);

    parent.appendChild(before);
    parent.appendChild(target);
    target.appendChild(child1);
    target.appendChild(child2);

    // Initial order: [before, target(child1, child2)]
    expect(
      Array.from(parent.childNodes).map(
        (c) => {
          return (c as Element).localName;
        },
      ),
    ).toEqual(["before", "target"]);

    unwrapInParent(target);

    // After unwrapping: children appended at the end
    expect(
      Array.from(parent.childNodes).map(
        (c) => {
          return (c as Element).localName;
        },
      ),
    ).toEqual(["before", "c1", "c2"]);
    expect(target.parentNode).toBeNull();
  });
});
