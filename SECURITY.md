# Security Policy

## Supported Versions

Only the latest minor release receives security updates.

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |
| < 0.1.0 | No |

## Security Architecture & Guarantees

readme-scan is designed with the following security invariants:

1. **Offline by Default**: In standard mode, readme-scan executes zero network requests and does not transmit data outside your machine.
2. **Zero Runtime Dependencies**: The package relies strictly on Node.js built-in modules to minimize software supply-chain attack surfaces.
3. **Secret Redaction**: When optional AI mode (`--ai`) is enabled, API keys, passwords, database credentials, tokens, and local filesystem absolute paths are redacted before any payload is dispatched.
4. **Credential Isolation**: Stored API keys are maintained in your user profile configuration directory with restricted permissions (`0600`) and are never written to project repositories or committed to version control.
5. **Path Boundary Containment**: The filesystem scanner enforces boundaries to prevent path traversal outside the inspected repository.

## Reporting a Vulnerability

If you discover a security vulnerability or sensitive information disclosure in readme-scan:

1. **Do not open a public issue.**
2. Report the vulnerability privately via GitHub Security Advisories at [https://github.com/davidyehuda45-byte/readme-scan/security/advisories/new](https://github.com/davidyehuda45-byte/readme-scan/security/advisories/new) or send an email to `david.yehuda45@smk.belajar.id`.
3. Include details about the vulnerability, reproduction steps, and any proof-of-concept code.
4. You will receive an acknowledgment within 48 hours, followed by updates on triage and mitigation.
