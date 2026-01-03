import { cache } from 'react'
import { withDb, isDbEnabled } from './db'
import { prisma } from './prisma'

// Default settings when database is not available
export const DEFAULT_SITE_SETTINGS = {
  id: 'site-settings',
  siteTitle: 'MpratamaStore',
  siteTagline: 'Fantasy Digital Market — Claim Your Rewards',
  siteDescription: 'Toko produk digital bertema fantasy: script, bot, asset, ebook.',
  logoLight: null,
  logoDark: null,
  favicon: '/favicon.ico',
  ogImageDefault: null,
  logoUrl: null,
  maintenanceMode: false,
  storeNotice: null,
  primaryColor: '#8B5CF6',
  accentColor: '#3B82F6',
  currency: 'IDR',
  enableManualPayment: false,
  enableStripe: false,
  enablePaypal: false,
  manualPaymentAccounts: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const DEFAULT_SEO_SETTINGS = {
  id: 'seo-settings',
  defaultMetaTitle: 'MpratamaStore - Fantasy Digital Market',
  defaultMetaDescription: 'Toko produk digital premium dengan pengalaman belanja seperti game',
  robotsIndex: true,
  robotsFollow: true,
  generateSitemap: true,
  twitterHandle: null,
  facebookUrl: null,
  instagramUrl: null,
  googleAnalyticsId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const DEFAULT_PAYMENT_SETTINGS = {
  id: 'payment-settings',
  mode: 'BOTH' as const,
  gatewayProvider: null,
  midtransServerKey: null,
  midtransClientKey: null,
  midtransIsProduction: false,
  stripeSecretKey: null,
  stripePublishableKey: null,
  stripeWebhookSecret: null,
  manualAccounts: null,
  manualInstructions: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const getSiteSettings = cache(async () => {
  // Quick check - if DB disabled, return defaults immediately
  if (!isDbEnabled()) {
    console.log('[Settings] Using default site settings (DB disabled)')
    return DEFAULT_SITE_SETTINGS
  }

  const result = await withDb(
    async (db) => {
      let settings = await db.siteSetting.findUnique({
        where: { id: 'site-settings' },
      })

      if (!settings) {
        settings = await db.siteSetting.create({
          data: { id: 'site-settings' },
        })
      }

      return settings
    },
    DEFAULT_SITE_SETTINGS,
    'getSiteSettings'
  )

  if (!result.fromDb) {
    console.log('[Settings] Using default site settings:', result.error)
  }

  return result.data
})

export const getSeoSettings = cache(async () => {
  if (!isDbEnabled()) {
    console.log('[Settings] Using default SEO settings (DB disabled)')
    return DEFAULT_SEO_SETTINGS
  }

  const result = await withDb(
    async (db) => {
      let settings = await db.seoSetting.findUnique({
        where: { id: 'seo-settings' },
      })

      if (!settings) {
        settings = await db.seoSetting.create({
          data: { id: 'seo-settings' },
        })
      }

      return settings
    },
    DEFAULT_SEO_SETTINGS,
    'getSeoSettings'
  )

  if (!result.fromDb) {
    console.log('[Settings] Using default SEO settings:', result.error)
  }

  return result.data
})

export const getPaymentSettings = cache(async () => {
  if (!isDbEnabled()) {
    console.log('[Settings] Using default payment settings (DB disabled)')
    return DEFAULT_PAYMENT_SETTINGS
  }

  const result = await withDb(
    async (db) => {
      let settings = await db.paymentSetting.findUnique({
        where: { id: 'payment-settings' },
      })

      if (!settings) {
        settings = await db.paymentSetting.create({
          data: { id: 'payment-settings' },
        })
      }

      return settings
    },
    DEFAULT_PAYMENT_SETTINGS,
    'getPaymentSettings'
  )

  if (!result.fromDb) {
    console.log('[Settings] Using default payment settings:', result.error)
  }

  return result.data
})

export interface ManualAccount {
  bank: string
  accountNumber: string
  accountName: string
}

export function parseManualAccounts(json: unknown): ManualAccount[] {
  if (!json || !Array.isArray(json)) return []
  return json as ManualAccount[]
}
