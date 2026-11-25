"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type U = { id: string; name: string; email: string; role: string; createdAt: string };

export default function UsersPage() {
  const { data: session } = useSession();
  const me = session?.user?.email;
  const [users, setUsers] = useState<U[]>([]);
  const [msg, setMsg] = useState("");
  const load = () => fetch("/api/users").then((r) => (r.ok ? r.json() : [])).then(setUsers);
  useEffect(() => { load(); }, []);

  const setRole = async (u: U, role: string) => {
    setMsg("");
    const r = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id, role }) });
    if (r.ok) { setMsg(`${u.email} is now ${role}. Takes effect on their next click/refresh.`); load(); }
    else setMsg(await r.text());
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-maroon">People & Roles</h1>
      <p className="text-sm text-stone-500">Everyone who signed up. Promote helpers to Organizer (or Admin) — their access updates immediately, no re-login needed.</p>
      {msg && <p className="rounded-xl bg-gold/15 p-3 text-sm font-medium">{msg}</p>}
      <div className="card divide-y">
        {users.filter((u) => u.email !== me).map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <span><b>{u.name}</b> <span className="text-stone-500">{u.email}</span> <span className="pill bg-stone-100">{u.role}</span></span>
            <span className="flex gap-1">
              {(["GUEST", "ORGANIZER", "ADMIN"] as const).filter((r) => r !== u.role).map((r) => (
                <button key={r} onClick={() => setRole(u, r)} className="rounded-lg border px-2 py-1 text-xs min-h-[36px]">
                  Make {r === "GUEST" ? "Guest" : r === "ORGANIZER" ? "Organizer" : "Admin"}
                </button>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
