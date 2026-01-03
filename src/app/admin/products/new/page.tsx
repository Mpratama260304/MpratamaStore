import { prisma } from "@/lib/prisma"
import { ProductForm } from "../product-form"

export default async function NewProductPage() {
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ])

  return <ProductForm categories={categories} tags={tags} />
}
