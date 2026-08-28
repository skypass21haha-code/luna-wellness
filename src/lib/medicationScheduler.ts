import type { SupabaseClient } from '@supabase/supabase-js'
import { sendNotification } from './notifications'

type MedicationRow = {
  id: string
  name: string
  active: boolean
  start_date: string | null
  end_date: string | null
}

type ScheduleRow = {
  id: string
  medication_id: string
  schedule_type: string
  times: string[]
  selected_days: number[] | null
  reminder_enabled: boolean
}

export type MedicationReminder = {
  key: string
  medicationId: string
  medicationName: string
  scheduleId: string
  scheduledAt: string
  scheduledLabel: string
}

type ScheduleItem = ScheduleRow & { medication: MedicationRow }
type SchedulerOptions = {
  userId: string
  onDue: (reminder: MedicationReminder) => void
}

const MAX_MISSED_WINDOW_MS = 15 * 60 * 1000
const processedKey = (userId: string) => `luna-medication-reminders:${userId}`

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseTime(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number)
  return Number.isFinite(hours) && Number.isFinite(minutes) ? { hours, minutes } : null
}

function isActiveOnDate(item: ScheduleItem, date: Date) {
  const dateKey = localDateKey(date)
  if (item.medication.start_date && dateKey < item.medication.start_date) return false
  if (item.medication.end_date && dateKey > item.medication.end_date) return false
  if (!item.selected_days?.length) return true
  return item.selected_days.includes(date.getDay())
}

function occurrenceFor(item: ScheduleItem, date: Date, time: string): MedicationReminder | null {
  const parsed = parseTime(time)
  if (!parsed || !item.medication.active || !item.reminder_enabled || !isActiveOnDate(item, date)) return null
  const occurrence = new Date(date)
  occurrence.setHours(parsed.hours, parsed.minutes, 0, 0)
  const key = `${item.medication.id}:${item.id}:${occurrence.getTime()}`
  return {
    key,
    medicationId: item.medication.id,
    medicationName: item.medication.name,
    scheduleId: item.id,
    scheduledAt: occurrence.toISOString(),
    scheduledLabel: occurrence.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  }
}

function getOccurrences(item: ScheduleItem, date: Date) {
  return item.times.map((time) => occurrenceFor(item, date, time)).filter((item): item is MedicationReminder => item !== null)
}

function readProcessed(userId: string) {
  try {
    return new Set(JSON.parse(localStorage.getItem(processedKey(userId)) || '[]') as string[])
  } catch {
    return new Set<string>()
  }
}

function writeProcessed(userId: string, processed: Set<string>) {
  const values = [...processed].slice(-200)
  localStorage.setItem(processedKey(userId), JSON.stringify(values))
}

export async function loadMedicationSchedules(client: SupabaseClient, userId: string) {
  const [medicationsResult, schedulesResult] = await Promise.all([
    client.from('medications').select('id,name,active,start_date,end_date').eq('user_id', userId).eq('active', true),
    client.from('medication_schedules').select('id,medication_id,schedule_type,times,selected_days,reminder_enabled').eq('user_id', userId).eq('reminder_enabled', true),
  ])

  if (medicationsResult.error) throw medicationsResult.error
  if (schedulesResult.error) throw schedulesResult.error

  const medications = (medicationsResult.data || []) as MedicationRow[]
  const medicationById = new Map(medications.map((medication) => [medication.id, medication]))
  return ((schedulesResult.data || []) as ScheduleRow[])
    .map((schedule) => ({ ...schedule, medication: medicationById.get(schedule.medication_id) }))
    .filter((item): item is ScheduleItem => Boolean(item.medication))
}

export function createMedicationScheduler(client: SupabaseClient, options: SchedulerOptions) {
  let timer: number | undefined
  let stopped = false
  let items: ScheduleItem[] = []
  const processed = readProcessed(options.userId)

  const emit = async (reminder: MedicationReminder) => {
    if (processed.has(reminder.key)) return
    processed.add(reminder.key)
    writeProcessed(options.userId, processed)
    options.onDue(reminder)
    try {
      await sendNotification('LUNA Wellness', `It is time for ${reminder.medicationName}. Scheduled for ${reminder.scheduledLabel}.`, `luna-medication-${reminder.key}`)
      console.info('[LUNA Notifications] Medication notification sent')
    } catch (error) {
      console.warn('[LUNA Notifications] Browser notification unavailable; in-app reminder remains active.', error)
    }
  }

  const scheduleNext = () => {
    if (stopped) return
    const now = new Date()
    const today = getOccurrencesForDate(now)
    const overdue = today.filter((reminder) => {
      const difference = now.getTime() - new Date(reminder.scheduledAt).getTime()
      return difference >= 0 && difference <= MAX_MISSED_WINDOW_MS
    })
    overdue.forEach((reminder) => void emit(reminder))

    const upcoming = today.filter((reminder) => new Date(reminder.scheduledAt).getTime() > now.getTime())
    const next = upcoming.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]
    const delay = next ? Math.max(1000, new Date(next.scheduledAt).getTime() - now.getTime()) : 60 * 60 * 1000
    timer = window.setTimeout(() => {
      if (next) void emit(next)
      scheduleNext()
    }, Math.min(delay, 60 * 60 * 1000))
  }

  const getOccurrencesForDate = (date: Date) => items.flatMap((item) => getOccurrences(item, date))

  const start = async () => {
    items = await loadMedicationSchedules(client, options.userId)
    console.info(`[LUNA Medication Scheduler] Loaded ${items.length} schedules`)
    scheduleNext()
  }

  return {
    start,
    scheduleTest: (delayMs = 10000) => {
      const scheduledAt = new Date(Date.now() + delayMs)
      const reminder: MedicationReminder = {
        key: `test:${scheduledAt.getTime()}`,
        medicationId: 'test-medication',
        medicationName: 'Test Medication',
        scheduleId: 'test-schedule',
        scheduledAt: scheduledAt.toISOString(),
        scheduledLabel: scheduledAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      }
      const testTimer = window.setTimeout(() => void emit(reminder), delayMs)
      return () => window.clearTimeout(testTimer)
    },
    refresh: async () => {
      if (timer) window.clearTimeout(timer)
      items = await loadMedicationSchedules(client, options.userId)
      scheduleNext()
    },
    stop: () => {
      stopped = true
      if (timer) window.clearTimeout(timer)
    },
  }
}
