# Security Policy

## Supported Versions

Security fixes are provided for:

- latest `develop` branch
- latest production release tag (when releases are published)

Older snapshots and temporary branches are not guaranteed to receive fixes.

## Reporting a Vulnerability

Please do not open public issues for security vulnerabilities.

Use one of these channels:

1. GitHub Security Advisory (preferred)
2. Private maintainer contact through repository security channels

When reporting, include:

- affected component/path
- impact summary
- reproduction steps or proof of concept
- suggested mitigation (if available)

## Response Expectations

- Initial triage response target: within 5 business days
- Fix timeline depends on severity and scope
- Coordinated disclosure is preferred

## Scope Notes

This repository includes an optional Codex gateway (`apps/codex-gateway`).
If your report involves credentials, API keys, or outbound integrations,
include configuration context and sanitize secrets before sharing.
