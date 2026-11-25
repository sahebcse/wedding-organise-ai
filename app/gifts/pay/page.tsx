"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function PayInner() {
  const q = useSearchParams();
  const router = useRouter();
  const giftId = q.get("giftId") ?? "";
  const amount = Number(q.get("amount") ?? 0);
  const name = q.get("name") ?? "Guest";
  const anon = q.get("anon") === "1";
  const [phase, setPhase] = useState<"review" | "processing" | "success" | "failed">(
    !giftId || !(amount > 0) ? "failed" : "review"
  );
  const [failReason, setFailReason] = useState(
    !giftId || !(amount > 0) ? "This payment link is invalid or expired. Please start again from the registry." : ""
  );
  const [title, setTitle] = useState("Gift contribution");
  const done = useRef(false);

  useEffect(() => {
    fetch("/api/gifts").then((r) => r.json()).then((gifts: { id: string; title: string }[]) => {
      const g = gifts.find((x) => x.id === giftId);
      if (g) setTitle(g.title);
    }).catch(() => {});
  }, [giftId]);

  useEffect(() => {
    if (phase !== "processing" || done.current) return;
    done.current = true;
    const t = setTimeout(async () => {
      const r = await fetch("/api/gifts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftId, amountPaise: amount, anonymous: anon, name }),
      });
      if (r.ok) {
        setPhase("success");
        setTimeout(() => router.push("/gifts?thanks=1"), 1800);
      } else {
        setPhase("failed");
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [phase, giftId, amount, anon, name, router]);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="card overflow-hidden p-0">
        <div className="bg-gradient-to-r from-maroon to-gold p-5 text-white">
          <p className="text-[11px] uppercase tracking-[0.3em] opacity-80">Wedding Organize AI • Mock UPI</p>
          <h1 className="mt-1 font-display text-2xl">Checkout</h1>
        </div>
        <div className="space-y-3 p-5">
          <div className="rounded-xl bg-ivory p-4 text-sm">
            <div className="flex justify-between"><span className="text-stone-500">Gift</span><b>{title}</b></div>
            <div className="mt-1 flex justify-between"><span className="text-stone-500">From</span><b>{anon ? "Anonymous" : name}</b></div>
            <div className="mt-1 flex justify-between text-lg"><span className="text-stone-500">Amount</span><b className="text-maroon">₹{(amount / 100).toLocaleString("en-IN")}</b></div>
            <div className="mt-1 flex justify-between text-xs"><span className="text-stone-500">Paying to</span><span className="font-mono">aaravwedsdiya@okupi</span></div>
          </div>

          {phase === "review" && (
            <>
              <button onClick={() => setPhase("processing")} className="btn-primary w-full text-lg">Pay ₹{(amount / 100).toLocaleString("en-IN")} →</button>
              <a href="/gifts" className="block text-center text-sm text-stone-500 underline">Cancel</a>
              <p className="text-center text-xs text-stone-400">Demo checkout — no real money moves.</p>
            </>
          )}
          {phase === "processing" && (
            <div className="py-6 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" />
              <p className="mt-3 font-semibold text-maroon">Contacting your bank…</p>
              <p className="text-xs text-stone-400">Do not press back or refresh</p>
            </div>
          )}
          {phase === "success" && (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">✓</div>
              <p className="mt-3 text-xl font-bold text-green-800">Payment successful!</p>
              <p className="text-sm text-stone-500">Taking you back to the registry…</p>
            </div>
          )}
          {phase === "failed" && (
            <div className="py-6 text-center">
              <p className="text-xl font-bold text-red-700">Payment could not be completed</p>
              <p className="text-sm text-stone-500">{failReason || "The gift may be fully funded or need approval."}</p>
              <a href="/gifts" className="btn-primary mt-4 inline-block">Back to Gifts</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GiftPay() {
  return <Suspense><PayInner /></Suspense>;
}
