import type { SchemaOptions } from "../../src/core";
import type { HtmlOutputFixture } from "./html-compatibility";

const options: SchemaOptions = {
  errorHandling: { attribute: "discardAttribute", attributeSetValue: "dropValue", tag: "unwrapElement" },
  tags: {
    a: { attributes: { href: { mode: "simple", value: "*" } } },
    b: {},
    div: {},
    g: {},
    i: {},
    math: {},
    mi: {},
    p: { attributes: { class: { delimiter: " ", mode: "set", values: ["keep"] } } },
    svg: { attributes: { viewBox: { mode: "simple", value: "*" } } },
    table: {},
    tbody: {},
    td: {},
    template: {},
    tr: {},
  },
};

// Fixed expectations shared by jsdom and native browser runs. Both libraries
// use the same supplied window; these schemas do not introduce unsafe defaults.
export const dompurifyFixtures: HtmlOutputFixture[] = [
  {
    expected: "<p class=\"keep\"><a>link</a></p>",
    input: "<p class=\"keep drop\" onclick=\"alert(1)\"><a href=\"javascript:alert(1)\">link</a></p>",
    name: "URL purification and schema value filtering",
    options,
  },
  {
    expected: "<p><a href=\"https://example.com\">link</a></p>",
    input: "<p><a href=\"https://example.com\" onmouseover=\"alert(1)\">link</a></p>",
    name: "allowed links retain their URL",
    options,
  },
  {
    expected: "<b><i>one</i></b><i>two</i>",
    input: "<b><i>one</b>two</i>",
    name: "misnested formatting is repaired consistently",
    options,
  },
  {
    expected: "<table><tbody><tr><td>cell</td></tr></tbody></table>",
    input: "<table><tr><td onclick=\"alert(1)\">cell</table>",
    name: "implicit table containers",
    options,
  },
  {
    expected: "<div><template><p class=\"keep\">text</p></template></div>",
    input: "<div><template><!--comment--><p class=\"keep drop\" onclick=\"alert(1)\">text</p></template></div>",
    name: "template contents are processed by both libraries",
    options,
  },
  {
    expected: "<svg viewBox=\"0 0 1 1\"><g><a>link</a></g></svg>",
    input: "<svg viewBox=\"0 0 1 1\"><g onload=\"alert(1)\"><a xlink:href=\"javascript:alert(1)\">link</a></g></svg>",
    name: "SVG namespaces and unsafe qualified URLs",
    options,
  },
  {
    expected: "<math><mi>x</mi></math>",
    input: "<math><mi onclick=\"alert(1)\">x</mi></math>",
    name: "MathML content",
    options,
  },
];
