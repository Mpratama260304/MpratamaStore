import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number, currency = "IDR"): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `MPS-${timestamp}-${random}`
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + "..."
}

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case "LEGENDARY":
      return "text-yellow-400 border-yellow-500"
    case "EPIC":
      return "text-purple-400 border-purple-500"
    case "RARE":
      return "text-blue-400 border-blue-500"
    default:
      return "text-slate-400 border-slate-500"
  }
}

export function getRarityGlow(rarity: string): string {
  switch (rarity) {
    case "LEGENDARY":
      return "rarity-legendary"
    case "EPIC":
      return "rarity-epic"
    case "RARE":
      return "rarity-rare"
    default:
      return "rarity-common"
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "PAID":
    case "FULFILLED":
    case "APPROVED":
    case "PUBLISHED":
      return "bg-green-500/20 text-green-400 border-green-500/30"
    case "PENDING_PAYMENT":
    case "PAYMENT_REVIEW":
    case "SUBMITTED":
    case "DRAFT":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    case "REJECTED":
    case "CANCELED":
    case "ARCHIVED":
      return "bg-red-500/20 text-red-400 border-red-500/30"
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30"
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Zero-decimal currencies for Stripe (amount is in whole units, not cents)
// IMPORTANT: As of Stripe API 2025-12-15, IDR is NOT in this list!
// IDR is treated as two-decimal currency by Stripe.
// Reference: https://stripe.com/docs/currencies#zero-decimal
const ZERO_DECIMAL_CURRENCIES = [
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf',
  'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'
  // NOTE: 'idr' removed - Stripe treats IDR as two-decimal!
]

/**
 * Convert price to Stripe unit_amount based on currency
 * For zero-decimal currencies (like JPY): no conversion needed
 * For two-decimal currencies (like USD, EUR, IDR): multiply by 100
 * 
 * Examples:
 * - JPY 1000 → 1000 (zero-decimal)
 * - USD 10.00 → 1000 (two-decimal)
 * - IDR 199000 → 19900000 (two-decimal, Stripe displays as Rp199,000.00)
 */
export function toStripeAmount(amount: number, currency: string): number {
  const currencyLower = currency.toLowerCase()
  if (ZERO_DECIMAL_CURRENCIES.includes(currencyLower)) {
    // Zero-decimal: send as-is (e.g., JPY 1000 → 1000)
    return Math.round(amount)
  }
  // Two-decimal currencies (including IDR): multiply by 100
  return Math.round(amount * 100)
}

/**
 * Convert Stripe amount back to display amount
 */
export function fromStripeAmount(amount: number, currency: string): number {
  const currencyLower = currency.toLowerCase()
  if (ZERO_DECIMAL_CURRENCIES.includes(currencyLower)) {
    return amount
  }
  return amount / 100
}
