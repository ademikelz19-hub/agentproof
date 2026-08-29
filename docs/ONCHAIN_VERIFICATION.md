# On-Chain ERC-8004 Verification Report

This document reports the verification results comparing indexer data from 8004scan against on-chain smart contract facts on the BNB Smart Chain (BSC).

## Verification Methodology

We queried the live BSC mainnet JSON-RPC endpoint (`https://bsc-dataseed.binance.org`) directly via `eth_call` to read the official Identity Registry contract `0x8004a169fb4a3325136eb29fa0ceb6d2e539a432`.

For chosen agents, we checked:
- **Owner Address:** via `ownerOf(uint256)` (selector `0x6352211e`)
- **Metadata URI:** via `tokenURI(uint256)` (selector `0xc87b56dd`)

---

## Agent Sample 1: Zkgev3te3 (Token ID: 315182)

- **Registry Address:** `0x8004a169fb4a3325136eb29fa0ceb6d2e539a432`
- **8004scan Owner:** `0xf9bf86041c16ad69335116d93efaa98543a237a0`
- **On-chain Owner:** `0x792e748775c930692c873ad9e96b2a6a84a6bb73` (Note: owner address discrepancy observed. The token has likely been transferred or is delegated on-chain, while the indexer reports the registration/original owner).
- **8004scan URI:** `https://metadata.evoevo.ai/agents/4704017`
- **On-chain URI:** `https://metadata.evoevo.ai/agents/4704223` (Note: URI update on-chain has occurred, showing that the indexer has a lag or tracks original metadata).

---

## Agent Sample 2: Ethgev4tas7t2nr5 (Token ID: 315177)

- **Registry Address:** `0x8004a169fb4a3325136eb29fa0ceb6d2e539a432`
- **8004scan Owner:** `0x6c11b4a41d9bddf3fa69b9b08d9c4ad8c0acbfde`
- **On-chain Owner:** `0x6c11b4a41d9bddf3fa69b9b08d9c4ad8c0acbfde` (Perfect Match)
- **8004scan URI:** `https://metadata.evoevo.ai/agents/4704023`
- **On-chain URI:** `https://metadata.evoevo.ai/agents/4704023` (Perfect Match)

---

## Findings

1. **Indexer Lag:** Indexers such as 8004scan can exhibit latency or discrepancy when an agent's URI is updated or the ERC-721 token representing the agent is transferred on-chain.
2. **Distinct Concepts:** AgentProof maintains a clear distinction between:
   - **ONCHAIN FACT:** Real-time state directly from the RPC nodes (`ownerOf`, `tokenURI`).
   - **INDEXER DATA:** Aggregated representations returned by upstream APIs (e.g. 8004scan).
   - **AGENT METADATA:** The content of the resolved JSON registration file.
   - **AGENTPROOF MEASUREMENT:** Uptime, availability, latency, and protocol compliance observed directly by the AgentProof probe engine.
