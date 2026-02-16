"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSearchParams } from "next/navigation"

export default function ThanksPage() {
  const searchParams = useSearchParams()
  const listTitle = searchParams.get('list_title') || ''
  const bgImage = searchParams.get('bg_image') || ''

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: bgImage ? `url(${bgImage})` : 'linear-gradient(to bottom right, rgb(240 253 244), rgb(209 250 229))',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      {/* Overlay para mejorar legibilidad */}
      <div className="absolute inset-0 bg-black/30"></div>
      
      <Card className="w-full max-w-md text-center relative z-10">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            ¡Suscripción Exitosa!
          </CardTitle>
          <CardDescription className="text-lg">
            {listTitle ? `Gracias por suscribirte a ${listTitle}` : 'Gracias por suscribirte a nuestra lista de difusión'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Te mantendremos informado sobre nuestras últimas novedades y promociones.
          </p>
          <p className="text-sm text-gray-500">
            Si cambias de opinión, puedes darte de baja en cualquier momento usando el enlace que aparece en nuestros emails.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
