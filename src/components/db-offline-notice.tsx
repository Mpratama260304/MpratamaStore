"use client"

import { AlertTriangle, Database, ExternalLink, RefreshCw, Settings, Terminal, PackageOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DbErrorType, ERROR_MESSAGES } from "@/lib/db-errors"

interface DbOfflineNoticeProps {
  error?: string
  errorType?: DbErrorType
  showRefresh?: boolean
  compact?: boolean
}

/**
 * Full-page database error notice
 * Shows different UI based on error type
 */
export function DbOfflineNotice({ 
  error, 
  errorType = 'CONNECTION',
  showRefresh = true, 
  compact = false 
}: DbOfflineNoticeProps) {
  const errorInfo = ERROR_MESSAGES[errorType]
  
  // Compact version for inline use
  if (compact) {
    return (
      <div className={`border rounded-lg p-4 text-center ${getErrorColorClasses(errorType)}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          {getErrorIcon(errorType)}
          <span className="font-medium">{errorInfo.title}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {errorInfo.description}
        </p>
        {showRefresh && errorType !== 'DATA_EMPTY' && (
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
    <Card className={`${getErrorBorderClasses(errorType)}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${getErrorIconBgClasses(errorType)}`}>
            {getErrorIcon(errorType)}
          </div>
          <div>
            <CardTitle className={getErrorTitleClasses(errorType)}>
              {errorInfo.title}
            </CardTitle>
            <CardDescription>
              {errorInfo.description}
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
        
        {/* Error-specific guidance */}
        {errorType === 'CONNECTION' && <ConnectionErrorHelp />}
        {errorType === 'MIGRATION' && <MigrationErrorHelp />}
        {errorType === 'PERMISSION' && <PermissionErrorHelp />}
        {errorType === 'DATA_EMPTY' && <DataEmptyHelp />}
        
        {showRefresh && errorType !== 'DATA_EMPTY' && (
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
 * Connection error - database truly offline
 */
function ConnectionErrorHelp() {
  return (
    <div className="space-y-3">
      <h4 className="font-medium">Untuk memperbaiki:</h4>
      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
        <li>
          Pastikan <code className="px-1.5 py-0.5 bg-muted rounded text-xs">DATABASE_URL</code> sudah diset dengan benar
        </li>
        <li>
          Untuk SQLite, pastikan folder <code className="px-1.5 py-0.5 bg-muted rounded text-xs">/data</code> ada dan writable
        </li>
        <li>
          Restart container jika menggunakan Docker
        </li>
      </ol>
      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs text-muted-foreground mb-2">Contoh DATABASE_URL (SQLite):</p>
        <code className="text-xs break-all">
          file:/data/app.db
        </code>
      </div>
    </div>
  )
}

/**
 * Migration error - tables don't exist
 */
function MigrationErrorHelp() {
  return (
    <div className="space-y-3">
      <h4 className="font-medium">Database terhubung, tapi tabel belum dibuat.</h4>
      <p className="text-sm text-muted-foreground">
        Jalankan migration untuk membuat struktur database:
      </p>
      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Terminal className="h-4 w-4" />
          <code>prisma migrate deploy</code>
        </div>
        <p className="text-xs text-muted-foreground">
          Atau jika menggunakan Docker, restart container - migration akan dijalankan otomatis saat startup.
        </p>
      </div>
    </div>
  )
}

/**
 * Permission error - can't write to database
 */
function PermissionErrorHelp() {
  return (
    <div className="space-y-3">
      <h4 className="font-medium">Tidak dapat menulis ke file database.</h4>
      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
        <li>
          Pastikan folder <code className="px-1.5 py-0.5 bg-muted rounded text-xs">/data</code> memiliki permission yang benar
        </li>
        <li>
          Untuk Docker, pastikan volume mount sudah benar
        </li>
        <li>
          Jalankan: <code className="px-1.5 py-0.5 bg-muted rounded text-xs">chmod 755 /data</code>
        </li>
      </ol>
    </div>
  )
}

/**
 * Data empty - DB works but no content
 */
function DataEmptyHelp() {
  return (
    <div className="space-y-3">
      <h4 className="font-medium">Database terhubung dan siap!</h4>
      <p className="text-sm text-muted-foreground">
        Belum ada produk yang tersedia. Tambahkan produk melalui Admin Panel.
      </p>
      <Button asChild variant="outline">
        <a href="/admin">
          <Settings className="h-4 w-4 mr-2" />
          Buka Admin Panel
        </a>
      </Button>
    </div>
  )
}

/**
 * Inline banner for pages that partially work without DB
 */
export function DbOfflineBanner({ 
  message, 
  errorType = 'CONNECTION' 
}: { 
  message?: string
  errorType?: DbErrorType 
}) {
  const errorInfo = ERROR_MESSAGES[errorType]
  
  // Don't show banner for empty data - that's normal
  if (errorType === 'DATA_EMPTY') {
    return null
  }
  
  return (
    <div className={`border-b px-4 py-2 ${getBannerColorClasses(errorType)}`}>
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm">
        {getErrorIcon(errorType, 'h-4 w-4')}
        <span className={getBannerTextClasses(errorType)}>
          {message || errorInfo.description}
        </span>
      </div>
    </div>
  )
}

/**
 * Empty state component for when data is not available
 */
export function EmptyState({ 
  title = "Belum ada data",
  description = "Belum ada item yang tersedia.",
  icon,
  action
}: {
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-full bg-muted mb-4">
        {icon || <PackageOpen className="h-8 w-8 text-muted-foreground" />}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-md">{description}</p>
      {action}
    </div>
  )
}

// Helper functions for styling
function getErrorIcon(type: DbErrorType, className = 'h-6 w-6') {
  const iconClass = `${className} ${getErrorIconColor(type)}`
  switch (type) {
    case 'CONNECTION':
      return <Database className={iconClass} />
    case 'MIGRATION':
      return <Terminal className={iconClass} />
    case 'PERMISSION':
      return <AlertTriangle className={iconClass} />
    case 'DATA_EMPTY':
      return <PackageOpen className={iconClass} />
    default:
      return <AlertTriangle className={iconClass} />
  }
}

function getErrorIconColor(type: DbErrorType) {
  switch (type) {
    case 'CONNECTION': return 'text-red-500'
    case 'MIGRATION': return 'text-yellow-500'
    case 'PERMISSION': return 'text-orange-500'
    case 'DATA_EMPTY': return 'text-blue-500'
    default: return 'text-yellow-500'
  }
}

function getErrorColorClasses(type: DbErrorType) {
  switch (type) {
    case 'CONNECTION': return 'bg-red-500/10 border-red-500/30'
    case 'MIGRATION': return 'bg-yellow-500/10 border-yellow-500/30'
    case 'PERMISSION': return 'bg-orange-500/10 border-orange-500/30'
    case 'DATA_EMPTY': return 'bg-blue-500/10 border-blue-500/30'
    default: return 'bg-yellow-500/10 border-yellow-500/30'
  }
}

function getErrorBorderClasses(type: DbErrorType) {
  switch (type) {
    case 'CONNECTION': return 'border-red-500/30 bg-red-500/5'
    case 'MIGRATION': return 'border-yellow-500/30 bg-yellow-500/5'
    case 'PERMISSION': return 'border-orange-500/30 bg-orange-500/5'
    case 'DATA_EMPTY': return 'border-blue-500/30 bg-blue-500/5'
    default: return 'border-yellow-500/30 bg-yellow-500/5'
  }
}

function getErrorIconBgClasses(type: DbErrorType) {
  switch (type) {
    case 'CONNECTION': return 'bg-red-500/20'
    case 'MIGRATION': return 'bg-yellow-500/20'
    case 'PERMISSION': return 'bg-orange-500/20'
    case 'DATA_EMPTY': return 'bg-blue-500/20'
    default: return 'bg-yellow-500/20'
  }
}

function getErrorTitleClasses(type: DbErrorType) {
  switch (type) {
    case 'CONNECTION': return 'text-red-500'
    case 'MIGRATION': return 'text-yellow-500'
    case 'PERMISSION': return 'text-orange-500'
    case 'DATA_EMPTY': return 'text-blue-500'
    default: return 'text-yellow-500'
  }
}

function getBannerColorClasses(type: DbErrorType) {
  switch (type) {
    case 'CONNECTION': return 'bg-red-500/10 border-red-500/30'
    case 'MIGRATION': return 'bg-yellow-500/10 border-yellow-500/30'
    case 'PERMISSION': return 'bg-orange-500/10 border-orange-500/30'
    default: return 'bg-yellow-500/10 border-yellow-500/30'
  }
}

function getBannerTextClasses(type: DbErrorType) {
  switch (type) {
    case 'CONNECTION': return 'text-red-600 dark:text-red-400'
    case 'MIGRATION': return 'text-yellow-600 dark:text-yellow-400'
    case 'PERMISSION': return 'text-orange-600 dark:text-orange-400'
    default: return 'text-yellow-600 dark:text-yellow-400'
  }
}
