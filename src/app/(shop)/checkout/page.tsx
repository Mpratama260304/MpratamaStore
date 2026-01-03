"use client"

import { useState } from "react"
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
} from "lucide-react"

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { items, total, clearCart } = useCart()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("manual")
  const [gatewayProvider, setGatewayProvider] = useState<"midtrans" | "stripe">("stripe")
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    notes: "",
    agreeTerms: false,
  })

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

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          paymentMethod,
          gatewayProvider: paymentMethod === "gateway" ? gatewayProvider : undefined,
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
      
      if (paymentMethod === "manual") {
        router.push(`/order/${data.order.id}/payment`)
      } else if (paymentMethod === "gateway") {
        // Handle payment gateway based on provider
        if (gatewayProvider === "stripe") {
          // Create Stripe checkout session
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
              title: "Payment Error",
              description: stripeError instanceof Error ? stripeError.message : "Failed to start payment",
              variant: "destructive",
            })
            router.push(`/order/${data.order.id}/payment`)
            return
          }
        } else if (data.paymentUrl) {
          // Midtrans or other gateway
          window.location.href = data.paymentUrl
        } else {
          router.push(`/order/${data.order.id}`)
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
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="space-y-3">
                  <label
                    className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === "manual"
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-border hover:border-purple-500/50"
                    }`}
                  >
                    <RadioGroupItem value="manual" id="manual" />
                    <Building2 className="h-5 w-5 text-purple-400" />
                    <div className="flex-1">
                      <p className="font-semibold">Manual Bank Transfer</p>
                      <p className="text-sm text-muted-foreground">
                        Transfer to our bank account and upload proof
                      </p>
                    </div>
                  </label>
                  
                  <label
                    className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === "gateway"
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-border hover:border-purple-500/50"
                    }`}
                  >
                    <RadioGroupItem value="gateway" id="gateway" />
                    <CreditCard className="h-5 w-5 text-blue-400" />
                    <div className="flex-1">
                      <p className="font-semibold">Payment Gateway</p>
                      <p className="text-sm text-muted-foreground">
                        Pay instantly with credit card, e-wallet, or virtual account
                      </p>
                    </div>
                  </label>
                </div>
              </RadioGroup>

              {/* Gateway Provider Selection */}
              {paymentMethod === "gateway" && (
                <div className="mt-4 pl-4 border-l-2 border-purple-500/30">
                  <p className="text-sm font-medium mb-3 text-muted-foreground">Select payment provider:</p>
                  <RadioGroup 
                    value={gatewayProvider} 
                    onValueChange={(v) => setGatewayProvider(v as "midtrans" | "stripe")}
                  >
                    <div className="space-y-2">
                      <label
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          gatewayProvider === "stripe"
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-border hover:border-blue-500/50"
                        }`}
                      >
                        <RadioGroupItem value="stripe" id="stripe" />
                        <div className="flex-1">
                          <p className="font-medium">Stripe</p>
                          <p className="text-xs text-muted-foreground">
                            Credit/Debit Card (Visa, Mastercard, etc.)
                          </p>
                        </div>
                      </label>
                      <label
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-not-allowed opacity-50 ${
                          gatewayProvider === "midtrans"
                            ? "border-green-500 bg-green-500/10"
                            : "border-border"
                        }`}
                      >
                        <RadioGroupItem value="midtrans" id="midtrans" disabled />
                        <div className="flex-1">
                          <p className="font-medium">Midtrans</p>
                          <p className="text-xs text-muted-foreground">
                            GoPay, OVO, Bank Transfer VA
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">Soon</Badge>
                      </label>
                    </div>
                  </RadioGroup>
                </div>
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
                disabled={isSubmitting || !formData.agreeTerms}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Place Order
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
