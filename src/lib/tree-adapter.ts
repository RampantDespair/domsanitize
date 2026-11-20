import type { Token, TreeAdapter } from "parse5";
import type { Htmlparser2TreeAdapterMap } from "parse5-htmlparser2-tree-adapter";

import { adapter } from "parse5-htmlparser2-tree-adapter";

// The upstream adapter keys attributes by local name, which merges href and
// xlink:href. Store qualified names so schema lookup and recovery stay distinct.
function qualifyAttributes(attributes: Token.Attribute[]): Token.Attribute[] {
  return attributes.map((attribute) => {
    return attribute.namespace && attribute.prefix
      ? { ...attribute, name: `${attribute.prefix}:${attribute.name}` }
      : attribute;
  });
}

export const treeAdapter: TreeAdapter<Htmlparser2TreeAdapterMap> = {
  ...adapter,
  adoptAttributes(element, attributes) {
    adapter.adoptAttributes(element, qualifyAttributes(attributes));
  },
  createElement(tagName, namespaceURI, attributes) {
    return adapter.createElement(tagName, namespaceURI, qualifyAttributes(attributes));
  },
  getAttrList(element) {
    // parse5 expects local names plus namespace metadata when serializing.
    return adapter.getAttrList(element).map((attribute) => {
      return attribute.namespace && attribute.prefix
        ? { ...attribute, name: attribute.name.slice(attribute.prefix.length + 1) }
        : attribute;
    });
  },
};
