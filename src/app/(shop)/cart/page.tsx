"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/hooks/use-cart"
import { formatPrice, getRarityGlow } from "@/lib/utils"
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react"

export default function CartPage() {
  const router = useRouter()
  const { items, removeItem, updateQuantity, total, clearCart } = useCart()

  const handleCheckout = () => {
    router.push("/checkout")
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-md mx-auto">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-secondary/50 flex items-center justify-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Your Inventory is Empty</h1>
          <p className="text-muted-foreground mb-8">
            Your inventory awaits legendary items. Begin your quest to discover powerful digital artifacts.
          </p>
          <Link href="/shop">
            <Button variant="legendary" size="lg">
              <Sparkles className="mr-2 h-5 w-5" />
              Browse Shop
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Inventory</span>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Your Inventory</h1>
        <Button variant="ghost" onClick={clearCart}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear All
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className={`flex gap-4 p-4 rounded-xl border-2 bg-card ${getRarityGlow(item.rarity)}`}
            >
              {/* Image */}
              <div className="w-24 h-24 rounded-lg bg-secondary/50 flex-shrink-0 overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant={item.rarity.toLowerCase() as 'common' | 'rare' | 'epic' | 'legendary'} className="mb-1">
                      {item.rarity}
                    </Badge>
                    <h3 className="font-semibold truncate">{item.name}</h3>
                    <p className="text-green-400 font-bold">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.productId)}
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <span className="ml-auto text-muted-foreground">
                    Subtotal: <span className="text-foreground font-bold">{formatPrice(item.price * item.quantity)}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}

          <Link href="/shop" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Continue Shopping
          </Link>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-card border-2 border-purple-500/20 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processing Fee</span>
                <span className="text-green-400">Free</span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between text-lg font-bold mb-6">
              <span>Total</span>
              <span className="text-green-400">{formatPrice(total)}</span>
            </div>

            <Button
              variant="legendary"
              size="lg"
              className="w-full"
              onClick={handleCheckout}
            >
              <Zap className="mr-2 h-5 w-5" />
              Forge Checkout
            </Button>

            <div className="mt-6 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-400" />
                <span>Secure checkout</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-400" />
                <span>Instant digital delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
