"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { BriefcaseIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  clearToken,
  createPin,
  endSession,
  getTrackerStatus,
  loadToken,
  saveToken,
  unlockWithPin,
} from "@/lib/pin"

// Shows the tracker only after the PIN is entered. The PIN is checked in the
// database, and the applications table can only be reached through functions
// that require the session token a correct PIN returns.

type TrackerSession = {
  token: string
  // Ends the session in the database and returns to the PIN screen.
  lock: () => Promise<void>
  // Returns to the PIN screen when the database says the session is over.
  expire: () => void
}

const TrackerSessionContext = createContext<TrackerSession | null>(null)

export function useTrackerSession(): TrackerSession {
  const session = useContext(TrackerSessionContext)
  if (!session) throw new Error("useTrackerSession must be used inside PinGate")
  return session
}

export function PinGate({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    setToken(loadToken())
    setChecking(false)
  }, [])

  const expire = useCallback(() => {
    clearToken()
    setToken(null)
  }, [])

  const lock = useCallback(async () => {
    const current = token
    expire()
    if (current) {
      try {
        await endSession(current)
      } catch {
        // The token is already gone from this device; nothing else to do.
      }
    }
  }, [token, expire])

  if (checking) return <Centered>Loading...</Centered>

  if (!token) {
    return (
      <PinScreen
        onUnlocked={(newToken) => {
          saveToken(newToken)
          setToken(newToken)
        }}
      />
    )
  }

  return (
    <TrackerSessionContext.Provider value={{ token, lock, expire }}>
      <div key={token}>{children}</div>
    </TrackerSessionContext.Provider>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <p className="text-muted-foreground">{children}</p>
    </div>
  )
}

function formatLockout(until: string) {
  return new Date(until).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function PinScreen({ onUnlocked }: { onUnlocked: (token: string) => void }) {
  const [mode, setMode] = useState<"loading" | "create" | "enter">("loading")
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    getTrackerStatus()
      .then((status) => {
        setMode(status.pin_set ? "enter" : "create")
        if (status.locked_until) {
          setError(`Too many wrong tries. Try again after ${formatLockout(status.locked_until)}.`)
        }
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Could not reach the tracker"))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^[0-9]{6,12}$/.test(pin)) {
      setError("The PIN must be 6 to 12 digits.")
      return
    }
    if (mode === "create" && pin !== confirmPin) {
      setError("The two PINs don't match.")
      return
    }
    setBusy(true)
    try {
      const result = mode === "create" ? await createPin(pin) : await unlockWithPin(pin)
      if (result.ok && result.token) {
        onUnlocked(result.token)
        return
      }
      if (result.error === "A PIN is already set.") {
        setMode("enter")
        setConfirmPin("")
      }
      if (result.locked_until) {
        setError(`Too many wrong tries. Try again after ${formatLockout(result.locked_until)}.`)
      } else if (typeof result.tries_left === "number") {
        setError(
          `Wrong PIN. ${result.tries_left} ${result.tries_left === 1 ? "try" : "tries"} left before a lockout.`
        )
      } else {
        setError(result.error ?? "Something went wrong")
      }
      setPin("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  if (loadError) return <Centered>{loadError}</Centered>
  if (mode === "loading") return <Centered>Loading...</Centered>

  const creating = mode === "create"

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground">
              <BriefcaseIcon className="h-5 w-5 text-background" />
            </div>
            <CardTitle className="text-lg">{creating ? "Create your PIN" : "Enter your PIN"}</CardTitle>
          </div>
          <CardDescription>
            {creating
              ? "Choose a 6 to 12 digit PIN. You'll use it to open the tracker from now on."
              : "Arman's Job Application Tracker is private."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="pin">PIN</FieldLabel>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete={creating ? "new-password" : "current-password"}
                  maxLength={12}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                  required
                />
              </Field>
              {creating && (
                <Field>
                  <FieldLabel htmlFor="confirm-pin">Confirm PIN</FieldLabel>
                  <Input
                    id="confirm-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={12}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </Field>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={busy}>
                {busy ? "Please wait..." : creating ? "Create PIN" : "Unlock"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
