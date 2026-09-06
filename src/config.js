// ---------------------------------------------------------------------------
// ABC Tutoring — settings Dana can change without touching the rest of the code
// ---------------------------------------------------------------------------

// EMAIL NOTIFICATIONS on each new booking request.
// GitHub Pages is static (no server), so we use Formspree — a free form-to-email
// service. To turn it on:
//   1. Go to https://formspree.io, sign up with Dana's email, create a form.
//   2. Copy the form's endpoint (looks like https://formspree.io/f/abcdwxyz).
//   3. Paste it below.
// If left blank, requests are still saved to the admin list — just no email.
export const FORMSPREE_ENDPOINT = '' // e.g. 'https://formspree.io/f/xxxxxxx'

// TUTOR SCHEDULES.
// Until Dana collects each tutor's real availability, EVERY future day is open
// (up to 3 months out) using the default daily times below.
export const DEFAULT_DAILY_TIMES = ['3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM']

// ADMIN PASSWORD: there is NO shipped default. The first time the Owner area is
// opened, Dana creates her own password (stored in the browser). She can change
// it later under Owner → Settings.
// NOTE: this is a lightweight, client-side gate suitable for a prototype — it
// hides the admin area from casual visitors but is NOT real security. A true
// private login requires a backend (a later step beyond this static prototype).
