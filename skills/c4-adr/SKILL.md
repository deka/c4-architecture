---
name: c4-adr
description: Record architecture decisions (ADRs) linked to the elements of a C4 model (JSON workspace), and supersede them when a decision changes. Use when the user wants to write, record or document an architecture decision, explain why the architecture is the way it is, record the outcome of a choice between design options, or replace a decision that no longer holds.
argument-hint: "[decision to record | ADR number to supersede]"
---

# Recording architecture decisions for a C4 model

An ADR records one decision: its context, the options considered, the choice and its consequences. Each ADR names the elements of the C4 model it concerns, by id. The ADR files are plain Markdown: the runtime does not read them, and `c4-drift` checks them against the model.

The user owns the decisions. You ask, write down and keep the files consistent. Never invent a reason, an option or a consequence: when you assume something, say so and ask.

## Runtime

```sh
node "${CLAUDE_PLUGIN_ROOT}/src/cli.ts" <command> <model.json> [options]
```

- `validate <model.json> --json`: run it first. If the model is invalid, report the errors and stop: element ids cannot be checked against an invalid model.
- `inspect <model.json> --json`: use it only to resolve a view key into element ids. It lists the elements of each view, not every element of the model.

To know the element ids, read the root model file and every file it includes. The JSON format is described in `${CLAUDE_PLUGIN_ROOT}/skills/c4-design/references/schema-guide.md`.

Before the first command, run `node --version`. Node 24 or later is required: if it is missing or older, tell the user and stop. If the command fails with a missing module (`ajv`, `elkjs`), tell the user to run `npm ci --omit=dev` in `${CLAUDE_PLUGIN_ROOT}`.

## Files

- **Model:** default `docs/architecture/workspace.json`. If it does not exist, ask the user where the model is.
- **Decisions folder:** `decisions/` next to the root model file (`docs/architecture/decisions/` by default). If it does not exist, say you will create it before writing the first ADR.
- **File name:** `NNNN-slug.md`. `NNNN` is the next free number, four digits, starting at `0001`. A number is never reused, even when its ADR is rejected or superseded. The slug is the title in kebab case, ASCII only.

## Format

```markdown
---
status: accepted
date: 2026-11-25
elements: [orderApi, orderDb]
supersedes: "0003"
superseded-by: null
---
# 0004. Use PostgreSQL for orders

## Context
## Options considered
## Decision
## Consequences
```

- `status`: `proposed` (under discussion), `accepted`, `rejected` or `superseded`.
- `date`: the date of the last status change, `YYYY-MM-DD`.
- `elements`: the ids of the model elements the decision concerns (people, software systems, containers, components). Use the most precise level: the container that uses PostgreSQL, not its software system. A decision about the whole system lists the system. Never leave the list empty: a decision that concerns no element does not belong to this model.
- `supersedes`, `superseded-by`: the number of another ADR, quoted (`"0003"`, so that YAML keeps the leading zeros), or `null`.
- `models` (optional): the model files of the folder the ADR applies to, relative to the folder of the model (`[option-a.json]`). Without it, the ADR applies to every model of the folder. Set it when the ADR names elements that exist in only one option.
- The front matter keys stay in English. The title, the headings and the text are written in the user's language.
- **Options considered:** at least two, including the rejected ones, each with its pros and cons in one or two lines. When the decision chooses between design options (`option-a.json`, `option-b.json`), each option is one of them.
- **Consequences:** what becomes easier, what becomes harder, and what the model now has to show.

## Writing an ADR

1. Validate the model, then read it and its included files to know the element ids.
2. Ask **one question at a time** for what is missing from the conversation: the decision, the context and constraints that led to it, the options considered, the consequences. When the decision was just made in the conversation (a `c4-design` workshop, for example), draft from what was said and ask only for the gaps.
3. Propose the `elements` list and have the user confirm it. Every id must exist in the model, or in each model listed in `models`.
4. The status is `proposed` unless the user says the decision is taken.
5. Write the file and give its path. Then compare the decision with the model: if the model does not show what the decision says (another technology, a missing container or relationship), tell the user and offer to update the model. Never change the model silently.

## Superseding an ADR

A decision changes: an accepted ADR is never edited, it is replaced.

1. Find the ADR to replace (the argument gives its number, otherwise ask). Only an `accepted` ADR can be superseded.
2. Write the new ADR as above, with `supersedes: "<old number>"`. Its context says what changed since the old decision.
3. In the old ADR, change only the front matter: `status: superseded`, `superseded-by: "<new number>"`, `date` set to today. Leave its text as it is.
4. Compare the new decision with the model, as in step 5 above.

A `proposed` ADR can still be edited in place. An ADR that was never accepted becomes `rejected`, not `superseded`.
