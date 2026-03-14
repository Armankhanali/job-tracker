import type { JobApplication } from "./types"

const STORAGE_KEY = "job-applications"

export function getApplications(): JobApplication[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : []
}

export function saveApplications(applications: JobApplication[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications))
}
