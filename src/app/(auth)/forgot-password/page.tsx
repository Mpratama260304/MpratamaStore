import { Metadata } from "next"
import Link from "next/link"
import { ForgotPasswordForm } from "./forgot-password-form"
import { Sword } from "lucide-react"

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your MpratamaStore password",
}

export default function ForgotPasswordPage() {
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
            <h1 className="text-2xl font-bold mb-2">Forgot Password</h1>
            <p className="text-muted-foreground">
              Enter your email to receive a password reset link
            </p>
          </div>

          <ForgotPasswordForm />

          <div className="mt-6 text-center text-sm">
            <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
