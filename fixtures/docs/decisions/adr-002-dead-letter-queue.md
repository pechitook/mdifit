# ADR-002: Dead-letter queue per consumer

Status: proposed · 2026-10-14

## Context

A message that always fails (a malformed payload, a deleted product) is redelivered
forever and blocks the consumer behind it.

## Decision

Each consumer group gets its own dead-letter queue. After five failed attempts the broker
moves the message there with the last error attached.

| Option                | Isolation | Replay effort  |
| --------------------- | --------- | -------------- |
| One shared DLQ        | Low       | Filter by hand |
| One DLQ per consumer  | High      | One command    |
| Drop after N attempts | —         | Impossible     |

## Open questions

- [ ] Alert on DLQ depth, on age of the oldest message, or both?
- [ ] Who owns replaying a payment that failed for a reason now fixed?
