import { cn } from "@/lib/utils"
import type { ApplicationStatus } from "@/lib/types"

const statusStyles: Record<ApplicationStatus, string> = {
  Shortlisted: "bg-violet-100 text-violet-700 border-violet-200",
  Applied: "bg-sky-100 text-sky-700 border-sky-200",
  Interview: "bg-amber-100 text-amber-700 border-amber-200",
  Offer: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-100 text-rose-700 border-rose-200",
}

interface StatusBadgeProps {
  status: ApplicationStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status]
      )}
    >
      {status}
    </span>
  )
}
