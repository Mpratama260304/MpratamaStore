import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft, Search, ShoppingBag } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="text-center max-w-md">
        {/* Animated 404 */}
        <div className="relative mb-8">
          <h1 className="text-[150px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 leading-none select-none">
            404
          </h1>
          <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600" />
        </div>

        {/* Message */}
        <h2 className="text-2xl font-bold text-white mb-4">
          Halaman Tidak Ditemukan
        </h2>
        <p className="text-slate-400 mb-8">
          Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan.
          Mungkin link sudah kadaluarsa atau Anda salah ketik alamatnya.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Ke Beranda
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="border-slate-700 hover:bg-slate-800">
            <Link href="/shop">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Lihat Produk
            </Link>
          </Button>
        </div>

        {/* Additional help */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <p className="text-sm text-slate-500 mb-4">
            Butuh bantuan? Coba beberapa link berikut:
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/" className="text-purple-400 hover:text-purple-300 transition-colors">
              Beranda
            </Link>
            <Link href="/shop" className="text-purple-400 hover:text-purple-300 transition-colors">
              Toko
            </Link>
            <Link href="/cart" className="text-purple-400 hover:text-purple-300 transition-colors">
              Keranjang
            </Link>
            <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
