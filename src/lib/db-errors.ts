/**
 * Database Error Classifier
 * 
 * Classifies database errors to provide appropriate UI feedback:
 * - CONNECTION: Database cannot be reached
 * - MIGRATION: Schema/tables don't exist
 * - PERMISSION: File/write access denied
 * - DATA: Query succeeded but no data found
 * - UNKNOWN: Other errors
 */

export type DbErrorType = 
  | 'CONNECTION'   // Can't connect to database at all
  | 'MIGRATION'    // Tables don't exist (schema not applied)
  | 'PERMISSION'   // Can't read/write database file
  | 'DATA_EMPTY'   // Query succeeded but returned empty
  | 'QUERY'        // Query syntax/logic error
  | 'UNKNOWN'      // Unknown error

export interface DbErrorInfo {
  type: DbErrorType
  message: string
  userMessage: string
  canRetry: boolean
  needsMigration: boolean
  needsAdmin: boolean
}

/**
 * SQLite-specific error patterns
 */
const SQLITE_CONNECTION_ERRORS = [
  'SQLITE_CANTOPEN',
  'unable to open database',
  'database is locked',
  'disk I/O error',
]

const SQLITE_MIGRATION_ERRORS = [
  'no such table',
  'SQLITE_ERROR: no such table',
  'table .* does not exist',
  'P2021', // Prisma: table does not exist
  'P2022', // Prisma: column does not exist
  'P2025', // Prisma: record not found in related table
]

const SQLITE_PERMISSION_ERRORS = [
  'SQLITE_READONLY',
  'readonly database',
  'permission denied',
  'EACCES',
  'EPERM',
  'attempt to write a readonly database',
]

/**
 * Prisma-specific error codes
 */
const PRISMA_CONNECTION_ERRORS = [
  'P1000', // Authentication failed
  'P1001', // Can't reach database server
  'P1002', // Connection timed out
  'P1003', // Database does not exist
  'P1008', // Operations timed out
  'P1017', // Server closed connection
]

const PRISMA_MIGRATION_ERRORS = [
  'P2021', // Table does not exist
  'P2022', // Column does not exist
  'P2025', // Record to update not found
]

/**
 * Check if error indicates a connection failure
 */
export function isConnectionError(error: unknown): boolean {
  const message = getErrorMessage(error)
  const code = getErrorCode(error)
  
  // Check Prisma error codes
  if (PRISMA_CONNECTION_ERRORS.some(c => code?.includes(c))) {
    return true
  }
  
  // Check SQLite patterns
  if (SQLITE_CONNECTION_ERRORS.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  )) {
    return true
  }
  
  return false
}

/**
 * Check if error indicates missing migration/tables
 */
export function isMigrationMissingError(error: unknown): boolean {
  const message = getErrorMessage(error)
  const code = getErrorCode(error)
  
  // Check Prisma error codes
  if (PRISMA_MIGRATION_ERRORS.some(c => code?.includes(c))) {
    return true
  }
  
  // Check SQLite patterns
  if (SQLITE_MIGRATION_ERRORS.some(pattern => {
    const regex = new RegExp(pattern, 'i')
    return regex.test(message)
  })) {
    return true
  }
  
  return false
}

/**
 * Check if error indicates permission issues
 */
export function isPermissionError(error: unknown): boolean {
  const message = getErrorMessage(error)
  
  return SQLITE_PERMISSION_ERRORS.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  )
}

/**
 * Classify a database error into a specific type
 */
export function classifyDbError(error: unknown): DbErrorInfo {
  // No error = success
  if (!error) {
    return {
      type: 'DATA_EMPTY',
      message: 'No data found',
      userMessage: 'Belum ada data tersedia.',
      canRetry: false,
      needsMigration: false,
      needsAdmin: false,
    }
  }
  
  const message = getErrorMessage(error)
  
  // Check in order of specificity
  if (isConnectionError(error)) {
    return {
      type: 'CONNECTION',
      message,
      userMessage: 'Tidak dapat terhubung ke database. Pastikan database sudah berjalan.',
      canRetry: true,
      needsMigration: false,
      needsAdmin: true,
    }
  }
  
  if (isPermissionError(error)) {
    return {
      type: 'PERMISSION',
      message,
      userMessage: 'Tidak dapat mengakses file database. Periksa permission folder /data.',
      canRetry: false,
      needsMigration: false,
      needsAdmin: true,
    }
  }
  
  if (isMigrationMissingError(error)) {
    return {
      type: 'MIGRATION',
      message,
      userMessage: 'Database belum diinisialisasi. Jalankan migration terlebih dahulu.',
      canRetry: false,
      needsMigration: true,
      needsAdmin: true,
    }
  }
  
  // Default to unknown
  return {
    type: 'UNKNOWN',
    message,
    userMessage: 'Terjadi kesalahan database. Coba refresh halaman.',
    canRetry: true,
    needsMigration: false,
    needsAdmin: false,
  }
}

/**
 * Get error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

/**
 * Get Prisma/SQLite error code if available
 */
export function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  
  // Prisma error
  if ('code' in error) {
    return String((error as { code: unknown }).code)
  }
  
  // SQLite error from message
  const message = getErrorMessage(error)
  const sqliteMatch = message.match(/SQLITE_[A-Z]+/)
  if (sqliteMatch) {
    return sqliteMatch[0]
  }
  
  // Prisma error code from message (e.g., "P2021")
  const prismaMatch = message.match(/P\d{4}/)
  if (prismaMatch) {
    return prismaMatch[0]
  }
  
  return undefined
}

/**
 * User-friendly messages for each error type
 */
export const ERROR_MESSAGES: Record<DbErrorType, {
  title: string
  description: string
  action?: string
}> = {
  CONNECTION: {
    title: 'Database Tidak Terhubung',
    description: 'Aplikasi tidak dapat terhubung ke database.',
    action: 'Periksa koneksi database dan restart aplikasi.',
  },
  MIGRATION: {
    title: 'Database Belum Diinisialisasi',
    description: 'Struktur database belum dibuat. Migration perlu dijalankan.',
    action: 'Jalankan: prisma migrate deploy',
  },
  PERMISSION: {
    title: 'Akses Database Ditolak',
    description: 'Aplikasi tidak memiliki izin untuk mengakses file database.',
    action: 'Periksa permission folder /data dan ownership file database.',
  },
  DATA_EMPTY: {
    title: 'Belum Ada Data',
    description: 'Database terhubung tapi belum ada konten.',
    action: 'Tambahkan produk melalui Admin Panel.',
  },
  QUERY: {
    title: 'Error Query Database',
    description: 'Terjadi kesalahan saat mengambil data.',
    action: 'Coba refresh halaman atau hubungi admin.',
  },
  UNKNOWN: {
    title: 'Error Database',
    description: 'Terjadi kesalahan yang tidak diketahui.',
    action: 'Coba refresh halaman atau hubungi admin.',
  },
}
