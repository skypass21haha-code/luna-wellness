import { getLoveAffirmationByCategory, getLoveAffirmationForTime, type LoveAffirmationCategory } from '../data/affirmations'

export type NotificationDiagnostics = {
  supported: boolean
  secureContext: boolean
  permission: NotificationPermission | 'unsupported'
  serviceWorker: 'registered' | 'unavailable' | 'failed'
  reason?: string
}

let registrationPromise: Promise<ServiceWorkerRegistration> | null = null
let registrationError: string | undefined

function capabilityError() {
  if (!('Notification' in window)) return 'Your browser does not support web notifications.'
  if (!window.isSecureContext) return 'Notifications require HTTPS or localhost.'
  return undefined
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

export async function sendLoveAffirmationNotification(category: LoveAffirmationCategory = 'random_love'): Promise<void> {
  const affirmation = getLoveAffirmationByCategory(category, Date.now())
  await sendNotification(affirmation.title, affirmation.message, `luna-love-${affirmation.category}-${affirmation.id}`)
}

export async function showTestNotification(): Promise<void> {
  const affirmation = getLoveAffirmationForTime(new Date())
  await sendNotification(affirmation.title, affirmation.message, `luna-love-${affirmation.category}-${affirmation.id}`)
}

export async function showMedicationNotification(): Promise<void> {
  if (getNotificationDiagnostics().permission !== 'granted') return
  await sendNotification('LUNA Reminder', 'Medication reminder', 'luna-medication-reminder')
}
