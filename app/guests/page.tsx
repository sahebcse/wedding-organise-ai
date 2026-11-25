"use client";
import { useEffect, useState } from "react";

export default function Guests() {
  const [g, setG] = useState<any[]>([]);
  const [csv, setCsv] = useState("name,family,phone,relation,events\nRahul Sharma,Sharma,,cousin,Haldi;Sangeet\nNeha Verma,Verma,,friend,Reception");
  const [msg, setMsg] = useState("");
  const load = () => fetch("/api/guests").then((r) => r.json()).then(setG);
  useEffect(() => { load(); }, []);

  const doImport = async () => {
    setMsg("");
    const r = await fetch("/api/guests/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: csv }) });
    if (r.ok) {
      const j = await r.json();
      setMsg(`Imported ${j.guests} guests across ${j.families} families.${j.skippedLines?.length ? ` Skipped: ${j.skippedLines.join("; ")}` : ""}`);
      load();
    } else setMsg(await r.text());
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-maroon">Guests ({g.length})</h1>
      <div className="card p-4">
        <h2 className="font-bold">Import guest list (CSV)</h2>
        <p className="text-xs text-stone-500">Columns: name, family, phone, relation, events (event names separated by ; — blank = all 5 events).</p>
        <textarea className="input mt-2 font-mono text-xs" rows={5} value={csv} onChange={(e) => setCsv(e.target.value)} />
        <button className="rounded-xl border px-4 py-2 mt-2 min-h-[44px] font-semibold text-sm" onClick={doImport}>Import CSV →</button>
        {msg && <p className="mt-1 text-sm font-medium text-maroon">{msg}</p>}
      </div>
      <div className="card divide-y">{g.map((x: any) => <div key={x.id} className="p-3 text-sm"><b>{x.fullName}</b> • {x.family.name} • {x.invites.map((i: any) => `${i.event.title}:${i.rsvp?.status ?? "PENDING"}`).join(" | ")}</div>)}</div>
    </div>
  );
}
