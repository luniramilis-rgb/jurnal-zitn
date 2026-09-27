# Modifications (fork notice)

This repository is a **modified fork of Tradr** — <https://github.com/madmatt112/tradr> —
licensed under the Apache License, Version 2.0.

- **Upstream copyright:** `Copyright 2026 The Tradr Authors` (see [`NOTICE`](./NOTICE) and
  [`LICENSE`](./LICENSE), kept verbatim).
- **Upstream commit base:** `bcc917c1f8270ecef48ae4fa5506ba37c8d89e5c` (2026-09-25).
- **Fork owner:** Zen in the Noise (ZITN). Product name: **Jurnal ZITN**.
- **Trademarks:** "Tradr" and the Tradr logo are trademarks of the Tradr project and are **not**
  used as the name of this fork's product. See upstream [`TRADEMARK.md`](./TRADEMARK.md).

## Modifications applied

| Area             | Change                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Product identity | Renamed user-facing product to **Jurnal ZITN**; removed upstream name/logo from UI, emails, CLI banner                                                                               |
| Localization     | Indonesian UI, IDX/Rupiah/WIB conventions (see `AGENTS.md`)                                                                                                                          |
| Auth             | ZITN SSO bridge (`ZITN-TECH-017`): one-time token exchange                                                                                                                           |
| Data rights      | Export & delete endpoints (Gerbang #7/#9)                                                                                                                                            |
| Deploy           | Separate host/runtime (ZITN runtime A)                                                                                                                                               |
| CI               | Fork-local CI fixes and a Security workflow that tolerates code scanning being unavailable on this private fork (no GitHub Advanced Security) — see `.github/workflows/security.yml` |

## How files are marked

Substantive source edits are recorded in this repository's commit history. Changed files that
redistribute upstream source retain upstream attribution notices. No upstream `NOTICE`/`LICENSE`
text is removed or altered.
