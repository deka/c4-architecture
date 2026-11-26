---
title: Views
summary: View types, scopes, default selection, include and exclude selectors, implied relationships, groups, dynamic views and layout.
---
<p class="lead">The model holds elements and relationships; views decide what each diagram shows. Declare views in the <code>views</code> array: the HTML page shows them in that order, each under an anchor named after its <code>key</code>.</p>

## View types

| `type` | C4 diagram | `scope` | Shows by default |
|---|---|---|---|
| `systemLandscape` | Landscape | none | every person and software system |
| `systemContext` | Level 1 | a software system | the system, and the people and systems directly connected to it |
| `container` | Level 2 | a software system | its containers (inside its boundary), and the people and systems directly connected to them |
| `component` | Level 3 | a container | its components (inside its boundary), and the people, systems and containers directly connected to them |
| `dynamic` | Dynamic | none, a software system or a container | exactly the elements cited by its steps |

Every view has a `key` (required, unique across the workspace), and an optional `title` and `description` shown above the diagram. Without a `title`, the key is used.

A view only ever shows the element kinds of its level: a context view never shows containers, even if you include one. In a container or component view, the scope itself is the dashed boundary, not a box.

## Choosing what a view shows

`include` and `exclude` take a list of **selectors**:

| Selector | In `include` | In `exclude` |
|---|---|---|
| `"*"` | the default selection of the view type (table above) | — |
| `"api"` | the element with this id | removes the element and its relationships |
| `{ "tag": "Database" }` | every element with the tag | removes elements *and* relationships with the tag |
| `{ "relationship": "webToApi" }` | both ends of the relationship | removes the relationship only |

`include` defaults to `["*"]`. Relationships are never listed: a view shows every relationship whose two ends are both shown, minus the excluded ones. To target a relationship, give it an `id`.

```json
{ "type": "systemContext", "key": "context", "scope": "banking", "include": ["*", "advisor"] }
{ "type": "container", "key": "core", "scope": "banking", "include": ["web", "api"] }
{ "type": "container", "key": "noDb", "scope": "banking", "exclude": [{ "tag": "Database" }] }
```

The first view adds an element that is not connected to the system; the second shows only two containers and the relationship between them; the third hides every database.

## Implied relationships

Declare relationships at the most detailed level you model. Below, only container-level relationships are declared: `user → web` and `api → mail`. The runtime derives `user → app` and `app → mail` for the context view. That is how a context view stays correct without duplicating every link:

{% source "implied", true %}

{% diagram "implied", "context" %}

{% diagram "implied", "containers" %}

Rules, as in Structurizr:

- A relationship `A → B` implies a relationship between every ancestor of `A` (and `A`) and every ancestor of `B` (and `B`).
- No relationship is implied between an element and its own parent or child.
- An implied relationship is skipped when one already exists between the same two elements, declared or implied. It copies the description, technology and tags of the first relationship that produced it.
- Set `"model": { "impliedRelationships": false }` to turn it off. Only the root file's setting counts.

## Groups

Give elements the same `group` name to draw them inside a dashed frame. Groups never change what a view selects; they only frame what is shown. In container and component views, a group stays inside the boundary.

{% diagram "groups", "groups" %}

## Dynamic views

A dynamic view tells one scenario as numbered steps. It has no `include` or `exclude`: it shows exactly the elements its steps cite.

```json
{
  "type": "dynamic", "key": "transfer", "scope": "banking", "title": "Make a transfer",
  "steps": [
    { "from": "customer", "to": "web", "description": "Submits a transfer" },
    { "from": "web", "to": "api", "description": "Sends the transfer" }
  ]
}
```

- Steps are numbered from 1, in array order. The same pair may appear several times.
- **Each step is an instance of a relationship of the model**, declared or implied, from `from` to `to`, in that direction. A dynamic view cannot show a link absent from the static views. A reply ("returns the result") is not a step of its own.
- The step `description` replaces the relationship's on the drawing; without one, the relationship's is used. The technology always comes from the relationship.
- When several relationships link the same pair, the step uses the one with the same description, otherwise the first declared.

The `scope` sets the level of the steps:

| `scope` | Steps may involve |
|---|---|
| none | people and software systems |
| a software system | people, other software systems, and containers (the scope's are drawn inside its boundary) |
| a container | people, other software systems, other containers, and components (the scope's are drawn inside its boundary) |

The scope itself (and, for a container, its software system) cannot be a step end.

Not supported yet: parallel sequences (`1.1`, `1.2`) and reply steps.

## Layout

The layout is automatic ([ELK](https://eclipse.dev/elk/) layered algorithm, orthogonal links with rounded corners). Each view can tune it:

```json
{ "type": "container", "key": "containers", "scope": "banking",
  "layout": { "direction": "LR", "rankSeparation": 96, "nodeSeparation": 48 } }
```

| Field | Values | Default |
|---|---|---|
| `direction` | `TB` top to bottom, `BT`, `LR` left to right, `RL` | `TB` |
| `rankSeparation` | space between ranks, in pixels | 64 |
| `nodeSeparation` | space between elements of the same rank, in pixels | 48 |

There is no manual positioning: if a diagram is hard to read, split the view, exclude elements, or change the direction.
