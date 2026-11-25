# Wedding Organize AI — FULL BUILD PLAN (Phase 0 → 6, Single Go)

> Source of truth: `PROBLEM_SET.md` V2 (6 problems).
> Scope lock: **Face-search IN MVP. NO room allocation. P2 = vehicle/taxi batching by arrival time + venue + co-traveler coordination only.**
> Build mode: single Next.js monorepo, runnable locally for judges. No mandatory paid keys.
> Quality bar: **best-in-class Indian-wedding UI/UX, fully responsive (mobile/tablet/laptop), top-level SVG + animations.**

---

## 0. What we are building (matched to PROBLEM_SET.md)

| # | Problem (Part A) | Solution module | Key demoable output |
|---|------------------|-----------------|---------------------|
| 1 | Unknown event-wise availability | RSVP Engine + Arrangement Forecaster | Event-wise matrix + headcounts + capacity alerts |
| 2 | Arrival pickup chaos (train/bus/plane, limited vehicles) | Arrival Batching + Pickup Coordination (LITE, no rooms) | Pickup batches by venue+time + co-traveler coordination |
| 3 | Unwanted/duplicated gifts | Curated Group-Gifting Registry + privacy | Reserve / partial contribute, anonymous or highlighted |
| 4 | No tracking for tasks/vendors/people/expenses | Kanban Command Center + Expense Dashboard + roles | Boards, owners, status, ask-update, spend totals |
| 5 | Physical invites unscalable | Digital Wedding Home Page (animated invite + login + RSVP + roles + WhatsApp) | Shareable responsive page + music + auth + RSVP + send |
| 6 | Scattered photos, can't find self | Face-Search Photo Hub ("Find My Photos") | 3-face onboarding → gallery scan → My Photos |

One DB, one Guest-to-Event Graph:
`User → Family → Guest → Event → Invite → RSVP → Arrival → PickupBatch → Gift/Contribution → Board/Task/Expense → Photo/FaceEmbedding`

Sponsors (must all appear, all with local fallback):
- **Sarvam AI:** Hinglish RSVP parse, multilingual invite text, PNR extract (stretch), voice-note STT (stretch).
- **Flagsmith:** flags `rsvp-ai-parse, pickup-batcher, group-gifting, expense-dashboard, music-autoplay, whatsapp-send, face-search` + kill-switches + invite A/B.
- **NudgeBee:** approval gates (bulk WhatsApp, high expense, high-value gift), workflow events, Discord webhook (optional), processing-job events.

---

## 1. Tech stack (locked)

| Layer | Choice | Why / billing note |
|-------|--------|--------------------|
| App | Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn-style components, Framer Motion | Single `npm run dev`, one deploy, free, best animation support |
| DB ORM | Prisma + SQLite (`prisma/dev.db`) | Zero-config for judges. `DATABASE_URL` swappable to Postgres later |
| Auth | NextAuth.js Credentials (email+password) + JWT roles | No OAuth keys needed. Seeded logins |
| Validation | Zod on all forms + APIs | Prevents bad demo input |
| State/data | Server Components + Route Handlers + Prisma | No extra backend process |
| Face | `face-api.js` + local models in `public/models/` | Fully offline, no billing. Lazy-loaded |
| Sarvam | `lib/sarvam.ts` wrapper, `SARVAM_API_KEY?` optional | If missing → rule-based fallback, demo never breaks |
| Flagsmith | `flagsmith` JS SDK, `FLAGSMITH_ENV_KEY?` optional + `lib/flags.ts` local defaults | If missing → local defaults (all ON) |
| NudgeBee | `lib/nudgebee.ts` POST to `NUDGEBEE_WEBHOOK_URL?` + local `Approval` table | If missing → local-only approval UI |
| WhatsApp | `wa.me` deep links | No API cost |
| Uploads | `public/uploads/` local dir | No S3 |
| Tests | Vitest + Testing Library (unit) + manual Chrome MCP checklist per phase | Fast, local |
| Seed | `scripts/seed-demo.ts` (tsx) | One-command demo data |
| Animations | Framer Motion + CSS keyframes + inline SVG (paisley, mandala, diya, marigold) | Top-level wedding feel, no heavy assets |

Node: 20 LTS. Package manager: npm (judges know it).

---

## 2. Folder structure (create exactly this)

```
wedding-organize-ai/  (repo root = current workspace, new app in ./app-new/ OR root if greenfield; prefer root-level Next.js)
  app/
    (public)/[weddingSlug]/page.tsx        # P5 digital invite home
    (auth)/login/page.tsx
    (auth)/signup/page.tsx
    (dashboard)/layout.tsx                 # role-gated shell
    (dashboard)/dashboard/page.tsx          # admin overview (counts, alerts, spend)
    (dashboard)/guests/page.tsx
    (dashboard)/rsvp/page.tsx               # P1 matrix
    (dashboard)/arrivals/page.tsx           # P2 input + batches
    (dashboard)/pickups/[batchId]/page.tsx  # P2 batch detail + coordination notes
    (dashboard)/gifts/page.tsx              # P3 registry
    (dashboard)/boards/page.tsx
    (dashboard)/boards/[boardId]/page.tsx   # P4 kanban
    (dashboard)/photos/page.tsx             # P6 gallery + upload
    (dashboard)/my-photos/page.tsx          # P6 matched results
    api/
      auth/[...nextauth]/route.ts
      guests/route.ts
      events/route.ts
      rsvp/route.ts
      rsvp/parse/route.ts                   # Sarvam or fallback
      arrivals/route.ts
      pickups/route.ts  (POST run-batcher)
      pickups/[batchId]/notes/route.ts
      gifts/route.ts
      gifts/[id]/contribute/route.ts
      boards/route.ts
      tasks/route.ts + tasks/[id]/route.ts
      approvals/route.ts
      photos/upload/route.ts
      photos/scan/route.ts                  # face re-scan trigger
      invites/send/route.ts                 # creates approval + wa.me links
      flags/route.ts                        # exposes effective flags
  components/
    invite/HeroInvite.tsx, EventTimeline.tsx, MusicToggle.tsx, RsvpButtons.tsx
    rsvp/RsvpMatrix.tsx, RsvpPasteBox.tsx, CapacityAlert.tsx
    arrivals/ArrivalForm.tsx, PickupBoard.tsx, BatchCard.tsx, CoordNotes.tsx
    gifts/GiftCard.tsx, ContributeModal.tsx
    kanban/KanbanBoard.tsx, TaskCard.tsx, ExpenseSummary.tsx
    photos/FaceOnboard.tsx, PhotoUploader.tsx, MyPhotosGrid.tsx
    ui/* (Button, Card, Dialog, Badge, Tabs, Toaster)
    layout/AppShell.tsx, RoleGate.tsx
  lib/
    db.ts, auth.ts, flags.ts, sarvam.ts, nudgebee.ts
    rsvp-parser.ts      # rule fallback + Sarvam path
    pickup-batcher.ts   # pure function (venue+window+capacity)
    gifting.ts          # totals, remaining, duplicate guard
    faces.ts            # embeddings compare, match threshold
    whatsapp.ts         # wa.me link builder
    validators.ts       # zod schemas
  prisma/
    schema.prisma
    seed-demo.ts
  public/
    models/ (face-api weights, lazy)
    uploads/ (gitignored, created at runtime)
    art/ (svg: mandala.svg, paisley.svg, diya.svg)
    music/sangeet-loop.mp3 (royalty-free placeholder, toggleable)
  scripts/seed-demo.ts
  tests/unit/*.test.ts
  .env.example
  README.md, SETUP.md (judge runbook), DEMO.md (3-min script)
```

---

## 3. Data model (Prisma — final)

```
User(id, name, email UNIQUE, passwordHash, role: ADMIN|ORGANIZER|GUEST, faceOnboarded Boolean, createdAt)
Family(id, name, phone?, city?)
Guest(id, familyId→Family, fullName, phone?, relation?, diet: VEG|NONVEG|JAIN|UNKNOWN, events EventInvite[], createdAt)
Wedding(id, slug UNIQUE, coupleNames, story, venues Json, musicUrl?, adminId→User)
Event(id, weddingId, key: HALDI|MEHENDI|SANGEET|WEDDING|RECEPTION, title, venue, startsAt, capacityWarnAt, capacityMax)
EventInvite(id, guestId, eventId, eligible Boolean @@unique(guestId,eventId))
RSVP(id, eventInviteId UNIQUE, status: CONFIRMED|TENTATIVE|DECLINED|PENDING, headcount Int, updatedBy, source: PAGE|PASTE|ADMIN|WHATSAPP, rawText?)
Arrival(id, guestId, mode: TRAIN|BUS|PLANE|CAR, station, arrivalAt DateTime, partySize, venue, pnrRef?)
Vehicle(id, label, capacity, type: CAB|TEMPO|BUS)
PickupBatch(id, venue, windowStart, windowEnd, vehicleId?, status)
PickupMember(id, batchId, arrivalId UNIQUE)
BatchMessage(id, batchId, authorId→User, text, createdAt)
Gift(id, title, imageUrl?, pricePaise, qtyNeeded, privacyDefault)
Contribution(id, giftId, guestId, amountPaise, anonymous Boolean, status)
Board(id, title, category: FOOD|TRANSPORT|DECOR|VENDOR|RITUAL|MISC)
Task(id, boardId, title, owner?, status: TODO|DOING|DONE, dueAt?, priority, estimatePaise, dependsOn?)
Approval(id, kind: WHATSAPP_BULK|EXPENSE_HIGH|GIFT_HIGH, payload Json, status: PENDING|APPROVED|REJECTED, decidedBy?)
Photo(id, eventId?, uploaderId→User, url, createdAt)
FaceEmbedding(id, userId UNIQUE, vectors Json, updatedAt)
PhotoMatch(id, photoId, userId, score @@unique(photoId,userId))
```

Rules:
- RSVP headcount 0 when DECLINED; ≥1 when CONFIRMED.
- Contribution sum per gift ≤ price*qty (guard in `gifting.ts` + API).
- Task DONE requires deps DONE (API check).
- PickupBatch window = 60 min default (env-overridable).

---

## 4. Auth, roles, dashboards

- Signup/Login (Credentials). Seed users:
  - `admin@demo.in / admin123` (ADMIN)
  - `organizer@demo.in / org123` (ORGANIZER)
  - `guest@demo.in / guest123` (GUEST)
- Middleware: `/dashboard/*` requires login; `/dashboard/boards`, `/dashboard/guests`, `/dashboard/dashboard` require ORGANIZER+; role promotion UI admin-only (`RoleGate`).
- Dashboards:
  - Admin overview: event-wise confirmed/tentative/pending, capacity alerts, pickup counts, gift progress, spend total vs estimate, pending approvals.
  - Organizer: boards + arrivals + RSVP update (no role promote, no user delete).
  - Guest: invite page + My RSVP + My Photos + gifts browse + my pickup batch.

---

## 5. UI/UX bar (non-negotiable, every phase)

- Responsive: 360px mobile → 1440px desktop. No horizontal scroll. Touch targets ≥44px. Test in Chrome MCP at 360×800, 768×1024, 1440×900.
- Theme: deep maroon + gold + ivory; marigold/paisley SVG dividers; mandala hero; diya glow CTA. Dark-text on light for readability; gold reserved for accents.
- Motion: Framer Motion page fade/slide, hero petals float, count-up numbers on dashboard, Kanban drag animation, Matching shimmer on photo scan. `prefers-reduced-motion` respected. Music default OFF (autoplay blocked + flag `music-autoplay`).
- A11y: labels on all inputs, focus rings, alt text, contrast AA, keyboard-draggable Kanban fallback (move buttons).
- Performance: images `next/image`, lazy face models, no layout shift (skeleton loaders).

---

## 6. Sponsor wiring (exact)

**Sarvam (`lib/sarvam.ts`):**
- `parseRsvpHinglish(text)` → if `SARVAM_API_KEY` set: Translate/Detect + entity extract; else rule fallback (`rsvp-parser.ts`: keywords aayenge/aaunga/confirm/pakka = CONFIRMED; shayad/maybe/dekhte = TENTATIVE; nahi/skip = DECLINED; headcounts via digits + "hum N"; names via Guest lookup).
- Invite i18n: `translateInvite(text, 'hi'|'en')` cached; fallback = original.
- PNR extract (stretch): regex + optional Sarvam Document Intelligence.
- UI badge shows `AI` vs `rule-fallback` so judges see both paths.

**Flagsmith (`lib/flags.ts` + `/api/flags`):**
- Server reads `FLAGSMITH_ENV_KEY`; failure → local defaults ON.
- Flags gate: AI parser, batcher auto-run, group-gifting partial, expense dashboard, music, WhatsApp bulk, face-search.
- Invite A/B: `invite-variant: traditional|modern` switches HeroInvite theme.

**NudgeBee (`lib/nudgebee.ts`):**
- `emit(event, payload)` POSTs to webhook if set; always writes local `EventLog`/uses `Approval` row.
- Gates: bulk WhatsApp send, expense > ₹1,00,000 estimate, gift contribution > ₹50,000 → create `Approval PENDING`, block action until APPROVED (admin/organizer approve button).
- Discord: same webhook payload includes `text` field for Discord-compatible endpoints.

---

## 7. PHASES — build in order, no skipping, sign-off each before next

> Global commands: `npm run dev`, `npm run db:seed`, `npx vitest run`.
> Chrome MCP = manual browser verification at 3 viewports + console clean.

### PHASE 0 — Scaffold + Auth + Roles + Seed + Shell (foundation)

Build:
- Next.js TS + Tailwind + Framer Motion + Prisma SQLite + NextAuth Credentials + Zod.
- `prisma/schema.prisma` (full §3), `.env.example` (all optional keys blank + defaults), `scripts/seed-demo.ts` (1 wedding, 5 events, 3 families, 12 guests, invites, 1 board, 2 gifts, 2 vehicles).
- AppShell (nav, role badge, mobile drawer), login/signup pages, `RoleGate`, toasters, mandala hero placeholder.
- Unit: auth role guard, validators reject bad RSVP/headcount, seed idempotent.
- Seed logins documented.

Chrome MCP tests:
1. 360/768/1440 — shell no overflow, nav collapses, login/signup usable.
2. Login as each seed user → correct landing + RoleGate blocks guest from `/dashboard/boards`.
3. Admin promotes guest→organizer → organizer sees boards.
4. Console zero errors; music off by default.

Sign-off (100%):
- [ ] `npm i && npm run db:seed && npm run dev` boots clean from fresh clone
- [ ] 3 roles login, wrong password rejected, unauth redirected
- [ ] Promotion works, audit persists after reload
- [ ] Unit tests pass, viewports pass, no console errors

### PHASE 1 — P5 Invite Home + P1 RSVP Engine

Build:
- Public `/(public)/[weddingSlug]`: HeroInvite (couple names, dates, SVG art, countdown), EventTimeline, MusicToggle (flagged), RsvpButtons (per-event CONFIRMED/DECLINED + headcount + diet), login CTA.
- Dashboard `/rsvp`: RsvpMatrix (guest×event with status pills + filters + search), RsvpPasteBox (paste Hinglish → preview parse → confirm), CapacityAlert (warn at `capacityWarnAt`, critical at `capacityMax`), WhatsApp invite sender (creates Approval, shows wa.me links).
- APIs: `events, guests, rsvp, rsvp/parse, invites/send, approvals`.
- `rsvp-parser.ts` + `sarvam.ts` with AI/rule badge.
- Seed: 10 Hinglish pastes incl. `Papa aur mummy aayenge, main shayad nahi aa paunga`.

Unit (≥12 cases): confirmed/tentative/declined keywords (Hindi+English), `hum 4 log`, headcount bounds, DECLINED→0, unknown guest → PENDING + warning, idempotent re-parse.

Chrome MCP:
1. Guest RSVPs from public page → matrix updates <2s, counts animate.
2. Paste 3 Hinglish samples → preview correct → confirm → headcounts + alert fire.
3. Kill `rsvp-ai-parse` flag → fallback still parses, badge shows `rule-fallback`.
4. Mobile: matrix becomes cards, no overflow; WhatsApp link opens `wa.me` with prefill.

Sign-off:
- [ ] Event-wise confirmed/tentative/pending math exact vs seed
- [ ] Capacity warn/critical thresholds correct
- [ ] Admin manual override + WhatsApp tracking (sent/replied/pending) works
- [ ] All unit + viewport + no-console-error checks pass

### PHASE 2 — P2 Arrival Batching LITE (no rooms)

Build:
- `/arrivals`: ArrivalForm (mode/station/datetime/party/venue/guest link) + arrivals table + "Run batcher" (flagged).
- `pickup-batcher.ts` pure: sort by `venue → arrivalAt`; 60-min windows; pack by vehicle capacity (greedy largest-party-first); emit batches + unassigned list.
- `/pickups/[batchId]`: BatchCard (window, venue, vehicle, members), co-traveler list, CoordNotes (BatchMessage thread), WhatsApp share.
- APIs: `arrivals, pickups, pickups/[batchId]/notes`.
- Seed: 8 arrivals across 2 venues → expect 2–3 batches.

Unit (≥10): same-venue 30-min apart batched; 90-min apart split; different venues never merged; capacity overflow splits; party > largest vehicle → flagged unassigned; idempotent rerun.

Chrome MCP:
1. Add arrival → appears grouped; run batcher → batches render with members.
2. Open batch → co-travelers visible → post note → persists + shows author.
3. Flag `pickup-batcher` OFF → manual assign still works.
4. Mobile timeline readable; times in IST.

Sign-off:
- [ ] Batching deterministic on seed data (snapshot test)
- [ ] Overlaps/shortages flagged, unassigned explained
- [ ] Notes + WhatsApp coordination work per batch
- [ ] Unit + viewports + console clean

### PHASE 3 — P3 Group Gifting

Build:
- `/gifts`: registry grid (GiftCard: image, price, funded %, remaining), ContributeModal (full/partial + anonymous/highlighted + name display rule), ledger + progress bars.
- APIs: `gifts, gifts/[id]/contribute` (atomic sum guard), approvals for >₹50k.
- `gifting.ts`: remaining calc, over-contribution reject, duplicate reserve guard.

Unit (≥8): partial sums, full buy closes gift, over-contribute rejected, anonymous hides name but counts total, concurrent contributes safe (transaction).

Chrome MCP:
1. Contribute partial anonymously → bar moves, name hidden.
2. Contribute with name → highlighted in ledger.
3. Overpay attempt → clean error; closed gift blocks further.
4. Mobile cards stack; amounts in ₹ formatting.

Sign-off:
- [ ] Totals never exceed target; ledger exact
- [ ] Privacy respected end-to-end
- [ ] High-value approval gate works (blocked until approved)
- [ ] Tests + viewports + console clean

### PHASE 4 — P4 Kanban + Expenses + Approvals

Build:
- `/boards`, `/boards/[boardId]`: KanbanBoard (TODO/DOING/DONE, drag + move buttons), TaskCard (owner, due, priority, estimate, deps), ExpenseSummary (per-board + global rollup on admin dashboard), Ask-update (creates NudgeBee event + in-app ping), Approval queue UI.
- APIs: `boards, tasks, tasks/[id], approvals`.
- Rules: DONE blocked if deps not DONE; estimate >₹1L needs approval.

Unit (≥10): transition guards, dep block, estimate rollup math, approval state machine, overdue detection.

Chrome MCP:
1. Create board (Food) + 3 tasks → drag to DOING → dashboard spend updates with count-up.
2. Set dep → try DONE early → blocked with message.
3. Request update → event logged; approve high expense → unblocked.
4. Keyboard-only move works; mobile columns become vertically stacked swimlanes.

Sign-off:
- [ ] Spend math exact; overdue/dependency flags correct
- [ ] Role permissions enforced (guest cannot move)
- [ ] Approvals end-to-end with and without webhook
- [ ] Tests + viewports + console clean

### PHASE 5 — P6 Face-Search Photo Hub (MVP)

Build:
- `/photos`: event album grid + PhotoUploader (logged-in, multi-file → `public/uploads/`).
- FaceOnboard: capture/upload 3 faces → `face-api.js` embeddings → `FaceEmbedding` upsert.
- `/my-photos`: matched grid + score; "Rescan" triggers `/photos/scan` (re-compare new user vs all photos, and new photos vs all users).
- `faces.ts`: cosine match, threshold 0.6 default, top-K per user.
- Flag `face-search` lazy-loads models; failure → gallery-only mode with notice.

Unit (mocked vectors): same-person match, different-person reject, threshold edge, rescan idempotent (no dup PhotoMatch).

Chrome MCP:
1. Signup new guest → upload 3 faces → onboarding confirm.
2. Upload 2 event photos (one containing them) → Rescan → appears in My Photos with shimmer → result state.
3. Update faces → rescan → matches refresh, no duplicates.
4. Models-fail simulation (flag OFF) → gallery still browsable.
5. Mobile upload from camera works (file input `accept=image/*`).

Sign-off:
- [ ] New-user rescan + new-photo rescan both correct
- [ ] Privacy: user sees only own matches (+ admin sees all)
- [ ] No duplicate matches; threshold tuned on seed faces
- [ ] Tests + viewports + console clean (face models lazy, no blocking)

### PHASE 6 — Sponsors Hardening + SETUP + DEMO (ship)

Build:
- `/api/flags` + flag toggles UI (admin) + invite A/B variants.
- NudgeBee event log page (admin) + Discord payload check.
- Sarvam badges everywhere AI/fallback matters.
- `SETUP.md` (fresh-clone runbook: prereqs, `npm i`, env copy, `db:seed`, `dev`, logins, flags/keys optional table, troubleshooting, reset), `README.md` (Part A problems → Part B solution → screenshots/GIF slots → sponsor table → setup link), `DEMO.md` 3-min script matching PROBLEM_SET Appendix 1 + step 8 photo hub.
- Seed final polish: IST times, ₹ formatting, real-feel names/venues.
- Full `npx vitest run` green + Chrome MCP full pass (all pages × 3 viewports, console clean, Lighthouse-ish sanity: no blocking fonts, images sized).

Sign-off (project DONE):
- [ ] Fresh laptop: `npm i && npm run db:seed && npm run dev` → full demo with NO keys
- [ ] With keys (if provided): Sarvam/Flagsmith/NudgeBee paths verified, fallbacks still work when keys removed
- [ ] 3-min demo runs verbatim: invite → RSVP paste → batch → gift → kanban → WhatsApp approval → face-search
- [ ] README + SETUP.md + DEMO.md complete; PPT/video slots filled
- [ ] All phase sign-offs still green (regression)

---

## 8. Build order (one go, stop only on red)

0 → 1 → 2 → 3 → 4 → 5 → 6. Do not start next phase until current sign-off boxes ticked + `vitest` green + Chrome MCP viewports clean. If a phase fails, fix in place (no forward patching).

## 9. Risks + fallbacks

- Sarvam down/no key → rule parser + badge. Never block RSVP save.
- Flagsmith down/no key → local defaults. Admin toggle still works.
- NudgeBee down/no webhook → local approvals + event log. Demo continues.
- face-api slow → lazy + skeleton + gallery fallback.
- Music autoplay blocked → default OFF, user gesture ON.

---

*Next: build Phase 0 exactly per §7, then proceed sequentially. UI must stay top-tier every phase — no placeholder styling carried forward.*
