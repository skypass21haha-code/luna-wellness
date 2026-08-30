// Helper types and functions for partner connection state management

type PartnerConnectionStatus = 'not_connected' | 'request_sent' | 'request_received' | 'connected' | 'declined' | 'disconnected'

type PartnerMessage = {
  id: string
  senderId: string
  content: string
  createdAt: string
  readAt?: string
}

type PartnerState = {
  status: PartnerConnectionStatus
  myCode: string
  partnerUserId?: string
  partnerName?: string
  partnerCode?: string
  connectedAt?: string
  unreadCount: number
  messages: PartnerMessage[]
}

const connectionThreadKey = (userA: string, userB: string) => [userA, userB].sort().join(':')

function generatePartnerCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const pieces = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)])
  return `LUNA-${pieces.join('')}`
}

function partnerStateKey(userId: string) {
  return `luna-partner-state:${userId}`
}


export function readPartnerState(userId: string): PartnerState {
  try {
    const raw = localStorage.getItem(partnerStateKey(userId))
    if (!raw) {
      return { status: 'not_connected', myCode: generatePartnerCode(), unreadCount: 0, messages: [] }
    }
    const parsed = JSON.parse(raw) as Partial<PartnerState>
    return {
      status: parsed.status ?? 'not_connected',
      myCode: parsed.myCode ?? generatePartnerCode(),
      partnerUserId: parsed.partnerUserId,
      partnerName: parsed.partnerName,
      partnerCode: parsed.partnerCode,
      connectedAt: parsed.connectedAt,
      unreadCount: parsed.unreadCount ?? 0,
      messages: parsed.messages ?? [],
    }
  } catch {
    return { status: 'not_connected', myCode: generatePartnerCode(), unreadCount: 0, messages: [] }
  }
}

export function writePartnerState(userId: string, state: PartnerState) {
  localStorage.setItem(partnerStateKey(userId), JSON.stringify(state))
}

export function readThreadMessages(userA: string, userB: string): PartnerMessage[] {
  try {
    const raw = localStorage.getItem(`luna-partner-thread:${connectionThreadKey(userA, userB)}`)
    return raw ? (JSON.parse(raw) as PartnerMessage[]) : []
  } catch {
    return []
  }
}

export function writeThreadMessages(userA: string, userB: string, messages: PartnerMessage[]) {
  localStorage.setItem(`luna-partner-thread:${connectionThreadKey(userA, userB)}`, JSON.stringify(messages))
}
