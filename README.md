# Wedding Organize AI 🪔

One OS for Indian weddings — Guest → Events → RSVP → Pickups → Gifts → Kanban → Photos.
Araria, Bihar wedding. Runs fully offline for judges; sponsor APIs are optional with local fallbacks.

## Problems (see PROBLEM_SET.md Part A)
1. Unknown event-wise availability → guesswork on food/hall/seating
2. Train/bus/plane arrival pickup chaos with limited vehicles
3. Unwanted / duplicated gifts
4. No Kanban tracking for tasks/vendors/people/expenses + roles
5. Physical invites unscalable for 500-1000 guests
6. Scattered photos — can't find photos you are in

## Solution (Part B) — what actually shipped
- **RSVP engine (`/rsvp`):** per-event matrix, Hinglish PasteBox (Sarvam AI-refine or rule fallback, badge shows which), capacity alerts, WhatsApp send + tracking. Family view for guests, full matrix for staff.
- **Pickup batching, Araria (`/arrivals`):** guest enters pickup from 4 points (Araria Bus Stand, Araria Railway Station, Bagdogra Airport, Darbhanga Airport) → fixed venue `Araria, Bihar — Wedding Venue`. Admin sees **Pending to be batched** vs **Batches**, runs car-pool batcher (same pickup + ~60-min + 4-seat cab). NudgeBee agent auto-posts car-pool instructions + updates in every batch. Ticket-photo extract box: on-device OCR (free) + 1 Sarvam call → prefilled mode/pickup/time.
- **6-language homepage:** English, Hindi, Bhojpuri, Kannada, Telugu, Marathi — 🌐 switcher on homepage + header. Sarvam translates each string **once**, then hardcoded in DB (`TranslationCache`) forever. Admin translates per language from `/settings` (1 call/language).
- **Group gifting (`/gifts`):** reserve / partial contribute, anonymous or highlighted, ledger, >₹50k approval gate.
- **Kanban Command Center (`/boards`):** 6 boards / 22 tasks + Wedding Tracker 8 Must-Do (Admin + 6 organisers). Primary tickets are **clickable Jira-style stories** with progress bars + **sub-tickets** (own status dropdown + owner each), cost est/spent with inline update, reassign dropdown + teammate search, Nudge/Share/updates thread, filters (search/assignee/priority/overdue/mine), pending approvals queue.
- **Digital invite home (`/w/[slug]`):** animated responsive invite, music toggle, login/signup, role promotion, per-event RSVP.
- **Photo hub (`/photos`, `/my-photos`):** session-aware face profiles (no more hardcoded guest), event filter, gallery ZIP + per-photo download, My Photos shows **only yours** (`?mine=1`), clear-face-data button, saved-profile indicator.

## Sponsors (all optional — judges need zero keys)

### Sarvam AI (`SARVAM_API_KEY`, budget: 100 credits)
3 credit-burning touchpoints, everything else is rule-based. ~1 credit per 1K translated chars (estimate shown on dashboard):

| # | Feature | Where | Cost | Fallback |
| - | ------- | ----- | ---- | -------- |
| 1 | Hinglish RSVP parse | `/rsvp` PasteBox → `parseRsvpSmart()` | 1 call per Parse click (500-char cap, memo per exact text) | rule parser, badge `rule` |
| 2 | Homepage i18n (6 langs) | 🌐 switcher → `/api/i18n` → `TranslationCache` | **1 call per language, once ever** (batched block), then cached free | English strings |
| 3 | Ticket extract | `/arrivals` 🎫 box → `/api/ticket-extract` | 1 call per Extract (photo OCR itself is free, on-device) | regex classify, badge `rule` |

Credit discipline: rule-first, button-triggered only (never on page load), memo + DB cache, 9s timeout → silent fallback. **Dashboard (`/dashboard` Sarvam card)** shows `leftover/total`, calls + chars, per-feature table (`rsvp-parse / i18n / ticket-extract`) for the judge. Usage logged in `SarvamUsage` (`/api/sarvam-usage`). Get key: Sarvam dashboard → API key → `.env`: `SARVAM_API_KEY=sk_...`. No `sarvamai` SDK installed on purpose — raw `fetch` to the same endpoint, zero new deps. Tune budget: `SARVAM_CREDIT_TOTAL=100` in `.env`.

### Flagsmith (`FLAGSMITH_ENV_KEY`) — feature flags + kill-switches + A/B
What each flag gates (all read live from `/api/flags`, fallback to local defaults in `lib/flags.ts`):

| Flag | Type / Default | Where it is used | What OFF does (demo kill-switch) |
| ---- | -------------- | ---------------- | -------------------------------- |
| `rsvp-ai-parse` | Boolean ON | `/rsvp` PasteBox + `lib/sarvam.ts` | Skips Sarvam (saves credits!), badge `rule-fallback` |
| `pickup-batcher` | Boolean ON | `/arrivals` Run batcher | Hides auto-run, manual assign only |
| `group-gifting` | Boolean ON | `/gifts` registry | Registry read-only |
| `expense-dashboard` | Boolean ON | `/boards` + `/dashboard` spend | Hides spend widgets |
| `music-autoplay` | Boolean OFF | `/w/[slug]` HeroInvite | Never autoplays (browsers block anyway) |
| `whatsapp-send` | Boolean ON | `/api/invites/send` | Blocks bulk send |
| `face-search` | Boolean ON | `/photos` + `/my-photos` | Gallery-only, no model download |
| `inviteVariant` | String `traditional` | `/w/[slug]` HeroInvite | `traditional` vs `modern` A/B |

First-time setup (free, 2 min):
1. app.flagsmith.com → Create Project `wedding-organize-ai` (Development env auto-created)
2. Features → Create Feature 8x (IDs lowercased by Flagsmith — code handles `inviteVariant`/`invitevariant` both):
   `rsvp-ai-parse ON, pickup-batcher ON, group-gifting ON, expense-dashboard ON, music-autoplay OFF, whatsapp-send ON, face-search ON, inviteVariant Value=traditional ON`
3. Left nav SDK Keys → Development → copy Server-side Environment key (`ser....`)
4. `.env`: `FLAGSMITH_ENV_KEY=ser....` → restart `npm run dev`
5. Verify: `/api/integrations` → `flagsmith.connected:true`; `/settings` shows `🟢 Flagsmith connected`. DB overrides in Settings always win over remote.
Implementation: `lib/flags.ts` (30s cache, Edge REST, `invitevariant` lowercase-tolerant), `app/api/flags/route.ts` (public GET + `_meta`), `/settings` documents every flag's use-case for the demo.

### NudgeBee (`NUDGEBEE_WEBHOOK_URL`) — approvals + workflows + Discord alerts
All via `logEvent()` → local `EventLog` DB + POST to webhook (`lib/nudgebee.ts`, Discord-compatible `{text, content}`):

| Event / Approval `kind` | Trigger | Workflow |
| ----------------------- | ------- | -------- |
| `whatsapp.bulk.requested` / `WHATSAPP_BULK` | `POST /api/invites/send` | PENDING → Discord ping → Approve in `/boards` |
| `expense.approval_requested` / `EXPENSE_HIGH` | Task est >₹1L as organiser | `402` → Discord budget alert → approve unblocks |
| `gift.approval_requested` / `GIFT_HIGH` | Contribute >₹50k | `402` → Discord → approve creates Contribution |
| `task.*`, `subticket.*` | Nudge/update/reassign/subticket moves | Triage + AI summary |
| `pickup.batch_created`, `pickup.arrival_added` | Run batcher / guest entry; auto NudgeBee coord note per batch | Vehicle-clash / driver Discord alert |
| `photo.scan_done` | Rescan | Processing-job triage |

First-time setup (free, 30 sec, no cluster): Discord → server `wedding-alerts` → `#general` → Integrations → Webhooks → New Webhook → Copy URL → `.env`: `NUDGEBEE_WEBHOOK_URL=https://discord.com/api/webhooks/...` → restart. Verify: `/api/integrations` → `nudgebee.configured:true`; Run batcher → Discord fires + `/dashboard` Live log. Full cluster (kind/self-hosted) is slides-only.
Status: `GET /api/integrations` → `{flagsmith, nudgebee, sarvam}` (public, no secrets).

## Team & seed accounts (12 users — login dropdowns)
- Admin (1): `admin@demo.in / admin123`
- Organisers (6, all `org123`): `organizer@demo.in`, `priya.org@demo.in`, `rahul.org@demo.in`, `sneha.org@demo.in`, `vikram.org@demo.in`, `anita.org@demo.in`
- Guests (5, all `guest123`): `guest@demo.in`, `aarav.guest@demo.in`, `diya.guest@demo.in`, `karan.guest@demo.in`, `meera.guest@demo.in`
`/login` has Admin one-tap + organiser dropdown (6) + guest dropdown (5). Wedding Tracker 8 tickets are assigned across Admin + all 6 organisers; all staff see everyone's tickets.

## Roles & access
| Area | Admin | Organizer | Guest (logged in) | Logged out |
| ---- | ----- | --------- | ----------------- | ---------- |
| Landing `/`, invite `/w/[slug]`, login/signup, 🌐 switch | ✓ | ✓ | ✓ | ✓ |
| Gifts — browse + contribute | ✓ | ✓ | ✓ | → login |
| RSVP matrix + Hinglish parse | ✓ full matrix + PasteBox | ✓ full matrix | ✓ own family only + Hinglish auto-fill | → login |
| Arrivals — give pickup (guest) / batch (staff) | ✓ entries + pending + run | ✓ entries + pending + run | ✓ give own pickup, view + coordinate | → login |
| Photos + My Photos (only mine) + downloads | ✓ | ✓ | ✓ | → login |
| Dashboard (forecast, spend, sponsor health + Sarvam credits) | ✓ | ✓ | ✗ → home | → login |
| Boards + sub-tickets + expenses + approvals | ✓ create + assign anyone | ✓ create + assign anyone | ✗ → home | → login |
| Guest list / Users / Settings (flags, i18n, sponsor use-cases) | ✓ | staff: guests no, settings no | ✗ → home | → login |

Enforced in `middleware.ts`. Public (logged-out): `/`, `/w/*`, `/login`, `/signup`, `/api/flags`, `/api/i18n`, `/api/integrations`, `/icon.svg`.

## Quick start (judges — zero keys needed)
See **SETUP.md**. TL;DR:
```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run db:seed:all   # base + gallery photos + gifts (Photos NEEDS this)
npm run dev
```
Open http://localhost:3000 — pick a profile on `/login` (Admin recommended first).

Demo script: **DEMO.md**. Full plan: **PLAN.md**. Problem base: **PROBLEM_SET.md**.

## Pitch video — presenter script (2:00 total)
Last 45s = sponsors (15s each). Pace ~2.5 words/sec. Full shot plan stays internal (not in git).

**[0:00–0:09] Hook + solo build.** "Every Indian wedding runs on a thousand WhatsApp forwards. I replaced all of it with one link — designed and built solo."

**[0:09–0:29] Six problems.** "One: nobody knows who is coming to which event. Two: airport pickups are chaos. Three: five identical gifts. Four: tasks live in memory. Five: five hundred paper invites. Six: a thousand photos you will never find yourself in."

**[0:29–0:41] RSVP + pickups.** "Guests RSVP per event — even in Hinglish — and the food and hall counts fix themselves. Arrivals auto-batch by pickup point and time, so one cab does the work of three."

**[0:41–0:52] Gifts + boards.** "Gifting becomes a shared registry — no duplicates. And every task, vendor, and rupee lives on one Kanban with owners, sub-tasks, and live spend."

**[0:52–1:02] Invite + photos.** "One animated invite replaces five hundred cards. And face-search finds every photo you appear in — download them all in one zip."

**[1:02–1:15] Roles + SaaS.** "Admins control everything: one click promotes a guest to organiser, and the whole platform reshapes — guests see invites and RSVP, staff see dashboards and boards. This wedding season, any family or planner launches their own wedding OS in a day."

**[1:15–1:30] Flagsmith.** "Flagsmith keeps the live demo unbreakable. Every risky feature is a kill-switch — turn AI parsing off mid-demo and the app keeps working on rules. Eight flags, zero redeploys."

**[1:30–1:45] NudgeBee.** "NudgeBee runs approvals and ops. A big expense pends approval, Discord pings the admin, one click unblocks it — every pickup, nudge, and payment lands in one audit log."

**[1:45–2:00] Sarvam + close.** "Sarvam AI reads Hinglish, speaks six languages, and decodes tickets — on a 100-credit budget the dashboard tracks live. Wedding Organize AI — one link for the whole wedding."
