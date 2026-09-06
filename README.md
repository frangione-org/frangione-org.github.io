# ABC Tutoring — Prototype

A prototype tutoring website for **Dana / ABC Tutoring**, built with React + Vite
and instrumented with **PostHog** analytics. Visitors browse tutors, filter by
subject, and book a time slot; booked slots update instantly and persist in the
browser (GitHub Pages is static, so bookings use `localStorage`).

**Live site:** https://frangione-org.github.io/

## What PostHog tracks

The site fires a clear funnel so Dana can see how visitors move toward a booking:

| Event | When it fires |
| --- | --- |
| `$pageview` | Someone lands on the site (automatic) |
| `filter_used` | A visitor filters tutors by subject |
| `tutor_viewed` | A visitor opens a tutor to book |
| `booking_started` | A visitor picks a time slot |
| `booking_completed` | A booking is confirmed |
| `booking_abandoned` | A visitor opens booking but leaves |

Key questions this answers: **booking conversion rate**, **which tutors/subjects
draw the most interest**, and **where visitors drop off**.

## Develop

```bash
npm install
npm run dev        # local dev server
npm run build      # production build → dist/
```

## Simulate traffic (to populate the dashboard)

```bash
npm run simulate         # 300 visitors
node scripts/simulate-traffic.mjs 800
```

## Deploy

Pushing to `master`/`main` triggers `.github/workflows/deploy.yml`, which builds
and publishes to GitHub Pages. In the repo: **Settings → Pages → Source = GitHub
Actions**.

## Customizing for Dana

Edit `src/data/tutors.js` with real tutors, subjects, rates, and time slots.
Colors/brand live in `src/styles.css` (`:root` variables).
