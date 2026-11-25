"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
export default function MyPhotos() {
  const { data: session, status } = useSession();
  const [list, setList] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (status === "authenticated") fetch("/api/photos?mine=1").then((r) => (r.ok ? r.json() : [])).then(setList); }, [status]);
  if (status === "loading") return <p>Loading…</p>;
  if (!session) return <div className="card p-6">Please <a className="underline font-bold" href="/login?callbackUrl=/my-photos">log in</a> to see your matched photos.</div>;

  const downloadOne = async (url: string) => {
    const r = await fetch(url);
    const blob = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = url.split("/").pop() || "photo.jpg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const downloadZip = async () => {
    if (list.length === 0) return;
    setBusy(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (let i = 0; i < list.length; i++) {
        const r = await fetch(list[i].url);
        const blob = await r.blob();
        const name = (list[i].url.split("/").pop() || `photo-${i + 1}.jpg`).split("?")[0];
        zip.file(name, blob);
      }
      const out = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(out);
      a.download = "my-wedding-photos.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-maroon">My Photos</h1>
      <p className="text-sm text-stone-500">Only photos <b>you</b> appear in (face-match for {(session.user as any)?.email}). Private by default — {list.length} found.</p>
      {list.length > 0 && <button disabled={busy} onClick={downloadZip} className="btn-primary disabled:opacity-50">{busy ? "Zipping…" : `⬇ Download all ${list.length} as ZIP`}</button>}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {list.map((p) => (
          <div key={p.id} className="relative overflow-hidden rounded-xl border">
            <img src={p.url} alt="you" className="h-40 w-full object-cover" loading="lazy" />
            <button onClick={() => downloadOne(p.url)} className="absolute bottom-2 right-2 rounded-lg bg-black/70 px-3 py-1.5 text-xs font-bold text-white min-h-[36px]" title="Download this photo">⬇ Download</button>
          </div>
        ))}
      </div>
      {list.length === 0 && <div className="card p-6 text-sm">No matches yet — onboard faces + Rescan from Photos.</div>}
    </div>
  );
}
