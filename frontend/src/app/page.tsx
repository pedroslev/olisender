"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type SetupState = "checking" | "initial-setup" | "login"

export default function Home() {
  const [setupState, setSetupState] = useState<SetupState>("checking")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const response = await fetch("/api/auth/needs-initial-setup")
        if (cancelled) return
        if (response.ok) {
          const data = await response.json()
          setSetupState(data.needs_initial_setup ? "initial-setup" : "login")
        } else {
          setSetupState("login")
        }
      } catch {
        if (!cancelled) setSetupState("login")
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email || !password || !confirmPassword) {
      setError("Completa todos los campos")
      return
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/auth/initial-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()

      if (response.ok) {
        localStorage.setItem("auth_token", data.session_token)
        router.push("/dashboard")
        return
      }
      setError(data.detail || "Error al crear el administrador")
    } catch {
      setError("Error de conexión. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Por favor completa todos los campos")
      return
    }

    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()

      if (response.ok) {
        localStorage.setItem("auth_token", data.session_token)
        router.push("/dashboard")
      } else {
        setError(data.detail || "Error al iniciar sesión")
      }
    } catch {
      setError("Error de conexión. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  if (setupState === "checking") {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 relative"
        style={{
          backgroundImage: "url('/login-background.jpeg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  const isInitialSetup = setupState === "initial-setup"

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: "url('/login-background.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 font-serif tracking-wide">
            OLIVELEZ
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {isInitialSetup ? "Configuración inicial" : "Acceder"}
            </CardTitle>
            <CardDescription className="text-center">
              {isInitialSetup
                ? "No hay usuarios. Crea la cuenta de administración para comenzar."
                : "Ingresa tus credenciales para acceder al panel"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={isInitialSetup ? handleInitialSetup : handleLogin}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isInitialSetup ? 6 : undefined}
                />
                {isInitialSetup && (
                  <p className="text-xs text-muted-foreground">
                    Mínimo 6 caracteres
                  </p>
                )}
              </div>

              {isInitialSetup && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? isInitialSetup
                    ? "Creando cuenta..."
                    : "Iniciando sesión..."
                  : isInitialSetup
                    ? "Crear administrador"
                    : "Acceder al Panel"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
