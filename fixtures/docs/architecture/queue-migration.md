---
title: Guide release plan
status: draft
---

# Guide release plan

October 15, 2026. Proposal for review. The work splits into five milestones and seven
work items under one parent issue. The identifiers U0–U7 are local aliases: no tickets
were created yet.

The goal: publish a versioned guide, activate its release from the CLI, select only the
agents that reported an older version, and ask them through the backchannel to compare
the guide with their setup and adjust it.

Read together with:

- [Validation plan](validation.md): evidence needed to enable each milestone.
- [Getting started](../guides/getting-started.md): how an agent installs a guide.

## Scope of the first delivery

Shared backend in Synapse, an admin command in devscripts and a short contract in
agent-kit. Version the nine current guides; enable the reconciliation mechanism first on
GrokBot and check it afterwards on Dot.

> [!NOTE]
> The guide describes the current state. Do not add a changelog or per-version
> migration steps.

## Milestones and order of work

| Milestone            | Items  | Depends on |
| -------------------- | ------ | ---------- |
| M0 · Contracts       | U0, U1 | —          |
| M1 · Synapse backend | U2, U3 | M0         |
| M2 · devscripts CLI  | U4     | M1         |
| M3 · GrokBot pilot   | U5, U6 | M2         |

```bash
devscripts guides release grokbot --version 2026.10.15 --dry-run
```

## Contracts to settle first

1. The heartbeat reports the applied guide version.
2. The release command selects agents with an **older** version only.
3. An agent confirms with `guide.applied` once it verified the change.

- [x] Draft the heartbeat field
- [ ] Agree on the confirmation event name
- [ ] Decide what happens with agents that never reported a version

## Recovery and operating limits

If an agent does not answer the backchannel, Synapse marks the version as pending and
retries the request with exponential backoff for 24 hours. After that the agent is left
out of the release and its owner is notified.

> [!WARNING]
> The initial limit is 50 agents per release, to be revisited after the Dot pilot.

Verification errors are logged by the agent and shown in the Synapse releases panel.
