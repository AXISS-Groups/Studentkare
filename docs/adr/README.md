# Architecture decision records

One file per decision: `NNNN-short-title.md`, copied from [`0000-template.md`](0000-template.md).
An ADR is never edited to reverse a decision. Instead, write a new one that supersedes it and
change the old one's status to `Superseded by NNNN`.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-erasure-keeps-a-sealed-archive.md) | DPDP erasure keeps a sealed, time-limited archive | Accepted |
| [0002](0002-microphone-permission-kept.md) | Microphone permission stays in the app for planned calls | Accepted |
| [0003](0003-crisis-signals-are-pulled.md) | Crisis signals reach counsellors through a queue, not a push | Accepted (open question) |
| [0004](0004-migrations-once-per-deploy.md) | Migrations run once per deploy under an advisory lock | Proposed |
| [0005](0005-images-deployed-by-commit.md) | Images are built once per green commit and deployed by SHA | Proposed |

Decisions the audit lists as still open, to be written up when they are made:
- Production target: Helm or the compose overlay (audit 17, TD-16).
- Whether health-camp station completion may award points (Rule L).
