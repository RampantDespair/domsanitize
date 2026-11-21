/** The DOM surface required from a browser or jsdom window. */
export interface DomWindow {
  readonly document: Document;
}

/** A fragment that can be edited and serialized without moving its nodes. */
export interface DomFragment {
  readonly root: DocumentFragment;
  serialize(): string;
}

export interface DomEnvironment {
  parse(html: string): DomFragment;
}

/**
 * Creates isolated HTML fragments using the supplied window's DOM implementation.
 * A template preserves fragment contexts such as standalone table cells. Its
 * detached document keeps parsing and mutations separate from the caller's page.
 */
export function createDomEnvironment(window: DomWindow): DomEnvironment {
  const document = window.document.implementation.createHTMLDocument("");

  return {
    parse(html) {
      const template = document.createElement("template");
      template.innerHTML = html;

      return {
        root: template.content,
        serialize() {
          return template.innerHTML;
        },
      };
    },
  };
}
