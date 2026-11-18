import { supabase } from "./supabase"
import { getToken } from "./pin"
import type { ApplicationStatus, JobApplication } from "./types"

// Every call goes through a database function that checks the session token.
// The applications table itself is closed to the public key.

interface Row {
  id: string
  company: string
  role: string
  status: string
  date_applied: string
  notes: string | null
}

function mapRowToApplication(row: Row): JobApplication {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    status: row.status as ApplicationStatus,
    dateAdded: row.date_applied,
    notes: row.notes ?? "",
  }
}

export class LockedError extends Error {
  constructor() {
    super("The tracker is locked")
  }
}

function check(error: { code?: string; message: string } | null) {
  if (!error) return
  if (error.code === "28000" || error.message === "locked") throw new LockedError()
  throw error
}

export async function fetchApplications(): Promise<JobApplication[]> {
  const { data, error } = await supabase.rpc("tracker_list", { p_token: getToken() })
  check(error)
  return ((data ?? []) as Row[]).map(mapRowToApplication)
}

export async function addApplication(
  app: Omit<JobApplication, "id">
): Promise<JobApplication> {
  const { data, error } = await supabase.rpc("tracker_add", {
    p_token: getToken(),
    p_company: app.company,
    p_role: app.role,
    p_status: app.status,
    p_date_applied: app.dateAdded,
    p_notes: app.notes || "",
  })
  check(error)
  return mapRowToApplication(data as Row)
}

export async function deleteApplication(id: string): Promise<void> {
  const { error } = await supabase.rpc("tracker_delete", { p_token: getToken(), p_id: id })
  check(error)
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus
): Promise<void> {
  const { error } = await supabase.rpc("tracker_set_status", {
    p_token: getToken(),
    p_id: id,
    p_status: status,
  })
  check(error)
}
