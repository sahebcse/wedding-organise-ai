"use client";
import { useState } from "react";
export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <div className="card mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold text-maroon">Create account</h1>
      <input className="input mt-4" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input mt-2" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="input mt-2" type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn-primary mt-4 w-full" onClick={async () => {
        const r = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
        setMsg(r.ok ? "Created! Go to Login." : "Failed: " + await r.text());
      }}>Sign up</button>
      <p className="mt-2 text-sm">{msg}</p>
    </div>
  );
}
