"use client";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type Contribution = { id: string; amountPaise: number; anonymous: boolean; name: string };
type Gift = {
  id: string; title: string; pricePaise: number; qtyNeeded: number; imageUrl?: string;
  funded: number; remaining: number; contributions: Contribution[];
};

function GiftsInner() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const staff = role === "ADMIN" || role === "ORGANIZER";
  const thanks = useSearchParams().get("thanks");
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [anon, setAnon] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<Record<string, string>>({});
  const [ng, setNg] = useState({ title: "", price: "", qty: "1", image: "" });
  const [nmsg, setNmsg] = useState("");
  const defaultName = ((session?.user as { name?: string } | undefined)?.name ?? "Guest").split(" ")[0] + " Guest";
  const load = () => fetch("/api/gifts").then((r) => (r.ok ? r.json() : [])).then(setGifts);
  useEffect(() => { load(); }, []);

  const addGift = async () => {
    setNmsg("");
    const rupees = parseFloat(ng.price);
    if (!ng.title.trim() || !rupees || rupees <= 0) { setNmsg("Give the gift a title and a price greater than ₹0."); return; }
    const r = await fetch("/api/gifts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", title: ng.title.trim(), pricePaise: Math.round(rupees * 100), qtyNeeded: Math.max(1, parseInt(ng.qty || "1", 10)), imageUrl: ng.image.trim() }),
    });
    if (r.ok) { setNg({ title: "", price: "", qty: "1", image: "" }); setNmsg("Gift added to the registry."); load(); }
    else setNmsg(await r.text());
  };
  const delGift = async (id: string) => {
    const r = await fetch("/api/gifts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    if (r.ok) load(); else alert(await r.text());
  };

  const goPay = (g: Gift) => {
    const rupees = parseFloat(amounts[g.id] ?? "");
    if (!rupees || rupees <= 0) { setErr({ ...err, [g.id]: "Enter an amount greater than ₹0." }); return; }
    if (Math.round(rupees * 100) > g.remaining) { setErr({ ...err, [g.id]: `Only ₹${(g.remaining / 100).toLocaleString("en-IN")} left — please lower the amount.` }); return; }
    const q = new URLSearchParams({
      giftId: g.id, amount: String(Math.round(rupees * 100)),
      name: (names[g.id] || defaultName).slice(0, 60),
      anon: anon[g.id] ? "1" : "0",
    });
    window.location.href = `/gifts/pay?${q.toString()}`;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-maroon">Group Gifting Registry</h1>
      <p className="text-sm text-stone-500">No compulsion — pick a gift, give any amount, fully or partially, with your name or anonymously.</p>
      {staff && (
        <div className="card p-4">
          <h2 className="font-bold">Curate the registry (family)</h2>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <input className="input" placeholder="Gift title (e.g. Mixer Grinder)" value={ng.title} onChange={(e) => setNg({ ...ng, title: e.target.value })} />
            <input className="input" type="number" min={1} placeholder="Price ₹" value={ng.price} onChange={(e) => setNg({ ...ng, price: e.target.value })} />
            <input className="input" type="number" min={1} placeholder="Qty needed (default 1)" value={ng.qty} onChange={(e) => setNg({ ...ng, qty: e.target.value })} />
            <input className="input" placeholder="Image URL or /media path (optional)" value={ng.image} onChange={(e) => setNg({ ...ng, image: e.target.value })} />
          </div>
          <button className="rounded-xl border px-4 py-2 mt-2 min-h-[44px] font-semibold text-sm" onClick={addGift}>+ Add Gift</button>
          {nmsg && <p className="mt-1 text-sm font-medium text-maroon">{nmsg}</p>}
        </div>
      )}
      {thanks && (
        <div className="rounded-2xl border border-green-300 bg-green-50 p-4 text-center">
          <p className="text-lg font-bold text-green-800">🙏 Thank you for your kind gift and contribution!</p>
          <p className="text-sm text-green-700">Your blessing means the world to Aarav & Diya.</p>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {gifts.map((g) => {
          const pct = Math.min(100, Math.round((g.funded / (g.pricePaise * g.qtyNeeded)) * 100));
          return (
            <div key={g.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold">{g.title}</div>
              {g.imageUrl ? <img src={g.imageUrl} alt={g.title} className="mt-2 h-36 w-full rounded-xl object-cover" loading="lazy" /> : null}
                {staff && g.contributions.length === 0 && (
                  <button className="text-xs text-stone-400 underline" onClick={() => delGift(g.id)}>remove</button>
                )}
              </div>
              <div className="text-sm">₹{(g.pricePaise / 100).toLocaleString("en-IN")} • funded ₹{(g.funded / 100).toLocaleString("en-IN")} • remaining ₹{(g.remaining / 100).toLocaleString("en-IN")}</div>
              <div className="mt-2 h-2 rounded bg-stone-200"><div className="h-2 rounded bg-gold transition-all" style={{ width: `${pct}%` }} /></div>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-lg font-bold text-stone-400">₹</span>
                <input className="input" type="number" min={1} placeholder="How much would you like to give?"
                  value={amounts[g.id] ?? ""} disabled={g.remaining <= 0}
                  onChange={(e) => setAmounts({ ...amounts, [g.id]: e.target.value })} />
              </div>
              <input className="input mt-2" placeholder="Your name (as you'd like it shown)"
                value={names[g.id] ?? ""} disabled={g.remaining <= 0}
                onChange={(e) => setNames({ ...names, [g.id]: e.target.value })} />
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="h-5 w-5 accent-[#6B0F2B]"
                  checked={!!anon[g.id]} onChange={(e) => setAnon({ ...anon, [g.id]: e.target.checked })} />
                Remain anonymous (otherwise your name is highlighted)
              </label>
              <button disabled={g.remaining <= 0} onClick={() => goPay(g)} className="btn-primary mt-3 w-full disabled:opacity-50">
                {g.remaining <= 0 ? "Fully funded ♥" : "Proceed to Pay →"}
              </button>
              {err[g.id] && <p className="mt-2 text-sm font-medium text-red-700">{err[g.id]}</p>}

              <div className="mt-3 rounded-xl bg-ivory p-3">
                <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Contributors • {g.contributions.length}</p>
                {g.contributions.length === 0 ? (
                  <p className="mt-1 text-sm text-stone-500">No contributions yet — be the first!</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-sm">
                    {g.contributions.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-2">
                        <span className={c.anonymous ? "text-stone-500 italic" : "font-semibold text-maroon"}>
                          {c.anonymous ? "🕵️ Anonymous" : `💝 ${c.name}`}
                        </span>
                        <span className="font-bold">₹{(c.amountPaise / 100).toLocaleString("en-IN")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Gifts() {
  return <Suspense><GiftsInner /></Suspense>;
}
