# Business Model (Hypothesis)

None of this is validated. No paying customers exist. These are
structured hypotheses for a grant reviewer or future team member to test —
not claims of revenue or traction.

## PUBLIC — Reliability Passports

- **Buyer**: nobody pays; this is the free, public good that builds the
  data moat and distribution.
- **Pain addressed**: anyone evaluating an ERC-8004 agent currently has no
  independent way to know if the advertised service actually works.
- **Value**: a public URL per agent showing measured evidence.
- **Pricing metric**: N/A (free).
- **Distribution**: organic — linked from agent registries/marketplaces,
  shared by agent operators who want to demonstrate reliability, indexed
  by search.

## DEVELOPER — API access / extended history

- **Buyer**: developers building on top of ERC-8004 agents (wallets,
  marketplaces, agent frameworks) who want reliability evidence
  programmatically.
- **Pain**: building your own probe infrastructure per-integration is
  wasted duplicate effort.
- **Value**: a single API for evidence across the ecosystem, with more
  history/higher rate limits than the free tier.
- **Pricing metric**: API calls/month or history depth (e.g. 30d free,
  1yr+ paid).
- **Distribution**: developer docs, `/developers` page, direct outreach to
  ERC-8004-adjacent projects (starting with AgentFlow — see
  `docs/AGENTFLOW_INTEGRATION.md`).

## MONITOR — Continuous monitoring + alerts

- **Buyer**: agent operators who want to know immediately when their own
  service goes down (self-monitoring) or integrators who want alerts on
  agents they depend on.
- **Pain**: currently no independent alerting exists for ERC-8004 agent
  uptime.
- **Value**: webhook/email alerts on reliability degradation, configurable
  thresholds.
- **Pricing metric**: per-agent/month or tiered by number of monitored
  agents.
- **Distribution**: upsell from Developer tier once alerting is built (not
  yet — this requires a notification system that doesn't exist in V0).

## ENTERPRISE — Bulk feeds / custom policies / SLA

- **Buyer**: larger platforms (exchanges, wallets, insurers) that need
  reliability evidence across many agents at once, with contractual
  guarantees.
- **Pain**: ad-hoc API calls don't scale for a platform serving its own
  large user base; enterprises also often need custom reliability
  policies (e.g. "flag anything under 99% 30d availability").
- **Value**: bulk/batch evidence feeds, custom policy rules, an SLA on
  AgentProof's own uptime.
- **Pricing metric**: contract-based, likely per-feed or flat monthly.
- **Distribution**: direct sales, once Developer-tier usage demonstrates
  demand.

## PROTOCOL/MARKETPLACE — Embedded evidence infrastructure

- **Buyer**: ERC-8004-adjacent protocols or agent marketplaces that want
  reliability evidence built into their own product (e.g. showing an
  AgentProof-sourced badge next to every listed agent).
- **Pain**: building reliability infrastructure isn't these platforms'
  core competency; they'd rather integrate than build.
- **Value**: white-label or embedded evidence widget/API, positioning
  AgentProof as ecosystem infrastructure rather than a standalone
  destination.
- **Pricing metric**: revenue share, flat licensing, or free (as
  ecosystem infrastructure funded by grants) depending on strategic
  positioning — genuinely unresolved and worth discussing with early
  design partners rather than assuming here.
- **Distribution**: partnerships, starting with whichever ERC-8004
  marketplace/registry has the most existing agent-operator relationships.

## Sequencing hypothesis (not a roadmap commitment)

PUBLIC first (data moat + distribution) → DEVELOPER (first real revenue
test, low-friction) → MONITOR (natural upsell once alerting exists) →
ENTERPRISE/PROTOCOL (once Developer-tier usage proves the API has real
consumers). This is a reasonable default ordering, not a committed plan.
