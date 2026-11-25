# SETUP — run on any laptop (judges)

No mandatory API keys. Everything works offline with local fallbacks (rule parser, local flags, local approval queue, English strings).

## 1. Prereqs
- Node 20+, npm
- Internet on first run for `npm install` + face-api models are already vendored in `public/models` (no download needed). Ticket-photo OCR downloads its language data on first use only (skip the 🎫 box if offline).

## 2. Fresh run (judge device)
```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run db:seed:all    # base + gallery photos + gift donors (RECOMMENDED — /photos gallery needs it)
npm run dev
```
Open http://localhost:3000
> `npm run db:seed` alone works but leaves the photo gallery empty (seed wipes `Photo` each run, `seed-gallery` re-adds the 12 Araria images). Always use `db:seed:all` for judging.

## 3. Logins (seeded — 12 accounts, dropdowns on /login)
- Admin: admin@demo.in / admin123
- Organisers (all password `org123`): organizer@demo.in, priya.org@demo.in, rahul.org@demo.in, sneha.org@demo.in, vikram.org@demo.in, anita.org@demo.in
- Guests (all password `guest123`): guest@demo.in, aarav.guest@demo.in, diya.guest@demo.in, karan.guest@demo.in, meera.guest@demo.in

## 4. Optional sponsor keys (all optional — judges need none)
- `SARVAM_API_KEY` — Hinglish parse + 6-language homepage + ticket extract (100-credit budget). Without it: rule/parser fallback everywhere, badges show `rule`. Get: Sarvam dashboard → API key → `.env`. Tune: `SARVAM_CREDIT_TOTAL=100`. Judge view: `/dashboard` Sarvam card (leftover/total, calls, per-feature table) + `/api/sarvam-usage`. Burns credits ONLY on: `/rsvp` Parse click, `/settings` Translate-per-language (1 call/lang, then DB-cached free), `/arrivals` Extract click. Kill-switch: Flagsmith `rsvp-ai-parse OFF` = zero calls.
- `FLAGSMITH_ENV_KEY` — remote flags. Without it: local defaults (all ON except music). Get: app.flagsmith.com → project `wedding-organize-ai` → Development → SDK Keys → Server-side key (`ser....`).
  Create 8 features: `rsvp-ai-parse ON, pickup-batcher ON, group-gifting ON, expense-dashboard ON, music-autoplay OFF, whatsapp-send ON, face-search ON, inviteVariant Value=traditional ON` (IDs lowercased by Flagsmith; code handles both). Verify: `/api/integrations` → `flagsmith.connected:true`; `/settings` shows `🟢 Flagsmith connected`. DB overrides in Settings always win over remote. Every flag's use-case is documented on `/settings` for the demo.
- `NUDGEBEE_WEBHOOK_URL` — Discord-compatible webhook. Without it: local approval queue still works. Get (free, no cluster): Discord → server `wedding-alerts` → `#general` Edit Channel → Integrations → Webhooks → New Webhook → Copy URL → `.env`. Verify: `/api/integrations` → `nudgebee.configured:true`; Run batcher → Discord fires + `/dashboard` Live log updates. Full NudgeBee cluster (kind/self-hosted) is slides-only; never required to run.

After adding any key: restart `npm run dev` (Next.js loads `.env` at boot). Check `GET /api/flags` (public, with `_meta.source`), `GET /api/integrations` (public status for all 3 sponsors), `GET /api/i18n?lang=hi` (public strings).

## 5. Demo path (5 min, judge script)
1. `/` → 🌐 switch Hindi/Bhojpuri/Kannada/Telugu/Marathi → back to English (after Admin translates in `/settings`, 1 call/lang)
2. `/w/aarav-diya` → RSVP Sangeet yes (invite home, Araria venue)
3. `/rsvp` → paste Hinglish (`Papa aur mummy aayenge…`) → Parse → badge AI/rule → matrix + capacity badge
4. `/arrivals` → 🎫 upload ticket photo → Extract (OCR free + 1 Sarvam call) → prefilled → Request Pickup → (admin) Pending → Run batcher → open batch → NudgeBee coord note + WhatsApp
5. `/gifts` → contribute ₹ anonymous + named → ledger
6. `/boards` → Wedding Tracker → click `▶` story → sub-ticket status dropdowns → progress bar → reassign + cost Est✓/Save → Nudge/Share/updates
7. `/photos` → upload clear photo → Find my photos → `/my-photos` → ⬇ single + ⬇ ZIP
8. `/dashboard` → KPIs + Flagsmith table + NudgeBee events + **Sarvam credits leftover + per-feature usage** → `/settings` sponsor use-cases

## 6. Reset
```bash
rm prisma/dev.db
npx prisma db push
npm run db:seed:all
```

## 7. Troubleshooting
- `prisma: command not found` → `npm install` first
- Port in use → `npm run dev -- -p 3001`
- `/rsvp` 404 in dev only (stale `.next` cache, e.g. after a prod `next build`): `lsof -ti:3000 | xargs kill -9; rm -rf .next; npm run dev`, then hard-refresh (Cmd+Shift+R). Prod `next build` lists `/rsvp` fine — it's purely a dev-cache artifact
- Photos gallery empty → you ran `db:seed` without gallery: run `npm run db:seed:all`
- Face models missing → Photos still works (gallery fallback, flag-gated)
- Ticket OCR first use slow → downloads tesseract language data once; paste text instead if offline
- `Cannot find module './8948.js` in dev log → same stale `.next` issue as above: kill, `rm -rf .next`, restart
- Music won't autoplay → by design; click Play
