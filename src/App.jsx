import { useEffect, useMemo, useState } from 'react'
import { tutors as DEFAULT_TUTORS } from './data/tutors.js'
import { events } from './analytics.js'
import { FORMSPREE_ENDPOINT, DEFAULT_DAILY_TIMES } from './config.js'

const REQ_KEY = 'abc_tutoring_requests'
const TUTORS_KEY = 'abc_tutoring_tutors'
const SETTINGS_KEY = 'abc_tutoring_settings'

// ---- persistence -----------------------------------------------------------
function load(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v == null ? fallback : v
  } catch {
    return fallback
  }
}
function save(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* private mode — ignore */
  }
}

const SUBJECT_OPTIONS = ['Math', 'Science', 'Reading']
const SUBJECT_FILTERS = ['All', ...SUBJECT_OPTIONS]
const EDIT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const EDIT_TIMES = [
  '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM',
  '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM',
]

// Emails Dana for each new request. Preferred path: the notification email she
// sets in admin Settings, sent via FormSubmit (no signup — first email to a new
// address needs a one-time confirmation click). Falls back to a Formspree
// endpoint in config.js if no email is set. Static-site friendly: no server.
function emailDana(tutor, label, form, notifyEmail) {
  let url = null
  if (notifyEmail) {
    url = `https://formsubmit.co/ajax/${encodeURIComponent(notifyEmail)}`
  } else if (FORMSPREE_ENDPOINT) {
    url = FORMSPREE_ENDPOINT
  }
  if (!url) return
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      _subject: `New booking request: ${tutor.name} — ${label}`,
      tutor: tutor.name,
      subject: tutor.subject,
      slot: label,
      session_type: form.mode,
      parent: form.parent,
      email: form.email,
      student_grade: form.grade,
      note: form.note,
    }),
  }).catch(() => {})
}

export default function App() {
  const [view, setView] = useState('home') // 'home' | 'browse' | 'admin'
  const [filter, setFilter] = useState('All')
  const [active, setActive] = useState(null) // tutor being booked
  const [tutors, setTutors] = useState(() => load(TUTORS_KEY, DEFAULT_TUTORS))
  const [requests, setRequests] = useState(() => load(REQ_KEY, []))
  const [settings, setSettings] = useState(() =>
    load(SETTINGS_KEY, { notifyEmail: '', adminPassword: '' }),
  )

  useEffect(() => save(TUTORS_KEY, tutors), [tutors])
  useEffect(() => save(REQ_KEY, requests), [requests])
  useEffect(() => save(SETTINGS_KEY, settings), [settings])

  const tutorById = (id) => tutors.find((t) => t.id === id)

  // A CONFIRMED request removes that specific DATE+TIME from availability.
  const confirmedByTutor = useMemo(() => {
    const map = {}
    for (const r of requests) {
      if (r.status === 'confirmed' && r.date && r.time) {
        ;(map[r.tutorId] ||= new Set()).add(`${r.date}|${r.time}`)
      }
    }
    return map
  }, [requests])

  const visibleTutors =
    filter === 'All' ? tutors : tutors.filter((t) => t.subject === filter)
  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const confirmedCount = requests.filter((r) => r.status === 'confirmed').length

  function navigate(v) {
    setActive(null)
    setView(v)
  }
  function onFilter(subject) {
    setFilter(subject)
    if (subject !== 'All') events.filterUsed(subject)
  }
  function openTutor(t) {
    events.tutorViewed(t)
    setActive(t)
    window.scrollTo(0, 0)
  }

  function submitRequest(tutor, sel, form) {
    const req = {
      id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tutorId: tutor.id,
      date: sel.dateISO,
      time: sel.time,
      slot: sel.label,
      weekdaySlot: sel.weekdaySlot,
      ...form,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    setRequests((prev) => [req, ...prev])
    events.bookingRequested(tutor, sel.weekdaySlot, form.mode)
    emailDana(tutor, sel.label, form, settings.notifyEmail)
  }
  function setStatus(id, status) {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    if (status === 'confirmed') {
      const r = requests.find((x) => x.id === id)
      const t = r && tutorById(r.tutorId)
      if (t) events.bookingConfirmed(t, r.weekdaySlot || r.slot)
    }
  }

  // ---- tutor management ----
  function addTutor() {
    const id = `t_${Date.now()}`
    setTutors((prev) => [
      ...prev,
      {
        id,
        name: 'New tutor',
        subject: 'Math',
        focus: '',
        grades: '',
        rate: 45,
        rating: 5.0,
        bio: '',
        emoji: '📚',
        slots: [],
      },
    ])
    return id
  }
  function updateTutor(id, patch) {
    setTutors((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }
  function deleteTutor(id) {
    setTutors((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="page">
      <TopBar
        view={active ? 'browse' : view}
        setView={navigate}
        pendingCount={pendingCount}
      />

      {active ? (
        <BookingPage
          tutor={active}
          confirmed={confirmedByTutor[active.id]}
          onBack={() => setActive(null)}
          onSubmit={(sel, form) => submitRequest(active, sel, form)}
        />
      ) : view === 'home' ? (
        <HomeView
          tutorCount={tutors.length}
          onBrowse={() => navigate('browse')}
        />
      ) : view === 'browse' ? (
        <BrowseView
          tutors={visibleTutors}
          filter={filter}
          onFilter={onFilter}
          onBook={openTutor}
          confirmedCount={confirmedCount}
        />
      ) : (
        <AdminGate
          password={settings.adminPassword}
          onSetPassword={(pw) =>
            setSettings((s) => ({ ...s, adminPassword: pw }))
          }
        >
          <AdminView
            requests={requests}
            tutorById={tutorById}
            setStatus={setStatus}
            tutors={tutors}
            onAddTutor={addTutor}
            onUpdateTutor={updateTutor}
            onDeleteTutor={deleteTutor}
            settings={settings}
            onUpdateSettings={setSettings}
          />
        </AdminGate>
      )}

      <footer className="footer">
        <p>ABC Tutoring · Analytics powered by PostHog · Prototype for Dana</p>
      </footer>
    </div>
  )
}

function TopBar({ view, setView, pendingCount }) {
  return (
    <div className="topbar">
      <div className="topbar-inner">
        <button className="brand" onClick={() => setView('home')}>
          <span className="brand-mark">📚</span>
          <span className="brand-name">ABC Tutoring</span>
        </button>
        <div className="role-switch">
          <button
            className={`role ${view === 'home' ? 'role--active' : ''}`}
            onClick={() => setView('home')}
          >
            Home
          </button>
          <button
            className={`role ${view === 'browse' ? 'role--active' : ''}`}
            onClick={() => setView('browse')}
          >
            Book a tutor
          </button>
          <button
            className={`role ${view === 'admin' ? 'role--active' : ''}`}
            onClick={() => setView('admin')}
          >
            Owner
            {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
          </button>
        </div>
      </div>
    </div>
  )
}

function HomeView({ tutorCount, onBrowse }) {
  return (
    <>
      <header className="hero">
        <div className="hero-copy">
          <h1>Tutoring that meets your child where they are.</h1>
          <p>
            ABC Tutoring pairs students with friendly, vetted tutors in math,
            science, and reading — from elementary through high school. Browse
            our tutors, pick a time that works, and we&rsquo;ll confirm your
            session.
          </p>
          <div className="hero-cta">
            <button className="btn btn--hero" onClick={onBrowse}>
              Book a tutor →
            </button>
            <span className="hero-note">
              {tutorCount} tutors · in-person &amp; online
            </span>
          </div>
        </div>
      </header>

      <main className="container home">
        <section className="home-section">
          <h2>What we offer</h2>
          <div className="home-cards">
            <div className="home-card">
              <span className="home-emoji">📐</span>
              <h3>Math</h3>
              <p>
                Elementary math through Algebra II — building confidence step by
                step, with a specialty in the tricky middle-school years.
              </p>
            </div>
            <div className="home-card">
              <span className="home-emoji">🔬</span>
              <h3>Science</h3>
              <p>
                Elementary and middle-school science made clear with hands-on,
                real-world examples students actually remember.
              </p>
            </div>
            <div className="home-card">
              <span className="home-emoji">📖</span>
              <h3>Reading</h3>
              <p>
                Early literacy, reading comprehension, and writing support to
                help young readers grow into strong, confident ones.
              </p>
            </div>
          </div>
        </section>

        <section className="home-section">
          <h2>How it works</h2>
          <div className="home-steps">
            <div className="home-step">
              <span className="step-num">1</span>
              <div>
                <strong>Browse our tutors</strong>
                <p>See each tutor&rsquo;s subjects, grades, rate, and rating.</p>
              </div>
            </div>
            <div className="home-step">
              <span className="step-num">2</span>
              <div>
                <strong>Pick a time</strong>
                <p>
                  Choose an open date and time on the tutor&rsquo;s calendar —
                  in person or online.
                </p>
              </div>
            </div>
            <div className="home-step">
              <span className="step-num">3</span>
              <div>
                <strong>We confirm</strong>
                <p>
                  Dana reviews your request and confirms by email. That&rsquo;s
                  it!
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="home-banner">
          <div>
            <h2>Ready to get started?</h2>
            <p>Find the right tutor and book a session in a couple of minutes.</p>
          </div>
          <button className="btn btn--hero" onClick={onBrowse}>
            Book a tutor →
          </button>
        </section>
      </main>
    </>
  )
}

const hasSchedule = (t) => Array.isArray(t.slots) && t.slots.length > 0
const availableWeekdays = (t) => {
  const seen = new Set()
  for (const s of t.slots) seen.add(s.slice(0, s.indexOf(' ')))
  return EDIT_DAYS.filter((d) => seen.has(d))
}

function BrowseView({ tutors, filter, onFilter, onBook, confirmedCount }) {
  return (
    <>
      <header className="hero hero--slim">
        <div className="hero-copy">
          <h1>Book a tutor</h1>
          <p>
            Choose a tutor below, pick an open time, and we&rsquo;ll confirm
            your session.
          </p>
          <div className="hero-stats">
            <span>
              <strong>{tutors.length}</strong> tutors
            </span>
            <span>
              <strong>{confirmedCount}</strong> sessions confirmed
            </span>
          </div>
        </div>
      </header>

      <main className="container">
        <div className="filters" aria-label="Filter by subject">
          {SUBJECT_FILTERS.map((s) => (
            <button
              key={s}
              className={`chip ${filter === s ? 'chip--active' : ''}`}
              onClick={() => onFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {tutors.length === 0 ? (
          <p className="empty">No tutors in this subject yet.</p>
        ) : (
          <section className="grid">
            {tutors.map((t) => (
              <article key={t.id} className="card">
                <div className="card-top">
                  <span className="avatar">{t.emoji}</span>
                  <div>
                    <h3>{t.name}</h3>
                    <p className="muted">
                      {t.focus}
                      {t.focus && t.grades ? ' · ' : ''}
                      {t.grades}
                    </p>
                  </div>
                  <span className="rating">★ {t.rating}</span>
                </div>
                <p className="bio">{t.bio}</p>
                <div className="card-foot">
                  <span className="rate">${t.rate}/hr</span>
                  <span className="avail">
                    {hasSchedule(t)
                      ? availableWeekdays(t).join(' · ')
                      : 'All days open'}
                  </span>
                  <button className="btn" onClick={() => onBook(t)}>
                    Book
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </>
  )
}

// ---- Calendar helpers -------------------------------------------------------
const WEEKDAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOW_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December',
]
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct',
  'Nov', 'Dec',
]
const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function BookingPage({ tutor, confirmed, onBack, onSubmit }) {
  const today = useMemo(startOfToday, [])
  const [month, setMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [selectedDate, setSelectedDate] = useState(null)
  const [sel, setSel] = useState(null)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
    parent: '',
    email: '',
    grade: '',
    note: '',
    mode: 'In person',
  })

  const weekdayMap = useMemo(() => {
    const m = {}
    for (const s of tutor.slots || []) {
      const i = s.indexOf(' ')
      ;(m[s.slice(0, i)] ||= []).push(s.slice(i + 1))
    }
    return m
  }, [tutor])

  const timesFor = (date) => {
    if (!date || date < today) return []
    const abbr = WEEKDAY_ABBR[date.getDay()]
    const iso = toISO(date)
    // No schedule set yet → every future day offers the default times.
    const base = hasSchedule(tutor) ? weekdayMap[abbr] || [] : DEFAULT_DAILY_TIMES
    return base.filter((t) => !confirmed?.has(`${iso}|${t}`))
  }

  const year = month.getFullYear()
  const mi = month.getMonth()
  const firstDow = new Date(year, mi, 1).getDay()
  const daysInMonth = new Date(year, mi + 1, 0).getDate()
  const cells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, mi, i + 1)),
  ]
  const monthsAhead =
    (year - today.getFullYear()) * 12 + (mi - today.getMonth())
  const canGoPrev = monthsAhead > 0
  const canGoNext = monthsAhead < 3

  function pickTime(date, time) {
    const abbr = WEEKDAY_ABBR[date.getDay()]
    const label = `${abbr}, ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()} · ${time}`
    const chosen = {
      dateISO: toISO(date),
      time,
      weekdaySlot: `${abbr} ${time}`,
      label,
    }
    setSel(chosen)
    events.bookingStarted(tutor, chosen.weekdaySlot)
    setTimeout(() => {
      document.getElementById('booking-details')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 50)
  }
  function submit(e) {
    e.preventDefault()
    onSubmit(sel, form)
    setDone(true)
    window.scrollTo(0, 0)
  }
  const canSubmit = sel && form.parent.trim() && form.email.trim()

  if (done) {
    return (
      <main className="container book">
        <div className="done-page">
          <div className="done-check">✓</div>
          <h1>Request sent!</h1>
          <p>
            Thanks! Your request for <strong>{sel.label}</strong> ({form.mode})
            with {tutor.name} has been sent. <strong>Dana will confirm</strong>{' '}
            with you shortly — the time stays open until it&rsquo;s confirmed.
          </p>
          <button className="btn" onClick={onBack}>
            Back to tutors
          </button>
        </div>
      </main>
    )
  }

  const selectedTimes = timesFor(selectedDate)

  return (
    <main className="container book">
      <button className="back" onClick={onBack}>
        ← All tutors
      </button>

      <div className="book-head">
        <span className="avatar avatar--lg">{tutor.emoji}</span>
        <div>
          <h1>{tutor.name}</h1>
          <p className="muted">
            {tutor.focus}
            {tutor.focus && tutor.grades ? ' · ' : ''}
            {tutor.grades}
          </p>
          <p className="book-bio">{tutor.bio}</p>
        </div>
        <div className="book-price">
          <span className="rate">${tutor.rate}</span>
          <span className="muted">/hour</span>
          <span className="rating">★ {tutor.rating}</span>
        </div>
      </div>

      <section className="cal-section">
        <h2>Pick a date</h2>
        <div className="cal-wrap">
          <div className="cal-month">
            <div className="cal-nav">
              <button
                className="cal-arrow"
                onClick={() => {
                  setMonth(new Date(year, mi - 1, 1))
                  setSelectedDate(null)
                  setSel(null)
                }}
                disabled={!canGoPrev}
                aria-label="Previous month"
              >
                ‹
              </button>
              <span className="cal-month-name">
                {MONTHS[mi]} {year}
              </span>
              <button
                className="cal-arrow"
                onClick={() => {
                  setMonth(new Date(year, mi + 1, 1))
                  setSelectedDate(null)
                  setSel(null)
                }}
                disabled={!canGoNext}
                aria-label="Next month"
              >
                ›
              </button>
            </div>
            <div className="cal-grid cal-dow-row">
              {DOW_HEADERS.map((d) => (
                <span key={d} className="cal-dow-cell">
                  {d}
                </span>
              ))}
            </div>
            <div className="cal-grid">
              {cells.map((date, i) => {
                if (!date) return <span key={`b${i}`} className="cal-cell" />
                const has = timesFor(date).length > 0
                const isSel =
                  selectedDate && toISO(selectedDate) === toISO(date)
                const isToday = toISO(date) === toISO(today)
                return (
                  <button
                    key={toISO(date)}
                    className={`cal-cell cal-date ${has ? 'cal-date--open' : ''} ${
                      isSel ? 'cal-date--sel' : ''
                    } ${isToday ? 'cal-date--today' : ''}`}
                    disabled={!has}
                    onClick={() => {
                      setSelectedDate(date)
                      setSel(null)
                    }}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
            <p className="cal-legend">
              <span className="dot dot--open" /> available
            </p>
          </div>

          <div className="cal-times-panel">
            {!selectedDate ? (
              <p className="cal-hint">Select a highlighted date to see times.</p>
            ) : selectedTimes.length === 0 ? (
              <p className="cal-hint">No times open on this date.</p>
            ) : (
              <>
                <p className="cal-times-head">
                  {WEEKDAY_ABBR[selectedDate.getDay()]},{' '}
                  {MONTHS_SHORT[selectedDate.getMonth()]}{' '}
                  {selectedDate.getDate()}
                </p>
                <div className="cal-times-list">
                  {selectedTimes.map((t) => (
                    <button
                      key={t}
                      className={`cal-slot ${
                        sel?.time === t &&
                        sel?.dateISO === toISO(selectedDate)
                          ? 'cal-slot--active'
                          : ''
                      }`}
                      onClick={() => pickTime(selectedDate, t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {sel && (
        <section className="cal-section" id="booking-details">
          <h2>Your details</h2>
          <form className="book-form" onSubmit={submit}>
            <p className="selected-banner">
              Requesting <strong>{sel.label}</strong> with {tutor.name}
            </p>
            <div className="field">
              Session type
              <div className="seg">
                {['In person', 'Online'].map((m) => (
                  <button
                    type="button"
                    key={m}
                    className={`seg-btn ${form.mode === m ? 'seg-btn--active' : ''}`}
                    onClick={() => setForm({ ...form, mode: m })}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="field-row">
              <label className="field">
                Parent / guardian name
                <input
                  value={form.parent}
                  onChange={(e) => setForm({ ...form, parent: e.target.value })}
                  required
                />
              </label>
              <label className="field">
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </label>
            </div>
            <label className="field">
              Student&rsquo;s grade
              <input
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                placeholder="e.g. 6th grade"
              />
            </label>
            <label className="field">
              Anything the tutor should know? (optional)
              <textarea
                rows={2}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </label>
            <button className="btn btn--full" disabled={!canSubmit}>
              Request this session
            </button>
          </form>
        </section>
      )}
    </main>
  )
}

function AdminGate({ password, onSetPassword, children }) {
  const [ok, setOk] = useState(() => {
    try {
      return sessionStorage.getItem('abc_admin_ok') === '1'
    } catch {
      return false
    }
  })
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  if (ok) return children

  const unlock = () => {
    try {
      sessionStorage.setItem('abc_admin_ok', '1')
    } catch {
      /* ignore */
    }
    setOk(true)
  }

  // First run: no password set yet → Dana creates her own.
  if (!password) {
    const createSubmit = (e) => {
      e.preventDefault()
      if (pass.length < 4) {
        setError('Choose a password of at least 4 characters.')
        return
      }
      if (pass !== confirm) {
        setError('Passwords don’t match.')
        return
      }
      onSetPassword(pass)
      unlock()
    }
    return (
      <main className="container">
        <form className="gate" onSubmit={createSubmit}>
          <span className="gate-lock">🔐</span>
          <h2>Set your admin password</h2>
          <p className="muted">
            This is your first time here — create a password to protect the
            Owner area. You can change it later in Settings.
          </p>
          <input
            type="password"
            value={pass}
            onChange={(e) => {
              setPass(e.target.value)
              setError('')
            }}
            placeholder="New password"
            autoFocus
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value)
              setError('')
            }}
            placeholder="Confirm password"
          />
          {error && <p className="gate-error">{error}</p>}
          <button className="btn btn--full">Create password</button>
        </form>
      </main>
    )
  }

  // Returning: password exists → sign in.
  const signInSubmit = (e) => {
    e.preventDefault()
    if (pass === password) unlock()
    else setError('Incorrect password.')
  }
  return (
    <main className="container">
      <form className="gate" onSubmit={signInSubmit}>
        <span className="gate-lock">🔒</span>
        <h2>Owner sign in</h2>
        <p className="muted">Enter your admin password to manage bookings.</p>
        <input
          type="password"
          value={pass}
          onChange={(e) => {
            setPass(e.target.value)
            setError('')
          }}
          placeholder="Password"
          autoFocus
        />
        {error && <p className="gate-error">{error}</p>}
        <button className="btn btn--full">Sign in</button>
      </form>
    </main>
  )
}

function AdminView({
  requests,
  tutorById,
  setStatus,
  tutors,
  onAddTutor,
  onUpdateTutor,
  onDeleteTutor,
  settings,
  onUpdateSettings,
}) {
  const [section, setSection] = useState('requests')
  const pending = requests.filter((r) => r.status === 'pending').length

  return (
    <main className="container admin">
      <div className="admin-head">
        <h1>Owner dashboard</h1>
      </div>
      <div className="admin-sections">
        <button
          className={`seg-btn ${section === 'requests' ? 'seg-btn--active' : ''}`}
          onClick={() => setSection('requests')}
        >
          Booking requests{pending ? ` (${pending})` : ''}
        </button>
        <button
          className={`seg-btn ${section === 'tutors' ? 'seg-btn--active' : ''}`}
          onClick={() => setSection('tutors')}
        >
          Manage tutors
        </button>
        <button
          className={`seg-btn ${section === 'settings' ? 'seg-btn--active' : ''}`}
          onClick={() => setSection('settings')}
        >
          Settings
        </button>
      </div>

      {section === 'requests' ? (
        <RequestsPanel
          requests={requests}
          tutorById={tutorById}
          setStatus={setStatus}
        />
      ) : section === 'tutors' ? (
        <TutorManager
          tutors={tutors}
          onAdd={onAddTutor}
          onUpdate={onUpdateTutor}
          onDelete={onDeleteTutor}
        />
      ) : (
        <SettingsPanel settings={settings} onUpdate={onUpdateSettings} />
      )}
    </main>
  )
}

function SettingsPanel({ settings, onUpdate }) {
  const [email, setEmail] = useState(settings.notifyEmail || '')
  const [savedEmail, setSavedEmail] = useState(false)
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  function saveEmail(e) {
    e.preventDefault()
    onUpdate({ ...settings, notifyEmail: email.trim() })
    setSavedEmail(true)
    setTimeout(() => setSavedEmail(false), 2500)
  }
  function savePassword(e) {
    e.preventDefault()
    if (newPass.length < 4) {
      setPwMsg('Choose a password of at least 4 characters.')
      return
    }
    if (newPass !== confirmPass) {
      setPwMsg('Passwords don’t match.')
      return
    }
    onUpdate({ ...settings, adminPassword: newPass })
    setNewPass('')
    setConfirmPass('')
    setPwMsg('✓ Password updated')
    setTimeout(() => setPwMsg(''), 2500)
  }

  return (
    <div className="settings-stack">
      <form className="settings-panel" onSubmit={saveEmail}>
        <h2>Notification email</h2>
        <p className="muted">
          Where should new booking requests be emailed? Enter your email and
          we&rsquo;ll send you each request as it comes in.
        </p>
        <label className="field">
          Your email
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setSavedEmail(false)
            }}
            placeholder="you@example.com"
          />
        </label>
        <div className="settings-actions">
          <button className="btn">Save</button>
          {savedEmail && <span className="settings-saved">✓ Saved</span>}
        </div>
        <p className="settings-hint">
          <strong>One-time setup:</strong> the first booking after you set a new
          email sends a confirmation from FormSubmit — click the link in it once
          to activate delivery. After that, every request arrives automatically.
          Until an email is set, requests still appear under{' '}
          <em>Booking requests</em>.
        </p>
      </form>

      <form className="settings-panel" onSubmit={savePassword}>
        <h2>Admin password</h2>
        <p className="muted">Change the password used to open the Owner area.</p>
        <label className="field">
          New password
          <input
            type="password"
            value={newPass}
            onChange={(e) => {
              setNewPass(e.target.value)
              setPwMsg('')
            }}
            placeholder="New password"
          />
        </label>
        <label className="field">
          Confirm new password
          <input
            type="password"
            value={confirmPass}
            onChange={(e) => {
              setConfirmPass(e.target.value)
              setPwMsg('')
            }}
            placeholder="Confirm password"
          />
        </label>
        <div className="settings-actions">
          <button className="btn">Update password</button>
          {pwMsg && (
            <span
              className={
                pwMsg.startsWith('✓') ? 'settings-saved' : 'gate-error'
              }
            >
              {pwMsg}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

function RequestsPanel({ requests, tutorById, setStatus }) {
  const [tab, setTab] = useState('pending')
  const groups = {
    pending: requests.filter((r) => r.status === 'pending'),
    confirmed: requests.filter((r) => r.status === 'confirmed'),
    declined: requests.filter((r) => r.status === 'declined'),
  }
  const list = groups[tab]

  return (
    <>
      <p className="muted section-note">
        Confirm a request to remove that time from availability. Declining
        leaves the time open.
      </p>
      <div className="admin-tabs">
        {['pending', 'confirmed', 'declined'].map((k) => (
          <button
            key={k}
            className={`chip ${tab === k ? 'chip--active' : ''}`}
            onClick={() => setTab(k)}
          >
            {k[0].toUpperCase() + k.slice(1)} ({groups[k].length})
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="empty">No {tab} requests.</p>
      ) : (
        <div className="req-list">
          {list.map((r) => {
            const t = tutorById(r.tutorId)
            return (
              <div key={r.id} className="req">
                <div className="req-main">
                  <span className="avatar">{t?.emoji || '❓'}</span>
                  <div>
                    <strong>{r.slot}</strong> · {t?.name || '(deleted tutor)'}
                    {r.mode && <span className="tag-mode">{r.mode}</span>}
                    <p className="muted">
                      {r.parent} · {r.email}
                      {r.grade ? ` · ${r.grade}` : ''}
                    </p>
                    {r.note && <p className="req-note">“{r.note}”</p>}
                  </div>
                </div>
                {r.status === 'pending' ? (
                  <div className="req-actions">
                    <button
                      className="btn btn--sm"
                      onClick={() => setStatus(r.id, 'confirmed')}
                    >
                      Confirm
                    </button>
                    <button
                      className="btn btn--sm btn--ghost"
                      onClick={() => setStatus(r.id, 'declined')}
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <span className={`pill pill--${r.status}`}>{r.status}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function TutorManager({ tutors, onAdd, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null)

  return (
    <>
      <div className="tm-head">
        <p className="muted section-note">
          Edit tutor details and set each tutor&rsquo;s weekly availability.
          Leave availability empty to keep every day open.
        </p>
        <button
          className="btn btn--sm"
          onClick={() => setEditingId(onAdd())}
        >
          + Add tutor
        </button>
      </div>

      <div className="tm-list">
        {tutors.map((t) =>
          editingId === t.id ? (
            <TutorEditor
              key={t.id}
              tutor={t}
              onSave={(patch) => {
                onUpdate(t.id, patch)
                setEditingId(null)
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={t.id} className="tm-row">
              <span className="avatar">{t.emoji}</span>
              <div className="tm-info">
                <strong>{t.name}</strong>
                <p className="muted">
                  {t.subject} · ${t.rate}/hr ·{' '}
                  {hasSchedule(t)
                    ? availableWeekdays(t).join(', ')
                    : 'all days open'}
                </p>
              </div>
              <div className="req-actions">
                <button
                  className="btn btn--sm btn--ghost"
                  onClick={() => setEditingId(t.id)}
                >
                  Edit
                </button>
                <button
                  className="btn btn--sm btn--ghost btn--danger"
                  onClick={() => {
                    if (confirm(`Delete ${t.name}? This can’t be undone.`))
                      onDelete(t.id)
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </>
  )
}

function TutorEditor({ tutor, onSave, onCancel }) {
  const [d, setD] = useState({ ...tutor, slots: [...(tutor.slots || [])] })
  const set = (patch) => setD({ ...d, ...patch })
  const slotSet = new Set(d.slots)

  function toggleSlot(day, time) {
    const key = `${day} ${time}`
    const next = new Set(slotSet)
    next.has(key) ? next.delete(key) : next.add(key)
    set({ slots: [...next] })
  }

  return (
    <div className="tm-editor">
      <div className="field-row">
        <label className="field">
          Name
          <input value={d.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="field">
          Emoji / avatar
          <input value={d.emoji} onChange={(e) => set({ emoji: e.target.value })} />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          Subject
          <select
            value={d.subject}
            onChange={(e) => set({ subject: e.target.value })}
          >
            {SUBJECT_OPTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Hourly rate ($)
          <input
            type="number"
            value={d.rate}
            onChange={(e) => set({ rate: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          Rating
          <input
            type="number"
            step="0.1"
            value={d.rating}
            onChange={(e) => set({ rating: Number(e.target.value) })}
          />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          Focus (e.g. “Algebra I &amp; II”)
          <input value={d.focus} onChange={(e) => set({ focus: e.target.value })} />
        </label>
        <label className="field">
          Grades (e.g. “Grades 6–10”)
          <input value={d.grades} onChange={(e) => set({ grades: e.target.value })} />
        </label>
      </div>
      <label className="field">
        Bio
        <textarea
          rows={2}
          value={d.bio}
          onChange={(e) => set({ bio: e.target.value })}
        />
      </label>

      <div className="field">
        Availability{' '}
        <span className="muted">
          — tap times to toggle. {d.slots.length === 0 && 'Empty = all days open.'}
        </span>
        <div className="avail-editor">
          {EDIT_DAYS.map((day) => (
            <div key={day} className="avail-day">
              <span className="avail-day-label">{day}</span>
              <div className="avail-times">
                {EDIT_TIMES.map((time) => (
                  <button
                    type="button"
                    key={time}
                    className={`avail-chip ${
                      slotSet.has(`${day} ${time}`) ? 'avail-chip--on' : ''
                    }`}
                    onClick={() => toggleSlot(day, time)}
                  >
                    {time.replace(':00', '')}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="tm-editor-actions">
        <button className="btn" onClick={() => onSave(d)}>
          Save
        </button>
        <button className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
