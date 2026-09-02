export type NotificationSettings = {
  medication: boolean
  couple: boolean
  affirmation: boolean
  quietHours: boolean
  quietStart: string
  quietEnd: string
}

export type NotificationDiagnostics = {
  supported: boolean
  secureContext: boolean
  permission: NotificationPermission | 'unsupported'
  serviceWorker: 'registered' | 'unavailable' | 'failed'
  reason?: string
}

const notificationSettingsKey = 'luna-notification-settings'
const defaultSettings: NotificationSettings = {
  medication: true,
  couple: true,
  affirmation: true,
  quietHours: false,
  quietStart: '22:00',
  quietEnd: '07:00',
}

let registrationPromise: Promise<ServiceWorkerRegistration> | null = null
let registrationError: string | undefined

function capabilityError() {
  if (!('Notification' in window)) return 'Your browser does not support web notifications.'
  if (!window.isSecureContext) return 'Notifications require HTTPS or localhost.'
  return undefined
}

export function getNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(notificationSettingsKey)
    if (!raw) return defaultSettings
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>
    return {
      medication: parsed.medication ?? defaultSettings.medication,
      couple: parsed.couple ?? defaultSettings.couple,
      affirmation: parsed.affirmation ?? defaultSettings.affirmation,
      quietHours: parsed.quietHours ?? defaultSettings.quietHours,
      quietStart: parsed.quietStart ?? defaultSettings.quietStart,
      quietEnd: parsed.quietEnd ?? defaultSettings.quietEnd,
    }
  } catch {
    return defaultSettings
  }
}

export function setNotificationSettings(next: Partial<NotificationSettings>) {
  const current = getNotificationSettings()
  const merged = { ...current, ...next }
  localStorage.setItem(notificationSettingsKey, JSON.stringify(merged))
  return merged
}

export function isQuietHoursActive(date = new Date()): boolean {
  const settings = getNotificationSettings()
  if (!settings.quietHours) return false

  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number)
    return Number.isFinite(hours) && Number.isFinite(minutes) ? (hours * 60) + minutes : 0
  }

  const startMinutes = toMinutes(settings.quietStart)
  const endMinutes = toMinutes(settings.quietEnd)
  const currentMinutes = (date.getHours() * 60) + date.getMinutes()

  if (startMinutes === endMinutes) return true
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes
}

export function getNotificationDiagnostics(): NotificationDiagnostics {
  const supported = 'Notification' in window
  const secureContext = window.isSecureContext
  const serviceWorkerSupported = 'navigator' in window && 'serviceWorker' in window.navigator

  return {
    supported,
    secureContext,
    permission: supported ? Notification.permission : 'unsupported',
    serviceWorker: !serviceWorkerSupported ? 'unavailable' : registrationError ? 'failed' : registrationPromise ? 'registered' : 'unavailable',
    reason: capabilityError(),
  }
}

export function registerNotificationService(): Promise<ServiceWorkerRegistration> | null {
  if (registrationPromise) return registrationPromise
  if (capabilityError()) return null
  if (!('navigator' in window) || !('serviceWorker' in window.navigator)) {
    registrationError = 'The browser does not provide service-worker support.'
    return null
  }

  registrationPromise = window.navigator.serviceWorker.register('/sw.js')
    .then((registration) => {
      registrationError = undefined
      console.info('LUNA service worker registered:', registration.scope)
      return registration
    })
    .catch((error: unknown) => {
      registrationPromise = null
      registrationError = error instanceof Error ? error.message : 'Unknown service-worker registration error.'
      console.error('LUNA service worker registration failed:', error)
      throw new Error('The browser supports notifications, but the service worker could not be registered.')
    })

  return registrationPromise
}

export async function refreshNotificationStatus(): Promise<NotificationDiagnostics> {
  const registration = registerNotificationService()
  if (registration) {
    try {
      await registration
    } catch {
      // Registration failure is retained in the diagnostic state.
    }
  }
  return getNotificationDiagnostics()
}

export async function getNotificationRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = registerNotificationService()
  if (!registration) throw new Error(capabilityError() || registrationError || 'The notification service is unavailable.')
  return registration
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  const problem = capabilityError()
  if (problem) throw new Error(problem)
  if (Notification.permission !== 'default') return Notification.permission

  try {
    return await Notification.requestPermission()
  } catch (error) {
    console.error('LUNA notification permission request failed:', error)
    throw new Error('The browser could not open its notification permission prompt.')
  }
}

export async function sendNotification(title: string, body: string, tag: string): Promise<void> {
  const problem = capabilityError()
  if (problem) throw new Error(problem)
  if (Notification.permission !== 'granted') {
    throw new Error(Notification.permission === 'denied' ? 'Notifications are blocked by your browser.' : 'Notification permission is still required.')
  }

  if (tag !== 'luna-test-notification' && isQuietHoursActive()) {
    throw new Error('Quiet hours are active right now, so the browser reminder was skipped.')
  }

  try {
    const registration = await getNotificationRegistration()
    await registration.showNotification(title, { body, tag, icon: '/icon.svg', badge: '/icon.svg', data: { url: window.location.href } })
  } catch (error) {
    console.error('LUNA service-worker notification failed:', error)
    if (Notification.permission === 'granted') {
      new Notification(title, { body, tag })
      return
    }
    throw error instanceof Error ? error : new Error('The notification service is unavailable.')
  }
}

export async function sendLoveAffirmationNotification(): Promise<void> {
  if (!getNotificationSettings().affirmation) return
  await sendNotification('LUNA • Affirmation', 'Your daily affirmation awaits you.', 'luna-daily-affirmation')
}

export async function showTestNotification(): Promise<void> {
  await sendNotification('LUNA • Test Notification', 'Notifications are working! You will receive reminders and affirmations here.', 'luna-test-notification')
}

export async function showMedicationNotification(body = 'Medication reminder'): Promise<void> {
  if (!getNotificationSettings().medication) return
  if (getNotificationDiagnostics().permission !== 'granted') return
  await sendNotification('LUNA • Medication Reminder', body, 'luna-medication-reminder')
}

export async function showPartnerReminderNotification(name: string, body?: string): Promise<void> {
  if (!getNotificationSettings().couple) return
  if (getNotificationDiagnostics().permission !== 'granted') return
  await sendNotification('LUNA • Jam Reminder', body || `${name} is waiting for you in your shared space.`, 'luna-partner-reminder')
}
