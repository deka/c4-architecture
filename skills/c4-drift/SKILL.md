---
name: c4-drift
description: Compare a C4 model (JSON workspace) with the source code of the repository and report the drifts — links the code has but the model lacks, links that differ, links the model plans but the code does not implement — and the architecture decisions (ADRs) that no longer match the model. Use when the user wants to check whether the architecture diagrams still match the code, audit an implementation against its C4 design, or find what is left to build.
argument-hint: "[element id | view key | free text]"
---

# Finding drifts between a C4 model and the code

The C4 model (JSON) is the source of truth for the code. You compare the code with it and report every drift, nothing else: no justification, no guess about intent, no advice.

You also compare the architecture decisions (ADRs written by the `c4-adr` skill) with the model. There, neither side is the reference: you report the mismatch without saying which one is wrong.

## Runtime

```sh
node "${CLAUDE_PLUGIN_ROOT}/src/cli.ts" <command> <model.json> [options]
```

- `validate <model.json> --json`: run it first. If the model is invalid, report the errors to the user and stop: an invalid model cannot be a reference.
- `inspect <model.json> --json`: use it only to resolve a view key into element ids.

Before the first command, run `node --version`. Node 24 or later is required: if it is missing or older, tell the user and stop. If the command fails with a missing module (`ajv`, `elkjs`), tell the user to run `npm ci --omit=dev` in `${CLAUDE_PLUGIN_ROOT}`.

The JSON format is described in `${CLAUDE_PLUGIN_ROOT}/skills/c4-design/references/schema-guide.md`.

## Inputs

- **Model:** default `docs/architecture/workspace.json`. If it does not exist, ask the user where the model is. Read the root file and every file it includes.
- **Scope** (the argument): everything by default. Otherwise one of:
  - an element id: that element and everything it contains;
  - a view key: the elements `inspect` lists for that view;
  - free text ("the payment part"): map it to element ids; if the mapping is ambiguous, ask the user before analysing.
- **Decisions:** the ADR files of the `decisions/` folder next to the root model file, if it exists. Their format is described in `${CLAUDE_PLUGIN_ROOT}/skills/c4-adr/SKILL.md`. Ignore an ADR whose `models` list does not name the analysed model.
- **Output files:** next to the root model file, named after it: `<name>.drift.json` and `<name>.drift.md` for `<name>.json` (`docs/architecture/workspace.drift.json` for the default model). Each model of a folder thus keeps its own drift. Overwrite the previous files of that model.

## Granularity

Compare at the most detailed level the model describes for each element:

- A container **without** components in the model: only the links that leave or enter it count (network calls, database or queue access, external APIs, SDKs of external services). Its internal code is ignored.
- A container **with** components in the model: links between its components count too.
- Shared internal code that is no element of the model (utilities, types, an HTTP server used by several components) is not a link: ignore imports of it. A `code.transverse` property on an element names such code explicitly.
- Tests and development tooling (test suites, test agents, fixtures, scripts, CI) are not part of the architecture, even when they run as a service of a compose file: ignore them and their links.

Compare only the relationships declared in `model.relationships`, never the implied ones that `inspect` shows: otherwise one drift appears at two levels.

With a partial scope, keep every link that touches an in-scope element, incoming or outgoing.

A relationship is assessed from the end, or ends, that have code in this repository: a call to Docker Engine is found in the caller, a write to a volume in the writer. When neither end has code (a person using a web app, a link between two externals, a link from a container that has no code here), the relationship is not assessed. List these in `scope.notAssessed` of the agent file only; the reader report does not mention them.

## Procedure

1. Validate the model and resolve the scope into a list of element ids.
2. **Map** each in-scope container (and component, if modelled) to its location in the code: directory, package, deployable unit. Use the element's `code` property when it has one. Classify each container:
   - `code`: it runs code of this project (UI, service, worker). If none is found, it gives one drift, "no code", and its relationships are assessed from their other end only.
   - `infrastructure`: a runtime, a data store, a broker or a volume that the project uses but does not write (Docker Engine, PostgreSQL, a Docker volume). It never gives a "no code" drift.
   - `none`: it runs code that does not live in this repository (generated at run time, owned elsewhere).
3. **Model → code:** for each in-scope relationship, look for it in the code, then classify it as `matched`, `differs` (other technology, other direction, other target) or `missing`.
4. **Code → model:** list every link of the code, at the granularity above, that matches no relationship of the model: `unmodelled`. Unmodelled elements (a worker, a database, an external service) are reported through their links.
5. **Decisions ↔ model:** an ADR is in scope when its `elements` names an in-scope element, or names no element of the model at all; every ADR is in scope when the scope is the whole model. For each in-scope ADR, report:
   - `unknownElement` (`accepted` ADRs only): an id of `elements` that does not exist in the model;
   - `contradicts` (`accepted` ADRs only): the model shows something else than the decision says (another technology, a container or relationship the decision rules out, a missing one it requires). Compare what the decision states, not its consequences or its options;
   - `brokenLink` (any status): `supersedes` or `superseded-by` names an ADR that does not exist, or the two ADRs do not point to each other.
   An in-scope ADR with none of these is `consistent`. An ADR can have several statuses: give one entry per mismatch.
6. Write the agent file, then derive the reader report from it.

## Agent file: `<name>.drift.json`

Complete, for agents that will fix the code or the model. It holds the matched relationships as well as the drifts.

```json
{
  "model": "docs/architecture/workspace.json",
  "scope": { "request": "orderApi", "elements": ["orderApi"], "notAssessed": ["customer->webApp"] },
  "mapping": [
    { "element": "orderApi", "kind": "code", "code": ["services/order-api/"] },
    { "element": "webApp", "kind": "code", "code": [] },
    { "element": "orderDb", "kind": "infrastructure", "code": [] }
  ],
  "links": [
    {
      "status": "unmodelled",
      "from": "orderApi",
      "to": "Stripe",
      "external": true,
      "code": "services/order-api/src/payment.ts:12",
      "model": null,
      "summary": "orderApi calls the Stripe API over HTTPS"
    },
    {
      "status": "differs",
      "from": "orderApi",
      "to": "stockService",
      "external": false,
      "code": "services/order-api/src/stock.ts:8",
      "model": "/model/relationships/3",
      "summary": "gRPC in the code, HTTPS/JSON in the model"
    }
  ],
  "decisions": [
    {
      "status": "contradicts",
      "adr": "docs/architecture/decisions/0004-use-postgresql-for-orders.md",
      "elements": ["orderDb"],
      "model": "/model/softwareSystems/0/containers/2/technology",
      "summary": "the ADR chooses PostgreSQL, the model says MongoDB"
    }
  ]
}
```

- `status`: `matched`, `differs`, `missing` or `unmodelled`.
- `from`, `to`: element ids, or the name of the target when the model has no element for it.
- `code`: `file:line`, `null` for `missing`. `model`: JSON Pointer into the file that declares the relationship (add the file name when it is an included file), `null` for `unmodelled`.
- `summary`: one short sentence.
- `mapping[].kind`: `code`, `infrastructure` or `none` (see the procedure). A `code` element with an empty `code` list is the "no code" drift.
- `decisions[].status`: `consistent`, `unknownElement`, `contradicts` or `brokenLink`. `decisions[].model`: JSON Pointer to the part of the model concerned, `null` when there is none. `decisions` is an empty list when there is no `decisions/` folder.

## Reader report: `<name>.drift.md`

As short as possible, written in the user's language. It has the same items as the agent file, minus the `matched` links, the `consistent` decisions and the relationships not assessed, with no location, no justification, no introduction and no conclusion. Sections in this order, external systems first within each section, and an empty section is omitted:

```markdown
# C4 drift — <scope>

Scope: <elements>.

## Unmodelled
- orderApi → Stripe (HTTPS)

## Differs
- orderApi → stockService: gRPC in the code, HTTPS/JSON in the model

## To do
- Web app: no code
- orderApi → notificationQueue (AMQP)

## Decisions
- 0004 Use PostgreSQL for orders: the ADR chooses PostgreSQL, the model says MongoDB
- 0006 Split the stock service: unknown element `stockWorker`
```

One line per link, plus one line per "no code" element. The **Decisions** section comes last, with one line per ADR that is not `consistent`. Use element names, and translate the headings. When nothing drifts, the report is the title, the scope line and "No drift.".

Once both files are written, show the reader report in the conversation and give the path of the agent file.
