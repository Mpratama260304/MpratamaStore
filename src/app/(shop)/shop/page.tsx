import { Metadata } from "next"
import { withDb, isDbEnabled } from "@/lib/db"
import { prisma } from "@/lib/prisma"
import { ShopFilters } from "./shop-filters"
import { ProductGrid } from "./product-grid"
import { DbOfflineNotice, EmptyState } from "@/components/db-offline-notice"
import { DbErrorType } from "@/lib/db-errors"

// Force dynamic rendering - database required at runtime
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse our collection of premium digital products",
}

interface ShopPageProps {
  searchParams: {
    category?: string
    rarity?: string
    minPrice?: string
    maxPrice?: string
    delivery?: string
    sort?: string
    search?: string
    page?: string
  }
}

async function getProducts(params: ShopPageProps["searchParams"]) {
  const defaultResult = { products: [], total: 0, page: 1, totalPages: 0, fromDb: false, errorType: undefined as DbErrorType | undefined }
  
  if (!isDbEnabled()) {
    return { ...defaultResult, errorType: 'CONNECTION' as DbErrorType }
  }

  const page = parseInt(params.page || "1")
  const limit = 12
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {
    status: "PUBLISHED",
  }

  if (params.category) {
    where.category = { slug: params.category }
  }

  if (params.rarity) {
    where.rarity = params.rarity.toUpperCase()
  }

  if (params.delivery) {
    where.deliveryType = params.delivery.toUpperCase()
  }

  if (params.minPrice || params.maxPrice) {
    where.price = {}
    if (params.minPrice) {
      (where.price as Record<string, number>).gte = parseInt(params.minPrice)
    }
    if (params.maxPrice) {
      (where.price as Record<string, number>).lte = parseInt(params.maxPrice)
    }
  }

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { shortDescription: { contains: params.search, mode: "insensitive" } },
    ]
  }

  let orderBy: Record<string, string> = { createdAt: "desc" }
  
  if (params.sort === "price-asc") {
    orderBy = { price: "asc" }
  } else if (params.sort === "price-desc") {
    orderBy = { price: "desc" }
  } else if (params.sort === "name") {
    orderBy = { name: "asc" }
  }

  const result = await withDb(
    async (db) => {
      const [products, total] = await Promise.all([
        db.product.findMany({
          where,
          include: {
            images: { orderBy: { sortOrder: "asc" }, take: 1 },
            category: true,
          },
          orderBy,
          take: limit,
          skip,
        }),
        db.product.count({ where }),
      ])
      return { products, total, page, totalPages: Math.ceil(total / limit) }
    },
    { products: [], total: 0, page: 1, totalPages: 0 },
    'getProducts'
  )

  return { ...result.data, fromDb: result.fromDb, errorType: result.errorType }
}

async function getCategories() {
  if (!isDbEnabled()) {
    return { categories: [], fromDb: false, errorType: 'CONNECTION' as DbErrorType }
  }

  const result = await withDb(
    async (db) => {
      return db.category.findMany({
        include: {
          _count: { select: { products: { where: { status: "PUBLISHED" } } } },
        },
        orderBy: { sortOrder: "asc" },
      })
    },
    [],
    'getCategories'
  )
  return { categories: result.data, fromDb: result.fromDb, errorType: result.errorType }
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const [productsResult, categoriesResult] = await Promise.all([
    getProducts(searchParams),
    getCategories(),
  ])

  const { products, total, page, totalPages, fromDb: productsFromDb, errorType: productsError } = productsResult
  const { categories, fromDb: categoriesFromDb, errorType: categoriesError } = categoriesResult
  
  // Determine the error type
  const errorType = productsError || categoriesError
  
  // Only show full DB offline notice for connection errors
  if (errorType === 'CONNECTION') {
    return (
      <div className="container mx-auto px-4 py-8">
        <DbOfflineNotice errorType="CONNECTION" />
      </div>
    )
  }
  
  // For migration errors, show specific message
  if (errorType === 'MIGRATION') {
    return (
      <div className="container mx-auto px-4 py-8">
        <DbOfflineNotice errorType="MIGRATION" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="lg:w-64 flex-shrink-0">
          <ShopFilters
            categories={categories}
            currentCategory={searchParams.category}
            currentRarity={searchParams.rarity}
            currentDelivery={searchParams.delivery}
            minPrice={searchParams.minPrice}
            maxPrice={searchParams.maxPrice}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <ProductGrid
            products={products}
            total={total}
            page={page}
            totalPages={totalPages}
            sort={searchParams.sort}
            search={searchParams.search}
          />
        </main>
      </div>
    </div>
  )
}
