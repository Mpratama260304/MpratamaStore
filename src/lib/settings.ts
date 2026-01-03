import { prisma } from './prisma'
import { cache } from 'react'

export const getSiteSettings = cache(async () => {
  let settings = await prisma.siteSetting.findUnique({
    where: { id: 'site-settings' },
  })

  if (!settings) {
    settings = await prisma.siteSetting.create({
      data: { id: 'site-settings' },
    })
  }

  return settings
})

export const getSeoSettings = cache(async () => {
  let settings = await prisma.seoSetting.findUnique({
    where: { id: 'seo-settings' },
  })

  if (!settings) {
    settings = await prisma.seoSetting.create({
      data: { id: 'seo-settings' },
    })
  }

  return settings
})

export const getPaymentSettings = cache(async () => {
  let settings = await prisma.paymentSetting.findUnique({
    where: { id: 'payment-settings' },
  })

  if (!settings) {
    settings = await prisma.paymentSetting.create({
      data: { id: 'payment-settings' },
    })
  }

  return settings
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
