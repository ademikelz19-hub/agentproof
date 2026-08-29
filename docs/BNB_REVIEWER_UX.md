# AgentProof — 3-Minute BNB Grant Reviewer Guide

This guide is designed for grant reviewers, developers, and ecosystem evaluators assessing AgentProof in approximately 3 minutes.

---

### ⏱️ Minute 0:00 – 0:30: Understand the Core Problem & Solution

1. Open the Homepage: **[`https://agentproof-rho.vercel.app`](https://agentproof-rho.vercel.app)**
2. **What AgentProof Does**: ERC-8004 proves onchain agent identity. AgentProof continuously and independently measures whether advertised endpoints (HTTP, A2A, MCP) actually respond, how fast they respond, and how diverse their reviewers are.
3. **Live Network Telemetry**: Notice the live cards showing genuine numbers queried directly from Neon PostgreSQL (Monitored Agents, Append-Only Observations, Services, and Latest Probe Run).
4. **Zero Fluff**: No fabricated uptime counters, no synthetic testimonials, no meaningless AI gradient animations.

---

### ⏱️ Minute 0:30 – 1:15: Inspect the Live Agent Explorer

1. Navigate to **[`/agents`](https://agentproof-rho.vercel.app/agents)** or click "Explore Live Agents".
2. **Search & Filter**: Type `316380` into the search bar or filter by "With Services".
3. **Observe**: Real BSC onchain token IDs (e.g. `bsc:316380`, `bsc:316381`), declared protocols, and provenance badges (`INDEXER: 8004scan`).
4. Click on **`bsc:316380`** to open its signature Reliability Passport.

---

### ⏱️ Minute 1:15 – 2:00: Evaluate the Reliability Passport

1. URL: **[`/agents/bsc/bsc:316380`](https://agentproof-rho.vercel.app/agents/bsc/bsc:316380)**
2. **Empirical Windows**: Look at the 24h, 7d, and 30d sliding window cards. Notice the explicit `LIMITED EVIDENCE` sufficiency badge — AgentProof never pretends a preliminary sample is a statistically mature SLA.
3. **Observation Streak Bar**: Hover over the interactive latency bars to inspect individual probe timestamps and millisecond response times.
4. **Reputation & Reviewer Diversity**: Scroll to the reputation section to see the Herfindahl-Hirschman diversity ratio and non-accusatory integrity signals (e.g., `LOW_REVIEWER_DIVERSITY`).
5. **Observation Ledger**: Review the forensic table of individual probe outcomes with HTTP status codes and methodology version tags.

---

### ⏱️ Minute 2:00 – 2:30: Inspect the Transparent Methodology

1. Navigate to **[`/methodology`](https://agentproof-rho.vercel.app/methodology)**.
2. **Deterministic Formulas**: See the exact mathematical definitions for availability and latency percentiles.
3. **SSRF Security Model**: Read the 5-layer probe defense specification (DNS pinning, RFC1918 private IP blocklist, AWS/GCP metadata blocking, ethical rate limits).
4. **Explicit Non-Claims**: Note the transparent distinction: "Reachability is not proof of internal reasoning correctness."

---

### ⏱️ Minute 2:30 – 3:00: Test the Developer API & GitHub

1. Navigate to **[`/developers`](https://agentproof-rho.vercel.app/developers)**.
2. Click "Copy curl" on any route and run it in a terminal, or open:
   - **`https://agentproof-rho.vercel.app/api/v1/agents?chain=bsc&limit=5`**
   - **`https://agentproof-rho.vercel.app/api/v1/agents/bsc/bsc:316380/reliability`**
3. **Source Code**: Visit the open repository at **[`https://github.com/ademikelz19-hub/agentproof`](https://github.com/ademikelz19-hub/agentproof)** to inspect the 122 unit tests, CI workflows, and Drizzle/Neon database migrations.

---

### Summary Checklist for Evaluators

| Criteria | AgentProof Evidence | Verification |
|---|---|---|
| **Ecosystem Relevance** | Native to BNB Chain (Chain ID 56) & ERC-8004 | Verified via live BSC agent token IDs |
| **Real Measurements** | 260+ genuine observations written to Neon PostgreSQL | Verified via `/reliability` endpoint and UI |
| **Autonomous Operation** | Runs hourly via GitHub Actions without owner's laptop | Verified via GitHub Actions Run `33248038695` |
| **Security & Safety** | 36 adversarial SSRF tests passing; zero CVEs | Verified via `packages/probes` test suite |
| **Developer Composability** | Free read-only JSON API with stable error schemas | Verified live on production Vercel deployment |
