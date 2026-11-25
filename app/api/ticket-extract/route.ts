import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { logSarvamUsage } from "@/lib/sarvam";

const PICKUPS = ["Araria Bus Stand", "Araria Railway Station", "Bagdogra Airport", "Darbhanga Airport"];
const VENUE = "Araria, Bihar — Wedding Venue";

// Ticket extract: optional photo upload (stored for reference) + ticket text.
// Sarvam normalizes Hinglish → English (1 call), rules classify mode/pickup/time.
export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  let text = "";
  let photoUrl: string | null = null;
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return new NextResponse("use multipart or json", { status: 400 });
    text = String(form.get("text") ?? "");
    const file = form.get("file") as File | null;
    if (file && (file as any).size !== 0) {
      const buf = Buffer.from(await file.arrayBuffer());
      await mkdir(path.join(process.cwd(), "public", "uploads", "tickets")).catch(() => {});
      const name = `${Date.now()}-${(file as any).name ?? "ticket.jpg"}`;
      await writeFile(path.join(process.cwd(), "public", "uploads", "tickets", name), buf);
      photoUrl = `/uploads/tickets/${name}`;
    }
  } else {
    const b = await req.json().catch(() => null);
    text = String(b?.text ?? "");
  }
  if (!text.trim() && !photoUrl) return new NextResponse("paste ticket text or upload photo", { status: 400 });

  // 1 Sarvam call: normalize to English for reliable keyword extract.
  let norm = text;
  let via: "sarvam" | "rule" = "rule";
  if (text.trim()) {
    // reuse translate helper but log under ticket-extract feature
    const { sarvamTranslateHiToEn } = await import("@/lib/sarvam");
    const en = await sarvamTranslateHiToEn(text);
    if (en) {
      norm = `${text} ${en}`;
      via = "sarvam";
      await logSarvamUsage("ticket-extract", text.slice(0, 500).length);
    }
  }

  const t = norm.toLowerCase();
  let mode = "TRAIN";
  if (/(flight|airport|air india|indigo|spicejet|pnr.*air|boarding pass)/.test(t)) mode = "PLANE";
  else if (/(bus|volvo|sleeper|redbus| Anand Vihar ISBT|stand)/.test(t)) mode = "BUS";
  else if (/(car|cab|taxi|self drive)/.test(t)) mode = "CAR";

  let station = "";
  for (const p of PICKUPS) {
    const short = p.toLowerCase().split(" ")[0];
    if (t.includes(p.toLowerCase()) || t.includes(short)) { station = p; break; }
  }
  if (!station) {
    if (mode === "PLANE") station = t.includes("darbhanga") ? "Darbhanga Airport" : "Bagdogra Airport";
    else if (mode === "BUS") station = "Araria Bus Stand";
    else station = "Araria Railway Station";
  }

  // date/time: dd-mm-yyyy / dd/mm + hh:mm
  let arrivalAt: string | null = null;
  const dm = t.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  const tm = t.match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/);
  if (dm) {
    const d = new Date();
    d.setDate(parseInt(dm[1], 10));
    d.setMonth(parseInt(dm[2], 10) - 1);
    if (dm[3]) d.setFullYear(parseInt(dm[3].length === 2 ? "20" + dm[3] : dm[3], 10));
    if (tm) {
      let h = parseInt(tm[1], 10);
      if (tm[3] === "pm" && h < 12) h += 12;
      d.setHours(h, parseInt(tm[2], 10), 0, 0);
    }
    arrivalAt = d.toISOString();
  }

  return NextResponse.json({ mode, station, venue: VENUE, arrivalAt, via, photoUrl });
}
