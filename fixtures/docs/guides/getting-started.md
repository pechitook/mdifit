# Getting started

How an agent installs and keeps a guide up to date.

![Release flow](../img/flow.svg)

## Install

```ts
import { installGuide } from '@agent-kit/guides'

await installGuide('grokbot', { version: 'latest' })
```

## Keep it current

When a release asks for it, the agent inspects its installation, resolves differences
with the requested guide and verifies the change persisted. See the
[release plan](../plans/release-plan.md) for how releases select agents.

### Troubleshooting

> [!CAUTION]
> Never edit an installed guide by hand: the next release overwrites it.

| Symptom              | Likely cause                  |
| -------------------- | ----------------------------- |
| No release request   | Agent already on that version |
| Request every hour   | `guide.applied` never sent    |

## How a release reaches an agent

```mermaid
flowchart LR
  subgraph Synapse["Synapse"]
    REL["Release command"]
    HB[("Heartbeat reports")]
  end
  subgraph Agent["OpenClaw gateway"]
    CTRL["Control account"]
    CFG[("openclaw.json")]
  end
  REL -->|"selects older versions"| HB
  REL -->|"backchannel request"| CTRL
  CTRL -->|"guide.applied"| REL
  CTRL --> CFG
  classDef gw fill:#fde68a,stroke:#b45309,color:#000;
  class CTRL gw;
```

```mermaid
sequenceDiagram
  participant S as Synapse
  participant A as Agent
  S->>A: Compare guide 2026.10.15 with your setup
  A-->>S: guide.applied
```

```mermaid
flowchart LR
  A --> 
```
