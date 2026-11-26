---
title: Splitting a model
summary: Split a large C4 model into several JSON files with include.
---
<p class="lead">A large model can be split into several files with <code>include</code>: one per team or per system, for example. The files are merged before validation, as if they were one.</p>

```json
{
  "version": 1,
  "name": "Company landscape",
  "include": ["systems/payments.json", "systems/shop.json", "views.json"],
  "model": {
    "people": [{ "id": "customer", "name": "Customer", "description": "Buys online" }]
  }
}
```

`systems/payments.json` is a complete workspace document of its own:

```json
{
  "version": 1,
  "model": {
    "softwareSystems": [{ "id": "payments", "name": "Payments", "description": "Takes card payments" }]
  }
}
```

## Merge rules

- **Paths** are relative to the file that declares them. Absolute paths and URLs are rejected.
- **Arrays are concatenated**: people, software systems, relationships, views, element styles and relationship styles.
- **No override**: an id or a view key defined twice, in any two files, is an error that names both places.
- The **root file's** `name`, `description` and `model.impliedRelationships` win.
- Every file must have the **same `version`**.
- An included file may include others. **Cycles** are errors.
- References work across files: a view in `views.json` may be scoped to a system declared in `systems/shop.json`, and a relationship may link elements of two different files.

Validation errors name the file they come from: `systems/shop.json: /model/relationships/0/to: element "pay" not found`.
