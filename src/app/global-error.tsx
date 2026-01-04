'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, RefreshCw, AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="id" className="dark">
      <body className="font-sans antialiased bg-slate-900">
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-900/20 to-slate-900 p-4">
          <div className="text-center max-w-md">
            {/* Error Icon */}
            <div className="relative mb-8">
              <div className="w-24 h-24 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="h-12 w-12 text-red-400" />
              </div>
              <div className="absolute inset-0 blur-3xl opacity-30 bg-red-600" />
            </div>

            {/* Message */}
            <h2 className="text-2xl font-bold text-white mb-4">
              Terjadi Kesalahan
            </h2>
            <p className="text-slate-400 mb-8">
              Maaf, terjadi kesalahan yang tidak terduga. 
              Silakan coba lagi atau kembali ke beranda.
            </p>

            {/* Error details (only in development) */}
            {process.env.NODE_ENV === 'development' && error?.message && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-left">
                <p className="text-xs text-red-400 font-mono break-all">
                  {error.message}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={reset}
                variant="default"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Coba Lagi
              </Button>
              
              <Button asChild variant="outline" className="border-slate-700 hover:bg-slate-800">
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Ke Beranda
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
