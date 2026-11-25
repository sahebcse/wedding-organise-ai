"use client";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import Countdown from "./Countdown";
import { useLang, LanguageSwitcher } from "@/components/LanguageContext";

export type InviteEvent = { id: string; title: string; venue: string; startsAt: string; key: string };
export type InviteWedding = { coupleNames: string; story: string; slug: string };

const GALLERY = [
  { src: "/media/prewedding/pw4.jpg", alt: "Pre-wedding moments" },
  { src: "/media/prewedding/pw5.jpg", alt: "Together forever" },
  { src: "/media/prewedding/pw6.jpg", alt: "Love in every frame" },
  { src: "/media/prewedding/pw7.jpg", alt: "Set for the celebration" },
];

const PAGE_LABELS = ["Welcome", "Couple", "Events", "Gallery", "Blessings"];

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] uppercase tracking-[0.35em] text-stone-400 font-medium">{children}</p>;
}

export default function InviteHome({ wedding, events }: { wedding: InviteWedding; events: InviteEvent[] }) {
  const [groom, bride] = wedding.coupleNames.split(" weds ");
  const dateTarget = events.length ? events[events.length - 1].startsAt : new Date(Date.now() + 30 * 86400000).toISOString();
  const dateShort = new Date(dateTarget).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const [page, setPage] = useState(0);
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const loggedIn = !!session?.user;
  const [started, setStarted] = useState(false);
  const [gen, setGen] = useState([1, 0, 0, 0, 0]);
  const dirRef = useRef(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(true);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [variant, setVariant] = useState<"traditional" | "modern">("traditional");
  const [quickMsg, setQuickMsg] = useState("");
  const { lang: gLang, t: gt } = useLang();
  // Global 🌐 switch drives the invite too: hi/bho → Hindi base, kn/te/mr → Sarvam strings.
  useEffect(() => {
    if (gLang === "hi" || gLang === "bho") setLang("hi");
    else if (gLang === "en") setLang("en");
  }, [gLang]);
  const useGlobal = gLang !== "en" && gLang !== "hi" && gLang !== "bho";

  const T: Record<string, { en: string; hi: string }> = {
    saveTheDate: { en: "Save the Date", hi: "शुभ विवाह" },
    gettingMarried: { en: "We're Getting Married", hi: "हम शादी कर रहे हैं" },
    openInvite: { en: "Open Invite 💌", hi: "निमंत्रण खोलें 💌" },
    swipe: { en: "‹ swipe to explore ›", hi: "‹ स्वाइप करके देखें ›" },
    meetCouple: { en: "Meet", hi: "मिलिए" },
    theCouple: { en: "The Couple", hi: "दूल्हा-दुल्हन से" },
    destined: { en: "Two souls destined to become one", hi: "दो दिल, एक धड़कन" },
    eventsTitle: { en: "Wedding Events", hi: "शादी के कार्यक्रम" },
    gallery: { en: "Gallery", hi: "झलकियाँ" },
    moments: { en: "Moments", hi: "पल" },
    blessings: { en: "Blessings & Greetings", hi: "शुभकामनाएँ" },
    blessingsSub: { en: "Share Your Blessings", hi: "अपनी शुभकामनाएँ दें" },
  };
  const t = (k: keyof typeof T) => {
    if (useGlobal) {
      const map: Record<string, string> = {
        saveTheDate: "invite.saveTheDate", gettingMarried: "invite.gettingMarried",
        openInvite: "invite.openInvite", swipe: "invite.swipe",
        meetCouple: "invite.meetCouple", theCouple: "invite.theCouple",
        destined: "invite.gettingMarried", eventsTitle: "invite.eventsTitle",
        gallery: "invite.gallery", moments: "invite.moments",
        blessings: "invite.blessings", blessingsSub: "invite.blessingsSub",
      };
      const g = gt(map[k] ?? `invite.${k}`);
      if (g && !g.startsWith("invite.")) return g;
    }
    return lang === "hi" ? T[k].hi : T[k].en;
  };
  // Global-language text for strings outside the en/hi T-dict (buttons, paragraphs).
  // kn/te/mr → Sarvam; en/hi/bho keep existing instant text.
  const L = (enText: string, key: string) => (useGlobal ? gt(key) : enText);

  useEffect(() => {
    fetch("/api/flags").then((r) => (r.ok ? r.json() : {})).then((f: any) => {
      if (f.inviteVariant === "modern") setVariant("modern");
      if (f["music-autoplay"]) playMusic();
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quickRsvp = async (status: "CONFIRMED" | "DECLINED") => {
    setQuickMsg("");
    const mine = await fetch("/api/rsvp/mine").then((r) => (r.ok ? r.json() : null));
    if (!mine) { setQuickMsg("Please log in first."); return; }
    const invites: string[] = mine.members.flatMap((m: any) => m.invites.map((i: any) => i.id));
    await Promise.all(invites.map((id) => fetch("/api/rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteId: id, status }) })));
    setQuickMsg(status === "CONFIRMED" ? (lang === "hi" ? "बधाई! सभी कार्यक्रमों में आपकी उपस्थिति दर्ज।" : "Done! You're marked attending all events.") : (lang === "hi" ? "कोई बात नहीं, आपकी अनुपस्थिति दर्ज।" : "Noted — you're marked away for all events."));
  };

  const navigate = useCallback((to: number) => {
    if (to < 0 || to >= PAGE_LABELS.length) return;
    setPage((cur) => {
      if (to === cur) return cur;
      dirRef.current = to > cur ? 1 : -1;
      setGen((prev) => { const n = [...prev]; n[to] = prev[to] + 1; return n; });
      return to;
    });
  }, []);
  const goNext = useCallback(() => navigate(page + 1), [navigate, page]);
  const goPrev = useCallback(() => navigate(page - 1), [navigate, page]);

  const playMusic = useCallback(async () => {
    try {
      if (audioRef.current) {
        audioRef.current.muted = false;
        await audioRef.current.play();
        setMuted(false);
      }
    } catch { /* file missing or blocked — toggle still works */ }
  }, []);

  const toggleMusic = async () => {
    if (!audioRef.current) return;
    try {
      if (muted) {
        audioRef.current.muted = false;
        await audioRef.current.play();
        setMuted(false);
      } else {
        audioRef.current.pause();
        setMuted(true);
      }
    } catch { /* ignore */ }
  };

  const handleBegin = useCallback(() => {
    setStarted(true);
    navigate(1);
    playMusic();
  }, [navigate, playMusic]);

  /* reset scroll on page change */
  useEffect(() => {
    const el = document.querySelector(`[data-page="${page}"]`);
    if (el) el.scrollTo({ top: 0 });
  }, [page]);

  /* keyboard */
  useEffect(() => {
    if (!started) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") goNext();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [started, goNext, goPrev]);

  /* touch swipe — horizontal only, vertical scroll stays native */
  useEffect(() => {
    if (!started) return;
    let sx = 0, sy = 0, st = 0;
    const ts = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now(); };
    const te = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      const v = Math.abs(dx) / Math.max(1, Date.now() - st);
      if (((Math.abs(dx) > 40 && v > 0.3) || Math.abs(dx) > 60) && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) goNext(); else goPrev();
      }
    };
    window.addEventListener("touchstart", ts, { passive: true });
    window.addEventListener("touchend", te, { passive: true });
    return () => { window.removeEventListener("touchstart", ts); window.removeEventListener("touchend", te); };
  }, [started, goNext, goPrev]);

  const pages = [
    /* 0 — WELCOME */
    <section key="welcome" className="flex h-full flex-col items-center justify-center overflow-y-auto bg-white px-6 py-10 text-center">
      <div key={`gen-${gen[0]}`} className="mx-auto w-full max-w-xl space-y-6">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }}>
          <img src="/media/prewedding/pw2.jpg" alt="Aarav and Diya" className="mx-auto aspect-[4/5] max-h-[42dvh] w-auto rounded-2xl object-cover shadow-xl" />
        </motion.div>
        <Eyebrow>{t("saveTheDate")}</Eyebrow>
        <h1 className={`font-display font-light tracking-tight text-stone-900 text-5xl sm:text-6xl ${variant === "modern" ? "italic" : ""}`}>{groom ?? "Aarav"} <span className={variant === "modern" ? "text-maroon" : "text-gold"}>♥</span> {bride ?? "Diya"}</h1>
        <div className="inline-block rounded-full border border-stone-200 px-6 py-2">
          <p className="text-sm font-light tracking-[0.2em] text-stone-600">{dateShort}</p>
        </div>
        <Countdown target={dateTarget} />
        <div>
          <button onClick={handleBegin} className="btn-primary text-lg">{t("openInvite")}</button>
          <p className="mt-4 animate-pulse text-xs uppercase tracking-[0.3em] text-stone-400">{t("swipe")}</p>
          {!loggedIn && <a href="/login?callbackUrl=%2Fw%2Faarav-diya" className="mt-3 inline-block text-sm font-semibold text-gold-dark underline">{L("Already have an account? Log in →", "invite.loginCta")}</a>}
        </div>
      </div>
    </section>,

    /* 1 — COUPLE */
    <section key="couple" className="flex h-full flex-col items-center justify-center overflow-y-auto bg-white px-6 py-10">
      <div key={`gen-${gen[1]}`} className="mx-auto grid w-full max-w-4xl items-center gap-8 md:grid-cols-2">
        <motion.img initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} src="/media/prewedding/pw3.jpg" alt="Meet the couple" className="aspect-[3/4] w-full rounded-2xl object-cover shadow-xl" loading="lazy" />
        <div className="text-center md:text-left">
          <div className="mx-auto h-px w-20 bg-gold/60 md:mx-0" />
          <h2 className="mt-4 font-display text-5xl font-light text-stone-900">{t("meetCouple")}<br />{t("theCouple")}</h2>
          <p className="mt-3 text-stone-500">{t("destined")}</p>
          <p className="mt-4 leading-relaxed text-stone-600">{wedding.story}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[["invite.groom", groom ?? "Aarav"], ["invite.bride", bride ?? "Diya"]].map(([rk, n]) => (
              <div key={rk} className="rounded-xl border border-gold/25 bg-gradient-to-br from-gold/5 to-maroon/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-gold-dark font-semibold">{L(rk === "invite.groom" ? "Groom" : "Bride", rk)}</p>
                <p className="mt-1 font-display text-xl text-stone-900">{n}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>,

    /* 2 — EVENTS */
    <section key="events" className="h-full overflow-y-auto bg-ivory px-4 py-10">
      <div key={`gen-${gen[2]}`} className="mx-auto max-w-3xl">
        <div className="text-center">
          <Eyebrow>{L("Five Celebrations, One Home", "invite.fiveCeleb")}</Eyebrow>
          <h2 className="mt-3 font-display text-4xl font-light text-stone-900">{t("eventsTitle")}</h2>
        </div>
        <div className="mt-8 space-y-3 pb-16">
          {events.map((e, i) => (
            <motion.div key={e.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="card p-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-gold-dark font-semibold">{e.key}</p>
              <h3 className="mt-1 font-display text-2xl text-maroon">{e.title}</h3>
              <p className="mt-1 text-sm text-stone-600">📍 {e.venue}</p>
              <p className="text-sm text-stone-600">🗓 {new Date(e.startsAt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
              <a href="/rsvp" className="mt-2 inline-block text-sm font-bold text-gold-dark underline">{L("RSVP →", "invite.rsvpLink")}</a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>,

    /* 3 — GALLERY */
    <section key="gallery" className="h-full overflow-y-auto bg-white px-4 py-10">
      <div key={`gen-${gen[3]}`} className="mx-auto max-w-3xl">
        <div className="text-center">
          <Eyebrow>{t("moments")}</Eyebrow>
          <h2 className="mt-3 font-display text-4xl font-light text-stone-900">{t("gallery")}</h2>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 pb-16">
          {GALLERY.map((g, i) => (
            <motion.img key={g.src} src={g.src} alt={g.alt} loading="lazy"
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
              className="aspect-[4/5] w-full rounded-xl object-cover shadow-md" />
          ))}
        </div>
      </div>
    </section>,

    /* 4 — BLESSINGS */
    <section key="blessings" className="flex h-full flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-maroon/5 to-gold/10 px-6 py-10 text-center">
      <div key={`gen-${gen[4]}`} className="mx-auto max-w-xl space-y-6">
        <Eyebrow>{t("blessings")}</Eyebrow>
        <motion.img initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} src="/media/prewedding/pw9.jpg" alt="Aarav and Diya" className="mx-auto aspect-[16/10] w-full max-w-md rounded-2xl object-cover shadow-xl" loading="lazy" />
        <h2 className="font-display text-4xl font-light text-stone-900">{t("blessingsSub")}</h2>
        <p className="text-stone-500">{loggedIn ? (useGlobal ? L("", "invite.blessIn") : (lang === "hi" ? "आप आ गए! नीचे एक टैप में अपनी उपस्थिति दर्ज करें।" : "You're in! Record your attendance for all events in one tap, or fine-tune per event.")) : (useGlobal ? L("", "invite.blessOut") : (lang === "hi" ? "अपना खाता बनाएँ, कार्यक्रमों में RSVP करें, पिकअप समन्वय करें और शादी के बाद अपनी तस्वीरें पाएँ — सब एक लिंक से।" : "Create your account, RSVP to the events you'll attend, coordinate your pickup, and find your photos after the wedding — all from one link."))}</p>
        {loggedIn && role === "GUEST" && (
          <div className="rounded-2xl border border-gold/30 bg-white/70 p-4">
            <p className="text-sm font-bold text-maroon">{L("One-tap RSVP for all 5 events", "invite.oneTap")}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <button onClick={() => quickRsvp("CONFIRMED")} className="rounded-xl bg-green-700 px-5 py-2.5 text-sm font-bold text-white min-h-[44px]">{L("Yes, attending all 🎉", "invite.yesAll")}</button>
              <button onClick={() => quickRsvp("DECLINED")} className="rounded-xl border px-5 py-2.5 text-sm font-semibold min-h-[44px]">{L("Can't make it", "invite.noWay")}</button>
            </div>
            {quickMsg && <p className="mt-2 text-sm font-medium text-maroon">{quickMsg}</p>}
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          {!loggedIn && <a href="/signup" className="btn-primary">{L("Create Account & RSVP", "invite.rsvpCta")}</a>}
          {!loggedIn && <a href="/login" className="rounded-xl border px-5 py-3 font-semibold min-h-[44px]">{L("Login", "invite.loginBtn")}</a>}
          {loggedIn && role === "GUEST" && <a href="/rsvp" className="btn-primary">{L("My RSVP (per-event)", "invite.myRsvp")}</a>}
          {loggedIn && role === "GUEST" && <a href="/gifts" className="btn-gold">{L("Browse Gifts", "invite.browseGifts")}</a>}
          {loggedIn && role === "GUEST" && <a href="/my-photos" className="rounded-xl border px-5 py-3 font-semibold min-h-[44px]">{L("My Photos", "invite.myPhotos")}</a>}
          {loggedIn && role !== "GUEST" && <a href="/dashboard" className="btn-primary">{L("Open Dashboard", "invite.openDash")}</a>}
        </div>
        <p className="text-xs text-stone-400">{L("Made with ♥ for", "invite.madeWith")} {wedding.coupleNames}</p>
        <a href="/" className="inline-block text-xs text-stone-400 underline">{L("← back to Wedding Organize AI home", "invite.backHome")}</a>
      </div>
    </section>,
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-white">
      <audio ref={audioRef} loop preload="none" src="/media/music.mp3" />
      {/* pages stack */}
      <div className="mx-auto h-full max-w-5xl" style={{ display: "grid", overflow: "hidden" }}>
        {pages.map((card, i) => {
          const active = i === page;
          if (Math.abs(i - page) > 1) return null;
          return (
            <div key={i} data-page={i}
              style={{
                gridRow: "1 / -1", gridColumn: "1 / -1", height: "100%",
                overflowY: active ? "auto" : "hidden", overflowX: "hidden",
                touchAction: "pan-y", pointerEvents: active ? "auto" : "none",
                transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
                transform: active ? "translate3d(0,0,0)" : i < page ? "translate3d(-100%,0,0)" : "translate3d(100%,0,0)",
                zIndex: active ? 2 : 1,
              }}>
              {card}
            </div>
          );
        })}
      </div>

      {/* music */}
      <button onClick={toggleMusic} aria-label={muted ? "Play music" : "Pause music"}
        className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-maroon text-white shadow-lg transition-transform hover:scale-110">
        {muted ? "♪" : "❚❚"}
      </button>
      {/* language: quick EN/HI + full 6-language 🌐 switch (Sarvam once, cached) */}
      <button onClick={() => setLang(lang === "en" ? "hi" : "en")} aria-label="Switch language"
        className="fixed bottom-36 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-bold text-maroon shadow-lg border border-gold/40 transition-transform hover:scale-110">
        {lang === "en" ? "हिं" : "EN"}
      </button>
      <div className="fixed bottom-[9.5rem] right-4 z-50 rounded-full bg-white/95 shadow-lg border border-gold/40 px-2 py-1 text-xs font-bold text-maroon">
        <LanguageSwitcher />
      </div>
      {/* close */}
      <a href="/" aria-label="Close invitation"
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur">✕</a>

      {/* in-invite nav: login when logged out (returns here), quick links when in */}
      {!loggedIn && (
        <a href="/login?callbackUrl=%2Fw%2Faarav-diya"
          className="fixed right-4 top-4 z-50 rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-white shadow-lg min-h-[44px] inline-flex items-center">
          Login
        </a>
      )}
      {loggedIn && role === "GUEST" && (
        <div className="fixed right-4 top-4 z-50 flex items-center gap-1 rounded-full bg-black/45 px-2 py-1.5 text-xs font-semibold text-white backdrop-blur">
          <a className="rounded-full px-3 py-1.5 hover:bg-white/20" href="/rsvp">My RSVP</a>
          <a className="rounded-full px-3 py-1.5 hover:bg-white/20" href="/gifts">Gifts</a>
          <a className="rounded-full px-3 py-1.5 hover:bg-white/20" href="/photos">Photos</a>
        </div>
      )}
      {loggedIn && role !== "GUEST" && (
        <div className="fixed right-4 top-4 z-50 flex items-center gap-1 rounded-full bg-black/45 px-2 py-1.5 text-xs font-semibold text-white backdrop-blur">
          <a className="rounded-full px-3 py-1.5 hover:bg-white/20" href="/dashboard">Dashboard</a>
          <a className="rounded-full px-3 py-1.5 hover:bg-white/20" href="/users">Users</a>
        </div>
      )}

      {started && (
        <>
          {/* dots */}
          <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full px-5 py-3" style={{ background: "rgba(26,14,4,0.9)" }}>
            {PAGE_LABELS.map((label, i) => (
              <button key={label} onClick={() => navigate(i)} aria-label={`Go to ${label}`} title={label}
                className="h-2.5 w-2.5 rounded-full transition-all"
                style={{ background: page === i ? "#C9A227" : "rgba(255,255,255,0.4)", transform: page === i ? "scale(1.3)" : "none" }} />
            ))}
          </div>
          {/* arrows */}
          {page > 0 && (
            <button onClick={goPrev} aria-label="Previous page" className="fixed left-3 top-1/2 z-50 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full transition hover:scale-110" style={{ background: "rgba(26,14,4,0.8)" }}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#C9A227" strokeWidth="2" strokeLinecap="round"><path d="M15,18 L9,12 L15,6" /></svg>
            </button>
          )}
          {page < PAGE_LABELS.length - 1 && (
            <button onClick={goNext} aria-label="Next page" className="fixed right-3 top-1/2 z-50 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full transition hover:scale-110" style={{ background: "rgba(26,14,4,0.8)" }}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#C9A227" strokeWidth="2" strokeLinecap="round"><path d="M9,18 L15,12 L9,6" /></svg>
            </button>
          )}
        </>
      )}
    </div>
  );
}
