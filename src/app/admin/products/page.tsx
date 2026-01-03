import Link from "next/link"
import { prisma } from "@/lib/prisma"
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
import { Plus, Search, Edit, Trash2, Eye, Package } from "lucide-react"

interface Props {
  searchParams: { page?: string; search?: string; status?: string }
}

export default async function AdminProductsPage({ searchParams }: Props) {
  const page = parseInt(searchParams.page || "1")
  const limit = 10
  const skip = (page - 1) * limit
  const search = searchParams.search || ""
  const status = searchParams.status || ""

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { slug: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(status && { status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED" }),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        images: { take: 1 },
        _count: { select: { orderItems: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="text-muted-foreground">Manage your digital products</p>
        </div>
        <Link href="/admin/products/new">
          <Button variant="legendary">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <form className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search products..."
            defaultValue={search}
            className="pl-9"
          />
        </form>
        <div className="flex gap-2">
          <Link href="/admin/products">
            <Button variant={!status ? "secondary" : "ghost"} size="sm">
              All
            </Button>
          </Link>
          <Link href="/admin/products?status=PUBLISHED">
            <Button variant={status === "PUBLISHED" ? "secondary" : "ghost"} size="sm">
              Published
            </Button>
          </Link>
          <Link href="/admin/products?status=DRAFT">
            <Button variant={status === "DRAFT" ? "secondary" : "ghost"} size="sm">
              Draft
            </Button>
          </Link>
          <Link href="/admin/products?status=ARCHIVED">
            <Button variant={status === "ARCHIVED" ? "secondary" : "ghost"} size="sm">
              Archived
            </Button>
          </Link>
        </div>
      </div>

      {/* Products Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Rarity</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sales</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No products found</p>
                  <Link href="/admin/products/new">
                    <Button variant="link" className="mt-2">
                      Create your first product
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden">
                        {product.images[0] ? (
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">/{product.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.category?.name || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.rarity.toLowerCase() as 'common' | 'rare' | 'epic' | 'legendary'}>
                      {product.rarity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-green-400">
                      {formatPrice(product.price)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.status === "PUBLISHED"
                          ? "success"
                          : product.status === "DRAFT"
                          ? "warning"
                          : "secondary"
                      }
                    >
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {product._count.orderItems}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/product/${product.slug}`} target="_blank">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/products/${product.id}`}>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
            Showing {skip + 1} to {Math.min(skip + limit, total)} of {total} products
          </p>
          <div className="flex gap-2">
            <Link
              href={`/admin/products?page=${page - 1}${search ? `&search=${search}` : ""}${status ? `&status=${status}` : ""}`}
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            >
              <Button variant="outline" size="sm" disabled={page <= 1}>
                Previous
              </Button>
            </Link>
            <Link
              href={`/admin/products?page=${page + 1}${search ? `&search=${search}` : ""}${status ? `&status=${status}` : ""}`}
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
