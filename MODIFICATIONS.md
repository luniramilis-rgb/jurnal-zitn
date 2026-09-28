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
| Dashboard        | Widget package built from existing components — P&L calendar, dimension breakdown, IDX tax & fees, daily sheet (no price), record completeness (`ZITN-TECH-017` §10.3, F0)           |
| Feedback         | In-app feedback stored on our own `feedback` table/API, rewired off the PostHog survey (no telemetry); admin triage inbox (`ZITN-TECH-017` §10.4, F0b)                               |
| Data rights      | Export & delete endpoints (Gerbang #7/#9)                                                                                                                                            |
| Deploy           | Separate host/runtime (ZITN runtime A)                                                                                                                                               |
| CI               | Fork-local CI fixes and a Security workflow that tolerates code scanning being unavailable on this private fork (no GitHub Advanced Security) — see `.github/workflows/security.yml` |

## How files are marked

Substantive source edits are recorded in this repository's commit history. Changed files that
redistribute upstream source retain upstream attribution notices. No upstream `NOTICE`/`LICENSE`
text is removed or altered.

## Third-party ports (MIT)

Some ZITN features are built by porting code from other MIT-licensed projects. Such code is
included only under the terms of its original license, and the required attribution is recorded
here.

### Journedge (MIT)

- **Status in this fork:** the dashboard widget package and in-app feedback (ZITN-TECH-017 §10.3
  and §10.4, F0/F0b) were built from the fork's **existing in-tree Tradr components** and this
  repository's own code; **no Journedge source was ported** for that work.
- **If Journedge code is ported later**, the file(s) must carry the MIT license text and this
  exact attribution line: `portions derived from Journedge, MIT`.
- Journedge is distributed under the MIT License; its copyright notice and permission text must be
  preserved verbatim in any redistributed port.
