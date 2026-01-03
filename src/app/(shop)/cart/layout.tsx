import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Inventory | MpratamaStore",
  description: "Review your cart items before checkout",
}

export default function CartLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
