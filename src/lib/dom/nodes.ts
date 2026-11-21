export const htmlNamespace = "http://www.w3.org/1999/xhtml";

export function isElementNode(node: Node): node is Element {
  return node.nodeType === 1;
}

export function removeNode(node: Node): void {
  node.parentNode?.removeChild(node);
}

/** Preserve an existing Attr's identity, including its namespace and exact name. */
export function setAttributeValue(element: Element, name: string, value: string): void {
  const attribute = element.getAttributeNode(name);
  if (attribute) {
    attribute.value = value;
    return;
  }

  if (name === "xmlns" || name.startsWith("xmlns:")) {
    element.setAttributeNS("http://www.w3.org/2000/xmlns/", name, value);
  } else if (name.startsWith("xml:")) {
    element.setAttributeNS("http://www.w3.org/XML/1998/namespace", name, value);
  } else if (name.startsWith("xlink:")) {
    element.setAttributeNS("http://www.w3.org/1999/xlink", name, value);
  } else {
    element.setAttribute(name, value);
  }
}
