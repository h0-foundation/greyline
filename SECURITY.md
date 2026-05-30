# Security Policy

Greyline runs entirely on your machine. Nothing leaves it unless you toggle on a
connection in Settings. The vault holds your encrypted documents — its
correctness is the most important security property in this codebase.

## Supported versions

The **latest minor release** receives security updates. Older versions are not
patched.

## Reporting a vulnerability

If you find a security issue, **please do not open a public issue.** Use one of:

- **GitHub Private Vulnerability Reporting** — preferred. From the repo:
  *Security → Report a vulnerability*.
- Email **security@h0-foundation.org** (PGP key on request).

Please include:
- A short description of the issue and its impact.
- Steps to reproduce or a proof-of-concept.
- Your suggested fix, if any.
- Whether you'd like credit in the release notes.

We aim to acknowledge within **7 days** and to provide a remediation timeline
within **30 days**. We follow a **90-day embargo** before public disclosure,
extendable by mutual agreement.

## Scope

**In scope:**
- Vault crypto correctness (AES-256-GCM authenticated encryption, Argon2id KDF).
- Proxy header leakage in `server/services/api-gateway.ts` — any external
  request that carries an identifying header (`User-Agent`, `Referer`, cookie)
  is a bug.
- SQL injection in any of the SQLite repositories under `server/db/`.
- Path traversal in vault file IO.
- Memory disclosure in the EXIF stripper.
- Authentication / authorization issues on local API routes.

**Out of scope:**
- Missing security headers on pre-release branches (`main` only counts).
- Denial of service via large local DB writes — it's your machine.
- Issues requiring attacker-controlled local file system access.

## Safe harbor

Researchers acting in good faith and in line with this policy will not be
pursued via legal action. We welcome responsible disclosure and credit
researchers in the release notes where requested.

## Cryptography notes

The vault encrypts each document with **AES-256-GCM** under a key derived from
your passphrase with **Argon2id**. The current parameters are 128 MiB memory,
4 iterations, parallelism 2 (`server/crypto/key-derivation.ts`). Because the key
is derived with `raw: true`, the parameters are a compatibility contract: they
are **versioned**, and a stored blob is opened by trying each known version
newest-first, so strengthening the defaults never locks you out of existing
documents. Vault-unlock attempts are rate-limited as defence-in-depth against a
local process brute-forcing the passphrase.

**Use a strong passphrase.** The KDF makes guessing expensive, but it cannot
rescue a weak passphrase — prefer a long passphrase (a 5+ word passphrase or
20+ mixed characters). There is no recovery: lose the passphrase, lose the data.
