---
title: 'ADR-001: Transactional outbox'
status: accepted
date: 2026-10-08
---

# ADR-001: Transactional outbox

## Context

`POST /orders` writes the order and then calls three services. When one of them times
out, the order exists but its side effects do not, and nobody retries them.

## Decision

Write the order and an `outbox` row in the same database transaction. A relay polls the
outbox, publishes each row to the broker and marks it as sent.

## Consequences

- Publishing is at-least-once: a relay crash after publishing and before marking the row
  sends the event again, so every consumer must be idempotent.
- The outbox table needs a cleanup job; rows older than 7 days are deleted.
- Events for one order are published in commit order, not in wall-clock order.
