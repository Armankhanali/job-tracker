import { supabase } from "./supabase"

// The PIN itself is checked in the database (see supabase/pin-lock.sql).
// The browser only ever holds the session token the database hands back.
const TOKEN_KEY = "job-tracker-session"

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function saveToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Private windows can refuse storage; the tracker then asks for the PIN each visit.
  }
}

export interface PinStatus {
  pinSet: boolean
  lockedUntil: string | null
}

export interface PinResult {
  ok: boolean
  error?: string
  lockedUntil?: string
  triesLeft?: number
}

export async function fetchPinStatus(): Promise<PinStatus> {
  const { data, error } = await supabase.rpc("tracker_status")
  if (error) throw error
  return { pinSet: Boolean(data?.pin_set), lockedUntil: data?.locked_until ?? null }
}

async function callPin(fn: "tracker_set_pin" | "tracker_unlock", pin: string): Promise<PinResult> {
  const { data, error } = await supabase.rpc(fn, { p_pin: pin })
  if (error) throw error
  if (data?.ok && data.token) {
    saveToken(data.token)
    return { ok: true }
  }
  return {
    ok: false,
    error: data?.error ?? "Something went wrong",
    lockedUntil: data?.locked_until,
    triesLeft: data?.tries_left,
  }
}

export const setPin = (pin: string) => callPin("tracker_set_pin", pin)
export const unlock = (pin: string) => callPin("tracker_unlock", pin)

export async function lock(): Promise<void> {
  const token = getToken()
  saveToken(null)
  if (token) await supabase.rpc("tracker_lock", { p_token: token })
}

export function forgetToken() {
  saveToken(null)
}
