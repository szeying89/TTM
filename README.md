# Intel-Threat-Modeller

An automated, ground-truth-driven threat-modelling platform built on Adam Shostack's four-question framework:

| Question | Agent(s) |
|---|---|
| Q1 — What are we working on? | **Architect**: extracts components, dataflows, trust boundaries |
| Q2 — What can go wrong? | **Threat**: STRIDE x MITRE ATT&CK hybrid kill-chain generation |
| Q3 — What are we going to do about it? | **Risk + Mitigation**: scoring (rubric + CRI Profile context + threat-intel adjustment), control gaps, recommendations |
| Q4 — Did we do a good job? | **Validation + Reporting**: invariant checks, multi-audience reports |

Upload a system design document (prose, Mermaid diagram, or both), fill in project context (including your organization's CRI Profile maturity tiers), optionally attach threat-intel feeds (a URL or a PDF advisory), and the pipeline produces a complete threat model: a data-flow diagram, entity-anchored attack paths grounded in MITRE ATT&CK / ATLAS / ICS, prioritised control gaps, mitigation recommendations, a deterministic confidence score, and multi-audience reports (Executive, CISO, Technical) you can browse in the web UI or export in a range of formats.

The goal is to compress what a senior threat modeller would spend a week producing into a few minutes of compute — without hand-waving. Every attack path is grounded in retrieved technique chunks from a vetted knowledge base, every inapplicable threat carries an explicit rationale, and every assumption is audited. The LLM augments deterministic rule-engine coverage; it does not replace it.

## Architecture

### The multi-agent pipeline

A single orchestrator (`artifacts/api-server/src/orchestrator/runPipeline.ts`) drives a DAG of specialist agents. Each agent is a self-contained module that registers a descriptor (name, dependsOn, outputs, handler) with the registry in `artifacts/api-server/src/agents/registry.ts`. The orchestrator walks the DAG in dependency waves, runs each wave in parallel, and records every step in the `pipeline_steps` ledger.

```
                      ┌──────────────┐
                      │  Architect   │  parses design doc + Mermaid into
                      └──────┬───────┘  components, dataflows, trust boundaries
                             │
                             ▼
                      ┌──────────────┐  rule-pack pass + STRIDE LLM generator
                      │    Threat    │  + other-threats pass → entity-anchored
                      └──────┬───────┘  attack paths, kill chains, evaluations
                             │
                             ▼
                      ┌──────────────┐  scores likelihood x impact (rubric +
                      │     Risk     │  CRI Profile context + intel-feed
                      └──────┬───────┘  adjustment), ranks paths, risk heatmap
                      ┌──────┴───────┐
                      ▼              ▼
              ┌──────────────┐ ┌────────────────┐
              │  Mitigation  │ │ Design-Enrich  │  control recommendations,
              └──────┬───────┘ └────────┬───────┘  assumptions, deltas
                     │                  │
                     └────────┬─────────┘
                              ▼
                      ┌──────────────┐  invariant checks (entity anchoring,
                      │  Validation  │  group keys, not-applicable rationales)
                      └──────┬───────┘
                             ▼
                      ┌──────────────┐  Executive / CISO / Technical
                      │  Reporting   │  PDF, Markdown, JSON, threat-model.md,
                      └──────────────┘  MITRE Navigator layer, risk-register CSV
```

A separate, on-demand **intel-feed ingestion** service (`artifacts/api-server/src/intel/`) lets a user submit a URL or upload a PDF at any time; extracted signals (active exploitation, threat-actor targeting, CVE severity, sector relevance) are linked to MITRE techniques/components and feed into the Risk agent's scoring adjustment.

### Agents at a glance

| Agent | Consumes | Emits |
|---|---|---|
| Architect | Raw design doc + Mermaid | Components, dataflows, trust boundaries |
| Threat | System model + framework selection | Attack paths (STRIDE-categorized), kill chains, threat evaluations, gaps |
| Risk | Attack paths + CRI Profile context + intel signals | Likelihood x impact scoring, ranking, heatmap |
| Mitigation | Ranked paths + gaps | Recommendation candidates, control families (NIST 800-53 + CRI Profile mapping) |
| Design-Enrich | Ranked paths | Assumptions, dataflow refinements, design deltas |
| Validation | Mitigations + enrichment | Invariant findings, coverage critic, pivot-node detection |
| Reporting | All of the above | Multi-format reports + confidence score |

## Monorepo layout

```
packages/contracts/    shared Zod schemas + inferred TS types
packages/llm-client/   provider-agnostic LLM client (default: Anthropic Claude)
packages/embeddings/   provider-agnostic embedding client (default: Voyage AI)
artifacts/api-server/  Fastify backend: orchestrator, agents, DB, REST API
frontend/              Next.js web UI
mcp-server/            MCP server exposing the pipeline as tools
kb/ingest/             MITRE ATT&CK / ATLAS / ICS corpus ingestion (STIX -> chunks -> embeddings)
fixtures/              sample design docs + Mermaid diagrams for smoke tests
```

## Development

```
pnpm install
docker compose up -d          # Postgres + pgvector
pnpm build
pnpm test
```

See `.env.example` for required environment variables.
