"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { LANGS, STRINGS_EN } from "@/lib/i18n";

const Ctx = createContext<{ lang: string; setLang: (l: string) => void; t: (k: string) => string; translating: boolean }>({ lang: "en", setLang: () => {}, t: (k) => STRINGS_EN[k] ?? k, translating: false });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState("en");
  const [strings, setStrings] = useState<Record<string, string>>(STRINGS_EN);
  const [translating, setTranslating] = useState(false);
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("wed-lang") : null;
    if (saved && (LANGS as readonly { code: string }[]).some((l) => l.code === saved)) setLangState(saved);
  }, []);
  useEffect(() => {
    if (lang === "en") { setStrings(STRINGS_EN); return; }
    setTranslating(true);
    fetch(`/api/i18n?lang=${lang}&auto=1`).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (j?.strings) setStrings({ ...STRINGS_EN, ...j.strings });
    }).catch(() => {}).finally(() => setTranslating(false));
  }, [lang]);
  const setLang = useCallback((l: string) => {
    setLangState(l);
    try { localStorage.setItem("wed-lang", l); } catch {}
  }, []);
  const t = useCallback((k: string) => strings[k] ?? STRINGS_EN[k] ?? k, [strings]);
  return <Ctx.Provider value={{ lang, setLang, t, translating }}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}

export function LanguageSwitcher() {
  const { lang, setLang, t, translating } = useLang();
  return (
    <label className="flex items-center gap-1 text-sm">
      <span className="text-stone-500">🌐 {translating ? "⏳…" : t("lang.label")}</span>
      <select className="rounded-lg border px-2 py-1 text-sm bg-white" value={lang} onChange={(e) => setLang(e.target.value)} title="Switch language — first Sarvam call per language, then cached free">
        {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </label>
  );
}
