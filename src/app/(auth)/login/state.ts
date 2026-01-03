// Non-server exports for login form state
// This file does NOT have "use server" - safe for constants and types

export type LoginState = {
  ok: boolean
  message: string
  errors?: Record<string, string[]>
}

export const initialState: LoginState = {
  ok: true,
  message: "",
}
