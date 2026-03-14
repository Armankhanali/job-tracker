"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type SortOption = "date-desc" | "date-asc" | "company-asc" | "company-desc" | "status"

interface SortSelectProps {
  value: SortOption
  onChange: (value: SortOption) => void
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortOption)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="date-desc">Date (Newest)</SelectItem>
        <SelectItem value="date-asc">Date (Oldest)</SelectItem>
        <SelectItem value="company-asc">Company (A-Z)</SelectItem>
        <SelectItem value="company-desc">Company (Z-A)</SelectItem>
        <SelectItem value="status">Status</SelectItem>
      </SelectContent>
    </Select>
  )
}
