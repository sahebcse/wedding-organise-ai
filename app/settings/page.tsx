"use client";
import { useEffect, useState } from "react";

const LANGS_UI = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "bho", label: "भोजपुरी" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "te", label: "తెలుగు" },
  { code: "mr", label: "मराठी" },
];

function LangPanel() {
  const [rows, setRows] = useState<Record<string, { total: number; cached: number }>>({});
  const [msg, setMsg] = useState("");
  const load = async () => {
    const out: Record<string, { total: number; cached: number }> = {};
    for (const l of LANGS_UI) {
      const r = await fetch(`/api/i18n?lang=${l.code}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
      out[l.code] = { total: r?.total ?? 22, cached: l.code === "en" ? (r?.total ?? 22) : (r?.cached ?? 0) };
    }
    setRows(out);
  };
  useEffect(() => { load(); }, []);
  return (
    <div className="mt-2 space-y-1">
      {LANGS_UI.map((l) => (
        <div key={l.code} className="flex items-center justify-between gap-2 rounded-xl border p-2 text-sm">
          <span><b>{l.label}</b> <code className="text-xs text-stone-400">{l.code}</code> — {rows[l.code]?.cached ?? "?"} strings cached</span>
          {l.code !== "en" && (
            <button className="rounded border px-2 py-1 text-xs min-h-[36px]" onClick={async () => {
              setMsg(`Translating ${l.label} (1 Sarvam call)…`);
              const r = await fetch("/api/i18n", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: l.code }) });
              const j = await r.json();
              setMsg(j.failed ? `${l.label}: Sarvam failed — English kept (0 credits burned on junk).` : `${l.label}: +${j.translated} strings cached, future loads free.`);
              load();
            }}>Translate (1 call)</button>
          )}
        </div>
      ))}
      {msg && <p className="text-xs font-medium text-maroon">{msg}</p>}
    </div>
  );
}

const FLAG_LABELS: Record<string, string> = {
  "rsvp-ai-parse": "AI RSVP parsing",
  "pickup-batcher": "Pickup batcher",
  "group-gifting": "Group gifting",
  "expense-dashboard": "Expense dashboard",
  "music-autoplay": "Invite music autoplay",
  "whatsapp-send": "WhatsApp sending",
  "face-search": "Face search",
  "inviteVariant": "Invite A/B (traditional|modern)",
};

const FLAG_USECASES: Record<string, { where: string; demo: string }> = {
  "rsvp-ai-parse": { where: "/rsvp PasteBox + Sarvam parse", demo: "OFF → badge rule-fallback, still parses Hinglish" },
  "pickup-batcher": { where: "/arrivals Run batcher", demo: "OFF → auto-run hidden, manual assign only" },
  "group-gifting": { where: "/gifts registry", demo: "OFF → registry read-only" },
  "expense-dashboard": { where: "/boards + /dashboard spend", demo: "OFF → hide spend widgets" },
  "music-autoplay": { where: "/w/[slug] HeroInvite music", demo: "ON → tries autoplay (browsers usually block)" },
  "whatsapp-send": { where: "POST /api/invites/send", demo: "OFF → bulk send blocked with Disabled by flag" },
  "face-search": { where: "/photos + /my-photos face-api", demo: "OFF → gallery-only, no 7MB model download" },
  "inviteVariant": { where: "/w/[slug] HeroInvite theme", demo: "traditional (maroon/gold) vs modern (minimal) — reload invite to see" },
};

const NUDGEBEE_USECASES = [
  { event: "whatsapp.bulk.requested / WHATSAPP_BULK", trigger: "POST /api/invites/send", demo: "Creates PENDING → approve in /boards → Discord pings" },
  { event: "expense.approval_requested / EXPENSE_HIGH", trigger: "Create task est >₹1L as organiser", demo: "402 needs approval → Discord budget alert → approve unblocks" },
  { event: "gift.approval_requested / GIFT_HIGH", trigger: "Contribute >₹50k in /gifts", demo: "402 needs approval → Discord → approve creates Contribution" },
  { event: "task.nudge / task.update / task.reassign", trigger: "🔔 Nudge, 💬 Post, reassign in /boards", demo: "Shows in /dashboard Live log + Discord triage" },
  { event: "pickup.batch_created / arrival_added", trigger: "Run batcher / add arrival in /arrivals", demo: "Vehicle-clash / driver Discord alert" },
  { event: "photo.scan_done", trigger: "Rescan in /photos", demo: "Processing-job event with match count" },
];

export default function SettingsPage() {
  const [w, setW] = useState<any>(null);
  const [flags, setFlags] = useState<Record<string, unknown>>({});
  const [meta, setMeta] = useState<{ source?: string; flagsmithConnected?: boolean }>({});
  const [integ, setInteg] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const load = () => {
    fetch("/api/wedding").then((r) => (r.ok ? r.json() : null)).then(setW);
    fetch("/api/flags").then((r) => (r.ok ? r.json() : {})).then((j: any) => {
      const { _meta, ...rest } = j ?? {};
      setFlags(rest);
      if (_meta) setMeta(_meta);
    });
    fetch("/api/integrations").then((r) => (r.ok ? r.json() : null)).then(setInteg);
  };
  useEffect(() => { load(); }, []);

  const saveWedding = async () => {
    if (!w) return;
    setMsg("");
    const r = await fetch("/api/wedding", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wedding: { coupleNames: w.coupleNames, story: w.story },
        events: (w.events ?? []).map((e: any) => ({ id: e.id, title: e.title, venue: e.venue, startsAt: e.startsAt })),
      }),
    });
    setMsg(r.ok ? "Saved — invite page and all schedules update everywhere." : "Save failed.");
  };

  const setFlag = async (key: string, value: string) => {
    await fetch("/api/flags", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value }) });
    load();
  };

  if (!w) return <p>Loading settings…</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-maroon">Wedding Settings</h1>
      {msg && <p className="rounded-xl bg-gold/15 p-3 text-sm font-medium">{msg}</p>}

      <div className="card p-4">
        <h2 className="font-bold">Invite content (updates the shareable page instantly)</h2>
        <label className="mt-2 block text-sm font-medium">Couple names</label>
        <input className="input" value={w.coupleNames ?? ""} onChange={(e) => setW({ ...w, coupleNames: e.target.value })} />
        <label className="mt-2 block text-sm font-medium">Story</label>
        <textarea className="input" rows={3} value={w.story ?? ""} onChange={(e) => setW({ ...w, story: e.target.value })} />
      </div>

      <div className="card p-4">
        <h2 className="font-bold">Events — timings & venues (updates propagate to RSVP, pickups, invite)</h2>
        {(w.events ?? []).map((e: any, i: number) => (
          <div key={e.id} className="mt-2 grid gap-2 rounded-xl border p-3 md:grid-cols-4">
            <span className="text-xs font-bold text-gold-dark">{e.key}</span>
            <input className="input" value={e.title} onChange={(ev) => setW({ ...w, events: w.events.map((x: any, j: number) => (j === i ? { ...x, title: ev.target.value } : x)) })} />
            <input className="input" value={e.venue} onChange={(ev) => setW({ ...w, events: w.events.map((x: any, j: number) => (j === i ? { ...x, venue: ev.target.value } : x)) })} />
            <input className="input" type="datetime-local" value={new Date(e.startsAt).toISOString().slice(0, 16)} onChange={(ev) => setW({ ...w, events: w.events.map((x: any, j: number) => (j === i ? { ...x, startsAt: new Date(ev.target.value).toISOString() } : x)) })} />
          </div>
        ))}
        <button className="btn-primary mt-3" onClick={saveWedding}>Save Everything</button>
      </div>

      <div className="card p-4">
        <h2 className="font-bold">Feature flags — Flagsmith <span className="text-xs font-normal text-stone-500">(hackathon demo: kill-switches + A/B)</span></h2>
        <p className="mt-1 text-xs text-stone-500">
          Source: <b>{String(meta.source ?? "local")}</b>
          {meta.flagsmithConnected ? " 🟢 Flagsmith connected" : " ⚪ local fallback"}
          {!meta.flagsmithConnected && (
            <> — set <code>FLAGSMITH_ENV_KEY</code> in <code>.env</code> (from Flagsmith → Environment → SDK keys) to go remote.</>
          )}
        </p>
        <div className="mt-2 space-y-1">
          {Object.keys(FLAG_LABELS).map((k) => (
            <div key={k} className="rounded-xl border p-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span><b>{FLAG_LABELS[k]}</b> <code className="text-xs text-stone-400">{k}</code> — <b>{String(flags[k])}</b></span>
                {k === "inviteVariant" ? (
                  <span className="flex gap-1">
                    <button className="rounded border px-2 py-1 text-xs min-h-[36px]" onClick={() => setFlag(k, "traditional")}>traditional</button>
                    <button className="rounded border px-2 py-1 text-xs min-h-[36px]" onClick={() => setFlag(k, "modern")}>modern</button>
                  </span>
                ) : (
                  <span className="flex gap-1">
                    <button className="rounded border px-2 py-1 text-xs min-h-[36px]" onClick={() => setFlag(k, "true")}>ON</button>
                    <button className="rounded border px-2 py-1 text-xs min-h-[36px]" onClick={() => setFlag(k, "false")}>OFF</button>
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-stone-500"><b>Used in:</b> {FLAG_USECASES[k]?.where} — <b>Demo:</b> {FLAG_USECASES[k]?.demo}</p>
            </div>
          ))}
        </div>
        <a href="/users" className="mt-3 inline-block text-sm font-bold text-gold-dark underline">Manage people & roles →</a>
      </div>

      <div className="card p-4">
        <h2 className="font-bold">Homepage languages — Sarvam first call, then cached free <span className="text-xs font-normal text-stone-500">(6 languages)</span></h2>
        <p className="mt-1 text-xs text-stone-500">English + Hindi + Bhojpuri + Kannada + Telugu + Marathi. Switcher lives on the homepage + header. First <b>Translate</b> click per language = 1 Sarvam call, then hardcoded in DB forever (see <code>TranslationCache</code>). Judge: switch language on <a className="underline font-bold" href="/">/</a> after translating.</p>
        <LangPanel />
      </div>

      <div className="card p-4">
        <h2 className="font-bold">NudgeBee — approvals + workflows + Discord <span className="text-xs font-normal text-stone-500">(hackathon demo)</span></h2>
        <p className="mt-1 text-xs text-stone-500">
          Status: <b>{integ?.nudgebee?.configured ? `🟢 ${integ.nudgebee.source} (${integ.nudgebee.urlHost})` : "⚪ local (no NUDGEBEE_WEBHOOK_URL)"}</b>
          {!integ?.nudgebee?.configured && <> — set <code>NUDGEBEE_WEBHOOK_URL</code> to a Discord webhook URL to fire Discord.</>}
          {" "}Sarvam: <b>{integ?.sarvam?.source ?? "rule-fallback"}</b> — demo badge AI vs rule in /rsvp.
        </p>
        <div className="mt-2 space-y-1">
          {NUDGEBEE_USECASES.map((u) => (
            <div key={u.event} className="rounded-xl border p-2 text-sm">
              <div><code className="text-xs font-bold">{u.event}</code></div>
              <div className="mt-0.5 text-xs text-stone-500"><b>Trigger:</b> {u.trigger}</div>
              <div className="text-xs text-stone-500"><b>Demo:</b> {u.demo}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-stone-500">Local <code>Approval PENDING</code> queue in <a className="underline font-bold" href="/boards">/boards</a> + <code>EventLog</code> in <a className="underline font-bold" href="/dashboard">/dashboard Live log</a> are source of truth — webhook only adds Discord. Verify: <code>GET /api/integrations</code>.</p>
      </div>
    </div>
  );
}
