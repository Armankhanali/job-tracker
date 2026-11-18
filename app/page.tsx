import { AuthGate } from "@/components/auth-gate"
import { JobTrackerDashboard } from "@/components/job-tracker-dashboard"

export default function Page() {
  return (
    <AuthGate>
      <JobTrackerDashboard />
    </AuthGate>
  )
}
