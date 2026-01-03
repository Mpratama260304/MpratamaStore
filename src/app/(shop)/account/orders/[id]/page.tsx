import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatPrice, getRarityGlow } from "@/lib/utils"
import {
  ChevronRight,
  Download,
  Key,
  ExternalLink,
  Copy,
  CheckCircle,
  Sparkles,
  Shield,
  ArrowLeft,
} from "lucide-react"
import { DownloadButton } from "./download-button"

interface Props {
  params: { id: string }
}

export default async function OrderDetailPage({ params }: Props) {
  let session
  try {
    session = await requireAuth()
  } catch {
    redirect("/login?redirect=/account/orders/" + params.id)
  }

  const order = await prisma.order.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              rarity: true,
              deliveryType: true,
              externalLink: true,
              images: { take: 1 },
              digitalAsset: true,
              licenseKeys: {
                where: {
                  OR: [
                    { isUsed: false },
                    { orderItemId: params.id },
                  ],
                },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  if (!order) {
    notFound()
  }

  // Type for order items
  type OrderItemWithProduct = (typeof order.items)[number]

  // Check if order is paid/fulfilled for showing digital assets
  const isPaidOrFulfilled = order.status === "PAID" || order.status === "FULFILLED"

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/account/orders" className="hover:text-foreground">Quest Receipts</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{order.orderNumber}</span>
      </nav>

      <div className="flex items-center gap-4 mb-8">
        <Link href="/account/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Claim Rewards</h1>
          <p className="text-muted-foreground">Order #{order.orderNumber}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Downloads */}
        <div className="lg:col-span-2 space-y-6">
          {isPaidOrFulfilled ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                  Your Digital Artifacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.items.map((item: OrderItemWithProduct) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border-2 bg-card ${getRarityGlow(item.product?.rarity || 'COMMON')}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
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
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{item.productName}</h3>
                          {item.product?.rarity && (
                            <Badge variant={item.product.rarity.toLowerCase() as any}>
                              {item.product.rarity}
                            </Badge>
                          )}
                        </div>

                        {/* File Download */}
                        {item.product?.deliveryType === "FILE" && (
                          <div className="mt-3">
                            {item.product.digitalAsset ? (
                              <div className="space-y-2">
                                <DownloadButton
                                  assetId={item.product.digitalAsset.id}
                                  fileName={item.product.digitalAsset.filename}
                                    orderId={order.id}
                                  />
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Download will be available soon.
                              </p>
                            )}
                          </div>
                        )}

                        {/* License Key */}
                        {item.product?.deliveryType === "LICENSE_KEY" && (
                          <div className="mt-3">
                            {item.product.licenseKeys[0] ? (
                              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                                <Key className="h-4 w-4 text-purple-400" />
                                <code className="flex-1 font-mono text-sm">
                                  {item.product.licenseKeys[0].key}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.product!.licenseKeys[0].key)
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                License key will be provided soon.
                              </p>
                          )}
                        </div>
                      )}

                      {/* External Link */}
                      {item.product?.deliveryType === "EXTERNAL_LINK" && (
                        <div className="mt-3">
                          {item.product.externalLink ? (
                            <a
                              href={item.product.externalLink}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="outline">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Access Content
                              </Button>
                            </a>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Access link will be provided soon.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-400" />
                  Payment Required
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Your order is awaiting payment. Please complete the payment to access your digital artifacts.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href={`/order/${order.id}/payment`}>
                    <Button variant="legendary" className="w-full sm:w-auto">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Complete Payment
                    </Button>
                  </Link>
                </div>
                <div className="mt-4 p-4 rounded-lg bg-secondary/50">
                  <h4 className="font-semibold mb-2">Order Items</h4>
                  {order.items.map((item: OrderItemWithProduct) => (
                    <div key={item.id} className="flex justify-between py-2 border-b border-border/50 last:border-0">
                      <span>{item.productName} x{item.quantity}</span>
                      <span className="text-muted-foreground">{formatPrice(Number(item.productPrice) * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions - only show if paid */}
          {isPaidOrFulfilled && (
          <Card>
            <CardHeader>
              <CardTitle>Important Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <p>
                  Your downloads are secured and tied to your account. Do not share your 
                  download links or license keys with others.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Download className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p>
                  Download links expire after 24 hours for security reasons. You can always 
                  return to this page to get fresh download links.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <p>
                  You have lifetime access to your purchased digital products. 
                  Bookmark this page for easy access.
                </p>
              </div>
            </CardContent>
          </Card>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Number</span>
                  <span className="font-mono">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="success">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {order.status}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                {order.items.map((item: OrderItemWithProduct) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.productName}</span>
                    <span>{formatPrice(item.productPrice)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-green-400">
                  {formatPrice(order.total)}
                </span>
              </div>

              <Link href="/shop">
                <Button variant="outline" className="w-full mt-4">
                  Continue Shopping
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
