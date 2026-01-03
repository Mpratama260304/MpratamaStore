"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react"

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentProofs?: { id: string; status: string }[]
}

interface OrderActionsProps {
  order: Order
}

export function OrderActions({ order }: OrderActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(order.status)

  const handleStatusChange = async () => {
    if (selectedStatus === order.status) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update status")
      }

      toast({
        title: "Status Updated",
        description: `Order status changed to ${selectedStatus.replace("_", " ")}`,
        variant: "success",
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprovePayment = async (proofId: string) => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/admin/payments/${proofId}/approve`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to approve payment")
      }

      toast({
        title: "Payment Approved",
        description: "Payment has been verified and order is now paid.",
        variant: "success",
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve payment",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejectPayment = async (proofId: string) => {
    const reason = prompt("Enter rejection reason:")
    if (!reason) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/admin/payments/${proofId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to reject payment")
      }

      toast({
        title: "Payment Rejected",
        description: "Payment proof has been rejected.",
        variant: "success",
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject payment",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const pendingProof = order.paymentProofs?.find((p) => p.status === "PENDING")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Update */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Update Status</label>
          <div className="flex gap-2">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING_PAYMENT">Pending Payment</SelectItem>
                <SelectItem value="PAYMENT_VERIFICATION">Payment Verification</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleStatusChange}
              disabled={isLoading || selectedStatus === order.status}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Payment Actions */}
        {pendingProof && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Verification</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleApprovePayment(pendingProof.id)}
                disabled={isLoading}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleRejectPayment(pendingProof.id)}
                disabled={isLoading}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {order.status === "PAID" && (
          <Button
            variant="legendary"
            className="w-full"
            onClick={() => {
              setSelectedStatus("FULFILLED")
              handleStatusChange()
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Mark as Completed
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
