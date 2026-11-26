---
title: Command line
summary: validate, inspect and render commands, exit codes and machine-readable output.
---
<p class="lead">The runtime is TypeScript run directly by Node.js 24 or later: no build step.</p>

```sh
git clone https://github.com/deka/c4-architecture.git
cd c4-architecture
npm install
node src/cli.ts --help
```

| Command | Does |
|---|---|
| `validate <model.json> [--json]` | Checks the schema, then the [semantic rules](/validation/). |
| `inspect <model.json> [--json]` | Validates, then lists what each view shows and the modelling warnings. |
| `render <model.json> [output.html]` | Validates, then writes the HTML page (to stdout without an output file). |

**Exit codes**: `0` success, `1` invalid model, `2` usage error.

## validate

```text
$ node src/cli.ts validate bad.json
bad.json: /model/relationships/0/to: element "ap" not found
bad.json: /views/0/scope: a container view expects a softwareSystem scope, "user" is a person
```

Errors go to stderr as `<file>: <JSON Pointer>: <message>`. The file is the one the error comes from, [included files](/includes/) too. With `--json`, they go to stdout:

```json
{
  "ok": false,
  "errors": [
    { "file": "bad.json", "path": "/model/relationships/0/to", "message": "element \"ap\" not found" },
    { "file": "bad.json", "path": "/views/0/scope", "message": "a container view expects a softwareSystem scope, \"user\" is a person" }
  ]
}
```

## inspect

`inspect` lets an agent, or a reviewer, read the diagrams without looking at them:

```text
$ node src/cli.ts inspect examples/basic.json
Workspace: Example
Elements: 1 people, 1 software systems, 2 containers, 0 components; 2 relationships; 2 views

View "context" (systemContext, scope app): Context
  elements (2): user, app
  relationships (1): user->app

View "containers" (container, scope app): Containers
  elements (3): user, web, api
  relationships (2): user->web, web->api

Warnings (2):
  [missing-description] person "user" has no description at examples/basic.json (/model/people/0)
  [missing-description] softwareSystem "app" has no description at examples/basic.json (/model/softwareSystems/0)
```

Relationships include [implied ones](/views/#implied-relationships). Warnings never reject the model:

| Code | Raised when |
|---|---|
| `no-views` | The workspace declares no view: nothing will be drawn. |
| `missing-description` | An element has no description. |
| `missing-technology` | A container or component has no technology. |
| `missing-relationship-description` | A relationship has no description. |
| `missing-relationship-technology` | A relationship between containers or components crosses a process boundary (anything but two components of the same container) without a technology. |
| `not-in-any-view` | An element appears in no view. |
| `crowded-view` | A view shows more than 20 elements: split it or exclude elements. |

## render

```sh
node src/cli.ts render examples/online-banking.json diagrams.html
npm run render -- examples/online-banking.json diagrams.html   # same thing
```

The page works as a viewer: it shows one view at a time, the one named by the URL fragment (`page.html#containers`), or the first declared view by default. Navigation stays inside the model:

- a sidebar lists an overview (landscape and unscoped dynamic views), then each software system; a system unfolds its views (context, containers, components, dynamic) while one of them is shown;
- clicking a software system in a diagram opens its container view (or its context view), clicking a container opens its component view;
- the breadcrumb above each view, and boundary headers, go one level up.

Printing the page prints every view, one per page.

It is a single file:

- the SVG is inline, the Inter font is embedded as a data URI;
- there is no script;
- a `Content-Security-Policy` forbids every resource that is not a data URI;
- relationship `url`s, and the `url`s of elements without a detailed view, become links (http and https only).

Commit it next to the JSON, or publish it as is.
