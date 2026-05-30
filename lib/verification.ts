/* Verification & source-protection playbooks — pure, offline, structured.
 *
 * Methodology distilled in research/INVESTIGATIVE_JOURNALISM_OSINT.md from the
 * way working investigators actually train: Caulfield's SIFT + the Stanford
 * History Education Group's "lateral reading" finding (fact-checkers verify by
 * leaving the page, not scrolling it); Bellingcat's open-source media
 * verification; and the source-protection practice of CPJ / Freedom of the
 * Press Foundation / EFF. Educational. Defensive. Not legal advice.
 */

export interface PlaybookStep {
  title: string;
  detail: string;
}

export interface Playbook {
  id: string;
  title: string;
  intro: string;
  steps: PlaybookStep[];
  source: string;
}

// SIFT — the four "moves" to make before you trust or share something online.
export const SIFT: Playbook = {
  id: "sift",
  title: "SIFT — before you trust or share",
  intro:
    "Four fast moves to run on any claim, image, or article. The goal is not to evaluate the page in front of you, but to find out what the wider record says.",
  steps: [
    { title: "Stop", detail: "Notice your reaction. The more it provokes outrage or confirms what you already believe, the more it needs checking. Don't share yet." },
    { title: "Investigate the source", detail: "Read laterally: leave the page and open new tabs to find out who is behind it and what others say about them — don't rely on the site's own About page." },
    { title: "Find better coverage", detail: "Look for trusted reporting on the same claim. If only the original source carries it, treat it as unconfirmed." },
    { title: "Trace to the original", detail: "Follow quotes, statistics, and media back to their first context — re-reporting strips and distorts. Verify the primary source exists and says what's claimed." },
  ],
  source: "Caulfield, SIFT (2019); Stanford History Education Group on lateral reading (Wineburg & McGrew, 2019).",
};

// Open-source media verification (image / video / location / time).
export const MEDIA: Playbook = {
  id: "media",
  title: "Verify an image or video",
  intro:
    "Establish where and when a piece of media was actually captured before believing its caption. Each step is something you can do on your own machine.",
  steps: [
    { title: "Reverse-image search", detail: "Check whether the image is old or recycled. Search it on multiple engines — a single engine misses most matches." },
    { title: "Read the metadata", detail: "EXIF can carry GPS, device, and timestamps — but it is trivially edited or stripped, so treat it as a lead, not proof. Strip your own before publishing." },
    { title: "Geolocate from the scene", detail: "Cross-reference fixed features — signage, mountains, architecture, road markings — against satellite and street imagery to pin the location." },
    { title: "Chronolocate from shadows", detail: "Shadow direction and length give the sun's azimuth and altitude, which date and time-stamp a daytime photo at a known location." },
    { title: "Corroborate", detail: "Find independent media of the same event from different angles or sources before concluding." },
  ],
  source: "Bellingcat Online Investigation Toolkit; First Draft / Verification Handbook (Silverman).",
};

// Protecting a source / contacting a journalist safely.
export const SOURCE_PROTECTION: Playbook = {
  id: "source-protection",
  title: "Protect a source (or be one)",
  intro:
    "If sensitive information needs to move between a source and a reporter, the channel and the metadata are the risk — not just the message. Plan before you reach out.",
  steps: [
    { title: "Use the right channel", detail: "Prefer end-to-end-encrypted tools (Signal) or a newsroom's anonymous dropbox. SecureDrop (Freedom of the Press Foundation) and GlobaLeaks are the two mainstream submission systems — reached over Tor so the newsroom never learns your identity or IP." },
    { title: "Separate from your normal life", detail: "Never use a work device, work account, or work network. Metadata (who contacted whom, when) often exposes a source even when the content is encrypted." },
    { title: "Minimise what you carry", detail: "Crossing a border: power devices fully OFF (not sleep), prefer a strong PIN over biometrics, and carry only the data you actually need." },
    { title: "Strip metadata before sharing", detail: "Documents and photos leak authorship, GPS, and revision history. Remove it before anything leaves your hands." },
  ],
  source: "Committee to Protect Journalists Digital Safety Kit; Freedom of the Press Foundation (SecureDrop); EFF border-crossing guidance.",
};

export const PLAYBOOKS: Playbook[] = [SIFT, MEDIA, SOURCE_PROTECTION];
