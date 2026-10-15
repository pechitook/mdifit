---
title: Move order processing to a queue
status: draft
---

# Move order processing to a queue

October 15, 2026. Proposal for review. The work splits into four milestones and seven
work items under one parent issue. The identifiers W0–W6 are local aliases: no tickets
were created yet.

The goal: take payment capture, stock reservation and confirmation emails out of the
`POST /orders` request, publish an `order.placed` event instead, and let workers process
it with at-least-once delivery.

Read together with:

- [Rollout checks](rollout-checks.md): evidence needed to enable each milestone.
- [Running workers](../guides/running-workers.md): how a worker consumes the queue.
- [ADR-001](../decisions/adr-001-transactional-outbox.md): why an outbox and not a dual write.

## Scope of the first delivery

An outbox table in the orders database, a relay that publishes it and one consumer group
per side effect. Migrate the current side effects; move email confirmations first and
payment capture last, once retries are proven on staging.

> [!NOTE]
> The API keeps answering `201 Created` as today. Clients see no contract change.

## Milestones and order of work

| Milestone           | Items  | Depends on |
| ------------------- | ------ | ---------- |
| M0 · Event contract | W0, W1 | —          |
| M1 · Outbox + relay | W2, W3 | M0         |
| M2 · Email worker   | W4     | M1         |
| M3 · Payment worker | W5, W6 | M2         |

```bash
./scripts/replay-outbox --since 2026-10-15T00:00Z --dry-run
```

## Contracts to settle first

1. Every event carries an `eventId`; consumers deduplicate on it.
2. A worker acknowledges a message only **after** its side effect is committed.
3. A message that fails five times moves to the dead-letter queue.

- [x] Draft the `order.placed` schema
- [ ] Agree on the idempotency key for payment capture
- [ ] Decide who gets paged when the dead-letter queue grows

## Retries and operating limits

If a worker fails, the broker redelivers the message with exponential backoff for up to
24 hours. After that it lands in the [dead-letter queue](../decisions/adr-002-dead-letter-queue.md)
and the on-call engineer is notified.

> [!WARNING]
> The initial limit is 50 messages per second per consumer, to be revisited after the
> email pilot.

Processing errors are logged with their `eventId` and shown on the queue dashboard.
