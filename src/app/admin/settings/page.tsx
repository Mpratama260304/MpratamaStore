"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Save, Settings, CreditCard, Globe, Copy, Check, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SiteSettings {
  id?: string
  siteName: string
  siteDescription: string
  logoUrl: string
  faviconUrl: string
  maintenanceMode: boolean
  maintenanceMessage: string
  contactEmail: string
  socialLinks: Record<string, string>
}

interface PaymentSettings {
  id?: string
  bankName: string
  accountNumber: string
  accountHolder: string
  gatewayEnabled: boolean
  midtransServerKey: string
  midtransClientKey: string
  stripeEnabled: boolean
  stripeSecretKey: string
  stripePublishableKey: string
  stripeWebhookSecret: string
}

interface DetectedUrls {
  baseUrl: string
  webhookUrls: {
    stripe: string
    paypal: string
  }
  isAutoDetected: boolean
  message: string
}

export default function AdminSettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [detectedUrls, setDetectedUrls] = useState<DetectedUrls | null>(null)
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    siteName: "MpratamaStore",
    siteDescription: "Digital artifacts marketplace",
    logoUrl: "",
    faviconUrl: "",
    maintenanceMode: false,
    maintenanceMessage: "We're currently performing maintenance. Please check back soon.",
    contactEmail: "",
    socialLinks: {},
  })
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    bankName: "BCA",
    accountNumber: "",
    accountHolder: "",
    gatewayEnabled: false,
    midtransServerKey: "",
    midtransClientKey: "",
    stripeEnabled: false,
    stripeSecretKey: "",
    stripePublishableKey: "",
    stripeWebhookSecret: "",
  })

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [siteRes, paymentRes, urlsRes] = await Promise.all([
          fetch("/api/admin/settings/site"),
          fetch("/api/admin/settings/payment"),
          fetch("/api/admin/settings/urls"),
        ])

        if (siteRes.ok) {
          const { settings } = await siteRes.json()
          if (settings) setSiteSettings(settings)
        }

        if (paymentRes.ok) {
          const { settings } = await paymentRes.json()
          if (settings) setPaymentSettings(settings)
        }

        if (urlsRes.ok) {
          const data = await urlsRes.json()
          setDetectedUrls(data)
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleSaveSiteSettings = async () => {
    setIsSaving(true)

    try {
      const response = await fetch("/api/admin/settings/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(siteSettings),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save settings")
      }

      toast({
        title: "Settings Saved",
        description: "Site settings have been updated.",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePaymentSettings = async () => {
    setIsSaving(true)

    try {
      const response = await fetch("/api/admin/settings/payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentSettings),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save settings")
      }

      toast({
        title: "Settings Saved",
        description: "Payment settings have been updated.",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedUrl(label)
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      })
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy manually",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Manage your store settings</p>
      </div>

      <Tabs defaultValue="site">
        <TabsList>
          <TabsTrigger value="site" className="gap-2">
            <Settings className="h-4 w-4" />
            Site Settings
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="site" className="mt-6 space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Basic site information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={siteSettings.siteName}
                    onChange={(e) =>
                      setSiteSettings({ ...siteSettings, siteName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={siteSettings.contactEmail}
                    onChange={(e) =>
                      setSiteSettings({ ...siteSettings, contactEmail: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  value={siteSettings.siteDescription}
                  onChange={(e) =>
                    setSiteSettings({ ...siteSettings, siteDescription: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={siteSettings.logoUrl}
                    onChange={(e) =>
                      setSiteSettings({ ...siteSettings, logoUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="faviconUrl">Favicon URL</Label>
                  <Input
                    id="faviconUrl"
                    value={siteSettings.faviconUrl}
                    onChange={(e) =>
                      setSiteSettings({ ...siteSettings, faviconUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Mode */}
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Mode</CardTitle>
              <CardDescription>
                Enable maintenance mode to show a maintenance page to visitors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Only admins can access the site when enabled
                  </p>
                </div>
                <Switch
                  checked={siteSettings.maintenanceMode}
                  onCheckedChange={(checked) =>
                    setSiteSettings({ ...siteSettings, maintenanceMode: checked })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                <Textarea
                  id="maintenanceMessage"
                  value={siteSettings.maintenanceMessage}
                  onChange={(e) =>
                    setSiteSettings({ ...siteSettings, maintenanceMessage: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveSiteSettings} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Site Settings
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="payment" className="mt-6 space-y-6">
          {/* Bank Transfer */}
          <Card>
            <CardHeader>
              <CardTitle>Bank Transfer</CardTitle>
              <CardDescription>
                Configure bank account for manual transfers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={paymentSettings.bankName}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, bankName: e.target.value })
                    }
                    placeholder="BCA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={paymentSettings.accountNumber}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, accountNumber: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountHolder">Account Holder</Label>
                  <Input
                    id="accountHolder"
                    value={paymentSettings.accountHolder}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, accountHolder: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Gateway - Midtrans */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Gateway (Midtrans)</CardTitle>
              <CardDescription>
                Enable automatic payment processing via Midtrans
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Midtrans</Label>
                  <p className="text-sm text-muted-foreground">
                    Accept e-wallets, bank transfer VA, and more
                  </p>
                </div>
                <Switch
                  checked={paymentSettings.gatewayEnabled}
                  onCheckedChange={(checked) =>
                    setPaymentSettings({ ...paymentSettings, gatewayEnabled: checked })
                  }
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="midtransServerKey">Server Key</Label>
                  <Input
                    id="midtransServerKey"
                    type="password"
                    value={paymentSettings.midtransServerKey}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, midtransServerKey: e.target.value })
                    }
                    placeholder="SB-Mid-server-..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="midtransClientKey">Client Key</Label>
                  <Input
                    id="midtransClientKey"
                    type="password"
                    value={paymentSettings.midtransClientKey}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, midtransClientKey: e.target.value })
                    }
                    placeholder="SB-Mid-client-..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Gateway - Stripe */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Gateway (Stripe)</CardTitle>
              <CardDescription>
                Enable credit/debit card payments via Stripe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Stripe</Label>
                  <p className="text-sm text-muted-foreground">
                    Accept Visa, Mastercard, and more internationally
                  </p>
                </div>
                <Switch
                  checked={paymentSettings.stripeEnabled}
                  onCheckedChange={(checked) =>
                    setPaymentSettings({ ...paymentSettings, stripeEnabled: checked })
                  }
                />
              </div>
              <div className="grid gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stripeSecretKey">Secret Key</Label>
                    <Input
                      id="stripeSecretKey"
                      type="password"
                      value={paymentSettings.stripeSecretKey}
                      onChange={(e) =>
                        setPaymentSettings({ ...paymentSettings, stripeSecretKey: e.target.value })
                      }
                      placeholder="sk_test_..."
                    />
                    <p className="text-xs text-muted-foreground">From Stripe Dashboard → API keys</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stripePublishableKey">Publishable Key</Label>
                    <Input
                      id="stripePublishableKey"
                      type="password"
                      value={paymentSettings.stripePublishableKey}
                      onChange={(e) =>
                        setPaymentSettings({ ...paymentSettings, stripePublishableKey: e.target.value })
                      }
                      placeholder="pk_test_..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripeWebhookSecret">Webhook Secret</Label>
                  <Input
                    id="stripeWebhookSecret"
                    type="password"
                    value={paymentSettings.stripeWebhookSecret}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, stripeWebhookSecret: e.target.value })
                    }
                    placeholder="whsec_..."
                  />
                </div>
                
                {/* Auto-detected Webhook URL */}
                <div className="space-y-2 pt-2 border-t">
                  <Label>Stripe Webhook URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={detectedUrls?.webhookUrls.stripe || `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/stripe`}
                      className="font-mono text-sm bg-muted"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(
                        detectedUrls?.webhookUrls.stripe || `${window.location.origin}/api/webhooks/stripe`,
                        "Stripe Webhook URL"
                      )}
                    >
                      {copiedUrl === "Stripe Webhook URL" ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Copy this URL and add it in your Stripe Dashboard → Developers → Webhooks
                  </p>
                  {detectedUrls?.isAutoDetected && (
                    <Alert className="mt-2">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        URL auto-detected from your domain. No need to set NEXT_PUBLIC_APP_URL!
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSavePaymentSettings} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Payment Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
