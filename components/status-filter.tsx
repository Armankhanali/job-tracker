"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ApplicationStatus } from "@/lib/types"

const statuses: ApplicationStatus[] = ["Shortlisted", "Applied", "Interview", "Offer", "Rejected"]

interface StatusFilterProps {
  value: ApplicationStatus | "All"
  onChange: (value: ApplicationStatus | "All") => void
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="All">All Status</SelectItem>
        {statuses.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
