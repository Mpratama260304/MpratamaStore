"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { useCart } from "@/hooks/use-cart"
import { useAuth } from "@/hooks/use-auth"
import { formatPrice, getRarityGlow } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import {
  ChevronRight,
  CreditCard,
  Building2,
  Loader2,
  Shield,
  Sparkles,
  ArrowLeft,
  AlertCircle,
} from "lucide-react"

// Payment method types
type PaymentMethodType = "stripe" | "paypal" | "bank_transfer" | ""

// Check if payment methods are configured (via environment)
interface PaymentConfig {
  stripeEnabled: boolean
  paypalEnabled: boolean
  bankTransferEnabled: boolean
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { items, total, clearCart } = useCart()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("") // Default: none selected
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    stripeEnabled: false,
    paypalEnabled: false,
    bankTransferEnabled: true, // Bank transfer always available
  })
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    notes: "",
    agreeTerms: false,
  })

  // Fetch payment configuration
  useEffect(() => {
    const fetchPaymentConfig = async () => {
      try {
        const res = await fetch("/api/settings/payment-methods")
        if (res.ok) {
          const data = await res.json()
          setPaymentConfig(data)
        }
      } catch {
        // Default config if fetch fails
        console.log("Using default payment config")
      }
    }
    fetchPaymentConfig()
  }, [])

  // Redirect if not logged in
  if (!authLoading && !user) {
    router.push("/login?redirect=/checkout")
    return null
  }

  // Redirect if cart is empty
  if (!authLoading && items.length === 0) {
    router.push("/cart")
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.agreeTerms) {
      toast({
        title: "Terms Required",
        description: "Please agree to the terms and conditions.",
        variant: "destructive",
      })
      return
    }

    if (!paymentMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method to continue.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Map payment method to API format
      const apiPaymentMethod = paymentMethod === "bank_transfer" ? "manual" : "gateway"
      const gatewayProvider = paymentMethod === "stripe" ? "stripe" : 
                              paymentMethod === "paypal" ? "paypal" : undefined

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          paymentMethod: apiPaymentMethod,
          gatewayProvider,
          customerEmail: formData.email || user?.email,
          customerName: formData.name || user?.username,
          customerPhone: formData.phone,
          notes: formData.notes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create order")
      }

      clearCart()
      
      // Handle different payment methods
      if (paymentMethod === "bank_transfer") {
        // Bank transfer: go to payment page with bank details
        router.push(`/order/${data.order.id}/payment`)
      } else if (paymentMethod === "stripe") {
        // Stripe: create checkout session and redirect
        try {
          const stripeRes = await fetch("/api/payments/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.order.id }),
          })
          const stripeData = await stripeRes.json()
          
          if (!stripeRes.ok) {
            throw new Error(stripeData.error || "Failed to create Stripe session")
          }
          
          if (stripeData.url) {
            window.location.href = stripeData.url
            return
          }
        } catch (stripeError) {
          toast({
            title: "Stripe Error",
            description: stripeError instanceof Error ? stripeError.message : "Failed to start payment",
            variant: "destructive",
          })
          // Redirect to payment page where they can try again or change method
          router.push(`/order/${data.order.id}/payment`)
          return
        }
      } else if (paymentMethod === "paypal") {
        // PayPal: create order and redirect
        try {
          const paypalRes = await fetch("/api/payments/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.order.id }),
          })
          const paypalData = await paypalRes.json()
          
          if (!paypalRes.ok) {
            throw new Error(paypalData.error || "Failed to create PayPal order")
          }
          
          if (paypalData.approvalUrl) {
            window.location.href = paypalData.approvalUrl
            return
          }
        } catch (paypalError) {
          toast({
            title: "PayPal Error",
            description: paypalError instanceof Error ? paypalError.message : "Failed to start payment",
            variant: "destructive",
          })
          router.push(`/order/${data.order.id}/payment`)
          return
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to place order",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    )
  }

  // Check if any payment method is available
  const hasAnyPaymentMethod = paymentConfig.stripeEnabled || 
                               paymentConfig.paypalEnabled || 
                               paymentConfig.bankTransferEnabled

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/cart" className="hover:text-foreground">Inventory</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Forge Checkout</span>
      </nav>

      <h1 className="text-3xl font-bold mb-8">Forge Checkout</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Contact Info */}
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Contact Information</h2>
              <div className="grid gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={user?.email || "your@email.com"}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Order confirmation will be sent here
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder={user?.username || "Your Name"}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+62 812 3456 7890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Payment Method</h2>
              
              {!hasAnyPaymentMethod ? (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-400">No Payment Methods Available</p>
                    <p className="text-sm text-muted-foreground">
                      Please contact support to enable payment methods.
                    </p>
                  </div>
                </div>
              ) : (
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethodType)}>
                  <div className="space-y-3">
                    {/* Stripe Option */}
                    {paymentConfig.stripeEnabled && (
                      <label
                        className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                          paymentMethod === "stripe"
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-border hover:border-blue-500/50"
                        }`}
                      >
                        <RadioGroupItem value="stripe" id="stripe" />
                        <CreditCard className="h-5 w-5 text-blue-400" />
                        <div className="flex-1">
                          <p className="font-semibold">Credit/Debit Card</p>
                          <p className="text-sm text-muted-foreground">
                            Pay securely with Visa, Mastercard, or other cards via Stripe
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">Instant</Badge>
                      </label>
                    )}
                    
                    {/* PayPal Option */}
                    {paymentConfig.paypalEnabled && (
                      <label
                        className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                          paymentMethod === "paypal"
                            ? "border-yellow-500 bg-yellow-500/10"
                            : "border-border hover:border-yellow-500/50"
                        }`}
                      >
                        <RadioGroupItem value="paypal" id="paypal" />
                        <span className="text-xl">💳</span>
                        <div className="flex-1">
                          <p className="font-semibold">PayPal</p>
                          <p className="text-sm text-muted-foreground">
                            Pay with your PayPal account (amount converted to USD)
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">Instant</Badge>
                      </label>
                    )}
                    
                    {/* Bank Transfer Option */}
                    {paymentConfig.bankTransferEnabled && (
                      <label
                        className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                          paymentMethod === "bank_transfer"
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-border hover:border-purple-500/50"
                        }`}
                      >
                        <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                        <Building2 className="h-5 w-5 text-purple-400" />
                        <div className="flex-1">
                          <p className="font-semibold">Bank Transfer</p>
                          <p className="text-sm text-muted-foreground">
                            Transfer to our bank account and upload payment proof
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">Manual</Badge>
                      </label>
                    )}
                  </div>
                </RadioGroup>
              )}
              
              {/* No method selected warning */}
              {hasAnyPaymentMethod && !paymentMethod && (
                <p className="text-sm text-yellow-400 mt-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Please select a payment method to continue
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Additional Notes</h2>
              <textarea
                className="w-full min-h-[100px] rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="Any special instructions or notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={formData.agreeTerms}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, agreeTerms: checked as boolean })
                }
              />
              <Label htmlFor="terms" className="text-sm text-muted-foreground">
                I agree to the{" "}
                <Link href="/terms" className="text-purple-400 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-purple-400 hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-card border-2 border-purple-500/20 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex gap-3 p-2 rounded-lg bg-secondary/30"
                  >
                    <div className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ${getRarityGlow(item.rarity)}`}>
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                          <Sparkles className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-green-400">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processing Fee</span>
                  <span className="text-green-400">Free</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between text-lg font-bold mb-6">
                <span>Total</span>
                <span className="text-green-400">{formatPrice(total)}</span>
              </div>

              <Button
                type="submit"
                variant="legendary"
                size="lg"
                className="w-full"
                disabled={isSubmitting || !formData.agreeTerms || !paymentMethod}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    {paymentMethod === "stripe" ? "Pay with Card" :
                     paymentMethod === "paypal" ? "Pay with PayPal" :
                     paymentMethod === "bank_transfer" ? "Proceed to Bank Transfer" :
                     "Select Payment Method"}
                  </>
                )}
              </Button>

              <div className="mt-6 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-400" />
                  <span>256-bit SSL encrypted</span>
                </div>
              </div>

              <Link
                href="/cart"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mt-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Inventory
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
