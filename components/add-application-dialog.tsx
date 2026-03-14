"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import type { ApplicationStatus, JobApplication } from "@/lib/types"

const statuses: ApplicationStatus[] = ["Shortlisted", "Applied", "Interview", "Offer", "Rejected"]

interface AddApplicationDialogProps {
  onAdd: (application: Omit<JobApplication, "id">) => void
}

export function AddApplicationDialog({ onAdd }: AddApplicationDialogProps) {
  const [open, setOpen] = useState(false)
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [status, setStatus] = useState<ApplicationStatus>("Shortlisted")
  const [dateAdded, setDateAdded] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [notes, setNotes] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!company.trim() || !role.trim()) return

    onAdd({
      company: company.trim(),
      role: role.trim(),
      status,
      dateAdded,
      notes: notes.trim(),
    })

    setCompany("")
    setRole("")
    setStatus("Shortlisted")
    setDateAdded(new Date().toISOString().split("T")[0])
    setNotes("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          Add Application
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Application</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="company">Company</FieldLabel>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="role">Role</FieldLabel>
              <Input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Job title"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="status">Status</FieldLabel>
              <Select
                value={status}
                onValueChange={(val) => setStatus(val as ApplicationStatus)}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="dateAdded">Date Added</FieldLabel>
              <Input
                id="dateAdded"
                type="date"
                value={dateAdded}
                onChange={(e) => setDateAdded(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes..."
                rows={3}
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Application</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
