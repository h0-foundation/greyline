// CRUD for trip_flights — keyed by trip, ordered by sort_order.

import { randomUUID } from "crypto";
import { getDb } from "../index";

export interface FlightRow {
  id: string;
  trip_id: string;
  carrier_iata: string | null;
  flight_number: string | null;
  dep_iata: string | null;
  dep_time: string | null;
  arr_iata: string | null;
  arr_time: string | null;
  seat: string | null;
  status: "planned" | "booked" | "flown" | "cancelled";
  sort_order: number;
  notes: string | null;
}

export function getFlightsByTrip(tripId: string): FlightRow[] {
  return getDb()
    .prepare("SELECT * FROM trip_flights WHERE trip_id = ? ORDER BY sort_order, dep_time")
    .all(tripId) as FlightRow[];
}

export function getFlight(id: string): FlightRow | undefined {
  return getDb()
    .prepare("SELECT * FROM trip_flights WHERE id = ?")
    .get(id) as FlightRow | undefined;
}

export interface FlightInput {
  carrier_iata?: string | null;
  flight_number?: string | null;
  dep_iata?: string | null;
  dep_time?: string | null;
  arr_iata?: string | null;
  arr_time?: string | null;
  seat?: string | null;
  status?: FlightRow["status"];
  notes?: string | null;
}

export function createFlight(tripId: string, input: FlightInput): FlightRow {
  const db = getDb();
  const id = randomUUID();
  const next = (db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM trip_flights WHERE trip_id = ?").get(tripId) as { n: number }).n;
  const u = (s?: string | null) => (s == null || s === "" ? null : String(s).toUpperCase().slice(0, 4));
  db.prepare(
    `INSERT INTO trip_flights
       (id, trip_id, carrier_iata, flight_number, dep_iata, dep_time, arr_iata, arr_time, seat, status, sort_order, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, tripId,
    u(input.carrier_iata),
    input.flight_number ? String(input.flight_number).toUpperCase().slice(0, 8) : null,
    u(input.dep_iata),
    input.dep_time || null,
    u(input.arr_iata),
    input.arr_time || null,
    input.seat || null,
    input.status ?? "planned",
    next,
    input.notes || null,
  );
  return getFlight(id)!;
}

export function updateFlight(id: string, input: FlightInput): FlightRow | undefined {
  const cur = getFlight(id);
  if (!cur) return undefined;
  const u = (s?: string | null) => (s == null ? cur : s === "" ? null : String(s).toUpperCase().slice(0, 4));
  const merged: FlightRow = {
    ...cur,
    carrier_iata: input.carrier_iata !== undefined ? (input.carrier_iata ? String(input.carrier_iata).toUpperCase().slice(0, 4) : null) : cur.carrier_iata,
    flight_number: input.flight_number !== undefined ? (input.flight_number ? String(input.flight_number).toUpperCase().slice(0, 8) : null) : cur.flight_number,
    dep_iata: input.dep_iata !== undefined ? (input.dep_iata ? String(input.dep_iata).toUpperCase().slice(0, 4) : null) : cur.dep_iata,
    dep_time: input.dep_time !== undefined ? input.dep_time : cur.dep_time,
    arr_iata: input.arr_iata !== undefined ? (input.arr_iata ? String(input.arr_iata).toUpperCase().slice(0, 4) : null) : cur.arr_iata,
    arr_time: input.arr_time !== undefined ? input.arr_time : cur.arr_time,
    seat: input.seat !== undefined ? input.seat : cur.seat,
    status: input.status ?? cur.status,
    notes: input.notes !== undefined ? input.notes : cur.notes,
  };
  void u; // silence unused
  getDb().prepare(
    `UPDATE trip_flights SET
       carrier_iata=?, flight_number=?, dep_iata=?, dep_time=?, arr_iata=?, arr_time=?,
       seat=?, status=?, notes=?, updated_at=datetime('now')
     WHERE id=?`,
  ).run(
    merged.carrier_iata, merged.flight_number, merged.dep_iata, merged.dep_time,
    merged.arr_iata, merged.arr_time, merged.seat, merged.status, merged.notes, id,
  );
  return getFlight(id);
}

export function deleteFlight(id: string): void {
  getDb().prepare("DELETE FROM trip_flights WHERE id = ?").run(id);
}
