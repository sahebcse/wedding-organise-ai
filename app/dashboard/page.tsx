"use client";
import { useEffect, useState } from "react";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card p-4"><h2 className="font-bold">{title}</h2><div className="mt-2">{children}</div></div>;
}
function SarvamCard() {
  const [u, setU] = useState<any>(null);
  useEffect(() => { fetch("/api/sarvam-usage").then((r) => (r.ok ? r.json() : null)).then(setU); }, []);
  if (!u) return <p className="mt-1 text-xs text-stone-400">Loading credit usage…</p>;
  const pct = u.total ? Math.round((u.used / u.total) * 100) : 0;
  return (
    <div className="mt-2 rounded-xl border border-gold/30 bg-gold/10 p-2 text-xs">
      <div className="flex justify-between font-bold"><span>Credits: {u.leftover}/{u.total} left</span><span>{u.calls} calls • {u.chars} chars</span></div>
      <div className="mt-1 h-2 rounded bg-stone-200"><div className="h-2 rounded bg-maroon transition-all" style={{ width: `${Math.min(100, pct)}%` }} /></div>
      {Object.entries(u.byFeature ?? {}).map(([f, v]: any) => (
        <div key={f} className="mt-0.5 flex justify-between border-b py-0.5 last:border-0">
          <span><code>{f}</code> {f === "rsvp-parse" ? "→ /rsvp PasteBox" : f === "i18n" ? "→ homepage (1st call/lang, then cached)" : f === "ticket-extract" ? "→ /arrivals ticket box" : ""}</span>
          <b>{v.calls} calls</b>
        </div>
      ))}
      {u.calls === 0 && <p className="mt-1 text-stone-500">No Sarvam calls yet — rule fallback everywhere. First AI call per feature appears here for the judge.</p>}
    </div>
  );
}
function KPI({ k, v, sub }: { k: string; v: string | number; sub?: string }) {
  return <div className="card p-3 text-center"><div className="text-2xl font-bold text-maroon">{v}</div><div className="text-sm text-stone-500">{k}</div>{sub && <div className="text-[11px] text-stone-400">{sub}</div>}</div>;
}

export default function Dashboard() {
  const [s, setS] = useState<any>(null);
  const [log, setLog] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setS);
    fetch("/api/events-log").then((r) => (r.ok ? r.json() : [])).then(setLog);
  }, []);
  if (!s) return <p>Loading dashboard…</p>;
  const fm: Record<string, boolean | string> = s.flagsmith?.flags ?? {};
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-maroon">Admin Dashboard <span className="text-sm font-normal text-stone-500">— everything, incl. sponsor health</span></h1>

      <div className="grid gap-3 md:grid-cols-4">
        <KPI k="Users" v={s.totalUsers} sub={`A ${s.users?.ADMIN ?? 0} • O ${s.users?.ORGANIZER ?? 0} • G ${s.users?.GUEST ?? 0}`} />
        <KPI k="Guests / Families" v={`${s.guests}`} sub={`${s.families} families`} />
        <KPI k="RSVPs" v={s.rsvps} sub={`✓${s.rsvpByStatus?.CONFIRMED ?? 0} ~${s.rsvpByStatus?.TENTATIVE ?? 0} ✗${s.rsvpByStatus?.DECLINED ?? 0}`} />
        <KPI k="Arrivals" v={s.arrivals} sub={`${s.batchedArrivals} batched • ${s.pendingArrivals} pending`} />
        <KPI k="Pickup batches" v={s.batches} sub={`${s.batchMessages} NudgeBee coord notes`} />
        <KPI k="Tasks" v={s.tasks} sub={`TODO ${s.tasksByStatus?.TODO} • DOING ${s.tasksByStatus?.DOING} • DONE ${s.tasksByStatus?.DONE}`} />
        <KPI k="Overdue / Unassigned" v={`${s.overdue}`} sub={`${s.unassigned} unassigned • ${s.tasksHigh} HIGH`} />
        <KPI k="Pending approvals" v={s.pendingApprovals} sub={`WA ${s.approvalsByKind?.WHATSAPP_BULK ?? 0} • Exp ${s.approvalsByKind?.EXPENSE_HIGH ?? 0} • Gift ${s.approvalsByKind?.GIFT_HIGH ?? 0}`} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card title={`Flagsmith ${s.flagsmith?.connected ? "🟢 connected" : "⚪ local fallback"}`}>
          <p className="text-xs text-stone-500">Source: <b>{s.flagsmith?.source}</b> • {s.flagsmith?.flagsOn} ON / {s.flagsmith?.flagsOff} OFF • <a className="underline font-bold" href="/settings">manage →</a></p>
          <div className="mt-2 space-y-1 text-xs">
            {Object.entries(fm).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b py-0.5 last:border-0"><code>{k}</code><b className={String(v) === "false" ? "text-red-600" : "text-green-700"}>{String(v)}</b></div>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-stone-400">Demo: turn rsvp-ai-parse OFF → /rsvp badge flips to rule-fallback; inviteVariant traditional↔modern flips /w hero.</p>
        </Card>
        <Card title={`NudgeBee ${s.nudgebee?.configured ? "🟢 configured" : "⚪ local queue"}`}>
          <p className="text-xs text-stone-500">Source: <b>{s.nudgebee?.configured ? `${s.nudgebee.source} (${s.nudgebee.urlHost})` : s.nudgebee?.source}</b> • <a className="underline font-bold" href="/settings">use-cases →</a></p>
          <div className="mt-2 space-y-1 text-xs">
            {[["whatsapp.bulk.requested", "WhatsApp bulk"], ["expense.approval_requested", "High expense"], ["gift.approval_requested", "High gift"], ["task.nudge", "Nudges"], ["task.update", "Task updates"], ["pickup.batch_created", "Batch runs"], ["photo.scan_done", "Photo scans"]].map(([kind, label]) => (
              <div key={kind} className="flex justify-between border-b py-0.5 last:border-0"><span>{label} <code className="text-stone-400">{kind}</code></span><b>{s.eventLogByKind?.[kind] ?? 0}</b></div>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-stone-400">Local Approval PENDING = source of truth; webhook adds Discord. {s.eventLogTotal} total workflow events.</p>
        </Card>
        <Card title={`Sarvam AI ${s.sarvam?.configured ? "🟢 live" : "⚪ rule fallback"}`}>
          <p className="text-xs text-stone-500">Source: <b>{s.sarvam?.source}</b></p>
          <SarvamCard />
          <p className="mt-1 text-xs">Hinglish RSVP parse in <a className="underline font-bold" href="/rsvp">/rsvp</a> (badge AI vs rule), 6-language homepage (first call per language, then cached), ticket extract in <a className="underline font-bold" href="/arrivals">/arrivals</a>. Without key: <code>lib/rsvp-parser.ts</code> handles <code>aayenge/shayad/nahi</code> + headcounts.</p>
          <p className="mt-1 text-[11px] text-stone-400">Demo: paste “Papa aur mummy aayenge…” → Parse → matrix + capacity alert.</p>
        </Card>
      </div>

      <Card title="Event-wise forecast">
        <div className="grid gap-2 md:grid-cols-2">
          {s.perEvent.map((e: any) => (
            <div key={e.title} className="rounded-xl border p-3">
              <div className="font-bold">{e.title} {e.alert && <span className="pill bg-red-100 text-red-700">capacity risk</span>}</div>
              <div className="text-sm">Confirmed {e.confirmed} • Tentative {e.tentative} • Pending {e.pending} • cap {e.warn}/{e.max}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Card title="Gifting">
          <div>Funded: <b>₹{(s.funded / 100).toLocaleString("en-IN")}</b> / ₹{(s.target / 100).toLocaleString("en-IN")} ({s.fundedPct}%)</div>
          <div className="text-sm text-stone-500">{s.gifts} gifts • {s.contributions} contributions ({s.anonContribs} anon)</div>
        </Card>
        <Card title="Spend (Kanban)">
          <div>Estimated: <b>₹{(s.spend / 100).toLocaleString("en-IN")}</b> • Spent: <b>₹{((s.spent ?? 0) / 100).toLocaleString("en-IN")}</b></div>
          <div className="mt-2 h-2 rounded bg-stone-200"><div className="h-2 rounded bg-maroon transition-all" style={{ width: `${s.spend ? Math.min(100, Math.round(((s.spent ?? 0) / s.spend) * 100)) : 0}%` }} /></div>
          <div className="text-xs text-stone-500">{s.subtickets} sub-tickets • {s.updates} shared updates</div>
        </Card>
        <Card title="Photos">
          <div>{s.photos} gallery • <b>{s.matches} matches</b> • {s.faceOnboarded} face profiles</div>
          <div className="text-xs text-stone-500">Face-search flag-gated; <a className="underline font-bold" href="/photos">/photos</a> → <a className="underline font-bold" href="/my-photos">/my-photos</a></div>
        </Card>
      </div>

      <Card title="Live event log (tasks, approvals, nudges → NudgeBee when webhook set)">
        {log.length === 0 && <p className="mt-1 text-sm text-stone-500">No events yet — create a task or nudge someone.</p>}
        <div className="max-h-64 space-y-1 overflow-y-auto text-sm">
          {log.map((e: any) => <div key={e.id} className="flex justify-between gap-2 border-b py-1"><span><b>{e.kind}</b> — {e.message}</span><span className="text-xs text-stone-400">{new Date(e.createdAt).toLocaleString("en-IN")}</span></div>)}
        </div>
      </Card>
    </div>
  );
}
