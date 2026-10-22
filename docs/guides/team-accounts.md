# Team accounts

One fixed account per role on the live site, each signed in with its own 6-digit PIN, so the team can
open every dashboard now. Founder decision, 2026-10-22. Each can also have a password beside its PIN
(plan `docs/plans/tier1-auth-password-2026-10-22.md`).

**These are shared accounts.** Anyone holding a PIN acts as that account, and the audit log can only say
"the team campus account did this", not which person. They are a stop-gap: individual logins (one
account per person, emailed code + authenticator) replace them, and then every team account is
disabled.

## The accounts

The sign-in ID is the short name at the app domain (`APP_DOMAIN`, `studentkare.co` by default).

| ID | Role | Sees |
|---|---|---|
| `superadmin@…` | Super admin | **The whole platform.** It is a real super admin by nature: every real student, every partner, every setting. Guard its PIN most. |
| `campus@…` | Campus admin | Only *StudentKare Team Campus*. No real student can join that campus (sign-up, profile and campus verification refuse the name), so its lists are empty. |
| `counsellor@…` | Counsellor | Only *StudentKare Team Campus*, so the crisis queue has no real student in it. |
| `doctor@…` | Doctor | Only consults, orders and reports assigned to it. Students can't share records with it and a super admin can't assign it a real student's lab report. |
| `clinic@…` | Partner · Clinic | Its own work only (*StudentKare Team Partners*). |
| `pharmacy@…` | Partner · Pharmacy | Its own work only. |
| `lab@…` | Partner · Lab | Its own work only. |
| `wellness@…` | Partner · Wellness centre | Its own work only. A wellness centre gets the same console tools and services as a clinic. |

Every team account shows a small **Team account** badge in its console header. The open queues that any
partner of a kind can see (hostel visits), the ops feed beyond the account's own events, AI approvals and
the AI audit trail are closed to every team account except the super admin. A team account can't be
listed as a provider in the student directory. Don't list catalogue items under a team account either:
the catalogue is what real students buy from.

## After a deploy: create the accounts

On the server, from the `backend` directory, with the same environment as the app (in particular the
same `DATABASE_URL` and `OTP_HASH_SECRET`):

```bash
alembic -c config/alembic.ini upgrade head        # if the deploy doesn't already
python -m scripts.team_accounts create
```

It creates any missing account and prints each new ID and its PIN **once**. Hand them to the team
straight away (a password manager, not chat). The PINs are not stored anywhere but as a salted scrypt
hash keyed with `OTP_HASH_SECRET`, so they can never be shown again.

Running `create` again is safe: existing accounts keep their PIN and nothing is printed for them. An ID
that a real account already uses is skipped, never taken over.

Other commands:

```bash
python -m scripts.team_accounts list               # state and last sign-in, never a PIN
python -m scripts.team_accounts rotate campus      # new PIN, printed once; signs the account out everywhere
python -m scripts.team_accounts unlock campus      # clear a lockout
python -m scripts.team_accounts disable campus     # turn it off and sign it out; 'rotate' turns it back on
python -m scripts.team_accounts set-password superadmin   # asks for a password twice; signs it out everywhere
```

`set-password` never shows or logs the password: it is typed in (not echoed) and stored only as the same
salted scrypt hash as the PIN. It must be at least `auth.password_min_length` (10) characters and not a
common word, a run or the account's own name. `list` says which accounts have one. `unlock` clears a
password lockout as well as a PIN lockout.

The argument is the short name (`campus`), the sign-in ID (`campus@studentkare.co`) or the account id
(`team-campus`). Every command is written to the audit log as `cli:team_accounts`.

> Changing `OTP_HASH_SECRET` makes every PIN stop working: rotate all of them afterwards.

## Signing in

`/staff-sign-in` → **Team PIN** → the ID and the PIN, or **Password** → the ID and the password. Super admin and counsellor must also use an
authenticator (the two-step rule for those roles is unchanged): the first PIN sign-in opens *Sign-in &
security* to set one up, and later sign-ins ask for its code. Keep that authenticator secret with the
PIN in the team's password manager.

After `auth.staff_pin_max_attempts` wrong PINs in a row (5) the account locks for
`auth.staff_pin_lockout_minutes` (15). Passwords have their own lock: `auth.password_max_attempts` (5)
for `auth.password_lockout_minutes` (15), plus `auth.password_ip_max_attempts` and
`auth.password_id_max_attempts` per `auth.password_rate_window_minutes`. A locked password leaves the PIN
working, and the other way round. Each network address and each ID is also rate limited
(`auth.staff_pin_ip_max_attempts`, `auth.staff_pin_id_max_attempts` per
`auth.staff_pin_rate_window_minutes`). An unknown ID, a wrong PIN, a locked or disabled account all get
the same answer, so the page never says which IDs exist. Students can never sign in with a PIN.

## Rotating from the console

Super admin → Platform → **Team accounts** lists every account, what it sees, whether it is locked or
disabled, and its last sign-in. **Rotate PIN** shows the new PIN once (and signs that account out
everywhere), **Set password** sets or replaces its password (never shown back, and it signs that account out
everywhere), **Unlock** clears a lockout, **Disable** turns an account off. Setting the password of the
account you are signed in with asks for its current PIN or password first. Rotating the PIN of the
account you are signed in with asks for its current PIN first; you can't disable the account you are
signed in with. Each action is audited.

## The master switches

`auth.password_login_enabled` (default on) does the same for passwords: off, the server refuses
password sign-in and the page hides the option; the passwords are kept.

`auth.staff_pin_login_enabled` (default on). Off, the server refuses PIN sign-in and the staff page hides
the option; team accounts can then only sign in with an emailed code to their address. The Team accounts
screen says which way it is.

Change it as a super admin with the settings API (a reason is required, audited, history kept):

```http
PATCH /api/ops/settings/auth.staff_pin_login_enabled
{ "value": false, "reason": "Individual logins are live" }
```

`{ "value": null, "reason": "…" }` clears the override back to the default.

## Replacing them

When individual logins exist: create each person's own staff account (Super admin → Accounts), then turn
the switch off and disable every team account (`disable` for each, or from the screen).
