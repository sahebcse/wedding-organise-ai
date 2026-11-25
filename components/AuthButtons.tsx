"use client";
import { signOut, useSession } from "next-auth/react";
import { LanguageSwitcher, useLang } from "./LanguageContext";

export default function AuthButtons() {
  const { data, status } = useSession();
  const { t } = useLang();
  if (status === "loading") return <span className="rounded-lg px-3 py-2 text-sm text-stone-400">…</span>;

  /* Logged out: invitation-first — no internal pages referenced */
  if (!data?.user) {
    return (
      <span className="flex items-center gap-2 text-sm">
        <LanguageSwitcher />
        <a className="rounded-lg px-3 py-2 hover:bg-gold/20" href="/w/aarav-diya">{t("nav.invitation")}</a>
        <a className="rounded-lg bg-maroon px-4 py-2 font-semibold text-white hover:bg-maroon-dark min-h-[44px] inline-flex items-center" href="/login">{t("nav.login")}</a>
      </span>
    );
  }

  const role = (data.user as { role?: string }).role ?? "GUEST";

  /* Guests: invitation + every page they can use — no back-office links */
  if (role === "GUEST") {
    return (
      <span className="flex flex-wrap items-center gap-1 text-sm">
        <LanguageSwitcher />
        <a className="rounded-lg px-2 py-2 hover:bg-gold/20" href="/w/aarav-diya">{t("nav.invitation")}</a>
        <a className="rounded-lg px-2 py-2 hover:bg-gold/20" href="/rsvp">{t("nav.rsvp")}</a>
        <a className="rounded-lg px-2 py-2 hover:bg-gold/20" href="/gifts">{t("nav.gifts")}</a>
        <a className="rounded-lg px-2 py-2 hover:bg-gold/20" href="/arrivals">{t("nav.pickups")}</a>
        <a className="rounded-lg px-2 py-2 hover:bg-gold/20" href="/photos">{t("nav.photos")}</a>
        <span className="hidden rounded-full bg-maroon/10 px-3 py-1 text-xs font-bold text-maroon sm:inline">
          {(data.user as { name?: string }).name ?? "Guest"} • GUEST
        </span>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="rounded-lg px-2 py-2 hover:bg-gold/20" title="Sign out">Logout</button>
      </span>
    );
  }

  /* Admin / Organizer: full back-office nav */
  return (
    <span className="flex items-center gap-1 text-sm">
      <LanguageSwitcher />
      <a className="rounded-lg px-3 py-2 hover:bg-gold/20" href="/dashboard">{t("nav.dashboard")}</a>
      <a className="rounded-lg px-3 py-2 hover:bg-gold/20" href="/rsvp">RSVP</a>
      <a className="rounded-lg px-3 py-2 hover:bg-gold/20" href="/arrivals">Pickups</a>
      <a className="rounded-lg px-3 py-2 hover:bg-gold/20" href="/gifts">Gifts</a>
      <a className="rounded-lg px-3 py-2 hover:bg-gold/20" href="/boards">Boards</a>
      <a className="rounded-lg px-3 py-2 hover:bg-gold/20" href="/photos">Photos</a>
      <a className="rounded-lg px-3 py-2 hover:bg-gold/20" href="/users">Users</a>
      <a className="rounded-lg px-3 py-2 hover:bg-gold/20" href="/settings">Settings</a>
      <span className="hidden rounded-full bg-maroon/10 px-3 py-1 text-xs font-bold text-maroon sm:inline">
        {(data.user as { name?: string }).name ?? "User"} • {role}
      </span>
      <button onClick={() => signOut({ callbackUrl: "/" })} className="rounded-lg px-3 py-2 hover:bg-gold/20" title="Sign out">Logout</button>
    </span>
  );
}
