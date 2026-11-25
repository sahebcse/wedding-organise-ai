"use client";
import { useEffect, useState } from "react";

function diff(target: Date) {
  const ms = Math.max(0, +target - Date.now());
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms / 3600000) % 24),
    mins: Math.floor((ms / 60000) % 60),
    secs: Math.floor((ms / 1000) % 60),
  };
}

export default function Countdown({ target }: { target: string }) {
  const [t, setT] = useState(() => diff(new Date(target)));
  useEffect(() => {
    const id = setInterval(() => setT(diff(new Date(target))), 1000);
    return () => clearInterval(id);
  }, [target]);
  const cells: [string, string][] = [
    [String(t.days), "Days"],
    [String(t.hours).padStart(2, "0"), "Hours"],
    [String(t.mins).padStart(2, "0"), "Mins"],
    [String(t.secs).padStart(2, "0"), "Secs"],
  ];
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-5">
      {cells.map(([v, l]) => (
        <div key={l} className="text-center">
          <div className="font-display text-3xl sm:text-4xl font-light text-maroon tabular-nums">{v}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-stone-400">{l}</div>
        </div>
      ))}
    </div>
  );
}
