import { createNodeDomEnvironment } from "../../src/lib/dom/node";

const environment = createNodeDomEnvironment();
export const testDocument = environment.parse("").root.ownerDocument;

export function createElement(name: string, attributes: { name: string; value: string; }[] = []): Element {
  const element = testDocument.createElement(name);
  for (const attribute of attributes) {
    element.setAttribute(attribute.name, attribute.value);
  }
  return element;
}

export function parseFragment(html: string): DocumentFragment {
  return environment.parse(html).root;
}
