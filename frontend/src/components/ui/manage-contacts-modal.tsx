"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface Contact {
  id: number
  email: string
  name: string | null
  topic: string | null
  created_at: string
}

interface List {
  id: number
  name: string
  title: string
  slug: string
  bg_image_url: string
  subscription_fields: any[]
  created_at: string
}

interface ManageContactsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  list: List | null
  onRefresh?: () => void
}

export function ManageContactsModal({ open, onOpenChange, list, onRefresh }: ManageContactsModalProps) {
  const [contactsInList, setContactsInList] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; contact: Contact | null }>({ open: false, contact: null })

  useEffect(() => {
    if (open && list) {
      loadContactsInList()
    }
  }, [open, list])

  const loadContactsInList = async () => {
    if (!list) return
    
    setLoading(true)
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(`/api/lists/${list.id}/contacts`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setContactsInList(data.contacts || [])
      }
    } catch (error) {
      console.error("Error loading contacts in list:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveContact = async (contactId: number) => {
    if (!list) return
    
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(`/api/lists/${list.id}/contacts/${contactId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      })
      
      if (response.ok) {
        loadContactsInList()
        onRefresh?.()
      }
    } catch (error) {
      console.error("Error removing contact from list:", error)
    }
  }

  if (!open || !list) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => onOpenChange(false)}
      >
        <Card 
          className="w-full max-w-2xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Contactos en: {list.title}</CardTitle>
                <CardDescription>
                  Gestiona los contactos asociados a esta lista
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Cargando contactos...</p>
                </div>
              ) : contactsInList.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No hay contactos en esta lista</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {contactsInList.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{contact.email}</p>
                        {contact.name && (
                          <p className="text-sm text-gray-600">{contact.name}</p>
                        )}
                        {contact.topic && (
                          <p className="text-xs text-gray-500">{contact.topic}</p>
                        )}
                      </div>
                      <Button 
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteConfirm({ open: true, contact })}
                      >
                        Quitar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, contact: null })}
        title="Quitar Contacto"
        description={`¿Estás seguro de que quieres quitar "${deleteConfirm.contact?.email}" de esta lista?`}
        confirmText="Quitar"
        onConfirm={() => {
          if (deleteConfirm.contact) {
            handleRemoveContact(deleteConfirm.contact.id)
            setDeleteConfirm({ open: false, contact: null })
          }
        }}
      />
    </>
  )
}
