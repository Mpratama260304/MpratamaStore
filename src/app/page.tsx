import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProductImage } from "@/components/ui/product-image"
import { withDb, isDbEnabled } from "@/lib/db"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering - database required at runtime
export const dynamic = 'force-dynamic'
import { formatPrice, getRarityGlow, parseStats } from "@/lib/utils"
import { getSiteSettings, DEFAULT_SITE_SETTINGS } from "@/lib/settings"
import { DbOfflineBanner } from "@/components/db-offline-notice"
import { 
  Sparkles, 
  Shield, 
  Zap, 
  Download, 
  ChevronRight,
  Star,
  Crown,
  Sword,
  Scroll,
  Bot,
  Brain,
  BookOpen,
  Palette
} from "lucide-react"
import { MainNav } from "@/components/layout/main-nav"
import { Footer } from "@/components/layout/footer"

async function getFeaturedProducts() {
  if (!isDbEnabled()) {
    console.log('[Home] Skipping getFeaturedProducts - DB disabled')
    return { products: [], fromDb: false }
  }

  const result = await withDb(
    async (db) => {
      return db.product.findMany({
        where: { status: "PUBLISHED" },
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          category: true,
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      })
    },
    [],
    'getFeaturedProducts'
  )
  return { products: result.data, fromDb: result.fromDb }
}

async function getCategories() {
  if (!isDbEnabled()) {
    console.log('[Home] Skipping getCategories - DB disabled')
    return { categories: [], fromDb: false }
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
  return { categories: result.data, fromDb: result.fromDb }
}

const categoryIcons: Record<string, React.ReactNode> = {
  script: <Scroll className="h-8 w-8" />,
  bot: <Bot className="h-8 w-8" />,
  ai: <Brain className="h-8 w-8" />,
  ebook: <BookOpen className="h-8 w-8" />,
  asset: <Palette className="h-8 w-8" />,
}

export default async function HomePage() {
  const [settings, productsResult, categoriesResult] = await Promise.all([
    getSiteSettings(),
    getFeaturedProducts(),
    getCategories(),
  ])

  const products = productsResult.products
  const categories = categoriesResult.categories
  const dbOffline = !productsResult.fromDb && !categoriesResult.fromDb

  return (
    <div className="min-h-screen bg-background">
      {/* DB Offline Banner */}
      {dbOffline && (
        <DbOfflineBanner message="Database tidak terhubung. Konten tidak tersedia." />
      )}

      {/* Store Notice Banner */}
      {settings.storeNotice && (
        <div className="bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-green-600/20 border-b border-purple-500/20 py-2 px-4 text-center text-sm">
          {settings.storeNotice}
        </div>
      )}

      <MainNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        
        <div className="container relative mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="epic" className="mb-6">
              <Sparkles className="h-3 w-3 mr-1" />
              Fantasy Digital Market
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="text-gradient">{settings.siteTitle}</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-4">
              {settings.siteTagline}
            </p>
            
            <p className="text-lg text-muted-foreground/80 mb-10 max-w-2xl mx-auto">
              {settings.siteDescription}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="xl" variant="legendary">
                <Link href="/shop">
                  <Sword className="mr-2 h-5 w-5" />
                  Enter Market
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href="#categories">
                  Explore Categories
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-12 border-y border-border/50 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 mb-3">
                <Download className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-1">Instant Download</h3>
              <p className="text-sm text-muted-foreground">Akses langsung setelah bayar</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 mb-3">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-1">Secure Payment</h3>
              <p className="text-sm text-muted-foreground">Transaksi aman & terenkripsi</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 text-green-400 mb-3">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-1">Fast Support</h3>
              <p className="text-sm text-muted-foreground">Bantuan cepat 24/7</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/20 text-yellow-400 mb-3">
                <Star className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-1">Premium Quality</h3>
              <p className="text-sm text-muted-foreground">Produk berkualitas tinggi</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <Crown className="inline-block h-8 w-8 text-yellow-400 mr-3" />
              Category Portals
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Jelajahi berbagai kategori produk digital premium kami
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/shop?category=${category.slug}`}
                className="group relative p-6 rounded-xl border border-border/50 bg-card hover:border-purple-500/50 transition-all duration-300 hover:glow-purple"
              >
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                    {categoryIcons[category.slug] || <Scroll className="h-8 w-8" />}
                  </div>
                  <h3 className="font-semibold mb-1 group-hover:text-purple-400 transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {category._count.products} items
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                <Sparkles className="inline-block h-8 w-8 text-purple-400 mr-3" />
                Featured Items
              </h2>
              <p className="text-muted-foreground">
                Produk terbaru dan terpopuler
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/shop">
                View All
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.slug}`}
                className={`group relative rounded-xl border-2 bg-card overflow-hidden card-tilt ${getRarityGlow(product.rarity)}`}
              >
                {/* Rarity Badge */}
                <div className="absolute top-3 left-3 z-10">
                  <Badge variant={product.rarity.toLowerCase() as 'common' | 'rare' | 'epic' | 'legendary'}>
                    {product.rarity}
                  </Badge>
                </div>
                
                {/* Image */}
                <ProductImage
                  src={product.images[0]?.url}
                  alt={product.name}
                  category={product.category?.slug}
                  className="aspect-square w-full"
                  fill
                />
                
                {/* Content */}
                <div className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">
                    {product.category?.name}
                  </div>
                  <h3 className="font-semibold mb-2 group-hover:text-purple-400 transition-colors line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {product.shortDescription}
                  </p>
                  
                  {/* Stats */}
                  {parseStats(product.stats) && (
                    <div className="flex gap-2 mb-3">
                      {Object.entries(parseStats(product.stats)!).slice(0, 3).map(([key, value]) => (
                        <div key={key} className="text-xs bg-secondary/50 px-2 py-1 rounded">
                          <span className="text-muted-foreground">{key}:</span>{" "}
                          <span className="text-purple-400">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Price */}
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
                    {product.isSoldOut && (
                      <Badge variant="error">Sold Out</Badge>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 fantasy-gradient opacity-90" />
            <div className="relative px-8 py-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                Ready to Start Your Quest?
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                Bergabunglah dengan ribuan user yang sudah merasakan produk digital premium kami
              </p>
              <Button asChild size="xl" className="bg-white text-purple-600 hover:bg-white/90">
                <Link href="/shop">
                  <Sword className="mr-2 h-5 w-5" />
                  Explore Market
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
