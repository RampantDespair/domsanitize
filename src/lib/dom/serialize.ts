import { getChildContainer } from "../helpers";
import { htmlNamespace, isElementNode } from "./nodes";

/** Return corrected children only when this subtree contains literal noscript text. */
function serializeChildren(element: Element): string | undefined {
  const literalText = element.namespaceURI === htmlNamespace && element.localName === "noscript";
  const children = getChildContainer(element).childNodes;
  const replacements = new Map<Node, string>();

  for (const child of children) {
    if (literalText && child.nodeType === 3) {
      replacements.set(child, child.nodeValue ?? "");
    } else if (isElementNode(child)) {
      const inner = serializeChildren(child);
      if (inner !== undefined) {
        // Only ancestors of corrected text reach this branch. A native shallow
        // clone supplies tag syntax and attributes without interpreting values.
        const shell = child.cloneNode(false) as Element;
        const outer = shell.outerHTML;
        const closingTag = outer.lastIndexOf("</");
        replacements.set(child, closingTag === -1
          ? outer
          : outer.slice(0, closingTag) + inner + outer.slice(closingTag));
      }
    }
  }

  if (replacements.size === 0) {
    return undefined;
  }

  return Array.from(children, (child) => {
    const replacement = replacements.get(child);
    if (replacement !== undefined) {
      return replacement;
    }
    if (isElementNode(child)) {
      return child.outerHTML;
    }

    // Keep text/comments in their native parent context (e.g. style/script).
    const shell = element.cloneNode(false) as Element;
    getChildContainer(shell).appendChild(child.cloneNode(true));
    return shell.innerHTML;
  }).join("");
}

/**
 * Match raw-text noscript parsing when the native serializer escapes that text.
 * Unaffected subtrees retain native serialization. Original nodes stay in their
 * inert document, including nested template contents.
 */
export function serializeWithLiteralNoscript(element: Element): string {
  return serializeChildren(element) ?? element.innerHTML;
}
