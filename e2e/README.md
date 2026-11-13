# Browser journeys (Playwright)

Real-browser tests of the journeys a student cannot afford to have broken.
They run against the real API and the real web app, not mocks.

```sh
npm run e2e
```

That one command starts everything it needs and shuts it down afterwards:

- `backend/tests/workflow_server.py`: the API on an isolated SQLite file in a
  temp folder, seeded with one catalogue item and three staff accounts.
- the Vite dev server on port 3001, pointed at that API.

First time on a machine: `npx playwright install chromium`. To use a browser
that is already installed, set `E2E_CHROMIUM_PATH` to its executable. Set
`PYTHON` if `python3` is not the interpreter with the backend dependencies.

## What is covered

| Spec | Journey |
|---|---|
| `01-account.spec.ts` | Private pages need sign-in; sign-up with a delivered code, a wrong code refused, the three consent ticks required; sign-out; sign-in again returns to the page asked for; a student cannot open the admin console |
| `02-order.spec.ts` | Shop to cart to checkout; a declined test payment charges nothing; paying again places the order; the order shows on the student's orders page |
| `03-records-privacy.spec.ts` | A record is filed into its folder from its file name; the same file twice is one record; the owner can move it; signed out, the file is not served; a second student cannot list, open, move or delete it, and the owner's record is untouched |

## Rules for new specs

- **No bypass.** Verification codes come from `support/codes.ts`, which reads
  what the fixture API "delivered". Never add an HTTP route that hands out a
  code or skips a check.
- **Respect the real limits.** The API allows 3 code requests per address in
  5 minutes and 30 per IP in 15. Give each spec its own account and keep
  sign-ins per account to three or fewer. Do not raise the limits to make a
  spec pass.
- **Find things the way a person does**: by label, role and visible text.
- **No real personal data.** Use `@example.test` addresses and invented names.
- Specs run one at a time, in file-name order, against one shared database.
