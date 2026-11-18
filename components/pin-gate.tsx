"use client"

import { useEffect, useState } from "react"
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
import { fetchPinStatus, getToken, setPin, unlock } from "@/lib/pin"

export const LOCKED_EVENT = "job-tracker-locked"

// Shows the tracker only after the PIN is entered. The PIN is checked by the
// database, which also keeps the applications closed to everyone else.
export function PinGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null)

  useEffect(() => {
    setUnlocked(Boolean(getToken()))
    const onLocked = () => setUnlocked(false)
    window.addEventListener(LOCKED_EVENT, onLocked)
    return () => window.removeEventListener(LOCKED_EVENT, onLocked)
  }, [])

  if (unlocked === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!unlocked) return <PinForm onUnlocked={() => setUnlocked(true)} />
  return <>{children}</>
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function PinForm({ onUnlocked }: { onUnlocked: () => void }) {
  const [pinSet, setPinSet] = useState<boolean | null>(null)
  const [pin, setPinValue] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPinStatus()
      .then((s) => {
        setPinSet(s.pinSet)
        if (s.lockedUntil) setError(`Too many wrong tries. Try again after ${formatTime(s.lockedUntil)}.`)
      })
      .catch(() => setError("Couldn't reach the tracker. Try again in a moment."))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!pinSet && pin !== confirm) {
      setError("The two PINs don't match.")
      return
    }
    setBusy(true)
    try {
      const result = pinSet ? await unlock(pin) : await setPin(pin)
      if (result.ok) {
        onUnlocked()
        return
      }
      if (result.lockedUntil) {
        setError(`Too many wrong tries. Try again after ${formatTime(result.lockedUntil)}.`)
      } else if (result.triesLeft !== undefined) {
        setError(`Wrong PIN. ${result.triesLeft} ${result.triesLeft === 1 ? "try" : "tries"} left before a lockout.`)
      } else {
        setError(result.error ?? "Something went wrong")
        if (result.error === "A PIN is already set.") setPinSet(true)
      }
      setPinValue("")
      setConfirm("")
    } catch {
      setError("Couldn't reach the tracker. Try again in a moment.")
    } finally {
      setBusy(false)
    }
  }

  const pinInput = (id: string, value: string, onChange: (v: string) => void, label: string) => (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        pattern="[0-9]{6,12}"
        minLength={6}
        maxLength={12}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        required
      />
    </Field>
  )

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground">
              <BriefcaseIcon className="h-5 w-5 text-background" />
            </div>
            <CardTitle className="text-lg">
              {pinSet === false ? "Choose your PIN" : "Enter your PIN"}
            </CardTitle>
          </div>
          <CardDescription>
            {pinSet === false
              ? "Pick a PIN of 6 to 12 digits. You'll use it to open the tracker."
              : "Arman's Job Application Tracker is private."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pinSet === null && !error ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <FieldGroup className="gap-4">
                {pinInput("pin", pin, setPinValue, "PIN")}
                {pinSet === false && pinInput("confirm", confirm, setConfirm, "Type it again")}
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={busy || pinSet === null}>
                  {busy ? "Please wait..." : pinSet === false ? "Set PIN" : "Unlock"}
                </Button>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
