# DIGIT Complaint Management — sign-in & onboarding prototype

Static prototype. No build step, no dependencies.

## Hosting on GitHub Pages
1. Commit this `docs/` folder to the default branch.
2. Settings → Pages → Source: *Deploy from a branch*, Branch: `main` / `/docs`.
3. The site appears at `https://<user>.github.io/<repo>/`.

To serve at the repo root instead, move the contents of `docs/` up one level
and set Pages to `/ (root)`.

## Structure
    index.html                  sign-in, SSO, password reset, account creation
    support.js                  runtime for the sign-in page
    assets/                     crowd photo, eGov logo
    onboarding/index.html       onboarding console (reached after sign-in)
    onboarding/assets/          its css + js
    .nojekyll                   stops Pages ignoring files, required

## Demo accounts
Any password works where a password is configured.

| Email | Auth | Onboarding |
|---|---|---|
| anita.rao@ethekwini.gov.za | password + Google | completed |
| j.mkhize@amc.gov.in | Google only | completed |
| d.patel@ustrust.org | GitHub only | completed |
| new.admin@kisumu.go.ke | password | new — starts at 0 of 6 |
| p.otieno@kisumu.go.ke | password | in progress — 4 of 6 |
| s.naidoo@ethekwini.gov.za | none | not found |

Unlisted addresses return "Email ID not found".

## Notes
State lives in `localStorage`, so the demo remembers progress between visits.
"Reset setup" in the sidebar returns the counter to 0 of 6.
