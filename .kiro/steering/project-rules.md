# Campus Event Finder — Project Rules

These rules apply to every phase of work on this project.

## Product

Monorepo: client (React 18, TypeScript, Vite, Tailwind, Radix), server (Express, TypeScript, Prisma, PostgreSQL, zod), shared (types and service interfaces).

Features that must behave as they do today unless a phase explicitly changes them: events discovery, directions, registration, sports sessions, follows, saved events, notifications, reminders, JWT auth.

## Behavior

- Do not change features, user flows, layout, or visual design unless the current phase explicitly says so.
- Make the smallest change that fixes each issue. No unrelated refactors, renames, or formatting sweeps.
- If a finding in a phase is not reproducible, say so with evidence. Do not force a change.
- If a fix needs a schema change, a new dependency, or an API contract change that the phase did not list, stop and ask first.

## Engineering Standards

- TypeScript strict. No `any`, no `@ts-ignore` without a comment explaining why.
- Validate all external input (body, query, params) on the server with zod. Never trust the client.
- Configuration comes from validated environment variables (twelve-factor). No hard-coded secrets or fallback secrets anywhere.
- Never edit a migration that has already been applied. Add a new migration. Every migration must apply cleanly to an empty database and to a copy of seeded data.
- New dependencies only when the phase lists them. Prefer maintained, widely used packages, and state license and size impact.
- Follow OWASP Top 10 and ASVS guidance for security decisions. Do not log passwords, tokens, or email addresses.
- No emojis in anything you write: code, comments, UI text, logs, commit messages, docs.

## Workflow

- One branch per phase: `phase-<n>-<short-name>`. Conventional Commits (feat, fix, refactor, test, chore, docs). One logical concern per commit.
- Write a failing test first where practical, then the fix.
- Before finishing a phase: lint, typecheck, build, and the full test suite must pass. Report the commands run and their results.
- End every phase with a report: files changed, tests added, behavior changes (should be none unless stated), anything skipped and why, risks, and how to roll back. Then STOP and wait for approval.
