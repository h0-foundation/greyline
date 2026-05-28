# Third-party licenses

This file enumerates the open-source npm packages Greyline depends on, grouped
by license family. Bundled non-npm data (REST Countries, Natural Earth,
OurAirports, fonts) is listed in [NOTICE](./NOTICE).

> Regenerate this table any time `package.json` changes:
> ```bash
> pnpm licenses list --prod --json > .licenses.json
> ```
> A short audit script then groups results — kept out of the repo to avoid
> bit-rot. Treat the headline categories below as the contract; the full list
> is reproducible from the lockfile.

## License families used by Greyline's runtime dependencies

| License family | Notes |
|---|---|
| **MIT** | The majority of the dependency tree (Next.js, React, Radix UI, shadcn/ui, Tailwind CSS, motion, lucide-react, class-variance-authority, clsx, next-themes, zod, etc.). |
| **ISC** | A few small utilities (e.g. `lucide-react` icon source files, some Node built-in shims). |
| **BSD-3-Clause** | MapLibre GL JS and its transitive deps. |
| **MPL-2.0** | The REST Countries dataset (bundled at build time). Notice in [NOTICE](./NOTICE). |
| **Apache-2.0** | Native add-ons used by Argon2 / better-sqlite3 helpers. |
| **SIL OFL 1.1** | All self-hosted fonts under `app/fonts/`. |

## License compatibility with AGPL-3.0

All of the above licenses are **compatible with redistribution under
AGPL-3.0**. AGPL-3.0 is the *one-way* terminal license — you may incorporate
permissive code into Greyline, but Greyline (and any derivative) must remain
AGPL-3.0.

## Reporting an attribution gap

If you spot a bundled work whose attribution is missing from [NOTICE](./NOTICE),
please open an issue (or a PR) — we treat attribution gaps as bugs.
