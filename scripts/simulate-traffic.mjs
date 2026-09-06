// Simulates realistic visitor traffic against ABC Tutoring and sends the
// events straight to PostHog, so the dashboard has data to show Dana without
// waiting for real visitors.
//
//   node scripts/simulate-traffic.mjs            # 300 visitors (default)
//   node scripts/simulate-traffic.mjs 800        # 800 visitors
//
// It reproduces the same funnel the live site fires:
//   $pageview → tutor_viewed → booking_started → booking_requested
// with realistic drop-off at each step, so conversion rates look real.
// (booking_requested is the conversion; Dana confirms requests herself.)

import { tutors } from '../src/data/tutors.js'

const POSTHOG_KEY = 'phc_APQPSLzYvvLaDsaqbPengmVpSyo4EPz7KMGmTZU3ycp9'
const POSTHOG_HOST = 'https://us.i.posthog.com'
const N = parseInt(process.argv[2] || '300', 10)

const rand = (a) => a[Math.floor(Math.random() * a.length)]
const chance = (p) => Math.random() < p

// Weight some tutors/subjects as more popular so the "most interest" chart
// is not flat. (Math tutors t1/t4 and science t3 draw the most interest.)
const popularity = { t1: 3, t4: 2.6, t3: 2.2, t6: 1.4, t2: 1.2, t5: 1 }
const weightedTutor = () => {
  const pool = tutors.flatMap((t) =>
    Array(Math.round((popularity[t.id] || 1) * 4)).fill(t),
  )
  return rand(pool)
}

const devices = ['Desktop', 'Mobile', 'Mobile', 'Tablet']
const referrers = [
  'https://google.com',
  'https://google.com',
  'https://facebook.com',
  'https://instagram.com',
  '$direct',
]

const batch = []
const now = Date.now()

function ev(distinct_id, event, properties, tsOffsetMs) {
  batch.push({
    event,
    distinct_id,
    timestamp: new Date(now - tsOffsetMs).toISOString(),
    properties: { ...properties, $lib: 'traffic-sim' },
  })
}

for (let i = 0; i < N; i++) {
  const id = `sim_visitor_${i}_${Math.random().toString(36).slice(2, 8)}`
  // Spread visits across the last 7 days.
  const base = Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)
  const device = rand(devices)
  const referrer = rand(referrers)
  const common = { $device_type: device, $referrer: referrer }

  ev(id, '$pageview', { ...common, $current_url: 'https://frangione-org.github.io/' }, base)

  // 65% browse a tutor
  if (!chance(0.65)) continue
  const t = weightedTutor()
  ev(id, 'tutor_viewed', { ...common, tutor: t.name, subject: t.subject, rate: t.rate }, base - 15000)

  // Some filter first
  if (chance(0.4)) ev(id, 'filter_used', { ...common, subject: t.subject }, base - 20000)

  // 45% of viewers start a booking
  if (!chance(0.45)) continue
  const slot = rand(t.slots)
  ev(id, 'booking_started', { ...common, tutor: t.name, subject: t.subject, slot }, base - 30000)

  // 70% of starters submit the request → overall ~13% visitor→booking rate
  if (chance(0.7)) {
    const mode = chance(0.55) ? 'In person' : 'Online'
    ev(id, 'booking_requested', { ...common, tutor: t.name, subject: t.subject, slot, session_type: mode, rate: t.rate }, base - 45000)
  } else {
    ev(id, 'booking_abandoned', { ...common, tutor: t.name, subject: t.subject }, base - 45000)
  }
}

console.log(`Generated ${batch.length} events for ${N} visitors. Sending to PostHog…`)

// PostHog batch endpoint accepts up to a few thousand events per call.
const CHUNK = 500
let sent = 0
for (let i = 0; i < batch.length; i += CHUNK) {
  const chunk = batch.slice(i, i + CHUNK)
  const res = await fetch(`${POSTHOG_HOST}/batch/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: POSTHOG_KEY, batch: chunk }),
  })
  if (!res.ok) {
    console.error(`Batch failed: ${res.status} ${await res.text()}`)
    process.exit(1)
  }
  sent += chunk.length
  process.stdout.write(`  sent ${sent}/${batch.length}\r`)
}

console.log(`\n✅ Done. ${sent} events sent. Check PostHog → Activity in ~1 min.`)
