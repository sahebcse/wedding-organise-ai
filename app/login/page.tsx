"use client";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const ORGANISERS = [
  { name: "Organizer (lead)", email: "organizer@demo.in", password: "org123" },
  { name: "Priya Planner", email: "priya.org@demo.in", password: "org123" },
  { name: "Rahul Logistics", email: "rahul.org@demo.in", password: "org123" },
  { name: "Sneha Decor", email: "sneha.org@demo.in", password: "org123" },
  { name: "Vikram Food", email: "vikram.org@demo.in", password: "org123" },
  { name: "Anita Rituals", email: "anita.org@demo.in", password: "org123" },
];
const GUESTS = [
  { name: "Guest", email: "guest@demo.in", password: "guest123" },
  { name: "Aarav Guest", email: "aarav.guest@demo.in", password: "guest123" },
  { name: "Diya Guest", email: "diya.guest@demo.in", password: "guest123" },
  { name: "Karan Guest", email: "karan.guest@demo.in", password: "guest123" },
  { name: "Meera Guest", email: "meera.guest@demo.in", password: "guest123" },
];

function LoginInner() {
  const params = useSearchParams();
  const fallback = params.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("admin@demo.in");
  const [password, setPassword] = useState("admin123");
  const [busy, setBusy] = useState<string | null>(null);
  const [orgEmail, setOrgEmail] = useState(ORGANISERS[0].email);
  const [guestEmail, setGuestEmail] = useState(GUESTS[0].email);

  const go = async (label: string, em: string, pw: string, dest: string) => {
    setBusy(label);
    await signIn("credentials", { email: em, password: pw, callbackUrl: dest });
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-maroon">Login</h1>
        <p className="mt-1 text-sm text-stone-500">Hackathon demo — pick a profile, one tap.</p>
        <button disabled={busy !== null} onClick={() => go("Admin", "admin@demo.in", "admin123", "/dashboard")}
          className="btn-primary mt-3 w-full disabled:opacity-60">{busy === "Admin" ? "Signing in…" : "Login as Admin"}</button>

        <div className="mt-3 rounded-xl border p-3">
          <p className="text-sm font-bold">Organiser login (6 profiles)</p>
          <select className="input mt-2" value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)}>
            {ORGANISERS.map((o) => <option key={o.email} value={o.email}>{o.name} — {o.email}</option>)}
          </select>
          <button disabled={busy !== null} onClick={() => go(orgEmail, orgEmail, "org123", "/dashboard")}
            className="btn-gold mt-2 w-full disabled:opacity-60">{busy === orgEmail ? "Signing in…" : `Login as ${ORGANISERS.find((o) => o.email === orgEmail)?.name}`}</button>
        </div>

        <div className="mt-3 rounded-xl border p-3">
          <p className="text-sm font-bold">Guest login (5 profiles)</p>
          <select className="input mt-2" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)}>
            {GUESTS.map((g) => <option key={g.email} value={g.email}>{g.name} — {g.email}</option>)}
          </select>
          <button disabled={busy !== null} onClick={() => go(guestEmail, guestEmail, "guest123", "/w/aarav-diya")}
            className="mt-2 w-full rounded-xl border px-4 py-3 font-semibold min-h-[44px] disabled:opacity-60">{busy === guestEmail ? "Signing in…" : `Login as ${GUESTS.find((g) => g.email === guestEmail)?.name}`}</button>
        </div>
      </div>
      <div className="card p-6">
        <h2 className="font-bold text-maroon">Manual login</h2>
        <input className="input mt-3" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input className="input mt-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
        <button className="rounded-xl border px-5 py-3 mt-3 w-full min-h-[44px] font-semibold" onClick={() => signIn("credentials", { email, password, callbackUrl: fallback })}>Sign in</button>
        <p className="mt-2 text-sm">No account? <a className="underline" href="/signup">Sign up</a></p>
      </div>
    </div>
  );
}

export default function Login() {
  return <Suspense><LoginInner /></Suspense>;
}
