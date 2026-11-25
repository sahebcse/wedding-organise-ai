"use client";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

type Photo = { id: string; url: string; eventId?: string | null; matches?: unknown[] };
type WEvent = { id: string; key: string; title: string };
const THRESHOLD = 0.6;

async function loadFaceApi() {
  const faceapi = await import("face-api.js");
  const g = faceapi as unknown as { _loaded?: boolean };
  if (!g._loaded) {
    try {
      await faceapi.tf.setBackend("webgl");
      await faceapi.tf.ready();
    } catch {
      await faceapi.tf.setBackend("cpu");
    }
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
    g._loaded = true;
  }
  return faceapi;
}

function avgDescriptors(list: Float32Array[]) {
  const n = list[0].length;
  const out = new Float32Array(n);
  for (const d of list) for (let i = 0; i < n; i++) out[i] += d[i] / list.length;
  return Array.from(out);
}

export default function Photos() {
  const { data: session, status } = useSession();
  const email = (session?.user as { email?: string } | undefined)?.email ?? "guest@demo.in";
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [statusMsg, setStatusMsg] = useState("Gallery ready. Build your face profile to find yourself in these photos.");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<string[]>([]);
  const [events, setEvents] = useState<WEvent[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const faceInput = useRef<HTMLInputElement>(null);
  const load = () => fetch("/api/photos").then((r) => (r.ok ? r.json() : [])).then(setPhotos);
  const checkProfile = () => fetch(`/api/photos/profile?email=${encodeURIComponent(email)}`).then((r) => setHasProfile(r.ok)).catch(() => setHasProfile(false));
  useEffect(() => {
    load();
    fetch("/api/wedding").then((r) => (r.ok ? r.json() : null)).then((w) => setEvents(w?.events ?? []));
  }, []);
  useEffect(() => { if (session) checkProfile(); }, [email]);

  if (status === "loading") return <p>Loading…</p>;
  if (!session) return <div className="card p-6">Please <a className="underline font-bold" href="/login?callbackUrl=/photos">log in</a> to view and upload wedding photos.</div>;

  const visible = filter === "ALL" ? photos : photos.filter((p) => (p as any).eventId === filter || (p.url.includes("wedding-images") && filter === "ALL"));

  const buildProfile = async () => {
    const files = Array.from(faceInput.current?.files ?? []).slice(0, 3);
    if (files.length === 0) { setStatusMsg("Pick 1–3 clear front-facing photos of yourself first (1 is fine)."); return; }
    setBusy(true); setFound([]);
    try {
      setStatusMsg("Loading face models (one-time, ~7MB)…");
      const faceapi = await loadFaceApi();
      const descs: Float32Array[] = [];
      for (let i = 0; i < files.length; i++) {
        setStatusMsg(`Reading face ${i + 1}/${files.length}…`);
        const img = await faceapi.bufferToImage(files[i]);
        const all = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 })).withFaceLandmarks().withFaceDescriptors();
        if (all.length === 0) { setStatusMsg(`No face found in photo ${i + 1} — try a clearer front-facing shot.`); setBusy(false); return; }
        all.sort((a, b) => b.detection.box.area - a.detection.box.area);
        descs.push(all[0].descriptor);
      }
      const vectors = avgDescriptors(descs);
      const r = await fetch("/api/photos/scan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userEmail: email, vectors }) });
      if (!r.ok) setStatusMsg("Profile save failed — are you logged in?");
      else { setHasProfile(true); setStatusMsg(`Face profile built from ${descs.length} photo(s) as ${email}. Now hit “Find my photos”.`); }
    } catch (e) {
      setStatusMsg("Face engine failed to start in this browser — try Chrome/Edge desktop.");
    }
    setBusy(false);
  };

  const findMyPhotos = async () => {
    setBusy(true); setFound([]);
    try {
      setStatusMsg("Loading face models…");
      const faceapi = await loadFaceApi();
      setStatusMsg("Loading your face profile…");
      const profRes = await fetch(`/api/photos/profile?email=${encodeURIComponent(email)}`);
      if (!profRes.ok) { setStatusMsg("Build your face profile first (step 1)."); setBusy(false); return; }
      const { vectors } = await profRes.json();
      const profile = Float32Array.from(vectors as number[]);
      const dist = (a: Float32Array, b: Float32Array) => {
        let s = 0;
        for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
        return Math.sqrt(s);
      };
      const matches: { photoId: string; score: number }[] = [];
      const hits: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        setStatusMsg(`Scanning ${i + 1}/${photos.length}…`);
        try {
          const img = await faceapi.fetchImage(p.url);
          const faces = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 })).withFaceLandmarks().withFaceDescriptors();
          let best = Infinity;
          for (const f of faces) best = Math.min(best, dist(f.descriptor, profile));
          if (best < THRESHOLD) {
            matches.push({ photoId: p.id, score: Math.round((1 - best) * 100) / 100 });
            hits.push(p.url);
          }
        } catch { /* unreadable image — skip */ }
      }
      await fetch("/api/photos/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userEmail: email, matches }) });
      setFound(hits);
      setStatusMsg(matches.length ? `Found you in ${matches.length} photo(s)! Open My Photos to view.` : "No matches — try a clearer face photo or a lower threshold with the family.");
    } catch {
      setStatusMsg("Scan failed — reload and try again.");
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-maroon">Photo Hub — Find My Photos</h1>
      <p className="rounded-xl bg-gold/15 p-3 text-sm">Signed in as <b>{email}</b>. Real on-device face matching (face-api.js, nothing leaves your browser except the final match list). Models load once from <code>/models</code>.</p>

      <div className="card p-4">
        <h2 className="font-bold">1. Upload your clear photo to find all photos where you are present</h2>
        <p className="mt-1 text-xs text-stone-500">
          {hasProfile === null ? "Checking saved profile…" : hasProfile
            ? `✅ Saved face profile found for ${email} — “Find my photos” will reuse it, no re-upload needed. Re-upload to update it.`
            : `No face profile yet for ${email} — upload once, then it is saved.`}
        </p>
        <input ref={faceInput} type="file" accept="image/*" multiple className="input mt-2" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={busy} onClick={buildProfile} className="btn-primary disabled:opacity-50">Build my face profile</button>
          {hasProfile && <button disabled={busy} onClick={async () => { await fetch(`/api/photos/scan?email=${encodeURIComponent(email)}`, { method: "DELETE" }); setHasProfile(false); setFound([]); setStatusMsg("Cleared face profile + matches — upload fresh to test from zero."); }} className="rounded-xl border px-4 py-2 text-sm">Clear my face data</button>}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-bold">2. Scan the wedding gallery ({photos.length} photos)</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select className="input max-w-[220px]" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ALL">All events</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <button disabled={busy} onClick={findMyPhotos} className="btn-gold disabled:opacity-50">Find my photos</button>
          <a href="/my-photos" className="rounded-xl border px-4 py-2 text-sm inline-block">Open My Photos →</a>
        </div>
        <p className="mt-2 text-sm font-medium text-maroon">{statusMsg}</p>
        {found.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            {found.map((u) => <img key={u} src={u} alt="you were found here" className="h-32 w-full rounded-xl object-cover" loading="lazy" />)}
          </div>
        )}
      </div>

      <div className="card p-4">
        <h2 className="font-bold">Gallery — all available images ({visible.length}/{photos.length})</h2>
        <form className="mt-2 flex flex-wrap items-center gap-2" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.target as HTMLFormElement); await fetch("/api/photos", { method: "POST", body: f }); load(); }}>
          <input type="file" name="file" accept="image/*" className="input" />
          <input type="hidden" name="uploaderEmail" value={email} />
          <button className="rounded-xl border px-4 py-2" type="submit">Upload event photo</button>
        </form>
        {visible.length === 0 && <p className="mt-2 text-sm text-stone-500">No photos here yet — upload one above or run <code>npm run db:seed:all</code>.</p>}
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {visible.map((p, i) => (
            <div key={p.id} className="relative overflow-hidden rounded-xl border">
              <img src={p.url} alt={`Gallery photo ${i + 1}`} className="h-32 w-full object-cover" loading="lazy" />
              <a href={p.url} download className="absolute bottom-2 right-2 rounded-lg bg-black/70 px-3 py-1.5 text-xs font-bold text-white min-h-[36px] inline-flex items-center" title="Download this photo">⬇ Download</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
