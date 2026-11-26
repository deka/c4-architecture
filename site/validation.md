---
title: Validation rules
summary: How a C4 workspace is validated, schema first then semantic rules.
---
<p class="lead">A model is checked in two passes. Both report errors with the file and the <a href="https://datatracker.ietf.org/doc/html/rfc6901">JSON Pointer</a> of the faulty value, so that an agent can fix it without guessing.</p>

## 1. JSON Schema

The file must match [`c4.schema.json`](/schema/) (JSON Schema 2020-12). In short:

- **Closed objects**: an unknown or misspelt field is an error, never silently ignored.
- **Enumerations** for shapes, directions, line styles, routing.
- **Ids** match `^[A-Za-z][A-Za-z0-9_-]*$`.
- **Colours** are `#RRGGBB`.
- **URLs** use `http` or `https` only: an element becomes a link, and a `javascript:` URL would run on click.
- **Icons** are data URIs only, so the page stays self-contained.
- **Include paths** are relative: no absolute path, no URL.

These properties also make the format suitable for structured outputs: an agent can produce a valid document by construction.

## 2. Semantic rules

What a schema cannot express:

| Rule | Example error |
|---|---|
| Ids are unique across the whole workspace, included files too. Elements and relationships share one namespace. | `/model/people/1/id: identifier "user" at a.json (/model/people/1) is already defined at b.json (/model/people/0)` |
| View keys are unique. | |
| `from`, `to`, `scope` and selectors reference existing elements or relationships. | `/model/relationships/0/to: element "ap" not found` |
| A `systemContext` or `container` view is scoped to a software system; a `component` view to a container; a `dynamic` view to either, or to nothing. | `/views/0/scope: a container view expects a softwareSystem scope, "user" is a person` |
| Every dynamic step matches a relationship from `from` to `to` (declared or implied), and its elements are allowed by the view's scope. | |
| `version` is identical in every included file. Includes are not circular. | |

Run them with `node src/cli.ts validate model.json` (see [Command line](/cli/)). Modelling advice that does not make a model invalid (missing descriptions, crowded views…) is reported by [`inspect`](/cli/#inspect) instead.
