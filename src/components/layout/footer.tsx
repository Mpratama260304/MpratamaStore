import Link from "next/link"
import { Sword, Github, Twitter, Mail } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-secondary/20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-4">
              <Sword className="h-6 w-6 text-purple-400" />
              <span className="text-gradient">MpratamaStore</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              Fantasy Digital Market — Toko produk digital bertema fantasy dengan pengalaman UI seperti marketplace game.
            </p>
            <div className="flex gap-3">
              <a href="#" className="text-muted-foreground hover:text-purple-400 transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-purple-400 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-purple-400 transition-colors">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-semibold mb-4">Shop</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/shop" className="text-sm text-muted-foreground hover:text-purple-400 transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/shop?category=script" className="text-sm text-muted-foreground hover:text-purple-400 transition-colors">
                  Scripts
                </Link>
              </li>
              <li>
                <Link href="/shop?category=bot" className="text-sm text-muted-foreground hover:text-purple-400 transition-colors">
                  Bots
                </Link>
              </li>
              <li>
                <Link href="/shop?category=ai" className="text-sm text-muted-foreground hover:text-purple-400 transition-colors">
                  AI Tools
                </Link>
              </li>
              <li>
                <Link href="/shop?category=ebook" className="text-sm text-muted-foreground hover:text-purple-400 transition-colors">
                  Ebooks
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-semibold mb-4">Account</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="text-sm text-muted-foreground hover:text-purple-400 transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-sm text-muted-foreground hover:text-purple-400 transition-colors">
                  Register
                </Link>
              </li>
              <li>
                <Link href="/account/orders" className="text-sm text-muted-foreground hover:text-purple-400 transition-colors">
                  Quest Receipts
                </Link>
              </li>
              <li>
                <Link href="/confirm" className="text-sm text-muted-foreground hover:text-purple-400 transition-colors">
                  Confirm Payment
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/policies/terms" className="text-sm text-muted-foreground hover:text-purple-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/policies/privacy" className="text-sm text-muted-foreground hover:text-purple-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/policies/refund" className="text-sm text-muted-foreground hover:text-purple-400 transition-colors">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} MpratamaStore. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
