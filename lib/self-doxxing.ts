// Pure, side-effect-free helpers for the self-doxxing self-audit tool.
//
// IMPORTANT: nothing here performs network requests or executes searches.
// Every function takes locally-entered identifiers and returns copy-ready
// strings / URLs. The user runs them by hand. No PII ever leaves the machine.

// ---------------------------------------------------------------------------
// Identifiers the user can enter (all optional; we only build queries for the
// fields that are actually filled in).
// ---------------------------------------------------------------------------
export interface Identifiers {
  name: string;
  aliases: string[];
  city: string;
  employer: string;
  emails: string[];
  phones: string[];
  usernames: string[];
}

export function emptyIdentifiers(): Identifiers {
  return {
    name: "",
    aliases: [],
    city: "",
    employer: "",
    emails: [],
    phones: [],
    usernames: [],
  };
}

// A single generated item. It is either a copy-able query string (Google dork
// or quoted search) or a direct lookup/external URL — never both required.
export interface DorkQuery {
  label: string;
  query?: string;
  url?: string;
}

// Queries are grouped by the identifier that produced them so the UI can label
// each block ("Name", "Phone: 555-…", etc).
export interface DorkGroup {
  group: string;
  queries: DorkQuery[];
}

// ---------------------------------------------------------------------------
// Phone number permutations.
// ---------------------------------------------------------------------------

/**
 * Given a raw phone string, return the common textual formats people-search
 * sites and forums actually store, so a single OR-joined search covers them.
 *
 * Currently handles US/NANP 10-digit numbers (with optional leading 1 / +1).
 * For anything that doesn't reduce to 10 digits we fall back to returning the
 * digit string and the original input so the user still gets something usable.
 *
 * @param raw user-entered phone, any format
 * @returns de-duplicated list of formatted variants
 */
export function phonePermutations(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");

  // Normalise to the 10 significant NANP digits when possible.
  let core = digits;
  if (core.length === 11 && core.startsWith("1")) core = core.slice(1);

  if (core.length !== 10) {
    // Not a NANP number we can confidently format — return what we have.
    const fallback = [digits, raw.trim()].filter(Boolean);
    return [...new Set(fallback)];
  }

  const area = core.slice(0, 3);
  const prefix = core.slice(3, 6);
  const line = core.slice(6);

  const variants = [
    `+1${core}`, // E.164
    `${area}-${prefix}-${line}`, // dashed
    `${area}.${prefix}.${line}`, // dotted
    `${area} ${prefix} ${line}`, // spaced
    `(${area}) ${prefix}-${line}`, // parenthesised
    core, // bare 10 digits
  ];

  return [...new Set(variants)];
}

// ---------------------------------------------------------------------------
// Query / URL template helpers.
// ---------------------------------------------------------------------------

// Wrap a value in double quotes for an exact-phrase search.
function quoted(value: string): string {
  return `"${value.trim()}"`;
}

// Slugify a name into the "first-last" form most people-search URLs expect.
function nameSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

// Direct people-search lookup URLs, templated on a name slug + optional city.
function peopleSearchUrls(name: string, city: string): DorkQuery[] {
  const slug = nameSlug(name);
  if (!slug) return [];
  const citySlug = city ? nameSlug(city) : "";

  return [
    {
      label: "Whitepages",
      url: `https://www.whitepages.com/name/${slug}`,
    },
    {
      label: "Spokeo",
      url: `https://www.spokeo.com/${slug}`,
    },
    {
      label: "BeenVerified",
      url: `https://www.beenverified.com/people/${slug}/`,
    },
    {
      label: "Radaris",
      url: `https://radaris.com/p/${slug}/`,
    },
    {
      label: "ThatsThem",
      url: citySlug
        ? `https://thatsthem.com/name/${slug}/${citySlug}`
        : `https://thatsthem.com/name/${slug}`,
    },
    {
      label: "FastPeopleSearch",
      url: `https://www.fastpeoplesearch.com/name/${slug}`,
    },
  ];
}

// haveibeenpwned breach-exposure lookup for a single email.
function breachUrl(email: string): DorkQuery {
  return {
    label: "Have I Been Pwned (breach check)",
    url: `https://haveibeenpwned.com/account/${encodeURIComponent(email.trim())}`,
  };
}

// Reverse-image search entry points (the user uploads / pastes their own image).
function reverseImageQueries(): DorkQuery[] {
  return [
    { label: "Google Lens", url: "https://lens.google.com/" },
    { label: "Yandex Images", url: "https://yandex.com/images/" },
  ];
}

// ---------------------------------------------------------------------------
// Main dork builder.
// ---------------------------------------------------------------------------

/**
 * Build copy-ready search queries and lookup URLs from the user's identifiers.
 * Only generates a group when the underlying field(s) are present.
 */
export function buildDorks(ids: Identifiers): DorkGroup[] {
  const groups: DorkGroup[] = [];
  const name = ids.name.trim();
  const names = [name, ...ids.aliases.map((a) => a.trim())].filter(Boolean);

  // --- Name (+ aliases) -----------------------------------------------------
  if (names.length > 0) {
    const queries: DorkQuery[] = [];

    for (const n of names) {
      const q = quoted(n);
      if (ids.city.trim()) {
        queries.push({ label: `${n} + city`, query: `${q} ${quoted(ids.city)}` });
      }
      if (ids.employer.trim()) {
        queries.push({
          label: `${n} + employer`,
          query: `${q} ${quoted(ids.employer)}`,
        });
      }
      queries.push({
        label: `${n} + resume/CV/PDF`,
        query: `${q} (resume OR CV OR filetype:pdf)`,
      });
      queries.push({
        label: `${n} on LinkedIn`,
        query: `${q} site:linkedin.com`,
      });
    }

    // Direct people-search lookups + reverse image search (name-anchored).
    queries.push(...peopleSearchUrls(name, ids.city));
    queries.push(...reverseImageQueries());

    groups.push({ group: "Name", queries });
  }

  // --- Phones ---------------------------------------------------------------
  for (const phone of ids.phones.map((p) => p.trim()).filter(Boolean)) {
    const variants = phonePermutations(phone);
    const orJoined = variants.map((v) => `"${v}"`).join(" OR ");
    groups.push({
      group: `Phone: ${phone}`,
      queries: [
        { label: "All formats (OR-joined)", query: orJoined },
        {
          label: "Spy Dialer reverse lookup",
          url: `https://www.spydialer.com/default.aspx`,
        },
      ],
    });
  }

  // --- Emails ---------------------------------------------------------------
  for (const email of ids.emails.map((e) => e.trim()).filter(Boolean)) {
    const local = email.includes("@") ? email.split("@")[0] ?? "" : email;
    const queries: DorkQuery[] = [
      { label: "Full address", query: quoted(email) },
    ];
    if (local && local !== email) {
      queries.push({ label: "Local-part only", query: quoted(local) });
    }
    queries.push(breachUrl(email));
    groups.push({ group: `Email: ${email}`, queries });
  }

  // --- Usernames ------------------------------------------------------------
  for (const username of ids.usernames.map((u) => u.trim()).filter(Boolean)) {
    groups.push({
      group: `Username: ${username}`,
      queries: [
        {
          label: "Across social platforms",
          query: `${quoted(username)} site:reddit.com OR site:github.com OR site:x.com`,
        },
        {
          label: "Bare handle",
          query: quoted(username),
        },
      ],
    });
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Recurring-audit cadence math.
// ---------------------------------------------------------------------------

export interface AuditStatus {
  due: boolean; // at or past the cadence interval
  overdue: boolean; // more than the full interval past due (>= 2x slack)
  daysRemaining: number; // negative once overdue
}

// Approximate a month as 30 days — good enough for a reminder cadence.
const DAYS_PER_MONTH = 30;

/**
 * Given the last audit run (ISO date string) and a cadence in months, compute
 * whether a new run is due / overdue and how many days remain.
 *
 * @param lastRunISO ISO timestamp of last run, or null if never run
 * @param cadenceMonths 3 | 6 | 12 (any positive number works)
 * @param now injectable clock for testing; defaults to Date.now()
 */
export function auditStatus(
  lastRunISO: string | null,
  cadenceMonths: number,
  now: number = Date.now()
): AuditStatus {
  const cadenceDays = cadenceMonths * DAYS_PER_MONTH;

  // Never run → treat as due immediately.
  if (!lastRunISO) {
    return { due: true, overdue: false, daysRemaining: 0 };
  }

  const last = new Date(lastRunISO).getTime();
  if (Number.isNaN(last)) {
    return { due: true, overdue: false, daysRemaining: 0 };
  }

  const daysSince = Math.floor((now - last) / (1000 * 60 * 60 * 24));
  const daysRemaining = cadenceDays - daysSince;

  return {
    due: daysRemaining <= 0,
    // "overdue" once we're a further half-interval past the due date.
    overdue: daysRemaining <= -Math.ceil(cadenceDays / 2),
    daysRemaining,
  };
}
