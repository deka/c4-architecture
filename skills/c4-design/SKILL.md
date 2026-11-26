---
name: c4-design
description: Design a software architecture upfront, before any code exists, as a C4 model (people, software systems, containers, relationships) and render it as SVG diagrams in a self-contained HTML page. Use when the user wants to design, sketch, define or discuss the architecture of a new system or project, draw a C4 / system context / container diagram, or compare architecture options.
argument-hint: "[what to design]"
---

# Designing an architecture with C4

You run an architecture workshop with the user. The output is a C4 model in JSON, validated and rendered by the runtime bundled with this plugin. The user owns the decisions; your job is to ask, propose, challenge and keep the model consistent.

## Runtime

Every command goes through:

```sh
node "${CLAUDE_PLUGIN_ROOT}/src/cli.ts" <command> <model.json> [options]
```

| Command | Use |
|---|---|
| `validate <model.json> --json` | Schema + semantic rules. Exit 1 with `{ "ok": false, "errors": [{ "file", "path", "message" }] }`; `path` is a JSON Pointer into `file`. |
| `inspect <model.json>` | What each view shows, plus modelling warnings (`--json` for structured output). Read this instead of the SVG. |
| `render <model.json> <output.html>` | Writes the HTML page (one SVG per view). |

Exit codes: 0 success, 1 invalid model, 2 usage error. `--help` prints the usage.

Before the first command, run `node --version`. Node 24 or later is required: if it is missing or older, tell the user and stop. If the command fails with a missing module (`ajv`, `elkjs`), the plugin dependencies were not installed: tell the user to run `npm ci --omit=dev` in `${CLAUDE_PLUGIN_ROOT}`.

## Files

- Ask where the model lives if the project has no convention yet. Default: `docs/architecture/workspace.json`, rendered to `docs/architecture/workspace.html` next to it.
- Do not set `$schema` in the user's files: the plugin path changes on every update.
- When the model grows past one software system, split it with `include` (one file per system, relationships between systems in the root file).

## Workshop

Ask **one question at a time** and wait for the answer. Propose a default when you have one ("I'd assume card payments go through a PSP such as Stripe — right?"). Never invent business facts silently: when you assume something, say so.

1. **Frame.** What problem the system solves, who uses it (people), which existing systems it must talk to (software systems, `external: true` when owned by someone else), and the constraints that shape the design (team size, hosting, budget, imposed technologies, deadlines).
2. **System context.** Write the model with the people, the system being designed and its neighbours, plus a `systemContext` view. Validate, render, and tell the user which file to open. Get this level agreed before going deeper: it is the diagram non-technical readers will use.
3. **Containers.** Propose a split into containers (applications, services, data stores, queues) with a technology each, and a `container` view. Challenge it: does each container earn its operational cost for this team? Is a data store shared by several containers on purpose? Would a modular monolith do?
4. **Relationships.** Each relationship reads as a sentence: a verb phrase description ("Places orders", "Publishes order events to") and, between containers, a technology ("HTTPS/JSON", "SQL", "AMQP"). Refuse vague "Uses" between containers. When a relationship declared at system level (step 2) gets refined between containers, move it down instead of keeping both: higher-level views derive it from the container relationship, and a leftover system-level one keeps its old wording on the context diagram.
5. **Key scenarios.** Once containers and relationships are agreed, walk through the one to three flows that matter most ("place an order", "refund") as `dynamic` views scoped to the system. A step rejected for lack of a relationship is a finding, not a typo: the static model misses an interaction. Ask the user, then add the relationship rather than dropping the step.
6. **Components** only when the user asks for them, for one container at a time: they change the most once code is written.
7. **Iterate.** After every change: `validate --json` → fix errors → `inspect` → address or explicitly accept each warning → `render`. Summarise what changed in the diagrams in one or two sentences.

### Recording decisions

When a structuring decision is taken during the workshop (a choice between options, a container technology chosen against an alternative, a monolith or services, a data store shared on purpose, a constraint that rules out a design), offer in one line to record it as an ADR with the `c4-adr` skill: "This decision deserves an ADR — shall I record it?". Write it only if the user agrees, following `${CLAUDE_PLUGIN_ROOT}/skills/c4-adr/SKILL.md`. Do not offer one for naming or layout choices.

### Comparing options

When the user hesitates between designs, put what the options share in `base.json`: the people and the external software systems. Each option file (`option-a.json`, `option-b.json`) includes `base.json` and declares the system being designed with its containers, its relationships and its views. An option cannot add containers to a system declared in the base: a duplicated id is an error. Render each option to its own HTML page and compare them on the user's constraints, not in the abstract.

## Modelling rules

Read `references/modelling-guide.md` before writing the first model: C4 levels, what is a container, naming, anti-patterns.

Read `references/schema-guide.md` for the JSON format: fields, views, includes, styles, and the validation rules the schema cannot express.
