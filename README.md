# domsanitize

Declarative schema-based HTML attribute validation. Define which tags, attributes, and values are allowed and enforce them.

## Not a purification replacement

domsanitize is **not** a purifier and does not aim to replace tools like [DOMPurify](https://github.com/cure53/DOMPurify). DOMPurify is excellent at removing malicious content and protecting against XSS. domsanitize solves a different problem: **structural conformance**. Use domsanitize to enforce your schema and DOMPurify to purify the final markup before rendering.

## Features

All rules are defined per tag, giving you fine-grained control over exactly what each element is allowed to contain and how violations are handled.

### Tag Allowlisting

Only the tags you explicitly define are permitted. Everything else is handled according to your error strategy: silently discarded, unwrapped (children kept, tag removed), or thrown as an error.

```typescript
const options: SchemaOptions = {
  errorHandling: { tag: "discardElement" },
  tags: {
    div: { ... },
    p: { ... },
    a: { ... },
  },
};
```

### Attribute Allowlisting

Each tag defines exactly which attributes it accepts. A `"*"` wildcard rule can serve as a catch-all fallback for any attribute not explicitly named. Attributes with no matching rule throw an error by default; set `errorHandling.attribute: "discardAttribute"` to discard them instead.

```typescript
tags: {
  div: {
    attributes: {
      class: { mode: "simple", value: "*" },
      id: { mode: "simple", value: /^[a-zA-Z][a-zA-Z0-9-_]*$/ },
      "*": { mode: "simple", value: "*", maxLength: 100 }, // catch-all
    },
  },
}
```

### Attribute Value Validation

Three validation modes cover every attribute shape:

- **`simple`**: validates a single value against a string, regex, array of allowed values, boolean flag, or custom function
- **`set`**: validates delimiter-separated multi-values (e.g. `class="btn btn-primary"`)
- **`record`**: validates key-value pair collections (e.g. `data-config="id:1;theme:dark"`)

```typescript
// Simple: one of a fixed list
{ mode: "simple", value: ["left", "center", "right"] }

// Simple: regex
{ mode: "simple", value: /^https?:\/\// }

// Simple: custom function
{ mode: "simple", value: (v) => !Number.isNaN(Date.parse(v)) }

// Set: space-separated CSS classes from an allowlist
{ mode: "set", delimiter: " ", values: ["btn", "btn-primary", "btn-large"] }

// Record: structured key-value pairs
{ mode: "record", entrySeparator: ";", keyValueSeparator: ":", values: { id: /^\d+$/, theme: ["light", "dark"] } }
```

### Default Values & Required Attributes

Attributes can be marked as required. When missing or invalid, a `defaultValue` can be applied instead of discarding the element outright.

```typescript
{
  mode: "simple",
  value: /^https?:\/\//,
  required: true,
  defaultValue: "https://example.com",
}
```

### Value Length Limits

Cap attribute values to a maximum character length. Oversized values can be trimmed or treated as errors.

```typescript
{ mode: "simple", value: "*", maxLength: 200 }
```

### Collection Size Limits

For `set` and `record` attributes, limit how many entries are allowed. Excess entries can be dropped or treated as errors.

```typescript
{ mode: "set", delimiter: " ", values: /^\S+$/, maxEntries: 5 }
```

### Tag Nesting Limits

Prevent elements from nesting beyond a configured depth. Useful for preventing deeply nested structures that could impact rendering or processing performance.

```typescript
tags: {
  div: {
    limits: { nesting: 4 },
  },
}
```

### Children Limits

Limit how many direct children an element may have. Excess children can be trimmed from the front, trimmed from the back, or cause the element to be discarded.

```typescript
tags: {
  ul: {
    limits: { children: 20 },
  },
}
```

### Top-Level Document Limits

Apply children and nesting limits to the root of the fragment itself, independent of any specific tag rule.

```typescript
const options: SchemaOptions = {
  topLevelLimits: { children: 50, nesting: 10 },
};
```

### Flexible Error Handling

Every class of violation has its own configurable error handling mode. Mix and match strategies per error type.

| Error type                  | Available modes                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Disallowed tag              | `discardElement`, `unwrapElement`, `throwError`                                                                 |
| Disallowed attribute        | `discardAttribute`, `discardElement`, `throwError`                                                              |
| Invalid attribute value     | `applyDefaultValue`, `discardAttribute`, `discardElement`, `throwError`                                         |
| Value too long              | `trimExcess`, `applyDefaultValue`, `discardAttribute`, `discardElement`, `throwError`                           |
| Too many collection entries | `dropExtra`, `applyDefaultValue`, `discardAttribute`, `discardElement`, `throwError`                            |
| Duplicate record keys       | `keepFirst`, `keepLast`, `dropDuplicates`, `keepDuplicates`, `discardAttribute`, `discardElement`, `throwError` |
| Too many children           | `discardFirsts`, `discardLasts`, `discardElement`, `throwError`                                                 |
| Nesting too deep            | `discardElement`, `throwError`                                                                                  |

### Comment Stripping

HTML comments are stripped by default. Pass `preserveComments: true` to retain them.

### Built-in Default Rules

domsanitize ships with ready-made rules for all standard HTML global attributes, shared attributes, and common value types (integers, floats, URLs, MIME types, BCP 47 language tags, dates, and more) so you don't have to write them from scratch.

```typescript
import { enforceHtml } from "domsanitize";
import { defaultGlobalAttributes } from "domsanitize/defaults/attributes/globals";
import { defaultOtherAttributes } from "domsanitize/defaults/attributes/others";
import { defaultSharedAttributes } from "domsanitize/defaults/attributes/shared";

const html = '<a class="link" href="https://example.com" rel="noopener">Link</a>';
const result = enforceHtml(html, {
  tags: {
    a: {
      attributes: {
        ...defaultGlobalAttributes,
        href: defaultOtherAttributes.url,
        target: defaultOtherAttributes.target,
        rel: defaultSharedAttributes.rel,
      },
    },
  },
});
```

### URL Allowlisting

The built-in URL rule builder lets you restrict URLs to specific protocols and/or hosts, with optional support for relative paths.

```typescript
import { buildAllowedUrlRegex } from "domsanitize/utils/url";

// Only allow https links to your own domain, plus relative paths
const value = buildAllowedUrlRegex(["https"], ["example.com"], true);
```

## Installation

```bash
npm install domsanitize
```

## Runtime environments

Node.js uses jsdom and requires Node 24.15+ (24.x) or Node 26+. The existing synchronous `enforceHtml(html, options)` API remains available from `domsanitize`. Bundlers that resolve the `browser` export condition use the browser's native DOM; `domsanitize/browser` selects that entrypoint explicitly.

To reuse an existing browser or jsdom window, import the factory from `domsanitize/core`. This entrypoint does not import jsdom:

```typescript
import { createEnforcer } from "domsanitize/core";

const enforceHtml = createEnforcer(window);
const result = enforceHtml("<p>Hello</p>", { tags: { p: {} } });
```

The factory parses fragments in a detached document without changing the supplied window's document. In Node.js, pass `new JSDOM("").window` as the window.

### Using DOMPurify with one jsdom window

For the Node.js pipeline `input -> domsanitize -> DOMPurify -> database`, initialize one jsdom window and both factories once at module scope, outside the request handler:

```typescript
import createDOMPurify from "dompurify";
import { createEnforcer, type SchemaOptions } from "domsanitize/core";
import { JSDOM } from "jsdom";

const { window } = new JSDOM("");
const enforceHtml = createEnforcer(window);
const DOMPurify = createDOMPurify(window);
const schema: SchemaOptions = {
  errorHandling: { attribute: "discardAttribute", tag: "unwrapElement" },
  tags: { a: { attributes: { href: { mode: "simple", value: "*" } } } },
};

// Call per request and store the returned string in the database.
export function prepareHtml(input: string): string {
  const conformed = enforceHtml(input, schema);
  return DOMPurify.sanitize(conformed);
}
```

This explicitly shares one jsdom window across both libraries and subsequent requests in that Node process. Merely running in the same process does not share the window: the default `enforceHtml` import from `domsanitize` creates its own private environment. Use `domsanitize/core` and pass the existing window to avoid creating a second jsdom instance.

The libraries still parse strings separately; sharing a window does not share a parsed tree or eliminate parsing and serialization. DOMPurify is an optional integration, not a runtime dependency of domsanitize.

Run purification after the last schema mutation. A schema can introduce an unsafe default even when its input was already purified; DOMPurify [warns that later modifications can undo sanitization](https://github.com/cure53/DOMPurify#is-there-any-foot-gun-potential). Final purification can remove required attributes or elements, so the final result is not guaranteed to satisfy every schema constraint. Do not reapply unsafe defaults after purification.

### Parser compatibility

Both entrypoints enforce the DOM produced by their runtime. Sharing a window with DOMPurify aligns the DOM implementation; it does not make the libraries' parsing contexts or policies identical. domsanitize uses a detached template to retain fragments such as standalone table cells.

The compatibility suite records two differences between jsdom 31.0.1 and the tested native browsers:

- For `<select><div>text</div><option>A</option></select>`, jsdom drops the `div` wrapper. Native browsers retain it, so it needs a schema rule or an unwrap/discard strategy.
- For `<noscript><p>fallback</p></noscript>`, jsdom and Firefox treat the inner markup as text. Chromium and WebKit expose the `p` as an element, so it needs its own rule. Where native serialization escapes literal `noscript` text, domsanitize detects the mismatch and preserves that text, including inside nested templates, to keep repeated parsing stable.

All other captured compatibility fixtures share the same expected result. These cases are tested explicitly; byte-for-byte output parity across arbitrary inputs and browser versions is not guaranteed.

## Quick Start

In this example, a `<div>` with an unknown `onclick` attribute and a `<p>` with disallowed class values are both cleaned up according to the schema.

```typescript
import { enforceHtml } from "domsanitize";

const html = `
  <div class="container wrapper" onclick="evil()">
    <p class="text-center text-danger">Hello</p>
    <a href="https://example.com" target="_blank" rel="noopener">Link</a>
  </div>
`;

const result = enforceHtml(html, {
  errorHandling: {
    tag: "discardElement",
    attribute: "discardAttribute",
    attributeSetValue: "dropValue",
  },
  tags: {
    div: {
      attributes: {
        // only "container" and "row" are allowed class values
        class: { mode: "set", delimiter: " ", values: ["container", "row"] },
      },
    },
    p: {
      attributes: {
        // only "text-center" and "text-muted" are allowed class values
        class: {
          mode: "set",
          delimiter: " ",
          values: ["text-center", "text-muted"],
        },
      },
    },
    a: {
      attributes: {
        href: { mode: "simple", value: /^https?:\/\// },
        target: { mode: "simple", value: ["_blank", "_self"] },
        rel: {
          mode: "set",
          delimiter: " ",
          values: ["noopener", "noreferrer", "nofollow"],
        },
      },
    },
  },
});

console.log(result);
// <div class="container">       onclick was discarded (no rule for it)
//   <p class="text-center">    "text-danger" was dropped (not in allowlist)
//   <a href="https://example.com" target="_blank" rel="noopener">Link</a>
// </div>
```

## Node.js performance

A standalone domsanitize benchmark on Node 24.22.3 (Linux x64, AMD Ryzen 7 5700G) compared the last parse5 implementation (`a9c59b7`) with the DOM implementation (`fce6324`). Both used equivalent minified CommonJS builds and returned identical results for every workload.

These measurements do not include DOMPurify or use a shared window. The current implementation pays for importing jsdom and creating its window, whereas the previous standalone implementation does not need jsdom. In the combined pipeline above, DOMPurify already needs jsdom. The differences below therefore do not measure the incremental startup or memory cost of switching that pipeline, and the warm-call ratios are not end-to-end pipeline ratios. That shared-window comparison has not been measured.

| Measurement | Previous parse5 implementation | Current jsdom implementation |
| --- | ---: | ---: |
| Fresh-process import + first call | 26.2 ms | 442.5 ms |
| Warm call, 190-byte fragment | 0.087 ms | 0.271 ms |
| Warm call, 9,500-byte fragment | 3.55 ms | 10.53 ms |
| Warm call, 190,000-byte fragment | 64.5 ms | 152.7 ms |
| Heap retained after 5,000 small calls and GC | 6.43 MiB | 31.80 MiB |
| Process peak RSS for the large workload | 239.6 MiB | 344.1 MiB |

Startup is the median of seven fresh processes per implementation, excluding Node process launch and worker setup. Warm results are the median of three process medians, each containing seven timed batches after warmup. Memory is the median across three processes. The filesystem cache was not flushed. The large input repeats the same structured fragment 1,000 times, so this is a synthetic comparison, not a production latency guarantee or a native-browser performance result.

For standalone Node use, the migration adds substantial startup cost and makes these warm workloads roughly 2.4-3.1 times slower. Retained heap stayed near 32 MiB from 1,000 through 5,000 calls; this test did not show sustained heap growth. Process RSS can remain high after GC and is distinct from live heap.

The default Node enforcer reuses its DOM environment after the first nonempty call. Applications already owning a jsdom window can pass it to `createEnforcer` from `domsanitize/core` to avoid creating another window; the shared-window startup cost was not measured here.

Raw samples, artifact hashes, dependency versions, and build settings are in [the benchmark results](benchmarks/results/node-24.22.3.json). To compare two prepared CommonJS entrypoints using the same isolated-process harness:

```bash
npx tsx benchmarks/compare.mts /path/to/legacy/index.cjs /path/to/current/index.cjs /tmp/domsanitize-performance.json
```

Bundle each revision's `src/index.ts` with the recorded build settings, keeping its runtime dependencies external and resolvable beside the bundle. The harness compiles its worker before measurements, alternates implementation order, and verifies output equality. Run it without competing test/build jobs.

## Running tests

`npm test` runs the Node.js suite, including jsdom and DOMPurify interoperability. Native browser tests are separate:

```bash
npx playwright install --with-deps chromium firefox webkit
npm run test:browser
```

The browser suite runs compatibility fixtures, DOMPurify composition, and detached-document checks in Chromium, Firefox, and WebKit. DOMPurify and the browser test tools are development dependencies only.
