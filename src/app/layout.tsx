import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "@/components/providers"
import { getSiteSettings, getSeoSettings } from "@/lib/settings"
import { getBaseUrl } from "@/lib/base-url"

// Force dynamic rendering - metadata requires database at runtime
export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans" })

export async function generateMetadata(): Promise<Metadata> {
  const [siteSettings, seoSettings] = await Promise.all([
    getSiteSettings(),
    getSeoSettings(),
  ])

  // Note: generateMetadata doesn't have access to request headers
  // so it uses env-based or fallback URL for metadataBase
  const siteUrl = getBaseUrl()

  return {
    title: {
      default: seoSettings.defaultMetaTitle,
      template: `%s | ${siteSettings.siteTitle}`,
    },
    description: seoSettings.defaultMetaDescription,
    metadataBase: new URL(siteUrl),
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: siteUrl,
      siteName: siteSettings.siteTitle,
      title: seoSettings.defaultMetaTitle,
      description: seoSettings.defaultMetaDescription,
      images: siteSettings.ogImageDefault
        ? [{ url: siteSettings.ogImageDefault }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: seoSettings.defaultMetaTitle,
      description: seoSettings.defaultMetaDescription,
      site: seoSettings.twitterHandle || undefined,
    },
    robots: {
      index: seoSettings.robotsIndex,
      follow: seoSettings.robotsFollow,
    },
    icons: {
      icon: siteSettings.favicon || "/favicon.ico",
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
