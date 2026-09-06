import posthog from 'posthog-js'

// --- PostHog configuration -------------------------------------------------
// The project API key is a PUBLIC, client-side key — it is meant to ship in
// the browser. Region: US cloud. Swap host to https://eu.i.posthog.com for EU.
export const POSTHOG_KEY = 'phc_APQPSLzYvvLaDsaqbPengmVpSyo4EPz7KMGmTZU3ycp9'
export const POSTHOG_HOST = 'https://us.i.posthog.com'

let started = false

export function initAnalytics() {
  if (started) return
  started = true
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true, // fires $pageview automatically (traffic volume)
    capture_pageleave: true,
    autocapture: true, // rich click/input data out of the box
    person_profiles: 'always',
  })
}

// --- Named events = the funnel Dana asked about ----------------------------
// Home → tutor viewed → booking started → booking REQUESTED (the conversion).
// Dana confirms requests herself in the admin view; that isn't a visitor step.
export const track = (event, props = {}) => posthog.capture(event, props)

export const events = {
  tutorViewed: (t) =>
    track('tutor_viewed', { tutor: t.name, subject: t.subject, rate: t.rate }),
  filterUsed: (subject) => track('filter_used', { subject }),
  bookingStarted: (t, slot) =>
    track('booking_started', { tutor: t.name, subject: t.subject, slot }),
  // The conversion event: a parent submitted a booking request.
  bookingRequested: (t, slot, mode) =>
    track('booking_requested', {
      tutor: t.name,
      subject: t.subject,
      slot,
      session_type: mode,
      rate: t.rate,
    }),
  bookingAbandoned: (t) =>
    track('booking_abandoned', { tutor: t.name, subject: t.subject }),
  // Owner action (for Dana's own records), not part of the visitor funnel.
  bookingConfirmed: (t, slot) =>
    track('booking_confirmed', { tutor: t.name, subject: t.subject, slot }),
}

export default posthog
