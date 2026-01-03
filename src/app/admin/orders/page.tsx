import Link from "next/link"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering - database required at runtime
export const dynamic = 'force-dynamic'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatPrice } from "@/lib/utils"
import { Search, Eye, ShoppingCart, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react"

interface Props {
  searchParams: { page?: string; search?: string; status?: string }
}

const statusOptions = [
  { value: "", label: "All" },
  { value: "PENDING_PAYMENT", label: "Pending" },
  { value: "PAYMENT_VERIFICATION", label: "Verifying" },
  { value: "PAID", label: "Paid" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
]

const getStatusIcon = (status: string) => {
  switch (status) {
    case "PENDING_PAYMENT":
      return <Clock className="h-3 w-3" />
    case "PAYMENT_VERIFICATION":
      return <Clock className="h-3 w-3" />
    case "PAID":
      return <CheckCircle className="h-3 w-3" />
    case "COMPLETED":
      return <CheckCircle className="h-3 w-3" />
    case "CANCELLED":
      return <XCircle className="h-3 w-3" />
    case "REFUNDED":
      return <AlertCircle className="h-3 w-3" />
    default:
      return null
  }
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

export default async function AdminOrdersPage({ searchParams }: Props) {
  const page = parseInt(searchParams.page || "1")
  const limit = 10
  const skip = (page - 1) * limit
  const search = searchParams.search || ""
  const status = searchParams.status || ""

  const where = {
    ...(search && {
      OR: [
        { orderNumber: { contains: search, mode: "insensitive" as const } },
        { customerEmail: { contains: search, mode: "insensitive" as const } },
        { customerName: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(status && { status: status as any }),
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { username: true, email: true } },
        items: true,
        paymentProofs: { take: 1, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Orders</h2>
          <p className="text-muted-foreground">Manage customer orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <form className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search orders..."
            defaultValue={search}
            className="pl-9"
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          {statusOptions.map((option) => (
            <Link
              key={option.value}
              href={`/admin/orders${option.value ? `?status=${option.value}` : ""}`}
            >
              <Button
                variant={status === option.value ? "secondary" : "ghost"}
                size="sm"
              >
                {option.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No orders found</p>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <p className="font-mono font-medium">{order.orderNumber}</p>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.customerName || order.user?.username}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.customerEmail || order.user?.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.items.length} item{order.items.length > 1 ? "s" : ""}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-green-400">
                      {formatPrice(order.total)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {order.paymentMethod === "GATEWAY" ? "Gateway" : "Manual"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(order.status) as any}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1">{order.status.replace("_", " ")}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/orders/${order.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {skip + 1} to {Math.min(skip + limit, total)} of {total} orders
          </p>
          <div className="flex gap-2">
            <Link
              href={`/admin/orders?page=${page - 1}${search ? `&search=${search}` : ""}${status ? `&status=${status}` : ""}`}
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            >
              <Button variant="outline" size="sm" disabled={page <= 1}>
                Previous
              </Button>
            </Link>
            <Link
              href={`/admin/orders?page=${page + 1}${search ? `&search=${search}` : ""}${status ? `&status=${status}` : ""}`}
              className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
            >
              <Button variant="outline" size="sm" disabled={page >= totalPages}>
                Next
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
