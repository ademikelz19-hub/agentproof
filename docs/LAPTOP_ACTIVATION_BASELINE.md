# LAPTOP ACTIVATION BASELINE

Recorded on: 2026-08-28

## 1. Git Status & Log

- **Git Status:** Clean, initialized Git repository locally.
- **Current Branch:** `master`
- **Latest Log Entry:** `baseline: preserve existing cloud sandbox project state`

## 2. Baseline Verification Results

- **Npm Install:** Successful (audited 90 packages, no errors).
- **Typecheck:** Clean (`tsc --noEmit -p .` passed across all workspaces).
- **Lint:** Passed (Updated scripts to be cross-platform: changed `true` to `echo linting bypassed` to run on Windows).
- **Test Count:** 122 tests passed across the workspaces:
  - `@agentproof/core`: 16 tests passed
  - `@agentproof/probes`: 70 tests passed
  - `@agentproof/reliability`: 13 tests passed
  - `@agentproof/reputation`: 14 tests passed
  - `@agentproof/sources`: 9 tests passed
- **Build Status:** Successful Next.js and workspace build.
- **Production Vulnerabilities:** 0 vulnerabilities found via `npm audit --omit=dev`.

## 3. Project Status Confirmation

All core architectures are present and accounted for:
- npm workspace architecture
- Next.js web application
- Core domain package (`@agentproof/core`)
- Source/ingestion package (`@agentproof/sources`)
- SSRF-safe probe package (`@agentproof/probes`)
- Database package (`@agentproof/db`)
- Reliability engine (`@agentproof/reliability`)
- Reputation-integrity engine (`@agentproof/reputation`)
- Read-only public API routes
- Explorer, passport, and methodology pages
- 122 passing tests.
