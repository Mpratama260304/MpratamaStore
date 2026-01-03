"use client"

import Link from "next/link"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ProductImage } from "@/components/ui/product-image"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatPrice, getRarityGlow } from "@/lib/utils"
import { useCart } from "@/hooks/use-cart"
import { toast } from "@/components/ui/use-toast"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Package,
} from "lucide-react"
import type { JsonValue } from "@prisma/client/runtime/library"

interface Product {
  id: string
  name: string
  slug: string
  shortDescription: string | null
  price: number
  compareAtPrice: number | null
  rarity: string
  isSoldOut: boolean
  stats: JsonValue
  images: { url: string; alt: string | null }[]
  category: { name: string; slug: string } | null
}

interface ProductGridProps {
  products: Product[]
  total: number
  page: number
  totalPages: number
  sort?: string
  search?: string
}

export function ProductGrid({
  products,
  total,
  page,
  totalPages,
  sort,
  search,
}: ProductGridProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { addItem } = useCart()
  const [searchQuery, setSearchQuery] = useState(search || "")

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString())
      
      Object.entries(params).forEach(([key, value]) => {
        if (value === null) {
          newParams.delete(key)
        } else {
          newParams.set(key, value)
        }
      })
      
      return newParams.toString()
    },
    [searchParams]
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`${pathname}?${createQueryString({ search: searchQuery || null, page: null })}`)
  }

  const handleSort = (value: string) => {
    router.push(`${pathname}?${createQueryString({ sort: value === "newest" ? null : value, page: null })}`)
  }

  const handleAddToCart = (product: Product) => {
    if (product.isSoldOut) return
    
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.images[0]?.url,
      rarity: product.rarity,
    })
    
    toast({
      title: "Added to Inventory",
      description: `${product.name} has been added to your inventory.`,
      variant: "success",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Market</h1>
          <p className="text-muted-foreground">{total} items available</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-[200px]"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          {/* Sort */}
          <Select value={sort || "newest"} onValueChange={handleSort}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-20">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No items found</h2>
          <p className="text-muted-foreground mb-4">
            Try adjusting your filters or search query
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/shop")}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className={`group relative rounded-xl border-2 bg-card overflow-hidden card-tilt ${getRarityGlow(product.rarity)}`}
            >
              {/* Rarity Badge */}
              <div className="absolute top-3 left-3 z-10">
                <Badge variant={product.rarity.toLowerCase() as 'common' | 'rare' | 'epic' | 'legendary'}>
                  {product.rarity}
                </Badge>
              </div>
              
              {/* Sold Out Badge */}
              {product.isSoldOut && (
                <div className="absolute top-3 right-3 z-10">
                  <Badge variant="error">Sold Out</Badge>
                </div>
              )}
              
              {/* Image */}
              <Link href={`/product/${product.slug}`}>
                <ProductImage
                  src={product.images[0]?.url}
                  alt={product.images[0]?.alt || product.name}
                  category={product.category?.slug}
                  className="aspect-square w-full"
                  fill
                />
              </Link>
              
              {/* Content */}
              <div className="p-4">
                <div className="text-xs text-muted-foreground mb-1">
                  {product.category?.name}
                </div>
                <Link href={`/product/${product.slug}`}>
                  <h3 className="font-semibold mb-2 group-hover:text-purple-400 transition-colors line-clamp-1">
                    {product.name}
                  </h3>
                </Link>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {product.shortDescription}
                </p>
                
                {/* Stats */}
                {product.stats && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {Object.entries(product.stats as Record<string, number>).slice(0, 3).map(([key, value]) => (
                      <div key={key} className="text-xs bg-secondary/50 px-2 py-1 rounded">
                        <span className="text-muted-foreground">{key}:</span>{" "}
                        <span className="text-purple-400">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Price & Action */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-green-400">
                      {formatPrice(product.price)}
                    </span>
                    {product.compareAtPrice && (
                      <span className="ml-2 text-sm text-muted-foreground line-through">
                        {formatPrice(product.compareAtPrice)}
                      </span>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleAddToCart(product)}
                    disabled={product.isSoldOut}
                    className="hover:bg-purple-500/20 hover:text-purple-400"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() =>
              router.push(`${pathname}?${createQueryString({ page: String(page - 1) })}`)
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, i, arr) => (
                <span key={p} className="flex items-center">
                  {i > 0 && arr[i - 1] !== p - 1 && (
                    <span className="px-2 text-muted-foreground">...</span>
                  )}
                  <Button
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      router.push(`${pathname}?${createQueryString({ page: String(p) })}`)
                    }
                  >
                    {p}
                  </Button>
                </span>
              ))}
          </div>
          
          <Button
            variant="outline"
            size="icon"
            disabled={page >= totalPages}
            onClick={() =>
              router.push(`${pathname}?${createQueryString({ page: String(page + 1) })}`)
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
