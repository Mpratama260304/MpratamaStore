"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Scroll, Bot, Brain, BookOpen, Palette, Filter, X } from "lucide-react"

interface Category {
  id: string
  name: string
  slug: string
  _count: { products: number }
}

interface ShopFiltersProps {
  categories: Category[]
  currentCategory?: string
  currentRarity?: string
  currentDelivery?: string
  minPrice?: string
  maxPrice?: string
}

const categoryIcons: Record<string, React.ReactNode> = {
  script: <Scroll className="h-4 w-4" />,
  bot: <Bot className="h-4 w-4" />,
  ai: <Brain className="h-4 w-4" />,
  ebook: <BookOpen className="h-4 w-4" />,
  asset: <Palette className="h-4 w-4" />,
}

const rarities = ["COMMON", "RARE", "EPIC", "LEGENDARY"]
const deliveryTypes = ["FILE", "LICENSE_KEY", "EXTERNAL_LINK"]

export function ShopFilters({
  categories,
  currentCategory,
  currentRarity,
  currentDelivery,
  minPrice,
  maxPrice,
}: ShopFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

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
      
      // Reset page when changing filters
      if (!params.hasOwnProperty("page")) {
        newParams.delete("page")
      }
      
      return newParams.toString()
    },
    [searchParams]
  )

  const setFilter = (key: string, value: string | null) => {
    router.push(`${pathname}?${createQueryString({ [key]: value })}`)
  }

  const clearFilters = () => {
    router.push(pathname)
  }

  const hasActiveFilters = currentCategory || currentRarity || currentDelivery || minPrice || maxPrice

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-purple-400" />
          <span className="font-semibold">Filters</span>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <Accordion type="multiple" defaultValue={["category", "rarity"]} className="w-full">
        {/* Category Filter */}
        <AccordionItem value="category" className="border-border/50">
          <AccordionTrigger className="text-sm hover:no-underline">
            Category
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() =>
                    setFilter(
                      "category",
                      currentCategory === category.slug ? null : category.slug
                    )
                  }
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors ${
                    currentCategory === category.slug
                      ? "bg-purple-500/20 text-purple-400"
                      : "hover:bg-secondary/50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {categoryIcons[category.slug]}
                    {category.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {category._count.products}
                  </span>
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Rarity Filter */}
        <AccordionItem value="rarity" className="border-border/50">
          <AccordionTrigger className="text-sm hover:no-underline">
            Rarity
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-wrap gap-2">
              {rarities.map((rarity) => (
                <Badge
                  key={rarity}
                  variant={rarity.toLowerCase() as 'common' | 'rare' | 'epic' | 'legendary'}
                  className={`cursor-pointer ${
                    currentRarity?.toUpperCase() === rarity
                      ? "ring-2 ring-purple-400"
                      : ""
                  }`}
                  onClick={() =>
                    setFilter(
                      "rarity",
                      currentRarity?.toUpperCase() === rarity ? null : rarity.toLowerCase()
                    )
                  }
                >
                  {rarity}
                </Badge>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Delivery Type Filter */}
        <AccordionItem value="delivery" className="border-border/50">
          <AccordionTrigger className="text-sm hover:no-underline">
            Delivery Type
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1">
              {deliveryTypes.map((type) => (
                <button
                  key={type}
                  onClick={() =>
                    setFilter(
                      "delivery",
                      currentDelivery?.toUpperCase() === type ? null : type.toLowerCase()
                    )
                  }
                  className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                    currentDelivery?.toUpperCase() === type
                      ? "bg-purple-500/20 text-purple-400"
                      : "hover:bg-secondary/50"
                  }`}
                >
                  {type.replace("_", " ")}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Price Range */}
        <AccordionItem value="price" className="border-border/50">
          <AccordionTrigger className="text-sm hover:no-underline">
            Price Range
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice || ""}
                  onChange={(e) => setFilter("minPrice", e.target.value || null)}
                  className="w-full px-2 py-1.5 rounded-md text-sm bg-secondary/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice || ""}
                  onChange={(e) => setFilter("maxPrice", e.target.value || null)}
                  className="w-full px-2 py-1.5 rounded-md text-sm bg-secondary/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
