"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { CreditCard, Eye, Check, X, AlertCircle, Clock } from "lucide-react"
import { formatPrice, formatDate } from "@/lib/utils"

interface PaymentProof {
  id: string
  proofUrl: string
  notes: string | null
  status: "SUBMITTED" | "APPROVED" | "REJECTED"
  createdAt: string
  order: {
    id: string
    orderNumber: string
    total: number
    user: {
      email: string
      username: string | null
    }
  }
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentProof[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchPayments = async () => {
    try {
      const res = await fetch("/api/admin/payments")
      if (res.ok) {
        const data = await res.json()
        setPayments(data.payments)
      }
    } catch (error) {
      console.error("Failed to fetch payments:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const handleApprove = async (id: string) => {
    setProcessing(id)
    try {
      const res = await fetch(`/api/admin/payments/${id}/approve`, {
        method: "POST",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to approve payment")
      }

      toast({
        title: "Payment approved",
        description: "The payment has been approved and order is now processing.",
      })

      setSelectedProof(null)
      fetchPayments()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (id: string, reason?: string) => {
    setProcessing(id)
    try {
      const res = await fetch(`/api/admin/payments/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "Payment proof rejected" }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to reject payment")
      }

      toast({
        title: "Payment rejected",
        description: "The payment has been rejected.",
      })

      setSelectedProof(null)
      fetchPayments()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="warning"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>
      case "APPROVED":
        return <Badge variant="success"><Check className="mr-1 h-3 w-3" /> Approved</Badge>
      case "REJECTED":
        return <Badge variant="destructive"><X className="mr-1 h-3 w-3" /> Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const pendingPayments = payments.filter(p => p.status === "SUBMITTED")
  const processedPayments = payments.filter(p => p.status !== "SUBMITTED")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Payment Verification</h1>
        <p className="text-muted-foreground">Review and verify manual payment proofs</p>
      </div>

      {/* Pending Payments */}
      <Card className="bg-card/50 border-yellow-900/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            Pending Verification
          </CardTitle>
          <CardDescription>
            {pendingPayments.length} payment{pendingPayments.length !== 1 ? "s" : ""} awaiting verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : pendingPayments.length === 0 ? (
            <div className="text-center py-8">
              <Check className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-muted-foreground">All payments have been verified!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${payment.order.id}`}
                        className="font-mono text-purple-400 hover:underline"
                      >
                        {payment.order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.order.user.username || "—"}</p>
                        <p className="text-sm text-muted-foreground">{payment.order.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-green-400">
                      {formatPrice(payment.order.total)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(payment.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedProof(payment)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApprove(payment.id)}
                          disabled={processing === payment.id}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleReject(payment.id)}
                          disabled={processing === payment.id}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Processed Payments */}
      <Card className="bg-card/50 border-purple-900/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-purple-400" />
            Recent History
          </CardTitle>
          <CardDescription>
            Recently processed payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : processedPayments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No processed payments yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedPayments.slice(0, 10).map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${payment.order.id}`}
                        className="font-mono text-purple-400 hover:underline"
                      >
                        {payment.order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {payment.order.user.username || payment.order.user.email}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(payment.order.total)}
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(payment.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Proof Review Dialog */}
      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Payment Proof</DialogTitle>
            <DialogDescription>
              Order: {selectedProof?.order.orderNumber} • Amount: {selectedProof ? formatPrice(selectedProof.order.total) : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedProof && (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black/50 rounded-lg overflow-hidden">
                <Image
                  src={selectedProof.proofUrl}
                  alt="Payment proof"
                  fill
                  className="object-contain"
                />
              </div>

              {selectedProof.notes && (
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm font-medium mb-1">Customer Notes:</p>
                  <p className="text-muted-foreground">{selectedProof.notes}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedProof.id)}
                  disabled={processing === selectedProof.id}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(selectedProof.id)}
                  disabled={processing === selectedProof.id}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
