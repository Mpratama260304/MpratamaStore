"use client"

import { AlertTriangle, Database, ExternalLink, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface DbOfflineNoticeProps {
  error?: string
  showRefresh?: boolean
  compact?: boolean
}

export function DbOfflineNotice({ error, showRefresh = true, compact = false }: DbOfflineNoticeProps) {
  if (compact) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-yellow-500 mb-2">
          <Database className="h-5 w-5" />
          <span className="font-medium">Database Offline</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Data tidak tersedia. Hubungkan database untuk melihat konten.
        </p>
        {showRefresh && (
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className="border-yellow-500/30 bg-yellow-500/5">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/20">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <CardTitle className="text-yellow-500">Database Tidak Terhubung</CardTitle>
            <CardDescription>
              Aplikasi berjalan dalam mode tanpa database
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            <p className="text-sm font-mono text-destructive">{error}</p>
          </div>
        )}
        
        <div className="space-y-3">
          <h4 className="font-medium">Untuk memperbaiki:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              Pastikan <code className="px-1.5 py-0.5 bg-muted rounded text-xs">DATABASE_URL</code> sudah diset dengan benar
            </li>
            <li>
              Gunakan managed database seperti{" "}
              <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                Supabase <ExternalLink className="h-3 w-3" />
              </a>
              {" "}atau{" "}
              <a href="https://neon.tech" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                Neon <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              Pastikan database mengizinkan koneksi dari internet (public access)
            </li>
            <li>
              Tambahkan <code className="px-1.5 py-0.5 bg-muted rounded text-xs">?sslmode=require</code> di akhir connection string
            </li>
          </ol>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-2">Contoh DATABASE_URL:</p>
          <code className="text-xs break-all">
            postgresql://user:pass@db.xxxx.supabase.co:5432/postgres?sslmode=require
          </code>
        </div>
        
        {showRefresh && (
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Halaman
            </Button>
            <Button 
              variant="secondary"
              onClick={() => window.open('/api/health', '_blank')}
            >
              <Database className="h-4 w-4 mr-2" />
              Cek Status
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Inline banner for pages that partially work without DB
 */
export function DbOfflineBanner({ message }: { message?: string }) {
  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2">
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm">
        <Database className="h-4 w-4 text-yellow-500" />
        <span className="text-yellow-600 dark:text-yellow-400">
          {message || "Database tidak terhubung. Beberapa fitur mungkin tidak tersedia."}
        </span>
      </div>
    </div>
  )
}
