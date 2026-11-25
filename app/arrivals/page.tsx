"use client";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

const PICKUP_POINTS = ["Araria Bus Stand", "Araria Railway Station", "Bagdogra Airport", "Darbhanga Airport"];
const WEDDING_VENUE = "Araria, Bihar — Wedding Venue";

export default function Arrivals() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const canManage = role === "ADMIN" || role === "ORGANIZER";
  const [data, setData] = useState<any>({ arrivals: [], batches: [] });
  const [people, setPeople] = useState<any[]>([]);
  const [f, setF] = useState({ guestId: "", mode: "TRAIN", station: PICKUP_POINTS[0], arrivalAt: "", partySize: "1", venue: WEDDING_VENUE, pnrRef: "" });
  const [fmsg, setFmsg] = useState("");
  const [ticketText, setTicketText] = useState("");
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [ticketBusy, setTicketBusy] = useState(false);
  const [ticketMsg, setTicketMsg] = useState("");
  const [ticketPhoto, setTicketPhoto] = useState(false);
  const load = () => fetch("/api/pickups").then((r) => r.json()).then(setData);
  useEffect(() => {
    load();
    if (canManage) fetch("/api/guests").then((r) => (r.ok ? r.json() : [])).then((g) => setPeople(g.map((x: any) => ({ id: x.id, fullName: x.fullName }))));
    else fetch("/api/rsvp/mine").then((r) => (r.ok ? r.json() : null)).then((m) => setPeople(m ? m.members.map((x: any) => ({ id: x.id, fullName: x.fullName })) : []));
  }, [canManage]);

  const batchedIds = useMemo(() => new Set((data.batches ?? []).flatMap((b: any) => b.members.map((m: any) => m.arrivalId))), [data]);
  const pending = useMemo(() => (data.arrivals ?? []).filter((a: any) => !batchedIds.has(a.id)), [data, batchedIds]);

  const addArrival = async () => {
    setFmsg("");
    if (!f.guestId || !f.station.trim() || !f.arrivalAt) { setFmsg("Pick who, pickup point and date/time."); return; }
    const r = await fetch("/api/pickups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId: f.guestId, mode: f.mode, station: f.station.trim(), arrivalAt: new Date(f.arrivalAt).toISOString(), partySize: Number(f.partySize) || 1, venue: WEDDING_VENUE, pnrRef: f.pnrRef.trim() }),
    });
    if (r.ok) { setF({ guestId: "", mode: "TRAIN", station: PICKUP_POINTS[0], arrivalAt: "", partySize: "1", venue: WEDDING_VENUE, pnrRef: "" }); setFmsg(canManage ? "Arrival added — run batcher to car-pool it." : "Pickup requested — organizers will batch you with co-travelers around your time."); load(); }
    else setFmsg(await r.text());
  };

  const extractTicket = async () => {
    setTicketMsg(""); setTicketBusy(true); setTicketPhoto(false);
    try {
      let text = ticketText.trim();
      // Free on-device OCR for the photo (no Sarvam credits), then 1 Sarvam call server-side.
      if (!text && ticketFile) {
        setTicketMsg("Reading photo text on-device (free)…");
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng");
        const { data } = await worker.recognize(ticketFile);
        await worker.terminate();
        text = (data?.text ?? "").trim();
        if (!text) { setTicketMsg("No text found in photo — type the PNR/station/date manually."); setTicketBusy(false); return; }
      }
      if (!text) { setTicketMsg("Upload a ticket photo or paste ticket text first."); setTicketBusy(false); return; }
      setTicketMsg("Sarvam extracting mode / pickup / time (1 call)…");
      const form = new FormData();
      form.append("text", text);
      if (ticketFile) form.append("file", ticketFile);
      const r = await fetch("/api/ticket-extract", { method: "POST", body: form });
      if (!r.ok) { setTicketMsg("Extract failed — fill the form manually."); setTicketBusy(false); return; }
      const j = await r.json();
      setF((prev) => ({
        ...prev,
        mode: j.mode ?? prev.mode,
        station: j.station && PICKUP_POINTS.includes(j.station) ? j.station : prev.station,
        arrivalAt: j.arrivalAt ? new Date(j.arrivalAt).toISOString().slice(0, 16) : prev.arrivalAt,
      }));
      if (j.photoUrl) setTicketPhoto(true);
      setTicketMsg(`Prefilled: ${j.mode} from ${j.station} ${j.arrivalAt ? "at " + new Date(j.arrivalAt).toLocaleString("en-IN") : ""} [${j.via === "sarvam" ? "AI" : "rule"}] — check + Request Pickup.`);
    } catch {
      setTicketMsg("Extract failed — fill the form manually.");
    }
    setTicketBusy(false);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-maroon">Arrivals + Car-Pool Batches <span className="text-sm font-normal text-stone-500">— Araria, Bihar</span></h1>
      <div className="card p-4">
        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-primary" onClick={async () => { await fetch("/api/pickups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "run" }) }); load(); }}>Run car-pool batcher (same pickup + ~60 min)</button>
            <span className="text-sm text-stone-500">{pending.length} pending • {(data.batches ?? []).length} batches • {(data.arrivals ?? []).length} total entries</span>
          </div>
        ) : (
          <p className="text-sm font-medium text-maroon">Guests enter pickups below — organizers batch same-time arrivals for car-pool. NudgeBee agent posts car-pool instructions + updates in each batch.</p>
        )}
        <p className="mt-2 text-sm text-stone-500">Pickup points: {PICKUP_POINTS.join(" • ")} → {WEDDING_VENUE}. Grouped by pickup point + 60-min window + 4-seat cab.</p>
      </div>

      <div className="card p-4">
        <h2 className="font-bold">🎫 Ticket extract — upload ticket photo, Sarvam picks mode / pickup / time</h2>
        <p className="mt-1 text-xs text-stone-500">Photo is read on-device (free OCR), then <b>1 Sarvam call</b> normalizes the text → mode (bus/train/plane), pickup point, date-time prefill below. Badge shows AI vs rule.</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <input type="file" accept="image/*" className="input" onChange={(e) => setTicketFile(e.target.files?.[0] ?? null)} />
          <textarea className="input" rows={2} placeholder="Or paste ticket text (PNR, station, date)…" value={ticketText} onChange={(e) => setTicketText(e.target.value)} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button className="btn-gold" disabled={ticketBusy} onClick={extractTicket}>{ticketBusy ? "Reading…" : "Extract from ticket"}</button>
          {ticketMsg && <span className="text-sm font-medium text-maroon">{ticketMsg}</span>}
        </div>
        {ticketPhoto && <p className="mt-1 text-xs text-stone-400">Photo attached and stored with the request.</p>}
      </div>

      <div className="card p-4">
        <h2 className="font-bold">{canManage ? "Add arrival (on behalf of guest)" : "Give your pickup (guest entry)"}</h2>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <select className="input" value={f.guestId} onChange={(e) => setF({ ...f, guestId: e.target.value })}>
            <option value="">Who is arriving?</option>
            {people.map((p: any) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
          </select>
          <select className="input" value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>
            <option>TRAIN</option><option>BUS</option><option>PLANE</option><option>CAR</option>
          </select>
          <select className="input" value={f.station} onChange={(e) => setF({ ...f, station: e.target.value })}>
            {PICKUP_POINTS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <input className="input" type="datetime-local" value={f.arrivalAt} onChange={(e) => setF({ ...f, arrivalAt: e.target.value })} />
          <input className="input" type="number" min={1} placeholder="Party size" value={f.partySize} onChange={(e) => setF({ ...f, partySize: e.target.value })} />
          <input className="input" value={WEDDING_VENUE} disabled title="Fixed wedding venue" />
        </div>
        <input className="input mt-2" placeholder="PNR / ticket ref (optional)" value={f.pnrRef} onChange={(e) => setF({ ...f, pnrRef: e.target.value })} />
        <button className="rounded-xl border px-4 py-2 mt-2 min-h-[44px] font-semibold text-sm" onClick={addArrival}>+ {canManage ? "Add Arrival" : "Request Pickup"}</button>
        {fmsg && <p className="mt-1 text-sm font-medium text-maroon">{fmsg}</p>}
      </div>

      {canManage && (
        <div className="card p-4 border-gold">
          <h2 className="font-bold">⏳ Pending to be batched ({pending.length}) — guest entries awaiting car-pool</h2>
          {pending.length === 0 && <p className="mt-1 text-sm text-stone-500">Nothing pending — all entries are batched. New guest entries will appear here.</p>}
          {pending.map((a: any) => <div key={a.id} className="border-b py-1 text-sm last:border-0">🟡 {a.guest.fullName} • {a.mode} • <b>{a.station}</b> • {new Date(a.arrivalAt).toLocaleString("en-IN")} ×{a.partySize} • PNR {a.pnrRef || "—"}</div>)}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {(data.batches ?? []).map((b: any) => (
          <div key={b.id} className="card p-4">
            <div className="font-bold">🚕 {b.station || b.venue}</div>
            <div className="text-xs text-stone-500">{new Date(b.windowStart).toLocaleString("en-IN")} → {new Date(b.windowEnd).toLocaleTimeString("en-IN")} → {b.venue}</div>
            <div className="text-sm">🚕 {b.vehicle?.label} • {b.members.length} pickups • NudgeBee comms inside ↓</div>
            <ul className="mt-2 text-sm list-disc pl-5">
              {b.members.map((m: any) => <li key={m.id}>{m.arrival.guest.fullName} — {m.arrival.mode} {m.arrival.station} ×{m.arrival.partySize}</li>)}
            </ul>
            <a className="mt-2 inline-block text-sm font-bold text-gold-dark underline" href={`/pickups/${b.id}`}>Open coordination →</a>
          </div>
        ))}
      </div>
      {(data.batches ?? []).length === 0 && <div className="card p-4 text-sm text-stone-500">No batches yet — {canManage ? "click Run car-pool batcher above." : "organizers will batch your pickup soon."}</div>}

      <div className="card p-4">
        <h2 className="font-bold">All guest entries ({(data.arrivals ?? []).length}) {canManage ? "— admin view" : ""}</h2>
        {(data.arrivals ?? []).map((a: any) => <div key={a.id} className="border-b py-1 text-sm">{batchedIds.has(a.id) ? "✅" : "🟡"} {a.guest.fullName} • {a.mode} • {a.station} • {new Date(a.arrivalAt).toLocaleString("en-IN")} • {a.venue} ×{a.partySize}</div>)}
      </div>
    </div>
  );
}
