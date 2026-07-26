# ADR-00010: GitHub Actions Supply-Chain Hardening

Status: Accepted
Date: 2026-07-26

## Context

`ci.yml` and `repo-health.yml` reference third-party GitHub Actions (`actions/checkout`, `pnpm/action-setup`, `gitleaks/gitleaks-action`, and others) by mutable version tag — `@v6`, `@v3`, and so on. A tag is just a label the upstream repo owner points at a commit; it isn't immutable. If that repo's maintainer account or CI is compromised, an attacker can retag `v6` to point at a different, malicious commit, and every workflow that trusts `@v6` runs that code on its next trigger — with whatever secrets and permissions the job has. This isn't hypothetical: the `tj-actions/changed-files` incident (March 2025) was exactly this pattern, and it exfiltrated CI secrets from a large number of repos that trusted the moved tag.

SHA-pinning (referencing `owner/action@<full-commit-sha>` instead of a tag) closes this specific hole: a SHA is content-addressed and can't be silently repointed. Adopting this had been deferred once already (see `AGENTS.md`'s history) until CI was confirmed working end-to-end on GitHub with the unpinned refs — that confirmation happened, so this is the follow-up.

Two problems come with pinning by hand: (1) a pinned SHA is unreadable on its own, so drift-tracking and future updates need tooling, not eyeballing a hex string; and (2) pinning is only as good as the guarantee that nobody quietly reverts it back to a tag in some future PR — that needs an enforced check, not a one-time cleanup.

## Options Considered

1. **Do nothing / leave tags as-is** — simplest, but leaves the exact supply-chain hole described above open indefinitely.
2. **Pin by hand, once, with no ongoing enforcement** — closes the hole today but doesn't stop it from quietly reopening (someone edits a workflow, uses a tag out of habit, nothing catches it) or from going stale (pinned SHAs never update without a human noticing).
3. **Pin by hand + automate both maintenance and enforcement** — pin every current action ref to its SHA now (with a trailing `# vX.Y.Z` comment for readability); use Renovate's `helpers:pinGitHubActionDigestsToSemver` preset (Renovate is already installed, per ADR-00009) to keep those pins current via normal reviewable PRs as new versions release; add `zizmor` (a free, OSS GitHub Actions security linter) as a blocking CI job specifically for its `unpinned-uses` audit, so a reverted pin fails the build instead of merging silently. Chosen.
4. **A paid supply-chain platform** (e.g. StepSecurity) that manages pinning and monitoring as a service — rejected on the same free-tools-unless-compelling-reason grounds as ADR-00009; `zizmor` + Renovate covers the same core guarantee (pinned, verified, kept current) at no cost.

## Decision

Adopted option 3:

- Every `uses:` line in `ci.yml` and `repo-health.yml` is pinned to a full commit SHA with a `# vX.Y.Z` (or the action's own tagging scheme, e.g. `# v2` where no finer-grained tag exists) trailing comment.
- `zizmor` runs as its own blocking job in `ci.yml` (`advanced-security: false` — no GitHub Advanced Security / SARIF upload, so no extra `security-events: write` permission is needed) on every push and PR. Unlike Semgrep/Bearer's app-code findings (ADR-00009: warn-only, because those carry real false-positive judgment calls), an unpinned or reverted action reference is unambiguous — there's nothing to weigh, so this blocks.
- `renovate.json` extends `helpers:pinGitHubActionDigestsToSemver`, so new action releases arrive as normal Renovate PRs that bump the pinned digest (keeping the semver comment in sync) rather than requiring manual re-resolution.
- While pinning `google/osv-scanner-action`, discovered its `repo-health.yml` reference (`@v2`) didn't resolve to anything — that repo publishes only exact patch tags (`v2.3.8`, ...), no moving major-version alias. This was a latent bug: `repo-health.yml` only runs on a weekly schedule or manual dispatch, so it had never actually been exercised since that job was added. Fixed as part of the same pinning pass (pinned to the SHA behind the documented `v2.3.8` ref).
- Also applied `persist-credentials: false` to every `actions/checkout` step (a `zizmor` finding, `artipacked`): by default, checkout leaves the job's git credentials persisted on disk after the step runs, which a later compromised dependency or script could read and use. None of our jobs need to push or authenticate to git after checkout, so there's no cost to disabling it.

## Consequences

Workflow files are slightly noisier (40-character hashes instead of `v6`), and a bare tag can no longer be dropped in by habit without `zizmor` catching it in CI — that friction is the point. Updating an action now goes through a Renovate PR with a digest bump rather than a one-line tag edit, which is a small process change but not a new manual burden, since Renovate was already the update path for every other dependency in this repo. `zizmor`'s other audits (beyond `unpinned-uses`) also run as part of the same blocking job; if one of those produces a finding we judge to be a false positive later, narrowing `zizmor`'s scope (via its `min-severity`/`min-confidence` inputs or a config file) is the documented escape hatch rather than disabling the job outright.
