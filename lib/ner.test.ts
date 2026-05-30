import { describe, it, expect } from "vitest";
import { extractEntities, groupEntities, type EntityType } from "./ner";

function vals(text: string, type: EntityType): string[] {
  return extractEntities(text)
    .filter((e) => e.type === type)
    .map((e) => e.value);
}

describe("extractEntities", () => {
  it("returns nothing for empty input", () => {
    expect(extractEntities("")).toEqual([]);
    expect(extractEntities("   ")).toEqual([]);
  });

  it("pulls emails and dedupes case-insensitively with a count", () => {
    const r = extractEntities("Mail Jane@Acme.com or jane@acme.com again.");
    const email = r.find((e) => e.type === "email")!;
    expect(email.value.toLowerCase()).toBe("jane@acme.com");
    expect(email.count).toBe(2);
  });

  it("extracts URLs and IPs without the URL bleeding into the IP pass", () => {
    expect(vals("see https://example.com/path?x=1 now", "url")).toEqual(["https://example.com/path?x=1"]);
    expect(vals("host at 192.168.1.20 today", "ipv4")).toEqual(["192.168.1.20"]);
  });

  it("does not match an email's @ as a handle", () => {
    expect(vals("contact bob@corp.io", "handle")).toEqual([]);
    expect(vals("follow @bob_smith here", "handle")).toEqual(["@bob_smith"]);
  });

  it("recognises IBAN and crypto addresses", () => {
    expect(vals("acct GB82WEST12345698765432 ok", "iban")).toEqual(["GB82WEST12345698765432"]);
    expect(vals("send to 0x52908400098527886E0F7030069857D2E4169EE7", "crypto")).toEqual([
      "0x52908400098527886E0F7030069857D2E4169EE7",
    ]);
  });

  it("extracts phone numbers but not bare IPs", () => {
    const phones = vals("call +1 (415) 555-0132 or 020 7946 0958", "phone");
    expect(phones.length).toBe(2);
    expect(vals("10.0.0.1 is internal", "phone")).toEqual([]);
  });

  it("guesses multi-word capitalised names, skipping sentence-start words", () => {
    const names = vals("John Smith met Acme Corporation. The Building was tall.", "name");
    expect(names).toContain("John Smith");
    expect(names).toContain("Acme Corporation");
    expect(names).not.toContain("The Building");
  });
});

describe("groupEntities", () => {
  it("groups by type and drops empty groups", () => {
    const groups = groupEntities(extractEntities("John Smith emailed jane@acme.com"));
    const types = groups.map((g) => g.type);
    expect(types).toContain("name");
    expect(types).toContain("email");
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
  });
});
