import {
  getNotificationSettings as getBaseSettings,
  isQuietHoursActive,
  requestNotificationPermission,
  sendNotification,
  setNotificationSettings as setBaseSettings,
  type NotificationSettings,
} from './notifications'

export type WellnessNotificationSettings = NotificationSettings

export const defaultWellnessNotificationSettings = getBaseSettings()

export function getWellnessNotificationSettings(): WellnessNotificationSettings {
  return getBaseSettings()
}

export function setWellnessNotificationSettings(next: Partial<WellnessNotificationSettings>) {
  return setBaseSettings(next)
}

export async function requestWellnessNotifications(): Promise<NotificationPermission> {
  return requestNotificationPermission()
}

export async function notifyWellnessReminder(title: string, body: string, tag: string) {
  if (isQuietHoursActive()) return
  await sendNotification(title, body, tag)
}

export function isQuietHoursForWellness(date = new Date()) {
  return isQuietHoursActive(date)
}
