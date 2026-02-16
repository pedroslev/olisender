"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EditModal } from "@/components/ui/edit-modal"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { MessageDialog } from "@/components/ui/message-dialog"

interface Campaign {
  id: number
  subject: string
  html: string
  send_to_all: boolean
  lists: Array<{ id: number; title: string }>
  created_by: number
  created_at: string
}

interface List {
  id: number
  name: string
  slug: string
  title: string
  bg_image_url: string
  subscription_fields: any[]
  created_at: string
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(true)
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingCampaignLists, setEditingCampaignLists] = useState<number[]>([])
  const [editingCampaignSendToAll, setEditingCampaignSendToAll] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; campaign: Campaign | null }>({ open: false, campaign: null })
  const [messageDialog, setMessageDialog] = useState<{open: boolean, title: string, message: string}>({
    open: false,
    title: "",
    message: ""
  })
  const [newCampaign, setNewCampaign] = useState({
    subject: "",
    html: "",
    list_ids: [] as number[],
    send_to_all: false
  })
  const router = useRouter()

  useEffect(() => {
    loadCampaigns()
    loadLists()
  }, [])

  const loadCampaigns = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      
      if (!token) {
        router.push("/")
        return
      }

      const response = await fetch("/api/campaigns", {
        headers: { "Authorization": `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (error) {
      console.error("Error loading campaigns:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadLists = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch("/api/lists/", {
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

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newCampaign)
      })

      if (response.ok) {
        setNewCampaign({ subject: "", html: "", list_ids: [], send_to_all: false })
        loadCampaigns()
      }
    } catch (error) {
      console.error("Error creating campaign:", error)
    }
  }

  const openEditModal = (campaign: Campaign) => {
    setEditingCampaign(campaign)
    setEditingCampaignLists(campaign.lists.map(list => list.id))
    setEditingCampaignSendToAll(campaign.send_to_all)
    setEditModalOpen(true)
  }

  const confirmDeleteCampaign = (campaign: Campaign) => {
    setDeleteConfirm({ open: true, campaign })
  }

  const handleDeleteCampaign = async (campaignId: number) => {
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        loadCampaigns()
      }
    } catch (error) {
      console.error("Error deleting campaign:", error)
    }
  }

  const handleEditCampaign = async (updatedData: { subject: string; html: string; list_ids: number[]; send_to_all: boolean }) => {
    if (!editingCampaign) return
    
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(`/api/campaigns/${editingCampaign.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      })

      if (response.ok) {
        loadCampaigns()
        setEditModalOpen(false)
        setEditingCampaign(null)
      }
    } catch (error) {
      console.error("Error updating campaign:", error)
    }
  }

  const handleSendCampaign = async (campaignId: number) => {
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch("/api/campaigns/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          list_id: 1 // El backend ahora usa la configuración de la campaña
        })
      })

      if (response.ok) {
        const result = await response.json()
        setMessageDialog({
          open: true,
          title: "Éxito",
          message: `Campaña enviada exitosamente a ${result.sent} contactos`
        })
        loadCampaigns()
      } else {
        const error = await response.text()
        setMessageDialog({
          open: true,
          title: "Error",
          message: `Error al enviar campaña: ${error}`
        })
      }
    } catch (error) {
      console.error("Error sending campaign:", error)
      setMessageDialog({
        open: true,
        title: "Error",
        message: "Error al enviar campaña"
      })
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando campañas...</p>
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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Campañas</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full py-4 sm:py-6 lg:py-8 px-2 sm:px-4 lg:px-6 xl:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 xl:gap-16">
          {/* Create Campaign Form */}
          {showCreateForm && (
            <Card className="lg:col-span-1">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">Crear Nueva Campaña</CardTitle>
                <CardDescription className="text-sm">
                  Diseña tu campaña de email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <form onSubmit={handleCreateCampaign} className="space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Asunto *</Label>
                    <Input
                      id="subject"
                      type="text"
                      placeholder="Ej: Nueva clase de Pole Sport"
                      value={newCampaign.subject}
                      onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="send_to_all">Destinatarios</Label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="send_to_all"
                          checked={newCampaign.send_to_all}
                          onChange={() => setNewCampaign({ ...newCampaign, send_to_all: true, list_ids: [] })}
                          className="rounded"
                        />
                        <span className="text-sm">Enviar a todos los contactos</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="send_to_all"
                          checked={!newCampaign.send_to_all}
                          onChange={() => setNewCampaign({ ...newCampaign, send_to_all: false })}
                          className="rounded"
                        />
                        <span className="text-sm">Seleccionar listas específicas</span>
                      </label>
                    </div>
                  </div>

                  {!newCampaign.send_to_all && (
                    <div className="space-y-2">
                      <Label>Listas de Destino *</Label>
                      <div className="space-y-2 border border-gray-300 rounded-md p-2">
                        {lists.map((list) => (
                          <label key={list.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={newCampaign.list_ids.includes(list.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewCampaign({ 
                                    ...newCampaign, 
                                    list_ids: [...newCampaign.list_ids, list.id] 
                                  })
                                } else {
                                  setNewCampaign({ 
                                    ...newCampaign, 
                                    list_ids: newCampaign.list_ids.filter(id => id !== list.id) 
                                  })
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{list.title}</span>
                          </label>
                        ))}
                      </div>
                      {newCampaign.list_ids.length === 0 && (
                        <p className="text-xs text-red-500">Selecciona al menos una lista</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="html">Contenido HTML *</Label>
                    <textarea
                      id="html"
                      className="w-full h-40 p-3 border border-gray-300 rounded-md resize-none"
                      placeholder="<h1>¡Hola {{nombre}}!</h1>&#10;<p>Te invitamos a nuestra nueva clase de {{tema}}...</p>&#10;<p>Variables disponibles: {{nombre}}, {{tema}}</p>"
                      value={newCampaign.html}
                      onChange={(e) => setNewCampaign({ ...newCampaign, html: e.target.value })}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Variables disponibles: {`{{nombre}}, {{tema}}, {{email}}`}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Button type="submit" className="flex-1" size="sm">
                      Crear Campaña
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setNewCampaign({ subject: "", html: "", list_ids: [], send_to_all: false })}
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

          {/* Campaigns List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">Campañas ({campaigns.length})</CardTitle>
                <CardDescription className="text-sm">
                  Gestiona tus campañas de email
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  {campaigns.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No hay campañas creadas
                    </p>
                  ) : (
                    campaigns.map((campaign) => (
                      <div key={campaign.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-medium text-sm sm:text-base truncate">{campaign.subject}</h3>
                          </div>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs sm:text-sm text-gray-600">
                              <strong>Destinatarios:</strong> {
                                campaign.send_to_all 
                                  ? "Todos los contactos" 
                                  : campaign.lists.length > 0 
                                    ? campaign.lists.map(list => list.title).join(", ")
                                    : "Sin listas asignadas"
                              }
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                              {campaign.html.substring(0, 100)}...
                            </p>
                          </div>
                          <p className="text-xs text-gray-400">
                            Creada: {new Date(campaign.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-xs px-2 py-1 h-auto"
                            onClick={() => setPreviewCampaign(campaign)}
                          >
                            <span className="hidden sm:inline">Previsualizar</span>
                            <span className="sm:hidden">Ver</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-xs px-2 py-1 h-auto"
                            onClick={() => handleSendCampaign(campaign.id)}
                          >
                            Enviar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-xs px-2 py-1 h-auto"
                            onClick={() => openEditModal(campaign)}
                          >
                            <span className="hidden sm:inline">Editar</span>
                            <span className="sm:hidden">✏️</span>
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="text-xs px-2 py-1 h-auto"
                            onClick={() => confirmDeleteCampaign(campaign)}
                          >
                            <span className="hidden sm:inline">Eliminar</span>
                            <span className="sm:hidden">🗑️</span>
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

        {/* Edit Modal */}
        <EditModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          title="Editar Campaña"
          description="Modifica el contenido de tu campaña"
          onSave={() => {
            if (editingCampaign) {
              handleEditCampaign({
                subject: editingCampaign.subject,
                html: editingCampaign.html,
                list_ids: editingCampaignLists,
                send_to_all: editingCampaignSendToAll
              })
            }
          }}
          onCancel={() => {
            setEditingCampaign(null)
          }}
        >
          {editingCampaign && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_subject">Asunto *</Label>
                <Input
                  id="edit_subject"
                  type="text"
                  placeholder="Ej: Nueva clase de Pole Sport"
                  value={editingCampaign.subject}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, subject: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_html">Contenido HTML *</Label>
                <textarea
                  id="edit_html"
                  className="w-full h-64 p-3 border border-gray-300 rounded-md resize-none font-mono text-sm"
                  placeholder="<h1>¡Hola!</h1>&#10;<p>Contenido del email...</p>"
                  value={editingCampaign.html}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, html: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-500">
                  Variables disponibles: {`{{nombre}}, {{tema}}, {{email}}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Destinatarios</Label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="edit_send_to_all"
                      checked={editingCampaignSendToAll}
                      onChange={() => {
                        setEditingCampaignSendToAll(true)
                        setEditingCampaignLists([])
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">Enviar a todos los contactos</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="edit_send_to_all"
                      checked={!editingCampaignSendToAll}
                      onChange={() => setEditingCampaignSendToAll(false)}
                      className="rounded"
                    />
                    <span className="text-sm">Seleccionar listas específicas</span>
                  </label>
                </div>
              </div>

              {!editingCampaignSendToAll && (
                <div className="space-y-2">
                  <Label>Listas de Destino *</Label>
                  <div className="space-y-2 border border-gray-300 rounded-md p-2">
                    {lists.map((list) => (
                      <label key={list.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={editingCampaignLists.includes(list.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditingCampaignLists([...editingCampaignLists, list.id])
                            } else {
                              setEditingCampaignLists(editingCampaignLists.filter(id => id !== list.id))
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{list.title}</span>
                      </label>
                    ))}
                  </div>
                  {editingCampaignLists.length === 0 && (
                    <p className="text-xs text-red-500">Selecciona al menos una lista</p>
                  )}
                </div>
              )}
            </div>
          )}
        </EditModal>

        {/* Preview Modal */}
        {previewCampaign && (
          <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setPreviewCampaign(null)}
          >
            <div 
              className="bg-white rounded-lg shadow-2xl w-[95vw] h-[90vh] sm:w-[80vw] sm:h-[80vh] lg:w-[70vw] lg:h-[75vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h2 className="text-lg font-semibold">Previsualización: {previewCampaign.subject}</h2>
                  <p className="text-sm text-gray-600">Vista previa del email</p>
                </div>
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setPreviewCampaign(null)}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-hidden">
                <iframe
                  srcDoc={previewCampaign.html}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin"
                  style={{
                    backgroundColor: 'white',
                    border: 'none',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, campaign: null })}
        title="Eliminar Campaña"
        description={`¿Estás seguro de que quieres eliminar la campaña "${deleteConfirm.campaign?.subject}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={() => {
          if (deleteConfirm.campaign) {
            handleDeleteCampaign(deleteConfirm.campaign.id)
            setDeleteConfirm({ open: false, campaign: null })
          }
        }}
      />

      <MessageDialog
        open={messageDialog.open}
        onOpenChange={(open) => setMessageDialog(prev => ({ ...prev, open }))}
        title={messageDialog.title}
        message={messageDialog.message}
      />
    </div>
  )
}
