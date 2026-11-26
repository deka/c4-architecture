---
title: Tags and styles
summary: Default C4 colours, tags, the nine element shapes, and element and relationship styles.
---
<p class="lead">The defaults already follow C4. Add styles only for shapes (databases, queues, front ends) or for a deliberate highlight.</p>

## Defaults

- **Colours by level**: people, software systems, containers and components you own are blue, a little lighter at each level down.
- **External elements** (`"external": true`, people and software systems only) are grey.
- **Shapes**: `person` for people, `roundedBox` for everything else.
- Boxes are 240 × 120 pixels at least, and grow to fit their text.
- No shadows, no blur: no property allows them.

## Tags

Every element and relationship carries tags. Some are implicit:

| Element | Implicit tags |
|---|---|
| Person | `Element`, `Person` |
| Software system | `Element`, `Software System` |
| Container | `Element`, `Container` |
| Component | `Element`, `Component` |
| Relationship | `Relationship` |

Add your own in `tags`: `"tags": ["Database"]`. Tags mean nothing by themselves; styles, and `include`/`exclude` [selectors](/views/#choosing-what-a-view-shows), give them a meaning.

## How styles apply

Styles live in `styles.elements` and `styles.relationships`, each keyed by a `tag`. An element takes the styles of its tags **in tag order**: implicit tags first, then yours in the order you wrote them. Later styles win, property by property. So a `Container` style is the base for every container, and a `Database` style overrides it for databases only.

The colour belongs to the element, not to the view: a style changes the element in every diagram.

## Shapes

Nine shapes, set with `"shape"` on an element style:

<div class="shape-grid">
{% diagram "shapes", "box" %}
{% diagram "shapes", "roundedBox" %}
{% diagram "shapes", "person" %}
{% diagram "shapes", "cylinder" %}
{% diagram "shapes", "pipe" %}
{% diagram "shapes", "component" %}
{% diagram "shapes", "webBrowser" %}
{% diagram "shapes", "mobileDevicePortrait" %}
{% diagram "shapes", "folder" %}
</div>

```json
"styles": {
  "elements": [
    { "tag": "Database", "shape": "cylinder" },
    { "tag": "Queue", "shape": "pipe" },
    { "tag": "Browser", "shape": "webBrowser" },
    { "tag": "Mobile", "shape": "mobileDevicePortrait" }
  ]
}
```

Other Structurizr shapes (`robot`, `hexagon`, `bucket`…) are deliberately left out: rare in C4 diagrams.

## Element style properties

| Property | Effect |
|---|---|
| `shape` | One of the nine shapes above. |
| `background`, `stroke`, `color` | Fill, border and text colours, as `#RRGGBB`. |
| `strokeWidth`, `border` | Border width (1–10 pixels) and line style: `solid`, `dashed`, `dotted`. |
| `width`, `height` | Width, and minimum height, in pixels. |
| `opacity` | 0–100 %. |
| `fontSize` | Font size of the name; type, technology and description are slightly smaller. |
| `metadata`, `description` | `false` hides the `[Type: technology]` line, or the description. |
| `icon` | An image drawn above the name. Data URI only (`data:image/png;base64,…`, also `jpeg` and `svg+xml`), so the page stays self-contained. |

## Relationship style properties

| Property | Effect |
|---|---|
| `color` | Colour of the line and its label. |
| `thickness` | Line width, 1–10 pixels. |
| `style` | `solid`, `dashed`, `dotted`. |
| `routing` | `orthogonal` (default, right angles with rounded corners), `curved` (fully rounded corners), `direct` (straight line). |
| `fontSize`, `width` | Label font size, and maximum label width before wrapping. |
| `position` | Label position along the line, in % from the source (default 50). |
| `opacity` | 0–100 %. |

## Example: highlight what is going away

{% source "styles-demo", true %}

```json
"styles": {
  "elements": [
    { "tag": "Queue", "shape": "pipe" },
    { "tag": "Deprecated", "border": "dashed", "opacity": 60, "background": "#fbe9e7", "stroke": "#b4553f" }
  ],
  "relationships": [
    { "tag": "Async", "style": "dashed", "color": "#b4553f" }
  ]
}
```

{% diagram "styles-demo", "styled" %}

Every exact field and range is in the [schema reference](/schema/#element-style).
