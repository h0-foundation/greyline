import { getDb } from '../index.js';

export function getCountryProfile(countryCode: string) {
  return getDb().prepare('SELECT * FROM country_profiles WHERE country_code = ?').get(countryCode);
}

export function getAllCountryProfiles() {
  return getDb().prepare('SELECT country_code, updated_at FROM country_profiles ORDER BY country_code').all();
}

export function getAllCountrySummaries(): Array<{ country_code: string; name: string; region: string; flag: string }> {
  const rows = getDb().prepare('SELECT country_code, rest_countries FROM country_profiles ORDER BY country_code').all() as Array<{ country_code: string; rest_countries: string | null }>;
  return rows.map((row) => {
    if (!row.rest_countries) return { country_code: row.country_code, name: row.country_code, region: 'Unknown', flag: '' };
    try {
      const rc = JSON.parse(row.rest_countries);
      return {
        country_code: row.country_code,
        name: rc?.name?.common ?? row.country_code,
        region: rc?.region ?? 'Unknown',
        flag: rc?.flag ?? ''
      };
    } catch {
      return { country_code: row.country_code, name: row.country_code, region: 'Unknown', flag: '' };
    }
  });
}

export function upsertCountryProfile(countryCode: string, data: Record<string, string | null>) {
  const db = getDb();
  const existing = getCountryProfile(countryCode);

  if (existing) {
    const fields = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => `${k} = ?`);
    fields.push("updated_at = datetime('now')");
    const values = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([, v]) => v);
    values.push(countryCode);
    db.prepare(`UPDATE country_profiles SET ${fields.join(', ')} WHERE country_code = ?`).run(...values);
  } else {
    db.prepare(
      "INSERT INTO country_profiles (country_code, rest_countries, cia_factbook, cultural, advisory, financial, comms, photography, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
    ).run(countryCode, data.rest_countries ?? null, data.cia_factbook ?? null, data.cultural ?? null, data.advisory ?? null, data.financial ?? null, data.comms ?? null, data.photography ?? null);
  }

  return getCountryProfile(countryCode);
}
