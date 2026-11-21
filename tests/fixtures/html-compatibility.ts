import type { SchemaOptions } from "../../src/types/schema";

export interface HtmlOutputFixture {
  expected: string;
  input: string;
  name: string;
  options: SchemaOptions;
}

export interface HtmlErrorFixture {
  error: string;
  input: string;
  name: string;
  options: SchemaOptions;
}

function allowTags(...names: string[]): SchemaOptions {
  return {
    tags: Object.fromEntries(names.map((name) => {
      return [name, { attributes: { "*": { mode: "simple", value: "*" } } }];
    })),
  };
}

// Fixed outputs from 0ba52ca. Keep these fixtures independent of a DOM library
// so the same cases can exercise the current implementation, jsdom, and browsers.
export const htmlOutputFixtures: HtmlOutputFixture[] = [
  {
    expected: "",
    input: "",
    name: "empty fragment",
    options: {},
  },
  {
    expected: " \n<p>text</p>\t ",
    input: " \n<p>text</p>\t ",
    name: "leading and trailing whitespace",
    options: allowTags("p"),
  },
  {
    expected: "<td>cell</td>",
    input: "<td>cell</td>",
    // DOMParser(..., "text/html").body drops td; this API accepts fragments.
    name: "standalone table cell",
    options: allowTags("td"),
  },
  {
    expected: "<tr><td>cell</td></tr>",
    input: "<tr><td>cell</td></tr>",
    name: "standalone table row",
    options: allowTags("tr", "td"),
  },
  {
    expected: "<col span=\"2\">",
    input: "<col span=2>",
    name: "standalone void table element",
    options: allowTags("col"),
  },
  {
    expected: "<title>Title</title><p>text</p>",
    input: "<!doctype html><html><head><title>Title</title></head><body><p>text</p></body></html>",
    name: "document wrappers are omitted",
    options: allowTags("title", "p"),
  },
  {
    expected: "<title>Title</title><meta name=\"x\" content=\"y\"><p>text</p>",
    input: "<title>Title</title><meta name=\"x\" content=\"y\"><p>text</p>",
    name: "head elements remain in the fragment",
    options: allowTags("title", "meta", "p"),
  },
  {
    expected: "<p class=\"one\">text</p>",
    input: "<P CLASS='one' class='two'>text</P>",
    name: "HTML casing and duplicate attributes",
    options: allowTags("p"),
  },
  {
    expected: "<p title=\"&quot;&amp;&nbsp;\">&lt;&gt;&amp;&nbsp;©</p>",
    input: "<p title=\"&quot;&amp;&#xA0;\">&lt;&gt;&amp;&nbsp;&#169;</p>",
    name: "text and attribute entity serialization",
    options: allowTags("p"),
  },
  {
    expected: "<p>before</p><div>middle</div>after<p></p>",
    input: "<p>before<div>middle</div>after</p>",
    name: "implicit paragraph closing",
    options: allowTags("p", "div"),
  },
  {
    expected: "<b><i>one</i></b><i>two</i>",
    input: "<b><i>one</b>two</i>",
    name: "misnested formatting reconstruction",
    options: allowTags("b", "i"),
  },
  {
    expected: "beforeafter<table><tbody><tr><td>cell</td></tr></tbody></table>",
    input: "<table>before<tr><td>cell</td></tr>after</table>",
    name: "table foster parenting and implicit tbody",
    options: allowTags("table", "tbody", "tr", "td"),
  },
  {
    expected: "<select>text<option value=\"a\">A</option></select>",
    input: "<select><div>text</div><option value=\"a\">A</option></select>",
    name: "select parsing discards invalid wrappers",
    options: allowTags("select", "option"),
  },
  {
    expected: "<template><tr><td>cell</td></tr></template>",
    input: "<template><tr><td>cell</td></tr></template>",
    name: "table rows inside template contents",
    options: allowTags("template", "tr", "td"),
  },
  {
    expected: "<template><template><p>text</p></template></template>",
    input: "<template><!--outer--><template><!--inner--><p>text</p></template></template>",
    name: "nested template comments are removed",
    options: allowTags("template", "p"),
  },
  {
    expected: "<!--before--><template><!--inside-->text</template><!--after-->",
    input: "<!--before--><template><!--inside-->text</template><!--after-->",
    name: "comments survive at the root and inside templates when requested",
    options: { ...allowTags("template"), preserveComments: true },
  },
  {
    expected: "<textarea>&lt;p&gt;&amp;</textarea>",
    input: "<textarea>\n&lt;p&gt;&amp;</textarea>",
    name: "textarea character references and initial newline",
    options: allowTags("textarea"),
  },
  {
    expected: "<style>p::before { content: \"<>&amp;\"; }</style>",
    input: "<style>p::before { content: \"<>&amp;\"; }</style>",
    name: "raw style text stays literal",
    options: allowTags("style"),
  },
  {
    expected: "<script>if (a < b) value = \"&amp;\";</script>",
    input: "<script>if (a < b) value = \"&amp;\";</script>",
    name: "allowed script text is not entity-decoded",
    options: allowTags("script"),
  },
  {
    expected: "<noscript><p title=\"literal\">fallback</p></noscript>",
    input: "<noscript><p title=\"literal\">fallback</p></noscript>",
    // A template in jsdom 31.0.1's main document escapes this text.
    // The DOM environment uses a detached document to preserve this baseline.
    name: "noscript markup is text even without a p rule",
    options: allowTags("noscript"),
  },
  {
    expected: "<svg viewBox=\"0 0 1 1\"><linearGradient gradientUnits=\"userSpaceOnUse\"></linearGradient></svg>",
    input: "<svg viewbox=\"0 0 1 1\"><lineargradient gradientunits=\"userSpaceOnUse\"></lineargradient></svg>",
    name: "SVG tag and attribute casing",
    options: allowTags("svg", "linearGradient"),
  },
  {
    expected: "<svg><a href=\"#plain\" xlink:href=\"#qualified\" xml:lang=\"en\">link</a></svg>",
    input: "<svg><a href=\"#plain\" xlink:href=\"#qualified\" xml:lang=\"en\">link</a></svg>",
    name: "qualified attributes keep separate identities",
    options: allowTags("svg", "a"),
  },
  {
    expected: "<svg><foreignObject><p class=\"x\">text</p></foreignObject></svg>",
    input: "<svg><foreignObject><P CLASS=\"x\">text</P></foreignObject></svg>",
    name: "SVG foreignObject contains HTML",
    options: allowTags("svg", "foreignObject", "p"),
  },
  {
    expected: "<svg><template><g></g></template></svg>",
    input: "<svg><template><g></g></template></svg>",
    name: "SVG template is an ordinary foreign element",
    options: allowTags("svg", "template", "g"),
  },
  {
    expected: "<svg><g>&lt;p&gt;&amp;text</g></svg>",
    input: "<svg><g><![CDATA[<p>&text]]></g></svg>",
    name: "foreign CDATA becomes escaped text",
    options: allowTags("svg", "g"),
  },
  {
    expected: "<math><annotation-xml encoding=\"text/html\"><p class=\"x\">text</p></annotation-xml></math>",
    input: "<math><annotation-xml encoding=\"text/html\"><p class=\"x\">text</p></annotation-xml></math>",
    name: "MathML HTML integration point",
    options: allowTags("math", "annotation-xml", "p"),
  },
  {
    expected: "<p>before</p><div>middle</div><p></p>",
    input: "<p>before<template><div>middle</div></template></p>",
    name: "unwrapped contents are normalized before returning",
    options: { ...allowTags("p", "div"), errorHandling: { tag: "unwrapElement" } },
  },
  {
    expected: "<p></p>",
    input: "<p><template><div>middle</div></template></p>",
    name: "root limits survive normalization",
    options: {
      ...allowTags("p", "div"),
      errorHandling: { tag: "unwrapElement", tagChildren: "discardLasts" },
      topLevelLimits: { children: 1 },
    },
  },
  {
    expected: "text",
    input: "text<!--comment--><p>removed</p>",
    name: "child limits count text and comments before comment removal",
    options: {
      ...allowTags("p"),
      errorHandling: { tagChildren: "discardLasts" },
      topLevelLimits: { children: 2 },
    },
  },
  {
    expected: "<p id=\"fallback\">text</p>",
    input: "<p>text</p>",
    name: "required attribute defaults",
    options: {
      errorHandling: { attributeValue: "applyDefaultValue" },
      tags: {
        p: { attributes: { id: { defaultValue: "fallback", mode: "simple", required: true, value: "*" } } },
      },
    },
  },
];

export const htmlErrorFixtures: HtmlErrorFixture[] = [
  {
    error: "Tag unknown is not allowed",
    input: "<unknown>text</unknown>",
    name: "disallowed tag throws by default",
    options: {},
  },
  {
    error: "Attribute title is not allowed",
    input: "<p title=\"x\">text</p>",
    name: "disallowed attribute throws by default",
    options: { tags: { p: {} } },
  },
  {
    error: "Root has exceeded the maximum allowed number of children of 1",
    input: "<p><template><div>middle</div></template></p>",
    name: "normalization introduces a root limit error",
    options: {
      ...allowTags("p", "div"),
      errorHandling: { tag: "unwrapElement", tagChildren: "throwError" },
      topLevelLimits: { children: 1 },
    },
  },
  {
    error: "HTML schema enforcement did not stabilize after 10 passes",
    input: "<table><tr><td>cell</td></tr></table>",
    name: "schema repeatedly unwraps implicit tbody",
    options: { ...allowTags("table", "tr", "td"), errorHandling: { tag: "unwrapElement" } },
  },
  {
    error: "HTML schema enforcement did not stabilize after 10 passes",
    input: "<plaintext>one<b>two</b>",
    name: "plaintext serialization does not stabilize",
    options: allowTags("plaintext", "b"),
  },
];
