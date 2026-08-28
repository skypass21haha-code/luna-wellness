import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Activity,
  Bell,
  BookHeart,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  Heart,
  Home,
  Leaf,
  Menu,
  Moon,
  Pill,
  Settings as SettingsIcon,
  Sparkles,
  SunMedium,
  Trash2,
  X,
} from 'lucide-react'
import './App.css'
import { supabase } from './lib/supabase'
import { getNotificationDiagnostics, requestNotificationPermission, showTestNotification } from './lib/notifications'

type Session = NonNullable<Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']>
type Page = 'Today' | 'Cycle' | 'Symptoms' | 'Medication' | 'Journal' | 'Insights' | 'Settings'

const today = () => new Date().toISOString().slice(0, 10)
const messageForError = () => 'LUNA is temporarily offline. Please try again when your connection is restored.'

const affirmations = [
  'You are allowed to rest without earning it.',
  'Your body is not a project to fix in one day.',
  'Tender routines count as strength.',
  'Your care can be gentle and consistent.',
]

const goals = [
  'Complete 5 daily check-ins this week.',
  'Get to bed 30 minutes earlier twice this week.',
  'Log symptoms before they feel like a spiral.',
  'Take medication on time and keep a quiet reminder to yourself.',
]

const privacyItems = [
  'Private by default: health data stays in your account unless you choose to share.',
  'Partner mode is always optional and can be changed at any time.',
  'Data export and account deletion stay available from your privacy center.',
]

function NotificationStatus() {
  const [diagnostics, setDiagnostics] = useState(getNotificationDiagnostics)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.ready
      .then(() => setDiagnostics({ ...getNotificationDiagnostics(), serviceWorker: 'registered' }))
      .catch(() => setDiagnostics({ ...getNotificationDiagnostics(), serviceWorker: 'failed' }))
  }, [])

  async function enable() {
    try {
      const permission = await requestNotificationPermission()
      setDiagnostics({ ...getNotificationDiagnostics(), permission })
      if (permission === 'granted') {
        await showTestNotification()
        setMessage('Notifications enabled ✓ A test notification was sent.')
      } else if (permission === 'denied') {
        setMessage('Notifications are blocked. Allow LUNA in your browser or device settings, then try again.')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'LUNA could not enable notifications.')
    }
  }

  async function test() {
    try {
      await showTestNotification()
      setMessage('Test notification sent ✓')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The test notification could not be sent.')
    }
  }

  const status = !diagnostics.supported
    ? 'Not supported'
    : diagnostics.permission === 'granted'
      ? 'Enabled ✓'
      : diagnostics.permission === 'denied'
        ? 'Blocked'
        : 'Permission required'

  return (
    <section className="notification-panel">
      <div>
        <p className="label">DEVICE NOTIFICATIONS</p>
        <strong>{status}</strong>
        <small>
          Support: {diagnostics.supported ? 'Supported' : 'Unavailable'} · Secure context:{' '}
          {diagnostics.secureContext ? 'Yes' : 'No'} · Service worker: {diagnostics.serviceWorker}. LUNA can send notifications when supported and permitted, but web notifications are not guaranteed native alarms.
        </small>
      </div>
      <div className="notification-actions">
        {diagnostics.permission !== 'granted' && (
          <button className="primary-button" onClick={enable}>
            Enable Notifications
          </button>
        )}
        <button className="text-button" onClick={test}>
          Send test
        </button>
      </div>
      {message && <p className="notification-message">{message}</p>}
    </section>
  )
}

function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setMessage('')

    const result =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : mode === 'register'
          ? await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })
          : await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })

    setBusy(false)
    setMessage(
      result.error
        ? 'We could not complete that request. Check your details and try again.'
        : mode === 'reset'
          ? 'Check your email for a reset link.'
          : mode === 'register'
            ? 'Check your email to confirm your account.'
            : '',
    )
  }

  return (
    <main className="auth-page">
      <div className="auth-panel">
        <div className="brand auth-brand">
          <span className="brand-mark">
            <Leaf size={17} />
          </span>
          <span>LUNA</span>
        </div>
        <p className="eyebrow">A PRIVATE SPACE FOR YOU</p>
        <h1>{mode === 'reset' ? 'Reset your password' : mode === 'register' ? 'Welcome to LUNA' : 'Welcome back'}</h1>
        <p className="auth-copy">Understand your body. Remember your care. Be gentle with yourself.</p>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Name
              <input required value={name} onChange={(event) => setName(event.target.value)} />
            </label>
          )}

          <label>
            Email
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          {mode !== 'reset' && (
            <label>
              Password
              <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
          )}

          <button className="primary-button auth-submit" disabled={busy}>
            {busy ? 'Please wait...' : mode === 'reset' ? 'Send reset link' : mode === 'register' ? 'Create private account' : 'Sign in'}
          </button>
        </form>

        {message && <p className="auth-message">{message}</p>}

        <div className="auth-links">
          {mode === 'login' && <button onClick={() => setMode('reset')}>Forgot password?</button>}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Create an account' : 'Back to sign in'}
          </button>
        </div>
      </div>
    </main>
  )
}

function useRows<T>(table: string, session: Session | null, order = 'created_at') {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase || !session) return

    supabase
      .from(table)
      .select('*')
      .eq('user_id', session.user.id)
      .order(order, { ascending: false })
      .then(({ data, error: resultError }) => {
        setRows((data as T[]) || [])
        setError(resultError ? messageForError() : '')
        setLoading(false)
      })
  }, [table, session, order])

  return { rows, setRows, loading, error }
}

function StateMessage({ loading, error, empty, action }: { loading: boolean; error: string; empty: string; action?: () => void }) {
  if (loading) return <p className="module-state">Loading your records...</p>
  if (error) return <p className="module-state error">{error}</p>

  return (
    <div className="module-empty">
      <p>{empty}</p>
      {action && (
        <button className="text-button" onClick={action}>
          Add your first entry <ChevronRight size={15} />
        </button>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="module-field">
      {label}
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function Cycle({ session }: { session: Session }) {
  type Period = { id: string; start_date: string; end_date: string | null; spotting: boolean; flow: string | null; pain: number | null; notes: string | null }
  const { rows, setRows, loading, error } = useRows<Period>('period_logs', session, 'start_date')
  const [form, setForm] = useState({ start_date: today(), end_date: '', flow: 'light', pain: '0', notes: '', spotting: false })
  const [busy, setBusy] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)

    const { data, error: resultError } = await supabase
      .from('period_logs')
      .insert({ user_id: session.user.id, ...form, pain: Number(form.pain), end_date: form.end_date || null })
      .select()
      .single()

    setBusy(false)
    if (!resultError && data) setRows([data as Period, ...rows])
  }

  async function remove(id: string) {
    if (!supabase || !window.confirm('Delete this period record?')) return
    await supabase.from('period_logs').delete().eq('id', id).eq('user_id', session.user.id)
    setRows(rows.filter((row) => row.id !== id))
  }

  return (
    <Module title="Cycle" eyebrow="YOUR CYCLE">
      <div className="module-grid">
        <section className="module-card">
          <h2>Log a period</h2>
          <form className="module-form" onSubmit={save}>
            <Field label="Start date" type="date" required value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} />
            <Field label="End date" type="date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
            <label className="module-field">
              Flow
              <select value={form.flow} onChange={(event) => setForm({ ...form, flow: event.target.value })}>
                <option>spotting</option>
                <option>light</option>
                <option>medium</option>
                <option>heavy</option>
              </select>
            </label>
            <Field label="Pain / cramps (0-10)" type="number" value={form.pain} onChange={(v) => setForm({ ...form, pain: v })} />
            <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
            <label className="check-field">
              <input type="checkbox" checked={form.spotting} onChange={(event) => setForm({ ...form, spotting: event.target.checked })} />
              Spotting
            </label>
            <button className="primary-button" disabled={busy}>
              {busy ? 'Saving...' : 'Save cycle entry'}
            </button>
          </form>
        </section>

        <section className="module-card">
          <h2>Recent cycle history</h2>
          {loading || error || rows.length === 0 ? (
            <StateMessage loading={loading} error={error} empty="No cycle entries yet." />
          ) : (
            <div className="record-list">
              {rows.map((row) => (
                <div className="record" key={row.id}>
                  <div>
                    <strong>{row.start_date}</strong>
                    <small>{row.flow || 'Flow not entered'} · {row.pain ?? 0}/10 pain</small>
                    {row.notes && <p>{row.notes}</p>}
                  </div>
                  <button className="icon-button" aria-label="Delete cycle record" onClick={() => remove(row.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Module>
  )
}

function Symptoms({ session }: { session: Session }) {
  type Symptom = { id: string; symptom_id?: string; name?: string; logged_on: string; severity: number; notes: string | null }
  const { rows, setRows, loading, error } = useRows<Symptom>('symptom_logs', session, 'logged_on')
  const [name, setName] = useState('Fatigue')
  const [severity, setSeverity] = useState('5')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)

    const symptom = await supabase.from('symptoms').upsert({ user_id: session.user.id, name }, { onConflict: 'user_id,name' }).select().single()
    if (symptom.error || !symptom.data) {
      setBusy(false)
      return
    }

    const result = await supabase
      .from('symptom_logs')
      .insert({ user_id: session.user.id, symptom_id: symptom.data.id, logged_on: today(), severity: Number(severity), notes })
      .select()
      .single()

    setBusy(false)
    if (!result.error && result.data) setRows([result.data as Symptom, ...rows])
  }

  async function remove(id: string) {
    if (!supabase || !window.confirm('Delete this symptom entry?')) return
    await supabase.from('symptom_logs').delete().eq('id', id).eq('user_id', session.user.id)
    setRows(rows.filter((row) => row.id !== id))
  }

  return (
    <Module title="Symptoms" eyebrow="NOTICE WITH KINDNESS">
      <div className="module-grid">
        <section className="module-card">
          <h2>Log a symptom</h2>
          <form className="module-form" onSubmit={save}>
            <label className="module-field">
              Symptom
              <select value={name} onChange={(event) => setName(event.target.value)}>
                {['Acne', 'Headache', 'Fatigue', 'Cramps', 'Bloating', 'Pelvic discomfort', 'Skin changes', 'Hair changes', 'Breast tenderness', 'Low energy', 'Poor sleep', 'Appetite changes'].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <Field label="Severity (0-10)" type="number" value={severity} onChange={setSeverity} />
            <Field label="Notes" value={notes} onChange={setNotes} />
            <button className="primary-button" disabled={busy}>
              {busy ? 'Saving...' : 'Save symptom'}
            </button>
          </form>
        </section>

        <section className="module-card">
          <h2>Tracked symptoms</h2>
          {loading || error || rows.length === 0 ? (
            <StateMessage loading={loading} error={error} empty="No symptoms logged yet." />
          ) : (
            <div className="record-list">
              {rows.map((row) => (
                <div className="record" key={row.id}>
                  <div>
                    <strong>{row.name}</strong>
                    <small>{row.logged_on} · severity {row.severity}/10</small>
                    {row.notes && <p>{row.notes}</p>}
                  </div>
                  <button className="icon-button" aria-label="Delete symptom" onClick={() => remove(row.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Module>
  )
}

function Medication({ session }: { session: Session }) {
  type Med = { id: string; name: string; strength: string | null; instructions: string | null; active: boolean }
  const { rows, setRows, loading, error } = useRows<Med>('medications', session)
  const [form, setForm] = useState({ name: '', strength: '', instructions: '', purpose: '', start_date: today(), end_date: '', reminder_time: '20:00' })
  const [busy, setBusy] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)

    const result = await supabase
      .from('medications')
      .insert({ user_id: session.user.id, ...form, end_date: form.end_date || null })
      .select()
      .single()

    if (!result.error && result.data) {
      const medication = result.data as Med
      const schedule = await supabase
        .from('medication_schedules')
        .insert({ user_id: session.user.id, medication_id: medication.id, schedule_type: 'once_daily', times: [form.reminder_time], reminder_enabled: true })
        .select()
        .single()

      if (!schedule.error && schedule.data) {
        await supabase
          .from('reminders')
          .insert({
            user_id: session.user.id,
            medication_id: medication.id,
            schedule_id: schedule.data.id,
            scheduled_at: `${form.start_date}T${form.reminder_time}:00`,
            status: 'scheduled',
            reminder_enabled: true,
          })
      }

      setRows([medication, ...rows])
      setForm({ name: '', strength: '', instructions: '', purpose: '', start_date: today(), end_date: '', reminder_time: '20:00' })
    }

    setBusy(false)
  }

  async function remove(id: string) {
    if (!supabase || !window.confirm('Delete this medication and its schedules?')) return
    await supabase.from('medications').delete().eq('id', id).eq('user_id', session.user.id)
    setRows(rows.filter((row) => row.id !== id))
  }

  return (
    <Module title="Medication" eyebrow="YOUR CARE PLAN">
      <div className="module-grid">
        <section className="module-card">
          <h2>Add medication</h2>
          <form className="module-form" onSubmit={save}>
            <Field label="Medication name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Strength" value={form.strength} onChange={(v) => setForm({ ...form, strength: v })} />
            <Field label="Instructions" value={form.instructions} onChange={(v) => setForm({ ...form, instructions: v })} />
            <Field label="Start date" type="date" required value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} />
            <Field label="Reminder time" type="time" value={form.reminder_time} onChange={(v) => setForm({ ...form, reminder_time: v })} />
            <button className="primary-button" disabled={busy}>
              {busy ? 'Saving...' : 'Save medication'}
            </button>
          </form>
        </section>

        <section className="module-card">
          <h2>Medication list</h2>
          {loading || error || rows.length === 0 ? (
            <StateMessage loading={loading} error={error} empty="No medications added yet." />
          ) : (
            <div className="record-list">
              {rows.map((row) => (
                <div className="record" key={row.id}>
                  <div>
                    <strong>{row.name}</strong>
                    <small>{row.strength || 'Dose not set'} · {row.instructions || 'No instructions added'}</small>
                  </div>
                  <button className="icon-button" aria-label="Delete medication" onClick={() => remove(row.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Module>
  )
}

function Journal({ session }: { session: Session }) {
  type Entry = { id: string; title: string; content: string; entry_date: string; mood: string | null; tags: string[] }
  const { rows, setRows, loading, error } = useRows<Entry>('journal_entries', session, 'entry_date')
  const [form, setForm] = useState({ title: '', content: '', mood: '', tags: '' })
  const [busy, setBusy] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)

    const result = await supabase
      .from('journal_entries')
      .insert({ user_id: session.user.id, ...form, tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean), entry_date: today() })
      .select()
      .single()

    setBusy(false)
    if (!result.error && result.data) {
      setRows([result.data as Entry, ...rows])
      setForm({ title: '', content: '', mood: '', tags: '' })
    }
  }

  async function remove(id: string) {
    if (!supabase || !window.confirm('Delete this journal entry?')) return
    await supabase.from('journal_entries').delete().eq('id', id).eq('user_id', session.user.id)
    setRows(rows.filter((row) => row.id !== id))
  }

  return (
    <Module title="Journal" eyebrow="A PRIVATE PLACE TO REFLECT">
      <div className="module-grid">
        <section className="module-card">
          <h2>New entry</h2>
          <form className="module-form" onSubmit={save}>
            <Field label="Title" required value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
            <label className="module-field">
              What is on your mind?
              <textarea required value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
            </label>
            <Field label="Mood" value={form.mood} onChange={(v) => setForm({ ...form, mood: v })} />
            <Field label="Tags, separated by commas" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} />
            <button className="primary-button" disabled={busy}>
              {busy ? 'Saving...' : 'Save journal entry'}
            </button>
          </form>
        </section>

        <section className="module-card">
          <h2>Recent entries</h2>
          {loading || error || rows.length === 0 ? (
            <StateMessage loading={loading} error={error} empty="No journal entries yet." />
          ) : (
            <div className="record-list">
              {rows.map((row) => (
                <div className="record" key={row.id}>
                  <div>
                    <strong>{row.title}</strong>
                    <small>{row.entry_date} · {row.mood || 'Mood not logged'}</small>
                    <p>{row.content}</p>
                  </div>
                  <button className="icon-button" aria-label="Delete journal entry" onClick={() => remove(row.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Module>
  )
}

function Insights({ session }: { session: Session }) {
  const moods = useRows<{ mood: string; energy: number }>('mood_logs', session, 'logged_on')
  const symptoms = useRows<{ severity: number; symptom_id: string }>('symptom_logs', session, 'logged_on')
  const medications = useRows<{ status: string }>('medication_logs', session, 'logged_at')

  return (
    <Module title="Insights" eyebrow="YOUR TRACKING, REFLECTED">
      <section className="insight-grid">
        <Insight title="Mood tracking" value={moods.rows.length ? `${moods.rows.length} logged days` : 'No entries yet'} detail="Keep tracking to notice your own patterns." loading={moods.loading} />
        <Insight title="Symptoms" value={symptoms.rows.length ? `${symptoms.rows.length} logged entries` : 'No entries yet'} detail="Your recent tracking will appear here without diagnosis." loading={symptoms.loading} />
        <Insight title="Medication logs" value={medications.rows.length ? `${medications.rows.length} logged doses` : 'No entries yet'} detail="A neutral record of what you chose to log." loading={medications.loading} />
      </section>
      <p className="insight-disclaimer">These are summaries of information you entered, not medical conclusions.</p>
    </Module>
  )
}

function Insight({ title, value, detail, loading }: { title: string; value: string; detail: string; loading: boolean }) {
  return (
    <article className="module-card insight-card">
      <Sparkles size={18} />
      <p className="label">{title}</p>
      <h2>{loading ? 'Loading...' : value}</h2>
      <p>{detail}</p>
    </article>
  )
}

function Settings({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [partnerMode, setPartnerMode] = useState(false)
  const [dailyBriefEnabled, setDailyBriefEnabled] = useState(true)

  useEffect(() => {
    if (supabase) {
      supabase
        .from('profiles')
        .select('display_name')
        .eq('id', session.user.id)
        .maybeSingle()
        .then(({ data }) => setName(data?.display_name || ''))
    }
  }, [session])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return

    const result = await supabase.from('profiles').upsert({ id: session.user.id, display_name: name }).select().single()
    setMessage(result.error ? messageForError() : 'Saved ✓')
  }

  return (
    <Module title="Settings" eyebrow="YOUR PRIVATE SPACE">
      <div className="settings-layout">
        <section className="module-card settings-card">
          <h2>Profile</h2>
          <form className="module-form" onSubmit={save}>
            <Field label="Preferred name" value={name} onChange={setName} />
            <Field label="Email" value={session.user.email || ''} onChange={() => undefined} />
            <button className="primary-button">Save settings</button>
          </form>
          {message && <p className="auth-message">{message}</p>}
          <button className="text-button settings-logout" onClick={onSignOut}>
            Sign out <ChevronRight size={15} />
          </button>
        </section>

        <section className="module-card settings-card">
          <h2>Privacy & partner mode</h2>
          <div className="toggle-block">
            <div>
              <strong>Daily brief</strong>
              <small>Personalized daily check-ins, gentle reminders, and a summary tailored to your routine.</small>
            </div>
            <button className={`toggle ${dailyBriefEnabled ? 'on' : ''}`} onClick={() => setDailyBriefEnabled((value) => !value)} aria-label="Toggle daily brief">
              <span />
            </button>
          </div>

          <div className="toggle-block">
            <div>
              <strong>Partner access</strong>
              <small>Only share the details you approve. Your journal, medication details, and cycle info remain private by default.</small>
            </div>
            <button className={`toggle ${partnerMode ? 'on' : ''}`} onClick={() => setPartnerMode((value) => !value)} aria-label="Toggle partner access">
              <span />
            </button>
          </div>

          <ul className="privacy-list">
            {privacyItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </Module>
  )
}

function Module({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="module-page">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <NotificationStatus />
      {children}
    </section>
  )
}

function Today({ session, go }: { session: Session; go: (page: Page) => void }) {
  const [checkIn, setCheckIn] = useState({ mood: 'Good', energy: 7, stress: 3, sleep: 'Good' })
  const [status, setStatus] = useState('Not saved yet')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) return
    const date = today()

    Promise.all([
      supabase.from('mood_logs').select('mood,energy').eq('user_id', session.user.id).eq('logged_on', date).maybeSingle(),
      supabase.from('stress_logs').select('stress').eq('user_id', session.user.id).eq('logged_on', date).maybeSingle(),
      supabase.from('sleep_logs').select('quality').eq('user_id', session.user.id).eq('logged_on', date).maybeSingle(),
    ]).then(([mood, stress, sleep]) => {
      setCheckIn((current) => ({
        ...current,
        ...(mood.data || {}),
        ...(stress.data ? { stress: stress.data.stress } : {}),
        ...(sleep.data ? { sleep: sleep.data.quality } : {}),
      }))
      setLoading(false)
    })
  }, [session])

  async function save() {
    if (!supabase) return
    setStatus('Saving...')
    const date = today()
    const result = await Promise.all([
      supabase.from('mood_logs').upsert({ user_id: session.user.id, logged_on: date, mood: checkIn.mood, energy: checkIn.energy }, { onConflict: 'user_id,logged_on' }),
      supabase.from('stress_logs').upsert({ user_id: session.user.id, logged_on: date, stress: checkIn.stress }, { onConflict: 'user_id,logged_on' }),
      supabase.from('sleep_logs').upsert({ user_id: session.user.id, logged_on: date, quality: checkIn.sleep }, { onConflict: 'user_id,logged_on' }),
    ])

    setStatus(result.some((entry) => entry.error) ? messageForError() : 'Saved ✓')
  }

  const moodOptions = ['Low', 'Okay', 'Good', 'Great']
  const sleepOptions = ['Low', 'Fair', 'Good', 'Restful']

  return (
    <section className="today-page">
      <section className="welcome">
        <div>
          <p className="eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1>
            Welcome back <span>♡</span>
          </h1>
          <p className="intro">A gentle moment to notice how you are, today.</p>
        </div>
        <div className="date-orb">
          <CalendarDays size={21} />
          <strong>{new Date().getDate()}</strong>
          <span>{new Date().toLocaleDateString('en-US', { month: 'short' })}</span>
        </div>
      </section>

      <section className="overview-grid">
        <article className="cycle-card">
          <div className="card-top">
            <span className="label">LUNA DAILY BRIEF</span>
            <Heart size={18} />
          </div>
          <div className="brief-card-body">
            <div className="brief-summary">
              <div>
                <p>Good morning, Hazel 🌸</p>
                <h2>Cycle day 12</h2>
              </div>
              <span className="brief-pill">Low energy</span>
            </div>
            <div className="brief-metrics">
              <div>
                <span>Sleep</span>
                <strong>7h 42m</strong>
              </div>
              <div>
                <span>Mood</span>
                <strong>Good</strong>
              </div>
              <div>
                <span>Medication</span>
                <strong>8:00 PM</strong>
              </div>
            </div>
            <p className="brief-tip">Take gentle care of yourself today. Keep your rhythm steady and let rest be part of your plan.</p>
          </div>
        </article>

        <article className="care-card">
          <div className="card-top">
            <span className="label">THIS WEEK</span>
            <Sparkles size={18} />
          </div>
          <div className="care-copy">
            <div className="mini-avatar">✦</div>
            <div>
              <p>{goals[0]}</p>
              <button className="dark-button" onClick={() => go('Insights')}>
                View insights
              </button>
            </div>
          </div>
        </article>
      </section>

      <section className="checkin-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TODAY'S CHECK-IN</p>
            <h2>How are you feeling?</h2>
          </div>
          <span className="save-status">{loading ? 'Loading...' : status}</span>
        </div>

        <div className="checkin-card">
          <div className="checkin-grid">
            <fieldset>
              <legend>Mood</legend>
              <div className="mood-options">
                {moodOptions.map((option) => (
                  <button
                    key={option}
                    className={checkIn.mood === option ? 'mood selected' : 'mood'}
                    onClick={() => setCheckIn((current) => ({ ...current, mood: option }))}
                  >
                    <span>{option === 'Low' ? '☁️' : option === 'Okay' ? '🙂' : option === 'Good' ? '😊' : '✨'}</span>
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="range-card">
              <label>
                Energy
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={checkIn.energy}
                  onChange={(event) => setCheckIn((current) => ({ ...current, energy: Number(event.target.value) }))}
                />
              </label>
              <strong>{checkIn.energy}/10</strong>
            </div>

            <div className="range-card">
              <label>
                Stress
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={checkIn.stress}
                  onChange={(event) => setCheckIn((current) => ({ ...current, stress: Number(event.target.value) }))}
                />
              </label>
              <strong>{checkIn.stress}/10</strong>
            </div>

            <fieldset>
              <legend>Sleep</legend>
              <div className="sleep-options">
                {sleepOptions.map((option) => (
                  <button
                    key={option}
                    className={checkIn.sleep === option ? 'choice selected' : 'choice'}
                    onClick={() => setCheckIn((current) => ({ ...current, sleep: option }))}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="checkin-actions">
            <button className="primary-button" onClick={save}>Save today</button>
            <button className="text-button" onClick={() => go('Cycle')}>View cycle</button>
          </div>
        </div>
      </section>

      <section className="feature-stack">
        <article className="mini-card">
          <p className="label">AFFIRMATION</p>
          <h3>{affirmations[0]}</h3>
        </article>
        <article className="mini-card">
          <p className="label">GENTLE GOAL</p>
          <h3>{goals[1]}</h3>
        </article>
        <article className="mini-card">
          <p className="label">PRIVATE SUPPORT</p>
          <h3>Partner access stays optional and fully controlled.</h3>
        </article>
      </section>
    </section>
  )
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [page, setPage] = useState<Page>('Today')
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    if (!supabase) {
      queueMicrotask(() => setAuthLoading(false))
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session as Session | null)
      setAuthLoading(false)
    })

    const listener = supabase.auth.onAuthStateChange((_event, next) => setSession(next as Session | null))
    return () => listener.data.subscription.unsubscribe()
  }, [])

  const navigation = [
    { label: 'Today' as Page, icon: Home },
    { label: 'Cycle' as Page, icon: Moon },
    { label: 'Symptoms' as Page, icon: Activity },
    { label: 'Medication' as Page, icon: Pill },
    { label: 'Journal' as Page, icon: BookHeart },
    { label: 'Insights' as Page, icon: Sparkles },
    { label: 'Settings' as Page, icon: SettingsIcon },
  ]

  if (authLoading) {
    return (
      <main className="auth-page">
        <div className="auth-panel">
          <p className="eyebrow">LUNA</p>
          <h1>Loading your private space...</h1>
        </div>
      </main>
    )
  }

  if (!supabase) {
    return (
      <main className="auth-page">
        <div className="auth-panel">
          <h1>Supabase is not configured</h1>
          <p className="auth-copy">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local before using LUNA.</p>
        </div>
      </main>
    )
  }

  if (!session) return <AuthScreen />

  const go = (next: Page) => {
    setPage(next)
    setMenuOpen(false)
  }

  const client = supabase

  return (
    <div className={`app ${theme}`}>
      <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
        <div className="brand">
          <span className="brand-mark">
            <Leaf size={17} />
          </span>
          <span>LUNA</span>
        </div>
        <p className="brand-subtitle">Her personal wellness companion</p>

        <nav aria-label="Primary navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button key={label} className={page === label ? 'nav-item active' : 'nav-item'} onClick={() => go(label)}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="profile">
            <div className="mini-avatar">{session.user.email?.slice(0, 1).toUpperCase() || 'L'}</div>
            <div>
              <strong>{session.user.email || 'Luna user'}</strong>
              <small>Private profile</small>
            </div>
            <button className="icon-button" aria-label="Sign out" onClick={() => void client.auth.signOut()}>
              <CircleUserRound size={19} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="menu-button" aria-label="Toggle menu" onClick={() => setMenuOpen((value) => !value)}>
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>

          <div className="breadcrumb">
            <span>LUNA</span>
            <ChevronRight size={14} />
            <small>{page}</small>
          </div>

          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className="theme-button" aria-label="Toggle theme" onClick={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}>
              {theme === 'light' ? <Moon size={16} /> : <SunMedium size={16} />}
            </button>
          </div>
        </header>

        {page === 'Today' && <Today session={session} go={go} />}
        {page === 'Cycle' && <Cycle session={session} />}
        {page === 'Symptoms' && <Symptoms session={session} />}
        {page === 'Medication' && <Medication session={session} />}
        {page === 'Journal' && <Journal session={session} />}
        {page === 'Insights' && <Insights session={session} />}
        {page === 'Settings' && <Settings session={session} onSignOut={() => void client.auth.signOut()} />}
      </main>
    </div>
  )
}

export default App
