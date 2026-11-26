---
title: Compared to Structurizr
summary: How the JSON format maps to the Structurizr DSL, the deliberate differences, and what is not supported.
---
<p class="lead">The format borrows its concepts, not its syntax, from the <a href="https://docs.structurizr.com/dsl">Structurizr DSL</a>, created by Simon Brown, the author of the C4 model. If you know Structurizr, you already know the model; this page lists what maps to what and where it differs.</p>

## Why JSON

Models here are mostly written by agents. JSON lets them produce a valid document by construction (structured outputs) and validate it with any JSON Schema library, without a dedicated parser. Some choices follow from that:

- **Global unique ids** (`"id": "web"`) rather than hierarchical paths: a reference is always a plain id.
- **Arrays of objects with an `id`** rather than objects keyed by name: order is kept, and duplicates are detected (`JSON.parse` silently overwrites duplicated keys).
- **Closed objects and enumerations** everywhere.
- **Relationships declared in one place**, `model.relationships`, never nested in elements.
- **Groups** as a `group` field on the element, not as nested blocks.

## Mapping

| Structurizr DSL | JSON |
|---|---|
| `workspace "Name" "Description" { … }` | root: `name`, `description` |
| `!include file.dsl` | `include: ["file.json"]` |
| `person`, `softwareSystem`, `container`, `component` | `model.people[]`, `model.softwareSystems[]`, `.containers[]`, `.components[]` |
| identifier assignment `web = container …` | `"id": "web"` |
| `tags`, `url`, `properties`, `group` | `tags`, `url`, `properties: [{ name, value }]`, `group` |
| an external element (a convention in Structurizr, usually a tag with a grey style) | `"external": true`, grey by default |
| `a -> b "Description" "Technology"` | `{ "from": "a", "to": "b", "description": "…", "technology": "…" }` |
| `!impliedRelationships` | `model.impliedRelationships` (default `true`) |
| `systemLandscape`, `systemContext`, `container`, `component` views | `views[].type` with the same names |
| `dynamic <scope> [key] { a -> b "…" }` | `{ "type": "dynamic", "scope": …, "steps": [{ from, to, description }] }` |
| `include *`, `include a`, `exclude …` | `include: ["*", "a"]`, `exclude: […]`, plus `{ "tag": … }` and `{ "relationship": … }` |
| `autoLayout lr 300 300` | `layout: { direction: "LR", rankSeparation: 300, nodeSeparation: 300 }` |
| `styles { element "Tag" { shape cylinder } }` | `styles.elements: [{ "tag": "Tag", "shape": "cylinder" }]` |

## Deliberate differences

- **Dynamic steps without description** reuse the relationship's description (Structurizr draws an empty label).
- **No `technology` in a dynamic step**: in Structurizr it only selects the relationship; here the description does.
- **Nine shapes only**: `box`, `roundedBox`, `person`, `cylinder`, `pipe`, `component`, `webBrowser`, `mobileDevicePortrait`, `folder`.
- **Icons are data URIs only**, and URLs http/https only, so the page stays self-contained and safe.
- **One look**: pastel C4 colours, no shadows, an embedded font. No remote themes.

## Not supported

- The Structurizr DSL text syntax itself.
- Deployment views, filtered, custom and image views.
- The code level (C4 level 4).
- Parallel sequences (`1.1`, `1.2`) and reply steps in dynamic views.
- `!script`, `!plugin`, `!docs`, `!adrs`, perspectives. Architecture decisions are handled outside the runtime by the [`c4-adr` skill](/claude-code/#recording-decisions).
- Remote themes, branding, custom terminology.
- Interactive editing of diagrams; export to PNG or PDF.
