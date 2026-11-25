# Wedding Organize AI — Hackathon Problem Set (Base Document) — V2 Final

> **Festive theme:** Wedding planning / Gifting — build something that actually works.
> **Submission required:** repo + setup README + demo video / PPT product showcase before **5:00 PM**.
> **This file is the base.** README + demo product will be built later from this.
>
> **Structure rule for README/PPT:**
> 1. Part A = Problems ONLY (no solution talk)
> 2. Part B = Solution (what we are building)
> 3. Part C = Mandatory sponsor tools usage

---

## PART A — Problems ONLY (for README opening / PPT problem slides)

> Do NOT mention solutions here. Just the pain Indian families face.

### Problem 1: Unknown guest availability across multi-day, multi-event weddings

Indian weddings run over multiple days with different events — Haldi, Mehendi, Sangeet, Wedding/Pheras, Reception.
Different numbers of people are available for different events/days.

Today:
- Families invite via WhatsApp but track attendance in memory / Excel / calls.
- One family member replies for 4-5 people, plus-ones and kids are unclear.
- Responses are informal Hinglish / voice notes / via relatives.
- No one knows event-wise confirmed count in advance.
- Result: hosts cannot pre-calculate how much arrangement is needed — food, hall capacity, seating, return gifts all become guesswork.

### Problem 2: Guest arrival pickup chaos (train / bus / plane) with limited vehicles

Guests arrive in the city by train, bus, and plane, at different times, stations, terminals.

Indian tradition expects the host to receive them where they arrive and arrange pickup to the venue/stay.

Today:
- Arrival info is scattered in screenshots / texts / calls.
- Hosts have limited vehicles/drivers.
- Multiple guests landing at similar times are not batched.
- Guests arriving in the same window cannot find each other to coordinate at airport / bus stand / station.
- Result: duplicated trips, guests left waiting, drivers assigned inefficiently, no consolidated arrival schedule.

### Problem 3: Unwanted and duplicated gifts

Across multiple events, people bring different gifts on different days.

Today:
- Guests don't know what the couple already has / needs / what others are buying.
- Gifts are often unwanted or so duplicated they are of no use.
- No central list, no record of who gifted what.
- Result: wastage, awkward duplicates, couple gets 5 same appliances / envelopes with no memory of who gave what.

### Problem 4: No tracking for multi-event operations, vendors, people, and expenses

A wedding is 100s of tasks across food, transport, decor, vendors, rituals, with multiple family members / helpers involved.

Today:
- Tasks live in WhatsApp, spreadsheets, calls, memory.
- No custom tracker per category (food, transport, vendor, ritual).
- No clear owner, no status (to-do / doing / done), no way to ask for update like in Jira.
- No user roles — who is organizer vs viewer is unclear.
- Expenses are linked to tasks but not tracked — no estimated vs actual spend visible to admin on a dashboard.
- Result: forgotten tasks, missed deadlines, hidden dependencies, budget overruns, no single source of truth.

### Problem 5: Physical invitations are unscalable for 500-1000 guests

Indian weddings often involve pursuing each of 500-1000 guests with a physical invitation.

Today:
- Addresses unknown, people in other cities, logistics very difficult and costly.
- Generic printed card carries no personal event info (which events am I invited to? where? when?).
- Updates (timing / venue change) never reach everyone.
- No RSVP loop, no login, no roles, no tracking of who replied / who is pending / who replied on another medium.
- Result: hosts chase guests one by one, guests confused by forwards, no matrix of who confirmed what.

### Problem 6: Scattered wedding photos — can't find photos you are in

Across 5-6 days and multiple events, many people take many photos at different points in time.

Today:
- Photos stay on individual phones.
- Hosts must ask each person one by one to share photos from their phone.
- Out of 1000s of pooled photos, guests cannot figure out which photos they are present in.
- No login-linked identity, no face-linked search, media gets lost in WhatsApp.
- Result: memories fragmented, guests never get photos they appear in.

---

## PART B — Solution (what we are building: Wedding Organize AI)

> One platform, one Guest-to-Event Graph:
> `Guest → Family → Invited Functions → RSVP → Travel → Stay → Gifts → Tasks/Expenses → Photos`
> All modules read/write the same live DB.

### Solution 1: Event-wise RSVP Engine + Arrangement Forecaster

- Import guest list (CSV/Excel).
- Assign guests to Haldi / Mehendi / Sangeet / Wedding / Reception.
- Collect RSVP per event: Confirmed / Tentative / Declined / Pending + headcount + dietary (Veg / Jain).
- Parse messy Hinglish replies + allow admin to manually update if guest replied on another medium.
- Dashboard matrix: who confirmed which event, who is pending, who hasn't replied.
- Auto-calculate event-wise headcounts → arrangement forecast + capacity alerts.
- Invitations sent from dashboard via WhatsApp link; tracking of sent / replied / pending.

### Solution 2: Arrival Batching + Pickup Coordination Engine

- Collect travel info: mode (train/bus/plane), station/airport/terminal, date-time, party size.
- Group arrivals by location + 45-60 min time windows.
- Batch pickups based on limited vehicle capacity; generate pickup schedule.
- Show co-arriving guests to each other so they can meet at airport / station and share the sent cab/vehicle.
- Flag overlaps, waiting gaps, and vehicle shortages.
- Linked to guest record + stay assignment.

### Solution 3: Curated Group-Gifting Registry with Privacy Choice

- Couple/family curates a list of desired gifts (item, image, price, quantity needed).
- No force — guests browse and choose to:
  - buy fully, or
  - contribute partially (group contribution splitter).
- Prevents duplicates by reservation + contribution tracking.
- Privacy option per contribution: anonymous OR name highlighted.
- Central record of gifts received / pending.

### Solution 4: Wedding Kanban Command Center (Jira for Weddings) + Expense Dashboard

- Custom Kanban board: create trackers per category (food, transport, decor, vendor, ritual).
- Cards with owner, status slabs (To-Do / Doing / Done), deadline, priority, dependencies.
- Roles: Admin / Organizer / Viewer. Organizers update status, move cards, post updates.
- Ask-for-update nudge to concerned person.
- Each card has estimated expense → rolls up to admin dashboard: estimated net spend vs category-wise spend.
- Covers vendors + internal helpers in one board.

### Solution 5: Digital Wedding Home Page — Animated Invite + Login + RSVP + Roles + WhatsApp

- Beautiful, fully responsive (laptop / tablet / mobile) wedding home page:
  - World-class graphics, SVG, animations, customizable by admin (names, story, gallery, events, venues).
  - Background Indian wedding / sangeet music option.
- This page IS the invite — shareable link, no physical logistics.
- Built-in auth: guest creates account / logs in.
- Admin assigns roles after login: promote to Organizer / Admin.
- Guest RSVPs per event from the page → feeds Solution 1 matrix.
- Dashboard sends invites via WhatsApp, tracks replied / not-replied / updated-by-admin.

### Solution 6: Face-Search Photo Hub — "Find My Photos"

- Every onboarded guest uploads 3 face photos at onboarding (via their logged-in account).
- All guests upload event photos from their devices to shared event albums (logged-in upload).
- When a new user onboards (or updates face photos later for a scan), all existing uploaded photos are processed against that face embedding.
- Face matching finds all photos that person is present in → delivered directly to them as "My Photos".
- Privacy-first: only matched photos shared to that guest; admin controls albums per event.

---

## PART C — Mandatory Sponsor Tools (must use in platform)

Hackathon team mandates strict use of sponsor tools. Mapping:

### 1. Sarvam AI — Indian language AI

Use for:
- **Hinglish RSVP parsing (Solution 1):** translate / transliterate / language detection + entity extract from messages like `Papa aur mummy aayenge, main shayad nahi aa paunga` → per-member status.
  - APIs: Text Processing (Mayura / Sarvam-Translate), Language Detection.
- **Multilingual invites + guest briefs (Solution 5):** Hindi / Hinglish / English variants.
- **Voice notes RSVP (stretch):** Speech-to-Text Saaras for code-mixed speech → text → same parser.
- **Arrival PNR text (Solution 2):** Document Intelligence to extract date/time/station from pasted tickets.
- **Docs:** Developer Quickstart, `sarvamai` SDK (Python/JS), Token Factory OpenAI-compatible LLMs.

### 2. Flagsmith — Feature flags + experimentation

Use for:
- Gate risky demo features: `rsvp-ai-parse`, `group-gifting`, `pickup-batcher`, `music-autoplay`, `whatsapp-send`, `face-search`.
- Kill-switch if AI parser / face match fails live → fallback to manual RSVP / gallery view.
- A/B test invite variants (traditional vs modern) via Experimentation docs.
- Role-based flag rollout: admin vs organizer vs guest.
- Self-host option noted; cloud for hackathon speed.

### 3. NudgeBee — Workflows, approvals, ops automation

Use for:
- **Workflow Builder canvas:** RSVP → headcount → catering alert workflow; arrival → pickup batch workflow.
- **Approvals:** human approval before big actions (e.g. confirm bulk WhatsApp send, approve high-value expense, approve gift purchase).
- **HTTP requests:** call our APIs from workflows.
- **Event tasks:** store pickup delays / vendor misses / photo-processing jobs for triage + AI analysis.
- **Notifications:** Discord channel alerts for task overdue / vehicle clash.
- **Try locally:** kind cluster for demo; agent install steps for EKS/GKE/AKS if asked.

Feature → tool matrix:

| Solution | Sarvam AI | Flagsmith | NudgeBee |
| -------- | --------- | --------- | -------- |
| 1 RSVP engine | Hinglish parse, translation | Flag `rsvp-ai-parse`, fallback | Approval for bulk WhatsApp, event triage |
| 2 Arrival batching | PNR extract | Flag `pickup-batcher` | Workflow + Discord alerts, pickup sync |
| 3 Gifting | Gift description translation | Flag `group-gifting` | Approval for high-value gift, event log |
| 4 Kanban + expenses | — | Flag `expense-dashboard` | CI/CD/status, overdue triage, approvals |
| 5 Digital invite | Multilingual invite, TTS Bulbul (stretch) | A/B test invite, `music-autoplay` | Deploy/rollback workflow |
| 6 Photo hub | — (face embedding model, own pipeline) | Flag `face-search` | Processing job events, triage |

---

## Appendix 1: MVP Demo Flow (3-min, end-to-end, one DB)

1. Open digital invite home page (Solution 5) → show animation + music + mobile responsive.
2. Guest logs in → RSVPs to Sangeet yes / Wedding no → matrix updates (Solution 1).
3. Paste 3 Hinglish WhatsApp replies → Sarvam parse → headcounts update, capacity warning fires.
4. Paste 5 arrivals (train/bus/plane) → auto-batch into 2 pickups (Solution 2).
5. Open gift registry → contribute partially anonymously to one gift (Solution 3).
6. Open Kanban → move Food card to Doing, add ₹50k estimate → admin dashboard total updates (Solution 4, Flagsmith flag on).
7. Send WhatsApp invite from dashboard → NudgeBee approval → marked sent.
8. Photo hub: new guest uploads 3 face photos → re-scan gallery → "My Photos" appears (Solution 6).

All reads/writes same Guest-to-Event Graph. No mocks.

## Appendix 2: Prior 15-problem catalog (archived from V1)

Kept for traceability. Final scope is the 6 problems above.

| # | Old problem | Maps to V2 |
| - | ----------- | ---------- |
| 1 | Event-wise guest list fragmentation | P1 |
| 2 | RSVP tracking | P1 |
| 3 | Arrival/departure coordination | P2 |
| 4 | Hotel allocation | P2 stretch (room solver if time) |
| 5 | Event task management | P4 |
| 6 | Vendor coordination | P4 |
| 7 | Budget tracking | P4 |
| 8 | Guest communication fragmentation | P5 + P1 |
| 9 | Multilingual invitations | P5 |
| 10 | Catering estimation | P1 forecast stretch |
| 11 | Seating | Stretch, out of MVP |
| 12 | Duplicate gifts | P3 |
| 13 | Personalized gifting | P3 |
| 14 | Wedding-day incidents | P4 stretch |
| 15 | Media collection | P6 (face-search photo hub) |

Reference repos in `existing-GitHub-repo/` to reuse invite templates, RSVP forms, Kanban patterns.

---

*Next artifacts (later): setup README (problem → solution → demo), PPT/video script, PRD with schema/APIs/screens/12h plan.*
