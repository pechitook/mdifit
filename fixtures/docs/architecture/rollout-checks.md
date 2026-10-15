# Rollout checks

Evidence required before enabling each milestone of the
[queue migration](queue-migration.md#milestones-and-order-of-work).

## M0 · Event contract

- The `order.placed` schema has an `eventId` field, required from day one.
- Every consumer documents its deduplication key with an example payload:

```json
{ "type": "order.placed", "eventId": "01JAB3K9", "orderId": "ord_4821", "total": 129.9 }
```

## M2 · Email worker

> [!TIP]
> Replay yesterday's outbox with `--dry-run` first and compare the emails the worker
> would send with the ones the API sent by hand.

Success means every order gets exactly one confirmation email within 2 minutes and the
dead-letter queue stays empty for a week.
