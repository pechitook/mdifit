# Running workers

How a worker consumes the order queue and keeps processing safe to repeat.

![Order flow](../img/flow.svg)

## Start a worker

```ts
import { createConsumer } from './queue/consumer.ts'

const consumer = createConsumer({ group: 'email', topic: 'order.placed', concurrency: 8 })
await consumer.run(async (event) => sendConfirmation(event.orderId))
```

## Make it idempotent

The broker may deliver a message more than once. Before running a side effect, the worker
records the `eventId` in `processed_events`; if the insert conflicts, the message is a
duplicate and is acknowledged without doing anything. See the
[queue migration](../architecture/queue-migration.md) for the delivery guarantees.

### Troubleshooting

> [!CAUTION]
> Never delete rows from the outbox by hand: the relay may not have published them yet.

| Symptom                   | Likely cause                         |
| ------------------------- | ------------------------------------ |
| Duplicate emails          | `eventId` not recorded before acking |
| Consumer lag keeps rising | A poison message is being retried    |

## How an order reaches a worker

```mermaid
flowchart LR
  subgraph API["Orders API"]
    REQ["POST /orders"]
    DB[("orders + outbox")]
  end
  subgraph Async["Async processing"]
    RELAY["Outbox relay"]
    BROKER[("Broker")]
    WORKER["Email worker"]
    DLQ[("Dead-letter queue")]
  end
  REQ -->|"one transaction"| DB
  RELAY -->|"polls unsent rows"| DB
  RELAY -->|"publishes order.placed"| BROKER
  BROKER --> WORKER
  WORKER -->|"after 5 failures"| DLQ
  classDef worker fill:#fde68a,stroke:#b45309,color:#000;
  class WORKER worker;
```

```mermaid
sequenceDiagram
  participant B as Broker
  participant W as Worker
  participant D as Database
  B->>W: order.placed (eventId 01JAB3K9)
  W->>D: insert into processed_events
  D-->>W: ok
  W-->>B: ack
```

```mermaid
flowchart LR
  A --> 
```
