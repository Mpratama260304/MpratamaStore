import { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ProductDetails } from "./product-details"

interface ProductPageProps {
  params: { slug: string }
}

async function getProduct(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: true,
      tags: true,
    },
  })
  return product
}

async function getRelatedProducts(categoryId: string | null, productId: string) {
  if (!categoryId) return []
  
  return prisma.product.findMany({
    where: {
      categoryId,
      status: "PUBLISHED",
      id: { not: productId },
    },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      category: true,
    },
    take: 4,
  })
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProduct(params.slug)
  
  if (!product) {
    return {
      title: "Product Not Found",
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

  return {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.shortDescription || `${product.name} - MpratamaStore`,
    openGraph: {
      title: product.seoTitle || product.name,
      description: product.seoDescription || product.shortDescription || undefined,
      images: product.ogImage
        ? [{ url: product.ogImage }]
        : product.images[0]
          ? [{ url: product.images[0].url }]
          : [],
      url: `${siteUrl}/product/${product.slug}`,
      type: "website",
    },
    alternates: {
      canonical: product.canonicalUrl || `${siteUrl}/product/${product.slug}`,
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProduct(params.slug)
  
  if (!product) {
    notFound()
  }

  const relatedProducts = await getRelatedProducts(product.categoryId, product.id)

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    image: product.images[0]?.url,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency,
      availability: product.isSoldOut
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    },
    category: product.category?.name,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <ProductDetails product={product} relatedProducts={relatedProducts} />
    </>
  )
}
