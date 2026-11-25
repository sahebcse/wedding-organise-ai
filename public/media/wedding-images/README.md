# wedding-images/ — face-match demo set (served statically, seeded into gallery via `npm run db:seed-gallery`)

- `1.jpg` … `7.jpg` — wedding event photos
- `saheb1.JPG` … `saheb5.JPG` — the demo guest's own photos (face profile source)

Demo flow: guest uploads 1–3 of their own photos (1 is fine) → on-device
face-api.js builds a profile → “Find my photos” scans all 12 and matches
the ones they appear in. Nothing leaves the browser except the final match list.
