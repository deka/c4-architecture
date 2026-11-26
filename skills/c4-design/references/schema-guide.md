# Workspace JSON format

The full JSON Schema is `${CLAUDE_PLUGIN_ROOT}/schema/c4.schema.json`. Read it only when this guide is not enough. Every object is closed: unknown fields are errors.

## Skeleton

```json
{
  "version": 1,
  "name": "Shop",
  "description": "Online shop for independent bookstores",
  "model": {
    "people": [
      { "id": "customer", "name": "Customer", "description": "Buys books online", "external": true }
    ],
    "softwareSystems": [
      {
        "id": "shop",
        "name": "Shop",
        "description": "Catalogue, cart and orders",
        "containers": [
          { "id": "web", "name": "Web shop", "description": "Storefront", "technology": "Next.js", "tags": ["Browser"] },
          { "id": "api", "name": "Order API", "description": "Takes and tracks orders", "technology": "Go" },
          { "id": "db", "name": "Order database", "description": "Orders and stock", "technology": "PostgreSQL", "tags": ["Database"] }
        ]
      },
      { "id": "psp", "name": "Payment provider", "description": "Card payments", "external": true }
    ],
    "relationships": [
      { "from": "customer", "to": "web", "description": "Browses and buys books using", "technology": "HTTPS" },
      { "from": "web", "to": "api", "description": "Places orders using", "technology": "HTTPS/JSON" },
      { "from": "api", "to": "db", "description": "Reads and writes orders in", "technology": "SQL" },
      { "from": "api", "to": "psp", "description": "Charges cards using", "technology": "HTTPS/JSON" }
    ]
  },
  "views": [
    { "type": "systemContext", "key": "context", "scope": "shop", "title": "Shop - system context" },
    { "type": "container", "key": "containers", "scope": "shop", "title": "Shop - containers" }
  ],
  "styles": {
    "elements": [
      { "tag": "Database", "shape": "cylinder" },
      { "tag": "Browser", "shape": "webBrowser" }
    ]
  }
}
```

## Fields

- Root: `version` (always `1`, required), `name`, `description`, `include`, `model`, `views`, `styles`.
- Ids (`id`): `^[A-Za-z][A-Za-z0-9_-]*$`, unique across the whole workspace, included files too.
- Every element: `id` and `name` (required), `description`, `group`, `tags`, `url` (http/https only), `properties` (`[{ "name", "value" }]`).
- `external: true`: people and software systems only.
- `technology`: containers and components only.
- Nesting: `softwareSystems[].containers[].components[]`.
- Relationships live only in `model.relationships`: `from` and `to` (required, element ids), `id` (needed only to select it in a view), `description`, `technology`, `tags`, `url`, `properties`.
- `model.impliedRelationships` (default `true`): a relationship between two children also links their parents in higher-level views.
- `group`: a name; elements sharing it are drawn in a dashed group.

## Views

| `type` | `scope` | Shows with `"*"` (the default `include`) |
|---|---|---|
| `systemLandscape` | none | every person and software system |
| `systemContext` | a software system | the system and the people/systems directly connected to it |
| `container` | a software system | its containers (inside a boundary) and the people/systems directly connected to them |
| `component` | a container | its components and the people/systems/containers directly connected to them |

- `key` (required, unique), `title`, `description`.
- `include` / `exclude`: lists of selectors: `"*"`, an element id, `{ "tag": "…" }`, `{ "relationship": "<relationship id>" }`.
- `layout`: `direction` (`TB` default, `BT`, `LR`, `RL`), `rankSeparation`, `nodeSeparation` (integers, pixels).

### Dynamic views

A numbered sequence of interactions for one scenario ("place an order"). No `include`/`exclude`: the view shows exactly the elements its steps cite.

```json
{
  "type": "dynamic", "key": "placeOrder", "scope": "shop", "title": "Place an order",
  "steps": [
    { "from": "customer", "to": "web", "description": "Submits the cart" },
    { "from": "web", "to": "api", "description": "Creates the order" },
    { "from": "api", "to": "psp", "description": "Charges the card" },
    { "from": "api", "to": "db", "description": "Stores the paid order" }
  ]
}
```

- `steps` (required, at least one): `from`, `to` (required), `description`. Numbered from 1 in array order; the same pair may appear several times.
- Every step is an instance of a relationship of the model from `from` to `to`, declared or implied, in that direction. Declare the relationship first; a reply ("returns the result") is not a step of its own.
- `description` replaces the relationship's description on the drawing (default: the relationship's); the technology always comes from the relationship. When several relationships link the same pair, the step uses the one with the same description, otherwise the first declared.
- `scope` sets the level:

| `scope` | Steps may involve |
|---|---|
| none | people and software systems |
| a software system | people, other software systems, containers (the scope's are drawn inside its boundary) |
| a container | people, other software systems, other containers, components (the scope's are drawn inside its boundary) |

The scope itself (and, for a container scope, its software system) cannot be a step end.

## Includes

`"include": ["systems/payments.json"]`: paths relative to the declaring file, no URL. Arrays are concatenated (a duplicated id is an error, never an override); the root file's `name` and `description` win; every file must have the same `version`; cycles are errors. An included file is a complete workspace document (`"version": 1` required).

## Styles

Element and relationship styles are keyed by tag; the last declaration wins.

- `styles.elements[]`: `tag` (required), `shape` (`box`, `roundedBox`, `person`, `cylinder`, `pipe`, `component`, `webBrowser`, `mobileDevicePortrait`, `folder`), `icon` (data URI only), `width`, `height`, `background`, `color`, `stroke`, `strokeWidth`, `border` (`solid`, `dashed`, `dotted`), `opacity`, `fontSize`, `metadata`, `description`.
- `styles.relationships[]`: `tag` (required), `color`, `thickness`, `style`, `routing` (`direct`, `orthogonal`, `curved`), `fontSize`, `width`, `position`, `opacity`.

Default colours already follow C4 (blue levels, grey for external): only add styles for shapes or for a deliberate highlight.

## Rules checked beyond the schema

- Ids are unique across all files; view keys too.
- `from`, `to`, `scope` and selectors reference existing elements or relationships.
- A `systemContext` or `container` view is scoped to a software system; a `component` view to a container; a `dynamic` view to either, or to nothing.
- Every dynamic step matches a relationship from `from` to `to`, and its elements are allowed by the view's scope.
- `version` is identical in every included file.
