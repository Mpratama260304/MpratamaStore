"use client"

import { CartProvider } from "@/hooks/use-cart"
import { AuthProvider } from "@/hooks/use-auth"
import { TooltipProvider } from "@/components/ui/tooltip"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  )
}
