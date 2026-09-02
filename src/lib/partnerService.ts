import { supabase } from './supabase'

export type PartnerRequestRow = {
  id: string
  sender_id: string
  receiver_id: string
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  created_at: string
  updated_at: string
}

export type PartnerConnectionRow = {
  id: string
  user_a_id: string
  user_b_id: string
  status: 'connected' | 'disconnected'
  created_at: string
}

export type DateTicketRow = {
  id: string
  connection_id: string
  organizer_id: string
  title: string
  planned_on: string
  location: string | null
  notes: string | null
  status: 'planned' | 'suggested' | 'completed'
  created_at: string
  updated_at: string
}

export type PartnerThreadMessage = {
  id: string
  sender_id: string
  body: string
  created_at: string
  user_id: string
}

export type PartnerProfileLite = {
  id: string
  display_name: string
  luna_code: string
}

export type SendRequestResult =
  | { ok: true; request: PartnerRequestRow }
  | { ok: false; message: string }

export type RpcResult = { ok: true; connectionId?: string } | { ok: false; message: string }

export const setupErrorHint =
  'Partner connection is not set up yet. Run the LUNA migration 003_partner_connection.sql in Supabase, then try again.'

/** Thrown when the partner schema/functions are missing in the database. */
export class PartnerSetupError extends Error {
  constructor() {
    super('LUNA partner connection schema is not present')
    this.name = 'PartnerSetupError'
  }
}

function isSetupError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  if (error.code === 'PGRST202' || error.code === 'PGRST205' || error.code === '42P01') return true
  return /could not find the function|relation ["]?public[".]?[a-z_]+["]? does not exist|resource associated with the endpoint .* not found/i.test(error.message ?? '')
}

function throwIfSetupMissing(error: { code?: string; message?: string } | null | undefined): void {
  if (isSetupError(error)) throw new PartnerSetupError()
}

/** Read the calling user's own profile (my LUNA code is private to me). */
export async function fetchOwnProfile(uid: string): Promise<PartnerProfileLite | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, luna_code')
    .eq('id', uid)
    .maybeSingle()
  if (error) {
    console.error('[LUNA Partner] Failed to load own profile:', error)
    return null
  }
  if (!data) return null
  return { id: data.id as string, display_name: (data.display_name ?? '') as string, luna_code: (data.luna_code ?? '') as string }
}

/** Ensure the signed-in user has a LUNA code; returns it (or null on failure). */
export async function ensureLunaCode(): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('ensure_my_luna_code')
  if (error) {
    throwIfSetupMissing(error)
    console.error('[LUNA Partner] Failed to ensure LUNA code:', error)
    return null
  }
  if (typeof data === 'string' && data) return data
  if (Array.isArray(data) && typeof data[0] === 'string' && data[0]) return data[0]
  if (data && typeof data === 'object') {
    const value = (data as Record<string, unknown>).ensure_my_luna_code
    if (typeof value === 'string' && value) return value
  }
  return null
}

/** Resolve a LUNA code to a profile (id + display name + code). */
export async function lookupPartnerByCode(code: string): Promise<PartnerProfileLite | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('lookup_partner_by_code', { target_code: code })
  if (error) {
    throwIfSetupMissing(error)
    console.error('[LUNA Partner] Code lookup failed:', error)
    return null
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return { id: row.id as string, display_name: (row.display_name ?? '') as string, luna_code: (row.luna_code ?? code) as string }
}

/** Minimal public profile (display name + LUNA code) for a user. */
export async function fetchPartnerProfile(uid: string): Promise<PartnerProfileLite | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('partner_public_profile', { target_uid: uid })
  if (error) {
    throwIfSetupMissing(error)
    console.error('[LUNA Partner] Partner profile fetch failed:', error)
    return null
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return { id: row.id as string, display_name: (row.display_name ?? '') as string, luna_code: (row.luna_code ?? '') as string }
}

/** Create a pending request from `uid` to `receiverId`. */
export async function sendPartnerRequest(uid: string, receiverId: string): Promise<SendRequestResult> {
  if (!supabase) return { ok: false, message: 'Partner connection is unavailable right now.' }
  const { data, error } = await supabase
    .from('partner_requests')
    .insert({ sender_id: uid, receiver_id: receiverId, status: 'pending' })
    .select()
    .single()
  if (error) {
    throwIfSetupMissing(error)
    if (error.code === '23505') {
      return { ok: false, message: 'A connection request is already waiting for them.' }
    }
    if (error.code === '23514') {
      return { ok: false, message: "You can't connect with yourself." }
    }
    console.error('[LUNA Partner] Send request failed:', error)
    return { ok: false, message: 'LUNA could not send that request. Please try again.' }
  }
  return { ok: true, request: data as PartnerRequestRow }
}

/** Requests sent TO me that are still pending. */
export async function fetchIncomingRequests(uid: string): Promise<PartnerRequestRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('partner_requests')
    .select('*')
    .eq('receiver_id', uid)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) {
    throwIfSetupMissing(error)
    console.error('[LUNA Partner] Incoming request fetch failed:', error)
    return []
  }
  return (data as PartnerRequestRow[]) ?? []
}

/** The pending request I sent, if any. */
export async function fetchOutgoingRequest(uid: string): Promise<PartnerRequestRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('partner_requests')
    .select('*')
    .eq('sender_id', uid)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle()
  if (error) {
    throwIfSetupMissing(error)
    console.error('[LUNA Partner] Outgoing request fetch failed:', error)
    return null
  }
  return (data as PartnerRequestRow) ?? null
}
/** The most recent request I ever sent (used to surface a declined state). */
export async function fetchLatestOutgoingRequest(uid: string): Promise<PartnerRequestRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('partner_requests')
    .select('*')
    .eq('sender_id', uid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    throwIfSetupMissing(error)
    return null
  }
  return (data as PartnerRequestRow) ?? null
}

/** The single active connection I am part of, if any. */
export async function fetchActiveConnection(uid: string): Promise<PartnerConnectionRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('partner_connections')
    .select('*')
    .or(`user_a_id.eq.${uid},user_b_id.eq.${uid}`)
    .eq('status', 'connected')
    .limit(1)
    .maybeSingle()
  if (error) {
    throwIfSetupMissing(error)
    console.error('[LUNA Partner] Connection fetch failed:', error)
    return null
  }
  return (data as PartnerConnectionRow) ?? null
}

/** Atomically accept a request (verified for the receiver by the database). */
export async function acceptPartnerRequest(requestId: string): Promise<RpcResult> {
  if (!supabase) return { ok: false, message: 'Partner connection is unavailable right now.' }
  const { data, error } = await supabase.rpc('accept_partner_request', { request_id: requestId })
  if (error) {
    throwIfSetupMissing(error)
    console.error('[LUNA Partner] Accept failed:', error)
    return { ok: false, message: 'LUNA could not accept that request. Please try again.' }
  }
  const row = Array.isArray(data) ? data[0] : data
  return { ok: true, connectionId: row?.connection_id as string | undefined }
}

/** Decline a request (verified for the receiver by the database). */
export async function declinePartnerRequest(requestId: string): Promise<RpcResult> {
  if (!supabase) return { ok: false, message: 'Partner connection is unavailable right now.' }
  const { error } = await supabase.rpc('decline_partner_request', { request_id: requestId })
  if (error) {
    throwIfSetupMissing(error)
    console.error('[LUNA Partner] Decline failed:', error)
    return { ok: false, message: 'LUNA could not decline that request. Please try again.' }
  }
  return { ok: true }
}

/** Cancel my own pending request. */
export async function cancelPartnerRequest(requestId: string): Promise<RpcResult> {
  if (!supabase) return { ok: false, message: 'Partner connection is unavailable right now.' }
  const { error } = await supabase.rpc('cancel_partner_request', { request_id: requestId })
  if (error) {
    throwIfSetupMissing(error)
    console.error('[LUNA Partner] Cancel failed:', error)
    return { ok: false, message: 'LUNA could not cancel that request. Please try again.' }
  }
  return { ok: true }
}

/** End the active connection (verified for participants by the database). */
export async function disconnectPartnerConnection(): Promise<RpcResult> {
  if (!supabase) return { ok: false, message: 'Partner connection is unavailable right now.' }
  const { error } = await supabase.rpc('disconnect_partner_connection')
  if (error) {
    throwIfSetupMissing(error)
    console.error('[LUNA Partner] Disconnect failed:', error)
    return { ok: false, message: 'LUNA could not disconnect that connection. Please try again.' }
  }
  return { ok: true }
}

/** Fetch the message thread for a connected pair from the database-backed store. */
export async function fetchPartnerMessages(uid: string, partnerId: string): Promise<PartnerThreadMessage[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('partner_messages')
    .select('*')
    .eq('user_id', uid)
    .in('sender_id', [uid, partnerId])
    .order('created_at', { ascending: true })

  if (error) {
    throwIfSetupMissing(error)
    console.error('[LUNA Partner] Message fetch failed:', error)
    return []
  }

  return (data as PartnerThreadMessage[]) ?? []
}

/** Fetch all shared date tickets for a connected pair. */
export async function fetchDateTicketsForConnection(connectionId: string): Promise<DateTicketRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('date_tickets')
    .select('*')
    .eq('connection_id', connectionId)
    .order('planned_on', { ascending: true })

  if (error) {
    throwIfSetupMissing(error)
    console.error('[LUNA Partner] Date ticket fetch failed:', error)
    return []
  }

  return (data as DateTicketRow[]) ?? []
}

/** Save a shared date ticket for the active partner connection. */
export async function createDateTicket(connectionId: string, organizerId: string, input: { title: string; planned_on: string; location?: string; notes?: string; status?: DateTicketRow['status'] }): Promise<DateTicketRow | null> {
  if (!supabase || !input.title.trim()) return null

  const { data, error } = await supabase
    .from('date_tickets')
    .insert({
      connection_id: connectionId,
      organizer_id: organizerId,
      title: input.title.trim(),
      planned_on: input.planned_on,
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
      status: input.status || 'planned',
    })
    .select('*')
    .single()

  if (error) {
    throwIfSetupMissing(error)
    console.error('[LUNA Partner] Date ticket create failed:', error)
    return null
  }

  return data as DateTicketRow | null
}

/** Store a message for both participants so each thread can render the same conversation history. */
export async function sendPartnerMessage(senderId: string, receiverId: string, content: string): Promise<PartnerThreadMessage | null> {
  if (!supabase || !content.trim()) return null

  const trimmed = content.trim()
  const rows = [
    { user_id: receiverId, sender_id: senderId, body: trimmed },
    { user_id: senderId, sender_id: senderId, body: trimmed },
  ]

  const { data, error } = await supabase
    .from('partner_messages')
    .insert(rows)
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    throwIfSetupMissing(error)
    console.error('[LUNA Partner] Message send failed:', error)
    return null
  }

  return (data as PartnerThreadMessage[] | undefined)?.[0] ?? null
}

/**
 * Subscribe to my own request and message events with one shared Realtime channel.
 * - Incoming requests: rows where receiver_id = me.
 * - Outgoing request updates: rows where sender_id = me.
 * - Thread updates: partner_messages rows where user_id = me.
 */
export function subscribePartnerEvents(uid: string, onChange: () => void): () => void {
  if (!supabase) return () => undefined

  const client = supabase
  const channel = client
    .channel(`partner-events-${uid}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'partner_requests', filter: `receiver_id=eq.${uid}` }, onChange)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'partner_requests', filter: `receiver_id=eq.${uid}` }, onChange)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'partner_requests', filter: `sender_id=eq.${uid}` }, onChange)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'partner_messages', filter: `user_id=eq.${uid}` }, onChange)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'partner_messages', filter: `user_id=eq.${uid}` }, onChange)
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}