import Link from "next/link"
import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering - database required at runtime
export const dynamic = 'force-dynamic'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"
import {
  ChevronRight,
  Package,
  Settings,
  ShoppingCart,
  Clock,
  CheckCircle,
  Sparkles,
  Shield,
} from "lucide-react"

export default async function AccountPage() {
  let session
  try {
    session = await requireAuth()
  } catch {
    redirect("/login?redirect=/account")
  }

  // Fetch user data
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) {
    redirect("/login")
  }

  // Fetch recent orders separately with proper typing
  const orders: Array<{
    id: string
    orderNumber: string
    status: string
    total: { toNumber: () => number } | number
    createdAt: Date
  }> = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      createdAt: true,
    },
  })

  // Get order count
  const orderCount = await prisma.order.count({
    where: { userId: session.user.id },
  })

  const initials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user.username.slice(0, 2).toUpperCase()

  const completedOrders = await prisma.order.count({
    where: {
      userId: session.user.id,
      status: { in: ["PAID", "FULFILLED"] },
    },
  })

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Account</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center">
            <Avatar className="h-24 w-24 mx-auto mb-4 ring-2 ring-purple-500/50">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-500 text-white text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-2xl">{user.username}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
            {user.role === "ADMIN" && (
              <Badge variant="legendary" className="mt-2">
                <Shield className="mr-1 h-3 w-3" />
                Admin
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-2xl font-bold text-purple-400">{orderCount}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-2xl font-bold text-cyan-400">{completedOrders}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground text-center">
              Member since {new Date(user.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Recent Orders */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Link href="/account/orders">
              <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-purple-500/50 transition-colors cursor-pointer">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <Package className="h-8 w-8 text-purple-400 mb-3" />
                  <CardTitle className="text-base mb-1">Quest Receipts</CardTitle>
                  <CardDescription className="text-xs">View your orders</CardDescription>
                </CardContent>
              </Card>
            </Link>
            <Link href="/account/settings">
              <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-cyan-500/50 transition-colors cursor-pointer">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <Settings className="h-8 w-8 text-cyan-400 mb-3" />
                  <CardTitle className="text-base mb-1">Settings</CardTitle>
                  <CardDescription className="text-xs">Manage profile</CardDescription>
                </CardContent>
              </Card>
            </Link>
            <Link href="/shop">
              <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-green-500/50 transition-colors cursor-pointer">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <Sparkles className="h-8 w-8 text-green-400 mb-3" />
                  <CardTitle className="text-base mb-1">Browse Shop</CardTitle>
                  <CardDescription className="text-xs">Find new items</CardDescription>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Recent Orders */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Your latest transactions</CardDescription>
              </div>
              <Link href="/account/orders">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">No orders yet</p>
                  <Link href="/shop">
                    <Button variant="glow" size="sm">
                      Start Shopping
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/account/orders/${order.id}`}
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">#{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatPrice(Number(order.total))}</p>
                        <Badge
                          variant={
                            order.status === "FULFILLED" || order.status === "PAID"
                              ? "success"
                              : order.status === "PENDING_PAYMENT"
                              ? "warning"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {order.status === "FULFILLED" || order.status === "PAID" ? (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          ) : (
                            <Clock className="mr-1 h-3 w-3" />
                          )}
                          {order.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
