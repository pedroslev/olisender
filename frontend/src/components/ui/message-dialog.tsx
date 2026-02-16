"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface MessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  buttonText?: string
}

export function MessageDialog({
  open,
  onOpenChange,
  title,
  message,
  buttonText = "Entendido"
}: MessageDialogProps) {
  if (!open) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => onOpenChange(false)}
    >
      <Card 
        className="w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            {buttonText}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
