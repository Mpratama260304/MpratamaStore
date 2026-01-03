import { Metadata } from "next"
import Link from "next/link"
import { ResetPasswordForm } from "./reset-password-form"
import { Sword } from "lucide-react"

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your MpratamaStore password",
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  if (!searchParams.token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-purple-950/20">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Reset Link</h1>
          <p className="text-muted-foreground mb-4">
            The password reset link is invalid or has expired.
          </p>
          <Link href="/forgot-password" className="text-purple-400 hover:text-purple-300">
            Request a new reset link
          </Link>
        </div>
      </div>
    )
  }

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
            <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
            <p className="text-muted-foreground">
              Enter your new password
            </p>
          </div>

          <ResetPasswordForm token={searchParams.token} />
        </div>
      </div>
    </div>
  )
}
