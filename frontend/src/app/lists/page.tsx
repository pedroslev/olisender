"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { MessageDialog } from "@/components/ui/message-dialog"
import { EditModal } from "@/components/ui/edit-modal"
import { ManageContactsModal } from "@/components/ui/manage-contacts-modal"
import { AddContactsModal } from "@/components/ui/add-contacts-modal"

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
  contact_count: number
}

interface Contact {
  id: number
  email: string
  name: string
  topic: string
  status: string
}

export default function Lists() {
  const [lists, setLists] = useState<List[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(true)
  const [newList, setNewList] = useState({ 
    name: "", 
    title: "",
    slug: "", 
    bg_image_url: "",
    subscription_fields: [] as SubscriptionField[]
  })
  const [selectedList, setSelectedList] = useState<List | null>(null)
  const [editingList, setEditingList] = useState<List | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [manageContactsModalOpen, setManageContactsModalOpen] = useState(false)
  const [addContactsModalOpen, setAddContactsModalOpen] = useState(false)
  const [selectedListForContacts, setSelectedListForContacts] = useState<List | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; list: List | null }>({ open: false, list: null })
  const [messageDialog, setMessageDialog] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "", message: "" })
  const router = useRouter()

  useEffect(() => {
    loadLists()
    loadContacts()
  }, [])

  const loadLists = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      
      if (!token) {
        router.push("/")
        return
      }

      const response = await fetch("/api/lists", {
        headers: { "Authorization": `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setLists(data.lists || [])
      }
    } catch (error) {
      console.error("Error loading lists:", error)
    }
  }

  const loadContacts = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch("/api/contacts/", {
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

  const addSubscriptionField = () => {
    setNewList(prev => ({
      ...prev,
      subscription_fields: [...prev.subscription_fields, {
        name: "",
        label: "",
        type: "text",
        required: false,
        options: []
      }]
    }))
  }

  const removeSubscriptionField = (index: number) => {
    setNewList(prev => ({
      ...prev,
      subscription_fields: prev.subscription_fields.filter((_, i) => i !== index)
    }))
  }

  const updateSubscriptionField = (index: number, field: Partial<SubscriptionField>) => {
    setNewList(prev => ({
      ...prev,
      subscription_fields: prev.subscription_fields.map((f, i) => 
        i === index ? { ...f, ...field } : f
      )
    }))
  }

  const clearForm = () => {
    setNewList({ 
      name: "", 
      title: "",
      slug: "", 
      bg_image_url: "",
      subscription_fields: []
    })
  }

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch("/api/lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newList)
      })

      if (response.ok) {
        clearForm()
        loadLists()
      }
    } catch (error) {
      console.error("Error creating list:", error)
    }
  }

  const openEditModal = (list: List) => {
    setEditingList(list)
    setEditModalOpen(true)
  }

  const openManageContactsModal = (list: List) => {
    setSelectedListForContacts(list)
    setManageContactsModalOpen(true)
  }

  const openAddContactsModal = (list: List) => {
    setSelectedListForContacts(list)
    setAddContactsModalOpen(true)
  }

  const handleEditList = async (updatedData: { name: string; title: string; bg_image_url: string }) => {
    if (!editingList) return
    
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(`/api/lists/${editingList.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      })

      if (response.ok) {
        loadLists()
        setEditModalOpen(false)
        setEditingList(null)
      }
    } catch (error) {
      console.error("Error updating list:", error)
    }
  }

  const handleDeleteList = async (listId: number) => {
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(`/api/lists/${listId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        loadLists()
      }
    } catch (error) {
      console.error("Error deleting list:", error)
    }
  }

  const confirmDeleteList = (list: List) => {
    setDeleteConfirm({ open: true, list })
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')
  }

  const handleNameChange = (name: string) => {
    setNewList({ 
      ...newList, 
      name, 
      slug: generateSlug(name) 
    })
  }

  const handleAddContactToList = async (contactId: number, listId: number) => {
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch("/api/contacts/add-to-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ contact_id: contactId, list_id: listId })
      })

      if (response.ok) {
        loadLists()
      }
    } catch (error) {
      console.error("Error adding contact to list:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando listas...</p>
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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Listas de Difusión</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full py-4 sm:py-6 lg:py-8 px-2 sm:px-4 lg:px-6 xl:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 xl:gap-16">
          {/* Create List Form */}
          {showCreateForm && (
            <Card className="lg:col-span-1">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">Crear Nueva Lista</CardTitle>
                <CardDescription className="text-sm">
                  Crea una nueva lista de difusión
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <form onSubmit={handleCreateList} className="space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre de la Lista (Interno) *</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Ej: clases-heels-2024"
                      value={newList.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Nombre interno para gestión
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Título Público *</Label>
                    <Input
                      id="title"
                      type="text"
                      placeholder="Ej: Clases de Heels con Olivia"
                      value={newList.title}
                      onChange={(e) => setNewList({ ...newList, title: e.target.value })}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Título que verán los usuarios
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug (URL) *</Label>
                    <Input
                      id="slug"
                      type="text"
                      placeholder="clases-heels"
                      value={newList.slug}
                      onChange={(e) => setNewList({ ...newList, slug: e.target.value })}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      URL pública: /subscribe/{newList.slug}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bg_image">Imagen de Fondo (URL)</Label>
                    <Input
                      id="bg_image"
                      type="url"
                      placeholder="https://ejemplo.com/imagen.jpg"
                      value={newList.bg_image_url}
                      onChange={(e) => setNewList({ ...newList, bg_image_url: e.target.value })}
                    />
                  </div>

                  {/* Campos de Suscripción Dinámicos */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Campos de Suscripción</Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={addSubscriptionField}
                      >
                        + Agregar Campo
                      </Button>
                    </div>
                    
                    {newList.subscription_fields.map((field, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Campo {index + 1}</h4>
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="sm"
                            onClick={() => removeSubscriptionField(index)}
                          >
                            Eliminar
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor={`field_name_${index}`}>Nombre del Campo *</Label>
                            <Input
                              id={`field_name_${index}`}
                              placeholder="ej: nombre, telefono, comentarios"
                              value={field.name}
                              onChange={(e) => updateSubscriptionField(index, { name: e.target.value })}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`field_label_${index}`}>Etiqueta *</Label>
                            <Input
                              id={`field_label_${index}`}
                              placeholder="ej: Tu Nombre, Teléfono, Comentarios"
                              value={field.label}
                              onChange={(e) => updateSubscriptionField(index, { label: e.target.value })}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor={`field_type_${index}`}>Tipo de Campo</Label>
                            <select
                              id={`field_type_${index}`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              value={field.type}
                              onChange={(e) => updateSubscriptionField(index, { type: e.target.value })}
                            >
                              <option value="text">Texto</option>
                              <option value="email">Email</option>
                              <option value="tel">Teléfono</option>
                              <option value="textarea">Área de Texto</option>
                              <option value="select">Selección</option>
                            </select>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`field_required_${index}`}
                                checked={field.required}
                                onChange={(e) => updateSubscriptionField(index, { required: e.target.checked })}
                              />
                              <Label htmlFor={`field_required_${index}`}>Campo Obligatorio</Label>
                            </div>
                          </div>
                        </div>
                        
                        {field.type === "select" && (
                          <div className="space-y-2">
                            <Label>Opciones (una por línea)</Label>
                            <textarea
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              rows={3}
                              placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
                              value={field.options?.join('\n') || ''}
                              onChange={(e) => updateSubscriptionField(index, { 
                                options: e.target.value.split('\n').filter(opt => opt.trim()) 
                              })}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {newList.subscription_fields.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No hay campos personalizados. Solo se pedirá el email.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Button type="submit" className="flex-1" size="sm">
                      Crear Lista
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={clearForm}
                      size="sm"
                      className="flex-1 sm:flex-none"
                    >
                      Limpiar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Edit Modal */}
          <EditModal
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            title="Editar Lista"
            description="Modifica los datos de tu lista"
            onSave={() => {
              if (editingList) {
                handleEditList({
                  name: editingList.name,
                  title: editingList.title,
                  bg_image_url: editingList.bg_image_url || ""
                })
              }
            }}
            onCancel={() => {
              setEditingList(null)
            }}
          >
            {editingList && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_name">Nombre de la Lista (Interno) *</Label>
                  <Input
                    id="edit_name"
                    type="text"
                    placeholder="Ej: clases-heels-2024"
                    value={editingList.name}
                    onChange={(e) => setEditingList({ ...editingList, name: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Nombre interno para gestión
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_title">Título Público *</Label>
                  <Input
                    id="edit_title"
                    type="text"
                    placeholder="Ej: Clases de Heels con Olivia"
                    value={editingList.title}
                    onChange={(e) => setEditingList({ ...editingList, title: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Título que verán los usuarios
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_slug">Slug (URL) *</Label>
                  <Input
                    id="edit_slug"
                    type="text"
                    value={editingList.slug}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500">
                    El slug no se puede cambiar después de crear la lista
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_bg_image">Imagen de Fondo (URL)</Label>
                  <Input
                    id="edit_bg_image"
                    type="url"
                    placeholder="https://ejemplo.com/imagen.jpg"
                    value={editingList.bg_image_url || ""}
                    onChange={(e) => setEditingList({ ...editingList, bg_image_url: e.target.value })}
                  />
                </div>
              </div>
            )}
          </EditModal>

          {/* Lists */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">Listas de Difusión ({lists.length})</CardTitle>
                <CardDescription className="text-sm">
                  Gestiona tus listas de suscriptores
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  {lists.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No hay listas creadas
                    </p>
                  ) : (
                    lists.map((list) => (
                      <div key={list.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-medium">{list.title}</h3>
                            <Badge variant="secondary">
                              {list.contact_count} contactos
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            Slug: {list.slug}
                          </p>
                          <p className="text-sm text-gray-500">
                            URL: <span 
                              className="text-blue-600 hover:text-blue-800 cursor-pointer underline"
                              onClick={() => {
                                const url = `${window.location.origin}/subscribe/${list.slug}`
                                navigator.clipboard.writeText(url)
                                setMessageDialog({ 
                                  open: true, 
                                  title: "URL Copiada", 
                                  message: `La URL ${url} ha sido copiada al portapapeles.` 
                                })
                              }}
                            >
                              /subscribe/{list.slug}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400">
                            Creada: {new Date(list.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <div className="flex space-x-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openManageContactsModal(list)}
                            >
                              Ver Contactos
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openAddContactsModal(list)}
                            >
                              Agregar Contactos
                            </Button>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditModal(list)}
                          >
                            Editar
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => confirmDeleteList(list)}
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

        {/* Contact Management Modal */}
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, list: null })}
        title="Eliminar Lista"
        description={`¿Estás seguro de que quieres eliminar la lista "${deleteConfirm.list?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={() => deleteConfirm.list && handleDeleteList(deleteConfirm.list.id)}
      />

      {/* Message Dialog */}
      <MessageDialog
        open={messageDialog.open}
        onOpenChange={(open) => setMessageDialog({ open, title: "", message: "" })}
        title={messageDialog.title}
        message={messageDialog.message}
      />

      {/* Contact Management Modals */}
      <ManageContactsModal
        open={manageContactsModalOpen}
        onOpenChange={setManageContactsModalOpen}
        list={selectedListForContacts}
        onRefresh={loadLists}
      />

      <AddContactsModal
        open={addContactsModalOpen}
        onOpenChange={setAddContactsModalOpen}
        list={selectedListForContacts}
        onRefresh={loadLists}
      />
    </div>
  )
}
