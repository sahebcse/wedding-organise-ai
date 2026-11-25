"use client";
import { motion } from "framer-motion";
import { useLang, LanguageSwitcher } from "./LanguageContext";

export default function LandingPublic() {
  const { t } = useLang();
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><LanguageSwitcher /></div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl border border-gold/30 bg-white shadow-xl shadow-maroon/5">
        <div className="grid md:grid-cols-2">
          <div className="relative h-64 overflow-hidden md:h-auto md:min-h-[420px]">
            <img src="/media/prewedding/pw1.jpg" alt="Aarav weds Diya" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent md:bg-gradient-to-r" />
            <p className="absolute bottom-4 left-4 text-[11px] uppercase tracking-[0.3em] text-white/90">॥ शुभ विवाह ॥ {t("home.where")}</p>
          </div>
          <div className="flex flex-col justify-center p-8 sm:p-10">
            <p className="text-[11px] uppercase tracking-[0.35em] text-stone-400 font-medium">{t("home.badge")}</p>
            <h1 className="mt-3 font-display text-4xl font-light tracking-tight text-stone-900 sm:text-5xl">{t("home.titleA")} <span className="text-gold">♥</span> {t("home.titleB")}</h1>
            <p className="mt-3 text-stone-500">{t("home.sub")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="/w/aarav-diya" className="btn-primary">{t("home.ctaInvite")}</a>
              <a href="/login" className="btn-gold">{t("home.ctaLogin")}</a>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center text-sm">
              {[["500+", t("home.statsGuests")], ["5", t("home.statsEvents")], ["100%", t("home.statsOffline")]].map(([a, b]) => (
                <div key={b} className="rounded-xl bg-ivory p-3"><div className="text-xl font-bold text-maroon">{a}</div><div className="text-stone-500">{b}</div></div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="card p-8 text-center">
        <h2 className="font-bold text-maroon">{t("home.attending")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">{t("home.attendingSub")}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <a href="/w/aarav-diya" className="rounded-xl border px-5 py-3 font-semibold min-h-[44px]">{t("home.ctaWatch")}</a>
          <a href="/signup" className="rounded-xl border px-5 py-3 font-semibold min-h-[44px]">{t("home.ctaSignup")}</a>
        </div>
      </motion.div>
    </div>
  );
}
