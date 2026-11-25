"use client";
import { useEffect, useState } from "react";

type Mine = {
  family: { id: string; name: string };
  events: { id: string; key: string; title: string; venue: string }[];
  members: { id: string; fullName: string; diet: string; invites: { id: string; eventId: string; status: string; headcount: number }[] }[];
};
type Preview = { name: string; status: string; events: string[] };

const PILL: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-800",
  TENTATIVE: "bg-yellow-100 text-yellow-800",
  DECLINED: "bg-red-100 text-red-700",
  PENDING: "bg-stone-100 text-stone-500",
};

export default function FamilyRsvp() {
  const [mine, setMine] = useState<Mine | null>(null);
  const [text, setText] = useState("");
  const [via, setVia] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview[] | null>(null);
  const [manual, setManual] = useState("");
  const [msg, setMsg] = useState("");
  const load = () => fetch("/api/rsvp/mine").then((r) => (r.ok ? r.json() : null)).then(setMine);
  useEffect(() => { load(); }, []);

  const previewNL = async () => {
    setMsg("");
    const r = await fetch("/api/rsvp/parse-nl", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    if (!r.ok) { setMsg("Could not understand that — try simpler words."); return; }
    const j = await r.json();
    if (!j.members?.length) { setMsg("No people found — mention names like Papa, Mummy, Chacha."); return; }
    setVia(j.via ?? null);
    setPreview(j.members);
  };
  const togglePreviewEvent = (idx: number, ev: string) => {
    if (!preview) return;
    const next = preview.map((p, i) => {
      if (i !== idx) return p;
      const has = p.events.includes(ev);
      return { ...p, events: has ? p.events.filter((e) => e !== ev) : [...p.events, ev] };
    });
    setPreview(next);
  };
  const confirmNL = async () => {
    if (!preview?.length) return;
    const r = await fetch("/api/rsvp/apply-nl", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ members: preview }) });
    if (r.ok) {
      const j = await r.json();
      setMsg(`Added ${j.created} new, updated ${j.updated}.`);
      setPreview(null);
      load();
    }
  };
  const setStatus = async (inviteId: string, status: string, headcount?: number) => {
    await fetch("/api/rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteId, status, ...(headcount !== undefined ? { headcount } : {}) }) });
    load();
  };
  const setDiet = async (guestId: string, diet: string) => {
    // diet rides on any of the member's invites (server applies to guest)
    const m = mine?.members.find((x) => x.id === guestId);
    const inv = m?.invites[0];
    if (!inv) return;
    await fetch("/api/rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteId: inv.id, status: inv.status, diet }) });
    load();
  };
  const addManual = async () => {
    if (!manual.trim()) return;
    const r = await fetch("/api/rsvp/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: manual.trim() }) });
    if (r.ok) { setManual(""); load(); } else setMsg(await r.text());
  };
  const remove = async (guestId: string) => {
    const r = await fetch("/api/rsvp/members", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guestId }) });
    if (r.ok) load(); else setMsg(await r.text());
  };

  if (!mine) return <p>Loading your family…</p>;
  const countFor = (eventId: string) =>
    mine.members.filter((m) => m.invites.find((i) => i.eventId === eventId)?.status === "CONFIRMED").length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-maroon">My Family RSVP</h1>
      <p className="text-sm text-stone-500">Only your family sees this. Add everyone coming from your side, then mark each person&apos;s availability per event — e.g. 2 for Haldi, all 4 for Reception.</p>

      <div className="card p-4">
        <h2 className="font-bold">Say it in your own words (Hindi / Hinglish / English)</h2>
        <textarea className="input mt-2" rows={3} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Papa Mummy aayenge, Chacha Chachi nahi aayenge, main shayad aaun" />
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={previewNL}>Understand & Fill Entries →</button>
          <button className="rounded-xl border px-4 py-2 text-sm min-h-[44px]" onClick={() => setText("Papa aur Mummy aayenge, Chacha Chachi nahi aayenge. Ho sakta hai main na aaun.")}>Fill example</button>
        </div>
        {preview && (
          <div className="mt-3 rounded-xl bg-ivory p-3">
            <p className="text-sm font-bold">We understood this{via ? ` (via ${via})` : ""} — tap an event to remove/add it, then confirm:</p>
            <ul className="mt-2 space-y-2 text-sm">
              {preview.map((p, i) => (
                <li key={i}>
                  <b>{p.name}</b> <span className={`pill ${PILL[p.status]}`}>{p.status}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {(["HALDI", "MEHENDI", "SANGEET", "WEDDING", "RECEPTION"] as const).map((ev) => {
                      const on = p.events.includes(ev);
                      return (
                        <button key={ev} onClick={() => togglePreviewEvent(i, ev)} title={on ? "Tap to remove" : "Tap to add back"}
                          className={`rounded-full border px-2 py-1 text-[11px] font-bold min-h-[32px] ${on ? "bg-green-100 text-green-800 border-green-300" : "bg-stone-100 text-stone-400 border-dashed border-stone-300 line-through"}`}>
                          {ev}
                        </button>
                      );
                    })}
                  </span>
                </li>
              ))}
            </ul>
            <button className="btn-gold mt-2" onClick={confirmNL}>Confirm & Save</button>
          </div>
        )}
        {msg && <p className="mt-2 text-sm font-medium text-maroon">{msg}</p>}
      </div>

      <div className="card flex flex-wrap items-center gap-2 p-4">
        <input className="input flex-1 min-w-[200px]" placeholder="Add a person (e.g. Nani)" value={manual} onChange={(e) => setManual(e.target.value)} />
        <button className="rounded-xl border px-4 py-2 min-h-[44px] font-semibold" onClick={addManual}>+ Add</button>
      </div>

      {mine.events.map((e) => (
        <div key={e.id} className="card p-4">
          <div className="font-bold text-maroon">{e.title} <span className="text-sm font-normal text-stone-500">• {e.venue} • {countFor(e.id)} coming</span></div>
          <div className="mt-2 space-y-2">
            {mine.members.map((m) => {
              const inv = m.invites.find((i) => i.eventId === e.id);
              if (!inv) return null;
              const st = inv.status;
              return (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-2 text-sm">
                  <span className="font-medium">{m.fullName} <span className={`pill ml-1 ${PILL[st]}`}>{st}{st === "CONFIRMED" && inv.headcount > 1 ? ` ×${inv.headcount}` : ""}</span>
                    <select className="ml-2 rounded-lg border px-1 py-0.5 text-xs" value={m.diet || "UNKNOWN"} title="Food preference"
                      onChange={(e) => setDiet(m.id, e.target.value)}>
                      <option value="UNKNOWN">Diet?</option><option value="VEG">Veg</option><option value="NONVEG">Non-veg</option><option value="JAIN">Jain</option>
                    </select>
                  </span>
                  <span className="flex items-center gap-1">
                    {st === "CONFIRMED" && (
                      <span className="flex items-center gap-1 mr-1">
                        <button className="rounded border px-2 py-1 text-xs min-h-[36px]" title="Fewer heads"
                          onClick={() => setStatus(inv.id, "CONFIRMED", Math.max(1, (inv.headcount || 1) - 1))}>−</button>
                        <span className="text-xs font-bold" title="Heads (you + plus-ones)">{inv.headcount || 1}</span>
                        <button className="rounded border px-2 py-1 text-xs min-h-[36px]" title="More heads (plus-ones)"
                          onClick={() => setStatus(inv.id, "CONFIRMED", Math.min(20, (inv.headcount || 1) + 1))}>+</button>
                      </span>
                    )}
                    {(["CONFIRMED", "TENTATIVE", "DECLINED"] as const).map((s) => (
                      <button key={s}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold min-h-[36px] ${st === s ? "bg-maroon text-white border-maroon" : ""}`}
                        onClick={() => setStatus(inv.id, st === s ? "PENDING" : s)} title={s}>
                        {s === "CONFIRMED" ? "Yes" : s === "TENTATIVE" ? "Maybe" : "No"}
                      </button>
                    ))}
                    <button className="rounded-lg px-2 py-1.5 text-xs text-stone-400" onClick={() => remove(m.id)} title="Remove">✕</button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
