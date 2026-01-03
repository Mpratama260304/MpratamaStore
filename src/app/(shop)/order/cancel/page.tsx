"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { XCircle, ArrowLeft, RefreshCw, Loader2 } from "lucide-react"

function OrderCancelContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("order_id")

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-lg mx-auto text-center">
        {/* Cancel Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-orange-500/20 flex items-center justify-center">
            <XCircle className="h-12 w-12 text-orange-500" />
          </div>
        </div>

        {/* Cancel Message */}
        <h1 className="text-3xl font-bold mb-2">Payment Cancelled</h1>
        <p className="text-muted-foreground mb-8">
          Your payment was cancelled. Don&apos;t worry, your order is still saved and you can try again.
        </p>

        {/* Info Card */}
        <div className="bg-card border rounded-xl p-6 mb-8 text-left">
          <h3 className="font-semibold mb-2">What happened?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            The payment process was interrupted or cancelled. This could happen if:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-orange-500">•</span>
              You clicked the back button or closed the payment window
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">•</span>
              The session timed out
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">•</span>
              There was a connection issue
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {orderId && (
            <Link href={`/order/${orderId}/payment`}>
              <Button variant="default" className="w-full sm:w-auto">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </Link>
          )}
          <Link href="/cart">
            <Button variant="outline" className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cart
            </Button>
          </Link>
          <Link href="/shop">
            <Button variant="ghost" className="w-full sm:w-auto">
              Continue Shopping
            </Button>
          </Link>
        </div>

        {/* Support Info */}
        <p className="mt-8 text-xs text-muted-foreground">
          Need help? Contact our support team for assistance.
        </p>
      </div>
    </div>
  )
}

export default function OrderCancelPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-500" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    }>
      <OrderCancelContent />
    </Suspense>
  )
}
