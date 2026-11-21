import { describe, expect, it } from "vitest";

import { createDomEnvironment } from "../../src/lib/dom/environment";

const environment = createDomEnvironment(window);

// Include nested templates, raw-text siblings, foreign elements, and attribute
// escaping: fixing one raw-text context must not change the others.
const fragments = [
  "<noscript><p title=\"literal\">a &amp; b</p></noscript>",
  "<template><template><noscript><b>inner &amp;</b></noscript></template></template>",
  "<div title=\"&quot;&amp;\"><noscript><p>fallback</p></noscript><!--after--><br></div>",
  "<noscript><p>x</p></noscript><style>p::before { content: \"<>&\"; }</style><script>const x = \"<>&\";</script>",
  "<svg><noscript>&lt;b&gt; &amp;</noscript></svg><noscript><p>x</p></noscript>",
];

describe("noscript serialization", () => {
  it.each(fragments)("round trips without accumulating escaping: %s", (input) => {
    const fragment = environment.parse(input);
    const first = fragment.root.firstChild;
    const owner = first?.ownerDocument;
    expect(fragment.serialize()).toBe(input);
    expect(fragment.serialize()).toBe(input);
    expect(environment.parse(fragment.serialize()).serialize()).toBe(input);
    expect(fragment.root.firstChild).toBe(first);
    expect(first?.ownerDocument).toBe(owner);
    expect(first?.parentNode).toBe(fragment.root);
  });
});
