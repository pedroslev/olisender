"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageDialog } from "@/components/ui/message-dialog"

interface Stats {
  totalContacts: number
  totalLists: number
  totalCampaigns: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalContacts: 0,
    totalLists: 0,
    totalCampaigns: 0
  })
  const [loading, setLoading] = useState(true)
  const [messageDialog, setMessageDialog] = useState<{open: boolean, title: string, message: string}>({
    open: false,
    title: "",
    message: ""
  })
  const router = useRouter()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      
      if (!token) {
        console.log('No auth token found, redirecting to login')
        router.push("/")
        return
      }

      console.log('Loading dashboard data with token:', token.substring(0, 10) + '...')
      
      // Test the token first with a simple endpoint
      const testResponse = await fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${token}` }
      })
      
      console.log('Auth test response:', testResponse.status, testResponse.statusText)
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text()
        console.error('Auth test failed:', testResponse.status, errorText)
        console.error('Token being used:', token.substring(0, 20) + '...')
        
        // Show user-friendly error message
        setMessageDialog({
          open: true,
          title: "Sesión Expirada",
          message: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente."
        })
        
        localStorage.removeItem("auth_token")
        router.push("/")
        return
      }
      
      // Load contacts
      const contactsResponse = await fetch("/api/contacts", {
        headers: { "Authorization": `Bearer ${token}` }
      })
      
      console.log('Contacts response:', contactsResponse.status, contactsResponse.statusText)
      
      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json()
        setStats(prev => ({ ...prev, totalContacts: contactsData.total || 0 }))
      }

      // Load lists
      const listsResponse = await fetch("/api/lists", {
        headers: { "Authorization": `Bearer ${token}` }
      })
      
      console.log('Lists response:', listsResponse.status, listsResponse.statusText)
      
      if (listsResponse.ok) {
        const listsData = await listsResponse.json()
        setStats(prev => ({ ...prev, totalLists: listsData.total || 0 }))
      }

      // Load campaigns
      const campaignsResponse = await fetch("/api/campaigns", {
        headers: { "Authorization": `Bearer ${token}` }
      })
      
      console.log('Campaigns response:', campaignsResponse.status, campaignsResponse.statusText)
      
      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json()
        setStats(prev => ({ ...prev, totalCampaigns: campaignsData.total || 0 }))
      }

      console.log('Dashboard data loaded successfully')

    } catch (error) {
      console.error("Error loading dashboard data:", error)
      setMessageDialog({
        open: true,
        title: "Error de Conexión",
        message: "Error de conexión. Verifica que el backend esté funcionando."
      })
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem("auth_token")
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
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
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">OLIVELEZ</h1>
              <div className="hidden sm:block w-px h-6 bg-gray-300"></div>
              <p className="hidden sm:block text-sm text-gray-600">Email Marketing</p>
            </div>
            <Button variant="outline" size="sm" onClick={logout} className="text-sm px-4 py-2">
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full py-4 sm:py-6 lg:py-8 px-2 sm:px-4 lg:px-6 xl:px-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-sm sm:text-base text-gray-600">Bienvenida de vuelta al panel de administración</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 xl:gap-16 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Contactos</CardTitle>
              <span className="text-lg sm:text-2xl">👥</span>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.totalContacts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Listas de Difusión</CardTitle>
              <span className="text-lg sm:text-2xl">📋</span>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.totalLists}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Campañas Enviadas</CardTitle>
              <span className="text-lg sm:text-2xl">📧</span>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.totalCampaigns}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>
              Gestiona tu plataforma de email marketing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12 xl:gap-16">
              <Button 
                variant="outline"
                className="h-16 sm:h-20 flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
                onClick={() => router.push("/contacts")}
              >
                <span className="text-lg sm:text-2xl">👥</span>
                <span className="hidden sm:inline">Gestionar Contactos</span>
                <span className="sm:hidden">Contactos</span>
              </Button>
              <Button 
                variant="outline"
                className="h-16 sm:h-20 flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
                onClick={() => router.push("/lists")}
              >
                <span className="text-lg sm:text-2xl">📋</span>
                <span className="hidden sm:inline">Gestionar Listas</span>
                <span className="sm:hidden">Listas</span>
              </Button>
              <Button 
                variant="outline"
                className="h-16 sm:h-20 flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
                onClick={() => router.push("/campaigns")}
              >
                <span className="text-lg sm:text-2xl">📧</span>
                <span className="hidden sm:inline">Gestionar Campañas</span>
                <span className="sm:hidden">Campañas</span>
              </Button>
              <Button 
                variant="outline"
                className="h-16 sm:h-20 flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
                onClick={() => router.push("/settings")}
              >
                <span className="text-lg sm:text-2xl">⚙️</span>
                <span className="hidden sm:inline">Configuración</span>
                <span className="sm:hidden">Config</span>
              </Button>
            </div>
          </CardContent>
        </Card>
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
