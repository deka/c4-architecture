---
title: Claude Code plugin
summary: Design an architecture with Claude using the c4-design skill, record its decisions with c4-adr, then check it against the code with c4-drift.
---
<p class="lead">The repository is also a <a href="https://docs.claude.com/en/docs/claude-code/plugins">Claude Code plugin</a>. Its <code>c4-design</code> skill runs an architecture workshop with you <em>before</em> code exists, and keeps the model valid and rendered as it grows. Its <code>c4-adr</code> skill records the architecture decisions linked to the model. Its <code>c4-drift</code> skill compares the model with the code once it exists.</p>

## Install

Requires Node.js 24 or later. In Claude Code:

```text
/plugin marketplace add deka/c4-architecture
/plugin install c4-architecture@c4-architecture
```

> If Claude reports a missing module (`ajv`, `elkjs`), run `npm ci --omit=dev` in the plugin directory.

## Use

Ask Claude in plain words:

> Let's design the architecture of an online shop.

or run `/c4-architecture:c4-design [what to design]`.

## How the workshop runs

Claude asks **one question at a time**, proposes defaults, says when it assumes something, and challenges the design. It goes down the C4 levels in order:

1. **Frame**: the problem, the users, the existing systems, the constraints (team, hosting, budget, deadlines).
2. **System context**, agreed before going deeper.
3. **Containers**, each with a technology. Expect questions such as "does each container earn its operational cost for this team?".
4. **Relationships**, each a verb phrase with a protocol. Vague "Uses" between containers is refused.
5. **Key scenarios** as dynamic views. A step rejected for lack of a relationship is treated as a finding: the static model misses an interaction.
6. **Components**, only when you ask, one container at a time.

After every change, Claude runs `validate`, then `inspect`, addresses or explicitly accepts each warning, then `render`, and tells you what changed in the diagrams.

## Files

By default, the model is written to `docs/architecture/workspace.json` in your project, and the page to `docs/architecture/workspace.html` next to it. Open the HTML file in a browser.

### Comparing options

When you hesitate between designs, Claude puts what they share (people, external systems) in `base.json`, and writes one file per option that [includes](/includes/) it. Each option is rendered to its own page and compared on your constraints.

## Recording decisions

When a structuring decision is taken during the workshop (a choice between options, a technology, a monolith or services), Claude offers to record it as an architecture decision record (ADR). You can also ask *"Record the decision to use PostgreSQL for orders"*, or run `/c4-architecture:c4-adr [decision | ADR number to supersede]`.

Each ADR is a Markdown file in the `decisions/` folder next to the model (`docs/architecture/decisions/0004-use-postgresql-for-orders.md`). A YAML front matter links it to the model:

```markdown
---
status: accepted        # proposed | accepted | rejected | superseded
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

`elements` lists the ids of the model elements the decision concerns. An optional `models` list (`[option-a.json]`) restricts the ADR to some models of the folder. An accepted ADR is never edited: when the decision changes, Claude writes a new ADR that supersedes it, and only updates the status of the old one. The runtime does not read ADRs; `c4-drift` checks them.

## Checking the code against the model

Ask Claude *"Does the code still match the architecture?"*, or run `/c4-architecture:c4-drift [scope]`. The scope is optional: an element id, a view key or plain words ("the payment part"). By default, the whole model is checked.

The model is the reference. Claude compares the relationships at the most detailed level the model describes: for a container without components, only the links that leave or enter it count. It writes two files next to the model, named after it (`workspace.drift.md` and `workspace.drift.json` for `workspace.json`), so each model of a folder keeps its own drift:

- `workspace.drift.md`, a short report with one line per drift, in up to four sections: **Unmodelled** (the code has a link the model lacks), **Differs** (other technology, direction or target), **To do** (planned in the model, not found in the code), **Decisions** (an accepted ADR names an unknown element or contradicts the model, or an ADR has a broken supersede link). For decisions, neither the ADR nor the model is the reference: the report shows the mismatch without saying which one is wrong.
- `workspace.drift.json`, the complete result with code and model locations, for agents that will fix the code or the model.

## Try it from a clone

```sh
git clone https://github.com/deka/c4-architecture.git
cd c4-architecture
npm install
claude --plugin-dir .
```
