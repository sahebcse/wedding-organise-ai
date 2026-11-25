import { describe, it, expect } from "vitest";
import { batchArrivals, giftRemaining } from "../lib/pickup-batcher";
const V = "Araria, Bihar — Wedding Venue";
describe("pickup-batcher", () => {
  it("batches same pickup point close times (car-pool)", () => {
    const b = batchArrivals([
      { id: "a", station: "Araria Railway Station", venue: V, arrivalAt: new Date("2026-11-25T10:00:00"), partySize: 2 },
      { id: "b", station: "Araria Railway Station", venue: V, arrivalAt: new Date("2026-11-25T10:30:00"), partySize: 2 },
    ]);
    expect(b.length).toBe(1); expect(b[0].memberIds).toEqual(["a", "b"]);
  });
  it("splits far times", () => {
    const b = batchArrivals([
      { id: "a", station: "Araria Railway Station", venue: V, arrivalAt: new Date("2026-11-25T10:00:00"), partySize: 1 },
      { id: "b", station: "Araria Railway Station", venue: V, arrivalAt: new Date("2026-11-25T12:30:00"), partySize: 1 },
    ]);
    expect(b.length).toBe(2);
  });
  it("splits pickup points", () => {
    const b = batchArrivals([
      { id: "a", station: "Araria Bus Stand", venue: V, arrivalAt: new Date("2026-11-25T10:00:00"), partySize: 1 },
      { id: "b", station: "Bagdogra Airport", venue: V, arrivalAt: new Date("2026-11-25T10:05:00"), partySize: 1 },
    ]);
    expect(b.length).toBe(2);
  });
  it("capacity overflow splits", () => {
    const b = batchArrivals([
      { id: "a", station: "Araria Bus Stand", venue: V, arrivalAt: new Date("2026-11-25T10:00:00"), partySize: 3 },
      { id: "b", station: "Araria Bus Stand", venue: V, arrivalAt: new Date("2026-11-25T10:10:00"), partySize: 3 },
    ], { vehicleCapacity: 4 });
    expect(b.length).toBe(2);
  });
  it("gift remaining", () => { expect(giftRemaining(100000, 1, 40000)).toBe(60000); });
});
