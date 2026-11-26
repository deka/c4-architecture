// Turns schema/c4.schema.json into the data of the schema reference page:
// one section per object type, one row per property, types linked to their section.

/** Object definitions, in page order: [definition name, anchor, title]. */
const objects = [
  ["model", "model", "Model"],
  ["person", "person", "Person"],
  ["softwareSystem", "software-system", "Software system"],
  ["container", "container", "Container"],
  ["component", "component", "Component"],
  ["relationship", "relationship", "Relationship"],
];
const afterViews = [
  ["dynamicStep", "dynamic-step", "Dynamic step"],
  ["layout", "layout", "Layout"],
  ["styles", "styles", "Styles"],
  ["elementStyle", "element-style", "Element style"],
  ["relationshipStyle", "relationship-style", "Relationship style"],
];
/** Definitions rendered as a named type in the "Common types" section. */
const commonTypes = {
  id: { anchor: "type-id", label: "id" },
  relativePath: { anchor: "type-relative-path", label: "relative path" },
  color: { anchor: "type-color", label: "colour" },
  tags: { anchor: "type-tags", label: "tags" },
  properties: { anchor: "type-properties", label: "properties" },
  selector: { anchor: "type-selector", label: "selector" },
};

const escape = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Escapes, then renders `code` spans. */
const inline = (text) => escape(text ?? "").replace(/`([^`]+)`/g, "<code>$1</code>");
const code = (value) => `<code>${escape(typeof value === "string" ? value : JSON.stringify(value))}</code>`;

export function schemaReference(schema) {
  const defs = schema.$defs;
  const anchors = new Map([...objects, ...afterViews].map(([name, anchor]) => [name, anchor]));
  const refName = (ref) => ref.replace("#/$defs/", "");

  const typeOf = (p) => {
    if (p.$ref) {
      const name = refName(p.$ref);
      if (commonTypes[name]) return `<a href="#${commonTypes[name].anchor}">${commonTypes[name].label}</a>`;
      if (anchors.has(name)) return `<a href="#${anchors.get(name)}">${name}</a>`;
      if (name === "view") return `<a href="#views">view</a>`;
      throw new Error(`schema reference: no section for $ref ${p.$ref}`);
    }
    if (p.const !== undefined) return code(p.const);
    if (p.enum) return p.enum.map(code).join(" | ");
    if (p.type === "array") return `array of ${typeOf(p.items)}`;
    if (p.type === "string" && p.format === "uri") return "URL";
    if (p.type === "integer" && p.minimum !== undefined && p.maximum !== undefined) {
      return `integer, ${p.minimum}–${p.maximum}`;
    }
    if (p.type === "integer" && p.minimum !== undefined) return `integer ≥ ${p.minimum}`;
    if (p.type) return p.type;
    throw new Error(`schema reference: cannot describe ${JSON.stringify(p)}`);
  };

  const descriptionOf = (p) => {
    if (p.description !== undefined) return p.description;
    if (p.$ref) return defs[refName(p.$ref)]?.description;
    if (p.type === "array" && p.items?.$ref) return defs[refName(p.items.$ref)]?.description;
    return undefined;
  };

  const notes = (p) => {
    const list = [];
    if (p.default !== undefined) list.push(`Default: ${code(p.default)}.`);
    if (p.minLength === 1 || p.minItems === 1) list.push("Must not be empty.");
    if (p.uniqueItems) list.push("No duplicates.");
    return list.join(" ");
  };

  const section = (def, anchor, title) => {
    const required = new Set(def.required ?? []);
    return {
      anchor,
      title,
      description: inline(def.description),
      properties: Object.entries(def.properties).map(([name, p]) => ({
        name,
        type: typeOf(p),
        required: required.has(name),
        description: [inline(descriptionOf(p)), notes(p)].filter(Boolean).join(" "),
      })),
    };
  };

  const views = defs.view.oneOf.map((variant) => {
    const type = variant.properties.type.const;
    return section(variant, `view-${type}`, `${type} view`);
  });

  const selector = defs.selector.anyOf.map((option) => {
    if (option.const !== undefined) return { form: code(option.const), meaning: "The default selection of the view type." };
    if (option.$ref) return { form: '<code>"&lt;id&gt;"</code>', meaning: "One element, by id." };
    const [key, p] = Object.entries(option.properties)[0];
    return { form: `<code>{ "${key}": … }</code>`, meaning: inline(p.description) };
  });

  const scalar = (name, extra) => ({
    anchor: commonTypes[name].anchor,
    title: commonTypes[name].label,
    description: [inline(defs[name].description), extra].filter(Boolean).join(" "),
  });

  return {
    title: schema.title,
    workspace: section(schema, "workspace", "Workspace (root)"),
    objects: objects.map(([name, anchor, title]) => section(defs[name], anchor, title)),
    views,
    afterViews: afterViews.map(([name, anchor, title]) => section(defs[name], anchor, title)),
    selector: { anchor: commonTypes.selector.anchor, description: inline(defs.selector.description), options: selector },
    property: section(defs.properties.items, commonTypes.properties.anchor, "Property"),
    common: [
      scalar("id", `Pattern: ${code(defs.id.pattern)}.`),
      scalar("relativePath"),
      scalar("color"),
      scalar("tags", "An array of non-empty strings, without duplicates."),
    ],
  };
}
