"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollText, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string | null
  description: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: {
    email: string
    username: string | null
  } | null
}

interface PaginatedLogs {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const actionColors: Record<string, string> = {
  LOGIN: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  LOGOUT: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  REGISTER: "bg-green-500/20 text-green-400 border-green-500/30",
  ORDER_CREATED: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  PAYMENT_APPROVED: "bg-green-500/20 text-green-400 border-green-500/30",
  PAYMENT_REJECTED: "bg-red-500/20 text-red-400 border-red-500/30",
  PRODUCT_CREATED: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  PRODUCT_UPDATED: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  PRODUCT_DELETED: "bg-red-500/20 text-red-400 border-red-500/30",
  CATEGORY_CREATED: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  CATEGORY_UPDATED: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  CATEGORY_DELETED: "bg-red-500/20 text-red-400 border-red-500/30",
  TAG_CREATED: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  TAG_UPDATED: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  TAG_DELETED: "bg-red-500/20 text-red-400 border-red-500/30",
  SETTINGS_UPDATED: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  ORDER_STATUS_CHANGED: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  DOWNLOAD: "bg-blue-500/20 text-blue-400 border-blue-500/30",
}

export default function AdminAuditLogPage() {
  const [data, setData] = useState<PaginatedLogs | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      })
      if (search) params.set("search", search)
      if (actionFilter !== "all") params.set("action", actionFilter)

      const res = await fetch(`/api/admin/audit-log?${params}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, actionFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchLogs()
  }

  const uniqueActions = [
    "LOGIN", "LOGOUT", "REGISTER",
    "ORDER_CREATED", "ORDER_STATUS_CHANGED",
    "PAYMENT_APPROVED", "PAYMENT_REJECTED",
    "PRODUCT_CREATED", "PRODUCT_UPDATED", "PRODUCT_DELETED",
    "CATEGORY_CREATED", "CATEGORY_UPDATED", "CATEGORY_DELETED",
    "TAG_CREATED", "TAG_UPDATED", "TAG_DELETED",
    "SETTINGS_UPDATED", "DOWNLOAD",
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Audit Log</h1>
        <p className="text-muted-foreground">Track all system activities and changes</p>
      </div>

      <Card className="bg-card/50 border-purple-900/30">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-purple-400" />
                Activity History
              </CardTitle>
              <CardDescription>
                {data?.total || 0} total events
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-48"
                />
                <Button type="submit" variant="secondary" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </form>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data || data.logs.length === 0 ? (
            <div className="text-center py-12">
              <ScrollText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No audit logs found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={actionColors[log.action] || ""}
                        >
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.user ? (
                          <div>
                            <p className="font-medium">{log.user.username || "—"}</p>
                            <p className="text-xs text-muted-foreground">{log.user.email}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {log.description || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.entityType && (
                          <span className="font-mono text-xs">
                            {log.entityType}
                            {log.entityId && ` #${log.entityId.slice(0, 8)}`}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {data.page} of {data.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                      disabled={page === data.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
