import { PinGate } from "@/components/pin-gate"
import { JobTrackerDashboard } from "@/components/job-tracker-dashboard"

export default function Page() {
  return (
    <PinGate>
      <JobTrackerDashboard />
    </PinGate>
  )
}
