"use client";
import { useEffect, useState } from "react";
export default function BatchDetail({ params }: { params: { batchId: string } }) {
  const [b, setB] = useState<any>(null);
  const [text, setText] = useState("");
  const load = () => fetch(`/api/pickups/${params.batchId}/notes`).then((r) => r.json()).then(setB);
  useEffect(() => { load(); }, [params.batchId]);
  if (!b) return <p>Loading batch…</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-maroon">Pickup: {b.station || b.venue} → {b.venue}</h1>
      <div className="card p-4">
        <div className="text-sm">🕒 {new Date(b.windowStart).toLocaleString("en-IN")} → {new Date(b.windowEnd).toLocaleTimeString("en-IN")} • 🚕 {b.vehicle?.label} • 📍 {b.station || "pickup point"}</div>
        <h2 className="mt-2 font-bold">Arriving together — meet at {b.members[0]?.arrival.station ?? "pickup point"}</h2>
        <ul className="list-disc pl-5 text-sm">{b.members.map((m: any) => <li key={m.id}>{m.arrival.guest.fullName} • {m.arrival.mode} ×{m.arrival.partySize}</li>)}</ul>
        <a className="btn-gold mt-3 inline-block" href={`https://wa.me/?text=${encodeURIComponent(`We are sharing pickup to ${b.venue} at ${new Date(b.windowStart).toLocaleString("en-IN")}. Meet at pickup point!`)}`} target="_blank">Coordinate on WhatsApp</a>
      </div>
      <div className="card p-4">
        <h2 className="font-bold">Coordination notes</h2>
        <div className="mt-2 space-y-1">{(b.messages ?? []).map((m: any) => <div key={m.id} className="rounded-lg bg-ivory p-2 text-sm"><b>{m.author.name}:</b> {m.text}</div>)}</div>
        <div className="mt-2 flex gap-2">
          <input className="input" placeholder="e.g. My train is 10 min late, wait at gate 2" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary" onClick={async () => { await fetch(`/api/pickups/${params.batchId}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }); setText(""); load(); }}>Send</button>
        </div>
      </div>
    </div>
  );
}
