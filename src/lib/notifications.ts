export type NotificationDiagnostics = {
  supported: boolean
  secureContext: boolean
  permission: NotificationPermission | 'unsupported'
  serviceWorker: 'registered' | 'unavailable' | 'failed'
  reason?: string
}

function supportError() {
  if (!('Notification' in window)) return 'Notifications are not supported by this browser. You can still use LUNA\'s in-app reminders.'
  if (!window.isSecureContext) return 'Notifications require a secure connection. Open the deployed HTTPS version of LUNA.'
  return undefined
}

export function getNotificationDiagnostics(): NotificationDiagnostics {
  const supported = 'Notification' in window
  return {
    supported,
    secureContext: window.isSecureContext,
    permission: supported ? Notification.permission : 'unsupported',
    serviceWorker: 'serviceWorker' in navigator ? 'unavailable' : 'unavailable',
    reason: supportError(),
  }
}

export async function getNotificationRegistration(): Promise<ServiceWorkerRegistration> {
  const problem = supportError()
  if (problem) throw new Error(problem)
  if (!('serviceWorker' in navigator)) throw new Error('The service worker is unavailable in this browser.')
  try {
    return await navigator.serviceWorker.ready
  } catch {
    throw new Error('LUNA could not connect to its notification service. Please reload and try again.')
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  const problem = supportError()
  if (problem) throw new Error(problem)
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    throw new Error('The browser could not open its notification permission prompt.')
  }
}

export async function showTestNotification(): Promise<void> {
  const permission = await requestNotificationPermission()
  if (permission !== 'granted') throw new Error(permission === 'denied' ? 'Notifications are blocked. Allow notifications for LUNA in your browser or device settings, then try again.' : 'Notification permission is still required.')
  const registration = await getNotificationRegistration()
  await registration.showNotification('LUNA Notifications Enabled', {
    body: 'Your LUNA reminders are ready.',
    tag: 'luna-test-notification',
    data: { url: `${window.location.origin}/?notification=test` },
  })
}

export async function showMedicationNotification(): Promise<void> {
  const permission = getNotificationDiagnostics().permission
  if (permission !== 'granted') return
  const registration = await getNotificationRegistration()
  await registration.showNotification('LUNA Reminder', {
    body: 'Medication reminder',
    tag: 'luna-medication-reminder',
    data: { url: `${window.location.origin}/?reminder=1` },
  })
}
