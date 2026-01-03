import { MainNav } from "@/components/layout/main-nav"
import { Footer } from "@/components/layout/footer"

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <MainNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
