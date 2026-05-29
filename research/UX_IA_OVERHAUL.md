# UI / Information-Architecture Overhaul — Blueprint

_Part of the Greyline research corpus. Synthesizes three cited IA/UX research streams (navigation science, task-flow/onboarding clarity, competitor teardowns) into the navigation model Greyline is migrating to, and records what has shipped vs. what remains._

## The problem

Greyline grew to **8 sidebar peers + a flat 12-tool `/tools` grab-bag**, with ~30 planned features and no clear homes. The same user goal is split across three pillars (travel-risk, counter-surveillance, journalism) without making the relationship explicit. This offloads the "where does this live?" decision onto the user — a **Tesler's-Law** failure — and the flat Tools grid emits weak **information scent**, generating pogo-sticking. Feature count is not the problem; **unmanaged altitude** is.

## The science (what the research says)

- **Hick's Law** (Hick 1952; Hyman 1953): decision time rises with the number/complexity of choices → collapse the wide top-level choice.
- **Miller's Law** (1956), revised to ~4±1 chunks (Cowan 2001): keep the simultaneously-visible nav set at ~5±2 so it fits working memory → a **5–6 item spine**, not an arbitrary aesthetic.
- **Fitts's Law** (1954): a persistent, edge-anchored left rail is a large, fast target; Cmd+K removes travel distance for the long tail.
- **Jakob's Law** (Nielsen/NN/G): match the conventions users already know → the canonical **app-shell** (left rail + content + Cmd+K) from Linear, Notion, Slack, VS Code, Felt.
- **Tesler's Law / Conservation of Complexity** (Tesler ~1984): irreducible complexity must be absorbed by the *system*, not the user → contextual surfacing + modes + palette.
- **Information Foraging & scent** (Pirolli & Card, Xerox PARC): users follow scent and abandon when it's weak → goal-based grouping, predictive labels, contextual proximity.
- **Progressive disclosure** (Nielsen/NN/G): show the few most-important options first; practical hierarchy caps at **~two disclosure levels** before users get lost.
- **Polar-bear IA** (Rosenfeld, Morville & Arango): organization + labeling + navigation + search systems; pick a **task/goal-based** scheme with **packs as an audience/mode facet** on top.
- **Card sorting** (Spencer) + **tree testing** (Tullis & Wood) + **first-click testing** (Bailey & Wolfson; Sauro: ~87% task success when the first click is right vs ~46% when wrong): derive groupings from users, validate findability label-only before building.
- **The "3-click rule" is a debunked myth** (Porter/UIE 2003): success correlates with continuous scent, not click count.
- **Command palette as search-as-navigation** (Quicksilver → Spotlight → VS Code → Superhuman/Linear): converts the entire feature set into a typeable, fuzzy index; lets users "skip the linear IA" (NN/G). Separate actions from content or surface a single "Top result" for cross-category ranking (Retool).
- **Felt's workspace-with-panels** + **viewer/editor mode**: map canvas + left layers/legend + right contextual detail; tools appear on demand, not as global peers.

Full teardowns (Linear, Notion, Stripe, Raycast, Arc, Obsidian, Things 3, Felt, Palantir, Datadog/Grafana, Proton, Mullvad) and citations are in the research run; the convergent verdict: **small stable goal-based spine + deep per-object workspaces + a command palette**, with new features attaching to an existing object (trip / place / case / map-layer) rather than spawning nav items (the **Datadog land-and-expand** antipattern).

## The chosen IA

**Navigation model:** app-shell **hybrid** — a persistent left rail for the goal spine + a global **Cmd+K** palette as the parallel flat layer for power users and the long tail.

**Left-rail spine (goal-based, grouped, Home pinned):**
- **(pinned)** Home — cockpit: "what needs your attention now"
- **Plan & brief** — Trips · Countries · Map
- **Field** — Surveillance · Tools
- **Record** — Logbook · Vault
- **(footer)** Settings

This keeps routes stable while chunking 8 flat peers into 3 meaningful groups under the two-level ceiling.

**Per-trip workspace (hub-and-spoke):** the Trip is the hub; planned travel-risk features (Greyline Risk Score, ISO-31030 itinerary timeline, road-safety panel, emergency/embassy locator, briefing PDF, multi-traveler roster) attach as tabs/panels there — never as new nav items.

**Tools:** the `/tools` index stays as a goal-grouped, searchable fallback; its utilities also surface **contextually** (currency/weather/visa inside a trip or country; EXIF/chronolocation/self-doxxing inside the investigation/journalism context) and via the palette. A **single shared registry** (`lib/tools.ts`) feeds both the index and the palette so they can never drift.

**Pillars as modes/packs:** travel-risk is the default; counter-surveillance and journalism are expressed as modes/packs that reshape what surfaces, rather than three parallel trees (progressive disclosure of *audience* complexity).

**Map:** Felt-style panels — fixed canvas + left layers/legend + right contextual detail; new spatial features (CCTV/ALPR layer, viewshed, SDR/egress planner, offline tile packs) are toggleable layers / right-panel tools.

**Connections:** all opt-in data connectors live behind one **Settings → Connections** hub with provenance/confidence chips at point-of-use, so adding ~9 connectors never adds 9 nav items.

**Governance rule (prevents future bloat):** before any feature ships, it must attach to an existing object (Trip, Country/place, Case, Map layer) or live in the palette/a pack — not a new top-level peer.

## Implementation status

**Shipped (this overhaul, slice 1):**
- Grouped, goal-based left rail (Home pinned + Plan & brief / Field / Record), routes unchanged (`lib/nav.ts`, `components/shell/sidebar-content.tsx`).
- Single shared **tools registry** (`lib/tools.ts`); `/tools` and the palette both consume it (fixes a stale palette entry pointing at a removed route).
- **Comprehensive Cmd+K palette**: Go-to (all pages) + **Actions** (new trip, log a sighting, export disclosure, open vault, back up data, data sources) + all Tools + Appearance (`components/shell/command-menu.tsx`). e2e covers opening via keyboard and jumping to a tool.

**Planned (next slices):**
- Per-trip workspace tabs/panels for the travel-risk features.
- Palette entity search (jump to a specific trip / country).
- Mode/pack switcher for the three pillars.
- Felt-style `/map` panel layout.
- Settings → Connections hub consolidation.
- Empty-state-as-onboarding pass and first-run guidance.

## Sources
NN/G — Progressive Disclosure (`https://www.nngroup.com/articles/progressive-disclosure/`); NN/G — Managing Visual Complexity (`https://www.nngroup.com/videos/managing-visual-complexity/`); Felt — Tour the interface (`https://help.felt.com/getting-started/tour-the-interface`); Raycast Manual — Search Bar (`https://manual.raycast.com/search-bar`); Retool — Designing the Command Palette (`https://retool.com/blog/designing-the-command-palette`); Stripe — Dashboard basics (`https://docs.stripe.com/dashboard/basics`); SigNoz — Datadog vs Grafana (`https://signoz.io/blog/datadog-vs-grafana/`); Notion UI (`https://dashibase.com/blog/notion-ui/`); Notion vs Linear (`https://www.13labs.au/compare/notion-vs-linear`); plus the foundational laws (Hick, Miller/Cowan, Fitts, Jakob/Nielsen, Tesler, Pirolli & Card information foraging, Rosenfeld/Morville/Arango, Spencer card sorting, Tullis & Wood tree testing, Sauro first-click, Porter 3-click-myth).
