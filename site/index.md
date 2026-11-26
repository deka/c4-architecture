---
title: Overview
---
<div class="hero">
<h1>C4 diagrams and ADRs as code</h1>
<p class="subtitle">Agents read everything. Humans read what matters.</p>
<p class="lead">Describe your <a href="https://c4model.com/">C4</a> architecture in strict JSON, or design it with Claude. Get one self-contained HTML page of SVG diagrams, and architecture decision records linked to the model.</p>
<div class="actions">
<a class="button primary" href="/tutorial/">Start the tutorial</a>
<a class="button" href="/c4-model/">What is C4?</a>
<a class="button" href="/schema/">Schema reference</a>
</div>
</div>

## A model in 30 lines

{% source "basic" %}

{% diagram "basic", "containers" %}

<p class="note">The <strong>C4 model</strong> is the work of <strong>Simon Brown</strong>: see <a href="https://c4model.com/">c4model.com</a>. The JSON format borrows its concepts from <a href="https://structurizr.com/">Structurizr</a>, also by Simon Brown. This project only implements them; read the original for the full method.</p>

## Highlights

<div class="cards">
<div class="card"><h3>Designed with Claude</h3><p>A Claude Code plugin: design the model in a conversation, record its decisions, diff it against the code. See <a href="/claude-code/">Claude Code plugin</a>.</p></div>
<div class="card"><h3>ADRs linked to the model</h3><p>One Markdown file per decision, listing the element ids it concerns. Never edited, only superseded. <code>c4-drift</code> flags those the model contradicts.</p></div>
<div class="card"><h3>Strict schema</h3><p>Closed objects and enums: an agent writes a valid model without guessing. Errors point to a JSON Pointer.</p></div>
<div class="card"><h3>One model, every view</h3><p>Declare elements and relationships once. Context, container, component and dynamic views are derived and never contradict each other.</p></div>
<div class="card"><h3>One HTML file</h3><p>Inline SVG, embedded font, no JavaScript, CSP <code>default-src 'none'</code>. Open it anywhere, commit it next to the code.</p></div>
<div class="card"><h3>Readable without pixels</h3><p><code>inspect</code> lists what each view shows, so an agent checks its diagrams without seeing them.</p></div>
</div>

## Quick start

You need [Node.js](https://nodejs.org/) 24 or later.

### With Claude Code

```text
/plugin marketplace add deka/c4-architecture
/plugin install c4-architecture@c4-architecture
```

Then ask Claude *"Let's design the architecture of an online shop"*, or run `/c4-architecture:c4-design`. See [Claude Code plugin](/claude-code/).

### From the command line

```sh
git clone https://github.com/deka/c4-architecture.git
cd c4-architecture
npm install
node src/cli.ts render examples/online-banking.json diagrams.html
```

Open `diagrams.html` in a browser. See [Command line](/cli/).

## Where to go next

- New to C4? Read [The C4 model](/c4-model/).
- Write your first model step by step in the [Tutorial](/tutorial/).
- Look up a field in the [JSON schema reference](/schema/).
- Record architecture decisions with [`c4-adr`](/claude-code/#recording-decisions).
- Coming from Structurizr? See [Compared to Structurizr](/structurizr/).
