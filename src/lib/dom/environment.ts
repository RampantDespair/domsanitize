import { serializeWithLiteralNoscript } from "./serialize";

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
  const probe = document.createElement("template");
  probe.innerHTML = "<noscript>&</noscript>";
  // Firefox parses noscript as raw text here but escapes it on serialization.
  // Detect the mismatch rather than tying the fallback to a browser/version.
  const escapesLiteralNoscript = probe.content.firstChild?.firstChild?.nodeType === 3 &&
    probe.innerHTML === "<noscript>&amp;</noscript>";

  return {
    parse(html) {
      const template = document.createElement("template");
      template.innerHTML = html;

      return {
        root: template.content,
        serialize() {
          return escapesLiteralNoscript ? serializeWithLiteralNoscript(template) : template.innerHTML;
        },
      };
    },
  };
}
