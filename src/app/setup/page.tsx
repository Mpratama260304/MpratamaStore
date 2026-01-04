"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Shield, CheckCircle2, AlertCircle } from "lucide-react"

interface SetupStatus {
  ok: boolean
  needsSetup: boolean
  error?: string
  dbConnected?: boolean
  schemaReady?: boolean
}

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Check setup status on load
  useEffect(() => {
    checkSetupStatus()
  }, [])

  async function checkSetupStatus() {
    try {
      setLoading(true)
      const res = await fetch("/api/setup/status")
      const data: SetupStatus = await res.json()
      setStatus(data)

      // If setup is not needed, redirect to admin
      if (data.ok && !data.needsSetup) {
        router.replace("/admin")
      }
    } catch (err) {
      setError("Gagal memeriksa status setup")
    } finally {
      setLoading(false)
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {}

    if (!formData.email) {
      errors.email = "Email wajib diisi"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Format email tidak valid"
    }

    if (!formData.username) {
      errors.username = "Username wajib diisi"
    } else if (formData.username.length < 3) {
      errors.username = "Username minimal 3 karakter"
    }

    if (!formData.password) {
      errors.password = "Password wajib diisi"
    } else if (formData.password.length < 6) {
      errors.password = "Password minimal 6 karakter"
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Password tidak cocok"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!validateForm()) return

    try {
      setSubmitting(true)
      
      const res = await fetch("/api/setup/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          // Setup already completed
          setError("Setup sudah selesai. Mengalihkan ke halaman login...")
          setTimeout(() => {
            router.replace("/login?redirect=/admin")
          }, 2000)
          return
        }
        throw new Error(data.error || "Gagal membuat admin")
      }

      // Success!
      setSuccess(true)
      setTimeout(() => {
        router.replace("/login?redirect=/admin")
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-slate-400">Memeriksa status setup...</p>
        </div>
      </div>
    )
  }

  // Database not connected
  if (status && !status.dbConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <Card className="w-full max-w-md border-red-500/30 bg-slate-900/50 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <CardTitle className="text-red-400">Database Tidak Terhubung</CardTitle>
            <CardDescription>
              {status.error || "Tidak dapat terhubung ke database"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-slate-400 mb-4">
              Pastikan database sudah dikonfigurasi dengan benar dan migration sudah dijalankan.
            </p>
            <Button variant="outline" onClick={() => checkSetupStatus()}>
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Schema not ready
  if (status && status.schemaReady === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <Card className="w-full max-w-md border-yellow-500/30 bg-slate-900/50 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-yellow-400" />
            </div>
            <CardTitle className="text-yellow-400">Database Perlu Migration</CardTitle>
            <CardDescription>
              Database terhubung tetapi schema belum siap
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-slate-400 mb-4">
              Jalankan <code className="px-2 py-1 bg-slate-800 rounded">prisma migrate deploy</code> terlebih dahulu.
            </p>
            <Button variant="outline" onClick={() => checkSetupStatus()}>
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <Card className="w-full max-w-md border-green-500/30 bg-slate-900/50 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-400" />
            </div>
            <CardTitle className="text-green-400">Setup Berhasil!</CardTitle>
            <CardDescription>
              Admin berhasil dibuat. Mengalihkan ke halaman login...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400 mx-auto" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Setup form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-md border-purple-500/30 bg-slate-900/50 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-purple-400" />
          </div>
          <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Setup Admin Pertama
          </CardTitle>
          <CardDescription>
            Selamat datang! Buat akun admin untuk mengelola toko Anda.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={formErrors.email ? "border-red-500" : ""}
                disabled={submitting}
              />
              {formErrors.email && (
                <p className="text-xs text-red-400">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className={formErrors.username ? "border-red-500" : ""}
                disabled={submitting}
              />
              {formErrors.username && (
                <p className="text-xs text-red-400">{formErrors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={formErrors.password ? "border-red-500" : ""}
                disabled={submitting}
              />
              {formErrors.password && (
                <p className="text-xs text-red-400">{formErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Ulangi password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={formErrors.confirmPassword ? "border-red-500" : ""}
                disabled={submitting}
              />
              {formErrors.confirmPassword && (
                <p className="text-xs text-red-400">{formErrors.confirmPassword}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Membuat Admin...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Buat Admin
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
