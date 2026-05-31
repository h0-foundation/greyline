import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Temp DB → migrations (incl. 018 api_key column) run. Verifies the key is
// stored, masked on read, preserved across toggles, and clearable.
describe("connector API-key storage (api_toggles.api_key)", () => {
  let dir: string;
  let repo: typeof import("./settings");
  let closeDb: () => void;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "greyline-keys-"));
    process.env.GREYLINE_DATA_DIR = dir;
    repo = await import("./settings");
    ({ closeDb } = await import("../index"));
  });

  afterAll(() => {
    closeDb?.();
    rmSync(dir, { recursive: true, force: true });
  });

  it("stores + reads a key, and getApiToggles masks it (has_key only)", () => {
    repo.setApiKey("firms", "SECRET123");
    expect(repo.getApiKey("firms")).toBe("SECRET123");
    const toggles = repo.getApiToggles();
    expect(toggles.find((t) => t.api_id === "firms")?.has_key).toBe(true);
    expect(JSON.stringify(toggles)).not.toContain("SECRET123"); // never leaked
  });

  it("flipping the toggle preserves the stored key", () => {
    repo.setApiToggle("firms", true);
    expect(repo.getApiKey("firms")).toBe("SECRET123");
    repo.setApiToggle("firms", false);
    expect(repo.getApiKey("firms")).toBe("SECRET123");
  });

  it("clearing the key with null removes it", () => {
    repo.setApiKey("firms", null);
    expect(repo.getApiKey("firms")).toBeNull();
    expect(repo.getApiToggles().find((t) => t.api_id === "firms")?.has_key).toBe(false);
  });
});
