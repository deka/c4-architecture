---
title: Tutorial
summary: Build a C4 model of an online bookshop step by step, from the system context down to a dynamic view.
---
<p class="lead">We model a small online bookshop, one C4 level at a time. Each step is a complete, valid file; the diagrams below are what <code>render</code> produces from it.</p>

Install the runtime first (see [Command line](/cli/)), then create a file `bookshop.json`. Add `"$schema"` with the path from your file to `schema/c4.schema.json` to get completion and validation in your editor. The sources below say `../../schema/c4.schema.json` because they live in `site/models/` of the repository.

## 1. System context

Start with the big picture: who uses the system, and which other systems it depends on. Nothing technical yet.

{% source "tutorial-1-context" %}

- `version` is required and always `1`.
- Every element has an `id`, unique in the whole file, and a `name`. Ids are what relationships and views reference.
- `external: true` marks what you do not own. It is drawn in grey.
- Relationships live in one place, `model.relationships`. The `description` reads as a sentence: *Customer* "browses and buys books using" *Bookshop*.
- A `systemContext` view needs a `scope`: the software system at the centre.

Check and render it:

```sh
node src/cli.ts validate bookshop.json
node src/cli.ts render bookshop.json bookshop.html
```

{% diagram "tutorial-1-context", "context" %}

## 2. Containers

Zoom into the bookshop: what runs and is deployed separately. Containers are nested in their software system, and get a `technology`.

{% source "tutorial-2-containers", true %}

What changed:

- `shop` now has three `containers`. The database is a container of the shop, not a system of its own.
- Relationships now go **to and from containers**: `customer → web`, `api → payments`. You do not need to keep `customer → shop`: the context view still shows it, because relationships between parents are [implied](/views/#implied-relationships) from those between their children.
- Relationships between containers name their protocol in `technology`.
- The `Database` and `Browser` tags are styled with a `cylinder` and a `webBrowser` shape. Tags are free text; the [styles](/styles/) give them meaning.

{% diagram "tutorial-2-containers", "containers" %}

The context view of the same file is unchanged, even though no relationship targets `shop` any more:

{% diagram "tutorial-2-containers", "context" %}

## 3. Components

Zoom into one container only where it helps. Here, the Order API is split into three components.

{% source "tutorial-3-components", true %}

- `components` are nested in the `api` container.
- `web → api` became `web → orderHandler`: declare relationships at the most detailed level you model.
- A `component` view is scoped to a **container**.

{% diagram "tutorial-3-components", "components" %}

## 4. A dynamic view

Static views show what *can* talk to what. A dynamic view tells one story: the numbered steps of a scenario.

```json
{
  "type": "dynamic",
  "key": "placeOrder",
  "scope": "shop",
  "title": "Place an order",
  "description": "What happens when a customer checks out.",
  "steps": [
    { "from": "customer", "to": "web", "description": "Submits the cart" },
    { "from": "web", "to": "api", "description": "Creates the order" },
    { "from": "api", "to": "payments", "description": "Charges the card" },
    { "from": "api", "to": "db", "description": "Stores the paid order" }
  ]
}
```

- Every step must follow a relationship of the model, in the same direction. `web → api` is not declared, but it is implied by `web → orderHandler`, so it is valid.
- With a software system as `scope`, steps run between containers, drawn inside the boundary.
- The step `description` replaces the relationship's on the drawing; the technology comes from the relationship.

{% diagram "tutorial-4-dynamic", "placeOrder" %}

## 5. Review before you share

```sh
node src/cli.ts inspect bookshop.json
```

`inspect` lists what each view shows and warns about modelling gaps: missing descriptions or technologies, elements in no view, crowded views. All the files of this tutorial pass without warnings.

The final file, with all four views:

{% source "tutorial-4-dynamic", true %}

## Next steps

- Choose and filter what each view shows: [Views](/views/).
- Change shapes and colours: [Tags and styles](/styles/).
- Split a large model into several files: [Splitting a model](/includes/).
- Every field, with its type: [JSON schema](/schema/).
