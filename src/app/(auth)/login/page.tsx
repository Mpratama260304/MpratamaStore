import { Metadata } from "next"
import Link from "next/link"
import { LoginForm } from "./login-form"
import { Sword } from "lucide-react"

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your MpratamaStore account",
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { message?: string; redirect?: string }
}) {
  // Decode redirect param and default to /admin
  const redirectTo = typeof searchParams.redirect === "string"
    ? decodeURIComponent(searchParams.redirect)
    : "/admin"

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-purple-950/20">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
      
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl">
            <Sword className="h-8 w-8 text-purple-400" />
            <span className="text-gradient">MpratamaStore</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-card border border-border/50 rounded-xl p-8 shadow-xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>

          {searchParams.message && (
            <div className="mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center">
              {searchParams.message}
            </div>
          )}

          <LoginForm redirectTo={redirectTo} />

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don&apos;t have an account? </span>
            <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
