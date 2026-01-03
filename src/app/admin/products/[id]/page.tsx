import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { parseStats } from "@/lib/utils"

// Force dynamic rendering - database required at runtime
export const dynamic = 'force-dynamic'
import { ProductForm } from "../product-form"

interface Props {
  params: { id: string }
}

export default async function EditProductPage({ params }: Props) {
  const [product, categories, tags] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
      include: {
        images: true,
        tags: true,
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ])

  if (!product) {
    notFound()
  }

  const formattedProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription || "",
    description: product.description || "",
    price: product.price,
    compareAtPrice: product.compareAtPrice || null,
    currency: product.currency,
    rarity: product.rarity,
    status: product.status,
    isSoldOut: product.isSoldOut,
    deliveryType: product.deliveryType,
    categoryId: product.categoryId,
    tagIds: product.tags.map((t) => t.id),
    images: product.images.map((img) => ({ url: img.url, alt: img.alt || "" })),
    stats: parseStats(product.stats) || { power: 50, utility: 50, rarity: 50 },
  }

  return <ProductForm product={formattedProduct} categories={categories} tags={tags} />
}
