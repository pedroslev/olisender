"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EditModal } from "@/components/ui/edit-modal"

interface Contact {
  id: number
  email: string
  name: string | null
  topic: string | null
  created_at: string
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showImportForm, setShowImportForm] = useState(false)
  const [importData, setImportData] = useState("")
  const [newContact, setNewContact] = useState({ email: "", name: "", topic: "" })
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; contact: Contact | null }>({ open: false, contact: null })
  const router = useRouter()

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      
      if (!token) {
        router.push("/")
        return
      }

      const response = await fetch("/api/contacts", {
        headers: { "Authorization": `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
      }
    } catch (error) {
      console.error("Error loading contacts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newContact)
      })

      if (response.ok) {
        setNewContact({ email: "", name: "", topic: "" })
        loadContacts()
      }
    } catch (error) {
      console.error("Error creating contact:", error)
    }
  }

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact)
    setEditModalOpen(true)
  }

  const handleEditContact = async (updatedData: { email: string; name: string; topic: string }) => {
    if (!editingContact) return
    
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(`/api/contacts/${editingContact.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      })

      if (response.ok) {
        loadContacts()
        setEditModalOpen(false)
        setEditingContact(null)
      }
    } catch (error) {
      console.error("Error updating contact:", error)
    }
  }

  const handleDeleteContact = async (contactId: number) => {
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        loadContacts()
      }
    } catch (error) {
      console.error("Error deleting contact:", error)
    }
  }

  const confirmDeleteContact = (contact: Contact) => {
    setDeleteConfirm({ open: true, contact })
  }

  const handleImportContacts = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch("/api/contacts/import-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ file_content: importData })
      })

      if (response.ok) {
        setImportData("")
        setShowImportForm(false)
        loadContacts()
      }
    } catch (error) {
      console.error("Error importing contacts:", error)
    }
  }

  const handleExportContacts = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch("/api/contacts/export", {
        headers: { "Authorization": `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        const blob = new Blob([data.csv_content], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = data.filename
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Error exporting contacts:", error)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando contactos...</p>
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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Contactos</h1>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowImportForm(true)} className="text-sm px-4 py-2">
                <span className="hidden sm:inline">Importar CSV</span>
                <span className="sm:hidden">Importar</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportContacts} className="text-sm px-4 py-2">
                <span className="hidden sm:inline">Exportar CSV</span>
                <span className="sm:hidden">Exportar</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full py-4 sm:py-6 lg:py-8 px-2 sm:px-4 lg:px-6 xl:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 xl:gap-16">
          {/* Add Contact Form */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">Agregar Contacto</CardTitle>
              <CardDescription className="text-sm">
                Añade un nuevo contacto manualmente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <form onSubmit={handleCreateContact} className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contacto@ejemplo.com"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Nombre del contacto"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topic">Notas</Label>
                  <Input
                    id="topic"
                    type="text"
                    placeholder="Ej: Pole Sport, Exotic"
                    value={newContact.topic}
                    onChange={(e) => setNewContact({ ...newContact, topic: e.target.value })}
                  />
                </div>

                <Button type="submit" className="w-full" size="sm">
                  Agregar Contacto
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contacts List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">Lista de Contactos ({contacts.length})</CardTitle>
                <CardDescription className="text-sm">
                  Gestiona todos tus contactos
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  {contacts.length === 0 ? (
                    <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">
                      No hay contactos registrados
                    </p>
                  ) : (
                    contacts.map((contact) => (
                      <div key={contact.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <h3 className="font-medium text-sm sm:text-base truncate">{contact.email}</h3>
                          </div>
                          {contact.name && (
                            <p className="text-xs sm:text-sm text-gray-600 truncate">{contact.name}</p>
                          )}
                          {contact.topic && (
                            <p className="text-xs sm:text-sm text-gray-500 truncate">Notas: {contact.topic}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            Creado: {new Date(contact.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditModal(contact)}
                            className="w-full sm:w-auto text-xs sm:text-sm"
                          >
                            Editar
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => confirmDeleteContact(contact)}
                            className="w-full sm:w-auto text-xs sm:text-sm"
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Import CSV Modal */}
      <EditModal
        open={showImportForm}
        onOpenChange={setShowImportForm}
        title="Importar CSV"
        description="Pega el contenido CSV con columnas: email,name,topic"
        onSave={() => {
          handleImportContacts({ preventDefault: () => {} } as React.FormEvent)
        }}
        onCancel={() => {
          setShowImportForm(false)
          setImportData("")
        }}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv">Contenido CSV</Label>
            <textarea
              id="csv"
              className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none"
              placeholder="email,name,topic&#10;juan@ejemplo.com,Juan Pérez,Pole Sport&#10;maria@ejemplo.com,Maria García,Exotic"
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
            />
          </div>
        </div>
      </EditModal>

      {/* Edit Modal */}
      <EditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        title="Editar Contacto"
        description="Modifica los datos del contacto"
        onSave={() => {
        if (editingContact) {
          handleEditContact({
            email: editingContact.email,
            name: editingContact.name || "",
            topic: editingContact.topic || ""
          })
        }
        }}
        onCancel={() => {
          setEditingContact(null)
        }}
      >
        {editingContact && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={editingContact.email}
                onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_name">Nombre</Label>
              <Input
                id="edit_name"
                type="text"
                placeholder="Nombre del contacto"
                value={editingContact.name || ""}
                onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_topic">Notas</Label>
              <Input
                id="edit_topic"
                type="text"
                placeholder="Notas del contacto"
                value={editingContact.topic || ""}
                onChange={(e) => setEditingContact({ ...editingContact, topic: e.target.value })}
              />
            </div>
          </div>
        )}
      </EditModal>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, contact: null })}
        title="Eliminar Contacto"
        description={`¿Estás seguro de que quieres eliminar el contacto "${deleteConfirm.contact?.name || deleteConfirm.contact?.email}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={() => deleteConfirm.contact && handleDeleteContact(deleteConfirm.contact.id)}
      />
    </div>
  )
}
