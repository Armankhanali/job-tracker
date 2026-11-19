import { supabase } from "./supabase"
import type { ApplicationStatus, JobApplication } from "./types"

// Every call goes through a database function that first checks the PIN
// session token. The applications table itself can't be read or changed with
// the site's public key.

type ApplicationRow = {
  id: string
  company: string
  role: string
  status: string
  date_applied: string
  notes: string | null
}

// Thrown when the session token is missing, expired or ended with "Lock".
export class TrackerLockedError extends Error {
  constructor() {
    super("The tracker is locked. Enter your PIN again.")
    this.name = "TrackerLockedError"
  }
}

function check(error: { code?: string; message: string } | null) {
  if (!error) return
  if (error.code === "28000") throw new TrackerLockedError()
  throw new Error(error.message)
}

function mapRowToApplication(row: ApplicationRow): JobApplication {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    status: row.status as ApplicationStatus,
    dateAdded: row.date_applied,
    notes: row.notes ?? "",
  }
}

export async function fetchApplications(token: string): Promise<JobApplication[]> {
  const { data, error } = await supabase.rpc("tracker_list", { p_token: token })
  check(error)
  return ((data ?? []) as ApplicationRow[]).map(mapRowToApplication)
}

export async function addApplication(
  token: string,
  app: Omit<JobApplication, "id">
): Promise<JobApplication> {
  const { data, error } = await supabase.rpc("tracker_add", {
    p_token: token,
    p_company: app.company,
    p_role: app.role,
    p_status: app.status,
    p_date_applied: app.dateAdded,
    p_notes: app.notes,
  })
  check(error)
  return mapRowToApplication(data as ApplicationRow)
}

export async function deleteApplication(token: string, id: string): Promise<void> {
  const { error } = await supabase.rpc("tracker_delete", { p_token: token, p_id: id })
  check(error)
}

export async function updateApplicationStatus(
  token: string,
  id: string,
  status: ApplicationStatus
): Promise<void> {
  const { error } = await supabase.rpc("tracker_set_status", {
    p_token: token,
    p_id: id,
    p_status: status,
  })
  check(error)
}
