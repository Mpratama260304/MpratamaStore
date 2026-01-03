import Link from "next/link"
import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPrice } from "@/lib/utils"
import {
  ShoppingCart,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react"

const getStatusIcon = (status: string) => {
  switch (status) {
    case "PENDING_PAYMENT":
    case "PAYMENT_VERIFICATION":
      return <Clock className="h-4 w-4" />
    case "PAID":
    case "COMPLETED":
      return <CheckCircle className="h-4 w-4" />
    default:
      return <AlertCircle className="h-4 w-4" />
  }
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case "PENDING_PAYMENT":
      return "warning"
    case "PAYMENT_VERIFICATION":
      return "secondary"
    case "PAID":
    case "COMPLETED":
      return "success"
    case "CANCELLED":
    case "REFUNDED":
      return "destructive"
    default:
      return "secondary"
  }
}

export default async function AccountOrdersPage() {
  let session
  try {
    session = await requireAuth()
  } catch {
    redirect("/login?redirect=/account/orders")
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              rarity: true,
              images: { take: 1 },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Quest Receipts</span>
      </nav>

      <h1 className="text-3xl font-bold mb-8">Quest Receipts</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">No orders yet</h2>
          <p className="text-muted-foreground mb-8">
            Start your journey by acquiring powerful digital artifacts!
          </p>
          <Link href="/shop">
            <Button variant="legendary">
              <Sparkles className="mr-2 h-5 w-5" />
              Browse Shop
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Order #{order.orderNumber}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={getStatusVariant(order.status) as any}>
                  {getStatusIcon(order.status)}
                  <span className="ml-1">{order.status.replace("_", " ")}</span>
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30"
                    >
                      <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden">
                        {item.product?.images[0] ? (
                          <img
                            src={item.product.images[0].url}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="font-bold text-green-400">
                        {formatPrice(item.productPrice * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-lg font-bold">
                    Total: <span className="text-green-400">{formatPrice(order.total)}</span>
                  </div>
                  
                  {order.status === "PENDING_PAYMENT" && (
                    <Link href={`/order/${order.id}/payment`}>
                      <Button variant="legendary">
                        Complete Payment
                      </Button>
                    </Link>
                  )}
                  
                  {(order.status === "PAID" || order.status === "FULFILLED") && (
                    <Link href={`/account/orders/${order.id}`}>
                      <Button variant="legendary">
                        <Download className="mr-2 h-4 w-4" />
                        Claim Rewards
                      </Button>
                    </Link>
                  )}
                  
                  {order.status === "PAYMENT_REVIEW" && (
                    <Badge variant="secondary">
                      <Clock className="mr-1 h-3 w-3" />
                      Verifying Payment
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
