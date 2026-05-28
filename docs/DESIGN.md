# Greyline Design System

> *A field-grade dossier, not a scrapbook.*

This is the structural spec for Greyline's UI. It encodes the rules that turn a
clean Tailwind dashboard into a memorable editorial artifact — the kind of app
a journalist, a frequent flyer, or a security-conscious traveler keeps for a
decade because nothing else feels like it.

Pair this with [next-rewrite.md memory](../) for build state, and
[`app/globals.css`](../app/globals.css) for the live tokens.

---

## 1 · Voice

**Field Atlas / Dossier.** The product reads like a private intelligence
report on your own life — quiet, technical, restrained, occasionally lush.

- **What it is not:** Pastel-keepsake / Polarsteps / scrapbook / friendly travel app.
- **What it is:** Penguin Classics × Field Notes × CIA briefing × Apple Photos *Looking Back*.
- **Reading age:** 30s and up.
- **Tone:** Tight sentences. No emoji in copy. Mono micro-labels prefix sections (`01 / READINESS`). Numbers are first-class — show the count, show the delta.

---

## 2 · Type system

| Token | Family | Used for |
|---|---|---|
| `--font-sans` | **Inter** | Body, UI, controls, tables. Workhorse. |
| `--font-display` | **Fraunces** (variable serif), fallback Geist | Editorial headlines — page titles, country/trip names, hero copy, drop caps. The signature voice. |
| `--font-display-sans` | **Geist** | Display moments where serif would feel wrong (sidebar wordmark, dialog titles, technical headers). |
| `--font-mono` | **Geist Mono** | Data, codes, coordinates. Tabular nums on. |
| `.label-caps` | mono, ALL-CAPS, tracking +0.12em | Technical micro-labels. The dossier voice. |
| `.dropcap` | first letter → Fraunces 4.5rem oak-green | First paragraph emphasis on country briefings + trip detail descriptions. Use sparingly. |

**Rule:** restrict `.font-display` to display sizes (≥24px). Below that, Fraunces loses its quality and feels novelty.

---

## 3 · Color

**Palette:** *Oak & Gold on Stone.* OKLCH tokens — see `app/globals.css:14–159`.

- `--primary` — deep oak-green. CTAs, active states, links, visited fills.
- `--spark` — warm gold. **Restraint budget:** reserved for *one* of: `isNew` country chips, the home-country fill, `+delta` indicators on stats, the explicit "you are here" moment. Never decorative. Never two sparks visible at once.
- `--accent-text` — oak-green for emphatic text (links, drop caps).
- `--foreground / --faint / --muted-foreground` — three-step text hierarchy. **Use `--faint` for context labels, never `--muted`** (which is a surface, not text).
- `--destructive` — warm crimson, hue 25 — distinct from any green.

**Dark elevation principle (already in globals.css:12):**
*"Elevation in dark mode comes from lightness, not shadows."*
→ Avoid `shadow-md` / `surface-raised` on more than one element per surface.
The hero card may lift; nested cards stay flat with a thin border.

---

## 4 · Motion vocabulary

Source of truth: **`lib/motion.ts`** (mirrors CSS `--duration-*`/`--ease-*`).

| Token | Use |
|---|---|
| `DURATION.snap` 150ms | Tap/toggle feedback. Hover lift. Cursor changes. |
| `DURATION.default` 240ms | List items, cards, page micro-transitions. |
| `DURATION.enter` 280ms | Entry: dialogs opening, drawers appearing, view-transition cross-fades. |
| `DURATION.exit` 180ms | Exit: dialogs closing, drawers retracting. **Always shorter than enter.** (Kowalski) |
| `DURATION.slow` 420ms | Editorial reveals: Wrapped year cards, the scratch-map first-load wave. |
| `EASE.outQuint` `[0.16,1,0.3,1]` | Default for all *enter* motions. |
| `EASE.inQuick` `[0.4,0,1,1]` | Exits only. |
| `EASE.spring` | Reserved for the **stamp-drop** signature animation and the sidebar active-bar. Two places, system-wide. |

**Reduced-motion contract:** every animated component must `useReducedMotion()` and provide an instant final state. The CSS `prefers-reduced-motion` block in `globals.css:317–326` is a backstop, not the primary guard.

---

## 5 · Native CSS-first principle

If a 2026 browser can do it natively, *do not* reach for a JS library:

| Need | Use |
|---|---|
| Page → page cross-fade or shared element | **View Transitions API** (`document.startViewTransition`) — no library |
| Modal / popover entry animation | `@starting-style` — no library |
| Parallax / progress bar / reveal-on-scroll | `animation-timeline: view()` / `scroll()` — no library |
| Tooltip / dropdown positioning | CSS anchor positioning + `popover` attribute — no Floating-UI |
| Long-form prose styling | `@plugin "@tailwindcss/typography"` `.prose` — no custom CSS per surface |

Reserve **motion/react** (Framer's successor) for *orchestrated* moments only: the scratch-map fill wave, the stamp-drop spring, the trip-wrap ceremony. Bundle cost is real on a self-hostable app.

---

## 6 · Elevation

Three tiers, used sparingly:

- **Flat** — `border-border bg-card`. The default. 95% of cards.
- **`.surface-interactive`** — `box-shadow: shadow-sm`, hovers to `shadow-lg` + 2px lift. Only on **clickable** standalone tiles (dashboard hero tiles, country cards in a grid). Never on list rows in a bordered list (lift clips).
- **`.surface-raised`** — `shadow-md` static. Reserved for the *single* hero element on a page if any. Often zero per page.

---

## 7 · Page archetypes

Each page has a clear archetype. Don't invent layouts.

### Dashboard (`app/page.tsx`)
- **Hero**: editorial banner with the niche statement (current).
- **Atlas tile + stats tile** (2/3 + 1/3): the moat made visible.
- **Bento**: most-recent trip + privacy posture.
- **Stat tiles row**: counts with `+delta` deltas in `--spark`.
- *Coming:* an **"On This Day" hairline** between hero and atlas — single line, no card. *(Day One's #1 organic retention hook.)*

### Trips Atlas (`app/trips/page.tsx`)
- **Wrapped scrollytelling** (sticky-pinned, scroll-driven CSS).
- **Hero scratch-map** (animated first-load fill + click-through + PNG export).
- **Year bar** of days abroad.
- **Passport stamp wall**.
- **All-trips ledger** (already in Field-Atlas style).

### Trip Detail (`components/trip/trip-detail.tsx`)
- **Editorial header**: Fraunces trip name + dates + optional pull-quote from notes.
- **Numbered sections**: `01 / DESTINATIONS`, `02 / THREAT MODEL`, `03 / READINESS`, `04 / NOTES`.
- **Threat dial** as the visual anchor.
- *Coming:* a **"trip wrapped" ceremony** when status flips to `wrapped`.

### Country Briefing (`app/countries/[code]/page.tsx`)
- **Editorial hero**: oversized Fraunces country name, mono caption with capital + lat/lng.
- **Drop-cap** on the first paragraph of the country description.
- Numbered section labels.
- Map polygon arrives via **View Transition** from the atlas.

### Vault (`app/vault/page.tsx`)
- **Redaction as identity**: locked-doc titles render as **black bars**; un-redact on unlock with a left-to-right `clip-path` sweep.
- A faint diagonal "CLASSIFIED · PERSONAL" watermark behind the doc list.

---

## 8 · Signature interactions (one per surface)

The screenshots an awards juror would frame.

1. **Atlas** — staggered country fill wave + on-hover crosshair reticle on the country (replacing the floating tooltip pill).
2. **Country briefing** — Fraunces drop-cap hero; polygon flies in via View Transition.
3. **Trip detail** — `wrapped` status flips ceremony (chained motion using `TRANSITION.slow`).
4. **Vault** — `clip-path` redaction sweep on unlock.
5. **Wrapped** — sticky-pinned scrollytelling (Strava Year in Sport pattern, native scroll-timeline).
6. **Dashboard** — the *single* gold-spark `+delta` indicator under one stat, nothing else colored.

---

## 9 · Component policy

| Source | Use when |
|---|---|
| **shadcn/ui core** (already vendored in `components/ui/`) | All form primitives, dialogs, dropdowns. Source of truth. |
| **Custom** (`components/{travel,trip,tools,…}`) | Anything content-bearing or signature. |
| **Cult UI / Magic UI / Aceternity** | *Only* lift code, not as deps. Strip ornament, retheme to Oak & Gold. |
| **No** | Generic component libraries (MUI, Chakra, Mantine). |

---

## 10 · Implementation phases

- **Done (committed):**
  - Oak & Gold OKLCH palette, dossier voice, scratch-map elevation, motion-token system (`lib/motion.ts`), `.surface-interactive` on cards, global `:focus-visible` floor, loading/error boundaries.
- **Now (this overhaul):**
  - **Fraunces wired** for `--font-display` (editorial serif as the signature voice).
  - **`@tailwindcss/typography`** loaded for `.prose` long-form content.
  - **Drop-cap** utility (`.dropcap`) + applied to country briefing.
  - **View Transitions** on atlas → country briefing (cross-fade, native).
- **Next (Tier 3, future commits):**
  - "On This Day" promoted to dashboard hairline (data already in tree).
  - Wrapped → sticky-pinned scrollytelling via `animation-timeline: view()`.
  - Vault redaction system (`clip-path` sweep).
  - Trip-detail editorial header + numbered sections.
  - Crosshair reticle on map hover (replaces floating pill).
  - "Trip wrapped" ceremony.

---

## References (2026-current)

- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4) · [Tailwind v4 plugins](https://tailwindcss.com/docs/plugins)
- [Motion.dev (post-Framer fork)](https://motion.dev/) · [GSAP free under Webflow (Apr 2025)](https://gsap.com/)
- [View Transitions API — MDN](https://developer.mozilla.org/docs/Web/API/View_Transition_API) · [Chrome cross-document VT](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document)
- [`@starting-style` — MDN](https://developer.mozilla.org/docs/Web/CSS/@starting-style) · [Scroll-driven animations — MDN](https://developer.mozilla.org/docs/Web/CSS/CSS_scroll-driven_animations)
- [CSS Anchor Positioning — Chrome blog](https://developer.chrome.com/blog/anchor-positioning-api)
- [shadcn/ui registry](https://ui.shadcn.com/) · [Cult UI](https://cult-ui.com/) · [Origin UI](https://originui.com/) · [Magic UI](https://magicui.design/) · [Aceternity](https://ui.aceternity.com/)
- [Rauno Freiberg — Devouring Details](https://devouringdetails.com/) · [Emil Kowalski — animations.dev](https://animations.dev/)
- [Lea Verou — Hovercar framework](https://lea.verou.me/blog/2025/hovercar/) · [Brad Frost — AI & design systems](https://bradfrost.com/blog/post/introducing-our-new-course-ai-and-design-systems/)
