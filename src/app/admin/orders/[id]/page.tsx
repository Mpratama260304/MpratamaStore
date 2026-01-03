import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/utils"
import { OrderActions } from "./order-actions"
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  CreditCard,
  Package,
  Clock,
  CheckCircle,
  Image,
} from "lucide-react"

interface Props {
  params: { id: string }
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case "PENDING_PAYMENT":
      return "warning"
    case "PAYMENT_VERIFICATION":
      return "secondary"
    case "PAID":
      return "success"
    case "COMPLETED":
      return "success"
    case "CANCELLED":
      return "destructive"
    case "REFUNDED":
      return "outline"
    default:
      return "secondary"
  }
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, username: true, email: true } },
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
      paymentProofs: {
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!order) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">Order {order.orderNumber}</h2>
            <p className="text-muted-foreground">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <Badge variant={getStatusVariant(order.status) as any} className="text-base px-4 py-1">
          {order.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30"
                  >
                    <div className="w-16 h-16 rounded-lg bg-secondary overflow-hidden">
                      {item.product?.images[0] ? (
                        <img
                          src={item.product.images[0].url}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.productName}</p>
                        {item.product?.rarity && (
                          <Badge variant={item.product.rarity.toLowerCase() as any}>
                            {item.product.rarity}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity} × {formatPrice(item.productPrice)}
                      </p>
                    </div>
                    <p className="font-bold text-green-400">
                      {formatPrice(item.productPrice * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-green-400">
                  {formatPrice(order.total)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Proofs */}
          {order.paymentProofs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Payment Proofs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.paymentProofs.map((proof) => (
                    <div
                      key={proof.id}
                      className="flex gap-4 p-3 rounded-lg bg-secondary/30"
                    >
                      <a
                        href={proof.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-32 h-32 rounded-lg overflow-hidden bg-secondary"
                      >
                        <img
                          src={proof.proofUrl}
                          alt="Payment proof"
                          className="w-full h-full object-cover"
                        />
                      </a>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant={
                              proof.status === "APPROVED"
                                ? "success"
                                : proof.status === "REJECTED"
                                ? "destructive"
                                : "warning"
                            }
                          >
                            {proof.status === "SUBMITTED" && <Clock className="mr-1 h-3 w-3" />}
                            {proof.status === "APPROVED" && <CheckCircle className="mr-1 h-3 w-3" />}
                            {proof.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Uploaded: {new Date(proof.createdAt).toLocaleString()}
                        </p>
                        {proof.notes && (
                          <p className="text-sm mt-2">{proof.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Customer Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{order.customerName || order.user?.username || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{order.customerEmail || order.user?.email || "N/A"}</span>
              </div>
              {order.customerPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{order.customerPhone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <Badge variant="outline">
                  {order.paymentMethod === "GATEWAY" ? "Gateway" : "Manual Transfer"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency</span>
                <span>{order.currency}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-green-400">
                  {formatPrice(order.total)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <OrderActions order={order} />
        </div>
      </div>
    </div>
  )
}
