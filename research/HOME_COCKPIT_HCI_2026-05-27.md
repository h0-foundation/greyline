# Greyline Home Page: Foundation for First-Principles Rebuild

Research-backed framework for dark-first, editorial, map-centric travel intelligence dashboard. Six dimensions: cognitive science, travel IA patterns, designer thinking, privacy minimalism, typography systems, and daily cockpit UX.

---

## 1. Dashboard Cognitive Science — Primary Sources

**Key Finding: Scanning patterns are task-dependent, not universal.**

The [Nielsen Norman Group's F-shaped pattern research](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content-discovered/) documents eye-tracking across multiple website types; dashboards follow distinct patterns: [a 2024 eye-tracking study on dashboard layout order](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11435723/) found optimal placement is core chart left-aligned with partial symmetry for secondary areas.

[Nielsen NN/G text scanning patterns research](https://www.nngroup.com/articles/text-scanning-patterns-eyetracking/) identifies four primary patterns: F (horizontal + vertical scan), layer-cake (skips sections), spotted (jumps to keywords), commitment (reads linearly). **Implication for travel dashboards:** Users scan trip cards for specific keywords (destination, date, status) — spotted/layer-cake patterns dominate. Heavy text loses users.

**Hick's Law Applied:** [Hick's Law states decision time = log2(n) × constant, where n = number of options.](https://www.parallelhq.com/blog/what-hick-s-law) For dashboards, [splitting 18 reports into a "Featured" section (top 5) + "Browse all" drawer reduces cognitive load by ~40%.](https://uxgenstudio.com/ux-laws/hicks-law/) **For Greyline:** Present 3–4 primary trip states (Planning, Active, Completed) prominently; secondary filters in collapsible sections.

**Miller's 7±2 Chunking:** [Progressive disclosure (hiding advanced features initially)](https://www.nngroup.com/articles/progressive-disclosure/) improves learnability and error rates. **Key nuance:** One-screen designs only win when users need frequent back-and-forth interdependent modifications (e.g., hotel date/price toggling). **For Greyline:** Two-screen compromise — trip overview cards + expanded modal for details.

**Information Scent (Pirolli):** [Users navigate by "scent"—visible cues that point to desired content. Sub-menu previews improve scent.](http://desource.uvu.edu/dgm/2740/IN/steinja/lessons/02/l02_04.html?m=1) **For Greyline:** Trip card headers must show destination, next action, progress indicator within first glance.

**Data-Ink Ratio (Tufte):** [Maximize proportion of ink representing data vs. decoration.](https://www.thedataschool.co.uk/calvin-gao/what-is-the-data-ink-ratio/) [Tufte's five laws: (1) show the data, (2) maximize data-ink, (3) erase non-data ink, (4) erase redundant data-ink, (5) revise/edit.](https://www.holistics.io/blog/data-ink-ratio/) **For Greyline:** Remove all ornamental lines, shadows, and icons that don't convey trip state or next action.

**Moves for Greyline home:**
- Scan 3 trip cards horizontally at top of page; below, layer-cake layout with "Current Priority" + "Upcoming" sections.
- Limit initial decision tree to 3 primary actions (New Trip, View Active, Browse Archive) — more behind progressive disclosure.
- Use direct-labeling on trip cards (destination names, dates, status badges) instead of nested legends.
- Reduce visual clutter: no unnecessary dividers, drop shadows, or background patterns. Tufte principle: ink ≈ data.
- A/B test card layout (horizontal vs. stacked) with eye-tracking to confirm spotted-pattern behavior.
- Place map widget below fold if not primary entry point; travel cards first.

---

## 2. Travel App Home IA — 2025-2026 Competitive Landscape

**Polarsteps** (20M users, [top-ranked 2026 Apple App Store](https://www.techradar.com/phones/polarsteps-is-the-free-app-that-tracks-your-travels-and-it-just-made-my-new-years-resolutions-list)) emphasizes a **globe-centric entry**: starred cities with curated editorial guides on the home. Structure: Map first, then editorial layer.

**Wanderer** ([GitHub: SnowdogApps/Wander](https://github.com/SnowdogApps/Wander)) — iOS city-travel app — prioritizes immersive storytelling: curated location cards with rich imagery, no cluttered list. Single-purpose focus.

**AdventureLog** ([AdventureLog.app](https://adventurelog.app/)) — general adventure tracker — balances documentation (where you've been on a map) with sharing (social feed). Dual focus: historical + social.

**Komoot** (planning-first app) — "Today" view shows next planned location + waypoints. Task-focused IA: what's happening today vs. future planning separated.

**TripIt Pro** — itinerary-centric: home shows current trip card, upcoming reservations below. Email-driven data import shapes the UX (documents first, then structure).

**[Linear's 2024-2025 design evolution](https://linear.app/now/behind-the-latest-design-refresh):** shifted from monochrome-blue-with-gradients to monochrome-black-with-bold-accent-color. Emphasis: **consistency over decoration.** Midway through 2025, "linear design appears to be linear design but bolder with more individuality."

**[Stripe Dashboard design patterns](https://docs.stripe.com/stripe-apps/design):** Home surface gives "quick overview of business," routes to core workflows. Dashboards use composition patterns (reusable component groups). **Key insight:** home is routing layer, not everything-at-once.

**Moves for Greyline home:**
- Lead with **map widget** (not trip list) — visual anchor for privacy-focused travel app. Show current location or next destination.
- Below map: 2–3 trip cards in "momentum" order (Active → Planning → Recent), not chronological.
- Omit complex social/sharing features from home; they distract. Greyline's value is intelligence, not social.
- Adopt "today" view pattern: prominent next scheduled location, next action (departure time, visa check, weather review), not full itinerary.
- Structure home as **routing layer:** quick actions (New Trip, Check Weather, Review Advisories) in top bar; cards/map below. Avoid everything-at-once.

---

## 3. Editorial Dashboards 2026 — Named Designers & Recent Work

**[Rauno Freiberg (Vercel, formerly Arc)](https://rauno.me/craft)** — Staff Design Engineer. Flagship essay: *[Invisible Details of Interaction Design](https://uiuxshowcase.com/resources/invisible-details-of-interaction-design-by-rauno-freiberg/)* (3000 words). Core thesis: design craft = animation timing, physics, gesture predictability. Recent work includes redesigning Vercel's platform dashboard and design system. **Philosophy:** subtle motion and precise affordances separate premium interfaces.

**[Emil Kowalski](https://emilkowal.ski/)** — Design engineer at 2026. [Bundled his blog into a design engineering skill](https://x.com/emilkowalski/status/2033543717890465985) (March 2026) covering animations, component design, and open-source patterns (Sonner, etc.). **Philosophy:** "taste is the differentiator in a world where everyone's software is good enough." Every detail compounds.

**[Linear design blog](https://linear.app/now):** *[How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)* — Part II post documents consistency improvements (predictable header action placement). 2025 refresh emphasized **reduction:** fewer colors, fewer decorations, more individuality through typography weight + micro-interactions.

**[Vercel design blog](https://vercel.com/blog)** — [Introduced Glaze](https://www.raycast.com/blog/introducing-glaze) (2025): minimalist design tokens system for consistency. Emphasis on **system-first thinking** — home pages inherit patterns from design system, not vice versa.

**[Raycast home/launcher design](https://www.raycast.com/)** — Command-palette interface. Home is **search-first:** no fixed navigation or cluttered menus. Everything surfaces through query. Philosophy: reduce visual noise via interaction pattern (search + filter).

**[Granola meeting notes app](https://www.raycast.com/Rob/granola)** — Calendar-meeting integration. Home shows "next meeting" + key agenda items extracted from calendar event. **Pattern:** calendar as source of truth for UI structure.

**[Notion Calendar (formerly Cron)](https://linear.app/now/behind-the-latest-design-refresh)** — Notion's acquired calendar product. Home view: today's events + tasks stacked. Calendar event visual is primary (colored blocks), text is secondary.

**[Substack reader app](https://substack.com/)** — Feed-first design. Home shows subscribed writers, unread counts, latest published pieces. **Pattern:** identity-driven feeds, not algorithmic. Each writer is a visual unit.

**[Things 3 app](https://culturedcode.com/things/features/)** — *[Today view](https://culturedcode.com/things/support/articles/4001304/)* is the daily cockpit: calendar events grouped at top, today's tasks below. *This Evening* section separates workday from evening focus. **Philosophy:** temporal structure shapes task visibility, not priority alone.

**Moves for Greyline home:**
- Study Rauno's interaction design essays on [Devouring Details](https://devouringdetails.com/) — apply his animation timing principles to trip card hover states (100-150ms easing, not jarring).
- Adopt Emil's "taste compounding" mindset: every detail (typography weight, icon stroke width, card spacing) should communicate a consistent design signal.
- Follow Linear's 2024-2025 shift: ruthlessly remove decorative elements; let typography weight + color convey hierarchy.
- Implement search-first home pattern (like Raycast) if user base is >100 trips — search for destination/date beats scrolling.
- Use calendar integration (like Granola/Cron) if Greyline has synced trip dates — show "next departure" as visual block on home.
- Apply Things 3's temporal chunking: separate "Departing Today," "Upcoming Week," "Past Trips" sections rather than mixed chronological list.

---

## 4. Privacy/OPSEC Minimalist Apps — Citable Patterns

**[Signal messenger home](https://medium.com/design-bootcamp/redesigning-signal-app-edf1568c1e0a)** — Minimalist chat list. No stories, channels, or status tabs. Single floating-action button (pencil) for new message. **Philosophy:** omit social-media features that dilute privacy messaging. Focus is communication, period.

**[Tor Browser about:tor page](https://www.torproject.org/about/overview/)** — Home screen educates on privacy while maintaining minimalism. High contrast, no animation. **Philosophy:** clarity > aesthetics when security is the feature.

**[iA Writer design philosophy](https://blog.logrocket.com/ux-design/minimalism-ui-design/)** — Minimalism applied to data UI means removing UI chrome entirely. **Principle:** interface should be "invisible"—user sees only content.

**[Wanderer (SnowdogApps/Wander GitHub)](https://github.com/SnowdogApps/Wander)** — City travel stories (iOS). Minimal chrome: full-bleed image, destination name, play button. Information scent via visual, not text.

**[dawarich (OSS travel tracker GitHub)](https://github.com/MichaelBukshtab/dawarich)** — Open-source travel history. Home shows map widget first, then list of locations visited. Privacy-forward (runs locally).

**[Felt maps](https://felt.com/)** — Collaborative mapping tool emphasizing privacy + minimal data collection. Home shows your maps in grid. No tracking pixels, no ad networks.

**[Onion Browser (privacy-first iOS browser)](https://www.onionbrowser.com/)** — Minimal home: location bar, tab bar, settings. No decorative imagery or brand elements cluttering focus.

**Moves for Greyline home:**
- Remove all "social proof" elements (share counts, follower lists, social badges). Signal app philosophy: focus on core function.
- Omit animations and heavy visual effects. Tor Browser principle: clarity > delight when privacy is the core message.
- Hide settings, API toggles, and vault management behind a single icon (gear) or secondary navigation. Home is for trip planning, not configuration.
- If showing map, make it full-bleed above the fold (Wanderer pattern). Map is the primary communication device for travel.
- Use high-contrast text on dark background (no gradients, no subtle overlays). Tor Browser + iA Writer principle: maximum readability.
- Display data (trip count, nights traveled, countries visited) via simple numeric badges, not charts or infographics. Data-ink ratio: numbers only.

---

## 5. Dense Data + Editorial Typography, Dark Mode 2026

**Type Pairings:** No production case studies found pairing Fraunces + IBM Plex Mono specifically in dark mode. However, [IBM Plex Mono is designed for UI environments](https://fonts.adobe.com/fonts/ibm-plex-mono) (consistent character widths, clear differentiation). [Fraunces Bold pairs well with Inter or IBM Plex Sans Bold](https://blog.icons8.com/articles/best-font-pairing-tips/).

**Dark Mode Conventions 2026:**
- [Linear's 2025 design shift](https://linear.app/now/behind-the-latest-design-refresh) reduces color palette on dark: monochrome black/white + 1–2 bold accent colors. Abandon gradients.
- Vertical rhythm + tabular-nums (monospace alignment) for data rows: use `font-variant-numeric: tabular-nums` for alignment.
- Type scale for editorial dashboards: **Display** (28–32px, Fraunces Bold), **Heading** (18–20px, sans), **Body** (14–16px, sans), **Data** (12–14px, monospace).

**[Pentagram's 2024-2025 tech identity work](https://www.pentagram.com/work/cohere)** — Cohere dashboard branding. Identity spans website + user dashboard + playground UI. **Philosophy:** branding is systematic across all surfaces, not just marketing.

**[Made Studio + Order design work](https://www.pentagram.com/)** — Recent projects emphasize **accessible, human-centered** identities for complex tech. Avoid convention-bound "tech aesthetic."

**Moves for Greyline home:**
- Type scale: **Trip titles** in Fraunces Bold 20px, **Destination names** in Fraunces Regular 16px, **Metadata** (date, status) in IBM Plex Mono 12px.
- Dark mode base: `#0a0a0a` background, `#ffffff` text. Single accent color (match your "accent-50..900" palette from memory).
- Vertical rhythm: set line-height to 1.6–1.8 for readability on dark backgrounds.
- For data tables/destination lists: use `font-variant-numeric: tabular-nums` to align numbers (lat/long, distances, costs).
- Eliminate color gradients, shadows, and blurs. Pentagram principle: clarity through composition, not visual effects.
- Test type contrast with [WCAG AAA standard](https://webaim.org/articles/contrast/): 7:1 minimum ratio on dark backgrounds.

---

## 6. "Today" / "Now" / Cockpit Patterns — Daily Intelligence

**[Things 3 Today view](https://culturedcode.com/things/support/articles/4001304/)** — Architecture: calendar events (Apple Calendar sync) at top, color-coded and block-formatted. Below: today's tasks. *This Evening* subsection for evening-only tasks. **Structure:** temporal chunks (morning/evening) override priority hierarchy.

**[Notion Calendar (formerly Cron)](https://www.notion.com/help/calendars)** — "Today" link at top right returns to current date. Daily planning routine: 5–10 min morning review of calendar + tasks. **Philosophy:** cockpit = curated set of instruments, each showing one piece of information.

**[Stripe Dashboard home design](https://medium.com/swlh/exploring-the-product-design-of-the-stripe-dashboard-for-iphone-e54e14f3d87e)** — Post-2024 design prioritizes **business overview first** (daily revenue, transaction count) as the landing zone. Routing to specific tools (payouts, customers, disputes) below. **Pattern:** aggregate data summary, then task entry points.

**[Linear My Issues / inbox-zero pattern](https://linear.app/now/how-we-redesigned-the-linear-ui)** — Home shows filtered "My Issues" (issues assigned to current user, unresolved). Single list, not tabs. Clear visual hierarchy: assigned to me > assigned to others.

**[Sunsama daily plan UI](https://sunsama.com/)** — "What needs my attention?" question explicitly answered at the top. Three sections: *Today* (what I committed to finish), *Upcoming* (coming but not today), *Backlog* (no date). **Philosophy:** daily commitment is the primary navigation model.

**[Cron/Notion Calendar patterns](https://www.notion.com/product/calendar)** — Calendar event is the source of truth. Time-blocking approach: each event is a visual block; home shows today's blocks at a glance.

**Moves for Greyline home:**
- **"Departing Today"** section at top (like Sunsama). Show next departure as visual block with destination, time, next action (check weather, verify docs).
- **Calendar integration:** if user has synced trip dates, show 3-day lookahead in a Cron-like block view (departure dates as colored blocks).
- **"What Needs My Attention?"** hierarchy: (1) Departing in <48h, (2) Upcoming within 2 weeks, (3) In planning, (4) Past trips (archived).
- Below the fold: searchable list of all trips (like Linear's "My Issues") filtered by status. **Not** a card carousel or infinite scroll.
- Apply Stripe's pattern: aggregate stat at top (e.g., "3 active trips, 12 destinations, 2 pending visas") before the details.
- Each trip card as a "cockpit instrument": show one key metric (next action, days until departure, unread advisory count). Not everything.

---

## Implementation Summary: Six Concrete Moves

1. **Map-centric entry** (dark-first, full-bleed): Wanderer + Polarsteps pattern. Show current/next location, not trip list.
2. **Temporal chunking** (Things 3 + Sunsama): Separate "Departing Today," "Upcoming," "Past." Time is the primary organizational axis.
3. **Tufte data-ink ratio:** Remove all decorative shadows, gradients, animations. Typography weight + color = hierarchy.
4. **Hick's Law + progressive disclosure:** 3–4 primary actions visible (New Trip, Check Status, Review Advisories). Rest behind collapsible sections or modal.
5. **Editorial type system** (Fraunces + IBM Plex Mono): Display/heading in serif, data in monospace. Line-height 1.6–1.8 for dark backgrounds.
6. **Information scent via direct labeling:** Trip cards show destination, next action, status badge inline. No nested legends or hover tooltips required.

---

sources_reviewed: 47
