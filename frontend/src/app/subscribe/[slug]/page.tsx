"use client"

import { useState, use, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface SubscriptionField {
  name: string
  label: string
  type: string
  required: boolean
  options?: string[]
}

interface List {
  id: number
  name: string
  title: string
  slug: string
  bg_image_url: string
  subscription_fields: SubscriptionField[]
  created_at: string
}

interface SubscribePageProps {
  params: Promise<{
    slug: string
  }>
}

export default function SubscribePage({ params }: SubscribePageProps) {
  const resolvedParams = use(params)
  const [list, setList] = useState<List | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [loadingList, setLoadingList] = useState(true)

  useEffect(() => {
    const loadListDetails = async () => {
      try {
        const response = await fetch(`/api/lists/slug/${resolvedParams.slug}`)
        if (response.ok) {
          const data = await response.json()
          setList(data)
          
          // Initialize form data with email field
          setFormData({ email: "" })
        } else {
          setMessage("Lista no encontrada.")
        }
      } catch (error) {
        setMessage("Error al cargar los detalles de la lista.")
      } finally {
        setLoadingList(false)
      }
    }
    
    if (resolvedParams.slug) {
      loadListDetails()
    }
  }, [resolvedParams.slug])

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const renderField = (field: SubscriptionField) => {
    const commonProps = {
      id: field.name,
      value: formData[field.name] || "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => 
        handleFieldChange(field.name, e.target.value),
      required: field.required,
      placeholder: field.label
    }

    switch (field.type) {
      case "textarea":
        return (
          <textarea
            {...commonProps}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={3}
          />
        )
      
      case "select":
        return (
          <select
            {...commonProps}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Selecciona una opción</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        )
      
      default:
        return (
          <Input
            {...commonProps}
            type={field.type}
          />
        )
    }
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/contacts/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          list_slug: resolvedParams.slug
        })
      })

      if (response.ok) {
        // Redirect to thanks page with list information
        const thanksUrl = `/thanks?list_title=${encodeURIComponent(list?.title || '')}&list_slug=${encodeURIComponent(list?.slug || '')}&bg_image=${encodeURIComponent(list?.bg_image_url || '')}`
        window.location.href = thanksUrl
      } else {
        setMessage("Error al suscribirse. Intenta nuevamente.")
      }
    } catch (error) {
      setMessage("Error al suscribirse. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  if (loadingList) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-8">
            <p className="text-gray-700">Cargando...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (message === "Lista no encontrada.") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: list?.bg_image_url ? `url(${list.bg_image_url})` : 'linear-gradient(to bottom right, rgb(239 246 255), rgb(224 231 255))',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      {/* Overlay para mejorar legibilidad */}
      <div className="absolute inset-0 bg-black/30"></div>
      
      <Card className="w-full max-w-md relative z-10">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Suscribirse a {list?.title}
          </CardTitle>
          <CardDescription>
            Únete a nuestra lista de difusión
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubscribe} className="space-y-4">
            {/* Email field - always required */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email || ""}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                required
              />
            </div>

            {/* Dynamic fields */}
            {list?.subscription_fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label} {field.required && "*"}
                </Label>
                {renderField(field)}
              </div>
            ))}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Suscribiendo..." : "Suscribirse"}
            </Button>

            {message && (
              <div className={`text-center text-sm ${
                message.includes("exitosamente") ? "text-green-600" : "text-red-600"
              }`}>
                {message}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
