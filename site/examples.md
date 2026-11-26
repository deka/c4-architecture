---
title: Examples
summary: Complete C4 models in JSON with every view rendered.
wide: true
---
<p class="lead">Complete models from the <a href="https://github.com/deka/c4-architecture/tree/main/examples"><code>examples/</code></a> directory, with every view rendered by the runtime. Start your own model from one of them.</p>

## Marketplace

A large model, to see how the generated page behaves with volume: an online marketplace with 12 software systems, 7 external systems, about 45 containers and 40 components, and 55 views (12 context, 12 container, 11 component and 19 dynamic views).

<p><a href="/examples/marketplace.html">Open the generated page</a>: the exact file that <code>render</code> writes. Pick a view in the sidebar, click a system or a container to zoom in, use the breadcrumb to zoom out.</p>

{% source "marketplace", true %}

## Online banking

A bank's internet banking system: customers, a mainframe banking system, an email system. Five views from one file: landscape, context, containers, components of the API, and a dynamic view of a transfer. [Open the generated page](/examples/online-banking.html).

{% source "online-banking", true %}

### System landscape

{% diagram "online-banking", "landscape" %}

### System context

{% diagram "online-banking", "context" %}

### Containers

{% diagram "online-banking", "containers" %}

### Components of the API

{% diagram "online-banking", "components" %}

### Dynamic: make a transfer

{% diagram "online-banking", "transfer" %}

## Basic

The smallest useful model: one user, one system with two containers, a context view and a container view. [Open the generated page](/examples/basic.html).

{% source "basic" %}

{% diagram "basic", "context" %}

{% diagram "basic", "containers" %}

## Bookshop

The model built in the [tutorial](/tutorial/), with context, container, component and dynamic views.

{% source "tutorial-4-dynamic", true %}

{% diagram "tutorial-4-dynamic", "containers" %}

{% diagram "tutorial-4-dynamic", "placeOrder" %}

## Render them yourself

```sh
npm run examples   # writes output/<name>.html for every examples/*.json
```
