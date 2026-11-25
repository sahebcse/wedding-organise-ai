"use client";
import { useEffect, useState } from "react";

// Admin/organizer: full guest×event matrix across ALL families.
export default function AdminMatrix() {
  const [events, setEvents] = useState<any[]>([]);
  const [text, setText] = useState("Papa aur mummy aayenge, main shayad nahi aa paunga. Hum 4 log Sangeet mein aayenge.");
  const [parsed, setParsed] = useState<any>(null);
  const load = () => fetch("/api/rsvp").then((r) => (r.ok ? r.json() : [])).then(setEvents);
  useEffect(() => { load(); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-maroon">RSVP Engine — All Families</h1>
      <div className="card p-4">
        <h2 className="font-bold">Paste Hinglish WhatsApp reply</h2>
        <textarea className="input mt-2" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-2 flex gap-2">
          <button className="btn-primary" onClick={async () => {
            const r = await fetch("/api/rsvp/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
            setParsed(await r.json());
          }}>Parse with Sarvam/fallback</button>
        </div>
        {parsed && <p className="mt-2 text-sm">Status: <b>{parsed.status}</b> • Headcount: <b>{parsed.headcount}</b> • via <b>{parsed.via}</b> {parsed.diet && `• Diet ${parsed.diet}`}</p>}
      </div>
      {events.map((e) => (
        <div key={e.id} className="card p-4">
          <div className="font-bold text-maroon">{e.title} — {e.venue}</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {e.invites.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between rounded-xl border p-2 text-sm">
                <span>{inv.guest.fullName} <span className="pill bg-stone-100">{inv.rsvp?.status ?? "PENDING"}{inv.rsvp ? ` ×${inv.rsvp.headcount}` : ""}</span></span>
                <span className="flex gap-1">
                  {(["CONFIRMED", "TENTATIVE", "DECLINED"] as const).map((st) => (
                    <button key={st} className="rounded-lg border px-2 py-1 text-xs min-h-[36px]" onClick={async () => {
                      await fetch("/api/rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteId: inv.id, status: st, headcount: st === "DECLINED" ? 0 : 1 }) });
                      load();
                    }}>{st === "CONFIRMED" ? "Yes" : st === "TENTATIVE" ? "Maybe" : "No"}</button>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
