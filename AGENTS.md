# AGENTS.md

Engineering constitution for this repository (Java + Spring Boot + Hexagonal + Event-Driven).

## Default stack and style
- Backend: Java/Spring Boot with hexagonal architecture (`application` + `portIn/portOut` + `adapter`).
- Integration: event-driven by default (Kafka/Event Hub Kafka API).
- HTTP exposure: controllers exist when needed, but business rules stay outside adapters.
- Outbound HTTP: OAuth2 client-credentials clients are common and should be treated as outbound adapters.
- Local infrastructure: Docker-first.

## Non-negotiable rule 1: temporary sandbox branch
Before changing any file:
1. Create a temporary branch from the current branch:
`git checkout -b tmp/ai/<YYYYMMDD-HHMM>-<slug>`
2. Work and validate in that branch.
3. Promote to target branch without a merge commit:
- use `cherry-pick` or `rebase`, always fast-forward.
4. Remove the temporary branch at the end.

Even if the current branch is already a feature branch, the temporary branch is still mandatory.

## Non-negotiable rule 2: no behavior change without tests
If behavior changes, there must be coverage:
- unit tests (domain/application), and/or
- standalone integration tests (without relying on an already-running external stack).

If full testing is not possible:
1. explain the objective technical reason,
2. deliver the smallest possible coverage,
3. register a plan for missing coverage.

## Non-negotiable rule 3: standalone by default
- Prefer Testcontainers for Kafka/Mongo/Elasticsearch.
- Prefer WireMock/MockWebServer for HTTP clients.
- Avoid fragile tests (no arbitrary `sleep`; use explicit timeout/poll).

## Non-negotiable rule 4: docs and session memory
At the start of each session:
1. Read `docs/AI_STATE.md`.
2. Read the most recent entries in `docs/WORKLOG.md`.

At the end of each task:
1. Update `docs/WORKLOG.md`.
2. Update `docs/AI_STATE.md` if context/flow/commands changed.
3. Update Mermaid/decisions when architecture flow changed (`docs/DECISIONS.md` and/or `doc/mermaid/*`).

## Non-negotiable rule 5: validate docs in real time
Before implementing non-trivial configurations or external APIs:
- validate current documentation via tools/MCP.
- if Context7 is available, use Context7 to validate examples and current contracts.

Apply especially to:
- Spring Security OAuth2 client credentials,
- Kafka/Event Hub settings,
- Testcontainers,
- Mongo/Elasticsearch,
- Kubernetes/AKS manifests.

## Standard workflow
1. Plan (short): steps + affected files.
2. Implement the smallest correct change.
3. Create/update tests.
4. Run local validations (build/test/lint as applicable).
5. Update docs (WORKLOG + Mermaid/decisions when needed).
6. Deliver summary with validation commands.

## Definition of Done
- [ ] Branch `tmp/ai/*` created and used.
- [ ] Code compiles.
- [ ] Tests added/updated.
- [ ] Standalone integration covered when applicable.
- [ ] Local validations executed and green.
- [ ] `docs/WORKLOG.md` updated.
- [ ] `docs/AI_STATE.md` updated if needed.
- [ ] Change promoted without merge commit.

## Local skills
This repo maintains skills in `skills/` for recurring tasks. When context strongly matches, prefer these skills:
- `change-with-tests`
- `add-unit-tests`
- `add-it-tests-testcontainers`
- `implement-http-client-cc`
- `implement-kafka-consumer`
- `expose-rest-controller`
- `update-docs-mermaid`
- `git-sandbox-branch-flow`
- `k8s-validate`
