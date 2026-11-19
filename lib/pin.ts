import { supabase } from "./supabase"

// The PIN is checked in the database (see the tracker_* functions in
// Supabase). The browser only keeps the session token that a correct PIN
// returns, so the tracker stays unlocked on this device for up to 30 days.

const TOKEN_KEY = "tracker-session-token"

export function loadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function saveToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Storage unavailable (private mode): the tracker stays unlocked until reload.
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nothing to clear.
  }
}

export type TrackerStatus = {
  pin_set: boolean
  locked_until: string | null
}

export type PinResult = {
  ok: boolean
  token?: string
  error?: string
  locked_until?: string
  tries_left?: number
}

export async function getTrackerStatus(): Promise<TrackerStatus> {
  const { data, error } = await supabase.rpc("tracker_status")
  if (error) throw error
  return data as TrackerStatus
}

export async function createPin(pin: string): Promise<PinResult> {
  const { data, error } = await supabase.rpc("tracker_set_pin", { p_pin: pin })
  if (error) throw error
  return data as PinResult
}

export async function unlockWithPin(pin: string): Promise<PinResult> {
  const { data, error } = await supabase.rpc("tracker_unlock", { p_pin: pin })
  if (error) throw error
  return data as PinResult
}

export async function endSession(token: string): Promise<void> {
  const { error } = await supabase.rpc("tracker_lock", { p_token: token })
  if (error) throw error
}
