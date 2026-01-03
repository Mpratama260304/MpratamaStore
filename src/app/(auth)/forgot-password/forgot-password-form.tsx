"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { forgotPassword, type ActionResult } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle } from "lucide-react"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" variant="glow" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending...
        </>
      ) : (
        "Send Reset Link"
      )}
    </Button>
  )
}

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setFieldErrors({})
    setSuccess(false)

    const result: ActionResult = await forgotPassword(formData)
    
    if (result.success) {
      setSuccess(true)
    } else {
      if (result.error) {
        setError(result.error)
      }
      if (result.errors) {
        setFieldErrors(result.errors)
      }
    }
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
        <h3 className="font-semibold mb-2">Check your email</h3>
        <p className="text-sm text-muted-foreground">
          If an account exists with that email, we&apos;ve sent a password reset link.
        </p>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
        {fieldErrors.email && (
          <p className="text-sm text-red-400">{fieldErrors.email[0]}</p>
        )}
      </div>

      <SubmitButton />
    </form>
  )
}
