export type ApplicationStatus = "Shortlisted" | "Applied" | "Interview" | "Offer" | "Rejected"

export interface JobApplication {
  id: string
  company: string
  role: string
  status: ApplicationStatus
  dateAdded: string
  notes: string
}
