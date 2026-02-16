"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { MessageDialog } from "@/components/ui/message-dialog"

interface Settings {
  id: number
  resend_api_key: string
  sender_email: string
  sender_name: string
  reply_to: string
}

export default function Settings() {
  const [settings, setSettings] = useState<Settings>({
    id: 0,
    resend_api_key: "",
    sender_email: "",
    sender_name: "",
    reply_to: ""
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [originalSettings, setOriginalSettings] = useState<Settings>({
    id: 0,
    resend_api_key: "",
    sender_email: "",
    sender_name: "",
    reply_to: ""
  })
  const [messageDialog, setMessageDialog] = useState<{open: boolean, title: string, message: string}>({
    open: false,
    title: "",
    message: ""
  })
  const router = useRouter()

  // Function to check if settings have changed
  const hasChanges = () => {
    return (
      settings.resend_api_key !== originalSettings.resend_api_key ||
      settings.sender_email !== originalSettings.sender_email ||
      settings.sender_name !== originalSettings.sender_name ||
      settings.reply_to !== originalSettings.reply_to
    )
  }

  useEffect(() => {
    console.log("Initial settings state:", settings)
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      
      if (!token) {
        router.push("/")
        return
      }

      const response = await fetch("/api/settings", {
        headers: { "Authorization": `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log("Settings loaded:", data)
        setSettings(data)
        setOriginalSettings(data) // Save original settings for comparison
      }
    } catch (error) {
      console.error("Error loading settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        setOriginalSettings(settings) // Update original settings after successful save
        setMessageDialog({
          open: true,
          title: "Éxito",
          message: "Configuración guardada exitosamente"
        })
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      setMessageDialog({
        open: true,
        title: "Error",
        message: "Error al guardar la configuración"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadBackup = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch("/api/backup", {
        headers: { "Authorization": `Bearer ${token}` }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `olisender-backup-${new Date().toISOString().split('T')[0]}.db`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Error downloading backup:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex justify-between items-center h-16 max-w-6xl mx-auto">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="text-sm px-3 py-2">
                <span className="hidden sm:inline">← Dashboard</span>
                <span className="sm:hidden text-lg">←</span>
              </Button>
              <div className="hidden sm:block w-px h-6 bg-gray-300"></div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Configuración</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full py-4 sm:py-6 lg:py-8 px-2 sm:px-4 lg:px-6 xl:px-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Email Settings */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">Configuración de Email</CardTitle>
              <CardDescription className="text-sm">
                Configura tu proveedor de email y remitente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <form onSubmit={handleSaveSettings} className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="resend_api_key">Clave API de Resend *</Label>
                  <Input
                    id="resend_api_key"
                    type="text"
                    placeholder="re_xxxxxxxxxxxx"
                    value={settings.resend_api_key}
                    onChange={(e) => setSettings({ ...settings, resend_api_key: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Obtén tu clave API en <a href="https://resend.com/api-keys" target="_blank" className="text-blue-600 hover:underline">resend.com/api-keys</a>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sender_email">Email Remitente *</Label>
                    <Input
                      id="sender_email"
                      type="email"
                      placeholder="hola@olivelez.com"
                      value={settings.sender_email}
                      onChange={(e) => setSettings({ ...settings, sender_email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sender_name">Nombre Remitente *</Label>
                    <Input
                      id="sender_name"
                      type="text"
                      placeholder="Olivia Vélez"
                      value={settings.sender_name}
                      onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reply_to">Email de Respuesta</Label>
                  <Input
                    id="reply_to"
                    type="email"
                    placeholder="respuestas@olivelez.com"
                    value={settings.reply_to}
                    onChange={(e) => setSettings({ ...settings, reply_to: e.target.value })}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={saving || !hasChanges()} 
                  className="w-full" 
                  size="sm"
                >
                  {saving ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Backup & Maintenance */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">Respaldo y Mantenimiento</CardTitle>
              <CardDescription className="text-sm">
                Gestiona el respaldo de tu base de datos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3 sm:gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm sm:text-base">Descargar Respaldo</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Descarga una copia completa de tu base de datos
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleDownloadBackup} size="sm" className="w-full sm:w-auto">
                    Descargar Backup
                  </Button>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">⚠️ Importante</h4>
                  <p className="text-sm text-yellow-700">
                    Realiza respaldos regulares de tu base de datos. En caso de problemas, 
                    puedes restaurar desde el archivo de respaldo.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Sistema</CardTitle>
              <CardDescription>
                Detalles sobre tu instalación de OliSender
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Versión</Label>
                  <p className="text-sm text-gray-600">OliSender v1.0.0</p>
                </div>
                <div className="space-y-2">
                  <Label>Base de Datos</Label>
                  <p className="text-sm text-gray-600">SQLite</p>
                </div>
                <div className="space-y-2">
                  <Label>Proveedor de Email</Label>
                  <p className="text-sm text-gray-600">Resend API</p>
                </div>
                <div className="space-y-2">
                  <Label>Última Actualización</Label>
                  <p className="text-sm text-gray-600">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <MessageDialog
        open={messageDialog.open}
        onOpenChange={(open) => setMessageDialog(prev => ({ ...prev, open }))}
        title={messageDialog.title}
        message={messageDialog.message}
      />
    </div>
  )
}
