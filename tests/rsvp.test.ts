import { describe, it, expect } from "vitest";
import { parseRsvpRule } from "../lib/rsvp-parser";
describe("rsvp-parser", () => {
  it("confirms parents", () => { const r = parseRsvpRule("Papa aur mummy aayenge"); expect(r.status).toBe("CONFIRMED"); expect(r.headcount).toBeGreaterThanOrEqual(2); });
  it("tentative", () => { expect(parseRsvpRule("main shayad nahi aa paunga").status).toBe("TENTATIVE"); });
  it("declined zero", () => { const r = parseRsvpRule("Hum wedding skip karenge, nahi aa payenge"); expect(r.status).toBe("DECLINED"); expect(r.headcount).toBe(0); });
  it("hum 4 log", () => { expect(parseRsvpRule("Hum 4 log Sangeet mein aayenge").headcount).toBe(4); });
  it("jain diet", () => { expect(parseRsvpRule("We are coming, need jain food").diet).toBe("JAIN"); });
});
