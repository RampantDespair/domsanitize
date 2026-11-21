import { beforeEach, describe, expect, it } from "vitest";

import {
  enforceAttributeRecordValue,
  enforceAttributeSetValue,
  enforceAttributeSimpleValue,
  enforceAttributeValue,
} from "../src/lib/enforcers/attribute-values";
import {
  enforceAttribute,
  enforceAttributes,
  enforceRequiredAttributes,
} from "../src/lib/enforcers/attributes";
import { enforceTag } from "../src/lib/enforcers/tags";
import { createElement } from "./support/dom";

describe("enforceRequiredAttributes", () => {
  let base: Element;
  let el: Element;

  beforeEach(() => {
    base = createElement("root", []);
    el = createElement("test", []);
    base.appendChild(el);
  });

  it("handles required attribute error handling failure", () => {
    const rules = {
      required: {
        mode: "simple" as const,
        required: true,
        value: "invalid",
      },
    };

    const result = enforceRequiredAttributes(el, rules, {
      attributeValue: "discardElement",
    });

    expect(result).toBe(false);
    expect(base.childNodes).toHaveLength(0);
  });

  it("skips wildcard attribute '*' in rules", () => {
    const rules = {
      "*": {
        mode: "simple" as const,
        required: true,
        value: "wildcard",
      },
      required: {
        mode: "simple" as const,
        required: true,
        value: "test",
      },
    };

    el.setAttribute("required", "test");

    const result = enforceRequiredAttributes(el, rules);

    expect(result).toBe(true);
    expect(el.getAttribute("required")).toBe("test");
  });

  it("returns true when rules is undefined", () => {
    const result = enforceRequiredAttributes(el, undefined);

    expect(result).toBe(true);
  });
});

describe("enforceAttributes", () => {
  let base: Element;
  let el: Element;

  beforeEach(() => {
    base = createElement("root", []);
    el = createElement("test", []);
    base.appendChild(el);
  });

  it("handles fast path when no attributes present", () => {
    const rules = {
      required: {
        mode: "simple" as const,
        required: true,
        value: "test",
      },
    };

    el.setAttribute("required", "test");

    const result = enforceAttributes(el, rules);

    expect(result).toBe(true);
    expect(el.getAttribute("required")).toBe("test");
  });

  it("handles fast path with no attributes and no rules", () => {
    const result = enforceAttributes(el, undefined);

    expect(result).toBe(true);
  });

  it("validates attributes against specific rules", () => {
    el.setAttribute("id", "test-id");
    el.setAttribute("class", "test-class");

    const rules = {
      class: {
        mode: "simple" as const,
        value: "test-class",
      },
      id: {
        mode: "simple" as const,
        value: "test-id",
      },
    };

    const result = enforceAttributes(el, rules);

    expect(result).toBe(true);
    expect(el.getAttribute("id")).toBe("test-id");
    expect(el.getAttribute("class")).toBe("test-class");
  });

  it("uses wildcard rule as fallback", () => {
    el.setAttribute("custom", "valid-value");

    const rules = {
      "*": {
        mode: "simple" as const,
        value: "valid-value",
      },
    };

    const result = enforceAttributes(el, rules);

    expect(result).toBe(true);
    expect(el.getAttribute("custom")).toBe("valid-value");
  });

  it("returns false when globalProceed is false", () => {
    el.setAttribute("invalid", "invalid-value");

    const rules = {
      invalid: {
        mode: "simple" as const,
        value: "valid-value",
      },
    };

    const result = enforceAttributes(el, rules, {
      attributeValue: "discardElement",
    });

    expect(result).toBe(false);
    expect(base.childNodes).toHaveLength(0);
  });

  it("continues when localProceed is false", () => {
    el.setAttribute("invalid", "invalid-value");
    el.setAttribute("valid", "valid-value");

    const rules = {
      invalid: {
        mode: "simple" as const,
        value: "valid-value",
      },
      valid: {
        mode: "simple" as const,
        value: "valid-value",
      },
    };

    const result = enforceAttributes(el, rules, {
      attributeValue: "discardAttribute",
    });

    expect(result).toBe(true);
    expect(el.getAttribute("invalid")).toBeNull();
    expect(el.getAttribute("valid")).toBe("valid-value");
  });

  it("returns false when attribute value enforcement fails", () => {
    el.setAttribute("record", "key1=value1,key2=invalid");

    const rules = {
      record: {
        entrySeparator: ",",
        keyValueSeparator: "=",
        mode: "record" as const,
        values: {
          key1: "value1",
          key2: "valid",
        },
      },
    };

    const result = enforceAttributes(el, rules, {
      attributeRecordValue: "discardElement",
    });

    expect(result).toBe(false);
    expect(base.childNodes).toHaveLength(0);
  });

  it("enforces required attributes after processing", () => {
    el.setAttribute("present", "value");
    el.setAttribute("required", "required-value");

    const rules = {
      present: {
        mode: "simple" as const,
        value: "value",
      },
      required: {
        mode: "simple" as const,
        required: true,
        value: "required-value",
      },
    };

    const result = enforceAttributes(el, rules);

    expect(result).toBe(true);
    expect(el.getAttribute("present")).toBe("value");
    expect(el.getAttribute("required")).toBe("required-value");
  });

  it("returns false when required attributes are missing", () => {
    el.setAttribute("present", "value");

    const rules = {
      present: {
        mode: "simple" as const,
        value: "value",
      },
      required: {
        mode: "simple" as const,
        required: true,
        value: "required-value",
      },
    };

    const result = enforceAttributes(el, rules, {
      attributeValue: "discardElement",
    });

    expect(result).toBe(false);
    expect(base.childNodes).toHaveLength(0);
  });

  it("handles complex attribute validation with multiple modes", () => {
    el.setAttribute("simple", "valid");
    el.setAttribute("record", "key1=value1,key2=value2");
    el.setAttribute("set", "a,b,c");

    const rules = {
      record: {
        entrySeparator: ",",
        keyValueSeparator: "=",
        mode: "record" as const,
        values: {
          key1: "value1",
          key2: "value2",
        },
      },
      set: {
        delimiter: ",",
        mode: "set" as const,
        values: ["a", "b", "c"],
      },
      simple: {
        mode: "simple" as const,
        value: "valid",
      },
    };

    const result = enforceAttributes(el, rules);

    expect(result).toBe(true);
    expect(el.getAttribute("simple")).toBe("valid");
    expect(el.getAttribute("record")).toBe("key1=value1,key2=value2");
    expect(el.getAttribute("set")).toBe("a,b,c");
  });

  it("returns false when attribute has no matching rule and globalProceed is false", () => {
    el.setAttribute("allowed", "value");
    el.setAttribute("forbidden", "value");

    const rules = {
      allowed: {
        mode: "simple" as const,
        value: "value",
      },
    };

    const result = enforceAttributes(el, rules, {
      attribute: "discardElement",
    });

    expect(result).toBe(false);
    expect(base.childNodes).toHaveLength(0);
  });

  it("continues when attribute has no matching rule and localProceed is false", () => {
    el.setAttribute("allowed", "value");
    el.setAttribute("forbidden", "value");

    const rules = {
      allowed: {
        mode: "simple" as const,
        value: "value",
      },
    };

    const result = enforceAttributes(el, rules, {
      attribute: "discardAttribute",
    });

    expect(result).toBe(true);
    expect(el.getAttribute("allowed")).toBe("value");
    expect(el.getAttribute("forbidden")).toBeNull();
  });
});

describe("enforceTag", () => {
  let base: Element;

  beforeEach(() => {
    base = createElement("root", []);
  });

  it("allows permitted element", () => {
    const el = createElement("this", []);
    base.appendChild(el);

    const ok = enforceTag(el, {});

    expect(ok).toBe(true);
  });

  it("throws when tag is denied (errorHandling: default)", () => {
    const el = createElement("this", []);
    base.appendChild(el);

    expect(() => {
      return enforceTag(el);
    }).toThrow();
  });

  it("throws when tag is denied (errorHandling: throwError)", () => {
    const el = createElement("this", []);
    base.appendChild(el);

    expect(() => {
      return enforceTag(el, undefined, "throwError");
    }).toThrow();
  });

  it("discards tag when tag is denied (errorHandling: discardElement)", () => {
    const el = createElement("this", []);
    base.appendChild(el);

    const ok = enforceTag(el, undefined, "discardElement");

    expect(ok).toBe(false);
    expect(base.childNodes).toHaveLength(0);
  });

  it("unwraps element when tag is denied (errorHandling: unwrapElement)", () => {
    const parent = createElement("parent", []);
    base.appendChild(parent);

    const child = createElement("child", []);
    parent.appendChild(child);

    const ok = enforceTag(parent, undefined, "unwrapElement");

    expect(ok).toBe(false);
    expect(base.childNodes).toHaveLength(1);
    expect(base.childNodes[0]).toBe(child);
  });
});

describe("enforceAttribute", () => {
  let base: Element;
  let templateAttribute: { name: string; value: string; };

  beforeEach(() => {
    base = createElement("root", []);
    templateAttribute = {
      name: "template",
      value: "x",
    };
  });

  it("allows permitted attribute", () => {
    const el = createElement("this", [templateAttribute]);
    base.appendChild(el);

    const { globalProceed, localProceed } = enforceAttribute(
      { key: templateAttribute.name, value: templateAttribute.value },
      el,
      { mode: "simple", value: "*" },
    );

    expect(globalProceed).toBe(true);
    expect(localProceed).toBe(true);
  });

  it("throws when attribute has no matching rule (errorHandling: default)", () => {
    const el = createElement("this", [templateAttribute]);
    base.appendChild(el);

    expect(() => {
      return enforceAttribute(
        { key: templateAttribute.name, value: templateAttribute.value },
        el,
      );
    },
    ).toThrow();
  });

  it("throws when attribute has no matching rule (errorHandling: throwError)", () => {
    const el = createElement("this", [templateAttribute]);
    base.appendChild(el);

    expect(() => {
      return enforceAttribute(
        { key: templateAttribute.name, value: templateAttribute.value },
        el,
        undefined,
        "throwError",
      );
    },
    ).toThrow();
  });

  it("discards attribute when attribute has no matching rule (errorHandling: discardAttribute)", () => {
    const el = createElement("this", [templateAttribute]);
    base.appendChild(el);

    const { globalProceed, localProceed } = enforceAttribute(
      { key: templateAttribute.name, value: templateAttribute.value },
      el,
      undefined,
      "discardAttribute",
    );

    expect(globalProceed).toBe(true);
    expect(localProceed).toBe(false);
    expect(el.getAttribute("that")).toBeNull();
  });

  it("discards element when attribute has no matching rule (errorHandling: discardElement)", () => {
    const el = createElement("this", [templateAttribute]);
    base.appendChild(el);

    const { globalProceed, localProceed } = enforceAttribute(
      { key: templateAttribute.name, value: templateAttribute.value },
      el,
      undefined,
      "discardElement",
    );

    expect(globalProceed).toBe(false);
    expect(localProceed).toBe(false);
    expect(base.childNodes).toHaveLength(0);
  });

  it("unwraps element when attribute has no matching rule (errorHandling: unwrapElement)", () => {
    const parent = createElement("parent", [
      templateAttribute,
    ]);
    base.appendChild(parent);

    const child = createElement("child", []);
    parent.appendChild(child);

    const { globalProceed, localProceed } = enforceAttribute(
      { key: templateAttribute.name, value: templateAttribute.value },
      parent,
      undefined,
      "unwrapElement",
    );

    expect(globalProceed).toBe(false);
    expect(localProceed).toBe(false);
    expect(base.childNodes).toHaveLength(1);
    expect(base.childNodes[0]).toBe(child);
  });
});

describe("enforceAttributeRecordValue", () => {
  let base: Element;
  let el: Element;

  beforeEach(() => {
    base = createElement("root", []);
    el = createElement("test", []);
    base.appendChild(el);
  });

  it("enforces record value successfully", () => {
    el.setAttribute("record", "key1=value1,key2=value2");

    const rule = {
      entrySeparator: ",",
      keyValueSeparator: "=",
      mode: "record" as const,
      values: {
        key1: "value1",
        key2: "value2",
      },
    };

    const result = enforceAttributeRecordValue(
      { key: "record", value: "key1=value1,key2=value2" },
      el,
      rule,
    );

    expect(result).toBe(true);
    expect(el.getAttribute("record")).toBe("key1=value1,key2=value2");
  });

  it("handles maxEntries exceeded with dropExtra", () => {
    el.setAttribute("record", "key1=value1,key2=value2,key3=value3");

    const rule = {
      entrySeparator: ",",
      keyValueSeparator: "=",
      maxEntries: 2,
      mode: "record" as const,
      values: {
        key1: "value1",
        key2: "value2",
        key3: "value3",
      },
    };

    const result = enforceAttributeRecordValue(
      { key: "record", value: "key1=value1,key2=value2,key3=value3" },
      el,
      rule,
      { attributeCollectionValueTooMany: "dropExtra" },
    );

    expect(result).toBe(true);
    expect(el.getAttribute("record")).toBe("key1=value1,key2=value2");
  });

  it("handles maxEntries exceeded with discardElement", () => {
    el.setAttribute("record", "key1=value1,key2=value2,key3=value3");

    const rule = {
      entrySeparator: ",",
      keyValueSeparator: "=",
      maxEntries: 2,
      mode: "record" as const,
      values: {
        key1: "value1",
        key2: "value2",
        key3: "value3",
      },
    };

    const result = enforceAttributeRecordValue(
      { key: "record", value: "key1=value1,key2=value2,key3=value3" },
      el,
      rule,
      { attributeCollectionValueTooMany: "discardElement" },
    );

    expect(result).toBe(false);
    expect(base.childNodes).toHaveLength(0);
  });

  it("handles duplicate keys with dropDuplicates", () => {
    el.setAttribute("record", "key1=value1,key1=value2");

    const rule = {
      entrySeparator: ",",
      keyValueSeparator: "=",
      mode: "record" as const,
      values: {
        key1: "value1",
      },
    };

    const result = enforceAttributeRecordValue(
      { key: "record", value: "key1=value1,key1=value2" },
      el,
      rule,
      { attributeRecordValueDuplicate: "dropDuplicates" },
    );

    expect(result).toBe(true);
    expect(el.getAttribute("record")).toBe("");
  });

  it("handles duplicate keys with discardElement error handling", () => {
    el.setAttribute("record", "key1=value1,key1=value2");

    const rule = {
      entrySeparator: ",",
      keyValueSeparator: "=",
      mode: "record" as const,
      values: {
        key1: "value1",
      },
    };

    const result = enforceAttributeRecordValue(
      { key: "record", value: "key1=value1,key1=value2" },
      el,
      rule,
      { attributeRecordValueDuplicate: "discardElement" },
    );

    expect(result).toBe(false);
    expect(base.childNodes).toHaveLength(0);
  });

  it("handles invalid pair rule with dropPair", () => {
    el.setAttribute("record", "key1=value1,key2=invalid");

    const rule = {
      entrySeparator: ",",
      keyValueSeparator: "=",
      mode: "record" as const,
      values: {
        key1: "value1",
        key2: "valid",
      },
    };

    const result = enforceAttributeRecordValue(
      { key: "record", value: "key1=value1,key2=invalid" },
      el,
      rule,
      { attributeRecordValue: "dropPair" },
    );

    expect(result).toBe(true);
    expect(el.getAttribute("record")).toBe("key1=value1");
  });

  it("handles invalid pair rule with discardElement error handling", () => {
    el.setAttribute("record", "key1=value1,key2=invalid");

    const rule = {
      entrySeparator: ",",
      keyValueSeparator: "=",
      mode: "record" as const,
      values: {
        key1: "value1",
        key2: "valid",
      },
    };

    const result = enforceAttributeRecordValue(
      { key: "record", value: "key1=value1,key2=invalid" },
      el,
      rule,
      { attributeRecordValue: "discardElement" },
    );

    expect(result).toBe(false);
    expect(base.childNodes).toHaveLength(0);
  });

  it("handles missing pair rule with default error handling", () => {
    el.setAttribute("record", "key1=value1,unknown=value2");

    const rule = {
      entrySeparator: ",",
      keyValueSeparator: "=",
      mode: "record" as const,
      values: {
        key1: "value1",
      },
    };

    expect(() => {
      return enforceAttributeRecordValue(
        { key: "record", value: "key1=value1,unknown=value2" },
        el,
        rule,
      );
    },
    ).toThrow();
  });
});

describe("enforceAttributeSetValue", () => {
  let base: Element;
  let el: Element;

  beforeEach(() => {
    base = createElement("root", []);
    el = createElement("test", []);
    base.appendChild(el);
  });

  it("enforces set value successfully", () => {
    el.setAttribute("set", "a,b,c");

    const rule = {
      delimiter: ",",
      mode: "set" as const,
      values: ["a", "b", "c"],
    };

    const result = enforceAttributeSetValue(
      { key: "set", value: "a,b,c" },
      el,
      rule,
    );

    expect(result).toBe(true);
    expect(el.getAttribute("set")).toBe("a,b,c");
  });

  it("handles maxEntries exceeded with dropExtra", () => {
    el.setAttribute("set", "a,b,c");

    const rule = {
      delimiter: ",",
      maxEntries: 2,
      mode: "set" as const,
      values: ["a", "b", "c"],
    };

    const result = enforceAttributeSetValue(
      { key: "set", value: "a,b,c" },
      el,
      rule,
      { attributeCollectionValueTooMany: "dropExtra" },
    );

    expect(result).toBe(true);
    expect(el.getAttribute("set")).toBe("a,b");
  });

  it("handles maxEntries exceeded with default error handling", () => {
    el.setAttribute("set", "a,b,c");

    const rule = {
      delimiter: ",",
      maxEntries: 2,
      mode: "set" as const,
      values: ["a", "b", "c"],
    };

    expect(() => {
      return enforceAttributeSetValue({ key: "set", value: "a,b,c" }, el, rule);
    },
    ).toThrow();
  });

  it("handles maxEntries exceeded with discardElement", () => {
    el.setAttribute("set", "a,b,c");

    const rule = {
      delimiter: ",",
      maxEntries: 2,
      mode: "set" as const,
      values: ["a", "b", "c"],
    };

    const result = enforceAttributeSetValue(
      { key: "set", value: "a,b,c" },
      el,
      rule,
      { attributeCollectionValueTooMany: "discardElement" },
    );

    expect(result).toBe(false);
    expect(base.childNodes).toHaveLength(0);
  });

  it("handles invalid values with default error handling", () => {
    el.setAttribute("set", "a,b,invalid");

    const rule = {
      delimiter: ",",
      mode: "set" as const,
      values: ["a", "b"],
    };

    expect(() => {
      return enforceAttributeSetValue({ key: "set", value: "a,b,invalid" }, el, rule);
    },
    ).toThrow();
  });

  it("handles invalid values with discardElement", () => {
    el.setAttribute("set", "a,b,invalid");

    const rule = {
      delimiter: ",",
      mode: "set" as const,
      values: ["a", "b"],
    };

    const result = enforceAttributeSetValue(
      { key: "set", value: "a,b,invalid" },
      el,
      rule,
      { attributeSetValue: "discardElement" },
    );

    expect(result).toBe(false);
    expect(base.childNodes).toHaveLength(0);
  });
});

describe("enforceAttributeSimpleValue", () => {
  let base: Element;
  let el: Element;

  beforeEach(() => {
    base = createElement("root", []);
    el = createElement("test", []);
    base.appendChild(el);
  });

  it("enforces simple value successfully", () => {
    el.setAttribute("simple", "valid");

    const rule = {
      mode: "simple" as const,
      value: "valid",
    };

    const result = enforceAttributeSimpleValue(
      { key: "simple", value: "valid" },
      el,
      rule,
    );

    expect(result).toBe(true);
    expect(el.getAttribute("simple")).toBe("valid");
  });

  it("handles invalid simple value", () => {
    el.setAttribute("simple", "invalid");

    const rule = {
      mode: "simple" as const,
      value: "valid",
    };

    const result = enforceAttributeSimpleValue(
      { key: "simple", value: "invalid" },
      el,
      rule,
      "applyDefaultValue",
    );

    expect(result).toBe(true);
    expect(el.getAttribute("simple")).toBeNull();
  });
});

describe("enforceAttributeValue", () => {
  let base: Element;
  let el: Element;

  beforeEach(() => {
    base = createElement("root", []);
    el = createElement("test", []);
    base.appendChild(el);
  });

  it("handles maxLength with discardElement", () => {
    el.setAttribute("long", "very long value that exceeds limit");

    const rule = {
      maxLength: 10,
      mode: "simple" as const,
      value: "*",
    };

    const result = enforceAttributeValue(
      { key: "long", value: "very long value that exceeds limit" },
      el,
      rule,
      { attributeValueTooLong: "discardElement" },
    );

    expect(result).toBe(false);
    expect(base.childNodes).toHaveLength(0);
  });

  it("handles record mode", () => {
    el.setAttribute("record", "key=value");

    const rule = {
      entrySeparator: ",",
      keyValueSeparator: "=",
      mode: "record" as const,
      values: {
        key: "value",
      },
    };

    const result = enforceAttributeValue(
      { key: "record", value: "key=value" },
      el,
      rule,
    );

    expect(result).toBe(true);
    expect(el.getAttribute("record")).toBe("key=value");
  });

  it("handles set mode", () => {
    el.setAttribute("set", "a,b,c");

    const rule = {
      delimiter: ",",
      mode: "set" as const,
      values: ["a", "b", "c"],
    };

    const result = enforceAttributeValue(
      { key: "set", value: "a,b,c" },
      el,
      rule,
    );

    expect(result).toBe(true);
    expect(el.getAttribute("set")).toBe("a,b,c");
  });

  it("handles simple mode", () => {
    el.setAttribute("simple", "valid");

    const rule = {
      mode: "simple" as const,
      value: "valid",
    };

    const result = enforceAttributeValue(
      { key: "simple", value: "valid" },
      el,
      rule,
    );

    expect(result).toBe(true);
    expect(el.getAttribute("simple")).toBe("valid");
  });

  it("handles maxLength with trimExcess", () => {
    el.setAttribute("long", "very long value");

    const rule = {
      maxLength: 5,
      mode: "simple" as const,
      value: "*",
    };

    const result = enforceAttributeValue(
      { key: "long", value: "very long value" },
      el,
      rule,
      { attributeValueTooLong: "trimExcess" },
    );

    expect(result).toBe(true);
    expect(el.getAttribute("long")).toBe("very ");
  });

  it("handles maxLength with discardAttribute resulting in empty value", () => {
    el.setAttribute("long", "very long value");

    const rule = {
      maxLength: 5,
      mode: "simple" as const,
      value: "*",
    };

    const result = enforceAttributeValue(
      { key: "long", value: "very long value" },
      el,
      rule,
      { attributeValueTooLong: "discardAttribute" },
    );

    expect(result).toBe(true);
    expect(el.getAttribute("long")).toBeNull();
  });
});
