# C4 modelling guide

## Levels

| Level | Element | What it is | View |
|---|---|---|---|
| 1 | Person | A human user or role ("Customer", "Back-office agent"), not an individual. | `systemContext`, `systemLandscape` |
| 1 | Software system | Something that delivers value to people and is owned by one team or organisation. The system being designed, or one it depends on. | `systemContext`, `systemLandscape` |
| 2 | Container | A separately deployable or runnable unit that executes code or stores data: web app, mobile app, API, worker, database, bucket, queue/topic. **Not** a Docker container in the strict sense. | `container` |
| 3 | Component | A grouping of related functionality behind an interface, inside one container (module, package, service class). | `component` |

A view shows one level, plus the neighbours that are directly connected to it.

## Deciding what is what

- **System or container?** If another team owns it, or users see it as a product of its own, it is a software system. If it is deployed as part of what you are designing, it is a container.
- **External systems** (`external: true`) are owned by someone else: payment providers, email services, a partner's API, another department's ERP. They are drawn in grey.
- **Data stores are containers** of the system that owns them, not systems. Tag them (e.g. `"tags": ["Database"]`) and style the tag with `"shape": "cylinder"`.
- **Queues and topics**: one container per broker or per significant topic, tagged and styled with `"shape": "pipe"`. Draw the publish and consume relationships through it.
- **Front ends**: a web front end is a container (`"shape": "webBrowser"`), as is a mobile app (`"shape": "mobileDevicePortrait"`).

## Writing elements

- `name`: short and specific ("Order API", not "Backend").
- `description`: one sentence on its responsibility ("Takes and tracks customer orders").
- `technology` (containers and components): the main technology choice ("Go", "React", "PostgreSQL 16", "Kafka").
- `id`: stable, camelCase, meaningful (`orderApi`). Ids are referenced everywhere: renaming one means updating every relationship and view.

## Writing relationships

- Direction follows the initiator of the interaction: the caller points to the callee; a publisher points to the topic; a consumer points to the topic it reads from ("Consumes order events from").
- `description` is a verb phrase that reads as a sentence with both ends: *Web app* → "Places orders using" → *Order API*.
- `technology` between containers: protocol and format ("HTTPS/JSON", "gRPC", "SQL/TCP", "AMQP").
- Declare relationships at the most detailed level you model. Relationships between parents are derived automatically (implied relationships), so do not also declare them at the system level.

## Anti-patterns to challenge

- Mixing levels in one view (a component next to systems).
- A "Database" or "Kafka" modelled as a software system.
- Missing external systems: identity provider, payment, email/SMS, monitoring the business depends on.
- A shared database written by several containers without the user saying it is intended.
- One container per entity ("User service", "Product service"…) for a small team: ask what each split buys.
- Vague relationships ("Uses", "Calls") and relationships with no description.
- Going down to components before the containers are agreed.
- A view with more than ~20 elements: split it, or exclude elements from it.
