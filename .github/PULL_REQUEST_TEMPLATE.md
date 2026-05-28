<!-- Greyline PR template. Delete sections that don't apply. -->

## What & why

<!-- One-paragraph summary of the change and the user-visible result. -->

## Type

- [ ] `fix:` bug fix
- [ ] `feat:` new feature
- [ ] `docs:` docs only
- [ ] `refactor:` no behaviour change
- [ ] `perf:` performance
- [ ] `ops:` security headers, CI, infra
- [ ] `test:` tests only
- [ ] `chore:` housekeeping

## Verification

- [ ] `pnpm typecheck` clean
- [ ] `pnpm lint` clean
- [ ] `pnpm build` clean
- [ ] `pnpm e2e` clean (or noted what changed + why specs were updated)
- [ ] Manually exercised the affected surfaces locally

## Privacy + security impact

- [ ] No new outbound network calls, OR new calls are behind a per-API toggle (OFF by default).
- [ ] No new third-party scripts, fonts, or images loaded at runtime.
- [ ] No new dependencies, OR each new dep is justified below.
- [ ] No telemetry, analytics, or remote logging.
- [ ] CSP / Permissions-Policy / security headers unchanged, OR documented why a relaxation is required.

## New dependencies

<!-- For each: package, version, why this can't be done without it. -->

## Screenshots / recordings

<!-- For UI changes, before/after for dark mode. -->

## Anything else

<!-- Caveats, follow-up work, links to related issues. -->
