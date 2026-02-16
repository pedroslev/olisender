"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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

interface AddContactsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  list: List | null
  onRefresh?: () => void
}

export function AddContactsModal({ open, onOpenChange, list, onRefresh }: AddContactsModalProps) {
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [contactsInList, setContactsInList] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && list) {
      loadData()
    }
  }, [open, list])

  const loadData = async () => {
    if (!list) return
    
    setLoading(true)
    try {
      const token = localStorage.getItem("auth_token")
      
      // Load all contacts
      const contactsResponse = await fetch("/api/contacts", {
        headers: { "Authorization": `Bearer ${token}` }
      })
      
      // Load contacts already in list
      const listContactsResponse = await fetch(`/api/lists/${list.id}/contacts`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      
      if (contactsResponse.ok && listContactsResponse.ok) {
        const contactsData = await contactsResponse.json()
        const listContactsData = await listContactsResponse.json()
        
        setAllContacts(contactsData.contacts || [])
        setContactsInList(listContactsData.contacts || [])
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddContact = async (contactId: number) => {
    if (!list) return
    
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch("/api/contacts/add-to-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          contact_id: contactId,
          list_id: list.id
        })
      })
      
      if (response.ok) {
        loadData() // Reload to update the lists
        onRefresh?.()
      }
    } catch (error) {
      console.error("Error adding contact to list:", error)
    }
  }

  // Filter out contacts that are already in the list
  const availableContacts = allContacts.filter(contact => 
    !contactsInList.some(listContact => listContact.id === contact.id)
  )

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
                <CardTitle>Agregar Contactos a: {list.title}</CardTitle>
                <CardDescription>
                  Selecciona contactos para agregar a esta lista
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
              ) : availableContacts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Todos los contactos ya están en esta lista</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableContacts.map((contact) => (
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
                        size="sm"
                        onClick={() => handleAddContact(contact.id)}
                      >
                        Agregar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
