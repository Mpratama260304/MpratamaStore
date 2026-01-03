"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, Package, ArrowRight, Sparkles } from "lucide-react"

interface Order {
  id: string
  orderNumber: string
  total: number
  status: string
  items: Array<{
    productName: string
    quantity: number
  }>
}

function OrderSuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("order_id")
  const sessionId = searchParams.get("session_id")
  
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError("Order ID not found")
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/orders/${orderId}`)
        if (response.ok) {
          const data = await response.json()
          setOrder(data.order)
        } else {
          setError("Failed to fetch order details")
        }
      } catch (err) {
        console.error("Error fetching order:", err)
        setError("Failed to fetch order details")
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-500" />
        <p className="mt-4 text-muted-foreground">Loading order details...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <p className="text-muted-foreground mb-6">{error || "Unable to find your order."}</p>
          <Link href="/account/orders">
            <Button>View All Orders</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-lg mx-auto text-center">
        {/* Success Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <Sparkles className="absolute top-0 right-1/3 h-6 w-6 text-yellow-500 animate-pulse" />
          <Sparkles className="absolute bottom-0 left-1/3 h-4 w-4 text-purple-500 animate-pulse delay-150" />
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-muted-foreground mb-8">
          Thank you for your purchase. Your order has been confirmed.
        </p>

        {/* Order Details Card */}
        <div className="bg-card border rounded-xl p-6 mb-8 text-left">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">Order Number</span>
            <span className="font-mono font-bold text-purple-400">{order.orderNumber}</span>
          </div>
          
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">Items purchased:</p>
            <ul className="space-y-2">
              {order.items.map((item, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>{item.productName}</span>
                  <span className="text-muted-foreground">×{item.quantity}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t mt-4 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                {order.status === "PAID" ? "Paid" : order.status}
              </span>
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6 mb-8">
          <h3 className="font-semibold mb-2">What happens next?</h3>
          <p className="text-sm text-muted-foreground">
            Your digital products are now available in your account. 
            You can download them from your orders page.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={`/order/${order.id}`}>
            <Button variant="default" className="w-full sm:w-auto">
              View Order Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/account/orders">
            <Button variant="outline" className="w-full sm:w-auto">
              All Orders
            </Button>
          </Link>
          <Link href="/shop">
            <Button variant="ghost" className="w-full sm:w-auto">
              Continue Shopping
            </Button>
          </Link>
        </div>

        {/* Session ID for reference */}
        {sessionId && (
          <p className="mt-8 text-xs text-muted-foreground">
            Reference: {sessionId.slice(0, 20)}...
          </p>
        )}
      </div>
    </div>
  )
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-500" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  )
}
