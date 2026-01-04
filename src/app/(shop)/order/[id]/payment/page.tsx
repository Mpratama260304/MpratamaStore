"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAuth } from "@/hooks/use-auth"
import { formatPrice } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import {
  ChevronRight,
  Copy,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Building2,
  Sparkles,
  CreditCard,
  RefreshCw,
  XCircle,
} from "lucide-react"

interface Order {
  id: string
  orderNumber: string
  total: number
  currency: string
  status: string
  paymentMethod: string // "STRIPE" | "PAYPAL" | "BANK_TRANSFER" | etc.
  paymentStatus?: string // "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "EXPIRED"
  paymentLastError?: string | null
  gatewayProvider?: string | null
  items: Array<{
    id: string
    productName: string
    productPrice: number
    quantity: number
    product?: {
      images?: { url: string }[]
      rarity: string
    }
  }>
  paymentProofs?: Array<{
    id: string
    status: string
    createdAt: string
  }>
}

interface ManualAccount {
  bank: string
  accountNumber: string
  accountName: string
}

interface PaymentSettings {
  mode: string
  manualAccounts?: ManualAccount[]
  manualInstructions?: string
}

interface PaymentConfig {
  stripeEnabled: boolean
  paypalEnabled: boolean
  bankTransferEnabled: boolean
}

export default function OrderPaymentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null)
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    stripeEnabled: false,
    paypalEnabled: false,
    bankTransferEnabled: true,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showChangeMethod, setShowChangeMethod] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Handle return messages from payment gateways
  useEffect(() => {
    const stripeStatus = searchParams.get("stripe")
    const paypalStatus = searchParams.get("paypal")
    
    if (stripeStatus === "cancelled") {
      toast({
        title: "Payment Cancelled",
        description: "You cancelled the Stripe payment. You can try again or choose another method.",
        variant: "default",
      })
    }
    
    if (paypalStatus === "cancelled") {
      toast({
        title: "Payment Cancelled",
        description: "You cancelled the PayPal payment. You can try again or choose another method.",
        variant: "default",
      })
    } else if (paypalStatus === "failed") {
      toast({
        title: "Payment Failed",
        description: "PayPal payment could not be completed. Please try again.",
        variant: "destructive",
      })
    } else if (paypalStatus === "error") {
      toast({
        title: "Payment Error",
        description: "An error occurred with PayPal. Please try again.",
        variant: "destructive",
      })
    }
  }, [searchParams])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orderRes, settingsRes, configRes] = await Promise.all([
          fetch(`/api/orders/${params.id}`),
          fetch("/api/settings/payment"),
          fetch("/api/settings/payment-methods"),
        ])

        if (orderRes.ok) {
          const { order } = await orderRes.json()
          setOrder(order)
          // Set initial selected method based on order's current payment method
          const method = getCurrentMethodFromOrder(order)
          setSelectedMethod(method)
        }

        if (settingsRes.ok) {
          const { settings } = await settingsRes.json()
          setPaymentSettings(settings)
        }
        
        if (configRes.ok) {
          const config = await configRes.json()
          setPaymentConfig(config)
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.id])

  // Helper to determine current payment method from order
  const getCurrentMethodFromOrder = (ord: Order): "stripe" | "paypal" | "bank_transfer" => {
    const method = ord.paymentMethod?.toUpperCase()
    if (method === "STRIPE") return "stripe"
    if (method === "PAYPAL") return "paypal"
    if (method === "BANK_TRANSFER" || method === "MANUAL_TRANSFER") return "bank_transfer"
    // Fallback: check gatewayProvider
    const gateway = ord.gatewayProvider?.toUpperCase()
    if (gateway === "STRIPE") return "stripe"
    if (gateway === "PAYPAL") return "paypal"
    return "bank_transfer"
  }

  // Determine current payment method display
  const getCurrentMethod = (): "stripe" | "paypal" | "bank_transfer" => {
    if (!order) return "bank_transfer"
    return getCurrentMethodFromOrder(order)
  }

  // Change payment method
  const handleChangeMethod = async () => {
    if (!order || !selectedMethod) return
    
    setIsProcessing(true)
    try {
      const response = await fetch("/api/payments/change-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          newMethod: selectedMethod,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to change payment method")
      }

      // Refresh order data
      const orderRes = await fetch(`/api/orders/${params.id}`)
      if (orderRes.ok) {
        const { order: updatedOrder } = await orderRes.json()
        setOrder(updatedOrder)
      }

      setShowChangeMethod(false)
      toast({
        title: "Payment Method Changed",
        description: "Your payment method has been updated.",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change payment method",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Pay with Stripe
  const handleStripePayment = async () => {
    if (!order) return
    
    setIsProcessing(true)
    try {
      const response = await fetch("/api/payments/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to create Stripe session")
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      toast({
        title: "Stripe Error",
        description: error instanceof Error ? error.message : "Failed to start Stripe payment",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Pay with PayPal
  const handlePayPalPayment = async () => {
    if (!order) return
    
    setIsProcessing(true)
    try {
      const response = await fetch("/api/payments/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to create PayPal order")
      }

      if (data.approvalUrl) {
        window.location.href = data.approvalUrl
      }
    } catch (error) {
      toast({
        title: "PayPal Error",
        description: error instanceof Error ? error.message : "Failed to start PayPal payment",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 5MB",
          variant: "destructive",
        })
        return
      }

      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !order) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("orderId", order.id)

      const response = await fetch("/api/orders/payment-proof", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Upload failed")
      }

      toast({
        title: "Proof Uploaded",
        description: "Your payment proof has been submitted for verification.",
        variant: "success",
      })

      // Refresh order data
      const orderRes = await fetch(`/api/orders/${params.id}`)
      if (orderRes.ok) {
        const { order: updatedOrder } = await orderRes.json()
        setOrder(updatedOrder)
      }

      setSelectedFile(null)
      setPreviewUrl(null)
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload proof",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_PAYMENT":
        return <Badge variant="warning"><Clock className="mr-1 h-3 w-3" /> Awaiting Payment</Badge>
      case "PAYMENT_VERIFICATION":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> Verifying Payment</Badge>
      case "PAID":
        return <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3" /> Paid</Badge>
      case "COMPLETED":
      case "FULFILLED":
        return <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3" /> Completed</Badge>
      case "CANCELLED":
      case "CANCELED":
        return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" /> Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (paymentStatus?: string) => {
    switch (paymentStatus) {
      case "PENDING":
        return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>
      case "PROCESSING":
        return <Badge variant="secondary"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Processing</Badge>
      case "PAID":
        return <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3" /> Paid</Badge>
      case "FAILED":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Failed</Badge>
      case "EXPIRED":
        return <Badge variant="outline"><AlertCircle className="mr-1 h-3 w-3" /> Expired</Badge>
      default:
        return null
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
        <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The order you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/account/orders">
          <Button>View All Orders</Button>
        </Link>
      </div>
    )
  }

  const hasSubmittedProof = order.paymentProofs && order.paymentProofs.length > 0
  const latestProof = order.paymentProofs?.[0]
  const currentMethod = getCurrentMethod()
  const canChangeMethod = (order.status === "PENDING_PAYMENT" || order.status === "CREATED") &&
                          order.paymentStatus !== "PAID"
  const isPending = order.status === "PENDING_PAYMENT" || order.status === "CREATED"
  const hasError = order.paymentLastError && order.paymentStatus === "FAILED"

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/account/orders" className="hover:text-foreground">Quest Receipts</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{order.orderNumber}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Payment Instructions */}
        <div className="space-y-6">
          <div className="bg-card border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Complete Payment</h1>
              {getStatusBadge(order.status)}
            </div>
            
            {/* Payment Status */}
            {order.paymentStatus && order.paymentStatus !== "PENDING" && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Payment Status:</span>
                {getPaymentStatusBadge(order.paymentStatus)}
              </div>
            )}

            {/* Payment Error Message */}
            {hasError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-400">Payment Failed</p>
                  <p className="text-sm text-muted-foreground">{order.paymentLastError}</p>
                  <p className="text-sm text-muted-foreground mt-1">You can try again or change to another payment method.</p>
                </div>
              </div>
            )}

            {/* Current Payment Method Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Payment Method:</span>
              <Badge variant="secondary" className="capitalize">
                {currentMethod === "stripe" && <CreditCard className="mr-1 h-3 w-3" />}
                {currentMethod === "paypal" && "💳 "}
                {currentMethod === "bank_transfer" && <Building2 className="mr-1 h-3 w-3" />}
                {currentMethod === "stripe" ? "Credit Card (Stripe)" :
                 currentMethod === "paypal" ? "PayPal" : "Bank Transfer"}
              </Badge>
              {canChangeMethod && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChangeMethod(!showChangeMethod)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Change
                </Button>
              )}
            </div>

            {/* Change Payment Method Section */}
            {showChangeMethod && canChangeMethod && (
              <div className="mb-6 p-4 border rounded-lg bg-secondary/20">
                <h3 className="font-semibold mb-3">Change Payment Method</h3>
                <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
                  <div className="space-y-2">
                    {paymentConfig.stripeEnabled && (
                      <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedMethod === "stripe" ? "border-blue-500 bg-blue-500/10" : "border-border hover:border-blue-500/50"
                      }`}>
                        <RadioGroupItem value="stripe" id="stripe" />
                        <CreditCard className="h-4 w-4 text-blue-400" />
                        <div>
                          <p className="font-medium">Credit Card (Stripe)</p>
                          <p className="text-xs text-muted-foreground">Visa, Mastercard, etc.</p>
                        </div>
                      </label>
                    )}
                    {paymentConfig.paypalEnabled && (
                      <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedMethod === "paypal" ? "border-yellow-500 bg-yellow-500/10" : "border-border hover:border-yellow-500/50"
                      }`}>
                        <RadioGroupItem value="paypal" id="paypal" />
                        <span className="text-lg">💳</span>
                        <div>
                          <p className="font-medium">PayPal</p>
                          <p className="text-xs text-muted-foreground">Pay with PayPal account</p>
                        </div>
                      </label>
                    )}
                    {paymentConfig.bankTransferEnabled && (
                      <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedMethod === "bank_transfer" ? "border-purple-500 bg-purple-500/10" : "border-border hover:border-purple-500/50"
                      }`}>
                        <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                        <Building2 className="h-4 w-4 text-purple-400" />
                        <div>
                          <p className="font-medium">Bank Transfer</p>
                          <p className="text-xs text-muted-foreground">Manual transfer & upload proof</p>
                        </div>
                      </label>
                    )}
                  </div>
                </RadioGroup>
                <div className="flex gap-2 mt-4">
                  <Button 
                    onClick={handleChangeMethod} 
                    disabled={isProcessing || selectedMethod === currentMethod}
                    size="sm"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Confirm Change
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowChangeMethod(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Amount */}
            <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-6 mb-6">
              <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-green-400">
                  {formatPrice(order.total, order.currency)}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(order.total.toString(), "Amount")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* STRIPE PAYMENT SECTION */}
            {currentMethod === "stripe" && isPending && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <CreditCard className="h-5 w-5 text-blue-400" />
                    Pay with Card (Stripe)
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click the button below to securely pay with your credit or debit card via Stripe.
                  </p>
                  <Button
                    onClick={handleStripePayment}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay {formatPrice(order.total, order.currency)} with Stripe
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* PAYPAL PAYMENT SECTION */}
            {currentMethod === "paypal" && isPending && (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <span className="text-xl">💳</span>
                    Pay with PayPal
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click the button below to pay securely with your PayPal account.
                  </p>
                  <Button
                    onClick={handlePayPalPayment}
                    disabled={isProcessing}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-black"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Pay with PayPal
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Note: Amount will be converted to USD for PayPal processing
                  </p>
                </div>
              </div>
            )}

            {/* BANK TRANSFER SECTION */}
            {currentMethod === "bank_transfer" && (
              <>
                <p className="text-muted-foreground mb-4">
                  Please transfer the exact amount to the bank account below.
                </p>

                {/* Bank Details */}
                {paymentSettings && paymentSettings.manualAccounts && paymentSettings.manualAccounts.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-purple-400" />
                      Bank Transfer Details
                    </h3>
                    
                    {paymentSettings.manualAccounts.map((account, index) => (
                      <div key={index} className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                          <div>
                            <p className="text-xs text-muted-foreground">Bank</p>
                            <p className="font-medium">{account.bank}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                          <div>
                            <p className="text-xs text-muted-foreground">Account Number</p>
                            <p className="font-mono font-medium">{account.accountNumber}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(account.accountNumber, "Account number")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                          <div>
                            <p className="text-xs text-muted-foreground">Account Holder</p>
                            <p className="font-medium">{account.accountName}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Order Number Reference */}
                <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-400">
                    <strong>Important:</strong> Include order number <span className="font-mono">{order.orderNumber}</span> in transfer notes.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Upload Proof - Only for Bank Transfer */}
          {currentMethod === "bank_transfer" && isPending && (
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Upload Payment Proof</h2>
              <p className="text-sm text-muted-foreground mb-4">
                After completing the transfer, upload your payment proof for verification.
              </p>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                  {previewUrl ? (
                    <div className="space-y-4">
                      <img
                        src={previewUrl}
                        alt="Payment proof preview"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setSelectedFile(null)
                          setPreviewUrl(null)
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <Label htmlFor="proof" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG up to 5MB
                      </p>
                      <Input
                        id="proof"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </Label>
                  )}
                </div>

                {selectedFile && (
                  <Button
                    variant="legendary"
                    className="w-full"
                    onClick={handleUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Submit Proof
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Proof Status */}
          {hasSubmittedProof && (
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Payment Proof Status</h2>
              <div className="flex items-center gap-3">
                {latestProof?.status === "PENDING" && (
                  <>
                    <Clock className="h-5 w-5 text-yellow-400" />
                    <div>
                      <p className="font-medium">Verification in Progress</p>
                      <p className="text-sm text-muted-foreground">
                        We&apos;re reviewing your payment proof. This usually takes 1-24 hours.
                      </p>
                    </div>
                  </>
                )}
                {latestProof?.status === "APPROVED" && (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="font-medium">Payment Verified</p>
                      <p className="text-sm text-muted-foreground">
                        Your payment has been confirmed. You can now access your items.
                      </p>
                    </div>
                  </>
                )}
                {latestProof?.status === "REJECTED" && (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div>
                      <p className="font-medium">Proof Rejected</p>
                      <p className="text-sm text-muted-foreground">
                        Please upload a valid payment proof.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <div className="sticky top-24 bg-card border-2 border-purple-500/20 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Order #{order.orderNumber}
            </p>
            
            <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-2 rounded-lg bg-secondary/30"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                    {item.product?.images?.[0] ? (
                      <img
                        src={item.product.images[0].url}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-bold text-green-400">
                    {formatPrice(item.productPrice * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-green-400">{formatPrice(order.total)}</span>
            </div>

            {order.status === "PAID" || order.status === "FULFILLED" ? (
              <Link href={`/account/orders/${order.id}`}>
                <Button variant="legendary" className="w-full mt-6">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Claim Rewards
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
