"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProductImage } from "@/components/ui/product-image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { formatPrice, getRarityGlow, getRarityColor, parseStats, parseDescription } from "@/lib/utils"
import { useCart } from "@/hooks/use-cart"
import { toast } from "@/components/ui/use-toast"
import {
  ShoppingCart,
  ChevronRight,
  Star,
  Download,
  Key,
  ExternalLink,
  Zap,
  Shield,
  FileText,
} from "lucide-react"

interface ProductImage {
  id: string
  url: string
  alt: string | null
}

interface Category {
  name: string
  slug: string
}

interface Tag {
  id: string
  name: string
  slug: string
}

interface Product {
  id: string
  name: string
  slug: string
  shortDescription: string | null
  description: string | null  // JSON stored as string (SQLite)
  price: number
  compareAtPrice: number | null
  currency: string
  rarity: string
  isSoldOut: boolean
  stats: string | null  // JSON stored as string (SQLite)
  deliveryType: string
  images: ProductImage[]
  category: Category | null
  tags: Tag[]
}

interface RelatedProduct {
  id: string
  name: string
  slug: string
  price: number
  rarity: string
  images: { url: string; alt: string | null }[]
  category: { name: string; slug: string } | null
}

interface ProductDetailsProps {
  product: Product
  relatedProducts: RelatedProduct[]
}

const deliveryIcons: Record<string, React.ReactNode> = {
  FILE: <Download className="h-4 w-4" />,
  LICENSE_KEY: <Key className="h-4 w-4" />,
  EXTERNAL_LINK: <ExternalLink className="h-4 w-4" />,
}

export function ProductDetails({ product, relatedProducts }: ProductDetailsProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const { addItem } = useCart()

  const handleAddToCart = () => {
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

  const renderDescription = () => {
    if (!product.description) return null
    
    const desc = parseDescription(product.description)
    if (!desc) return <p>{product.description}</p>
    
    if (desc.type === "doc" && desc.content) {
      return desc.content.map((block, i) => {
        if (block.type === "paragraph" && block.content) {
          return (
            <p key={i} className="mb-4">
              {block.content.map((inline, j) => (
                <span key={j}>{inline.text}</span>
              ))}
            </p>
          )
        }
        return <span key={i} />
      })
    }
    
    return <p>{product.description}</p>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/shop" className="hover:text-foreground">Shop</Link>
        {product.category && (
          <>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-foreground">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className={`aspect-square rounded-xl border-2 overflow-hidden ${getRarityGlow(product.rarity)}`}>
            <ProductImage
              src={product.images[selectedImage]?.url}
              alt={product.images[selectedImage]?.alt || product.name}
              category={product.category?.slug}
              className="w-full h-full"
              fill
              priority
            />
          </div>
          
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImage(index)}
                  className={`w-20 h-20 rounded-lg border-2 overflow-hidden flex-shrink-0 ${
                    selectedImage === index
                      ? "border-purple-500"
                      : "border-border/50 hover:border-purple-500/50"
                  }`}
                >
                  <ProductImage
                    src={image.url}
                    alt={image.alt || `${product.name} ${index + 1}`}
                    category={product.category?.slug}
                    className="w-full h-full"
                    fill
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Category & Tags */}
          <div className="flex flex-wrap gap-2">
            {product.category && (
              <Link href={`/shop?category=${product.category.slug}`}>
                <Badge variant="outline">{product.category.name}</Badge>
              </Link>
            )}
            <Badge variant={product.rarity.toLowerCase() as 'common' | 'rare' | 'epic' | 'legendary'}>
              {product.rarity}
            </Badge>
            {product.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary">{tag.name}</Badge>
            ))}
          </div>

          {/* Title & Description */}
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${getRarityColor(product.rarity)}`}>
              {product.name}
            </h1>
            <p className="text-muted-foreground">{product.shortDescription}</p>
          </div>

          {/* Stats */}
          {parseStats(product.stats) && (
            <div className="bg-secondary/30 rounded-xl p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-400" />
                Item Stats
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(parseStats(product.stats)!).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{value}</div>
                    <div className="text-xs text-muted-foreground capitalize">{key}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Type */}
          <div className="flex items-center gap-2 text-sm">
            {deliveryIcons[product.deliveryType]}
            <span className="text-muted-foreground">Delivery:</span>
            <span>{product.deliveryType.replace("_", " ")}</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-green-400">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.compareAtPrice && (
              <span className="text-xl text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice, product.currency)}
              </span>
            )}
            {product.compareAtPrice && (
              <Badge variant="success">
                {Math.round((1 - product.price / product.compareAtPrice) * 100)}% OFF
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              size="lg"
              variant="legendary"
              onClick={handleAddToCart}
              disabled={product.isSoldOut}
              className="flex-1"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {product.isSoldOut ? "Sold Out" : "Add to Inventory"}
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
            <div className="text-center">
              <Download className="h-6 w-6 mx-auto text-purple-400 mb-1" />
              <p className="text-xs text-muted-foreground">Instant Access</p>
            </div>
            <div className="text-center">
              <Shield className="h-6 w-6 mx-auto text-blue-400 mb-1" />
              <p className="text-xs text-muted-foreground">Secure Payment</p>
            </div>
            <div className="text-center">
              <Star className="h-6 w-6 mx-auto text-yellow-400 mb-1" />
              <p className="text-xs text-muted-foreground">Premium Quality</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="description" className="mt-12">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="what-you-get">What You Get</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>
        
        <TabsContent value="description" className="mt-6">
          <div className="prose prose-invert max-w-none">
            {renderDescription()}
          </div>
        </TabsContent>
        
        <TabsContent value="what-you-get" className="mt-6">
          <div className="bg-secondary/30 rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-400" />
              Deliverables
            </h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                {deliveryIcons[product.deliveryType]}
                <span>
                  {product.deliveryType === "FILE" && "Digital file download"}
                  {product.deliveryType === "LICENSE_KEY" && "Unique license key"}
                  {product.deliveryType === "EXTERNAL_LINK" && "Access link"}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span>Instant access after purchase</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Lifetime access to purchased content</span>
              </li>
            </ul>
          </div>
        </TabsContent>
        
        <TabsContent value="faq" className="mt-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>How do I access my purchase?</AccordionTrigger>
              <AccordionContent>
                After completing your purchase, you can access your digital content from your account
                under &quot;Quest Receipts&quot;. Click &quot;Claim Rewards&quot; to download or view your purchase.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Is there a refund policy?</AccordionTrigger>
              <AccordionContent>
                Due to the digital nature of our products, we generally do not offer refunds.
                However, if you experience technical issues, please contact our support team.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>How long do I have access?</AccordionTrigger>
              <AccordionContent>
                You have lifetime access to all your purchased digital content.
                You can download or access it anytime from your account.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>
      </Tabs>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Related Items</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((item) => (
              <Link
                key={item.id}
                href={`/product/${item.slug}`}
                className={`group rounded-xl border-2 bg-card overflow-hidden card-tilt ${getRarityGlow(item.rarity)}`}
              >
                <ProductImage
                  src={item.images[0]?.url}
                  alt={item.images[0]?.alt || item.name}
                  category={item.category?.slug}
                  className="aspect-square w-full"
                  fill
                />
                <div className="p-4">
                  <Badge variant={item.rarity.toLowerCase() as 'common' | 'rare' | 'epic' | 'legendary'} className="mb-2">
                    {item.rarity}
                  </Badge>
                  <h3 className="font-semibold group-hover:text-purple-400 transition-colors line-clamp-1">
                    {item.name}
                  </h3>
                  <p className="text-green-400 font-bold mt-2">
                    {formatPrice(item.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
