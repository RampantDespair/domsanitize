import { beforeEach, describe, expect, it } from "vitest";

import {
  handleTagAttributeError,
  handleTagAttributeRecordValueError,
  handleTagAttributeSetValueError,
  handleTagAttributeValueError,
  handleTagAttributeValueTooLongError,
  handleTagChildrenError,
  handleTagError,
  handleTagNestingError,
} from "../src/lib/handlers/direct";
import {
  handleTagAttributeCollectionValueTooManyError,
  handleTagAttributeRecordValueDuplicateError,
} from "../src/lib/handlers/indirect";
import { createElement, testDocument } from "./support/dom";

describe("handlers/direct", () => {
  describe("handleTagAttributeError", () => {
    let base: Element;
    let el: Element;

    beforeEach(() => {
      base = createElement("root", []);
      el = createElement("test", []);
      base.appendChild(el);
    });

    it("discards attribute", () => {
      el.setAttribute("test", "value");

      const result = handleTagAttributeError(
        { key: "test", value: "value" },
        el,
        "discardAttribute",
      );

      expect(result).toBe(true);
      expect(el.getAttribute("test")).toBeNull();
    });

    it("throws error by default", () => {
      expect(() => {
        handleTagAttributeError({ key: "test", value: "value" }, el);
      }).toThrow();
    });

    it("throws error with throwError mode", () => {
      expect(() => {
        handleTagAttributeError(
          { key: "test", value: "value" },
          el,
          "throwError",
        );
      }).toThrow();
    });

    it("discards element", () => {
      const result = handleTagAttributeError(
        { key: "test", value: "value" },
        el,
        "discardElement",
      );

      expect(result).toBe(false);
      expect(base.childNodes).toHaveLength(0);
    });

    it("unwraps element", () => {
      const child = createElement("child", []);
      el.appendChild(child);

      const result = handleTagAttributeError(
        { key: "test", value: "value" },
        el,
        "unwrapElement",
      );

      expect(result).toBe(false);
      expect(base.childNodes).toHaveLength(1);
      expect(base.childNodes[0]).toBe(child);
    });
  });

  describe("handleTagAttributeRecordValueError", () => {
    let base: Element;
    let el: Element;

    beforeEach(() => {
      base = createElement("root", []);
      el = createElement("test", []);
      base.appendChild(el);
    });

    it("drops pair", () => {
      const record = [{ key: "test", val: "value" }];
      const rule = {
        entrySeparator: ",",
        keyValueSeparator: "=",
        mode: "record" as const,
        values: {},
      };

      const result = handleTagAttributeRecordValueError(
        { key: "test", value: "value" },
        el,
        record,
        0,
        rule,
        "dropPair",
      );

      expect(result).toBe(true);
    });

    it("handles default error handling", () => {
      const record = [{ key: "test", val: "value" }];
      const rule = {
        entrySeparator: ",",
        keyValueSeparator: "=",
        mode: "record" as const,
        values: {},
      };

      expect(() => {
        handleTagAttributeRecordValueError(
          { key: "test", value: "value" },
          el,
          record,
          0,
          rule,
        );
      }).toThrow();
    });
  });

  describe("handleTagAttributeSetValueError", () => {
    let base: Element;
    let el: Element;

    beforeEach(() => {
      base = createElement("root", []);
      el = createElement("test", []);
      base.appendChild(el);
    });

    it("drops value", () => {
      const set = ["valid", "invalid"];
      const rule = {
        delimiter: ",",
        mode: "set" as const,
        values: ["valid"],
      };

      const result = handleTagAttributeSetValueError(
        { key: "test", value: "valid,invalid" },
        el,
        1,
        set,
        rule,
        "dropValue",
      );

      expect(result).toBe(true);
    });

    it("handles default error handling", () => {
      const set = ["valid", "invalid"];
      const rule = {
        delimiter: ",",
        mode: "set" as const,
        values: ["valid"],
      };

      expect(() => {
        handleTagAttributeSetValueError(
          { key: "test", value: "valid,invalid" },
          el,
          1,
          set,
          rule,
        );
      }).toThrow();
    });
  });

  describe("handleTagAttributeValueError", () => {
    let base: Element;
    let el: Element;

    beforeEach(() => {
      base = createElement("root", []);
      el = createElement("test", []);
      base.appendChild(el);
    });

    it("applies default value", () => {
      const rule = {
        defaultValue: "default",
        mode: "simple" as const,
        value: "*",
      };

      const result = handleTagAttributeValueError(
        { key: "test", value: "invalid" },
        el,
        rule,
        "applyDefaultValue",
      );

      expect(result).toBe(true);
      expect(el.getAttribute("test")).toBe("default");
    });

    it("deletes attribute when no default value", () => {
      const rule = {
        mode: "simple" as const,
        value: "*",
      };

      el.setAttribute("test", "invalid");

      const result = handleTagAttributeValueError(
        { key: "test", value: "invalid" },
        el,
        rule,
        "applyDefaultValue",
      );

      expect(result).toBe(true);
      expect(el.getAttribute("test")).toBeNull();
    });

    it("handles default error handling", () => {
      const rule = {
        mode: "simple" as const,
        value: "*",
      };

      expect(() => {
        handleTagAttributeValueError(
          { key: "test", value: "invalid" },
          el,
          rule,
        );
      }).toThrow();
    });
  });

  describe("handleTagAttributeValueTooLongError", () => {
    let base: Element;
    let el: Element;

    beforeEach(() => {
      base = createElement("root", []);
      el = createElement("test", []);
      base.appendChild(el);
    });

    it("trims excess", () => {
      const rule = {
        maxLength: 10,
        mode: "simple" as const,
        value: "*",
      };

      const result = handleTagAttributeValueTooLongError(
        { key: "test", value: "very long value" },
        el,
        rule,
        "trimExcess",
      );

      expect(result).toBe(true);
      expect(el.getAttribute("test")).toBe("very long ");
    });

    it("handles default error handling", () => {
      const rule = {
        maxLength: 10,
        mode: "simple" as const,
        value: "*",
      };

      expect(() => {
        handleTagAttributeValueTooLongError(
          { key: "test", value: "very long value" },
          el,
          rule,
        );
      }).toThrow();
    });
  });

  describe("handleTagChildrenError", () => {
    let base: Element;
    let el: Element;

    beforeEach(() => {
      base = createElement("root", []);
      el = createElement("test", []);
      base.appendChild(el);
    });

    it("discards element", () => {
      const child1 = createElement("child1", []);
      const child2 = createElement("child2", []);
      const child3 = createElement("child3", []);

      el.appendChild(child1);
      el.appendChild(child2);
      el.appendChild(child3);

      const result = handleTagChildrenError(el, 2, "discardElement");

      expect(result).toBe(false);
      expect(base.childNodes).toHaveLength(0);
    });

    it("discards firsts", () => {
      const child1 = createElement("child1", []);
      const child2 = createElement("child2", []);
      const child3 = createElement("child3", []);

      el.appendChild(child1);
      el.appendChild(child2);
      el.appendChild(child3);

      const result = handleTagChildrenError(el, 2, "discardFirsts");

      expect(result).toBe(true);
      expect(el.childNodes).toHaveLength(2);
      expect(el.childNodes[0]).toBe(child2);
      expect(el.childNodes[1]).toBe(child3);
    });

    it("discards lasts", () => {
      const child1 = createElement("child1", []);
      const child2 = createElement("child2", []);
      const child3 = createElement("child3", []);

      el.appendChild(child1);
      el.appendChild(child2);
      el.appendChild(child3);

      const result = handleTagChildrenError(el, 2, "discardLasts");

      expect(result).toBe(true);
      expect(el.childNodes).toHaveLength(2);
      expect(el.childNodes[0]).toBe(child1);
      expect(el.childNodes[1]).toBe(child2);
    });

    it("throws error by default", () => {
      const child1 = createElement("child1", []);
      const child2 = createElement("child2", []);
      const child3 = createElement("child3", []);

      el.appendChild(child1);
      el.appendChild(child2);
      el.appendChild(child3);

      expect(() => {
        handleTagChildrenError(el, 2);
      }).toThrow();
    });

    it("throws error with throwError mode", () => {
      const child1 = createElement("child1", []);
      const child2 = createElement("child2", []);
      const child3 = createElement("child3", []);

      el.appendChild(child1);
      el.appendChild(child2);
      el.appendChild(child3);

      expect(() => {
        handleTagChildrenError(el, 2, "throwError");
      }).toThrow();
    });

    it("handles document fragment", () => {
      const doc = testDocument.createDocumentFragment();
      const child1 = createElement("child1", []);
      const child2 = createElement("child2", []);
      const child3 = createElement("child3", []);

      doc.appendChild(child1);
      doc.appendChild(child2);
      doc.appendChild(child3);

      expect(() => {
        handleTagChildrenError(doc, 2, "throwError");
      }).toThrow();
    });
  });

  describe("handleTagError", () => {
    let base: Element;
    let el: Element;

    beforeEach(() => {
      base = createElement("root", []);
      el = createElement("test", []);
      base.appendChild(el);
    });

    it("discards element", () => {
      const result = handleTagError(el, "discardElement");

      expect(result).toBe(false);
      expect(base.childNodes).toHaveLength(0);
    });

    it("unwraps element", () => {
      const child = createElement("child", []);
      el.appendChild(child);

      const result = handleTagError(el, "unwrapElement");

      expect(result).toBe(false);
      expect(base.childNodes).toHaveLength(1);
      expect(base.childNodes[0]).toBe(child);
    });

    it("throws error by default", () => {
      expect(() => {
        handleTagError(el);
      }).toThrow();
    });

    it("throws error with throwError mode", () => {
      expect(() => {
        handleTagError(el, "throwError");
      }).toThrow();
    });
  });

  describe("handleTagNestingError", () => {
    let base: Element;
    let el: Element;

    beforeEach(() => {
      base = createElement("root", []);
      el = createElement("test", []);
      base.appendChild(el);
    });

    it("discards element", () => {
      const result = handleTagNestingError(el, 5, "discardElement");

      expect(result).toBe(false);
      expect(base.childNodes).toHaveLength(0);
    });

    it("throws error by default", () => {
      expect(() => {
        handleTagNestingError(el, 5);
      }).toThrow();
    });

    it("throws error with throwError mode", () => {
      expect(() => {
        handleTagNestingError(el, 5, "throwError");
      }).toThrow();
    });

    it("handles document fragment", () => {
      const doc = testDocument.createDocumentFragment();

      expect(() => {
        handleTagNestingError(doc, 5, "throwError");
      }).toThrow();
    });
  });
});

describe("handlers/indirect", () => {
  describe("handleTagAttributeCollectionValueTooManyError", () => {
    let base: Element;
    let el: Element;

    beforeEach(() => {
      base = createElement("root", []);
      el = createElement("test", []);
      base.appendChild(el);
    });

    it("drops extra values", () => {
      const collection = ["a", "b", "c", "d"];
      const rule = {
        delimiter: ",",
        maxEntries: 2,
        mode: "set" as const,
        values: "*",
      };

      const result = handleTagAttributeCollectionValueTooManyError(
        { key: "test", value: "a,b,c,d" },
        el,
        collection,
        rule,
        "dropExtra",
      );

      expect(result.proceed).toBe(true);
      expect(result.output).toEqual(["a", "b"]);
    });

    it("handles default error handling", () => {
      const collection = ["a", "b", "c", "d"];
      const rule = {
        delimiter: ",",
        maxEntries: 2,
        mode: "set" as const,
        values: "*",
      };

      expect(() => {
        handleTagAttributeCollectionValueTooManyError(
          { key: "test", value: "a,b,c,d" },
          el,
          collection,
          rule,
        );
      }).toThrow();
    });
  });

  describe("handleTagAttributeRecordValueDuplicateError", () => {
    let base: Element;
    let el: Element;

    beforeEach(() => {
      base = createElement("root", []);
      el = createElement("test", []);
      base.appendChild(el);
    });

    it("drops duplicates", () => {
      const record = [
        { key: "test", val: "value1" },
        { key: "other", val: "value2" },
      ];
      const rule = {
        entrySeparator: ",",
        keyValueSeparator: "=",
        mode: "record" as const,
        values: {},
      };

      const result = handleTagAttributeRecordValueDuplicateError(
        { key: "test", value: "test=value1,other=value2" },
        el,
        "test",
        record,
        rule,
        "dropDuplicates",
      );

      expect(result.globalProceed).toBe(true);
      expect(result.localProceed).toBe(false);
      expect(result.output).toEqual([{ key: "other", val: "value2" }]);
    });

    it("keeps duplicates", () => {
      const record = [
        { key: "test", val: "value1" },
        { key: "other", val: "value2" },
      ];
      const rule = {
        entrySeparator: ",",
        keyValueSeparator: "=",
        mode: "record" as const,
        values: {},
      };

      const result = handleTagAttributeRecordValueDuplicateError(
        { key: "test", value: "test=value1,other=value2" },
        el,
        "test",
        record,
        rule,
        "keepDuplicates",
      );

      expect(result.globalProceed).toBe(true);
      expect(result.localProceed).toBe(true);
      expect(result.output).toEqual(record);
    });

    it("keeps first", () => {
      const record = [
        { key: "test", val: "value1" },
        { key: "other", val: "value2" },
      ];
      const rule = {
        entrySeparator: ",",
        keyValueSeparator: "=",
        mode: "record" as const,
        values: {},
      };

      const result = handleTagAttributeRecordValueDuplicateError(
        { key: "test", value: "test=value1,other=value2" },
        el,
        "test",
        record,
        rule,
        "keepFirst",
      );

      expect(result.globalProceed).toBe(true);
      expect(result.localProceed).toBe(false);
      expect(result.output).toEqual(record);
    });

    it("keeps last", () => {
      const record = [
        { key: "test", val: "value1" },
        { key: "other", val: "value2" },
      ];
      const rule = {
        entrySeparator: ",",
        keyValueSeparator: "=",
        mode: "record" as const,
        values: {},
      };

      const result = handleTagAttributeRecordValueDuplicateError(
        { key: "test", value: "test=value1,other=value2" },
        el,
        "test",
        record,
        rule,
        "keepLast",
      );

      expect(result.globalProceed).toBe(true);
      expect(result.localProceed).toBe(true);
      expect(result.output).toEqual([{ key: "other", val: "value2" }]);
    });

    it("handles default error handling", () => {
      const record = [
        { key: "test", val: "value1" },
        { key: "other", val: "value2" },
      ];
      const rule = {
        entrySeparator: ",",
        keyValueSeparator: "=",
        mode: "record" as const,
        values: {},
      };

      expect(() => {
        handleTagAttributeRecordValueDuplicateError(
          { key: "test", value: "test=value1,other=value2" },
          el,
          "test",
          record,
          rule,
        );
      }).toThrow();
    });
  });
});
