import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ArrowLeft, 
  Mail, 
  User, 
  Calendar, 
  ShoppingCart, 
  Shield,
  Phone,
  CreditCard
} from "lucide-react"
import { formatPrice, formatDate } from "@/lib/utils"

interface Props {
  params: { id: string }
}

async function getCustomer(id: string) {
  const customer = await prisma.user.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          items: {
            include: {
              product: {
                select: { name: true, slug: true }
              }
            }
          }
        }
      },
      _count: {
        select: { orders: true }
      }
    }
  })
  return customer
}

export default async function CustomerDetailPage({ params }: Props) {
  const customer = await getCustomer(params.id)

  if (!customer) {
    notFound()
  }

  const totalSpent = customer.orders.reduce((sum, order) => sum + order.total, 0)
  const initials = customer.username 
    ? customer.username.slice(0, 2).toUpperCase()
    : customer.email.slice(0, 2).toUpperCase()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/customers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">Customer Details</h1>
          <p className="text-muted-foreground">View customer information and order history</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Customer Info Card */}
        <Card className="md:col-span-1 bg-card/50 border-purple-900/30">
          <CardHeader className="text-center">
            <Avatar className="h-20 w-20 mx-auto mb-4">
              <AvatarImage src={customer.avatarUrl || undefined} />
              <AvatarFallback className="bg-purple-900/30 text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="flex items-center justify-center gap-2">
              {customer.username || "No Username"}
              {customer.role === "ADMIN" && (
                <Badge variant="legendary" className="gap-1">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{customer.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{customer.email}</span>
            </div>
            {customer.username && (
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>@{customer.username}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Joined {formatDate(customer.createdAt)}</span>
            </div>

            <div className="pt-4 border-t border-border/50 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={customer.isActive ? "success" : "destructive"}>
                  {customer.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Orders</span>
                <span className="font-medium">{customer._count.orders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Spent</span>
                <span className="font-medium text-green-400">{formatPrice(totalSpent)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders History */}
        <Card className="md:col-span-2 bg-card/50 border-purple-900/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-purple-400" />
              Order History
            </CardTitle>
            <CardDescription>
              Recent orders from this customer
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customer.orders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No orders yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(order.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/orders/${order.id}`}>
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
    PENDING_PAYMENT: "warning",
    PAID: "success",
    PROCESSING: "secondary",
    FULFILLED: "success",
    CANCELLED: "destructive",
    REFUNDED: "destructive",
  }

  const labels: Record<string, string> = {
    PENDING_PAYMENT: "Pending",
    PAID: "Paid",
    PROCESSING: "Processing",
    FULFILLED: "Fulfilled",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
  }

  return (
    <Badge variant={variants[status] || "default"}>
      {labels[status] || status}
    </Badge>
  )
}

export async function generateMetadata({ params }: Props) {
  const customer = await getCustomer(params.id)
  
  return {
    title: customer ? `${customer.username || customer.email} | Customers` : "Customer Not Found",
  }
}
