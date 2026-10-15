# Validation plan

Evidence required before enabling each milestone of the
[release plan](release-plan.md#milestones-and-order-of-work).

## M0 · Contracts

- The heartbeat schema has a `guideVersion` field, optional for old agents.
- `guide.applied` is documented with an example payload:

```json
{ "type": "guide.applied", "guide": "grokbot", "version": "2026.10.15" }
```

## M3 · GrokBot pilot

> [!TIP]
> Run the release with `--dry-run` first and compare the selected agents with the
> heartbeat report by hand.

Success means every selected agent confirms within 48 hours and none of the agents that
already had the version receives the request.
