import { supabase } from "./supabase"
import type { ApplicationStatus, JobApplication } from "./types"

function mapRowToApplication(row: {
  id: string
  company: string
  role: string
  status: string
  date_applied: string
  notes: string | null
}): JobApplication {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    status: row.status as ApplicationStatus,
    dateAdded: row.date_applied,
    notes: row.notes ?? "",
  }
}

export async function fetchApplications(): Promise<JobApplication[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const err = new Error("Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY")
    console.error("[Supabase fetchApplications]", err.message)
    throw err
  }
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[Supabase fetchApplications] Error:", error)
    console.error("[Supabase fetchApplications] Full error object:", JSON.stringify(error, null, 2))
    throw error
  }
  return (data ?? []).map(mapRowToApplication)
}

export async function addApplication(
  app: Omit<JobApplication, "id">
): Promise<JobApplication> {
  const id = crypto.randomUUID()
  const { data, error } = await supabase
    .from("applications")
    .insert({
      id,
      company: app.company,
      role: app.role,
      status: app.status,
      date_applied: app.dateAdded,
      notes: app.notes || null,
    })
    .select()
    .single()

  if (error) throw error
  return mapRowToApplication(data)
}

export async function deleteApplication(id: string): Promise<void> {
  const { error } = await supabase.from("applications").delete().eq("id", id)
  if (error) throw error
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus
): Promise<void> {
  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", id)
  if (error) throw error
}
