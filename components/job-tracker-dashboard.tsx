"use client"

import { useState, useEffect, useMemo } from "react"
import { BriefcaseIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddApplicationDialog } from "@/components/add-application-dialog"
import { StatusFilter } from "@/components/status-filter"
import { SortSelect, type SortOption } from "@/components/sort-select"
import { ApplicationsTable } from "@/components/applications-table"
import { getApplications, saveApplications } from "@/lib/store"
import type { ApplicationStatus, JobApplication } from "@/lib/types"

export function JobTrackerDashboard() {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "All">("All")
  const [sortBy, setSortBy] = useState<SortOption>("date-desc")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setApplications(getApplications())
  }, [])

  useEffect(() => {
    if (mounted) {
      saveApplications(applications)
    }
  }, [applications, mounted])

  const statusOrder: Record<ApplicationStatus, number> = {
    Shortlisted: 0,
    Applied: 1,
    Interview: 2,
    Offer: 3,
    Rejected: 4,
  }

  const filteredAndSortedApplications = useMemo(() => {
    let result = statusFilter === "All" 
      ? [...applications] 
      : applications.filter((app) => app.status === statusFilter)

    switch (sortBy) {
      case "date-desc":
        result.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
        break
      case "date-asc":
        result.sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime())
        break
      case "company-asc":
        result.sort((a, b) => a.company.localeCompare(b.company))
        break
      case "company-desc":
        result.sort((a, b) => b.company.localeCompare(a.company))
        break
      case "status":
        result.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
        break
    }

    return result
  }, [applications, statusFilter, sortBy])

  function handleAddApplication(newApp: Omit<JobApplication, "id">) {
    const application: JobApplication = {
      ...newApp,
      id: crypto.randomUUID(),
    }
    setApplications((prev) => [application, ...prev])
  }

  function handleDeleteApplication(id: string) {
    setApplications((prev) => prev.filter((app) => app.id !== id))
  }

  const stats = useMemo(() => {
    return {
      total: applications.length,
      shortlisted: applications.filter((a) => a.status === "Shortlisted").length,
      applied: applications.filter((a) => a.status === "Applied").length,
      interview: applications.filter((a) => a.status === "Interview").length,
      offer: applications.filter((a) => a.status === "Offer").length,
      rejected: applications.filter((a) => a.status === "Rejected").length,
    }
  }, [applications])

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground">
              <BriefcaseIcon className="h-5 w-5 text-background" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {"Arman's Job Application Tracker"}
            </h1>
          </div>
        </header>

        <div className="grid gap-4 mb-8 grid-cols-2 sm:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Shortlisted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-violet-600">{stats.shortlisted}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Interviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-amber-600">{stats.interview}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Offers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-emerald-600">{stats.offer}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-rose-600">{stats.rejected}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Applications</CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SortSelect value={sortBy} onChange={setSortBy} />
              <StatusFilter value={statusFilter} onChange={setStatusFilter} />
              <AddApplicationDialog onAdd={handleAddApplication} />
            </div>
          </CardHeader>
          <CardContent>
            <ApplicationsTable applications={filteredAndSortedApplications} onDelete={handleDeleteApplication} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
