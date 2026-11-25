"use client";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

type Sub = { id: string; title: string; status: string; owner: string | null };
type T = { id: string; boardId: string; title: string; owner: string | null; status: string; priority: string; dueAt: string | null; estimatePaise: number; actualPaise: number; dependsOn: string | null; updates?: { id: string; author: string; text: string; createdAt: string }[]; subtickets?: Sub[] };
type B = { id: string; title: string; category: string; tasks: T[] };

export default function Boards() {
  const { data: session } = useSession();
  const me = (session?.user?.email as string | undefined) ?? "";
  const myName = (session?.user as { name?: string } | undefined)?.name ?? "";
  const [d, setD] = useState<{ boards: B[]; approvals: any[]; staff: { name: string; email: string }[] }>({ boards: [], approvals: [], staff: [] });
  const [q, setQ] = useState("");
  const [assignee, setAssignee] = useState("ALL");
  const [prio, setPrio] = useState("ALL");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [nt, setNt] = useState<Record<string, { title: string; owner: string; estimate: string; priority: string; due: string; dep: string }>>({});
  const [actualEdits, setActualEdits] = useState<Record<string, string>>({});
  const [estEdits, setEstEdits] = useState<Record<string, string>>({});
  const [ownerSearch, setOwnerSearch] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newSub, setNewSub] = useState<Record<string, { title: string; owner: string }>>({});

  const load = () => fetch("/api/boards").then((r) => r.json()).then(setD);
  useEffect(() => { load(); }, []);

  const allTasks = useMemo(() => d.boards.flatMap((b) => b.tasks.map((t) => ({ ...t, boardTitle: b.title, boardId: b.id }))), [d]);
  const filtered = useMemo(() => allTasks.filter((t) => {
    if (q && !(`${t.title} ${t.owner ?? ""} ${t.boardTitle}`.toLowerCase().includes(q.toLowerCase()))) return false;
    if (assignee !== "ALL" && (t.owner ?? "unassigned") !== assignee) return false;
    if (prio !== "ALL" && t.priority !== prio) return false;
    if (overdueOnly && !(t.dueAt && new Date(t.dueAt) < new Date() && t.status !== "DONE")) return false;
    if (mineOnly && !(t.owner && (t.owner === myName || (me && t.owner.includes(me.split("@")[0])) || me === t.owner))) {
      // match by name OR email fragment; staff pick owner=name so also allow “my tasks” via name
      const mineNames = [myName, me, ...(d.staff.filter((s) => s.email === me).map((s) => s.name))];
      if (!mineNames.some((n) => n && t.owner === n)) return false;
    }
    return true;
  }), [allTasks, q, assignee, prio, overdueOnly, mineOnly, me, myName, d.staff]);

  const stats = useMemo(() => ({
    total: allTasks.length,
    todo: allTasks.filter((t) => t.status === "TODO").length,
    doing: allTasks.filter((t) => t.status === "DOING").length,
    done: allTasks.filter((t) => t.status === "DONE").length,
    overdue: allTasks.filter((t) => t.dueAt && new Date(t.dueAt) < new Date() && t.status !== "DONE").length,
    mine: allTasks.filter((t) => t.owner && myName && t.owner === myName).length,
  }), [allTasks, myName]);

  const act = async (body: any) => {
    const r = await fetch("/api/boards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) alert(await r.text());
    load();
  };
  const blank = { title: "", owner: "", estimate: "", priority: "MEDIUM", due: "", dep: "" };
  const owners = useMemo(() => Array.from(new Set([...d.staff.map((s) => s.name), ...allTasks.map((t) => t.owner ?? "unassigned")])), [d.staff, allTasks]);

  const waShare = (t: T & { boardTitle?: string }) =>
    `https://wa.me/?text=${encodeURIComponent(`Wedding task [${t.boardTitle ?? ""}] ${t.title} — owner: ${t.owner ?? "unassigned"}, status: ${t.status}, due: ${t.dueAt ? new Date(t.dueAt).toLocaleDateString("en-IN") : "—"}. Update: http://localhost:3000/boards`)}`;

  const TaskCard = ({ t, boardTitle }: { t: T; boardTitle: string }) => {
    const subs = t.subtickets ?? [];
    const done = subs.filter((s) => s.status === "DONE").length;
    const pct = subs.length ? Math.round((done / subs.length) * 100) : t.status === "DONE" ? 100 : 0;
    const isOpen = !!expanded[t.id];
    return (
    <div className="mt-2 rounded-xl border bg-white p-2 text-sm">
      {/* Primary ticket — clickable like Jira story */}
      <button className="w-full text-left" onClick={() => setExpanded({ ...expanded, [t.id]: !isOpen })}>
        <div className="font-semibold underline decoration-gold/60 underline-offset-2">{isOpen ? "▼" : "▶"} {t.title} {t.dueAt && new Date(t.dueAt) < new Date() && t.status !== "DONE" && <span className="pill bg-red-100 text-red-700 no-underline">OVERDUE</span>}</div>
      </button>
      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs">
        <span className={`pill ${t.priority === "HIGH" ? "bg-red-100 text-red-700" : t.priority === "LOW" ? "bg-stone-100 text-stone-600" : "bg-gold/20 text-maroon"}`}>{t.priority}</span>
        <select className="pill bg-ivory text-stone-700 border" value={t.status} onChange={(e) => act({ action: "move", taskId: t.id, status: e.target.value })} title="Primary status — Jira style">
          <option>TODO</option><option>DOING</option><option>DONE</option>
        </select>
        {t.dependsOn && <span className="pill bg-stone-100">⛓ blocked</span>}
        <span className="pill bg-stone-100">{subs.length} sub • {done} done • {pct}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded bg-stone-200"><div className="h-1.5 rounded bg-maroon transition-all" style={{ width: `${pct}%` }} /></div>
      <div className="mt-1 text-xs text-stone-500">
        👤 {t.owner ?? "unassigned"} • <b className="text-maroon">est ₹{(t.estimatePaise / 100).toLocaleString("en-IN")}</b> • spent ₹{((t.actualPaise ?? 0) / 100).toLocaleString("en-IN")}
        {t.dueAt ? ` • due ${new Date(t.dueAt).toLocaleDateString("en-IN")}` : ""}
      </div>
      {isOpen && (
      <div className="mt-2 rounded-lg border border-gold/30 bg-ivory/60 p-2">
        <p className="text-xs font-bold uppercase tracking-widest text-gold-dark">Sub-tickets — action items (status dropdown each)</p>
        {subs.length === 0 && <p className="mt-1 text-xs text-stone-400">No sub-tickets yet — break this story down below.</p>}
        {subs.map((s) => (
          <div key={s.id} className="mt-1 flex flex-wrap items-center gap-1 rounded-lg border bg-white p-1.5 text-xs">
            <span className="flex-1 min-w-[140px] font-medium">{s.status === "DONE" ? "✅" : s.status === "DOING" ? "🔄" : "⬜"} {s.title}</span>
            <select className="rounded border px-1 py-1 text-xs" value={s.status} onChange={(e) => act({ action: "submove", subId: s.id, status: e.target.value })} title="Subticket status">
              <option>TODO</option><option>DOING</option><option>DONE</option>
            </select>
            <select className="rounded border px-1 py-1 text-xs max-w-[120px]" value={s.owner ?? ""} onChange={(e) => act({ action: "subassign", subId: s.id, owner: e.target.value || null })} title="Subticket owner">
              <option value="">unassigned</option>
              {d.staff.map((st) => <option key={st.email} value={st.name}>{st.name}</option>)}
              {s.owner && !d.staff.some((st) => st.name === s.owner) && <option value={s.owner}>{s.owner}</option>}
            </select>
          </div>
        ))}
        <div className="mt-2 flex gap-1">
          <input className="input flex-1 !py-1 text-xs" placeholder="+ Add sub-ticket…" value={newSub[t.id]?.title ?? ""} onChange={(e) => setNewSub({ ...newSub, [t.id]: { title: e.target.value, owner: newSub[t.id]?.owner ?? "" } })} />
          <select className="rounded-lg border px-1 py-1 text-xs max-w-[120px]" value={newSub[t.id]?.owner ?? ""} onChange={(e) => setNewSub({ ...newSub, [t.id]: { title: newSub[t.id]?.title ?? "", owner: e.target.value } })}>
            <option value="">unassigned</option>
            {d.staff.map((st) => <option key={st.email} value={st.name}>{st.name}</option>)}
          </select>
          <button className="rounded border px-2 py-1 text-xs font-bold" onClick={async () => {
            const v = newSub[t.id]; if (!v?.title?.trim()) return;
            await act({ action: "subtask", taskId: t.id, title: v.title.trim(), owner: v.owner || undefined });
            setNewSub({ ...newSub, [t.id]: { title: "", owner: "" } });
          }}>Add</button>
        </div>
      </div>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <button className="rounded border px-2 py-1 text-xs min-h-[36px]" title="Nudge the owner" onClick={() => act({ action: "nudge", taskId: t.id })}>🔔 Nudge</button>
        <a className="rounded border px-2 py-1 text-xs min-h-[36px] inline-flex items-center" target="_blank" href={waShare({ ...t, boardTitle })}>↗ Share</a>
        <button className="rounded border px-2 py-1 text-xs min-h-[36px]" onClick={() => setOpen({ ...open, [t.id]: !open[t.id] })}>
          💬 {t.updates?.length ?? 0} {open[t.id] ? "▲" : "▼"}
        </button>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <select className="rounded-lg border px-1 py-1 text-xs max-w-[140px]" value={t.owner ?? ""} onChange={(e) => act({ action: "reassign", taskId: t.id, owner: e.target.value || null })}>
          <option value="">unassigned</option>
          {d.staff.map((s) => <option key={s.email} value={s.name}>{s.name}</option>)}
          {t.owner && !d.staff.some((s) => s.name === t.owner) && <option value={t.owner}>{t.owner}</option>}
        </select>
        <span className="text-xs text-stone-400">est ₹:</span>
        <input className="w-20 rounded-lg border px-2 py-1 text-xs" type="number" min={0}
          value={estEdits[t.id] ?? String((t.estimatePaise ?? 0) / 100)}
          onChange={(e) => setEstEdits({ ...estEdits, [t.id]: e.target.value })} />
        <button className="rounded border px-2 py-1 text-xs" title="Update estimate" onClick={() => act({ action: "estimate", taskId: t.id, estimatePaise: Math.round(parseFloat(estEdits[t.id] ?? "0") * 100) })}>Est✓</button>
        <span className="text-xs text-stone-400">spent ₹:</span>
        <input className="w-20 rounded-lg border px-2 py-1 text-xs" type="number" min={0}
          value={actualEdits[t.id] ?? String((t.actualPaise ?? 0) / 100)}
          onChange={(e) => setActualEdits({ ...actualEdits, [t.id]: e.target.value })} />
        <button className="rounded border px-2 py-1 text-xs" title="Update spent" onClick={() => act({ action: "actual", taskId: t.id, actualPaise: Math.round(parseFloat(actualEdits[t.id] ?? "0") * 100) })}>Save</button>
      </div>
      {open[t.id] && (
        <div className="mt-2 rounded-lg bg-ivory p-2">
          {(t.updates ?? []).length === 0 && <p className="text-xs text-stone-400">No updates yet — post the first one.</p>}
          {(t.updates ?? []).map((u) => (
            <div key={u.id} className="border-b py-1 text-xs last:border-0"><b>{u.author}</b> <span className="text-stone-400">{new Date(u.createdAt).toLocaleString("en-IN")}</span><br />{u.text}</div>
          ))}
          <div className="mt-1 flex gap-1">
            <input className="input flex-1 !py-1 text-xs" placeholder="Share update…" value={comments[t.id] ?? ""} onChange={(e) => setComments({ ...comments, [t.id]: e.target.value })} />
            <button className="rounded border px-2 py-1 text-xs font-bold" onClick={async () => { if (!(comments[t.id] ?? "").trim()) return; await act({ action: "comment", taskId: t.id, text: comments[t.id] }); setComments({ ...comments, [t.id]: "" }); }}>Post</button>
          </div>
        </div>
      )}
    </div>
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-maroon">Kanban Command Center <span className="text-sm font-normal text-stone-500">— track everything, assign anyone, share updates</span></h1>

      <div className="grid gap-2 md:grid-cols-6">
        {[["Total", stats.total], ["To Do", stats.todo], ["Doing", stats.doing], ["Done", stats.done], ["Overdue", stats.overdue], ["Assigned to me", stats.mine]].map(([k, v]: any) => (
          <div key={k} className="card p-3 text-center"><div className="text-xl font-bold text-maroon">{v}</div><div className="text-xs text-stone-500">{k}</div></div>
        ))}
      </div>

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <input className="input flex-1 min-w-[160px]" placeholder="Search title / owner / board…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input max-w-[180px]" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="ALL">All assignees</option>
          {owners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className="input max-w-[130px]" value={prio} onChange={(e) => setPrio(e.target.value)}>
          <option value="ALL">All priority</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option>
        </select>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} /> Overdue</label>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} /> Mine only</label>
        <span className="text-xs text-stone-400">Team: {d.staff.map((s) => s.name).join(", ") || "…"}</span>
      </div>

      {(q || assignee !== "ALL" || prio !== "ALL" || overdueOnly || mineOnly) ? (
        <div className="card p-4">
          <div className="font-bold">Filtered tasks ({filtered.length})</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {filtered.map((t: any) => <div key={t.id}><div className="text-xs font-bold text-gold-dark">{t.boardTitle}</div><TaskCard t={t} boardTitle={t.boardTitle} /></div>)}
          </div>
          {filtered.length === 0 && <p className="mt-2 text-sm text-stone-500">No tasks match filters.</p>}
        </div>
      ) : d.boards.map((b) => (
        <div key={b.id} className="card p-4">
          <div className="font-bold">{b.title} <span className="pill bg-gold/20 text-maroon">{b.category}</span> • ₹{(b.tasks.reduce((a: number, t: any) => a + t.estimatePaise, 0) / 100).toLocaleString("en-IN")} est. • {b.tasks.length} tasks</div>
          <div className="mt-2 grid gap-2 grid-cols-1 md:grid-cols-3">
            {(["TODO", "DOING", "DONE"] as const).map((col) => (
              <div key={col} className="rounded-xl bg-ivory p-2">
                <div className="text-xs font-bold">{col} ({b.tasks.filter((t) => t.status === col).length})</div>
                {b.tasks.filter((t) => t.status === col).map((t) => <TaskCard key={t.id} t={t} boardTitle={b.title} />)}
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-ivory p-3">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400">New ticket — admin assigns to anyone (dropdown + search)</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <input className="input" placeholder="Task title" value={(nt[b.id] ?? blank).title} onChange={(e) => setNt({ ...nt, [b.id]: { ...(nt[b.id] ?? blank), title: e.target.value } })} />
              <input className="input" placeholder="Search teammate… (e.g. Priya)" value={ownerSearch[b.id] ?? ""} onChange={(e) => setOwnerSearch({ ...ownerSearch, [b.id]: e.target.value })} />
              <select className="input" value={(nt[b.id] ?? blank).owner} onChange={(e) => setNt({ ...nt, [b.id]: { ...(nt[b.id] ?? blank), owner: e.target.value } })}>
                <option value="">Assign to… (unassigned)</option>
                {d.staff.filter((s) => !ownerSearch[b.id] || `${s.name} ${s.email}`.toLowerCase().includes(ownerSearch[b.id].toLowerCase())).map((s) => <option key={s.email} value={s.name}>{s.name} ({s.email})</option>)}
              </select>
              <input className="input" type="number" min={0} placeholder="Estimate ₹" value={(nt[b.id] ?? blank).estimate} onChange={(e) => setNt({ ...nt, [b.id]: { ...(nt[b.id] ?? blank), estimate: e.target.value } })} />
              <div className="flex gap-2">
                <select className="input" value={(nt[b.id] ?? blank).priority} onChange={(e) => setNt({ ...nt, [b.id]: { ...(nt[b.id] ?? blank), priority: e.target.value } })}>
                  <option>LOW</option><option>MEDIUM</option><option>HIGH</option>
                </select>
                <input className="input" type="date" value={(nt[b.id] ?? blank).due} onChange={(e) => setNt({ ...nt, [b.id]: { ...(nt[b.id] ?? blank), due: e.target.value } })} />
              </div>
              <select className="input md:col-span-2" value={(nt[b.id] ?? blank).dep} onChange={(e) => setNt({ ...nt, [b.id]: { ...(nt[b.id] ?? blank), dep: e.target.value } })}>
                <option value="">Depends on… (none)</option>
                {b.tasks.map((t: any) => <option key={t.id} value={t.id}>{t.title} [{t.status}]</option>)}
              </select>
            </div>
            <button className="rounded-xl border px-4 py-2 mt-2 min-h-[44px] font-semibold text-sm" onClick={async () => {
              const f = nt[b.id] ?? blank; if (!f.title.trim()) return;
              await act({ action: "task", boardId: b.id, title: f.title.trim(), owner: f.owner || undefined, estimatePaise: Math.round(parseFloat(f.estimate || "0") * 100) || 0, priority: f.priority, dueAt: f.due || undefined, dependsOn: f.dep || undefined });
              setNt({ ...nt, [b.id]: blank });
            }}>+ Add Task</button>
          </div>
        </div>
      ))}

      <div className="card p-4">
        <h2 className="font-bold">Pending approvals ({d.approvals.length})</h2>
        <p className="text-xs text-stone-500">WhatsApp bulk sends, high expenses, high-value gifts. Decisions fire NudgeBee events when a webhook is configured.</p>
        {(d.approvals ?? []).length === 0 && <p className="mt-2 text-sm text-stone-500">Queue is clear.</p>}
        {(d.approvals ?? []).map((a: any) => (
          <div key={a.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border p-2 text-sm">
            <span><b>{a.kind}</b> <span className="text-xs text-stone-500">{String(a.payload).slice(0, 100)}</span></span>
            <span className="flex gap-1">
              <button className="rounded-lg bg-green-100 px-3 py-1 text-green-800 font-bold min-h-[36px]" onClick={() => act({ action: "approve", id: a.id, decision: "APPROVED" })}>Approve</button>
              <button className="rounded-lg bg-red-100 px-3 py-1 text-red-700 font-bold min-h-[36px]" onClick={() => act({ action: "approve", id: a.id, decision: "REJECTED" })}>Reject</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
