# AgentProof 🛡️

**The Independent Reliability &amp; Reputation Layer for Autonomous AI Agents on BNB Chain.**

[![AgentProof Badge](https://agentproof-rho.vercel.app/api/v1/agents/bsc/bsc:2518/badge.svg)](https://agentproof-rho.vercel.app/agents/bsc/bsc:2518)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![BNB Chain](https://img.shields.io/badge/Network-BNB%20Chain%20(56)-F0B90B.svg)](https://bnbchain.org)
[![CORS Enabled](https://img.shields.io/badge/CORS-Enabled%20(*)-10b981.svg)](https://agentproof-rho.vercel.app/docs)

---

## 🌐 Live Application &amp; API

- **Dashboard**: [agentproof-rho.vercel.app](https://agentproof-rho.vercel.app)
- **API Reference**: [agentproof-rho.vercel.app/docs](https://agentproof-rho.vercel.app/docs)
- **Health Check**: [agentproof-rho.vercel.app/api/v1/health](https://agentproof-rho.vercel.app/api/v1/health)

---

## 💡 The Problem AgentProof Solves

As autonomous AI agents deploy across BNB Chain to execute trades, manage funds, and orchestrate DeFi interactions, **orchestrators and users face an information asymmetry crisis**:
1. **Self-Reported Uptime is Fake**: Agents claim 99.9% uptime, but their actual endpoints fail, hang, or return 500s.
2. **Review Sybils**: Anyone can generate dozens of fake feedback reviews onchain to game trust scores.
3. **Financial Risk**: When an autonomous workflow delegates payment or custody to an unresponsive agent, funds get locked or transactions fail silently.

**AgentProof is the objective verification layer.** We independently probe agent service endpoints (HTTP, A2A, MCP), log verifiable timestamped observations, compute mathematical sliding reliability windows (24h, 7d, 30d), and expose a free public API for any orchestrator or marketplace.

---

## 🏗️ Architecture

```
┌──────────────────┐       ┌───────────────────────┐       ┌──────────────────────┐
│  BNB Chain (56)  │──────▶│   Ingestion & Probing  │──────▶│   Neon Postgres DB   │
│ (ERC-8004 Agents)│       │  (Rate-limited Prober) │       │ (Append-Only Evidence│
└──────────────────┘       └───────────────────────┘       └──────────────────────┘
                                                                       │
                                   ┌───────────────────────────────────┘
                                   ▼
                       ┌────────────────────────┐
                       │ Public REST API (v1)   │
                       │ • CORS Enabled (*)     │
                       │ • 24h/7d/30d Rollups   │
                       │ • Dynamic SVG Badges   │
                       └────────────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
┌───────────────────────────┐             ┌───────────────────────────┐
│ Next.js 15 Web Dashboard  │             │ 3rd-Party Integrations    │
│ (Agent Explorer & Charts) │             │ (AgentFlow, Orchestrators)│
└───────────────────────────┘             └───────────────────────────┘
```

---

## ⚡ Quickstart: Querying Reliability in Code

### TypeScript / Node.js
```ts
// Guard check before delegating an onchain task or payment
async function isAgentAvailable(agentId: string): Promise<boolean> {
  const res = await fetch(`https://agentproof-rho.vercel.app/api/v1/agents/bsc/${agentId}/reliability`);
  if (!res.ok) return false;
  const { data } = await res.json();
  const w24 = data?.windows?.['24h'];
  return (w24?.availabilityPct ?? 0) >= 90.0 && (w24?.consecutiveFailures ?? 0) === 0;
}
```

### Python
```python
import requests

def is_agent_healthy(agent_id: str) -> bool:
    resp = requests.get(f"https://agentproof-rho.vercel.app/api/v1/agents/bsc/{agent_id}/reliability", timeout=3)
    if resp.status_code != 200:
        return False
    w24 = resp.json().get("data", {}).get("windows", {}).get("24h", {})
    return w24.get("availabilityPct", 0) >= 90.0 and w24.get("consecutiveFailures", 0) == 0
```

### cURL
```bash
curl -s "https://agentproof-rho.vercel.app/api/v1/agents/bsc/bsc:2518/reliability" | jq
```

---

## 🏷️ Embed Live Status Badges

Add a live, auto-updating uptime badge to any GitHub README or dApp:

```markdown
[![AgentProof](https://agentproof-rho.vercel.app/api/v1/agents/bsc/bsc:2518/badge.svg)](https://agentproof-rho.vercel.app/agents/bsc/bsc:2518)
```

---

## 📦 Monorepo Structure

- `apps/web`: Next.js 15 App Router web application & public API.
- `packages/core`: Domain entities, validation boundaries, and chain interfaces.
- `packages/probes`: Rate-limited probers for HTTP reachability, latency, and protocol validity.
- `packages/reliability`: Pure sliding-window aggregation algorithms (24h, 7d, 30d).
- `packages/reputation`: Concentration indexing (Herfindahl) and Sybil detection signals.
- `packages/sources`: Adapters for ERC-8004 indexers and onchain RPC providers.
- `packages/db`: Drizzle ORM schema and Neon PostgreSQL client.

---

## 🛡️ License

MIT © [AgentProof Team](https://github.com/ademikelz19-hub/agentproof)
