import { describe, expect, it } from "vitest";
import { parseFamilyNL } from "../lib/rsvp-nl";

describe("family NL parser", () => {
  it("Mohan example: parents yes, uncle/aunt no, self maybe", () => {
    const r = parseFamilyNL("Papa aur Mummy aayenge, Chacha Chachi nahi aayenge. Ho sakta hai main na aaun.", "Mohan");
    const by = Object.fromEntries(r.map((m) => [m.name, m]));
    expect(by["Papa"].status).toBe("CONFIRMED");
    expect(by["Mummy"].status).toBe("CONFIRMED");
    expect(by["Chacha"].status).toBe("DECLINED");
    expect(by["Chachi"].status).toBe("DECLINED");
    expect(by["Mohan"].status).toBe("TENTATIVE");
    expect(by["Papa"].events).toHaveLength(5);
  });
  it("headcount with event scope", () => {
    const r = parseFamilyNL("Hum 4 log Sangeet mein aayenge", "Mohan");
    expect(r).toHaveLength(4);
    expect(r.every((m) => m.status === "CONFIRMED" && m.events.join() === "SANGEET")).toBe(true);
  });
  it("sirf haldi scope", () => {
    const r = parseFamilyNL("Mummy sirf haldi aayengi", "Mohan");
    expect(r[0].name).toBe("Mummy");
    expect(r[0].status).toBe("CONFIRMED");
    expect(r[0].events).toEqual(["HALDI"]);
  });
  it("skip reception only", () => {
    const r = parseFamilyNL("Papa reception skip karenge", "Mohan");
    expect(r[0].name).toBe("Papa");
    expect(r[0].status).toBe("DECLINED");
    expect(r[0].events).toEqual(["RECEPTION"]);
  });
  it("wedding skip applies to all", () => {
    const r = parseFamilyNL("Papa aur Mummy aayenge, wedding skip karenge", "Mohan");
    const by = Object.fromEntries(r.map((m) => [m.name, m]));
    expect(by["Papa"].events).not.toContain("WEDDING");
    expect(by["Papa"].events).toContain("HALDI");
  });
  it("english variants", () => {
    const r = parseFamilyNL("Father and mother will come, Chacha will not come, Mami may not come", "Mohan");
    const by = Object.fromEntries(r.map((m) => [m.name, m]));
    expect(by["Papa"].status).toBe("CONFIRMED");
    expect(by["Mummy"].status).toBe("CONFIRMED");
    expect(by["Chacha"].status).toBe("DECLINED");
    expect(by["Mami"].status).toBe("TENTATIVE");
  });
  it("aa raha hai and pakka variants", () => {
    const r = parseFamilyNL("Dost Arjun aa raha hai, Jija ji pakka aayenge, Sali sirf sangeet mein aayegi", "Mohan");
    const by = Object.fromEntries(r.map((m) => [m.name, m]));
    expect(by["Dost"].status).toBe("CONFIRMED");
    expect(by["Jija"].status).toBe("CONFIRMED");
    expect(by["Sali"].status).toBe("CONFIRMED");
    expect(by["Sali"].events).toEqual(["SANGEET"]);
  });
  it("beta-bahu duo and nani decline", () => {
    const r = parseFamilyNL("Beta aur Bahu dono aayenge, Nani nahi aa payengi", "Mohan");
    const by = Object.fromEntries(r.map((m) => [m.name, m]));
    expect(by["Beta"].status).toBe("CONFIRMED");
    expect(by["Bahu"].status).toBe("CONFIRMED");
    expect(by["Nani"].status).toBe("DECLINED");
  });
});
