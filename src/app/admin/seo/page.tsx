"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import { Globe, Save, Search, Image as ImageIcon } from "lucide-react"

interface SeoSettings {
  siteTitle: string
  siteDescription: string
  keywords: string
  ogImage: string
  twitterHandle: string
  googleAnalyticsId: string
  googleSiteVerification: string
}

export default function AdminSeoPage() {
  const [settings, setSettings] = useState<SeoSettings>({
    siteTitle: "",
    siteDescription: "",
    keywords: "",
    ogImage: "",
    twitterHandle: "",
    googleAnalyticsId: "",
    googleSiteVerification: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings/seo")
        if (res.ok) {
          const data = await res.json()
          if (data.settings) {
            setSettings(data.settings)
          }
        }
      } catch (error) {
        console.error("Failed to fetch SEO settings:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch("/api/admin/settings/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save settings")
      }

      toast({
        title: "SEO settings saved",
        description: "Your SEO configuration has been updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">SEO Settings</h1>
          <p className="text-muted-foreground">Search engine optimization configuration</p>
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">SEO Settings</h1>
        <p className="text-muted-foreground">Search engine optimization configuration</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic SEO */}
        <Card className="bg-card/50 border-purple-900/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-purple-400" />
              Basic SEO
            </CardTitle>
            <CardDescription>
              Configure basic search engine optimization settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteTitle">Site Title</Label>
              <Input
                id="siteTitle"
                value={settings.siteTitle}
                onChange={(e) => setSettings({ ...settings, siteTitle: e.target.value })}
                placeholder="MpratamaStore - Digital Marketplace"
              />
              <p className="text-xs text-muted-foreground">
                Appears in browser tabs and search results
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteDescription">Site Description</Label>
              <Textarea
                id="siteDescription"
                value={settings.siteDescription}
                onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                placeholder="Discover legendary digital treasures..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Meta description for search results (150-160 characters recommended)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords</Label>
              <Input
                id="keywords"
                value={settings.keywords}
                onChange={(e) => setSettings({ ...settings, keywords: e.target.value })}
                placeholder="digital products, game assets, templates, NFT"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated keywords for meta tags
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Social Sharing */}
        <Card className="bg-card/50 border-purple-900/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-purple-400" />
              Social Sharing
            </CardTitle>
            <CardDescription>
              Configure how your site appears when shared on social media
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ogImage">Open Graph Image URL</Label>
              <Input
                id="ogImage"
                value={settings.ogImage}
                onChange={(e) => setSettings({ ...settings, ogImage: e.target.value })}
                placeholder="https://example.com/og-image.jpg"
              />
              <p className="text-xs text-muted-foreground">
                Image shown when shared on Facebook, LinkedIn (1200x630px recommended)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitterHandle">Twitter Handle</Label>
              <Input
                id="twitterHandle"
                value={settings.twitterHandle}
                onChange={(e) => setSettings({ ...settings, twitterHandle: e.target.value })}
                placeholder="@mpratamastore"
              />
              <p className="text-xs text-muted-foreground">
                Your Twitter/X handle for attribution
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Analytics & Verification */}
        <Card className="bg-card/50 border-purple-900/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-purple-400" />
              Analytics & Verification
            </CardTitle>
            <CardDescription>
              Connect analytics and verify site ownership
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="googleAnalyticsId">Google Analytics ID</Label>
              <Input
                id="googleAnalyticsId"
                value={settings.googleAnalyticsId}
                onChange={(e) => setSettings({ ...settings, googleAnalyticsId: e.target.value })}
                placeholder="G-XXXXXXXXXX"
              />
              <p className="text-xs text-muted-foreground">
                Google Analytics 4 measurement ID
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="googleSiteVerification">Google Site Verification</Label>
              <Input
                id="googleSiteVerification"
                value={settings.googleSiteVerification}
                onChange={(e) => setSettings({ ...settings, googleSiteVerification: e.target.value })}
                placeholder="verification-code"
              />
              <p className="text-xs text-muted-foreground">
                Google Search Console verification meta tag content
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save SEO Settings"}
          </Button>
        </div>
      </form>
    </div>
  )
}
